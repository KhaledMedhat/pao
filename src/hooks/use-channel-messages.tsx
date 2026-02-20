"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLazyGetChannelMessagesQuery } from "~/redux/apis/channel.api";
import { MessageInterface } from "~/interfaces/message.interface";
import { useSocket } from "./use-socket";
import { JSONContent } from "@tiptap/react";
import { User } from "~/interfaces/user.interface";

const MESSAGES_PER_PAGE = 42;

export function useChannelMessages(channelId: string) {
    const [messages, setMessages] = useState<MessageInterface[]>([]);
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);
    const { socket, isConnected } = useSocket();
    const [isSomeoneTyping, setIsSomeoneTyping] = useState<{ userId: string; displayName: string; isTyping: boolean }[]>([]);
    // Use lazy query for manual control
    const [fetchMessages] = useLazyGetChannelMessagesQuery();

    // Track if initial load is done
    const initialLoadDone = useRef(false);
    // Use ref to access current messages without adding to dependencies
    const messagesRef = useRef<MessageInterface[]>([]);

    // Reset state when channel changes
    useEffect(() => {
        setIsSomeoneTyping([]);
        setMessages([]);
        messagesRef.current = [];
        setHasMore(true);
    }, [channelId]);

    // Keep messagesRef in sync with messages state
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Load initial messages
    useEffect(() => {
        const loadInitialMessages = async () => {
            if (!channelId) return;

            setIsLoadingInitial(true);
            setIsError(false);
            initialLoadDone.current = false;

            try {
                const result = await fetchMessages({
                    channelId,
                    limit: MESSAGES_PER_PAGE
                }).unwrap();

                setMessages(result.messages);
                setHasMore(result.hasMore);
                initialLoadDone.current = true;
            } catch (error) {
                console.error("Failed to load messages:", error);
                setIsError(true);
            } finally {
                setIsLoadingInitial(false);
            }
        };

        loadInitialMessages();
    }, [channelId, fetchMessages]);

    // Load more (older) messages - uses messagesRef to avoid recreating on every messages change
    const loadMoreMessages = useCallback(async () => {
        if (isLoadingMore || !hasMore || messagesRef.current.length === 0) return;

        const oldestMessage = messagesRef.current[0];
        if (!oldestMessage?._id) return;

        setIsLoadingMore(true);

        try {
            const result = await fetchMessages({
                channelId,
                limit: MESSAGES_PER_PAGE,
                before: oldestMessage._id,
            }).unwrap();

            // Prepend older messages, filtering out any duplicates
            setMessages((prev) => {
                const existingIds = new Set(prev.map((msg) => msg._id));
                const newMessages = result.messages.filter((msg) => !existingIds.has(msg._id));
                return [...newMessages, ...prev];
            });
            setHasMore(result.hasMore);
        } catch (error) {
            console.error("Failed to load more messages:", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [channelId, fetchMessages, hasMore, isLoadingMore]);

    // Socket event handlers
    useEffect(() => {
        // Wait for socket to be connected before registering listeners
        if (!socket || !isConnected) return;

        const handleIsTyping = (data: { userId: string; displayName: string; isTyping: boolean; referenceId: string }) => {
            // Only handle typing events for this channel
            if (data.referenceId !== channelId) return;

            if (data.isTyping) {
                setIsSomeoneTyping((prev) => {
                    // Check if user is already in the typing list
                    const userExists = prev.some((item) => item.userId === data.userId);
                    if (!userExists) {
                        return [...prev, { userId: data.userId, displayName: data.displayName, isTyping: data.isTyping }];
                    }
                    return prev; // Return unchanged if user already exists
                });
            } else {
                setIsSomeoneTyping((prev) => prev.filter((item) => item.userId !== data.userId));
            }
        };

        // if (channelId) {
        //     const cleanup = setupTypingListener();
        //     return () => {
        //         cleanup.then((cleanupFn) => cleanupFn?.());
        //     };
        // }
        // Handle new message - backend sends { message: MessageInterface }
        const handleNewMessage = (data: { message: MessageInterface }) => {
            const newMessage = data.message;
            if (newMessage.referenceId === channelId) {
                setMessages((prev) => {
                    const exists = prev.some((msg) => msg._id === newMessage._id);
                    if (exists) return prev;
                    return [...prev, newMessage];
                });
            }
        };

        // Handle message update - backend sends partial update data
        const handleUpdateMessage = (data: {
            messageId: string;
            referenceId: string;
            manuallyUpdatedAt?: string;
            newText?: JSONContent;
            isPinned?: boolean;
            reaction?: { emoji: string; label: string; sentBy: User };
        }) => {
            if (data.referenceId !== channelId) return;

            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg._id !== data.messageId) return msg;

                    let updatedMsg = { ...msg };

                    // Case 1: Text update
                    if (data.manuallyUpdatedAt && data.newText) {
                        updatedMsg = {
                            ...updatedMsg,
                            message: data.newText,
                            updatedAt: new Date(data.manuallyUpdatedAt),
                        };
                    }

                    // Case 2: Pin update
                    if (data.isPinned !== undefined) {
                        updatedMsg = {
                            ...updatedMsg,
                            isPinned: data.isPinned,
                        };
                    }

                    // Case 3: Reaction update
                    if (data.reaction) {
                        const { emoji, label, sentBy } = data.reaction;
                        const existingReactions = [...(updatedMsg.reactions || [])];
                        const reactionIndex = existingReactions.findIndex((r) => r.emoji === emoji);

                        if (reactionIndex === -1) {
                            // Case 3a: New emoji - add new reaction with count 1
                            existingReactions.push({
                                emoji,
                                label,
                                counter: 1,
                                sentBy: [sentBy],
                            });
                        } else {
                            const existingReaction = existingReactions[reactionIndex];
                            const userAlreadyReacted = existingReaction.sentBy.some(
                                (user) => user._id === sentBy._id
                            );

                            if (!userAlreadyReacted) {
                                // Case 3b: Emoji exists but user hasn't reacted - add user and increment
                                existingReactions[reactionIndex] = {
                                    ...existingReaction,
                                    counter: existingReaction.counter + 1,
                                    sentBy: [...existingReaction.sentBy, sentBy],
                                };
                            } else {
                                // User already reacted with this emoji
                                if (existingReaction.counter === 1) {
                                    // Case 3d: Only 1 reaction and same user - remove entire reaction
                                    existingReactions.splice(reactionIndex, 1);
                                } else {
                                    // Case 3c: Multiple reactions - decrement and remove user
                                    existingReactions[reactionIndex] = {
                                        ...existingReaction,
                                        counter: existingReaction.counter - 1,
                                        sentBy: existingReaction.sentBy.filter(
                                            (user) => user._id !== sentBy._id
                                        ),
                                    };
                                }
                            }
                        }

                        updatedMsg = {
                            ...updatedMsg,
                            reactions: existingReactions,
                        };
                    }

                    return updatedMsg;
                })
            );
        };

        // Handle message delete
        const handleDeleteMessage = (data: { messageId: string; referenceId: string }) => {
            if (data.referenceId === channelId) {
                setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
            }
        };

        // Handle message reaction
        const handleReaction = (data: { message: MessageInterface }) => {
            const updatedMessage = data.message;
            if (updatedMessage.referenceId === channelId) {
                setMessages((prev) =>
                    prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
                );
            }
        };

        socket.on("getNewMessage", handleNewMessage);
        socket.on("getUpdatedMessage", handleUpdateMessage);
        socket.on("getDeletedMessage", handleDeleteMessage);
        socket.on("messageReaction", handleReaction);
        socket?.on("typing", handleIsTyping);


        return () => {
            socket.off("getNewMessage", handleNewMessage);
            socket.off("getUpdatedMessage", handleUpdateMessage);
            socket.off("getDeletedMessage", handleDeleteMessage);
            socket.off("messageReaction", handleReaction);
            socket.off("typing", handleIsTyping);

        };
    }, [channelId, socket, isConnected]);

    // Manual handlers if needed
    const addMessage = useCallback((message: MessageInterface) => {
        setMessages((prev) => {
            const exists = prev.some((msg) => msg._id === message._id);
            if (exists) return prev;
            return [...prev, message];
        });
    }, []);

    const updateMessage = useCallback((updatedMessage: MessageInterface) => {
        setMessages((prev) =>
            prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
        );
    }, []);

    const deleteMessage = useCallback((messageId: string) => {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    }, []);

    // Refetch function
    const refetch = useCallback(async () => {
        setIsLoadingInitial(true);
        try {
            const result = await fetchMessages({
                channelId,
                limit: MESSAGES_PER_PAGE
            }).unwrap();

            setMessages(result.messages);
            setHasMore(result.hasMore);
        } catch (error) {
            console.error("Failed to refetch messages:", error);
        } finally {
            setIsLoadingInitial(false);
        }
    }, [channelId, fetchMessages]);

    return {
        messages,
        isLoading: isLoadingInitial,
        isLoadingMore,
        hasMore,
        isError,
        refetch,
        loadMoreMessages,
        // Manual handlers
        addMessage,
        updateMessage,
        deleteMessage,
        isSomeoneTyping,
    };
}

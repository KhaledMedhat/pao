"use client";

import { useAppSelector } from "~/redux/hooks";
import { selectCurrentChannel, selectIsReplying, selectReplyingToMessage, selectShowChannelDetails } from "~/redux/slices/app/app-selector";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import MessageInput from "./message-input";
import { ChannelType } from "~/interfaces/channels.interface";
import { FriendInterface } from "~/interfaces/user.interface";
import { ScrollArea } from "./ui/scroll-area";
import Message from "./message";
import { Attachment, MessageInterface, MessageType } from "~/interfaces/message.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChannelMessages } from "~/hooks/use-channel-messages";
import { useScrollToMessage } from "~/hooks/use-scroll-to-message";
import { Button } from "./ui/button";
import { IconChevronDown, IconCrown } from "@tabler/icons-react";
import { MessageSkeletonList, LoadingMoreSkeleton } from "./message-skeleton";
import { useScrollContext } from "~/contexts/scroll-context";
import { JSONContent } from "@tiptap/react";
import UserDetails from "./user-details";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "./ui/avatar";
import { getInitialsFallback } from "~/lib/utils";

const ChannelView: React.FC<{ channelId: string }> = ({ channelId }) => {
  const currentChannel = useAppSelector(selectCurrentChannel);
  const showChannelDetails = useAppSelector(selectShowChannelDetails);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const { messages, isLoading, isLoadingMore, hasMore, loadMoreMessages, isSomeoneTyping } = useChannelMessages(channelId);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const { scrollContainerRef } = useScrollContext();
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isReplying = useAppSelector(selectIsReplying);
  const replyingToMessage = useAppSelector(selectReplyingToMessage);

  const inputPlaceholder = useMemo(() => {
    if (currentChannel?.type === ChannelType.Direct && currentChannel.directChannelOtherMember) {
      return `Message @${currentChannel.directChannelOtherMember.displayName}`;
    }
    if (currentChannel?.type === ChannelType.Group) {
      return `Message @${currentChannel.groupOrServerName}`;
    }
    return "Message";
  }, [currentChannel]);

  // Pending messages for optimistic UI (shown while attachments are uploading)
  const [pendingMessages, setPendingMessages] = useState<MessageInterface[]>([]);

  // Create a pending message with uploading attachments
  const addPendingMessage = useCallback((message: JSONContent, attachments: Attachment[], type: MessageType, replyMessageId?: MessageInterface) => {
    const pendingId = `pending-${Date.now()}`;
    const pendingMessage: MessageInterface = {
      _id: pendingId,
      referenceId: channelId,
      message,
      attachment: attachments.map(att => ({ ...att, isUploading: true })),
      sentBy: currentUserInfo as FriendInterface,
      createdAt: new Date(),
      updatedAt: new Date(),
      reactions: [],
      type,
      replyMessageId,
    };
    setPendingMessages(prev => [...prev, pendingMessage]);
    return pendingId;
  }, [channelId, currentUserInfo]);

  // Remove a pending message (called when real message arrives)
  const removePendingMessage = useCallback((pendingId: string) => {
    setPendingMessages(prev => prev.filter(msg => msg._id !== pendingId));
  }, []);

  // Combined messages including pending ones
  const allMessages = useMemo(() => {
    return [...messages, ...pendingMessages];
  }, [messages, pendingMessages]);
  // Sync local ref with global context
  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollContainerRef.current = scrollViewportRef.current;
    }
    return () => {
      scrollContainerRef.current = null;
    };
  }, [scrollContainerRef]);
  const initialScrollDone = useRef<boolean>(false);
  const prevMessagesLength = useRef<number>(0);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0 && scrollViewportRef.current && !initialScrollDone.current) {
      // Use setTimeout to ensure DOM is rendered
      setTimeout(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
          initialScrollDone.current = true;
        }
      }, 100);
    }
  }, [isLoading, messages.length]);

  // Reset initial scroll flag when channel changes
  useEffect(() => {
    initialScrollDone.current = false;
    prevMessagesLength.current = 0;
  }, [channelId]);

  // Auto-scroll to bottom when NEW messages arrive (only if user is at bottom)
  useEffect(() => {
    // Only auto-scroll if new messages were added at the end (not loaded older messages)
    if (
      scrollViewportRef.current &&
      !showScrollButton &&
      !isLoadingMore &&
      initialScrollDone.current &&
      messages.length > prevMessagesLength.current
    ) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, showScrollButton, isLoadingMore]);

  // Maintain scroll position when loading older messages
  useEffect(() => {
    if (scrollViewportRef.current && prevScrollHeightRef.current > 0 && !isLoadingMore) {
      const newScrollHeight = scrollViewportRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      if (scrollDiff > 0) {
        scrollViewportRef.current.scrollTop += scrollDiff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length, isLoadingMore]);

  // Detect scroll position - throttled, memoized and only updates state when value changes
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    // Throttle scroll handling using requestAnimationFrame
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = true;

    requestAnimationFrame(() => {
      const target = event.target as HTMLDivElement;
      const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
      const isAtTop = target.scrollTop < 100;

      // Only update state if the value actually changed
      const shouldShowButton = !isAtBottom;
      if (showScrollButtonRef.current !== shouldShowButton) {
        showScrollButtonRef.current = shouldShowButton;
        setShowScrollButton(shouldShowButton);
      }

      // Only trigger load more after initial scroll is done (prevents loading on first render)
      if (isAtTop && hasMore && !isLoadingMore && initialScrollDone.current) {
        prevScrollHeightRef.current = target.scrollHeight;
        loadMoreMessages();
      }

      scrollThrottleRef.current = false;
    });
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
      setShowScrollButton(false);
    }
  }, []);

  const handleMessageHover = useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);

  const handleMessageLeave = useCallback(() => {
    setHoveredMessageId(null);
  }, []);

  // Use ref to track scroll button state without causing re-renders during scroll
  const showScrollButtonRef = useRef(false);
  const scrollThrottleRef = useRef(false);

  // Scroll to message hook (handles loading older messages if needed)
  const { scrollToMessage } = useScrollToMessage({
    messages,
    hasMore,
    isLoadingMore,
    loadMoreMessages,
    scrollContainerRef: scrollViewportRef,
  });

  // Memoize processed messages to avoid recalculating on every render
  const processedMessages = useMemo(() => processMessages(allMessages || []), [allMessages]);

  return (
    <section className="flex-1 flex flex-row-reverse h-full min-h-0 overflow-hidden pb-2 pt-2 gap-1">
      {showChannelDetails &&
        <aside className="h-full bg-main-primary w-1/3 rounded-md shrink-0">
          {currentChannel?.type === ChannelType.Direct && currentChannel.directChannelOtherMember && <UserDetails user={currentChannel?.directChannelOtherMember || currentUserInfo} size="md" />}

          {currentChannel?.type === ChannelType.Group &&
            <div className="w-full h-full p-4 flex flex-col gap-4">
              <p className="text-sm font-semibold text-muted-foreground">Members &#8212; {currentChannel?.members.length}</p>
              <div className="flex flex-col gap-2">
                {currentChannel?.members.map((member) => (
                  <Popover key={member._id}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start h-11">
                        <Avatar className="size-8">
                          <AvatarImage src={member.profilePicture} />
                          <AvatarFallback>{getInitialsFallback(member.displayName)}</AvatarFallback>
                          <AvatarBadge className="size-2!" variant={member.status.type} />
                        </Avatar>
                        {member.displayName}
                        {currentChannel.createdBy === member._id && <IconCrown size={16} color="gold" />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} side="left" className="w-80 p-0">
                      <UserDetails user={member} size="sm" />
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            </div>
          }
        </aside>
      }
      <div className="relative flex flex-col w-full h-full min-w-0">
        {/* Messages area - scrollable */}
        <ScrollArea className="h-[calc(100vh-100px)]" onScroll={handleScroll} viewportRef={scrollViewportRef}>
          {isLoading ? (
            <MessageSkeletonList count={8} />
          ) : (
            <div className={`${isReplying && replyingToMessage ? "pb-24" : "pb-14"}`}>
              {/* Loading more skeleton at top */}
              {isLoadingMore && <LoadingMoreSkeleton />}

              {/* Show "Load more" hint if there are more messages */}
              {hasMore && !isLoadingMore && messages.length > 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Scroll up to load older messages
                </div>
              )}

              <div className="p-4 pt-0">
                {processedMessages.map((item, index) => (
                  <div key={item.type === "date-separator" ? `date-${index}` : item.message._id}>
                    {item.type === "date-separator" ? (
                      <div className="flex items-center my-2 mx-4">
                        <div className="flex-1 h-px bg-muted-foreground/20"></div>
                        <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mx-2">
                          {new Date(item.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex-1 h-px bg-muted-foreground/20"></div>
                      </div>
                    ) : (
                      <Message
                        key={item.message._id}
                        message={item.message}
                        showHeader={item.showHeader}
                        isHovered={hoveredMessageId === item.message._id}
                        onHover={handleMessageHover}
                        onLeave={handleMessageLeave}
                        channel={currentChannel || undefined}
                        onScrollToMessage={scrollToMessage}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
        {/* Message input - fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-2">
          {isSomeoneTyping.length > 0 && isSomeoneTyping.some(user => user.isTyping) && (
            <div className="text-sm text-muted-foreground bg-background flex items-start gap-1 p-2">
              <div className="loader"></div>
              {isSomeoneTyping.find(user => user.isTyping)?.displayName} is typing
            </div>
          )}
          <MessageInput
            channelId={channelId}
            isEditing={false}
            placeholder={inputPlaceholder}
            mentionSuggestions={
              currentChannel?.type === ChannelType.Direct && currentChannel.directChannelOtherMember
                ? [currentChannel.directChannelOtherMember]
                : currentChannel?.members
            }
            onAddPendingMessage={addPendingMessage}
            onRemovePendingMessage={removePendingMessage}
          />
        </div>
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            onClick={scrollToBottom}
            variant="secondary"
            className="absolute bottom-20 right-4 p-0 shadow-lg z-10"
            size="icon"
          >
            <IconChevronDown size={20} />
          </Button>
        )}
      </div>
    </section>
  );
};
// Function to check if messages should be grouped
const shouldGroupMessages = (currentMessage: MessageInterface, previousMessage: MessageInterface | null, timeThreshold: number = 5 * 60 * 1000) => {
  // If no previous message, should always show header
  if (!previousMessage) return false;

  // Check if messages are from the same user - use sentBy._id instead of senderId
  const sameSender = currentMessage.sentBy?._id === previousMessage.sentBy?._id;

  // If current message is a reply, always show header (don't group)
  if (currentMessage.type === MessageType.REPLY || currentMessage.replyMessageId) {
    return false;
  }

  // If different senders, never group
  if (!sameSender) return false;

  // Check if messages are within the time threshold
  const currentTime = new Date(currentMessage.createdAt || "").getTime();
  const previousTime = new Date(previousMessage.createdAt || "").getTime();
  const timeDifference = Math.abs(currentTime - previousTime);

  // Only group if messages are within time threshold
  return timeDifference < timeThreshold;
};

function processMessages(messages: MessageInterface[]) {
  const processed: Array<{ type: "date-separator"; date: string } | { type: "message"; message: MessageInterface; showHeader: boolean }> = [];

  let lastDate: string | null = null;

  messages.forEach((message, index) => {
    const messageDate = new Date(message.createdAt || "").toDateString();
    const previousMessage = index > 0 ? messages[index - 1] : null;

    // Add date separator if day changed
    if (lastDate && lastDate !== messageDate) {
      processed.push({
        type: "date-separator",
        date: message.createdAt?.toString() || "",
      });
    }

    // Determine if we should show header using the grouping function
    // showHeader is true when we should NOT group messages
    const showHeader = !shouldGroupMessages(message, previousMessage);

    processed.push({
      type: "message",
      message,
      showHeader,
    });

    lastDate = messageDate;
  });

  return processed;
}

export default ChannelView;

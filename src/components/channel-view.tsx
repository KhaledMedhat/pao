"use client";

import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectActiveChannelRoom, selectCurrentChannel, selectIsReplying, selectReplyingToMessage, selectShowChannelDetails } from "~/redux/slices/app/app-selector";
import { selectCurrentUserChannels, selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import MessageInput from "./message-input";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { FriendInterface } from "~/interfaces/user.interface";
import { ScrollArea } from "./ui/scroll-area";
import Message from "./message";
import { Attachment, MessageInterface, MessageType } from "~/interfaces/message.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChannelMessages } from "~/hooks/use-channel-messages";
import { useScrollToMessage } from "~/hooks/use-scroll-to-message";
import { Button } from "./ui/button";
import { IconAtOff, IconChevronDown, IconCrownFilled, IconIdBadge } from "@tabler/icons-react";
import { MessageSkeletonList, LoadingMoreSkeleton } from "./message-skeleton";
import { useScrollContext } from "~/contexts/scroll-context";
import { JSONContent } from "@tiptap/react";
import UserDetails from "./user-details";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "./ui/avatar";
import { cn, extractDirectChannelFromMembers, getInitialsFallback, getMutualServers, isTheUserFriend } from "~/lib/utils";
import { useRemoveFriendMutation } from "~/redux/apis/auth.api";
import { useSendFriendRequestMutation } from "~/redux/apis/user.api";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "./ui/context-menu";
import { StatusType } from "~/interfaces/user.interface";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Field } from "./ui/field";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import ChannelStarterMessage from "./channel-starter-message";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "./ui/empty";
import { useAssignGroupNewOwnershipMutation, useCreateChannelMutation, useRemoveGroupChannelMembersMutation, useSendServerInvitationLinkMutation } from "~/redux/apis/channel.api";
import { ActiveUI } from "~/interfaces/app.interface";
import { setActiveUI, setCurrentChannelId, setPendingMention } from "~/redux/slices/app/app-slice";
import { useRouter } from "next/navigation";
import ActiveCallScreen from "./active-call-screen";
import { useCall } from "~/hooks/use-call";

const ChannelView: React.FC<{ channelId: string }> = ({ channelId }) => {
  const currentChannel = useAppSelector(selectCurrentChannel);
  const showChannelDetails = useAppSelector(selectShowChannelDetails);
  const currentActiveChannelRoom = useAppSelector(selectActiveChannelRoom);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const currentUserChannels = useAppSelector(selectCurrentUserChannels);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { messages, isLoading, isLoadingMore, hasMore, loadMoreMessages, isSomeoneTyping } = useChannelMessages(channelId, currentActiveChannelRoom?._id);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const { scrollContainerRef } = useScrollContext();
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isReplying = useAppSelector(selectIsReplying);
  const replyingToMessage = useAppSelector(selectReplyingToMessage);
  const [removeFriend] = useRemoveFriendMutation();
  const [addFriend] = useSendFriendRequestMutation();
  const currentUserChannelServers = currentUserChannels.filter((c) => c.type === ChannelType.Server);
  const [sendServerInvitationLink] = useSendServerInvitationLinkMutation();
  const [removeGroupChannelMembers] = useRemoveGroupChannelMembersMutation();
  const [assignGroupNewOwnership] = useAssignGroupNewOwnershipMutation();
  const [createChannel] = useCreateChannelMutation();
  const inputPlaceholder = useMemo(() => {
    if (currentChannel?.type === ChannelType.Direct && currentChannel.directChannelOtherMember) {
      return `Message @${currentChannel.directChannelOtherMember.displayName}`;
    }
    if (currentChannel?.type === ChannelType.Group) {
      return `Message @${currentChannel.groupOrServerName}`;
    }
    if (currentChannel?.type === ChannelType.Server) {
      return `Message #${currentActiveChannelRoom?.name}`;
    }
    return "Message";
  }, [currentChannel, currentActiveChannelRoom]);

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

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setHighlightedMessageId(hash);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 3000);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => {
      window.removeEventListener("hashchange", checkHash);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

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
  const {
    incomingCall,
    isInCall,
    activeCallId,
    callType,
    localStream,
    callConsumers,
    currentActiveCalls,
    isMuted,
    isDeafened,
    isVideoEnabled,
    isSpeaking,
    isScreenSharing,
    screenShareInfo,
    isWatchingScreen,
    screenStream,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    watchScreen,
    stopWatchingScreen,
    hangUp,
  } = useCall();
  const activeCallMembers = activeCallId
    ? currentActiveCalls[activeCallId]?.members ?? []
    : [];
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
    <section className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-row-reverse gap-1 overflow-x-hidden overflow-y-hidden pb-2 pt-2">
      {showChannelDetails &&
        <aside className="h-full w-[350px] shrink-0 overflow-x-hidden rounded-md bg-main-primary mr-2">
          {currentChannel?.type === ChannelType.Direct && currentChannel.directChannelOtherMember && <UserDetails user={currentChannel?.directChannelOtherMember || currentUserInfo} size="md" />}

          {currentChannel?.type === ChannelType.Group &&
            <div className="w-full h-full p-4 flex flex-col gap-4">
              <p className="text-sm font-semibold text-muted-foreground">Members &#8212; {currentChannel?.members.length}</p>
              <div className="flex flex-col gap-2">
                {currentChannel?.members.map((member) => (
                  <ContextMenu key={member._id}>
                    <Dialog>
                      <Popover>
                        <ContextMenuTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start h-11 px-3">
                              <Avatar className="size-8" style={
                                member.profilePicture === SHORT_LOGO_URL && member.profilePictureBannerColor
                                  ? { backgroundColor: member.profilePictureBannerColor }
                                  : undefined
                              }>
                                <AvatarImage src={member.profilePicture} />
                                <AvatarFallback>{getInitialsFallback(member.displayName)}</AvatarFallback>
                                <AvatarBadge className="size-2!" variant={member.status?.type} />
                              </Avatar>
                              {member.displayName}
                              {currentChannel.createdBy === member._id &&
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <IconCrownFilled size={16} color="var(--owner)" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Group Owner
                                  </TooltipContent>
                                </Tooltip>
                              }
                            </Button>
                          </PopoverTrigger>
                        </ContextMenuTrigger>
                        <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} side="left" className="w-sm">
                          <UserDetails user={member} size="sm" />
                        </PopoverContent>
                      </Popover>
                      <ContextMenuContent className="p-2 w-50">
                        <DialogTrigger asChild>
                          <ContextMenuItem>
                            Profile
                          </ContextMenuItem>
                        </DialogTrigger>
                        {currentUserInfo?._id !== member._id && (
                          <>
                            <ContextMenuItem onClick={() => {
                              dispatch(setPendingMention({
                                id: member._id,
                                label: member.displayName,
                                channelId: currentChannel._id,
                              }));
                            }}>
                              Mention
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => {
                              if (!isTheUserFriend(currentUserInfo, member?._id || "")) {
                                createChannel({
                                  members: [currentUserInfo._id, member._id],
                                  type: ChannelType.Direct,
                                })
                                  .unwrap()
                                  .then((res) => {
                                    dispatch(setCurrentChannelId(res.data.channel._id));
                                    dispatch(setActiveUI(ActiveUI.DIRECT_MESSAGES));
                                    router.push(`/dm/${res.data.route}`);
                                  });
                              } else {
                                dispatch(setActiveUI(ActiveUI.DIRECT_MESSAGES))
                                dispatch(setCurrentChannelId(extractDirectChannelFromMembers(currentUserInfo._id, currentUserChannels, member._id)?._id || ""))
                                router.push(`/dm/${extractDirectChannelFromMembers(currentUserInfo._id, currentUserChannels, member._id)?._id || ""}`)
                              }
                            }}>
                              Message
                            </ContextMenuItem>
                            <ContextMenuItem>
                              Call
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            {currentUserInfo?._id === currentChannel.createdBy ?
                              <>
                                <ContextMenuItem onClick={() =>
                                  removeGroupChannelMembers({ channelId: currentChannel._id, data: { memberToRemove: member._id, removedBy: currentUserInfo._id } })
                                } variant="destructive">
                                  Remove From Group
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => assignGroupNewOwnership({ channelId: currentChannel._id, data: { newOwner: member._id } })} variant="destructive">
                                  Make Group Owner
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuSub>
                                  <ContextMenuSubTrigger>Invite to Server</ContextMenuSubTrigger>
                                  <ContextMenuSubContent className="w-fit">
                                    {currentUserChannelServers.length > 0 ? (
                                      currentUserChannelServers.map((server) => <ContextMenuItem
                                        onClick={() => sendServerInvitationLink({
                                          sendTo: extractDirectChannelFromMembers(currentUserInfo._id, currentUserChannels, member._id)?._id || "",
                                          invitationLink: {
                                            link: server?.serverInvitationLink?.link || "",
                                            id: server?.serverInvitationLink?.id || "",
                                          },
                                        })}
                                        key={server._id}>{server.groupOrServerName}</ContextMenuItem>)
                                    ) : (
                                      <Empty className="w-full flex items-center justify-center">
                                        <EmptyHeader>
                                          <EmptyMedia variant="default">
                                            <IconAtOff className="size-12 text-muted-foreground" />
                                          </EmptyMedia>
                                          <EmptyTitle>No Servers found</EmptyTitle>
                                          <EmptyDescription>
                                            You are not in any servers to invite this @{member?.displayName || ""} to.
                                          </EmptyDescription>
                                        </EmptyHeader>
                                      </Empty>
                                    )}
                                  </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuItem onClick={() => isTheUserFriend(currentUserInfo, member?._id || "") ? removeFriend({ friendId: member?._id || "" }) : addFriend({ sender: currentUserInfo, username: member?.username || "" })}>
                                  {isTheUserFriend(currentUserInfo, member?._id || "") ? "Remove Friend" : "Add Friend"}
                                </ContextMenuItem>
                              </>
                              :
                              <>
                                <ContextMenuSub>
                                  <ContextMenuSubTrigger>Invite to Server</ContextMenuSubTrigger>
                                  <ContextMenuSubContent className="w-fit">
                                    {currentUserChannelServers.length > 0 ? (
                                      currentUserChannelServers.map((server) =>
                                        <ContextMenuItem
                                          onClick={() => sendServerInvitationLink({
                                            sendTo: extractDirectChannelFromMembers(currentUserInfo._id, currentUserChannels, member._id)?._id || "",
                                            invitationLink: {
                                              link: server?.serverInvitationLink?.link || "",
                                              id: server?.serverInvitationLink?.id || "",
                                            },
                                          })}
                                          key={server._id}
                                        >
                                          {server.groupOrServerName}
                                        </ContextMenuItem>)
                                    ) : (
                                      <Empty className="w-full flex items-center justify-center">
                                        <EmptyHeader>
                                          <EmptyMedia variant="default">
                                            <IconAtOff className="size-12 text-muted-foreground" />
                                          </EmptyMedia>
                                          <EmptyTitle>No Servers found</EmptyTitle>
                                          <EmptyDescription>
                                            You are not in any servers to invite this @{member?.displayName || ""} to.
                                          </EmptyDescription>
                                        </EmptyHeader>
                                      </Empty>
                                    )}
                                  </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuItem onClick={() => isTheUserFriend(currentUserInfo, member?._id || "") ? removeFriend({ friendId: member?._id || "" }) : addFriend({ sender: currentUserInfo, username: member?.username || "" })}>
                                  {isTheUserFriend(currentUserInfo, member?._id || "") ? "Remove Friend" : "Add Friend"}
                                </ContextMenuItem>
                              </>
                            }
                            <ContextMenuSeparator />
                          </>
                        )}
                        <ContextMenuItem className="justify-between">
                          Copy User ID
                          <IconIdBadge size={18} />
                        </ContextMenuItem>
                      </ContextMenuContent>
                      <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
                        <VisuallyHidden.Root>
                          <DialogHeader>
                            <DialogTitle></DialogTitle>
                            <DialogDescription></DialogDescription>
                          </DialogHeader>
                        </VisuallyHidden.Root>
                        <UserDetails user={member} size="lg" />
                      </DialogContent>
                    </Dialog>
                  </ContextMenu>
                ))}
              </div>
            </div>
          }

          {currentChannel?.type === ChannelType.Server && (() => {
            const onlineMembers = currentChannel.members.filter((m) => m.status.type !== StatusType.Invisible);
            const offlineMembers = currentChannel.members.filter((m) => m.status.type === StatusType.Invisible);

            const renderMember = (member: FriendInterface) => (
              <ContextMenu key={member._id}>
                <Dialog>
                  <Popover>
                    <ContextMenuTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start h-11">
                          <Avatar className="size-8" style={
                            member.profilePicture === SHORT_LOGO_URL && member.profilePictureBannerColor
                              ? { backgroundColor: member.profilePictureBannerColor }
                              : undefined
                          }>
                            <AvatarImage src={member.profilePicture} />
                            <AvatarFallback>{getInitialsFallback(member.displayName)}</AvatarFallback>
                            <AvatarBadge className="size-2.5! ring-4 ring-main-primary" variant={member.status?.type} />
                          </Avatar>
                          {member.displayName}
                          {currentChannel.createdBy === member._id &&
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <IconCrownFilled size={16} color="var(--owner)" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Server Owner
                              </TooltipContent>
                            </Tooltip>
                          }
                        </Button>
                      </PopoverTrigger>
                    </ContextMenuTrigger>
                    <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} side="left" className="w-sm">
                      <UserDetails user={member} size="sm" />
                    </PopoverContent>
                  </Popover>
                  <ContextMenuContent className="w-48">
                    <DialogTrigger asChild>
                      <ContextMenuItem>
                        Profile
                      </ContextMenuItem>
                    </DialogTrigger>
                    <ContextMenuItem >
                      Mention
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <Field orientation="horizontal" className="w-full justify-between p-2 hover:bg-muted cursor-pointer rounded-md">
                      <Label htmlFor="mute-checkbox">Mute</Label>
                      <Checkbox id="mute-checkbox" name="mute-checkbox" className="size-5" />
                    </Field>
                    <Field orientation="horizontal" className="w-full justify-between p-2 hover:bg-muted cursor-pointer rounded-md">
                      <Label htmlFor="defean-checkbox">Defean</Label>
                      <Checkbox id="defean-checkbox" name="defean-checkbox" className="size-5" />
                    </Field>
                    <ContextMenuSeparator />

                    <ContextMenuItem className="justify-between" onClick={() => navigator.clipboard.writeText(member._id)}>
                      Copy User ID <IconIdBadge />
                    </ContextMenuItem>
                    {isTheUserFriend(currentUserInfo, member._id) ? (
                      <ContextMenuItem className="text-destructive" onClick={() => removeFriend({ friendId: member._id })}>
                        Remove Friend
                      </ContextMenuItem>
                    ) : member._id !== currentUserInfo?._id && (
                      <ContextMenuItem onClick={() => addFriend({ sender: currentUserInfo as FriendInterface, username: member.username })}>
                        Add Friend
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                  <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
                    <VisuallyHidden.Root>
                      <DialogHeader>
                        <DialogTitle></DialogTitle>
                        <DialogDescription></DialogDescription>
                      </DialogHeader>
                    </VisuallyHidden.Root>
                    <UserDetails user={member} size="lg" />
                  </DialogContent>
                </Dialog>
              </ContextMenu>
            );

            return (
              <div className="w-full h-full p-4 flex flex-col gap-4">
                {onlineMembers.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground">Online &#8212; {onlineMembers.length}</p>
                    <div className="flex flex-col gap-1">
                      {onlineMembers.map(renderMember)}
                    </div>
                  </>
                )}
                {offlineMembers.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Offline &#8212; {offlineMembers.length}</p>
                    <div className="flex flex-col gap-1 opacity-50">
                      {offlineMembers.map(renderMember)}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </aside>
      }
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {isInCall && callType && (
          <ActiveCallScreen
            callType={callType}
            members={activeCallMembers}
            localStream={localStream}
            callConsumers={callConsumers}
            isMuted={isMuted}
            isDeafened={isDeafened}
            isVideoEnabled={isVideoEnabled}
            isSpeaking={isSpeaking}
            isScreenSharing={isScreenSharing}
            screenShareInfo={screenShareInfo}
            isWatchingScreen={isWatchingScreen}
            screenStream={screenStream}
            onToggleMute={toggleMute}
            onToggleDeafen={toggleDeafen}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onWatchScreen={watchScreen}
            onStopWatchingScreen={stopWatchingScreen}
            onHangUp={hangUp}
          />
        )}
        {/* Messages area - scrollable */}
        <ScrollArea className="h-[calc(100vh-120px)] w-full min-w-0" onScroll={handleScroll} viewportRef={scrollViewportRef}>
          {isLoading ? (
            <MessageSkeletonList count={8} />
          ) : (
            <div className={cn("min-w-0 max-w-full", isReplying && replyingToMessage ? "pb-24" : "pb-14")}>
              {/* Loading more skeleton at top */}
              {isLoadingMore && <LoadingMoreSkeleton />}

              {/* Show "Load more" hint if there are more messages */}
              {hasMore && !isLoadingMore && messages.length > 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Scroll up to load older messages
                </div>
              )}

              <div className="w-full min-w-0 max-w-full p-4 pt-0">

                {/* Welcoming message */}
                {currentChannel && <ChannelStarterMessage channel={currentChannel} currentUserChannels={currentUserChannels} currentUserInfo={currentUserInfo} messagesLength={processedMessages.length} />}

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
                        isHighlighted={highlightedMessageId === item.message._id}
                        onHover={handleMessageHover}
                        onLeave={handleMessageLeave}
                        channel={currentChannel || undefined}
                        onScrollToMessage={scrollToMessage}
                        contextMenuTriggerDisabled={false}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
        {/* Message input - fixed at bottom */}
        <div className="absolute bottom-2 left-0 right-0 px-2">
          {isSomeoneTyping.length > 0 && isSomeoneTyping.some(user => user.isTyping) && (
            <div className="text-sm text-muted-foreground bg-background flex items-start gap-1 p-2">
              <div className="loader"></div>
              {isSomeoneTyping.find(user => user.isTyping)?.displayName} is typing
            </div>
          )}
          <MessageInput
            key={`${channelId}-${currentActiveChannelRoom?._id}-${inputPlaceholder}`}
            channel={currentChannel as Channel}
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
    </section >
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

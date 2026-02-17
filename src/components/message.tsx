"use client";

import { MessageType, type MessageInterface } from "~/interfaces/message.interface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState, memo, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { FriendInterface } from "~/interfaces/user.interface";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "./ui/context-menu";
import { PencilIcon, Copy, Pin } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { IconCornerUpRight, IconCornerUpLeft, IconBorderCornerRounded, IconTrash, IconDots } from "@tabler/icons-react";
import { Channel } from "~/interfaces/channels.interface";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { formatDate, getInitialsFallback, scrollToMessage } from "~/lib/utils";
import MessageDetails from "./message-details";
import ProfileAvailabilityIndicator from "./profile-availability-indicator";
import { REACTION_EMOJIS } from "~/constants/constants";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "./ui/emoji-picker";
import MessageInput from "./message-input";
import { useDeleteMessageMutation, usePinMessageMutation, useToggleReactionMutation, useUnpinMessageMutation } from "~/redux/apis/channel.api";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { setIsPinnedMessagesOpen, setIsReplying, setReplyingToMessage } from "~/redux/slices/app/app-slice";
import ForwardMessage from "./forward-message";
import { Separator } from "./ui/separator";
import ReactionPicker from "./reaction-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSubTrigger, DropdownMenuSub, DropdownMenuTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from "./ui/dropdown-menu";
import UserDetails from "./user-details";
import { selectIsReplying, selectReplyingToMessage } from "~/redux/slices/app/app-selector";
import { AttachmentsGrid } from "./attachments-grid";


interface MessageComponentProps {
    message: MessageInterface;
    showHeader: boolean;
    isHovered: boolean;
    onHover: (messageId: string) => void;
    onLeave: () => void;
    channel: Channel | undefined;
    onScrollToMessage: (messageId: string) => void;
}
const Message = memo<MessageComponentProps>(
    ({ channel, message, showHeader, isHovered, onHover, onLeave, onScrollToMessage }) => {
        const [deleteMessage] = useDeleteMessageMutation();
        const [pinMessage] = usePinMessageMutation();
        const [unpinMessage] = useUnpinMessageMutation();
        const dispatch = useAppDispatch();
        const currentUser = useAppSelector(selectCurrentUserInfo);
        const [isEditing, setIsEditing] = useState<boolean>(false);
        const [makeReaction] = useToggleReactionMutation();
        const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Add this state
        const [isForwardDialogOpen, setIsForwardDialogOpen] = useState<boolean>(false);
        const [isPinDialogOpen, setIsPinDialogOpen] = useState<boolean>(false);
        const [isPinAlertDialogOpen, setIsPinAlertDialogOpen] = useState<boolean>(false);
        const [isDeleteAlertDialogOpen, setIsDeleteAlertDialogOpen] = useState<boolean>(false);
        const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
        const isReplying = useAppSelector(selectIsReplying);
        const replyingToMessage = useAppSelector(selectReplyingToMessage);
        const isSameUser = message.sentBy?._id === currentUser?._id;

        const MessageEmojiPoisition = () => {
            switch (message.type) {
                case MessageType.TEXT:
                    return "ml-16";
                case MessageType.REPLY:
                    return "ml-16";
                case MessageType.FORWARD:
                    return "ml-19";
                case MessageType.PINNED_MSG_SYSTEM:
                    return "ml-10";
                case MessageType.CALL_END_MSG_SYSTEM:
                    return "ml-10";
                case MessageType.CALL_MISSED_MSG_SYSTEM:
                    return "ml-10";
                default:
                    return "ml-16";
            }
        }

        // Handle hash navigation highlight effect
        useEffect(() => {
            const checkHash = () => {
                if (window.location.hash === `#${message._id}`) {
                    setIsHighlighted(true);
                    const timer = setTimeout(() => {
                        setIsHighlighted(false);
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            };

            // Check on mount
            checkHash();

            // Listen for hash changes
            window.addEventListener("hashchange", checkHash);
            return () => window.removeEventListener("hashchange", checkHash);
        }, [message._id]);

        // Handle Escape key to cancel editing
        useEffect(() => {
            if (!isEditing) return;

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    setIsEditing(false);
                }
            };

            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }, [isEditing]);

        const handleMouseEnter = useCallback(() => {
            onHover(message._id);
        }, [message._id, onHover]);

        const handleMouseLeave = useCallback(() => {
            if (!isDropdownOpen) {
                onLeave();
            }
        }, [isDropdownOpen, onLeave]);
        return (
            <Dialog open={isForwardDialogOpen || isPinDialogOpen} onOpenChange={setIsForwardDialogOpen || setIsPinDialogOpen}>
                <AlertDialog open={isPinAlertDialogOpen || isDeleteAlertDialogOpen} onOpenChange={setIsPinAlertDialogOpen || setIsDeleteAlertDialogOpen}>
                    <Popover>
                        <ContextMenu >
                            <ContextMenuTrigger className="w-full">
                                <div
                                    id={message._id}
                                    className={`group relative px-4 -mx-4 cursor-default transition-colors duration-75 ${message._id && isReplying && replyingToMessage?._id === message._id && "bg-accent/40 hover:bg-accent/40"
                                        } ${isHovered && "bg-main"} ${showHeader && "mt-4"} ${message.type === MessageType.REPLY && "pt-1"} ${isHighlighted && "animate-pulse bg-accent/30"}`}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {message.type === MessageType.REPLY && message.replyMessageId && (
                                        <div className="pl-4 flex items-end">
                                            <button
                                                onClick={() => scrollToMessage(message.message.message.replyMessageId?._id || "", onScrollToMessage)}
                                                className="cursor-pointer"
                                            >
                                                <IconBorderCornerRounded stroke={2} className="text-muted-foreground hover:text-accent/40" />
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <Avatar className="size-7 bg-muted">
                                                    <AvatarImage src={message.replyMessageId?.sentBy?.profilePicture || ""} />
                                                    <AvatarFallback>
                                                        {message.replyMessageId?.sentBy?.displayName?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <button
                                                    className="flex items-center gap-0.5 text-xs text-muted-foreground cursor-pointer"
                                                    onClick={() => scrollToMessage(message.replyMessageId?._id || "", onScrollToMessage)}
                                                >
                                                    {message.replyMessageId.message.content?.[0].content?.map((msg, idx) => (
                                                        <span key={idx} className="flex flex-col items-start font-semibold">
                                                            <p>{msg.type === "text" && msg.text}</p>
                                                            {msg.type === "mention" && (
                                                                <p className="bg-mention px-1 text-mention-secondary font-semibold rounded no-underline">
                                                                    {msg.attrs?.mentionSuggestionChar}
                                                                    {msg.attrs?.label}
                                                                </p>
                                                            )}
                                                        </span>
                                                    ))}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {message._id && replyingToMessage?._id === message._id && (
                                        <span className="absolute top-0 left-0 h-full bg-mention-secondary z-10 w-1" />
                                    )}
                                    <div className="flex gap-4 items-start">
                                        {/* Avatar column */}
                                        {message.type !== MessageType.PINNED_MSG_SYSTEM ? (
                                            <div className="w-12 shrink-0">
                                                {showHeader ? (
                                                    <PopoverTrigger asChild>
                                                        <div className="pt-0.5">
                                                            <Avatar className="size-12">
                                                                <AvatarImage src={message.sentBy?.profilePicture} alt={message.sentBy?.displayName} />
                                                                <AvatarFallback>{getInitialsFallback(message.sentBy?.displayName)}</AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                    </PopoverTrigger>
                                                ) : (
                                                    <div className="w-14 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] text-muted-foreground">{formatDate(message.createdAt?.toString(), "sm")}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <Pin size={24} color="var(--muted-foreground)" fill="var(--muted-foreground) " className="rotate-45" />
                                        )}

                                        {/* Message content */}
                                        {message.type !== MessageType.PINNED_MSG_SYSTEM ? (
                                            <div className="flex-1 min-w-0 flex w-full">
                                                {message.type === MessageType.FORWARD && <span className="bg-muted-foreground w-0.5 rounded-xs mr-3 my-2" />}

                                                <div className={`${showHeader && "pt-1"} w-full`}>
                                                    {/* Header */}
                                                    {showHeader && (
                                                        <div className="flex items-center gap-2">
                                                            <PopoverTrigger asChild>
                                                                <span className="font-semibold">{message.sentBy?.displayName || message.sentBy?.username || "Unknown User"}</span>
                                                            </PopoverTrigger>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-xs text-muted-foreground">{formatDate(message.createdAt?.toString(), "md")}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{formatDate(message.createdAt?.toString(), "lg")}</TooltipContent>
                                                            </Tooltip>

                                                            {message.updatedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
                                                        </div>
                                                    )}

                                                    {/* Message text and attachments */}
                                                    <div className="text-base leading-snug wrap-break-word w-full">
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <MessageInput channelId={channel?._id ?? ""} value={message.message.content?.[0].content?.map((msg) => msg.text).join("") ?? ""} isEditing={true} messageId={message._id} setIsEditing={setIsEditing} />
                                                                <p className="text-xs font-semibold">
                                                                    escape to <span className="text-accent">cancel</span> &#x2022; enter to <span className="text-accent">save</span>
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className={`flex items-start gap-1`}>
                                                                <div className="flex flex-col">
                                                                    <span className="flex items-start italic text-muted-foreground text-sm">
                                                                        {message.type === MessageType.FORWARD && (
                                                                            <>
                                                                                <IconCornerUpRight stroke={1.5} /> Forwarded
                                                                            </>
                                                                        )}
                                                                    </span>
                                                                    <div className="flex items-start gap-1">
                                                                        {message.message && (
                                                                            <>
                                                                                {" "}
                                                                                {message.message.content?.[0].content?.map((msg, idx) => (
                                                                                    <span key={idx} className="flex flex-col items-start">
                                                                                        {msg.type === "text" && <p className="break-all">{msg.text}</p>}
                                                                                        {msg.type === "mention" && (
                                                                                            <Popover>
                                                                                                <PopoverTrigger asChild>
                                                                                                    <p className="bg-mention/60 hover:bg-mention px-1 text-mention-secondary font-semibold rounded no-underline cursor-pointer">{msg.attrs?.mentionSuggestionChar + msg.attrs?.label}</p>
                                                                                                </PopoverTrigger>
                                                                                                <PopoverContent side="right" className="w-80 p-0">
                                                                                                    <UserDetails user={channel?.members.find((member) => member._id === msg.attrs?.id) as FriendInterface} size="sm" setDialogOpen={() => { }} />
                                                                                                </PopoverContent>
                                                                                            </Popover>
                                                                                        )}
                                                                                    </span>
                                                                                ))}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {message.attachment && message.attachment.length > 0 && (
                                                            <div className="mt-2">
                                                                <AttachmentsGrid
                                                                    messageId={message._id}
                                                                    attachments={message.attachment}
                                                                    sender={message.sentBy}
                                                                    messageSentAt={message.createdAt}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 w-full flex-wrap">
                                                {message.message.content?.[0].content?.map((msg, idx) => (
                                                    <span key={idx} className="flex items-start ">
                                                        {/* {msg.type === "mention" && (
                                                        <ProfileAvailabilityIndicator
                                                            size="sm"
                                                            status={message.sentBy?.status.type}
                                                            imageUrl={message.sentBy?.profilePicture || ""}
                                                            name={message.sentBy?.displayName || ""}
                                                        />
                                                    )} */}
                                                        {msg.type === 'pinnedBy' && msg.attrs &&
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="link" className="p-0 text-md text-mention">{msg.attrs?.label}</Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent side="right" className="w-sm">
                                                                    <UserDetails user={channel?.members.find((member) => member._id === msg.attrs?.id) as FriendInterface} size="sm" setDialogOpen={() => { }} />
                                                                </PopoverContent>
                                                            </Popover>
                                                        }
                                                        {msg.type === "text" && <p>{msg.text} </p>}
                                                        {msg.type === "pin" && msg.attrs && (
                                                            <Button
                                                                variant="link"
                                                                className="p-0 text-md font-bold"
                                                                onClick={() => scrollToMessage(msg.attrs?.messageId || "", onScrollToMessage)}
                                                            >
                                                                {msg.text}
                                                            </Button>
                                                        )}
                                                        {msg.type === "pin" && !msg.attrs && (
                                                            <Button
                                                                variant="link"
                                                                className="p-0 text-md"
                                                                onClick={() => dispatch(setIsPinnedMessagesOpen(true))}
                                                            >
                                                                <span className="font-bold cursor-pointer">
                                                                    {msg.text}
                                                                </span>
                                                            </Button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        )}


                                        {/* Emoji reactions */}
                                        {(isHovered || isDropdownOpen) && (
                                            <div className="absolute top-0 right-4 -mt-4 animate-in fade-in slide-in-from-top-2 duration-100">
                                                <div className="flex items-center gap-0.5 border border-main bg-main-primary rounded-md px-1 py-0.5">
                                                    <div className="flex items-center">
                                                        {REACTION_EMOJIS.map((emoji) => (
                                                            <Tooltip key={emoji.label}>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon-sm" onClick={() =>
                                                                        makeReaction({
                                                                            messageId: message._id,
                                                                            reaction: {
                                                                                emoji: emoji.emoji,
                                                                                userId: currentUser?._id,
                                                                            },
                                                                        })
                                                                    }>
                                                                        <span className="text-lg">{emoji.emoji}</span>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {emoji.label}
                                                                </TooltipContent>
                                                            </Tooltip>

                                                        ))}
                                                    </div>
                                                    <Separator className="bg-muted-foreground/40 h-4!" orientation="vertical" />


                                                    <ReactionPicker isShortcut={true} currentEmoji={"😊"} isMessageInput={false} messageId={message._id} currentUserId={currentUser?._id} />

                                                    {(message.type === MessageType.TEXT || message.type === MessageType.REPLY || message.type === MessageType.FORWARD) && <Tooltip>
                                                        <DialogTrigger asChild>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon-sm">
                                                                    <IconCornerUpRight size={20} color="var(--muted-foreground)" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                        </DialogTrigger>
                                                        <TooltipContent>
                                                            Forward
                                                        </TooltipContent>
                                                    </Tooltip>}

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <DropdownMenu modal={false}>
                                                                <TooltipTrigger asChild>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon-sm">
                                                                            <IconDots size={20} color="var(--muted-foreground)" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                </TooltipTrigger>
                                                                <DropdownMenuContent>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        {REACTION_EMOJIS.map((emoji) => (
                                                                            <Tooltip key={emoji.label}>
                                                                                <TooltipTrigger asChild>
                                                                                    <DropdownMenuItem variant="secondary" className="size-10" onSelect={() =>
                                                                                        makeReaction({
                                                                                            messageId: message._id,
                                                                                            reaction: {
                                                                                                emoji: emoji.emoji,
                                                                                                userId: currentUser?._id,
                                                                                            },
                                                                                        })
                                                                                    }>
                                                                                        <span className="text-lg">{emoji.emoji}</span>
                                                                                    </DropdownMenuItem>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    {emoji.label}
                                                                                </TooltipContent>
                                                                            </Tooltip>

                                                                        ))}
                                                                    </div>
                                                                    <DropdownMenuSub>
                                                                        <DropdownMenuSubTrigger >View More Reactions</DropdownMenuSubTrigger>
                                                                        <DropdownMenuSubContent
                                                                            className="will-change-transform transform-gpu w-fit p-0 data-[state=closed]:invisible data-[state=closed]:pointer-events-none">
                                                                            <EmojiPicker
                                                                                className="h-[342px]"
                                                                                onEmojiSelect={({ emoji }) => {
                                                                                    makeReaction({
                                                                                        messageId: message._id,
                                                                                        reaction: {
                                                                                            emoji: emoji,
                                                                                            userId: currentUser?._id,
                                                                                        },
                                                                                    })
                                                                                    document.dispatchEvent(
                                                                                        new KeyboardEvent("keydown", { key: "Escape" })
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <EmojiPickerSearch />
                                                                                <EmojiPickerContent />
                                                                                <EmojiPickerFooter />
                                                                            </EmojiPicker>
                                                                        </DropdownMenuSubContent>
                                                                    </DropdownMenuSub>

                                                                    <DropdownMenuSeparator />

                                                                    {isSameUser && message.type === MessageType.TEXT && (
                                                                        <DropdownMenuItem onClick={() => setIsEditing(true)} className="justify-between">
                                                                            Edit Message
                                                                            <PencilIcon size={18} strokeWidth={0.5} color="var(--muted)" fill="var(--muted-foreground)" />
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem onClick={() => {
                                                                        dispatch(setIsReplying(true));
                                                                        dispatch(setReplyingToMessage(message));
                                                                    }} className="justify-between">
                                                                        Reply
                                                                        <IconCornerUpLeft size={18} color="var(--muted-foreground)" />
                                                                    </DropdownMenuItem>
                                                                    {(message.type === MessageType.TEXT || message.type === MessageType.REPLY || message.type === MessageType.FORWARD) &&
                                                                        <DialogTrigger asChild>
                                                                            <DropdownMenuItem className="justify-between">
                                                                                Forward
                                                                                <IconCornerUpRight size={18} color="var(--muted-foreground)" />
                                                                            </DropdownMenuItem>
                                                                        </DialogTrigger>
                                                                    }
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(message.message.content?.[0].content?.map((msg) => msg.text).join("") ?? "");
                                                                        }}
                                                                        className="justify-between"
                                                                    >
                                                                        Copy Text
                                                                        <Copy size={18} color="var(--muted-foreground)" />
                                                                    </DropdownMenuItem>
                                                                    {message.isPinned ? (
                                                                        <DropdownMenuItem className="justify-between" onClick={() => setIsPinDialogOpen(true)}>
                                                                            Unpin Message
                                                                            <Pin size={18} color="var(--muted-foreground)" fill="var(--muted-foreground)" className="rotate-45" />
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem className="justify-between" onClick={() => setIsPinAlertDialogOpen(true)}>
                                                                            Pin Message
                                                                            <Pin size={18} color="var(--muted-foreground)" fill="var(--muted-foreground)" className="rotate-45" />
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem variant="destructive" className="justify-between" onClick={() => setIsDeleteAlertDialogOpen(true)}>
                                                                        Delete Message
                                                                        <IconTrash size={18} color="var(--destructive)" />
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <TooltipContent>More</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`flex items-center gap-2 w-full ${MessageEmojiPoisition()} `}>
                                        {message.reactions && message.reactions.length > 0 && (
                                            <div className="flex items-center gap-2 py-1">
                                                {message.reactions.map((reaction, idx) => (
                                                    <Tooltip key={idx}>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                className={`p-1.5 flex items-center gap-1 ${reaction.sentBy?.some((user) => user?._id === currentUser?._id) && "ring-2 ring-accent"
                                                                    }`}
                                                                onClick={() =>
                                                                    makeReaction({
                                                                        messageId: message._id,
                                                                        reaction: {
                                                                            emoji: reaction.emoji,
                                                                            userId: currentUser?._id,
                                                                        },
                                                                    })
                                                                }
                                                            >
                                                                <span className="text-lg w-full">{reaction.emoji}</span>
                                                                <span className="text-md text-muted-foreground font-semibold w-full">{reaction.counter}</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            sideOffset={10} className="flex items-center gap-2 py-4">
                                                            <span className="text-6xl">{reaction.emoji}</span>
                                                            <span className="text-md font-semibold">
                                                                reacted by {reaction.sentBy?.filter(Boolean).map((user) => user?.displayName).join(", ")}
                                                            </span>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()} className="p-2 flex flex-col gap-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {REACTION_EMOJIS.map((emoji) => (
                                        <Tooltip key={emoji.label}>
                                            <TooltipTrigger asChild>
                                                <ContextMenuItem variant="secondary" className="size-10" onSelect={() =>
                                                    makeReaction({
                                                        messageId: message._id,
                                                        reaction: {
                                                            emoji: emoji.emoji,
                                                            userId: currentUser?._id,
                                                        },
                                                    })
                                                }>
                                                    <span className="text-lg">{emoji.emoji}</span>
                                                </ContextMenuItem>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {emoji.label}
                                            </TooltipContent>
                                        </Tooltip>

                                    ))}
                                </div>
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger >View More Reactions</ContextMenuSubTrigger>
                                    <ContextMenuSubContent
                                        className="will-change-transform transform-gpu w-fit p-0 data-[state=closed]:invisible data-[state=closed]:pointer-events-none" sideOffset={20}>
                                        <EmojiPicker
                                            className="h-[342px]"
                                            onEmojiSelect={({ emoji }) => {
                                                makeReaction({
                                                    messageId: message._id,
                                                    reaction: {
                                                        emoji: emoji,
                                                        userId: currentUser?._id,
                                                    },
                                                })
                                                document.dispatchEvent(
                                                    new KeyboardEvent("keydown", { key: "Escape" })
                                                );
                                            }}
                                        >
                                            <EmojiPickerSearch />
                                            <EmojiPickerContent />
                                            <EmojiPickerFooter />
                                        </EmojiPicker>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuSeparator />
                                {isSameUser && message.type === MessageType.TEXT && (
                                    <ContextMenuItem onClick={() => setIsEditing(true)} className="justify-between">
                                        Edit Message
                                        <PencilIcon size={18} strokeWidth={0.5} color="var(--muted)" fill="var(--muted-foreground)" />
                                    </ContextMenuItem>
                                )}
                                <ContextMenuItem onClick={() => {
                                    dispatch(setIsReplying(true));
                                    dispatch(setReplyingToMessage(message));
                                }} className="justify-between">
                                    Reply
                                    <IconCornerUpLeft size={18} color="var(--muted-foreground)" />
                                </ContextMenuItem>
                                {(message.type === MessageType.TEXT || message.type === MessageType.REPLY || message.type === MessageType.FORWARD) && <DialogTrigger>
                                    <ContextMenuItem className="justify-between">
                                        Forward
                                        <IconCornerUpRight size={18} color="var(--muted-foreground)" />
                                    </ContextMenuItem>
                                </DialogTrigger>}
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                    onClick={() => {
                                        navigator.clipboard.writeText(message.message.content?.[0].content?.map((msg) => msg.text).join("") ?? "");
                                    }}
                                    className="justify-between"
                                >
                                    Copy Text
                                    <Copy size={18} color="var(--muted-foreground)" />
                                </ContextMenuItem>
                                {message.isPinned ? (
                                    <ContextMenuItem className="justify-between" onClick={() => setIsPinDialogOpen(true)}>
                                        Unpin Message
                                        <Pin size={18} color="var(--muted-foreground)" fill="var(--muted-foreground)" className="rotate-45" />
                                    </ContextMenuItem>
                                ) : (
                                    <ContextMenuItem className="justify-between" onClick={() => setIsPinAlertDialogOpen(true)}>
                                        Pin Message
                                        <Pin size={18} color="var(--muted-foreground)" fill="var(--muted-foreground)" className="rotate-45" />
                                    </ContextMenuItem>
                                )}
                                <ContextMenuSeparator />
                                <ContextMenuItem variant="destructive" className="justify-between" onClick={() => setIsDeleteAlertDialogOpen(true)}>
                                    Delete Message
                                    <IconTrash size={18} color="var(--destructive)" />
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-lg! gap-2">
                            {isPinDialogOpen && (
                                <>
                                    <DialogTitle>Unpin Message</DialogTitle>
                                    <DialogDescription>You sure you want to remove this pinned message?</DialogDescription>
                                    <MessageDetails message={message} />
                                    <div className="w-full flex items-start flex-col p-4">
                                        <p className="text-sm font-semibold text-accent">PRO TIP :</p>
                                        <p className="text-sm">You can unpin messages from its context menu.</p>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="secondary" onClick={() => setIsPinDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                setIsPinDialogOpen(false);
                                                unpinMessage({
                                                    channelId: message.referenceId,
                                                    messageId: message._id,
                                                })
                                            }
                                            }
                                        >
                                            Remove it please!
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                            {isForwardDialogOpen && (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>Forward To</DialogTitle>
                                        <DialogDescription>Select where you want to share this message.</DialogDescription>
                                    </DialogHeader>
                                    <ForwardMessage message={message} setIsForwardDialogOpen={setIsForwardDialogOpen} />
                                </>
                            )}
                        </DialogContent>
                        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                            {isPinAlertDialogOpen && (
                                <>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-lg">Pin it. Pin it Vyral</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Hey, just double checking that you want to pin this message to{" "}
                                            {channel?.groupOrServerName ?? `${channel?.directChannelOtherMember?.displayName} channel`} for posterity and greatness?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <MessageDetails message={message} />
                                    <AlertDialogFooter className="justify-between w-full mt-2">
                                        <AlertDialogCancel className="flex-1 h-11" onClick={() => setIsPinAlertDialogOpen(false)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction variant="default" className="flex-1 h-11"
                                            onClick={() =>
                                                pinMessage({
                                                    channelId: channel?._id ?? "",
                                                    messageId: message._id,
                                                    pinnedBy: {
                                                        id: currentUser?._id ?? "",
                                                        label: currentUser?.displayName ?? "",
                                                    },
                                                })
                                            }
                                        >
                                            Oh yeah. Pin it
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </>
                            )}
                            {isDeleteAlertDialogOpen && (
                                <>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-lg">Delete Message</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete this message?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <MessageDetails message={message} />
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm text-accent font-bold">PRO TIP :</span>
                                        <span className="text-xs text-muted-foreground">
                                            You can also delete messages by right-clicking on them and selecting &quot;Delete Message&quot; from the context menu.
                                        </span>
                                    </div>
                                    <AlertDialogFooter className="justify-between w-full mt-2">
                                        <AlertDialogCancel className="flex-1 h-11" onClick={() => setIsDeleteAlertDialogOpen(false)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction variant="destructive" className="flex-1 h-11"
                                            onClick={async () => {
                                                setIsDeleteAlertDialogOpen(false);
                                                await deleteMessage(message._id)
                                            }}
                                        >Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </>
                            )}

                        </AlertDialogContent>
                        <PopoverContent className="w-80 p-0">
                            <UserDetails user={message.sentBy as FriendInterface} size="sm" />
                        </PopoverContent>
                    </Popover>
                </AlertDialog>
            </Dialog >
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison function to prevent unnecessary re-renders
        // Only re-render if these specific props change
        return (
            prevProps.message._id === nextProps.message._id &&
            prevProps.isHovered === nextProps.isHovered &&
            prevProps.showHeader === nextProps.showHeader &&
            prevProps.message.updatedAt === nextProps.message.updatedAt &&
            prevProps.message.reactions?.length === nextProps.message.reactions?.length &&
            prevProps.message.isPinned === nextProps.message.isPinned
        );
    }
);

Message.displayName = "Message";

export default Message;

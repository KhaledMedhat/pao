import { useMemo, useState } from "react"

import { Attachment, MessageInterface, MessageType } from "~/interfaces/message.interface"
import { Input } from "./ui/input"
import { FileIcon, Search } from "lucide-react"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Button } from "./ui/button"
import { toast } from "sonner"
import Image from "next/image"
import { selectCurrentUserChannels, selectCurrentUserInfo } from "~/redux/slices/user/user-selector"
import { useSendMessageMutation } from "~/redux/apis/channel.api"
import { Channel, ChannelType } from "~/interfaces/channels.interface"
import { useAppSelector } from "~/redux/hooks"
import { ScrollArea } from "./ui/scroll-area"
import ReactionPicker from "./reaction-picker"
import { getInitialsFallback } from "~/lib/utils"

const ForwardMessage: React.FC<{ message?: MessageInterface, imageMessage?: { originalMessageId: string, attachments: Attachment }, setIsForwardDialogOpen: (isForwardDialogOpen: boolean) => void }> = ({ message, imageMessage, setIsForwardDialogOpen }) => {
    const [sendMessage] = useSendMessageMutation()
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [currentEmoji, setCurrentEmoji] = useState<string>("😊")
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>([])
    const [newMessage, setNewMessage] = useState<string>("")
    const currentUser = useAppSelector(selectCurrentUserInfo)
    const channels = useAppSelector(selectCurrentUserChannels)
    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return channels

        const query = searchQuery.toLowerCase()
        return channels.filter(
            (channel) => {
                if (channel.groupOrServerName) {
                    return channel.groupOrServerName.toLowerCase().includes(query)
                }

                return channel.directChannelOtherMember?.displayName?.toLowerCase().includes(query) || channel.directChannelOtherMember?.username?.toLowerCase().includes(query)
            }
        )
    }, [channels, currentUser?._id, searchQuery])

    const addEmojiToMessage = (emoji: string) => {
        // Check if emoji already exists in the message to prevent duplicates
        if (!newMessage.includes(emoji)) {
            setNewMessage(prevMessage => prevMessage + emoji);
        }
    };
    const handleForwardMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && selectedChannels.length > 0) {
            for (const channel of selectedChannels) {
                sendMessage({
                    referenceId: channel?._id ?? "",
                    message: message ? message.message : {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                            }
                        ]
                    },
                    sentBy: currentUser._id,
                    type: MessageType.FORWARD,
                    forwardMessageId: message ? message._id : imageMessage?.originalMessageId,
                    attachment: message ? message.attachment : imageMessage && [imageMessage.attachments]
                }).unwrap().then(() => {
                    toast.success("Message Forwarded!")
                    setSelectedChannels([])
                    if (newMessage.trim().length === 0) return
                    sendMessage({
                        referenceId: channel?._id ?? "",
                        message: {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [{ type: "text", text: newMessage }]
                                }
                            ]
                        },
                        sentBy: currentUser._id,
                        type: MessageType.TEXT
                    }).unwrap().then(() => {
                        setIsForwardDialogOpen(false)
                        setNewMessage("")
                    })
                })
            }
        }
    }
    const handleOnPressSend = () => {
        if (selectedChannels.length > 0) {
            for (const channel of selectedChannels) {
                sendMessage({
                    referenceId: channel?._id ?? "",
                    message: message ? message.message : {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                            }
                        ]
                    },
                    sentBy: currentUser._id,
                    type: MessageType.FORWARD,
                    forwardMessageId: message ? message._id : imageMessage?.originalMessageId,
                    attachment: message ? message.attachment : imageMessage && [imageMessage.attachments]
                }).unwrap().then(() => {
                    toast.success("Message Forwarded!")
                    setSelectedChannels([])
                    if (newMessage.trim().length === 0) return
                    sendMessage({
                        referenceId: channel?._id ?? "",
                        message: {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [{ type: "text", text: newMessage }]
                                }
                            ]
                        },
                        sentBy: currentUser._id,
                        type: MessageType.TEXT
                    }).unwrap().then(() => {
                        setIsForwardDialogOpen(false)
                        setNewMessage("")
                    })
                })
            }

        }
    }
    return (
        <div className="flex flex-col gap-4 relative">
            <div className="w-full relative">
                <Input
                    autoComplete="off"
                    className="bg-muted h-10 border-main-foreground"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search color="var(--muted-foreground)" size={20} className="absolute top-1/2 right-2 -translate-y-1/2" />
            </div>
            <ScrollArea className="h-60 mb-29">
                <div className="flex flex-col">
                    {filteredChannels && filteredChannels.length > 0 && (
                        filteredChannels?.map((channel) => (
                            <div
                                key={channel._id}
                                className="group/friend flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-hover transition-all duration-300 ease-in-out"
                                onClick={() => {
                                    const isSelected = selectedChannels.some(selected => selected._id === channel._id)
                                    if (isSelected) {
                                        setSelectedChannels(selectedChannels.filter(selected => selected._id !== channel._id))
                                    } else {
                                        setSelectedChannels([...selectedChannels, channel])
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    {channel.type === ChannelType.Direct ? (() => {
                                        return (
                                            <Avatar className="size-6">
                                                <AvatarImage src={channel.directChannelOtherMember?.profilePicture || ""} alt={channel.directChannelOtherMember?.displayName || ""} />
                                                <AvatarFallback>{getInitialsFallback(channel.directChannelOtherMember?.displayName || "")}</AvatarFallback>
                                                <AvatarBadge className="size-2.5!" variant={channel.directChannelOtherMember?.status?.type} />
                                            </Avatar>
                                        )
                                    })() : (
                                        <Avatar className="size-8 bg-muted">
                                            <AvatarImage src={channel.groupOrServerLogo} />
                                            <AvatarFallback>
                                                {channel.groupOrServerName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className="flex items-start flex-col">
                                        <p className="font-semibold text-sm truncate max-w-[300px]">
                                            {channel.type === ChannelType.Direct ? (() => {
                                                return channel.directChannelOtherMember?.displayName
                                                    ? channel.directChannelOtherMember?.displayName
                                                    : `${channel.members.length} members`
                                            })() : channel.groupOrServerName}
                                        </p>
                                        {channel.type === ChannelType.Direct && (() => {
                                            return channel.directChannelOtherMember?.username && (
                                                <p className="text-xs text-muted-foreground">
                                                    {channel.directChannelOtherMember?.username}
                                                </p>
                                            )
                                        })()}
                                    </div>
                                </div>
                                <Checkbox
                                    className="h-5 w-5"
                                    id={channel._id}
                                    checked={selectedChannels.some(selected => selected._id === channel._id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedChannels([...selectedChannels, channel])
                                        } else {
                                            setSelectedChannels(selectedChannels.filter(selected => selected._id !== channel._id))
                                        }
                                    }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
            <div className=" w-full flex flex-col gap-3 absolute bottom-0">
                <Separator className="bg-muted-foreground/40" />
                <div className="flex items-center gap-2">
                    <span className="bg-muted-foreground/40 h-8 w-1 rounded-xs" />
                    <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col gap-2">
                            <div className="w-full h-fit pt-0.5 flex items-center gap-1">
                                {message?.message ?
                                    message.message.content?.[0].content?.map((msg, idx) => (
                                        <span key={idx} className="h-5">
                                            <p className="text-sm">{msg.type === 'text' && msg.text}</p>
                                            {msg.type === 'mention' && (
                                                <p className="bg-mention px-1 text-mention-secondary font-semibold rounded no-underline text-sm">
                                                    {msg.attrs?.mentionSuggestionChar}{msg.attrs?.label}
                                                </p>
                                            )}
                                        </span>
                                    ))
                                    :
                                    <div className="flex items-center gap-1 text-muted-foreground text-sm"><FileIcon size={16} /> 1 Attachment</div>
                                }
                            </div>
                            {message?.attachment && message?.attachment.length > 0 && <div className="flex items-center gap-1 text-muted-foreground text-sm"><FileIcon size={16} /> {message?.attachment.length} Attachments</div>}
                        </div>
                        {message?.attachment && message?.attachment.length > 0 ?
                            <div className="relative w-12 h-12">
                                <Image src={message?.attachment[0].url} alt="attachment" fill className="object-cover rounded-md" />
                                <Badge className="absolute bottom-0 right-0">
                                    {message.attachment.length}
                                </Badge>
                            </div>
                            :
                            imageMessage && <div className="relative w-12 h-12">
                                <Image src={imageMessage?.attachments.url} alt="attachment" fill className="object-cover rounded-md" />
                            </div>
                        }
                    </div>
                </div>
                <div className="w-full flex items-center gap-2">
                    <div className="relative w-full">
                        <Input
                            autoComplete="off"
                            type="text"
                            className="bg-muted h-11 border-main-foreground w-full"
                            placeholder="Add an optional message ..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleForwardMessage}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <ReactionPicker isShortcut={false} currentEmoji={currentEmoji} setCurrentEmoji={setCurrentEmoji} isMessageInput={false} addEmojiToMessage={addEmojiToMessage}
                            />
                        </div>
                    </div>
                    <Button
                        disabled={selectedChannels.length === 0}
                        size='lg'
                        variant='default'
                        onClick={handleOnPressSend}
                    >
                        Send {selectedChannels.length > 1 && `(${selectedChannels.length})`}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ForwardMessage
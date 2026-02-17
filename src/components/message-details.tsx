import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { MessageInterface } from "~/interfaces/message.interface";
import { formatDate, getInitialsFallback } from "~/lib/utils";
import { AttachmentsGrid } from "./attachments-grid";

const MessageDetails: React.FC<{ message: MessageInterface }> = ({ message }) => {
    return (
        <div className="p-4 bg-muted rounded-md flex flex-col relative w-full">
            <div className="flex items-start gap-2">
                <Avatar className="size-12">
                    <AvatarImage src={message.sentBy?.profilePicture} />
                    <AvatarFallback>
                        {getInitialsFallback(message.sentBy?.displayName)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start pt-1">
                    <div className="flex items-center gap-1">
                        <p className="text-sm font-medium">{message.sentBy?.displayName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(message.createdAt?.toString(), 'sm')}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="w-full h-fit pt-0.5 flex items-center gap-1">
                            {message.message &&
                                message.message.content?.[0].content?.map((msg, idx) => (
                                    <span key={idx}>
                                        <p className="text-sm break-all">{msg.type === 'text' && msg.text}</p>
                                        {msg.type === 'mention' && (
                                            <p className="bg-mention px-1 text-mention-secondary font-semibold rounded no-underline text-sm">
                                                {msg.attrs?.mentionSuggestionChar}{msg.attrs?.label}
                                            </p>
                                        )}
                                    </span>
                                ))
                            }
                        </div>
                        {message.attachment && message.attachment.length > 0 && (
                            <div className="mt-2">
                                <AttachmentsGrid isAlert={true} attachments={message.attachment} sender={message.sentBy} messageSentAt={message.createdAt} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    )
}

export default MessageDetails;
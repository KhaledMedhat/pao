import { memo } from "react";
import { IconPinFilled, IconX } from "@tabler/icons-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { formatDate, getChannelTypeLabel, getInitialsFallback } from "~/lib/utils";
import type { Channel } from "~/interfaces/channels.interface";
import type { MessageInterface } from "~/interfaces/message.interface";
import { SHORT_LOGO_URL } from "~/constants/constants";

interface PinnedMessagesContentProps {
  channel: Channel | null;
  onScrollToMessage: (messageId: string) => void;
  onUnpinMessage: (args: { channelId: string; messageId: string }) => void;
}

const PinnedMessagesContent = memo(function PinnedMessagesContent({
  channel,
  onScrollToMessage,
  onUnpinMessage,
}: PinnedMessagesContentProps) {
  if (!channel?.pinnedMessages?.length) {
    return (
      <Empty className="w-full flex items-center justify-center">
        <EmptyHeader>
          <EmptyMedia variant="default" className="relative">
            <IconPinFilled size={80} className="text-muted-foreground" />
            <span className="absolute top-0 right-8 text-xs bg-muted-foreground w-0.5 h-20 rotate-135" />
          </EmptyMedia>
          <EmptyTitle>No pinned messages</EmptyTitle>
          <EmptyDescription>
            This {getChannelTypeLabel(channel?.type)} doesnt have any pinned messages yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className="h-90 px-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <IconPinFilled size={30} />
          <h1 className="text-lg font-semibold">Pinned Messages</h1>
        </div>
        {channel.pinnedMessages
          .slice()
          .reverse()
          .map((message: MessageInterface) => (
            <Card key={message._id} className="relative group">
              <div className="hidden group-hover:flex items-center absolute top-2 right-2">
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => onScrollToMessage(message._id)}
                >
                  Jump
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    onUnpinMessage({
                      channelId: channel._id,
                      messageId: message._id,
                    })
                  }
                >
                  <IconX size={16} />
                </Button>
              </div>
              <CardContent>
                <div className="flex items-start gap-2">
                  <Avatar className="size-10" style={
                    message.sentBy?.profilePicture === SHORT_LOGO_URL && message.sentBy?.profilePictureBannerColor
                      ? { backgroundColor: message.sentBy.profilePictureBannerColor }
                      : undefined
                  }>
                    <AvatarImage src={message.sentBy?.profilePicture} />
                    <AvatarFallback>
                      {getInitialsFallback(message.sentBy?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium">{message.sentBy?.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(message.createdAt?.toString(), "md")}
                      </p>
                    </div>
                    <p className="text-sm">
                      {message.message.content?.[0].content?.[0].text}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </ScrollArea>
  );
});

export default PinnedMessagesContent;

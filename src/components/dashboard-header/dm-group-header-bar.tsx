import { memo, useState, useCallback, useMemo } from "react";
import {
  IconPencil,
  IconPhoneCall,
  IconPinFilled,
  IconUsersPlus,
  IconUserSquareRounded,
  IconUsers,
  IconVideoFilled,
} from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { setIsPinnedMessagesOpen, setShowChannelDetails } from "~/redux/slices/app/app-slice";
import { ActiveUI, FriendsSelectorView } from "~/interfaces/app.interface";
import { ChannelType, type Channel } from "~/interfaces/channels.interface";
import { getChannelTypeLabel, getInitialsFallback } from "~/lib/utils";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { useUnpinMessageMutation } from "~/redux/apis/channel.api";
import { useScrollToMessage } from "~/hooks/use-scroll-to-message";
import { useChannelMessages } from "~/hooks/use-channel-messages";
import { useScrollContext } from "~/contexts/scroll-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroupGrid, AvatarImage } from "~/components/ui/avatar";
import PinnedMessagesContent from "./pinned-messages-content";
import SearchInput from "./search-input";
import ChannelEditDialog from "./channel-edit-dialog";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import FriendsSelector from "../friends-selector";

interface DMGroupHeaderBarProps {
  channel: Channel | null;
  showChannelDetailsPanel: boolean;
  isPinnedOpen: boolean;
}

const DMGroupHeaderBar = memo(function DMGroupHeaderBar({
  channel,
  showChannelDetailsPanel,
  isPinnedOpen,
}: DMGroupHeaderBarProps) {
  const dispatch = useAppDispatch();
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [unpinMessage] = useUnpinMessageMutation();
  const { scrollContainerRef } = useScrollContext();

  const { messages, isLoadingMore, hasMore, loadMoreMessages } = useChannelMessages(
    channel?._id || ""
  );

  const { scrollToMessage } = useScrollToMessage({
    messages,
    hasMore,
    isLoadingMore,
    loadMoreMessages,
    scrollContainerRef,
  });

  const handleToggleDetails = useCallback(
    () => dispatch(setShowChannelDetails(!showChannelDetailsPanel)),
    [dispatch, showChannelDetailsPanel]
  );

  const handleOpenDialog = useCallback(() => {
    setIsChannelDialogOpen(true);
  }, []);

  const handleUnpin = useCallback(
    (args: { channelId: string; messageId: string }) => unpinMessage(args),
    [unpinMessage]
  );

  const detailsIcon = useMemo(
    () =>
      ActiveUI.DIRECT_MESSAGES ? (
        <IconUserSquareRounded size={20} />
      ) : (
        <IconUsers size={20} />
      ),
    []
  );

  const detailsLabel = useMemo(() => {
    if (ActiveUI.DIRECT_MESSAGES) {
      return showChannelDetailsPanel ? "Hide User Profile" : "Show User Profile";
    }
    return showChannelDetailsPanel ? "Hide Member List" : "Show Member List";
  }, [showChannelDetailsPanel]);

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="text-foreground group/channel-header-button"
              onClick={handleOpenDialog}
            >
              <div className="flex items-center gap-2">
                {channel?.type === ChannelType.Direct && (
                  <Avatar style={
                    channel.directChannelOtherMember?.profilePicture === SHORT_LOGO_URL && channel.directChannelOtherMember?.profilePictureBannerColor
                      ? { backgroundColor: channel.directChannelOtherMember.profilePictureBannerColor }
                      : undefined
                  }>
                    <AvatarImage
                      src={
                        channel?.directChannelOtherMember?.profilePicture
                      }
                      alt={channel?.directChannelOtherMember?.displayName}
                    />
                    <AvatarFallback>
                      {getInitialsFallback(channel?.directChannelOtherMember?.displayName)}
                    </AvatarFallback>
                    <AvatarBadge
                      className="size-2.5!"
                      variant={channel?.directChannelOtherMember?.status?.type}
                    />
                  </Avatar>
                )}

                {channel?.type === ChannelType.Group ?
                  channel.groupOrServerLogo ? (
                    <Avatar>
                      <AvatarImage
                        src={
                          channel?.groupOrServerLogo
                        }
                        alt={channel?.groupOrServerName}
                      />
                      <AvatarFallback>
                        {getInitialsFallback(channel?.groupOrServerName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <AvatarGroupGrid>
                      {channel?.members.filter((m) => m._id !== currentUserInfo._id).slice(0, 2).map((m, index) => (
                        <Avatar key={`${m._id}-${index}`} style={
                          m.profilePicture === SHORT_LOGO_URL && m.profilePictureBannerColor
                            ? { backgroundColor: m.profilePictureBannerColor }
                            : undefined
                        }>
                          <AvatarImage src={m.profilePicture} />
                          <AvatarFallback className="text-[10px]">{getInitialsFallback(m.displayName || "")}</AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarGroupGrid>
                  )
                  : null}

                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm max-w-[150px] truncate">
                    {channel?.type === ChannelType.Direct
                      ? channel?.directChannelOtherMember?.displayName || ""
                      : channel?.groupOrServerName}
                  </p>
                </div>
                {channel?.type === ChannelType.Group && (
                  <IconPencil
                    size={16}
                    className="hidden group-hover/channel-header-button:block"
                  />
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {channel?.type === ChannelType.Direct
              ? channel?.directChannelOtherMember?.displayName || ""
              : "Edit Group"}
          </TooltipContent>
        </Tooltip>

        {isChannelDialogOpen && (
          <ChannelEditDialog
            channel={channel}
            open={isChannelDialogOpen}
            onOpenChange={setIsChannelDialogOpen}
          />
        )}

        <Badge variant="secondary" className="text-xs text-muted-foreground">
          {getChannelTypeLabel(channel?.type)}
        </Badge>
      </div>

      <div className="flex items-center justify-end gap-1">
        {/* Voice Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-full">
              <IconPhoneCall size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start Voice Call</TooltipContent>
        </Tooltip>

        {/* Video Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-full">
              <IconVideoFilled size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start Video Call</TooltipContent>
        </Tooltip>

        {/* Pinned Messages */}
        <Popover
          open={isPinnedOpen}
          onOpenChange={(open) => dispatch(setIsPinnedMessagesOpen(open))}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full">
                  <IconPinFilled size={20} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Pinned Messages</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-md px-1">
            <PinnedMessagesContent
              channel={channel}
              onScrollToMessage={scrollToMessage}
              onUnpinMessage={handleUnpin}
            />
          </PopoverContent>
        </Popover>

        {/* Add Friends */}
        <FriendsSelector friends={currentUserInfo.friends}
          currentUser={currentUserInfo}
          view={FriendsSelectorView.CHANNEL} />

        {/* Show/Hide Details */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleToggleDetails}
              className={`rounded-full ${showChannelDetailsPanel ? "text-accent-foreground" : ""}`}
            >
              {detailsIcon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{detailsLabel}</TooltipContent>
        </Tooltip>

        {/* Search */}
        <SearchInput channel={channel} messages={messages} onScrollToMessage={scrollToMessage} />

      </div>
    </div>
  );
});

export default DMGroupHeaderBar;

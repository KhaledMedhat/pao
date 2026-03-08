import { memo, useState, useCallback, useMemo } from "react";
import {
  IconBellFilled,
  IconHash,
  IconPinFilled,
  IconUsers,
  IconUserSquareRounded,
} from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { setIsPinnedMessagesOpen, setShowChannelDetails } from "~/redux/slices/app/app-slice";
import { ActiveUI } from "~/interfaces/app.interface";
import { type Channel } from "~/interfaces/channels.interface";
import { getChannelTypeLabel, getInitialsFallback } from "~/lib/utils";
import { DURATIONS, MUTE_OPTIONS } from "~/constants/constants";
import { useUnpinMessageMutation } from "~/redux/apis/channel.api";
import { useScrollToMessage } from "~/hooks/use-scroll-to-message";
import { useChannelMessages } from "~/hooks/use-channel-messages";
import { useScrollContext } from "~/contexts/scroll-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import PinnedMessagesContent from "./pinned-messages-content";
import SearchInput from "./search-input";
import { selectActiveChannelRoom } from "~/redux/slices/app/app-selector";

interface ServerHeaderBarProps {
  channel: Channel | null;
  showChannelDetailsPanel: boolean;
  isPinnedOpen: boolean;
}

const ServerHeaderBar = memo(function ServerHeaderBar({
  channel,
  showChannelDetailsPanel,
  isPinnedOpen,
}: ServerHeaderBarProps) {
  const dispatch = useAppDispatch();
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [muteOption, setMuteOption] = useState("all");
  const [unpinMessage] = useUnpinMessageMutation();
  const { scrollContainerRef } = useScrollContext();
  const activeChannelRoom = useAppSelector(selectActiveChannelRoom);

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

  const detailsLabel = useMemo(
    () => (showChannelDetailsPanel ? "Hide Member List" : "Show Member List"),
    [showChannelDetailsPanel]
  );

  return (
    <div className="flex items-between gap-4 w-full">
      <div className="flex items-center w-full gap-2">
        <IconHash size={20} />
        <p className="font-semibold text-sm">{activeChannelRoom?.name}</p>
      </div>

      <div className="flex items-center justify-end gap-1">
        {/* Notification Settings */}
        <DropdownMenu
          open={isNotificationSettingsOpen}
          onOpenChange={setIsNotificationSettingsOpen}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full">
                  <IconBellFilled size={20} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Notification Settings</TooltipContent>
          </Tooltip>
          <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()} className="w-40 px-1">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Mute Server</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {DURATIONS.map((duration) => (
                    <DropdownMenuItem key={duration.value}>
                      {duration.text}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {MUTE_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                defaultChecked={option.value === "all"}
                checked={muteOption === option.value}
                onCheckedChange={(checked) =>
                  setMuteOption(checked ? option.value : "all")
                }
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
        <Button variant="ghost" className="hover:bg-transparent p-0 rounded-full">
          <SearchInput channel={channel} />
        </Button>
      </div>
    </div>
  );
});

export default ServerHeaderBar;

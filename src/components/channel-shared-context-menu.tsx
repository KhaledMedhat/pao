import { useCallback, useState } from "react";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
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
import { IconAtOff, IconIdBadge } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserChannels, selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { MUTE_DURATION_OPTIONS } from "~/constants/constants";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { setChannelListActive } from "~/redux/slices/user/user-slice";
import { useRemoveFriendMutation } from "~/redux/apis/auth.api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import UserDetails from "./user-details";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { isTheUserFriend } from "~/lib/utils";
import { useSendFriendRequestMutation } from "~/redux/apis/user.api";

const ChannelSharedContextMenu: React.FC<{ channel: Channel; children: React.ReactNode }> = ({ channel, children }) => {
  const dispatch = useAppDispatch();
  const [isOtherMemberDetailsDialogOpen, setIsOtherMemberDetailsDialogOpen] = useState<boolean>(false);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const currentUserChannelServers = useAppSelector(selectCurrentUserChannels).filter((c) => c.type === ChannelType.Server);
  const [removeFriend] = useRemoveFriendMutation();
  const [addFriend] = useSendFriendRequestMutation();
  const renderContextMenuItems = useCallback(() => {
    switch (channel.type) {
      case ChannelType.Direct:
        return (
          <>
            <ContextMenuItem disabled>Mark As Read</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setIsOtherMemberDetailsDialogOpen(true)}>Profile</ContextMenuItem>
            <ContextMenuItem>Call</ContextMenuItem>
            <ContextMenuItem onClick={() => dispatch(setChannelListActive({ channelId: channel._id, listActive: false }))}>Close DM</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Invite to Server</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-fit">
                {currentUserChannelServers.length > 0 ? (
                  currentUserChannelServers.map((server) => <ContextMenuItem key={server._id}>{server.groupOrServerName}</ContextMenuItem>)
                ) : (
                  <Empty className="w-full flex items-center justify-center">
                    <EmptyHeader>
                      <EmptyMedia variant="default">
                        <IconAtOff className="size-12 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>No Servers found</EmptyTitle>
                      <EmptyDescription>
                        You are not in any servers to invite this @{channel.directChannelOtherMember?.displayName || ""} to.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem
              onClick={() => isTheUserFriend(currentUserInfo, channel.directChannelOtherMember?._id || "") ? removeFriend({ friendId: channel.directChannelOtherMember?._id || "" }) : addFriend({ sender: currentUserInfo, username: channel.directChannelOtherMember?.username || "" })}
            >
              {isTheUserFriend(currentUserInfo, channel.directChannelOtherMember?._id || "") ? "Remove Friend" : "Add Friend"}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Mute @{channel.directChannelOtherMember?.displayName || ""}</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-44">
                {MUTE_DURATION_OPTIONS.map((option) => (
                  <ContextMenuItem key={option.value}>{option.label}</ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="justify-between"
              onClick={() => navigator.clipboard.writeText(channel.directChannelOtherMember?.username || "")}
            >
              Copy User ID <IconIdBadge />
            </ContextMenuItem>
          </>
        );
      case ChannelType.Group:
        return <></>;

      case ChannelType.Server:
        return <></>;
      default:
        return null;
    }
  }, [channel, currentUserInfo._id, currentUserChannelServers, removeFriend, dispatch]);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-fit">{renderContextMenuItems()}</ContextMenuContent>
      </ContextMenu>
      <Dialog open={isOtherMemberDetailsDialogOpen} onOpenChange={setIsOtherMemberDetailsDialogOpen}>
        <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>
          <UserDetails user={channel.directChannelOtherMember || currentUserInfo} size="lg" setDialogOpen={setIsOtherMemberDetailsDialogOpen} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChannelSharedContextMenu;

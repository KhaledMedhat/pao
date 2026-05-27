import { useCallback, useState } from "react";
import { Channel, ChannelAction, ChannelType } from "~/interfaces/channels.interface";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
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
import { MUTE_DURATION_OPTIONS, MUTE_OPTIONS } from "~/constants/constants";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { setChannelListActive } from "~/redux/slices/user/user-slice";
import { useRemoveFriendMutation } from "~/redux/apis/auth.api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import UserDetails from "./user-details";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { getChannelTypeLabel, isTheUserFriend } from "~/lib/utils";
import { useSendFriendRequestMutation } from "~/redux/apis/user.api";
import ChannelEditDialog from "./dashboard-header/channel-edit-dialog";
import FriendsSelector from "./friends-selector";
import { useDeleteChannelMutation, useLeaveChannelMutation } from "~/redux/apis/channel.api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Spinner } from "./ui/spinner";
import { useRouter } from "next/navigation";
import { setActiveChannelRoom, setActiveUI, setCurrentChannelId } from "~/redux/slices/app/app-slice";
import { ActiveUI } from "~/interfaces/app.interface";
import CreateChannelInServerDialog from "./create-channel-in-server-dialog";

const ChannelSharedContextMenu: React.FC<{ channel: Channel; children: React.ReactNode }> = ({ channel, children }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isOtherMemberDetailsDialogOpen, setIsOtherMemberDetailsDialogOpen] = useState<boolean>(false);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState<boolean>(false);

  const [openServerCreateChannelDialog, setOpenServerCreateChannelDialog] = useState<boolean>(false);

  const [channelInfo, setChannelInfo] = useState<{ channelId: string, action: ChannelAction } | null>(null);
  const [isInviteFriendsDialogOpen, setIsInviteFriendsDialogOpen] = useState<boolean>(false);
  const [isInviteFriendsToServerDialogOpen, setIsInviteFriendsToServerDialogOpen] = useState<boolean>(false);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const currentUserChannelServers = useAppSelector(selectCurrentUserChannels).filter((c) => c.type === ChannelType.Server);
  const [removeFriend] = useRemoveFriendMutation();
  const [addFriend] = useSendFriendRequestMutation();
  const [leaveChannel, { isLoading: isLeavingChannelLoading }] = useLeaveChannelMutation();
  const [deleteChannel, { isLoading: isDeletingChannelLoading }] = useDeleteChannelMutation();
  const [muteOption, setMuteOption] = useState<string>("all");
  const handleOpenInviteFriendsDialog = useCallback(() => {
    setIsInviteFriendsDialogOpen(true);
  }, []);

  const handleOpenInviteFriendsToServerDialog = useCallback(() => {
    setIsInviteFriendsToServerDialogOpen(true);
  }, []);

  const handleOpenServerCreateChannelDialog = useCallback(() => {
    setOpenServerCreateChannelDialog(true);
  }, [setOpenServerCreateChannelDialog]);

  const handleOpenChannelEditDialog = useCallback(() => {
    setIsChannelDialogOpen(true);
  }, [setIsChannelDialogOpen]);

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
        return <>
          <ContextMenuItem disabled>Mark As Read</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleOpenInviteFriendsDialog}>Invite</ContextMenuItem>
          <ContextMenuItem onClick={handleOpenChannelEditDialog}>Edit Group</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>Mute Conversation</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              {MUTE_DURATION_OPTIONS.map((option) => (
                <ContextMenuItem key={option.value}>{option.label}</ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => setChannelInfo({ channelId: channel._id, action: ChannelAction.Leave })}>Leave Group</ContextMenuItem>
        </>;

      case ChannelType.Server:
        return <>
          <ContextMenuItem disabled>Mark As Read</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleOpenInviteFriendsToServerDialog}>Invite to Server</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>Mute Server</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              {MUTE_DURATION_OPTIONS.map((option) => (
                <ContextMenuItem key={option.value}>{option.label}</ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Notification Settings</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              {MUTE_OPTIONS.map((option) => (
                <ContextMenuCheckboxItem
                  key={option.value}
                  defaultChecked={option.value === "all"}
                  checked={muteOption === option.value}
                  onCheckedChange={(checked) =>
                    setMuteOption(checked ? option.value : "all")
                  }
                >
                  {option.label}
                </ContextMenuCheckboxItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          {channel.createdBy === currentUserInfo._id ? (
            <>
              <ContextMenuItem onClick={handleOpenServerCreateChannelDialog}>Create Channel</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive" onClick={() => setChannelInfo({ channelId: channel._id, action: ChannelAction.Delete })}>Delete Server</ContextMenuItem>

            </>
          ) : <>
            <ContextMenuItem variant="destructive" onClick={() => setChannelInfo({ channelId: channel._id, action: ChannelAction.Leave })}>Leave Server</ContextMenuItem>

          </>}
        </>;
      default:
        return null;
    }
  }, [channel, currentUserInfo._id, currentUserChannelServers, removeFriend, dispatch]);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>{renderContextMenuItems()}</ContextMenuContent>
      </ContextMenu>
      {isChannelDialogOpen && (
        <ChannelEditDialog
          channel={channel}
          open={isChannelDialogOpen}
          onOpenChange={setIsChannelDialogOpen}
        />
      )}
      {openServerCreateChannelDialog && <CreateChannelInServerDialog currentChannel={channel} open={openServerCreateChannelDialog} onOpenChange={setOpenServerCreateChannelDialog} />}
      {(isInviteFriendsDialogOpen || isInviteFriendsToServerDialogOpen) && (
        <FriendsSelector
          friends={currentUserInfo.friends}
          currentUser={currentUserInfo}
          channel={channel}
          isInvitingFriends={isInviteFriendsDialogOpen ? true : undefined}
          isInviteFriendsDialogOpen={isInviteFriendsDialogOpen}
          setIsInviteFriendsDialogOpen={setIsInviteFriendsDialogOpen}
          isInviteFriendsToServerDialogOpen={isInviteFriendsToServerDialogOpen}
          setIsInviteFriendsToServerDialogOpen={setIsInviteFriendsToServerDialogOpen}
        />
      )}

      {/* Alert dialog for leaving group channel - rendered once outside the loop */}
      <AlertDialog open={!!channelInfo} onOpenChange={(open) => !open && setChannelInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {channelInfo?.action === ChannelAction.Leave ? "Leave" : "Delete"} {channel.groupOrServerName} {getChannelTypeLabel(channel.type)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {channelInfo?.action === ChannelAction.Leave ? <>
                Are you sure you want to leave{" "}
                <span className="font-semibold">{channel.groupOrServerName}</span>{" "}
                {getChannelTypeLabel(channel.type)}? You won't be able to rejoin this group unless you are re-invited.
              </> : <>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{channel.groupOrServerName}</span>{" "}
                {getChannelTypeLabel(channel.type)}?
              </>}

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/80">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isLeavingChannelLoading || isDeletingChannelLoading}
              onClick={() => {
                if (channelInfo) {
                  if (channelInfo.action === ChannelAction.Leave) {
                    leaveChannel(channelInfo.channelId);
                  } else {
                    deleteChannel(channelInfo.channelId);
                  }
                  setChannelInfo(null);
                  dispatch(setCurrentChannelId(null));
                  dispatch(setActiveChannelRoom(null));
                  dispatch(setActiveUI(ActiveUI.FRIENDS_LIST));
                  router.push(`/channels/${currentUserInfo.channelSlug}`);
                }
              }}
            >
              {isLeavingChannelLoading || isDeletingChannelLoading ? (
                <>
                  <Spinner />
                  {channelInfo?.action === ChannelAction.Leave ? "Leaving" : "Deleting"} {getChannelTypeLabel(channel.type)}...
                </>
              ) : (
                `${channelInfo?.action === ChannelAction.Leave ? "Leave" : "Delete"} ${getChannelTypeLabel(channel.type)}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

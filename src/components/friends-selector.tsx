import { MAX_FRIENDS, SHORT_LOGO_URL } from "~/constants/constants";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { Tag, TagInput } from "./ui/tag-input";
import { useId, useState } from "react";
import { FriendInterface, User } from "~/interfaces/user.interface";
import { useRouter } from "next/navigation";
import { cn, createChannelName, extractDirectChannelFromMembers, getInitialsFallback } from "~/lib/utils";
import { useAddGroupChannelMembersMutation, useCreateChannelMutation, useSendServerInvitationLinkMutation } from "~/redux/apis/channel.api";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { IconHash, IconMessageCirclePlus, IconPlus, IconSearch, IconUsersPlus, IconX } from "@tabler/icons-react";
import { SidebarMenuButton } from "./ui/sidebar";
import { Spinner } from "./ui/spinner";
import { ActiveUI, FriendsSelectorView } from "~/interfaces/app.interface";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserChannels } from "~/redux/slices/user/user-selector";
import { setActiveUI, setCurrentChannelId } from "~/redux/slices/app/app-slice";
import { addChannel, setChannelListActive } from "~/redux/slices/user/user-slice";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

const FriendsSelector: React.FC<{ friends: FriendInterface[]; currentUser: User; view?: FriendsSelectorView; isInvitingFriends?: boolean; channel?: Channel; isInviteFriendsDialogOpen?: boolean; setIsInviteFriendsDialogOpen?: (open: boolean) => void; isInviteFriendsToServerDialogOpen?: boolean; setIsInviteFriendsToServerDialogOpen?: (open: boolean) => void }> = ({
  friends,
  currentUser,
  view,
  isInvitingFriends,
  channel,
  isInviteFriendsDialogOpen,
  setIsInviteFriendsDialogOpen,
  isInviteFriendsToServerDialogOpen,
  setIsInviteFriendsToServerDialogOpen,
}) => {
  const [createChannel, { isLoading: isCreateChannelLoading }] = useCreateChannelMutation();
  const [addGroupChannelMembers, { isLoading: isAddingGroupChannelMembersLoading }] = useAddGroupChannelMembersMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const id = useId();
  const [openPopover, setOpenPopover] = useState<boolean>(false);
  const [selectedFriends, setSelectedFriends] = useState<FriendInterface[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState<boolean>(false);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);
  const [inviteToServerSearch, setInviteToServerSearch] = useState<string>("");
  const currentUserChannels = useAppSelector(selectCurrentUserChannels);
  const [sendServerInvitationLink, { isLoading: isSendingServerInvitationLink }] = useSendServerInvitationLinkMutation();

  const filteredFriends = view === FriendsSelectorView.CHANNEL ? friends.filter((friend) => friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) && !channel?.members.some((member) => member._id === friend._id)) : friends.filter((friend) => friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredServerInvitationFriends = currentUser.friends.filter((friend) => !channel?.members.some((member) => member._id === friend._id));
  const isInvitingFilteredFriends = currentUser.friends.filter((friend) => friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) && !channel?.members.some((member) => member._id === friend._id));

  const handleSendServerInvitationLink = async (friendId: string) => {
    setInvitingFriendId(friendId);
    try {
      await sendServerInvitationLink({
        sendTo: extractDirectChannelFromMembers(currentUser._id, currentUserChannels, friendId)?._id || "",
        invitationLink: {
          link: channel?.serverInvitationLink?.link || "",
          id: channel?.serverInvitationLink?.id || "",
        },
      }).unwrap();
    } finally {
      setInvitingFriendId((prev) => (prev === friendId ? null : prev));
    }
  };

  const friendSelectorDisplayHelper = () => {
    switch (view) {
      case FriendsSelectorView.SIDEBAR:
        return {
          tooltip: "Create DM",
          icon: <IconPlus size={16} />,
          loadingText: selectedFriends.length > 1 ? "Creating Group ..." : "Creating DM ...",
          buttonText: selectedFriends.length > 1 ? "Create Group" : "Create DM",
        };
      case FriendsSelectorView.DASHBOARD:
        return {
          tooltip: "New Group DM",
          icon: <IconMessageCirclePlus stroke={2} className="size-9!" />,
          loadingText: selectedFriends.length > 1 ? "Creating Group ... " : "Creating DM ...",
          buttonText: selectedFriends.length > 1 ? "Create Group" : "Create DM",
        };
      case FriendsSelectorView.CHANNEL:
        return {
          tooltip: "Add Friends to DM",
          icon: <IconUsersPlus size={16} />,
          loadingText: "Creating Group DM ...",
          buttonText: "Create Group DM",
        };
      default:
        return {
          tooltip: null,
          icon: null,
          loadingText: null,
          buttonText: null,
        };
    }
  };

  const friendTags: Tag[] = selectedFriends.map((friend) => ({
    id: friend._id,
    text: friend.displayName,
  }));
  const handleSelect = (friend: FriendInterface) => {
    if (selectedFriends.some((selected) => selected._id === friend._id)) {
      // Remove friend
      const newSelectedFriends = selectedFriends.filter((f) => f._id !== friend._id);
      setSelectedFriends(newSelectedFriends);
    } else if (selectedFriends.length < MAX_FRIENDS) {
      // Add friend
      const newSelectedFriends = [...selectedFriends, friend];
      setSelectedFriends(newSelectedFriends);
    }
  };

  const handleTagsChange = (newTags: Tag[]) => {
    // Convert tags back to friends
    const newSelectedFriends = newTags
      .map((tag) => friends.find((friend) => friend._id === tag.id))
      .filter((friend): friend is FriendInterface => friend !== undefined);

    setSelectedFriends(newSelectedFriends);
  };

  const handleCreateDM = async () => {
    if (selectedFriends.length === 1) {
      const directedChannel = currentUserChannels.find((channel) => channel.members.some((member) => member._id === selectedFriends[0]._id));
      dispatch(setChannelListActive({ channelId: directedChannel?._id || "", listActive: true }));
      router.push(`/dm/${selectedFriends[0]._id}`);
      directedChannel && dispatch(setCurrentChannelId(directedChannel._id));
      dispatch(setActiveUI(ActiveUI.DIRECT_MESSAGES));
      setOpenPopover(false);
      setSelectedFriends([]);
    } else {
      await createChannel({
        members: [...selectedFriends.map((friend) => friend._id), currentUser._id],
        type: ChannelType.Group,
        groupOrServerName: createChannelName([currentUser.displayName, ...selectedFriends.map((friend) => friend.displayName)]),
      })
        .unwrap()
        .then((res) => {
          dispatch(addChannel(res.data.channel));
          dispatch(setCurrentChannelId(res.data.channel._id));
          dispatch(setActiveUI(ActiveUI.GROUP));
          router.push(`/group/${res.data.route}`);
          setSelectedFriends([]);
          setOpenPopover(false);
        });
    }
  };
  const handleAddGroupChannelMembers = () => {
    selectedFriends.forEach((friend) => {
      addGroupChannelMembers({ channelId: channel?._id ?? "", data: { memberToAdd: friend._id, addedBy: currentUser._id } }).unwrap().then(() => {
        setSelectedFriends([]);
        setOpenPopover(false);
      });
    });
  };
  return (
    channel?.type !== ChannelType.Server ? !isInvitingFriends ?
      <Popover open={openPopover} onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            tooltip={{
              children: friendSelectorDisplayHelper().tooltip,
              hidden: false,
            }}
            asChild
            className="data-[slot=sidebar-menu-button]:p-1.5! w-fit"
          >
            {friendSelectorDisplayHelper().icon}
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-md p-6 relative flex flex-col gap-6 items-center">
          <div className="w-full">
            <h2 className="text-xl font-semibold">Select Friends</h2>
            <p className="text-xs text-muted-foreground mb-4">You can add {MAX_FRIENDS - selectedFriends.length} more friends.</p>
            <div className="mb-4 flex items-center gap-2">
              <TagInput
                id={id}
                tags={friendTags}
                setTags={handleTagsChange}
                placeholder="Type the username of a friend"
                activeTagIndex={activeTagIndex}
                setActiveTagIndex={setActiveTagIndex}
                onInputChange={setSearchQuery}
                inputValue={searchQuery}
              />
              {view === FriendsSelectorView.CHANNEL && <Button variant="default" size="xl" disabled={isAddingGroupChannelMembersLoading || selectedFriends.length === 0} onClick={handleAddGroupChannelMembers}>{isAddingGroupChannelMembersLoading ? <Spinner /> : "Add"}</Button>}
            </div>
            <ScrollArea className="h-48 mb-12">
              <div className="flex flex-col">
                {filteredFriends && filteredFriends.length > 0 ? (
                  filteredFriends?.map((friend) => (
                    <div
                      key={friend._id}
                      className="group/friend flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted-foreground/8 transition-all duration-300 ease-in-out"
                      onClick={() => handleSelect(friend)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar style={
                          friend.profilePicture === SHORT_LOGO_URL && friend.profilePictureBannerColor
                            ? { backgroundColor: friend.profilePictureBannerColor }
                            : undefined
                        }>
                          <AvatarImage src={friend.profilePicture} alt={friend.displayName} />
                          <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                          <AvatarBadge className="size-2.5!" variant={friend.status.type} />
                        </Avatar>

                        <div className="flex items-start flex-col">
                          <p className="font-semibold text-sm">{friend.displayName}</p>
                          <p className="text-xs text-muted-foreground">{friend.username}</p>
                        </div>
                      </div>
                      <Checkbox className="h-5 w-5" id={friend._id} checked={selectedFriends.some((selected) => selected._id === friend._id)} />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                    <p className="text-sm font-medium">No friends found</p>
                    <p className="text-xs">Try a different search term</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {view !== FriendsSelectorView.CHANNEL && <div className="bg-muted z-10 rounded-bl-md rounded-br-md absolute bottom-0 w-full py-6 px-8">
            <Button onClick={handleCreateDM} variant="default" className="w-full p-5" disabled={isCreateChannelLoading || selectedFriends.length === 0}>
              {isCreateChannelLoading ? (
                <span className="flex items-center gap-1">
                  <Spinner />
                  {friendSelectorDisplayHelper().loadingText}
                </span>
              ) : (
                friendSelectorDisplayHelper().buttonText
              )}
            </Button>
          </div>}
        </PopoverContent>
      </Popover>
      :
      <Dialog open={isInviteFriendsDialogOpen} onOpenChange={setIsInviteFriendsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Friends</DialogTitle>
            <DialogDescription>You can add {MAX_FRIENDS - selectedFriends.length - (channel?.members?.length || 0)} more friends.</DialogDescription>
          </DialogHeader>
          <div className="w-full">
            <div className="mb-4 flex items-center w-full gap-2">
              <TagInput
                id={id}
                tags={friendTags}
                setTags={handleTagsChange}
                placeholder="Type the username of a friend"
                activeTagIndex={activeTagIndex}
                setActiveTagIndex={setActiveTagIndex}
                onInputChange={setSearchQuery}
                inputValue={searchQuery}
              />
              <Button onClick={handleAddGroupChannelMembers} size='lg' className="h-11" disabled={selectedFriends.length === 0 || isAddingGroupChannelMembersLoading}>
                {isAddingGroupChannelMembersLoading ? <Spinner /> : "Add"}
              </Button>
            </div>
            <ScrollArea className="h-48 mb-12">
              <div className="flex flex-col">
                {isInvitingFilteredFriends && isInvitingFilteredFriends.length > 0 ? (
                  isInvitingFilteredFriends?.map((friend) => (
                    <div
                      key={friend._id}
                      className="group/friend flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted-foreground/8 transition-all duration-300 ease-in-out"
                      onClick={() => handleSelect(friend)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar style={
                          friend.profilePicture === SHORT_LOGO_URL && friend.profilePictureBannerColor
                            ? { backgroundColor: friend.profilePictureBannerColor }
                            : undefined
                        }>
                          <AvatarImage src={friend.profilePicture} alt={friend.displayName} />
                          <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                          <AvatarBadge className="size-2.5!" variant={friend.status.type} />
                        </Avatar>

                        <div className="flex items-start flex-col">
                          <p className="font-semibold text-sm">{friend.displayName}</p>
                          <p className="text-xs text-muted-foreground">{friend.username}</p>
                        </div>
                      </div>
                      <Checkbox className="h-5 w-5" id={friend._id} checked={selectedFriends.some((selected) => selected._id === friend._id)} />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                    <p className="text-sm font-medium">No friends found</p>
                    <p className="text-xs">Try a different search term</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      :
      <Dialog open={isInviteFriendsToServerDialogOpen} onOpenChange={setIsInviteFriendsToServerDialogOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader className="space-y-2">
            <DialogTitle>Invite friends to {channel?.groupOrServerName}</DialogTitle>
            <DialogDescription className="flex gap-1 items-center text-md">
              Recipients will land in <IconHash size={20} /> {channel?.channelMessageRooms?.find((room) => room.type === "Primary")?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full flex flex-col items-center gap-4">
            <div className="relative w-full">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for friends"
                className="pl-10 h-11"
                value={inviteToServerSearch}
                onChange={(e) => setInviteToServerSearch(e.target.value)}
              />
              {inviteToServerSearch.length > 0 && (
                <Button variant="secondary" className="absolute size-6 right-3 top-1/2 -translate-y-1/2 text-muted-foreground rounded-full" onClick={() => setInviteToServerSearch("")}>
                  <IconX size={16} />
                </Button>
              )}
            </div>
            <ScrollArea className="h-100 w-full">
              {filteredServerInvitationFriends.length > 0 ? filteredServerInvitationFriends.map((friend) => (
                <div key={friend._id} className="flex items-center justify-between w-full hover:bg-main rounded-md p-2">
                  <div className="w-full flex items-center gap-2">
                    <Avatar className="size-9" style={
                      friend.profilePicture === SHORT_LOGO_URL && friend.profilePictureBannerColor
                        ? { backgroundColor: friend.profilePictureBannerColor }
                        : undefined
                    }>
                      <AvatarImage src={friend.profilePicture} alt={friend.displayName} />
                      <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{friend.displayName}</span>
                      <span className="text-xs text-muted-foreground">{friend.username}</span>
                    </div>
                  </div>
                  <Button
                    disabled={invitingFriendId === friend._id}
                    variant="secondary"
                    onClick={() => handleSendServerInvitationLink(friend._id)}
                  >
                    {invitingFriendId === friend._id && isSendingServerInvitationLink ? <Spinner /> : "Send Link"}
                  </Button>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                  <p className="text-sm font-medium">No friends found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="border-t border-main flex-col! pt-4">
            <p className="font-semibold">Or, send a server invite link to a friend</p>
            <div className="relative w-full">
              <Input
                type="text"
                value={channel?.serverInvitationLink?.link || ""}
                className={cn(
                  "h-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input transition-colors duration-300",
                  inviteLinkCopied && "border-[#43a25a] bg-success/10"
                )}
                readOnly
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(channel?.serverInvitationLink?.link || "");
                  setInviteLinkCopied(true);
                  setTimeout(() => setInviteLinkCopied(false), 1500);
                }}
                variant="default"
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 transition-colors duration-300",
                  inviteLinkCopied && "bg-success"
                )}
              >
                {inviteLinkCopied ? "Copied" : "Copy"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};

export default FriendsSelector;

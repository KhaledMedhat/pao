import { MAX_FRIENDS, SHORT_LOGO_URL } from "~/constants/constants";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { Tag, TagInput } from "./ui/tag-input";
import { useId, useState } from "react";
import { FriendInterface, User } from "~/interfaces/user.interface";
import { useRouter } from "next/navigation";
import { createChannelName, getInitialsFallback } from "~/lib/utils";
import { useAddGroupChannelMembersMutation, useCreateChannelMutation } from "~/redux/apis/channel.api";
import { ChannelType } from "~/interfaces/channels.interface";
import { IconMessageCirclePlus, IconPlus, IconUsersPlus } from "@tabler/icons-react";
import { SidebarMenuButton } from "./ui/sidebar";
import { Spinner } from "./ui/spinner";
import { ActiveUI, FriendsSelectorView } from "~/interfaces/app.interface";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserChannels } from "~/redux/slices/user/user-selector";
import { setActiveUI, setCurrentChannelId } from "~/redux/slices/app/app-slice";
import { addChannel, setChannelListActive } from "~/redux/slices/user/user-slice";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { selectCurrentChannel } from "~/redux/slices/app/app-selector";

const FriendsSelector: React.FC<{ friends: FriendInterface[]; currentUser: User; view: FriendsSelectorView; otherUser?: FriendInterface[] }> = ({
  friends,
  currentUser,
  view,
  otherUser,
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
  const currentUserChannels = useAppSelector(selectCurrentUserChannels);
  const currentChannel = useAppSelector(selectCurrentChannel);
  const filteredFriends = view === FriendsSelectorView.CHANNEL ? friends.filter((friend) => friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) && !currentChannel?.members.some((member) => member._id === friend._id)) : friends.filter((friend) => friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
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
      addGroupChannelMembers({ channelId: currentChannel?._id ?? "", data: { memberToAdd: friend._id, addedBy: currentUser._id } }).unwrap().then(() => {
        setSelectedFriends([]);
        setOpenPopover(false);
      });
    });
  };
  return (
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
  );
};

export default FriendsSelector;

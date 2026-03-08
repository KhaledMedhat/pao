import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupGrid, AvatarImage } from "./ui/avatar";
import { getChannelTypeLabel, getInitialsFallback, getMutualServers, isTheUserFriend } from "~/lib/utils";
import { Button } from "./ui/button";
import { FriendInterface, User } from "~/interfaces/user.interface";
import { useRemoveFriendMutation } from "~/redux/apis/auth.api";
import { useSendFriendRequestMutation } from "~/redux/apis/user.api";
import { MAX_FRIENDS, SHORT_LOGO_URL } from "~/constants/constants";
import { IconCheck, IconChevronRight, IconMessageCircle, IconPencil, IconSend, IconSettings, IconUsersPlus } from "@tabler/icons-react";
import ChannelEditDialog from "./dashboard-header/channel-edit-dialog";
import { useCallback, useId, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tag, TagInput } from "./ui/tag-input";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { useAddGroupChannelMembersMutation } from "~/redux/apis/channel.api";
import { setOpenServerInvitationDialog } from "~/redux/slices/app/app-slice";
import { useAppDispatch } from "~/redux/hooks";

const ChannelStarterMessage: React.FC<{ channel: Channel, currentUserChannels: Channel[], currentUserInfo: User, messagesLength: number }> = ({ channel, currentUserChannels, currentUserInfo, messagesLength }) => {
    const mutualServers = getMutualServers(currentUserChannels, channel?.directChannelOtherMember);
    const dispatch = useAppDispatch();
    const [removeFriend] = useRemoveFriendMutation();
    const [addFriend] = useSendFriendRequestMutation();
    const [addGroupChannelMembers, { isLoading: isAddingGroupChannelMembersLoading }] = useAddGroupChannelMembersMutation();
    const [isChannelDialogOpen, setIsChannelDialogOpen] = useState<boolean>(false);
    const [isInviteFriendsDialogOpen, setIsInviteFriendsDialogOpen] = useState<boolean>(false);
    const id = useId();
    const [selectedFriends, setSelectedFriends] = useState<FriendInterface[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
    const filteredFriends = currentUserInfo.friends.filter((friend) => friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) && !channel.members.some((member) => member._id === friend._id));
    const handleOpenDialog = useCallback(() => {
        setIsChannelDialogOpen(true);
    }, []);
    const handleOpenInviteFriendsDialog = useCallback(() => {
        setIsInviteFriendsDialogOpen(true);
    }, []);
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
            .map((tag) => currentUserInfo.friends.find((friend) => friend._id === tag.id))
            .filter((friend): friend is FriendInterface => friend !== undefined);

        setSelectedFriends(newSelectedFriends);
    };


    const mountChannelStarterMessage = () => {
        switch (channel.type) {
            case ChannelType.Direct:
                return (
                    <div className="flex flex-col items-start justify-center min-h-[40vh] gap-2 pl-14">
                        <Avatar className="size-26" style={
                            channel.type === ChannelType.Direct && channel.directChannelOtherMember?.profilePicture === SHORT_LOGO_URL && channel.directChannelOtherMember?.profilePictureBannerColor
                                ? { backgroundColor: channel.directChannelOtherMember.profilePictureBannerColor }
                                : undefined
                        }>
                            <AvatarImage src={channel?.directChannelOtherMember?.profilePicture} />
                            <AvatarFallback>
                                {getInitialsFallback(channel?.directChannelOtherMember?.displayName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2 items-start mt-10">
                            <p className="text-3xl font-bold">{channel?.directChannelOtherMember?.displayName}</p>
                            <p className="text-xl">{channel?.directChannelOtherMember?.username}</p>
                        </div>
                        <p className="text-xl">This is the beginning of your {getChannelTypeLabel(channel?.type)} history {channel?.type === ChannelType.Direct && <> with <span className="font-bold">{channel?.directChannelOtherMember?.displayName}</span>. </>}</p>

                        <div className="flex item-center justify-between mt-4 gap-2 max-w-2xl w-full flex-wrap">
                            {mutualServers.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <AvatarGroup className="grayscale">
                                        {mutualServers.slice(0, 3).map((server) => (
                                            <Avatar key={server._id}>
                                                <AvatarImage src={server.groupOrServerLogo || ""} />
                                                <AvatarFallback>{getInitialsFallback(server.groupOrServerName || "")}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </AvatarGroup>
                                    <p className="flex items-center text-sm">{mutualServers.length} Mutual Servers</p>
                                </div>
                            ) : <p className="self-center">No servers in common</p>}
                            {isTheUserFriend(currentUserInfo, channel?.directChannelOtherMember?._id || "") ? (
                                <Button variant="outline" size="lg" onClick={() => removeFriend({ friendId: channel?.directChannelOtherMember?._id || "" })}>
                                    Remove Friend
                                </Button>
                            ) : <Button variant="default" size="lg" onClick={() => addFriend({ sender: currentUserInfo, username: channel?.directChannelOtherMember?.username || "" })}>
                                Add Friend
                            </Button>}
                        </div>
                    </div>
                )
            case ChannelType.Group:
                return (
                    <div className="flex min-w-0 max-w-full flex-col items-start justify-center gap-2 pl-4 sm:pl-8 lg:pl-14 min-h-[40vh]">
                        <div className="pl-2 sm:pl-6 lg:pl-10">
                            {channel.groupOrServerLogo ? (
                                <Avatar className="size-26!">
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
                                    {channel?.members.filter((m) => m._id !== currentUserInfo._id).slice(0, 2).map((m) => (
                                        <Avatar className="size-22! ring-7!" key={m._id} style={
                                            m.profilePicture === SHORT_LOGO_URL && m.profilePictureBannerColor
                                                ? { backgroundColor: m.profilePictureBannerColor }
                                                : undefined
                                        }>
                                            <AvatarImage src={m.profilePicture} />
                                            <AvatarFallback>{getInitialsFallback(m.displayName || "")}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </AvatarGroupGrid>
                            )}
                        </div>
                        <div className="mt-10 sm:mt-14 lg:mt-20 flex w-full min-w-0 max-w-full flex-col items-start gap-2">
                            <p className="max-w-full wrap-anywhere text-2xl sm:text-3xl font-bold">{channel?.groupOrServerName}</p>
                            <p className="max-w-full wrap-anywhere text-base sm:text-lg">
                                This is the beginning of your <span className="font-bold wrap-anywhere">{channel?.groupOrServerName}</span>
                            </p>

                            <div className="mt-4 flex w-full max-w-2xl flex-wrap items-center gap-2">
                                <Button size="lg" onClick={handleOpenInviteFriendsDialog}>
                                    <IconUsersPlus size={16} fill="var(--foreground)" /> Invite Friends
                                </Button>
                                <Button variant="secondary" size="lg" onClick={handleOpenDialog}>
                                    <IconPencil size={16} /> Edit Group
                                </Button>
                            </div>
                        </div>
                        {isChannelDialogOpen && (
                            <ChannelEditDialog
                                channel={channel}
                                open={isChannelDialogOpen}
                                onOpenChange={setIsChannelDialogOpen}
                            />
                        )}
                        <Dialog open={isInviteFriendsDialogOpen} onOpenChange={setIsInviteFriendsDialogOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Select Friends</DialogTitle>
                                    <DialogDescription>You can add {MAX_FRIENDS - selectedFriends.length - channel.members.length} more friends.</DialogDescription>
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
                                        <Button onClick={() => addGroupChannelMembers({ channelId: channel._id, memberIds: selectedFriends.map((friend) => friend._id) })} size='lg' className="h-11" disabled={selectedFriends.length === 0 || isAddingGroupChannelMembersLoading}>
                                            Add
                                        </Button>
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
                            </DialogContent>
                        </Dialog>
                    </div>
                )
            case ChannelType.Server:
                return (
                    <div className="flex flex-col items-center justify-center min-h-[40vh]">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <p className="text-4xl">Welcome to</p>
                            <p className="text-4xl text-center">{channel.groupOrServerName} Server</p>
                            <Avatar className="size-26">
                                <AvatarImage src={channel?.groupOrServerLogo} />
                                <AvatarFallback>
                                    {getInitialsFallback(channel?.groupOrServerName)}
                                </AvatarFallback>
                            </Avatar>
                            <p className="max-w-2xl text-center leading-4">This is your brand new shiny server! Feel free to invite your friends and start chatting. Here are some steps to help you get started</p>
                            <div className="flex flex-col items-center gap-2 mt-4 w-full">
                                <Button className="w-full border h-14 justify-between px-6!" variant="secondary" onClick={() => dispatch(setOpenServerInvitationDialog(true))}>
                                    <div className="flex items-center gap-2">
                                        <IconUsersPlus size={16} fill="var(--foreground)" color='var(--foreground)' /> Invite your Friends
                                    </div>
                                    <IconChevronRight size={16} />
                                </Button>
                                <Button className="w-full border h-14 justify-between px-6!" variant="secondary">
                                    <div className="flex items-center gap-2">
                                        <IconSettings size={16} /> Customize your Server
                                    </div>
                                    <IconChevronRight size={16} />
                                </Button>
                                <Button className={`w-full border h-14 justify-between px-6! ${messagesLength > 0 ? "opacity-70" : "opacity-100"}`} variant="secondary">
                                    <div className="flex items-center gap-2">
                                        <IconSend size={16} /> Send your First Message
                                    </div>
                                    {messagesLength > 0 ? <div className="bg-[#43a25a]/70 p-1 rounded-full">
                                        <IconCheck size={16} />
                                    </div> : <IconChevronRight size={16} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null;
        }
    }
    return mountChannelStarterMessage()
}

export default ChannelStarterMessage;
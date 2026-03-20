import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Channel, ChannelType, ServerChannelType } from "~/interfaces/channels.interface";
import { MessageInterface, PinnedMessageInterface } from "~/interfaces/message.interface";
import {
  FriendInterface,
  FriendRequest,
  ObsessionDuration,
  StatusDuration,
  StatusType,
  User,
  UserInitialState,
  Notification,
} from "~/interfaces/user.interface";

const initialState: UserInitialState = {
  isLoggedIn: false,
  userInfo: {
    _id: "",
    displayName: "",
    channelSlug: "",
    password: "",
    email: "",
    friends: [
      {
        _id: "",
        displayName: "",
        pronouns: "",
        status: { type: StatusType.Online, duration: StatusDuration.Forever },
        profileCover: "",
        profilePicture: "",
        bio: "",
        username: "",
        phoneNumber: "",
        obsession: {
          text: null,
          emoji: null,
          duration: ObsessionDuration.DontClear,
        },
        activity: "",
        createdAt: new Date(),
        friends: [],
      },
    ],
    googleId: "",
    pronouns: "",
    status: { type: StatusType.Online, duration: StatusDuration.Forever },
    latestStatus: { type: StatusType.Online, duration: StatusDuration.Forever },
    provider: "",
    profilePicture: "",
    profileCover: "",
    bio: "",
    obsession: {
      text: null,
      emoji: null,
      duration: ObsessionDuration.DontClear,
    },
    activity: "",
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  notifications: [],
  friendRequests: [],
  channelsInfo: [],
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserInfo: (state, action: PayloadAction<User>) => {
      state.userInfo = action.payload;
    },
    setUpdatedFriend: (state, action: PayloadAction<{ friend: FriendInterface; updatedUser: any }>) => {
      const { friend, updatedUser } = action.payload;
      const friendId = friend._id;

      state.userInfo.friends = state.userInfo.friends.map((f) => (f._id === friendId ? { ...f, ...updatedUser } : f));

      state.channelsInfo = state.channelsInfo.map((channel) => ({
        ...channel,
        members: channel.members.map((m) => (m._id === friendId ? { ...m, ...updatedUser } : m)),
        directChannelOtherMember:
          channel.directChannelOtherMember?._id === friendId
            ? { ...channel.directChannelOtherMember, ...updatedUser }
            : channel.directChannelOtherMember,
      }));
    },
    setChannelListActive: (state, action: PayloadAction<{ channelId: string; listActive: boolean }>) => {
      state.channelsInfo = state.channelsInfo.map((channel) =>
        channel._id === action.payload.channelId ? { ...channel, listActive: action.payload.listActive } : channel
      );
    },
    setUserLoggingInStatus: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    },
    setChannels: (state, action: PayloadAction<Channel[]>) => {
      state.channelsInfo = action.payload;
    },
    updateChannel: (state, action: PayloadAction<Channel>) => {
      state.channelsInfo = state.channelsInfo.map((channel) => (channel._id === action.payload._id ? { ...channel, ...action.payload } : channel));
    },
    addChannel: (state, action: PayloadAction<Channel>) => {
      if (!state.channelsInfo.some((channel) => channel._id === action.payload._id)) {
        state.channelsInfo.push(action.payload);
      }
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      if (!state.notifications.some((notification) => notification._id === action.payload._id)) {
        state.notifications.push(action.payload);
      }
    },
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
    },
    setFriendRequests: (state, action: PayloadAction<FriendRequest[]>) => {
      state.friendRequests = action.payload;
    },
    addFriendRequest: (state, action: PayloadAction<FriendRequest>) => {
      // Avoid duplicates
      if (!state.friendRequests.some((req) => req._id === action.payload._id)) {
        state.friendRequests.push(action.payload);
      }
    },
    removeFriendRequest: (state, action: PayloadAction<string>) => {
      state.friendRequests = state.friendRequests.filter((req) => req._id !== action.payload);
    },
    setChannelActiveList: (state, action: PayloadAction<{ channelId: string; listActive: boolean }>) => {
      state.channelsInfo = state.channelsInfo.map((channel) =>
        channel._id === action.payload.channelId ? { ...channel, listActive: action.payload.listActive } : channel
      );
    },
    addMembersToChannel: (state, action: PayloadAction<{ members: FriendInterface[], channelId: string }>) => {
      state.channelsInfo = state.channelsInfo.map((channel) =>
        channel._id === action.payload.channelId ? { ...channel, members: [...channel.members, ...action.payload.members] } : channel
      );
    },
    addServerChannel: (state, action: PayloadAction<{ channelId: string, channelType: ServerChannelType, newChannel: { name: string, _id: string } }>) => {
      state.channelsInfo = state.channelsInfo.map((channel) => {
        if (channel._id === action.payload.channelId) {
          if (channel.type === ChannelType.Server) {
            const roomAlreadyExistsInText = channel.channelMessageRooms?.some((room) => room._id === action.payload.newChannel._id);
            const roomAlreadyExistsInVoice = channel.channelCallRooms?.some((room) => room._id === action.payload.newChannel._id);

            if (action.payload.channelType === ServerChannelType.Text && !roomAlreadyExistsInText) {
              return {
                ...channel,
                channelMessageRooms: [...(channel.channelMessageRooms || []), action.payload.newChannel],
              };
            }

            if (action.payload.channelType === ServerChannelType.Voice && !roomAlreadyExistsInVoice) {
              return {
                ...channel,
                channelCallRooms: [...(channel.channelCallRooms || []), action.payload.newChannel],
              };
            }

            return {
              ...channel,
            };
          }
          return channel;
        }
        return channel;
      });
    },
    updateChannelPinnedMessage: (state, action: PayloadAction<{ message: PinnedMessageInterface; isPinned: boolean }>) => {
      const { message, isPinned } = action.payload;
      const channelId = message.referenceId._id;

      state.channelsInfo = state.channelsInfo.map((channel) => {
        if (channel._id !== channelId) return channel;

        const currentPinnedMessages = channel.pinnedMessages || [];

        if (isPinned) {
          // Add message to pinned if not already there
          const alreadyPinned = currentPinnedMessages.some((m) => m._id === message._id);
          if (alreadyPinned) return channel;

          // Normalize: convert referenceId from Channel object to string
          const normalizedMessage: MessageInterface = {
            ...message,
            referenceId: channelId,
          };
          return {
            ...channel,
            pinnedMessages: [...currentPinnedMessages, normalizedMessage],
          };
        } else {
          // Remove message from pinned
          return {
            ...channel,
            pinnedMessages: currentPinnedMessages.filter((m) => m._id !== message._id),
          };
        }
      });
    },
    removeMemberFromChannel: (state, action: PayloadAction<{ channelId: string, removedMemberId: string }>) => {
      state.channelsInfo = state.channelsInfo.map((channel) => (channel._id === action.payload.channelId ? { ...channel, members: channel.members.filter((m) => m._id !== action.payload.removedMemberId) } : channel));
    },
    removeChannelFromList: (state, action: PayloadAction<string>) => {

      state.channelsInfo = state.channelsInfo.filter((channel) => channel._id !== action.payload);
    },
    setGroupNewOwnership: (state, action: PayloadAction<{ channelId: string, newOwner: string }>) => {
      state.channelsInfo = state.channelsInfo.map((channel) => (channel._id === action.payload.channelId ? { ...channel, createdBy: action.payload.newOwner } : channel));
    },
  },
});

export const {
  setUserLoggingInStatus,
  setUserInfo,
  setUpdatedFriend,
  setChannels,
  updateChannel,
  setFriendRequests,
  addFriendRequest,
  removeFriendRequest,
  setChannelActiveList,
  addChannel,
  addNotification,
  setChannelListActive,
  updateChannelPinnedMessage,
  addMembersToChannel,
  addServerChannel,
  removeMemberFromChannel,
  removeChannelFromList,
  setGroupNewOwnership,
} = userSlice.actions;
export default userSlice.reducer;

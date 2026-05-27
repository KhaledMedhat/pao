import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Action, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "~/redux/store";
import { HYDRATE } from "next-redux-wrapper";
import {
  CreateAccountRequest,
  CreateAccountResponse,
  FriendRequest,
  SignInRequest,
  StatusDuration,
  StatusType,
  User,
  Notification,
  UpdateUserRequest,
  FriendInterface,
} from "~/interfaces/user.interface";
import {
  addChannel,
  addFriend,
  addFriendRequest,
  addMembersToChannel,
  addNotification,
  addServerChannel,
  adjustNotificationCount,
  removeChannelFromList,
  removeFriend,
  removeFriendRequest,
  removeMemberFromChannel,
  setChannels,
  setFriendRequests,
  setGroupNewOwnership,
  setUpdatedUserEverywhere,
  setUserInfo,
  setUserLoggingInStatus,
  updateChannel,
  updateChannelPinnedMessage,
} from "~/redux/slices/user/user-slice";
import { Channel, ChannelType, ServerChannelType } from "~/interfaces/channels.interface";
import { socketService } from "~/lib/socket";
import { getDirectMessageChannelOtherMember } from "~/lib/utils";
import { MessageInterface, PinnedMessageInterface } from "~/interfaces/message.interface";
import { setAddedToChannel, setIsGettingAddedToChannel, setIsGettingRemovedFromChannel, setRemovedFromChannel } from "../slices/app/app-slice";

function isHydrateAction(action: Action): action is PayloadAction<RootState> {
  return action.type === HYDRATE;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    credentials: "include",
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractRehydrationInfo(action: Action, { reducerPath }): any {
    if (isHydrateAction(action)) {
      return (action.payload as Record<string, unknown>)[reducerPath];
    }
    return undefined;
  },
  tagTypes: ["Auth"], // Define tag types
  endpoints: (builder) => ({
    createAccount: builder.mutation<CreateAccountResponse, CreateAccountRequest>({
      query: (data) => ({
        url: "/user/create-user",
        method: "POST",
        body: data,
      }),
    }),

    updateUser: builder.mutation<User, UpdateUserRequest>({
      query: (data) => ({
        url: "/user/update-user-info",
        method: "PATCH",
        body: data,
      }),
    }),
    signIn: builder.mutation<{ slug: string }, SignInRequest>({
      query: (data) => ({
        url: "/auth/login",
        method: "POST",
        body: data,
      }),
    }),

    logout: builder.mutation<
      { url: string },
      {
        currentUserId: string;
        latestStatus: { type: StatusType; duration: StatusDuration };
      }
    >({
      query: (arg) => ({
        url: `/auth/logout/${arg.currentUserId}`,
        method: "POST",
        body: arg.latestStatus,
      }),
    }),

    finalizingProviderUsername: builder.mutation<{ slug: string }, { username: string }>({
      query: (data) => ({
        url: "/auth/finalize",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    removeFriend: builder.mutation<void, { friendId: string }>({
      query: (data) => ({
        url: `/user/remove-friend/${data.friendId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Auth"],
    }),
    getUserInfo: builder.query<{ user: User; channels: Channel[]; notifications: Notification[]; friendRequests: FriendRequest[] }, void>({
      query: () => ({
        url: "/auth/get-profile",
      }),
      providesTags: ["Auth"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Add listActive: true to each member in channels
          const channelsWithExtraProps = data.channels.map((channel) => ({
            ...channel,
            listActive: channel.type === ChannelType.Direct ? true : undefined,
            directChannelOtherMember: channel.type === ChannelType.Direct ? getDirectMessageChannelOtherMember(channel, data.user._id) : undefined,
          }));
          dispatch(setUserLoggingInStatus(true));
          dispatch(setUserInfo(data.user));
          dispatch(setChannels(channelsWithExtraProps));
          // dispatch(setNotifications(data.notifications));
          dispatch(setFriendRequests(data.friendRequests));
        } catch {
          dispatch(setUserLoggingInStatus(false));
        }
      },
      async onCacheEntryAdded(_, { dispatch, cacheDataLoaded, cacheEntryRemoved, getState }) {
        try {
          await cacheDataLoaded;
          const socket = await socketService.initialize();
          const handleUpdatedUser = (data: { userId: string; updatedUser: any }) => {
            const state = getState() as RootState;
            const currentUser = state.user.userInfo;

            if (data.userId === currentUser._id) {
              dispatch(setUserInfo({ ...currentUser, ...data.updatedUser }));
            }

            dispatch(setUpdatedUserEverywhere({ userId: data.userId, updatedUser: data.updatedUser }));
          };
          const handleFriendRequest = (data: { friendRequest: FriendRequest }) => {
            dispatch(addFriendRequest(data.friendRequest));
          };
          const handleFriendRequestAcceptanceForChannel = (data: { channel: Channel }) => {
            const state = getState() as RootState;
            const currentUserId = state.user.userInfo._id;
            const channelWithExtras = {
              ...data.channel,
              listActive: data.channel.type === ChannelType.Direct ? true : undefined,
              directChannelOtherMember:
                data.channel.type === ChannelType.Direct ? getDirectMessageChannelOtherMember(data.channel, currentUserId) : undefined,
            };
            dispatch(addChannel(channelWithExtras));
            dispatch(addFriend(getDirectMessageChannelOtherMember(data.channel, currentUserId)));
          };

          const handleNewGroupChannelCreation = (data: { groupChannel: Channel }) => {
            dispatch(addChannel(data.groupChannel));
          };
          const handleFriendRequestAcceptanceForNotification = (data: { notification: Notification }) => {
            dispatch(addNotification(data.notification));
          };

          const handleInvertedFriendRequestDeletion = (data: { invertedRequestId: string }) => {
            dispatch(removeFriendRequest(data.invertedRequestId));
          }

          const handleServerChannelCreation = (data: { channelId: string, channelType: ServerChannelType, newChannel: { name: string, _id: string } }) => {
            dispatch(addServerChannel({ channelId: data.channelId, channelType: data.channelType, newChannel: data.newChannel }));
          };

          const handleJoiningGroupChannel = (data: { groupChannel: Channel }) => {
            dispatch(addChannel(data.groupChannel));
          };

          const handleAddingGroupChannelMembers = (data: { groupChannelId: string, invitedMembers: FriendInterface[] }) => {
            dispatch(addMembersToChannel({ members: data.invitedMembers, channelId: data.groupChannelId }));
          };

          const handleChannelUpdate = (data: { channel: Channel }) => {
            const state = getState() as RootState;
            const currentUserId = state.user.userInfo._id;
            const channelWithExtras = {
              ...data.channel,
              directChannelOtherMember:
                data.channel.type === ChannelType.Direct ? getDirectMessageChannelOtherMember(data.channel, currentUserId) : undefined,
            };
            dispatch(updateChannel(channelWithExtras));
          };

          const handleRemoveFriend = (data: { removerUserId: string }) => {
            dispatch(removeFriend(data.removerUserId));
          };
          const handleServerJoin = (data: { serverChannel: Channel }) => {
            dispatch(addChannel(data.serverChannel));
          };

          const handleServerNewJoining = (data: { joinedMember: FriendInterface, serverChannel: string }) => {
            dispatch(addMembersToChannel({ members: [data.joinedMember], channelId: data.serverChannel }));
          };
          const handlePinMessage = (data: { message: PinnedMessageInterface; isPinned: boolean }) => {
            dispatch(updateChannelPinnedMessage({ message: data.message, isPinned: data.isPinned }));
          };
          const handleUnpinMessage = (data: { message: PinnedMessageInterface; isPinned: boolean }) => {
            dispatch(updateChannelPinnedMessage({ message: data.message, isPinned: data.isPinned }));
          };

          const handleRemoveMemberFromChannel = (data: { channelId: string, removedMemberId: string }) => {
            dispatch(removeMemberFromChannel({ channelId: data.channelId, removedMemberId: data.removedMemberId }));
          };

          const handleGetRemovedFromChannel = (data: { channel: Channel }) => {
            dispatch(setRemovedFromChannel(data.channel));
            dispatch(removeChannelFromList(data.channel._id));
            dispatch(setIsGettingRemovedFromChannel(true));
          };

          const handleDeleteChannel = (data: { channelId: string }) => {
            dispatch(removeChannelFromList(data.channelId));
          };

          const handleGetAddedToChannel = (data: { channel: Channel }) => {
            dispatch(setAddedToChannel(data.channel));
            dispatch(addChannel(data.channel));
            dispatch(setIsGettingAddedToChannel(true));
          };

          const handleAddMemberToChannel = (data: { channelId: string, addedMember: FriendInterface }) => {
            dispatch(addMembersToChannel({ members: [data.addedMember], channelId: data.channelId }));
          };

          const handleAssignGroupNewOwnership = (data: { channelId: string, newOwner: string }) => {
            dispatch(setGroupNewOwnership({ channelId: data.channelId, newOwner: data.newOwner }));
          };

          const handleNewMessageNotification = (data: { message: MessageInterface }) => {
            const state = getState() as RootState;
            const activeChannelId = state.app.currentChannelId;
            const messageChannelId = data.message.referenceId;
            const currentUserId = state.user.userInfo._id;
            if (data.message.sentBy?._id === currentUserId) return;
            if (messageChannelId === activeChannelId) return;
            socket?.emit("addNotificationCount", { channelId: messageChannelId, count: 1 });
          };

          const handleAdjustNotificationCount = (data: { channelId: string, notificationsCount: number }) => {
            dispatch(adjustNotificationCount({ channelId: data.channelId, notificationsCount: data.notificationsCount }));
          };

          socket?.on("getNewMessage", handleNewMessageNotification);
          socket?.on("friendRequest", handleFriendRequest);
          socket?.on("friendRequestAcceptanceChannelCreation", handleFriendRequestAcceptanceForChannel);
          socket?.on("friendRequestAcceptanceNotification", handleFriendRequestAcceptanceForNotification);
          socket?.on("updateGroupChannel", handleChannelUpdate);
          socket?.on("pinMessage", handlePinMessage);
          socket?.on("unpinMessage", handleUnpinMessage);
          socket?.on("updateUser", handleUpdatedUser);
          socket?.on("joinServer", handleServerJoin);
          socket?.on("serverNewJoining", handleServerNewJoining);
          socket?.on("addServerChannel", handleServerChannelCreation);
          socket?.on("addGroupChannel", handleNewGroupChannelCreation);
          socket?.on("joinGroupChannel", handleJoiningGroupChannel);
          socket?.on("addGroupChannelMembers", handleAddingGroupChannelMembers);
          socket?.on("memberRemovedFromChannel", handleRemoveMemberFromChannel);
          socket?.on("getRemovedFromChannel", handleGetRemovedFromChannel);
          socket?.on("getAddedToChannel", handleGetAddedToChannel);
          socket?.on("memberAddedToChannel", handleAddMemberToChannel);
          socket?.on("newGroupOwnershipAssigning", handleAssignGroupNewOwnership);
          socket?.on("deleteChannel", handleDeleteChannel);
          socket?.on("existedInvertedRequestDeletion", handleInvertedFriendRequestDeletion);
          socket?.on("removeFriend", handleRemoveFriend);
          socket?.on("notificationCountUpdated", handleAdjustNotificationCount);
          await cacheEntryRemoved;
          socket?.off("friendRequest", handleFriendRequest);
          socket?.off("friendRequestAcceptanceChannelCreation", handleFriendRequestAcceptanceForChannel);
          socket?.off("friendRequestAcceptanceNotification", handleFriendRequestAcceptanceForNotification);
          socket?.off("updateGroupChannel", handleChannelUpdate);
          socket?.off("pinMessage", handlePinMessage);
          socket?.off("unpinMessage", handleUnpinMessage);
          socket?.off("updateUser", handleUpdatedUser);
          socket?.off("joinServer", handleServerJoin);
          socket?.off("serverNewJoining", handleServerNewJoining);
          socket?.off("addServerChannel", handleServerChannelCreation);
          socket?.off("addGroupChannel", handleNewGroupChannelCreation);
          socket?.off("joinGroupChannel", handleJoiningGroupChannel);
          socket?.off("addGroupChannelMembers", handleAddingGroupChannelMembers);
          socket?.off("memberRemovedFromChannel", handleRemoveMemberFromChannel);
          socket?.off("getRemovedFromChannel", handleGetRemovedFromChannel);
          socket?.off("getAddedToChannel", handleGetAddedToChannel);
          socket?.off("memberAddedToChannel", handleAddMemberToChannel);
          socket?.off("newGroupOwnershipAssigning", handleAssignGroupNewOwnership);
          socket?.off("deleteChannel", handleDeleteChannel);
          socket?.off("existedInvertedRequestDeletion", handleInvertedFriendRequestDeletion);
          socket?.off("removeFriend", handleRemoveFriend);
          socket?.off("notificationCountUpdated", handleAdjustNotificationCount);
          socket?.off("getNewMessage", handleNewMessageNotification);
        } catch (error) {
          console.error("Socket cache entry error:", error);
        }
      },
    }),
  }),
});

export const {
  useSignInMutation,
  useFinalizingProviderUsernameMutation,
  useLogoutMutation,
  useCreateAccountMutation,
  useGetUserInfoQuery,
  useRemoveFriendMutation,
  useUpdateUserMutation,
} = authApi;

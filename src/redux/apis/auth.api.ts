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
} from "~/interfaces/user.interface";
import {
  addChannel,
  addFriendRequest,
  addNotification,
  removeFriendRequest,
  setChannels,
  setFriendRequests,
  setUpdatedFriend,
  setUserInfo,
  setUserLoggingInStatus,
  updateChannel,
  updateChannelPinnedMessage,
} from "~/redux/slices/user/user-slice";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { socketService } from "~/lib/socket";
import { getDirectMessageChannelOtherMember } from "~/lib/utils";
import { MessageInterface, PinnedMessageInterface } from "~/interfaces/message.interface";

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
          const channelsWithListActiveAndExtractedOtherMember = data.channels.map((channel) => ({
            ...channel,
            listActive: channel.type === ChannelType.Direct ? true : undefined,
            directChannelOtherMember: channel.type === ChannelType.Direct ? getDirectMessageChannelOtherMember(channel, data.user._id) : undefined,
          }));
          dispatch(setUserLoggingInStatus(true));
          dispatch(setUserInfo(data.user));
          dispatch(setChannels(channelsWithListActiveAndExtractedOtherMember));
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

            const friend = currentUser.friends.find((f) => f._id === data.userId);
            if (friend) {
              dispatch(setUpdatedFriend({ friend, updatedUser: data.updatedUser }));
            }
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
          };
          const handleFriendRequestAcceptanceForNotification = (data: { notification: Notification }) => {
            dispatch(addNotification(data.notification));
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


          const handlePinMessage = (data: { message: PinnedMessageInterface; isPinned: boolean }) => {
            dispatch(updateChannelPinnedMessage({ message: data.message, isPinned: data.isPinned }));
          };
          const handleUnpinMessage = (data: { message: PinnedMessageInterface; isPinned: boolean }) => {
            dispatch(updateChannelPinnedMessage({ message: data.message, isPinned: data.isPinned }));
          };

          socket?.on("friendRequest", handleFriendRequest);
          socket?.on("friendRequestAcceptanceChannelCreation", handleFriendRequestAcceptanceForChannel);
          socket?.on("friendRequestAcceptanceNotification", handleFriendRequestAcceptanceForNotification);
          socket?.on("updateGroupChannel", handleChannelUpdate);
          socket?.on("pinMessage", handlePinMessage);
          socket?.on("unpinMessage", handleUnpinMessage);
          socket?.on("updateUser", handleUpdatedUser);
          await cacheEntryRemoved;
          socket?.off("friendRequest", handleFriendRequest);
          socket?.off("friendRequestAcceptanceChannelCreation", handleFriendRequestAcceptanceForChannel);
          socket?.off("friendRequestAcceptanceNotification", handleFriendRequestAcceptanceForNotification);
          socket?.off("updateGroupChannel", handleChannelUpdate);
          socket?.off("pinMessage", handlePinMessage);
          socket?.off("unpinMessage", handleUnpinMessage);
          socket?.off("updateUser", handleUpdatedUser);
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

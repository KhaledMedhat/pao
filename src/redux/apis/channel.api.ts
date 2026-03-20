import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Channel, CreateChannelBody, CreateChannelResponse, ServerChannelType, UpdateChannelBody } from "~/interfaces/channels.interface";
import { authApi } from "./auth.api";
import { AddMessageBody, MessageInterface, UpdateMessageBody } from "~/interfaces/message.interface";

export const channelApi = createApi({
  reducerPath: "channelApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    credentials: "include",
  }),

  tagTypes: ["Channel"],
  endpoints: (builder) => ({
    createChannel: builder.mutation<CreateChannelResponse, CreateChannelBody>({
      query: (body) => ({
        url: `/channels/create-channel`,
        method: "POST",
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(authApi.util.invalidateTags(["Auth"]));
      },
    }),
    leaveGroupChannel: builder.mutation<void, string>({
      query: (channelId) => ({
        url: `/channels/leave-group-channel/${channelId}`,
        method: "PATCH",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(authApi.util.invalidateTags(["Auth"]));
      },
    }),
    updateChannel: builder.mutation<Channel, { channelId: string; updateChannelDto: UpdateChannelBody }>({
      query: (body) => ({
        url: `/channels/update-channel/${body.channelId}`,
        method: "PATCH",
        body: body.updateChannelDto,
      }),
    }),
    getChannelMessages: builder.query<
      { messages: MessageInterface[]; hasMore: boolean; total: number },
      { channelId: string; limit?: number; before?: string; referenceMessageRoomId?: string }
    >({
      query: ({ channelId, limit = 30, before, referenceMessageRoomId }) => ({
        url: `/messages/get-messages/${channelId}`,
        method: "GET",
        params: { limit, ...(before && { before }), ...(referenceMessageRoomId && { referenceMessageRoomId }) },
      }),
    }),
    sendMessage: builder.mutation<MessageInterface, AddMessageBody>({
      query: (body) => ({
        url: `/messages/send-message`,
        method: "POST",
        body,
      }),
    }),
    updateMessage: builder.mutation<MessageInterface, { messageId: string; body: { updateMessageDto: UpdateMessageBody; referenceId: string } }>({
      query: (args) => ({
        url: `/messages/update-message/${args.messageId}`,
        method: "PATCH",
        body: args.body,
      }),
    }),
    deleteMessage: builder.mutation<void, string>({
      query: (messageId) => ({
        url: `/messages/delete-message/${messageId}`,
        method: "DELETE",
      }),
    }),
    pinMessage: builder.mutation<void, { channelId: string; messageId: string; pinnedBy: { id: string } }>({
      query: (args) => ({
        url: `/channels/pin-message/${args.channelId}/${args.messageId}`,
        method: "PATCH",
        body: args.pinnedBy,
      }),
    }),
    unpinMessage: builder.mutation<void, { channelId: string; messageId: string }>({
      query: (args) => ({
        url: `/channels/unpin-message/${args.channelId}/${args.messageId}`,
        method: "PATCH",
      }),
    }),
    toggleReaction: builder.mutation<void, { messageId: string; reaction: { emoji: string; label: string; userId: string } }>({
      query: (args) => ({
        url: `/messages/toggle-reaction/${args.messageId}`,
        method: "PATCH",
        body: args.reaction,
      }),
    }),
    sendServerInvitationLink: builder.mutation<void, { sendTo: string; invitationLink: { link: string; id: string } }>({
      query: (args) => ({
        url: `/channels/send-server-invitation`,
        method: "POST",
        body: args,
      }),
    }),
    joinServer: builder.mutation<Channel, { serverId: string }>({
      query: (args) => ({
        url: `/channels/join-server/${args.serverId}`,
        method: "POST",
      }),
    }),
    addGroupChannelMembers: builder.mutation<void, { channelId: string; data: { memberToAdd: string, addedBy: string } }>({
      query: (args) => ({
        url: `/channels/add-member-to-group/${args.channelId}`,
        method: "PATCH",
        body: args.data,
      }),
    }),
    createServerChannel: builder.mutation<void, { serverId: string; payload: { channelName: string; channelType: ServerChannelType } }>({
      query: (args) => ({
        url: `/channels/add-server-channel/${args.serverId}`,
        method: "POST",
        body: args.payload,
      }),
    }),

    removeGroupChannelMembers: builder.mutation<void, { channelId: string; data: { memberToRemove: string, removedBy: string } }>({
      query: (args) => ({
        url: `/channels/remove-member-from-group/${args.channelId}`,
        method: "PATCH",
        body: args.data,
      }),
    }),

    assignGroupNewOwnership: builder.mutation<void, { channelId: string; data: { newOwner: string } }>({
      query: (args) => ({
        url: `/channels/assign-group-new-ownership/${args.channelId}`,
        method: "PATCH",
        body: args.data,
      }),
    }),

  }),
});

export const {
  useCreateChannelMutation,
  useLeaveGroupChannelMutation,
  useGetChannelMessagesQuery,
  useLazyGetChannelMessagesQuery,
  useUpdateChannelMutation,
  useSendMessageMutation,
  useDeleteMessageMutation,
  useUpdateMessageMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useToggleReactionMutation,
  useAddGroupChannelMembersMutation,
  useSendServerInvitationLinkMutation,
  useJoinServerMutation,
  useCreateServerChannelMutation,
  useRemoveGroupChannelMembersMutation,
  useAssignGroupNewOwnershipMutation,
} = channelApi;

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ActiveUI, AppInitialState, FriendsView, MessageRequestsView } from "~/interfaces/app.interface";
import { MessageInterface } from "~/interfaces/message.interface";

const initialState: AppInitialState = {
  isUploadingFile: false,
  activeUI: ActiveUI.FRIENDS_LIST,
  sidebarOpen: false,
  showChannelDetails: false,
  friendsHeaderActiveUI: FriendsView.ONLINE,
  messageRequestsHeaderActiveUI: MessageRequestsView.REQUESTS,
  isPinnedMessagesOpen: false,
  currentChannelId: null,
  isReplying: false,
  replyingToMessage: null,
  activeChannelRoom: null,
  openServerInvitationDialog: false,
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setIsUploadingFile: (state, action: PayloadAction<boolean>) => {
      state.isUploadingFile = action.payload;
    },
    setActiveUI: (state, action: PayloadAction<ActiveUI>) => {
      state.activeUI = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setShowChannelDetails: (state, action: PayloadAction<boolean>) => {
      state.showChannelDetails = action.payload;
    },
    setDashboardFriendsHeaderActiveUI: (state, action: PayloadAction<FriendsView>) => {
      state.friendsHeaderActiveUI = action.payload;
    },
    setDashboardMessageRequestsHeaderActiveUI: (state, action: PayloadAction<MessageRequestsView>) => {
      state.messageRequestsHeaderActiveUI = action.payload;
    },
    setIsPinnedMessagesOpen: (state, action: PayloadAction<boolean>) => {
      state.isPinnedMessagesOpen = action.payload;
    },
    setCurrentChannelId: (state, action: PayloadAction<string | null>) => {
      state.currentChannelId = action.payload;
    },
    setIsReplying: (state, action: PayloadAction<boolean>) => {
      state.isReplying = action.payload;
    },
    setReplyingToMessage: (state, action: PayloadAction<MessageInterface | null>) => {
      state.replyingToMessage = action.payload;
    },
    setActiveChannelRoom: (state, action: PayloadAction<{ _id: string, name: string, type?: string } | null>) => {
      state.activeChannelRoom = action.payload;
    },
    setOpenServerInvitationDialog: (state, action: PayloadAction<boolean>) => {
      state.openServerInvitationDialog = action.payload;
    },
  },
});

export const {
  setIsUploadingFile,
  setActiveUI,
  setSidebarOpen,
  setDashboardFriendsHeaderActiveUI,
  setDashboardMessageRequestsHeaderActiveUI,
  setShowChannelDetails,
  setIsPinnedMessagesOpen,
  setCurrentChannelId,
  setIsReplying,
  setReplyingToMessage,
  setActiveChannelRoom,
  setOpenServerInvitationDialog,
} = appSlice.actions;
export default appSlice.reducer;

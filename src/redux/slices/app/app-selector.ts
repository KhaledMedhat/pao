import { RootState } from "~/redux/store";

export const selectActiveUI = (state: RootState) => state.app.activeUI;
export const selectSidebarOpen = (state: RootState) => state.app.sidebarOpen;
export const selectDashboardFriendsHeaderActiveUI = (state: RootState) => state.app.friendsHeaderActiveUI;
export const selectDashboardMessageRequestsHeaderActiveUI = (state: RootState) => state.app.messageRequestsHeaderActiveUI;
export const selectShowChannelDetails = (state: RootState) => state.app.showChannelDetails;
export const selectCurrentChannelId = (state: RootState) => state.app.currentChannelId;
export const selectIsPinnedMessagesOpen = (state: RootState) => state.app.isPinnedMessagesOpen;
export const selectIsReplying = (state: RootState) => state.app.isReplying;
export const selectReplyingToMessage = (state: RootState) => state.app.replyingToMessage;
export const selectIsUploadingFile = (state: RootState) => state.app.isUploadingFile;
// Derived selector - single source of truth from channelsInfo
export const selectCurrentChannel = (state: RootState) => {
  const currentChannelId = state.app.currentChannelId;
  if (!currentChannelId) return null;
  return state.user.channelsInfo.find((channel) => channel._id === currentChannelId) ?? null;
};

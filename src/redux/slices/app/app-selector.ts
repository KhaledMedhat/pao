import { createSelector } from "@reduxjs/toolkit";
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
export const selectActiveChannelRoom = (state: RootState) => state.app.activeChannelRoom;
export const selectOpenServerInvitationDialog = (state: RootState) => state.app.openServerInvitationDialog;
export const selectIsGettingRemovedFromChannel = (state: RootState) => state.app.isGettingRemovedFromChannel;
export const selectRemovedFromChannel = (state: RootState) => state.app.removedFromChannel;
export const selectIsGettingAddedToChannel = (state: RootState) => state.app.isGettingAddedToChannel;
export const selectAddedToChannel = (state: RootState) => state.app.addedToChannel;
export const selectPendingMention = (state: RootState) => state.app.pendingMention;

export const selectCurrentChannel = createSelector(
  [selectCurrentChannelId, (state: RootState) => state.user.channelsInfo],
  (currentChannelId, channelsInfo) => {
    if (!currentChannelId) return null;
    return channelsInfo.find((channel) => channel._id === currentChannelId) ?? null;
  }
);

export const selectDashboardHeaderState = createSelector(
  [
    selectActiveUI,
    selectCurrentChannel,
    selectShowChannelDetails,
    selectIsPinnedMessagesOpen,
    selectDashboardFriendsHeaderActiveUI,
    selectDashboardMessageRequestsHeaderActiveUI,
  ],
  (activeUI, currentChannel, showChannelDetails, isPinnedMessagesOpen, friendsHeaderActiveUI, messageRequestsHeaderActiveUI) => ({
    activeUI,
    currentChannel,
    showChannelDetails,
    isPinnedMessagesOpen,
    friendsHeaderActiveUI,
    messageRequestsHeaderActiveUI,
  })
);

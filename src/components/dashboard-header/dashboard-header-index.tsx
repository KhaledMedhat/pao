import { useAppSelector } from "~/redux/hooks";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { selectDashboardHeaderState } from "~/redux/slices/app/app-selector";
import { selectCurrentUserInfo, selectFriendRequests } from "~/redux/slices/user/user-selector";
import { ActiveUI } from "~/interfaces/app.interface";
import FriendsHeaderBar from "./friends-header-bar";
import MessageRequestsHeaderBar from "./message-requests-header-bar";
import DMGroupHeaderBar from "./dm-group-header-bar";
import ServerHeaderBar from "./server-header-bar";

const DashboardHeader = () => {
  const {
    activeUI,
    currentChannel,
    showChannelDetails,
    isPinnedMessagesOpen,
    friendsHeaderActiveUI,
    messageRequestsHeaderActiveUI,
  } = useAppSelector(selectDashboardHeaderState);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const friendRequests = useAppSelector(selectFriendRequests);

  const renderHeaderContent = () => {
    switch (activeUI) {
      case ActiveUI.FRIENDS_LIST:
        return (
          <FriendsHeaderBar
            activeView={friendsHeaderActiveUI}
            currentUserInfo={currentUserInfo}
            friendRequests={friendRequests}
          />
        );
      case ActiveUI.MESSAGE_REQUESTS:
        return (
          <MessageRequestsHeaderBar
            activeView={messageRequestsHeaderActiveUI}
            currentUserInfo={currentUserInfo}
          />
        );
      case ActiveUI.DIRECT_MESSAGES:
      case ActiveUI.GROUP:
        return (
          <DMGroupHeaderBar
            channel={currentChannel}
            showChannelDetailsPanel={showChannelDetails}
            isPinnedOpen={isPinnedMessagesOpen}
          />
        );
      case ActiveUI.SERVER:
        return (
          <ServerHeaderBar
            channel={currentChannel}
            showChannelDetailsPanel={showChannelDetails}
            isPinnedOpen={isPinnedMessagesOpen}
          />
        );
    }
  };

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          {renderHeaderContent()}
        </div>
      </header>
      <Separator />
    </>
  );
};

export default DashboardHeader;

import React, { memo, useMemo } from "react";
import { useAppDispatch } from "~/redux/hooks";
import { setDashboardMessageRequestsHeaderActiveUI } from "~/redux/slices/app/app-slice";
import { MessageRequestsView, FriendsSelectorView } from "~/interfaces/app.interface";
import type { User } from "~/interfaces/user.interface";
import { Button } from "~/components/ui/button";
import FriendsSelector from "~/components/friends-selector";

interface MessageRequestsHeaderBarProps {
  activeView: MessageRequestsView;
  currentUserInfo: User;
}

const MessageRequestsHeaderBar = memo(function MessageRequestsHeaderBar({
  activeView,
  currentUserInfo,
}: MessageRequestsHeaderBarProps) {
  const dispatch = useAppDispatch();

  const buttons = useMemo(
    () => [
      { label: "Requests", view: MessageRequestsView.REQUESTS },
      { label: "Spam", view: MessageRequestsView.SPAM },
    ],
    []
  );

  return (
    <div className="flex items-center gap-4 w-full">
      <h1 className="text-base font-medium">Message Requests</h1>
      <span className="text-muted-foreground text-sm">&#8226;</span>
      <div className="flex items-center gap-2">
        {buttons.map((button) => {
          const isActive =
            activeView === button.view ? "bg-muted text-foreground" : "";
          return (
            <Button
              size="default"
              key={button.label}
              variant="ghost"
              onClick={() => dispatch(setDashboardMessageRequestsHeaderActiveUI(button.view))}
              className={isActive}
            >
              {button.label}
            </Button>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <FriendsSelector
          friends={currentUserInfo.friends}
          currentUser={currentUserInfo}
          view={FriendsSelectorView.DASHBOARD}
        />
      </div>
    </div>
  );
});

export default MessageRequestsHeaderBar;

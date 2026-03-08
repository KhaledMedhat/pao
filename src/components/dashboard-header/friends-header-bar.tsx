import { memo, useMemo } from "react";
import { useAppDispatch } from "~/redux/hooks";
import { setDashboardFriendsHeaderActiveUI } from "~/redux/slices/app/app-slice";
import { FriendsView, FriendsSelectorView } from "~/interfaces/app.interface";
import { FriendRequestStatus, type User } from "~/interfaces/user.interface";
import type { FriendRequest } from "~/interfaces/user.interface";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import FriendsSelector from "~/components/friends-selector";

interface FriendsHeaderBarProps {
  activeView: FriendsView;
  currentUserInfo: User;
  friendRequests: FriendRequest[];
}

const FriendsHeaderBar = memo(function FriendsHeaderBar({
  activeView,
  currentUserInfo,
  friendRequests,
}: FriendsHeaderBarProps) {
  const dispatch = useAppDispatch();

  const pendingCount = useMemo(
    () => friendRequests.filter((r) => r.status === FriendRequestStatus.Pending).length,
    [friendRequests]
  );

  const friendsButtons = useMemo(
    () => [
      {
        label: "Online",
        view: FriendsView.ONLINE,
        variant: "ghost" as const,
        size: "default" as const,
      },
      {
        label: "All",
        view: FriendsView.ALL,
        variant: "ghost" as const,
        size: "default" as const,
      },
      {
        label: "Pending",
        view: FriendsView.PENDING,
        variant: "ghost" as const,
        size: "default" as const,
        counter: pendingCount,
      },
      {
        label: "Add Friend",
        view: FriendsView.ADD_FRIEND,
        variant: "default" as const,
        size: "sm" as const,
      },
    ],
    [pendingCount]
  );

  return (
    <div className="flex items-center gap-4 w-full">
      <h1 className="text-base font-medium">Friends</h1>
      <span className="text-muted-foreground text-sm">&#8226;</span>
      <div className="flex items-center gap-2">
        {friendsButtons.map((button) => {
          const isActive =
            activeView === button.view &&
            (button.view === FriendsView.ADD_FRIEND
              ? "bg-accent/40 text-foreground"
              : "bg-muted text-foreground");
          return (
            <Button
              size={button.size}
              key={button.label}
              variant={button.variant}
              onClick={() => dispatch(setDashboardFriendsHeaderActiveUI(button.view))}
              className={`flex items-center${isActive}`}
            >
              {button.label}{" "}
              {(button.counter ?? 0) > 0 && (
                <Badge
                  className="h-5 min-w-5 rounded-full px-1 tabular-nums"
                  variant="destructive"
                >
                  {button.counter}
                </Badge>
              )}
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

export default FriendsHeaderBar;

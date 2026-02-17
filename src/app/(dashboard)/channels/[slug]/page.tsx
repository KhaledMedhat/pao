"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { IconCheck, IconDotsVertical, IconMessageCircleFilled, IconSearch, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ProfileAvailabilityIndicator from "~/components/profile-availability-indicator";
import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActiveUI, FriendListPageInfo, FriendsView, MessageRequestsView } from "~/interfaces/app.interface";
import { NestErrorResponse } from "~/interfaces/error.interface";
import { FriendInterface, FriendRequestStatus, StatusType } from "~/interfaces/user.interface";
import { extractDirectChannelFromMembers } from "~/lib/utils";
import { sendFriendRequestSchema, SendFriendRequestValues } from "~/lib/validation";
import { useRemoveFriendMutation } from "~/redux/apis/auth.api";
import { useAcceptFriendRequestMutation, useRejectFriendRequestMutation, useSendFriendRequestMutation } from "~/redux/apis/user.api";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectActiveUI, selectDashboardFriendsHeaderActiveUI, selectDashboardMessageRequestsHeaderActiveUI } from "~/redux/slices/app/app-selector";
import { setActiveUI, setCurrentChannelId } from "~/redux/slices/app/app-slice";
import { selectCurrentUserChannels, selectCurrentUserInfo, selectFriendRequests } from "~/redux/slices/user/user-selector";

export default function ChannelsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState<string>("");
  const [removeFriend, { isLoading: isRemovingFriend }] = useRemoveFriendMutation();
  const [sendFriendRequest, { isLoading: isSendingFriendRequest }] = useSendFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: isAcceptingFriendRequest }] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest, { isLoading: isRejectingFriendRequest }] = useRejectFriendRequestMutation();
  const activeUI = useAppSelector(selectActiveUI);
  const friendsHeaderActiveUI = useAppSelector(selectDashboardFriendsHeaderActiveUI);
  const messageRequestsHeaderActiveUI = useAppSelector(selectDashboardMessageRequestsHeaderActiveUI);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const currentUserChannels = useAppSelector(selectCurrentUserChannels);
  const friendRequests = useAppSelector(selectFriendRequests);
  const onlineFriends = currentUserInfo.friends.filter((friend) => friend.status.type === StatusType.Online);
  const sendFriendRequestForm = useForm<SendFriendRequestValues>({
    resolver: zodResolver(sendFriendRequestSchema),
    defaultValues: {
      username: "",
    },
  });

  const onSendFriendRequestSubmit = async (data: SendFriendRequestValues) => {
    try {
      await sendFriendRequest({ username: data.username, sender: currentUserInfo }).unwrap();
      sendFriendRequestForm.reset();
      toast.success("Friend Request sent successfully");
    } catch (error) {
      const errData = (error as FetchBaseQueryError).data as NestErrorResponse;
      if (errData?.error === "Conflict" || errData?.error === "Not Found") {
        sendFriendRequestForm.setError("username", { type: "manual", message: errData.message });
      } else {
        toast.error("Oops, something went wrong!", {
          description: <span className="text-muted-foreground">{errData?.message || "An unexpected error occurred"}</span>,
        });
      }
    }
  };
  const friendListButtons = (friendId: string) => {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => {
                const directChannel = extractDirectChannelFromMembers(currentUserInfo._id, currentUserChannels, friendId);
                if (directChannel) {
                  dispatch(setCurrentChannelId(directChannel._id));
                  dispatch(setActiveUI(ActiveUI.DIRECT_MESSAGES));
                  router.push(`/dm/${directChannel._id}`);
                } else {
                  toast.error("Channel is not found");
                }
              }}
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-background text-muted-foreground"
            >
              <IconMessageCircleFilled size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Message</TooltipContent>
        </Tooltip>

        <TooltipProvider>
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-background text-muted-foreground">
                    <IconDotsVertical size={20} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Start Video Call</DropdownMenuItem>
                <DropdownMenuItem>Start Voice Call</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={async () => await removeFriend({ friendId })}>
                  Remove Friend
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>More</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    );
  };
  const pendingRequests = useMemo(() => friendRequests.filter((request) => request.status === FriendRequestStatus.Pending), [friendRequests]);

  const filterBySearch = <T extends FriendInterface>(items: T[]): T[] => {
    const searchValue = search.startsWith("@") ? search.slice(1) : search;
    if (searchValue.trim().length === 0) return items;
    return items.filter(
      (friend) =>
        friend.username.toLowerCase().includes(searchValue.toLowerCase()) || friend.displayName.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  const friendListPageInfo = useMemo((): FriendListPageInfo<FriendInterface> => {
    const pendingSenders = pendingRequests.map((request) => request.sender);

    switch (friendsHeaderActiveUI) {
      case FriendsView.ONLINE:
        const filteredOnline = filterBySearch(onlineFriends);
        return {
          status: "Online",
          count: filteredOnline.length,
          items: filteredOnline,
          showStatus: true,
          requestIds: [],
          onSearch: setSearch,
        };
      case FriendsView.ALL:
        const filteredAll = filterBySearch(currentUserInfo.friends);
        return {
          status: "All",
          count: filteredAll.length,
          items: filteredAll,
          showStatus: true,
          requestIds: [],
          onSearch: setSearch,
        };
      case FriendsView.PENDING:
        const filteredPending = filterBySearch(pendingSenders);
        console.log(filteredPending);
        const filteredRequestIds = pendingRequests.filter((req) => filteredPending.some((f) => f._id === req.sender._id)).map((req) => req._id);
        return {
          status: "Received",
          count: filteredPending.length,
          items: filteredPending,
          requestIds: filteredRequestIds,
          showStatus: false,
          onSearch: setSearch,
        };
      default:
        return { status: "", count: 0, items: [], showStatus: false, requestIds: [], onSearch: () => { } };
    }
  }, [friendsHeaderActiveUI, onlineFriends, currentUserInfo.friends, pendingRequests, search]);

  const mountButtons = (friendId: string, requestId: string) => {
    if (friendsHeaderActiveUI !== FriendsView.PENDING) {
      return friendListButtons(friendId);
    }
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => requestId && acceptFriendRequest({ requestId: requestId })}
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-background text-muted-foreground hover:text-green-500"
            >
              <IconCheck size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Accept</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => requestId && rejectFriendRequest({ requestId: requestId })}
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-background text-muted-foreground hover:text-red-500"
            >
              <IconX size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ignore</TooltipContent>
        </Tooltip>
      </>
    );
  };

  const mountFriendListSection = () => {
    if (friendsHeaderActiveUI !== FriendsView.ADD_FRIEND) {
      return (
        <>
          <div className="relative w-full">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              className="pl-10 h-12"
              value={search}
              onChange={(e) => friendListPageInfo.onSearch(e.target.value)}
            />
          </div>
          <p className="text-sm">
            {friendListPageInfo.status} - {friendListPageInfo.count}
          </p>
          <Table>
            <TableBody>
              {friendListPageInfo.items.map((friend, index) => (
                <TableRow key={friend._id} className="justify-between flex items-center group/friend border-t!">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProfileAvailabilityIndicator
                        status={friendListPageInfo.showStatus ? friend.status.type : undefined}
                        imageUrl={friend.profilePicture}
                        name={friend.displayName}
                        size="md"
                      />
                      <div className="flex flex-col itmes-start">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm">{friend.displayName}</p>
                          <p className="text-xs text-muted-foreground group-hover/friend:block hidden">{friend.username}</p>
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {friendListPageInfo.showStatus ? friend.status.type : friend.username}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gap-1 flex items-center">{mountButtons(friend._id, friendListPageInfo.requestIds[index] ?? "")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      );
    } else {
      return (
        <div className="w-full flex flex-col items-start gap-4">
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-2xl font-semibold">Add Friend</h1>
            <p>You can add friends with their Vyral username</p>
          </div>
          <div className="w-full">
            <Form {...sendFriendRequestForm}>
              <form onSubmit={sendFriendRequestForm.handleSubmit(onSendFriendRequestSubmit)} className="space-y-4">
                <FormField
                  control={sendFriendRequestForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            autoComplete="off"
                            type="text"
                            placeholder="You can add friends with their Vyral username"
                            {...field}
                            className="h-16 placeholder:text-xl pr-48"
                          />
                          <Button
                            disabled={!field.value || isSendingFriendRequest}
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 "
                          >
                            {isSendingFriendRequest ? (
                              <>
                                <Spinner />
                                Sending...
                              </>
                            ) : (
                              "Send Friend Request"
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>
      );
    }
  };

  const mountMessageRequestsSection = () => {
    if (messageRequestsHeaderActiveUI === MessageRequestsView.REQUESTS) {
      return (
        <div>
          <h1 className="text-2xl font-semibold">Message Requests</h1>
        </div>
      );
    }
    if (messageRequestsHeaderActiveUI === MessageRequestsView.SPAM) {
      return (
        <div>
          <h1 className="text-2xl font-semibold">Spam</h1>
        </div>
      );
    }
    return null;
  };
  const mountPageContent = () => {
    if (activeUI === ActiveUI.FRIENDS_LIST) {
      return mountFriendListSection();
    }
    if (activeUI === ActiveUI.MESSAGE_REQUESTS) {
      return mountMessageRequestsSection();
    }
  };

  return (
    <main className="flex-1 flex-row-reverse flex">
      {activeUI === ActiveUI.FRIENDS_LIST && friendsHeaderActiveUI !== FriendsView.ADD_FRIEND && (
        <aside className="h-full w-1/2 border-l p-4">Friends Online</aside>
      )}
      <div className="w-full p-4 gap-4 flex flex-col items-start">{mountPageContent()}</div>
    </main>
  );
}

import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import {
  selectActiveUI,
  selectCurrentChannel,
  selectDashboardFriendsHeaderActiveUI,
  selectDashboardMessageRequestsHeaderActiveUI,
  selectIsPinnedMessagesOpen,
  selectShowChannelDetails,
} from "~/redux/slices/app/app-selector";
import { ActiveUI, ConfigPrefix, FriendsSelectorView, FriendsView, MessageRequestsView } from "~/interfaces/app.interface";
import { setDashboardFriendsHeaderActiveUI, setDashboardMessageRequestsHeaderActiveUI, setIsPinnedMessagesOpen, setShowChannelDetails } from "~/redux/slices/app/app-slice";
import { selectCurrentUserInfo, selectFriendRequests } from "~/redux/slices/user/user-selector";
import FriendsSelector from "./friends-selector";
import {
  IconPencil,
  IconPhoneCall,
  IconPhotoPlus,
  IconPinFilled,
  IconSearch,
  IconUsers,
  IconUsersPlus,
  IconUserSquareRounded,
  IconVideoFilled,
  IconX,
} from "@tabler/icons-react";
import { Input } from "./ui/input";
import { ChannelType } from "~/interfaces/channels.interface";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { FriendRequestStatus } from "~/interfaces/user.interface";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useState } from "react";
import UserDetails from "./user-details";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editGroupSchema, EditGroupValues } from "~/lib/validation";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Spinner } from "./ui/spinner";
import { useUnpinMessageMutation, useUpdateChannelMutation } from "~/redux/apis/channel.api";
import useUpload from "~/hooks/use-upload";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { ImageCropper } from "./image-cropper";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { formatDate, getChannelTypeLabel, getInitialsFallback } from "~/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useScrollToMessage } from "~/hooks/use-scroll-to-message";
import { useChannelMessages } from "~/hooks/use-channel-messages";
import { useScrollContext } from "~/contexts/scroll-context";

const DashboardHeader = () => {
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState<boolean>(false);
  const [isUploadingLoading, setIsUploadingLoading] = useState<boolean>(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [hasDeletedExistingLogo, setHasDeletedExistingLogo] = useState<boolean>(false);
  const [isAddFriendsPopoverOpen, setIsAddFriendsPopoverOpen] = useState<boolean>(false);
  // Cropper states
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const [updateChannel, { isLoading: isUpdatingChannel }] = useUpdateChannelMutation();
  const [unpinMessage] = useUnpinMessageMutation();
  const { startUpload } = useUpload(ConfigPrefix.SINGLE_IMAGE_UPLOADER, setIsUploadingLoading);
  const activeUI = useAppSelector(selectActiveUI);
  const dashboardFriendsHeaderActiveUI = useAppSelector(selectDashboardFriendsHeaderActiveUI);
  const dashboardMessageRequestsHeaderActiveUI = useAppSelector(selectDashboardMessageRequestsHeaderActiveUI);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const showChannelDetails = useAppSelector(selectShowChannelDetails);
  const currentChannel = useAppSelector(selectCurrentChannel);
  const friendRequests = useAppSelector(selectFriendRequests);
  const isPinnedMessagesOpen = useAppSelector(selectIsPinnedMessagesOpen);
  const dispatch = useAppDispatch();
  const { scrollContainerRef } = useScrollContext();

  const { messages, isLoadingMore, hasMore, loadMoreMessages } = useChannelMessages(currentChannel?._id || "");

  const { scrollToMessage } = useScrollToMessage({
    messages,
    hasMore,
    isLoadingMore,
    loadMoreMessages,
    scrollContainerRef,
  });

  const editGroupForm = useForm<EditGroupValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      groupName: "",
      groupLogo: undefined,
    },
  });

  const watchedGroupName = editGroupForm.watch("groupName");
  const watchedGroupLogo = editGroupForm.watch("groupLogo");

  // Check if there are actual changes from original values
  const hasNameChange = Boolean(watchedGroupName?.trim() && watchedGroupName.trim() !== currentChannel?.groupOrServerName);
  const hasLogoChange = Boolean(watchedGroupLogo); // New file uploaded
  const hasFormChanges = hasNameChange || hasLogoChange || hasDeletedExistingLogo;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setOriginalImageUrl(imageUrl);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setOriginalImageUrl(null);
  };

  const handleCropApply = (croppedFile: File) => {
    editGroupForm.setValue("groupLogo", croppedFile);

    // Create preview URL for the cropped image
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImageUrl(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);

    setIsCropping(false);
    setOriginalImageUrl(null);
  };

  const resetFormAndCloseDialog = () => {
    editGroupForm.reset();
    setProfileImageUrl(null);
    setHasDeletedExistingLogo(false);
    setIsCropping(false);
    setOriginalImageUrl(null);
    setIsChannelDialogOpen(false);
  };

  const onEditGroupSubmit = async (data: EditGroupValues) => {
    const updateDto: { groupOrServerLogo?: string; groupOrServerName?: string } = {};

    // Handle logo changes
    if (data.groupLogo) {
      const res = await startUpload([data.groupLogo]);
      if (res && res[0]) {
        updateDto.groupOrServerLogo = res[0].ufsUrl;
      }
    } else if (hasDeletedExistingLogo) {
      // User deleted the existing logo, reset to default
      updateDto.groupOrServerLogo = SHORT_LOGO_URL;
    }

    // Handle name changes
    if (data.groupName?.trim() && data.groupName.trim() !== currentChannel?.groupOrServerName) {
      updateDto.groupOrServerName = data.groupName;
    }

    // Only update if there are changes
    if (Object.keys(updateDto).length > 0) {
      await updateChannel({
        channelId: currentChannel?._id || "",
        updateChannelDto: updateDto,
      });
    }

    resetFormAndCloseDialog();
  };
  const friendsButtons = [
    {
      label: "Online",
      onClick: () => dispatch(setDashboardFriendsHeaderActiveUI(FriendsView.ONLINE)),
      isActive: dashboardFriendsHeaderActiveUI === FriendsView.ONLINE && "bg-muted text-foreground",
      variant: "ghost" as const,
      size: "default" as const,
    },
    {
      label: "All",
      onClick: () => dispatch(setDashboardFriendsHeaderActiveUI(FriendsView.ALL)),
      isActive: dashboardFriendsHeaderActiveUI === FriendsView.ALL && "bg-muted text-foreground",
      variant: "ghost" as const,
      size: "default" as const,
    },
    {
      label: "Pending",
      onClick: () => dispatch(setDashboardFriendsHeaderActiveUI(FriendsView.PENDING)),
      isActive: dashboardFriendsHeaderActiveUI === FriendsView.PENDING && "bg-muted text-foreground",
      variant: "ghost" as const,
      size: "default" as const,
      counter: friendRequests.filter((request) => request.status === FriendRequestStatus.Pending).length,
    },
    {
      label: "Add Friend",
      onClick: () => dispatch(setDashboardFriendsHeaderActiveUI(FriendsView.ADD_FRIEND)),
      isActive: dashboardFriendsHeaderActiveUI === FriendsView.ADD_FRIEND && "bg-accent/40 text-foreground",
      variant: "default" as const,
      size: "sm" as const,
    },
  ];
  const messageRequestsButtons = [
    {
      label: "Requests",
      onClick: () => dispatch(setDashboardMessageRequestsHeaderActiveUI(MessageRequestsView.REQUESTS)),
      isActive: dashboardMessageRequestsHeaderActiveUI === MessageRequestsView.REQUESTS && "bg-muted text-foreground",
      variant: "ghost" as const,
      size: "default" as const,
    },
    {
      label: "Spam",
      onClick: () => dispatch(setDashboardMessageRequestsHeaderActiveUI(MessageRequestsView.SPAM)),
      isActive: dashboardMessageRequestsHeaderActiveUI === MessageRequestsView.SPAM && "bg-muted text-foreground",
      variant: "ghost" as const,
      size: "default" as const,
    },
  ];
  const nonServerchannelButtons = [
    {
      label: "Start Voice Call",
      onClick: () => { },
      variant: "ghost" as const,
      size: "icon" as const,
      icon: <IconPhoneCall size={20} />,
    },
    {
      label: "Start Video Call",
      onClick: () => { },
      variant: "ghost" as const,
      size: "icon" as const,
      icon: <IconVideoFilled size={20} />,
    },
    {
      label: "Pinned Messages",
      onClick: () => { },
      variant: "ghost" as const,
      size: "icon" as const,
      icon: <IconPinFilled size={20} />,
      popover: {
        open: isPinnedMessagesOpen,
        onOpenChange: (open: boolean) => dispatch(setIsPinnedMessagesOpen(open)),
        content: currentChannel?.pinnedMessages && currentChannel?.pinnedMessages?.length > 0 ?
          <ScrollArea className="h-90 px-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <IconPinFilled size={30} />
                <h1 className="text-lg font-semibold">Pinned Messages</h1>
              </div>
              {currentChannel?.pinnedMessages?.slice().reverse().map((message) => (
                <Card key={message._id} className="relative group">
                  <div className="hidden group-hover:flex items-center absolute top-2 right-2">
                    <Button variant="outline" className="h-8" onClick={() => scrollToMessage(message._id)}>
                      Jump
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => unpinMessage({
                      channelId: currentChannel?._id || "",
                      messageId: message._id,
                    })}>
                      <IconX size={16} />
                    </Button>
                  </div>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <Avatar className="size-10">
                        <AvatarImage src={message.sentBy?.profilePicture} />
                        <AvatarFallback>
                          {getInitialsFallback(message.sentBy?.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{message.sentBy?.displayName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(message.createdAt?.toString(), 'md')}</p>
                        </div>
                        <p className="text-sm">{message.message.content?.[0].content?.[0].text}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          :
          <Empty className="w-full flex items-center justify-center">
            <EmptyHeader>
              <EmptyMedia variant="default" className="relative">
                <IconPinFilled size={80} className="text-muted-foreground" />
                <span className="absolute top-0 right-8 text-xs bg-muted-foreground w-0.5 h-20 rotate-135"></span>
              </EmptyMedia>
              <EmptyTitle>No pinned messages</EmptyTitle>
              <EmptyDescription>This {getChannelTypeLabel(currentChannel?.type)} doesnt have any pinned messages yet.</EmptyDescription>
            </EmptyHeader>
          </Empty>,
      },
    },
    {
      label: "Add Friends to DM",
      onClick: () => { },
      variant: "ghost" as const,
      size: "icon" as const,
      icon: <IconUsersPlus size={20} />,
      popover: {
        open: isAddFriendsPopoverOpen,
        onOpenChange: setIsAddFriendsPopoverOpen,
        content: <div className="p-2">Add friends content</div>,
      },
    },
    {
      label: ActiveUI.DIRECT_MESSAGES
        ? showChannelDetails
          ? "Hide User Profile"
          : "Show User Profile"
        : showChannelDetails
          ? "Hide Member List"
          : "Show Member List",
      onClick: () => dispatch(setShowChannelDetails(!showChannelDetails)),
      variant: "ghost" as const,
      size: "icon" as const,
      isActive: showChannelDetails && "text-accent-foreground",
      icon: ActiveUI.DIRECT_MESSAGES ? <IconUserSquareRounded size={20} /> : <IconUsers size={20} />,
    },
    {
      label: null,
      onClick: () => { },
      variant: "ghost" as const,
      size: "default" as const,
      style: "hover:bg-transparent p-0",
      icon: (() => {
        const name =
          currentChannel?.type === ChannelType.Direct
            ? currentChannel?.directChannelOtherMember?.displayName || ""
            : currentChannel?.groupOrServerName || "";
        const truncatedName = name.length > 10 ? `${name.slice(0, 10)}...` : name;
        return (
          <div className="relative">
            <IconSearch size={20} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={`Search ${truncatedName}`} />
          </div>
        );
      })(),
    },
  ];
  const mountHeaderTitle = () => {
    switch (activeUI) {
      case ActiveUI.FRIENDS_LIST:
        return (
          <div className="flex items-center gap-4 w-full">
            <h1 className="text-base font-medium">Friends</h1>
            <span className="text-muted-foreground text-sm">&#8226;</span>
            <div className="flex items-center gap-2">
              {friendsButtons.map((button) => (
                <Button
                  size={button.size}
                  key={button.label}
                  variant={button.variant}
                  onClick={button.onClick}
                  className={`flex items-center${button.isActive}`}
                >
                  {button.label}{" "}
                  {(button.counter ?? 0) > 0 && (
                    <Badge className="h-5 min-w-5 rounded-full px-1 tabular-nums" variant="destructive">
                      {button.counter}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <FriendsSelector friends={currentUserInfo.friends} currentUser={currentUserInfo} view={FriendsSelectorView.DASHBOARD} />
            </div>
          </div>
        );
      case ActiveUI.MESSAGE_REQUESTS:
        return (

          <div className="flex items-center gap-4 w-full">
            <h1 className="text-base font-medium">Message Requests</h1>
            <span className="text-muted-foreground text-sm">&#8226;</span>
            <div className="flex items-center gap-2">
              {messageRequestsButtons.map((button) => (
                <Button size={button.size} key={button.label} variant={button.variant} onClick={button.onClick} className={`${button.isActive}`}>
                  {button.label}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <FriendsSelector friends={currentUserInfo.friends} currentUser={currentUserInfo} view={FriendsSelectorView.DASHBOARD} />
            </div>
          </div>

        );
      case ActiveUI.DIRECT_MESSAGES:
      case ActiveUI.GROUP: {
        return (
          <div className="flex items-center justify-between gap-4 w-full">
            <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-foreground group/channel-header-button"
                    onClick={() => {
                      // Set existing group logo as default when opening dialog (only if not the default logo)
                      if (currentChannel?.groupOrServerLogo && currentChannel.groupOrServerLogo !== SHORT_LOGO_URL) {
                        setProfileImageUrl(currentChannel.groupOrServerLogo);
                      }
                      setIsChannelDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={currentChannel?.type === ChannelType.Direct ? currentChannel?.directChannelOtherMember?.profilePicture || "" : currentChannel?.groupOrServerLogo || ""} alt={currentChannel?.type === ChannelType.Direct ? currentChannel?.directChannelOtherMember?.displayName || "" : currentChannel?.groupOrServerName || ""} />
                        <AvatarFallback>{getInitialsFallback(currentChannel?.type === ChannelType.Direct ? currentChannel?.directChannelOtherMember?.displayName || "" : currentChannel?.groupOrServerName || "")}</AvatarFallback>
                        {currentChannel?.type === ChannelType.Direct && <AvatarBadge className="size-2.5!" variant={currentChannel?.directChannelOtherMember?.status?.type} />}
                      </Avatar>

                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-sm">
                          {currentChannel?.type === ChannelType.Direct
                            ? currentChannel?.directChannelOtherMember?.displayName || ""
                            : currentChannel?.groupOrServerName}
                        </p>
                      </div>
                      {currentChannel?.type === ChannelType.Group && (
                        <IconPencil size={16} className="hidden group-hover/channel-header-button:block" />
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {currentChannel?.type === ChannelType.Direct ? currentChannel?.directChannelOtherMember?.displayName || "" : "Edit Group"}
                </TooltipContent>
              </Tooltip>
              <DialogContent className={currentChannel?.type === ChannelType.Direct ? "max-w-5xl! pb-0 h-[50vh]! overflow-y-auto" : "max-w-md"}>
                {currentChannel?.type === ChannelType.Direct && currentChannel?.directChannelOtherMember ? (
                  <>
                    <VisuallyHidden.Root>
                      <DialogHeader>
                        <DialogTitle></DialogTitle>
                        <DialogDescription></DialogDescription>
                      </DialogHeader>
                    </VisuallyHidden.Root>
                    <UserDetails user={currentChannel.directChannelOtherMember} size="lg" setDialogOpen={setIsChannelDialogOpen} />
                  </>
                ) : isCropping && originalImageUrl ? (
                  <ImageCropper imageUrl={originalImageUrl} onApply={handleCropApply} onCancel={handleCropCancel} />
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Edit Group</DialogTitle>
                      <VisuallyHidden.Root>
                        <DialogDescription></DialogDescription>
                      </VisuallyHidden.Root>
                    </DialogHeader>
                    <Form {...editGroupForm}>
                      <form onSubmit={editGroupForm.handleSubmit(onEditGroupSubmit)} className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative group">
                            {profileImageUrl && (
                              <Button
                                variant="destructive"
                                size="icon-sm"
                                className="absolute top-0 right-0 rounded-full z-10"
                                onClick={() => {
                                  // Check if deleting an existing logo (not a newly uploaded one)
                                  if (profileImageUrl === currentChannel?.groupOrServerLogo) {
                                    setHasDeletedExistingLogo(true);
                                  }
                                  setProfileImageUrl(null);
                                  editGroupForm.setValue("groupLogo", undefined);
                                }}
                              >
                                <IconX className="size-4" />
                              </Button>
                            )}
                            <div
                              className={`w-28 h-28 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-accent ${profileImageUrl ? "border-solid border-accent" : ""
                                }`}
                            >
                              {profileImageUrl ? (
                                <img src={profileImageUrl || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <IconPhotoPlus stroke={2} className="h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">Click to upload a group picture (optional)</p>
                        </div>

                        <FormField
                          control={editGroupForm.control}
                          name="groupName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  autoComplete="off"
                                  type="text"
                                  placeholder={currentChannel?.groupOrServerName || ""}
                                  className="h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center gap-4 w-full">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-11 bg-transparent"
                            onClick={() => setIsChannelDialogOpen(false)}
                          >
                            Back
                          </Button>
                          <Button type="submit" className="flex-1 h-11" disabled={!hasFormChanges || isUploadingLoading || isUpdatingChannel}>
                            {isUpdatingChannel || isUploadingLoading ? (
                              <>
                                <Spinner />
                                Saving...
                              </>
                            ) : (
                              <>Save</>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </>
                )}
              </DialogContent>
            </Dialog>
            <div className="flex items-center gap-1">
              {nonServerchannelButtons.map((button) => {
                const buttonContent = (
                  <Button
                    size={button.size}
                    variant={button.variant}
                    onClick={button.onClick}
                    className={`rounded-full ${button.isActive} ${button.style}`}
                  >
                    {button.icon}
                  </Button>
                );

                if (button.popover) {
                  return (
                    <Popover key={button.label} open={button.popover.open} onOpenChange={(open) => dispatch(setIsPinnedMessagesOpen(open))}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            {buttonContent}
                          </PopoverTrigger>
                        </TooltipTrigger>
                        {button.label && <TooltipContent>{button.label}</TooltipContent>}
                      </Tooltip>
                      <PopoverContent className="w-md px-1">{button.popover.content}</PopoverContent>
                    </Popover>
                  );
                }

                return (
                  <Tooltip key={button.label}>
                    <TooltipTrigger asChild>
                      {buttonContent}
                    </TooltipTrigger>
                    {button.label && <TooltipContent>{button.label}</TooltipContent>}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div
          className={`flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 ${activeUI === ActiveUI.SERVER ? "justify-between" : "justify-normal"}`}
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          {mountHeaderTitle()}
        </div>
      </header>
      <Separator className="w-[99%]! mx-auto" />
    </>
  );
};

export default DashboardHeader;

"use client";
import {
  IconBrandSafari,
  IconChevronDown,
  IconChevronUp,
  IconCopyCheckFilled,
  IconHash,
  IconMailFilled,
  IconPhotoPlus,
  IconPlus,
  IconSearch,
  IconSelector,
  IconSettings,
  IconUserFilled,
  IconUserPlus,
  IconUsersPlus,
  IconVolume,
  IconX,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "./ui/sidebar";
import UserNavigator from "./user-navigator";
import { selectCurrentUserChannels, selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createChannelCategorySchema, CreateChannelCategoryValues, createServerSchema, CreateServerValues, invitationServerJoinSchema, InvitationServerJoinValues } from "~/lib/validation";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import useUpload from "~/hooks/use-upload";
import { ActiveUI, ConfigPrefix, FriendsSelectorView } from "~/interfaces/app.interface";
import { useCreateChannelMutation, useCreateServerChannelMutation, useLeaveGroupChannelMutation, useSendServerInvitationLinkMutation } from "~/redux/apis/channel.api";
import { Channel, ChannelType, ServerChannelType } from "~/interfaces/channels.interface";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { NestErrorResponse } from "~/interfaces/error.interface";
import { Spinner } from "./ui/spinner";
import { useRouter } from "next/navigation";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Badge } from "./ui/badge";
import { useSearchUsersMutation } from "~/redux/apis/user.api";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import FriendsSelector from "./friends-selector";
import { setActiveChannelRoom, setActiveUI, setCurrentChannelId, setOpenServerInvitationDialog } from "~/redux/slices/app/app-slice";
import { selectActiveChannelRoom, selectActiveUI, selectCurrentChannel, selectOpenServerInvitationDialog, selectSidebarOpen } from "~/redux/slices/app/app-selector";
import { cn, extractDirectChannelFromMembers, getInitialsFallback } from "~/lib/utils";
import { setChannelListActive } from "~/redux/slices/user/user-slice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import ChannelSharedContextMenu from "./channel-shared-context-menu";
import { ImageCropperInline } from "./image-cropper";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import ReactionPicker from "./reaction-picker";
import { sileo } from "sileo";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { useIsMobile } from "~/hooks/use-mobile";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [openAddServerDialog, setOpenAddServerDialog] = useState<boolean>(false);
  const [isUploadingLoading, setIsUploadingLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(2);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [inviteToServerSearch, setInviteToServerSearch] = useState<string>("");
  const [textCollapsibleOpen, setTextCollapsibleOpen] = useState<boolean>(true);
  const [voiceCollapsibleOpen, setVoiceCollapsibleOpen] = useState<boolean>(true);
  const [openServerCreateChannelDialog, setOpenServerCreateChannelDialog] = useState<boolean>(false);
  const [hoveringTextRoom, setHoveringTextRoom] = useState<string | null>(null);
  const [hoveringVoiceRoom, setHoveringVoiceRoom] = useState<string | null>(null);
  const [leavingGroupChannelId, setLeavingGroupChannelId] = useState<string | null>(null);
  const [openServerDropdown, setOpenServerDropdown] = useState<boolean>(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState<boolean>(false);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);
  const [currentEmoji, setCurrentEmoji] = useState<string>("😊");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const openServerInvitationDialog = useAppSelector(selectOpenServerInvitationDialog);
  const [sendServerInvitationLink, { isLoading: isSendingServerInvitationLink }] = useSendServerInvitationLinkMutation();
  const handleSendServerInvitationLink = async (friendId: string) => {
    setInvitingFriendId(friendId);
    try {
      await sendServerInvitationLink({
        sendTo: extractDirectChannelFromMembers(currentUserInfo._id, currentChannels, friendId)?._id || "",
        invitationLink: {
          link: currentChannel?.serverInvitationLink?.link || "",
          id: currentChannel?.serverInvitationLink?.id || "",
        },
      }).unwrap();
    } finally {
      setInvitingFriendId((prev) => (prev === friendId ? null : prev));
    }
  };

  const activeUI = useAppSelector(selectActiveUI);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const currentChannels = useAppSelector(selectCurrentUserChannels);
  const currentChannel = useAppSelector(selectCurrentChannel);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const currentActiveChannelRoom = useAppSelector(selectActiveChannelRoom);
  const [createChannel, { isLoading: isCreatingChannel }] = useCreateChannelMutation();
  const [searchUsers, { data: usersQuery }] = useSearchUsersMutation();
  const [leaveGroupChannel, { isLoading: isLeavingGroupChannelLoading }] = useLeaveGroupChannelMutation();
  const [createServerChannel, { isLoading: isCreatingServerChannel }] = useCreateServerChannelMutation();
  const { startUpload } = useUpload(ConfigPrefix.SINGLE_IMAGE_UPLOADER, setIsUploadingLoading);
  const filteredServerInvitationFriends = currentUserInfo.friends.filter((friend) => !currentChannel?.members.some((member) => member._id === friend._id));
  const secondSidebarButtons = [
    {
      icon: <IconUserFilled size={20} />,
      label: "Friends",
      onClick: () => {
        dispatch(setActiveUI(ActiveUI.FRIENDS_LIST));
        router.push(`/channels/${currentUserInfo.channelSlug}`);
      },
      isActive: activeUI === ActiveUI.FRIENDS_LIST,
    },
    {
      icon: <IconMailFilled size={20} />,
      label: "Message Requests",
      onClick: () => {
        dispatch(setActiveUI(ActiveUI.MESSAGE_REQUESTS));
        router.push(`/channels/${currentUserInfo.channelSlug}`);
      },
      isActive: activeUI === ActiveUI.MESSAGE_REQUESTS,
    },
  ];

  const mountDmOrGroupChannelFinder = (channel: Channel) => {
    switch (channel.type) {
      case ChannelType.Direct:
        return {
          route: `/dm/${channel.directChannelOtherMember?._id}`,
          imageUrl: channel.directChannelOtherMember?.profilePicture || "",
          name: channel.directChannelOtherMember?.displayName || "",
          fallbackName: getInitialsFallback(channel.directChannelOtherMember?.displayName),
        };
      case ChannelType.Group:
        return {
          route: `/group/${channel._id}`,
          imageUrl: channel.groupOrServerLogo || "",
          name: channel.groupOrServerName || "",
          fallbackName: getInitialsFallback(channel.groupOrServerName || ""),
        };
      default:
        undefined;
    }
  };
  const invitationServerJoin = useForm<InvitationServerJoinValues>({
    resolver: zodResolver(invitationServerJoinSchema),
    defaultValues: {
      invitationLink: "",
    },
  });

  const createServer = useForm<CreateServerValues>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      serverName: "",
      serverImage: undefined,
    },
  });
  const createChannelCategory = useForm<CreateChannelCategoryValues>({
    resolver: zodResolver(createChannelCategorySchema),
    defaultValues: {
      channelType: ServerChannelType.Text,
      channelName: "",
    },
  });
  const onInvitationServerJoinSubmit = async (data: InvitationServerJoinValues) => {
    console.log(data);
  };

  const onCreateChannelCategorySubmit = (data: CreateChannelCategoryValues) => {
    createServerChannel({
      serverId: currentChannel?._id || "",
      payload: data,
    }).unwrap().then(() => {
      setOpenServerCreateChannelDialog(false);
      createChannelCategory.reset();
    }).catch(() => {
      sileo.error({
        title: "Oops, something went wrong!",
        description: "An unexpected error occurred",
      });
    });
  };

  const onCreateServerSubmit = (data: CreateServerValues) => {
    try {
      if (data.serverImage) {
        startUpload([data.serverImage]).then((res) => {
          if (res && res[0]) {
            createChannel({
              members: [currentUserInfo._id],
              groupOrServerLogo: res[0].ufsUrl,
              groupOrServerName: data.serverName,
              type: ChannelType.Server,
            })
              .unwrap()
              .then((res) => {
                dispatch(setCurrentChannelId(res.data.channel._id));
                dispatch(setActiveUI(ActiveUI.SERVER));
                dispatch(setActiveChannelRoom({ _id: res.data.channel._id, name: res.data.extraRoute || "", type: "Primary" }));
                router.push(`/server/${res.data.route}`);
                setOpenAddServerDialog(false);
              });
          }
        });
      } else {
        createChannel({
          members: [currentUserInfo._id],
          groupOrServerLogo: undefined,
          groupOrServerName: data.serverName,
          type: ChannelType.Server,
        })
          .unwrap()
          .then((res) => {
            dispatch(setCurrentChannelId(res.data.channel._id));
            dispatch(setActiveUI(ActiveUI.SERVER));
            dispatch(setActiveChannelRoom({ _id: res.data.channel._id, name: res.data.extraRoute || "", type: "Primary" }));
            router.push(`/server/${res.data.route}`);
            setOpenAddServerDialog(false);
          });
      }
    } catch (error) {
      const errData = (error as FetchBaseQueryError).data as NestErrorResponse;
      sileo.error({
        title: "Oops, something went wrong!",
        description: errData?.message || "An unexpected error occurred",
      });
    }
  };

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
    createServer.setValue("serverImage", croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImageUrl(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    setIsCropping(false);
    setOriginalImageUrl(null);
  };
  const handleLogoPress = () => {
    router.push(`/channels/${currentUserInfo.channelSlug}`);
    dispatch(setCurrentChannelId(null));
    dispatch(setActiveChannelRoom(null));
    dispatch(setActiveUI(ActiveUI.FRIENDS_LIST));
  };
  const Wrapper = (isMobile ? Sidebar : "div") as React.ElementType;
  const wrapperProps = isMobile ? { collapsible: "icon" as const, ...props } : {};
  return (
    <Wrapper className="relative flex max-h-[calc(100vh-var(--spacing)*9)] overflow-hidden pr-0 *:data-[sidebar=sidebar]:flex-row" {...wrapperProps}>
      {/* first sidebar for servers and some buttons  */}

      <Sidebar
        collapsible="none"
        className="max-h-screen"
        {...props}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 16)",
          } as React.CSSProperties
        }
      >
        <SidebarHeader className="p-0">
          <SidebarMenuItem className="px-2">
            <SidebarMenuButton variant="primary" tooltip={{ children: "Direct Messages", hidden: false }} onClick={() => handleLogoPress()} className="relative w-full items-center justify-center h-11">
              <Image src="/vyral-short-logo.svg" alt="Vyral" fill className="object-cover" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarHeader>
        <SidebarSeparator className="w-3/4! mx-auto mt-[5.4px]" />
        <SidebarContent className="flex-1 min-h-0 mt-4 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4">
              {currentChannels
                .filter((channel) => channel?.type === ChannelType.Server)
                .map((channel) => (
                  <SidebarMenuItem key={channel._id} className="px-2">
                    <SidebarMenuButton
                      size="lg"
                      onClick={() => {
                        dispatch(setActiveUI(ActiveUI.SERVER))
                        dispatch(setCurrentChannelId(channel._id));
                        dispatch(setActiveChannelRoom({ _id: channel.channelMessageRooms?.find((room) => room.type === "Primary")?._id || "", name: channel.channelMessageRooms?.find((room) => room.type === "Primary")?.name || "", type: "Primary" }));
                        router.push(`/server/${channel._id}`);
                      }}
                      tooltip={{
                        children: channel.groupOrServerName,
                        hidden: false,
                      }}
                      className="relative! h-11 w-full"
                    >
                      <Image
                        src={channel.groupOrServerLogo || ""}
                        alt={channel.groupOrServerName || ""}
                        sizes="200px"
                        fill
                        className="object-cover rounded-sm"
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </div>
            <div className="space-y-4 mt-4">
              <Dialog open={openAddServerDialog} onOpenChange={setOpenAddServerDialog}>
                <DialogTrigger asChild>
                  <SidebarMenuItem className="px-2">
                    <SidebarMenuButton
                      tooltip={{
                        children: "Add Server",
                        hidden: false,
                      }}
                      variant="primary"
                      className="relative! items-center flex justify-center h-11 w-full"
                    >
                      <IconPlus stroke={2} size={24} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </DialogTrigger>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()} className="sm:max-w-[425px] max-w-lg! gap-10">
                  <DialogHeader className="relative overflow-hidden">
                    <div
                      className="transition-all duration-500 ease-in-out flex items-center flex-col gap-4"
                      style={{
                        transform: step === 1 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 1 ? 1 : 0,
                        position: step === 1 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <DialogTitle className="text-center">Join a Server</DialogTitle>
                      <DialogDescription className="text-center">Enter an invitation below to join an existing server.</DialogDescription>
                    </div>
                    <div
                      className="transition-all duration-500 ease-in-out flex items-center flex-col gap-4"
                      style={{
                        transform: step === 2 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 2 ? 1 : 0,
                        position: step === 2 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <DialogTitle className="text-center">Create your Server</DialogTitle>
                      <DialogDescription className="text-center">
                        Your server is where you and your friends hang out. Make yours and start hanging.
                      </DialogDescription>
                    </div>
                    <div
                      className="transition-all duration-500 ease-in-out flex items-center flex-col gap-4"
                      style={{
                        transform: step === 3 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 3 ? 1 : 0,
                        position: step === 3 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <DialogTitle className="text-center">Customize Your Server </DialogTitle>
                      <DialogDescription className="text-center">
                        Give your server a personality with a name and an image.You can always change it later.
                      </DialogDescription>
                    </div>
                  </DialogHeader>
                  <div className="relative overflow-hidden">
                    <div
                      className="transition-all duration-500 ease-in-out"
                      style={{
                        transform: step === 1 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 1 ? 1 : 0,
                        position: step === 1 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <Form {...invitationServerJoin}>
                        <form
                          id="invitation-server-join-form"
                          onSubmit={invitationServerJoin.handleSubmit(onInvitationServerJoinSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={invitationServerJoin.control}
                            name="invitationLink"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="uppercase font-semibold text-xs">Invitation Link</FormLabel>
                                <FormControl>
                                  <Input type="text" placeholder="https://Vyral.gg/AbCdEf" {...field} />
                                </FormControl>
                                <FormDescription>Invitations should look like https://Vyral.gg/AbCdEf</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </form>
                      </Form>
                    </div>
                    <div
                      className="transition-all duration-500 ease-in-out flex items-center flex-col gap-8"
                      style={{
                        transform: step === 2 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 2 ? 1 : 0,
                        position: step === 2 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <Button onClick={() => setStep(3)}>Create My Own</Button>
                      <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs font-semibold">
                          <span className="bg-card px-2 text-muted-foreground">Have an invitation already?</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="transition-all duration-500 ease-in-out"
                      style={{
                        transform: step === 3 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 3 ? 1 : 0,
                        position: step === 3 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      {isCropping && originalImageUrl ? (
                        <ImageCropperInline imageUrl={originalImageUrl} onApply={handleCropApply} onCancel={handleCropCancel} title="Crop Server Image" />
                      ) : (
                        <Form {...createServer}>
                          <form id="create-server-form" onSubmit={createServer.handleSubmit(onCreateServerSubmit)} className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                              <div className="relative group mt-4">
                                {profileImageUrl && (
                                  <Button
                                    variant="destructive"
                                    size="icon-sm"
                                    className="absolute top-0 right-0 rounded-full z-10"
                                    onClick={(e) => {
                                      setProfileImageUrl(null);
                                      createServer.setValue("serverImage", undefined);
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
                              <p className="text-sm text-muted-foreground">Click to upload a profile picture (optional)</p>
                            </div>

                            <FormField
                              control={createServer.control}
                              name="serverName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="uppercase font-semibold text-xs">Server Name</FormLabel>
                                  <FormControl>
                                    <Input autoComplete="off" placeholder={`${currentUserInfo.displayName}'s Server`} type="text" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  <FormDescription className="text-xs">
                                    By creating a server, you agree to Vyral's{" "}
                                    <Link href="/terms" className="text-accent hover:underline font-semibold">
                                      Community Guidelines
                                    </Link>
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                          </form>
                        </Form>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="justify-center! relative overflow-hidden">
                    <div
                      className="flex items-center justify-between w-full transition-all duration-500 ease-in-out"
                      style={{
                        transform: step === 1 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 1 ? 1 : 0,
                        position: step === 1 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <Button onClick={() => setStep(2)} variant="ghost">
                        Back
                      </Button>
                      <Button form="invitation-server-join-form">Join Server</Button>
                    </div>
                    <div
                      className="transition-all duration-500 ease-in-out"
                      style={{
                        transform: step === 2 ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 2 ? 1 : 0,
                        position: step === 2 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <Button onClick={() => setStep(1)}>Join a Server</Button>
                    </div>
                    <div
                      className="flex items-center justify-between w-full transition-all duration-500 ease-in-out"
                      style={{
                        transform: step === 3 && !isCropping ? "translateX(0)" : "translateX(100%)",
                        opacity: step === 3 && !isCropping ? 1 : 0,
                        position: step === 3 && !isCropping ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <Button onClick={() => setStep(2)} variant="ghost">
                        Back
                      </Button>
                      <Button form="create-server-form" disabled={isCreatingChannel || isUploadingLoading}>
                        {isCreatingChannel || isUploadingLoading ? (
                          <>
                            <Spinner />
                            Creating Server...
                          </>
                        ) : (
                          "Create"
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <SidebarMenuItem className="px-2">
                <SidebarMenuButton
                  tooltip={{
                    children: "Discover",
                    hidden: false,
                  }}
                  className="relative! items-center flex justify-center h-11 w-full"
                  variant="primary"
                >
                  <IconBrandSafari stroke={2} size={24} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </div>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>

      {/* second sidebar for channels and some buttons  */}
      <Sidebar
        collapsible="none"
        className={cn(
          "h-full overflow-hidden rounded-lg rounded-tr-none rounded-bl-none transition-[width,opacity,border-color] duration-200 ease-linear",
          sidebarOpen
            ? "w-(--sidebar-width) opacity-100 border-l border-t"
            : "w-0 opacity-0 border-transparent pointer-events-none"
        )}
        {...props}
      >
        <SidebarHeader>
          <SidebarMenu className="gap-2">
            {activeUI === ActiveUI.SERVER ?
              <div className="flex items-center justify-between w-full">
                <DropdownMenu open={openServerDropdown} onOpenChange={setOpenServerDropdown}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <span className="flex items-center gap-1">
                            <p className="font-semibold text-sm truncate max-w-[100px]">{currentChannel?.groupOrServerName}</p>
                            {!openServerDropdown ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                    </SidebarMenuButton>
                    <DropdownMenuContent side="bottom">
                    </DropdownMenuContent>
                  </SidebarMenuItem>
                </DropdownMenu>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={{ children: "Invite to Server", hidden: false, side: "bottom" }} asChild >
                    <Button variant="ghost" onClick={() => dispatch(setOpenServerInvitationDialog(true))}>
                      <IconUsersPlus size={16} fill="var(--foreground)" color='var(--foreground)' />
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </div>
              :
              <>
                <SidebarMenuItem>
                  <Dialog>
                    <DialogTrigger asChild>
                      <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                        <Button variant="secondary">Find or start a conversation</Button>
                      </SidebarMenuButton>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-w-2xl!">
                      <DialogHeader>
                        <DialogTitle>
                          <Input
                            onChange={async (e) => {
                              const value = e.target.value;
                              setSearch(value);
                              const searchValue = value.startsWith("@") ? value.slice(1) : value;
                              if (searchValue.trim().length > 0) {
                                await searchUsers(searchValue.trim());
                              }
                            }}
                            value={search}
                            type="text"
                            className="h-14"
                            placeholder="Where would you like to go?"
                          />
                        </DialogTitle>
                        <DialogDescription />
                      </DialogHeader>
                      <ScrollArea className="h-60">
                        {search.length > 0 ? (
                          <div className="flex flex-col items-start gap-2">
                            {search.startsWith("@") && <p className="text-xs uppercase font-semibold text-muted-foreground">searching all users</p>}
                            {usersQuery && usersQuery?.length > 0 ? (
                              usersQuery?.map((user) => (
                                <Link href={`/user/${user._id}`} key={user._id} className="w-full">
                                  <Button variant="ghost" className="flex items-center justify-start gap-2 w-full">
                                    <Avatar className="size-6">
                                      <AvatarImage src={user.profilePicture} alt={user.displayName} />
                                      <AvatarFallback>{getInitialsFallback(user.displayName)}</AvatarFallback>
                                      <AvatarBadge className="size-2.5!" variant={user.status.type} />
                                    </Avatar>
                                    <span className="flex items-center gap-2">{user.displayName}</span>
                                    <span className="text-xs text-muted-foreground">{user.username}</span>
                                  </Button>
                                </Link>
                              ))
                            ) : (
                              <Empty className="w-full flex items-center justify-center">
                                <EmptyHeader>
                                  <EmptyMedia variant="default">
                                    <IconSearch className="size-12 text-muted-foreground" />
                                  </EmptyMedia>
                                  <EmptyTitle>No users found</EmptyTitle>
                                  <EmptyDescription>No users found. Please try again with a different search.</EmptyDescription>
                                </EmptyHeader>
                              </Empty>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-4">
                            <Collapsible defaultOpen={true} className="flex flex-col gap-2 w-full items-start">
                              <CollapsibleTrigger className="uppercase flex items-center gap-1 font-semibold text-xs text-muted-foreground text-start">
                                previous channels <IconSelector stroke={2} className="size-4" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="flex flex-col gap-1 w-full items-start">
                                {currentChannels
                                  .filter((channel) => channel?.type === ChannelType.Server)
                                  .map((channel) => (
                                    <Link href={`/server/${channel._id}`} key={channel._id} className="w-full">
                                      <Button variant="ghost" className="flex items-center justify-start gap-2 w-full ">
                                        <IconVolume stroke={2} className="size-4 text-muted-foreground" />
                                        <span className="flex items-center gap-2">
                                          <Avatar className="size-5">
                                            <AvatarImage src={channel.groupOrServerLogo || ""} />
                                            <AvatarFallback>{channel.groupOrServerName?.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          {channel.groupOrServerName}
                                        </span>
                                      </Button>
                                    </Link>
                                  ))}
                              </CollapsibleContent>
                            </Collapsible>

                            <Collapsible defaultOpen={true} className="flex flex-col gap-2 w-full items-start">
                              <CollapsibleTrigger className="uppercase flex items-center gap-1 font-semibold text-xs text-muted-foreground text-start">
                                channels <IconSelector stroke={2} className="size-4" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="flex flex-col gap-1 w-full items-start">
                                {currentChannels
                                  .filter((channel) => channel && channel.type !== ChannelType.Server)
                                  .map((channel) => (
                                    <Link href={mountDmOrGroupChannelFinder(channel)?.route || ""} key={channel._id} className="w-full">
                                      <Button variant="ghost" className="flex items-center justify-start gap-2 w-full ">
                                        <IconVolume stroke={2} className="size-4 text-muted-foreground" />
                                        <span className="flex items-center gap-2">
                                          <Avatar className="size-5">
                                            <AvatarImage src={mountDmOrGroupChannelFinder(channel)?.imageUrl || ""} />
                                            <AvatarFallback>{mountDmOrGroupChannelFinder(channel)?.fallbackName || ""}</AvatarFallback>
                                          </Avatar>
                                          {mountDmOrGroupChannelFinder(channel)?.name || ""}
                                        </span>
                                      </Button>
                                    </Link>
                                  ))}
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </ScrollArea>
                      <Separator />
                      <DialogFooter className="text-xs justify-start! items-center gap-1">
                        <span className="font-bold text-accent uppercase">protip:</span>Start searches with
                        <Badge className="rounded-sm p-0 text-xs" variant="default">
                          @
                        </Badge>
                        to narrow results.
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </SidebarMenuItem>
                <SidebarSeparator />
                {secondSidebarButtons.map((button) => (
                  <SidebarMenuItem key={button.label}>
                    <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5! text-muted-foreground" isActive={button.isActive}>
                      <Button variant="ghost" className="justify-start h-9" onClick={button.onClick}>
                        {button.icon}
                        {button.label}
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </>
            }

          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="overflow-hidden">
          <SidebarSeparator className="w-[95%]! mx-auto" />
          {activeUI === ActiveUI.SERVER ?
            (
              <ScrollArea className="h-full max-w-full">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between w-full pl-2">
                    <Collapsible open={textCollapsibleOpen} onOpenChange={setTextCollapsibleOpen} className="flex w-full flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <CollapsibleTrigger className="flex items-center gap-1 w-full cursor-pointer group/text-collapsible">
                          <p className="text-sm text-muted-foreground group-hover/text-collapsible:text-foreground">Text Channels</p>
                          <IconChevronRight size={16} className={`text-muted-foreground group-hover/text-collapsible:text-foreground ${textCollapsibleOpen ? "rotate-90 transition-transform duration-200" : "transition-transform duration-200 "}`} />
                        </CollapsibleTrigger>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" onClick={() => setOpenServerCreateChannelDialog(true)}>
                              <IconPlus size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create Channel</TooltipContent>
                        </Tooltip>
                      </div>
                      {!textCollapsibleOpen &&
                        <div className="w-full relative">
                          <Button onClick={() => {
                            dispatch(setActiveChannelRoom({ _id: currentActiveChannelRoom?._id || "", name: currentActiveChannelRoom?.name || "", type: currentActiveChannelRoom?.type || undefined }));
                          }} className="flex items-center justify-start w-full bg-muted-foreground/10 text-foreground hover:bg-muted-foreground/10">
                            <IconHash size={20} /> {currentActiveChannelRoom?.name}
                          </Button>
                          <div
                            className="flex items-center absolute top-0 right-0"
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon-sm" onClick={() => dispatch(setOpenServerInvitationDialog(true))}>
                                  <IconUserPlus size={16} className="text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Invite to Channel</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <IconSettings size={16} className="text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent >Edit Channel</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                      }
                      <CollapsibleContent className="w-full space-y-1">
                        {currentChannel?.channelMessageRooms?.map((room) => (
                          <div key={room._id} className="relative w-full" onMouseEnter={() => setHoveringTextRoom(room._id)}
                            onMouseLeave={() => setHoveringTextRoom(null)}>
                            <Button
                              onClick={() => {
                                dispatch(setActiveChannelRoom({ _id: room._id, name: room.name, type: room.type }));

                              }} variant="ghost" className={`group flex items-center justify-start w-full ${currentActiveChannelRoom?._id === room._id && "bg-muted-foreground/10 text-foreground hover:bg-muted-foreground/10"}`}>
                              <IconHash size={20} /> {room.name}
                            </Button>
                            <div
                              className={`flex items-center absolute top-0 right-0 transition-opacity duration-150 ${hoveringTextRoom === room._id || currentActiveChannelRoom?._id === room._id
                                ? "opacity-100 pointer-events-auto"
                                : "opacity-0 pointer-events-none"
                                }`}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" onClick={() => dispatch(setOpenServerInvitationDialog(true))}>
                                    <IconUserPlus size={16} className="text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Invite to Channel</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <IconSettings size={16} className="text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Channel</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}

                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  <SidebarSeparator className="w-[92%]! mx-auto!" />
                  <div className="flex items-center justify-between w-full pl-2">
                    <Collapsible open={voiceCollapsibleOpen} onOpenChange={setVoiceCollapsibleOpen} className="flex w-full flex-col">
                      <div className="flex items-center justify-between gap-2  group/voice-collapsible">
                        <CollapsibleTrigger className="flex items-center gap-1 w-full cursor-pointer group/voice-collapsible">
                          <p className="text-sm text-muted-foreground group-hover/voice-collapsible:text-foreground">Voice Channels</p>
                          <IconChevronRight size={16} className={`text-muted-foreground group-hover/voice-collapsible:text-foreground ${voiceCollapsibleOpen ? "rotate-90 transition-transform duration-200" : "transition-transform duration-200"}`} />
                        </CollapsibleTrigger>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" onClick={() => setOpenServerCreateChannelDialog(true)}>
                              <IconPlus size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create Channel</TooltipContent>
                        </Tooltip>
                      </div>
                      <CollapsibleContent className="w-full space-y-1">
                        {currentChannel?.channelCallRooms?.map((room) => (
                          <div key={room._id} className="relative w-full" onMouseEnter={() => setHoveringVoiceRoom(room._id)}
                            onMouseLeave={() => setHoveringVoiceRoom(null)}>
                            <Button
                              onClick={() => {
                                dispatch(setActiveChannelRoom({ _id: room._id, name: room.name }));

                              }} variant="ghost" className="group flex items-center justify-start w-full">
                              <IconVolume size={20} /> {room.name}
                            </Button>
                            <div
                              className={`flex items-center absolute top-0 right-0 transition-opacity duration-150 ${hoveringVoiceRoom === room._id || currentActiveChannelRoom?._id === room._id
                                ? "opacity-100 pointer-events-auto"
                                : "opacity-0 pointer-events-none"
                                }`}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" onClick={() => dispatch(setOpenServerInvitationDialog(true))}>
                                    <IconUserPlus size={16} className="text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Invite to Channel</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <IconSettings size={16} className="text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Channel</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}

                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                </div>
              </ScrollArea>
            )
            : (
              <>
                <div className="flex items-center justify-between w-full px-2">
                  <p className="text-sm font-semibold text-muted-foreground">Direct Messages</p>
                  <FriendsSelector friends={currentUserInfo.friends} currentUser={currentUserInfo} view={FriendsSelectorView.SIDEBAR} />
                </div>
                <ScrollArea className="h-full max-w-full">
                  <div className="flex flex-col pr-2 pl-2">
                    {currentChannels.length > 0 &&
                      currentChannels
                        .filter((channel) => channel && ((channel.type === ChannelType.Direct && channel.listActive) || channel.type === ChannelType.Group))
                        .map((channel) => {
                          const extractedDirectMessageChannel = extractDirectChannelFromMembers(
                            currentUserInfo._id,
                            currentChannels,
                            channel.directChannelOtherMember?._id || ""
                          );
                          return (
                            <ChannelSharedContextMenu key={channel._id} channel={channel}>
                              <Link
                                href={channel.type === ChannelType.Direct ? `/dm/${extractedDirectMessageChannel?._id}` : `/group/${channel._id}`}
                                className="max-w-full group/channel"
                              >
                                <Button
                                  variant="ghost"
                                  className={`flex items-center w-full justify-between gap-2  ${channel.type === ChannelType.Group ? "mt-1 h-12" : "h-11"}`}
                                  onClick={() => {
                                    dispatch(setCurrentChannelId(channel._id));
                                    channel.type === ChannelType.Direct
                                      ? dispatch(setActiveUI(ActiveUI.DIRECT_MESSAGES))
                                      : dispatch(setActiveUI(ActiveUI.GROUP));
                                  }}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Avatar
                                      style={
                                        channel.type === ChannelType.Direct && channel.directChannelOtherMember?.profilePicture === SHORT_LOGO_URL && channel.directChannelOtherMember?.profilePictureBannerColor
                                          ? { backgroundColor: channel.directChannelOtherMember.profilePictureBannerColor }
                                          : undefined
                                      }
                                    >
                                      <AvatarImage src={channel.type === ChannelType.Direct ? channel.directChannelOtherMember?.profilePicture || "" : channel.groupOrServerLogo || ""} alt={channel.type === ChannelType.Direct ? channel.directChannelOtherMember?.displayName || "" : channel.groupOrServerName || ""} />
                                      <AvatarFallback>{getInitialsFallback(channel.type === ChannelType.Direct ? channel.directChannelOtherMember?.displayName || "" : channel.groupOrServerName || "")}</AvatarFallback>
                                      {channel.type === ChannelType.Direct && <AvatarBadge className="size-2.5!" variant={channel.directChannelOtherMember?.status?.type} />}
                                    </Avatar>
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                      <p className="font-semibold text-sm text-muted-foreground truncate max-w-[150px]">
                                        {channel.type === ChannelType.Direct
                                          ? channel.directChannelOtherMember?.displayName || ""
                                          : channel.groupOrServerName || ""}
                                      </p>
                                      {channel.type === ChannelType.Group && (
                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                          Group
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className="cursor-pointer hidden group-hover/channel:block bg-muted-foreground/10 rounded-full p-1 hover:bg-main"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (channel.type === ChannelType.Direct) {
                                        dispatch(setChannelListActive({ channelId: channel._id, listActive: false }));
                                      } else {
                                        setLeavingGroupChannelId(channel._id);
                                      }
                                    }}
                                  >
                                    <IconX size={14} className="text-muted-foreground" />
                                  </div>
                                </Button>
                              </Link>
                            </ChannelSharedContextMenu>
                          );
                        })}
                  </div>
                </ScrollArea>

                {/* Alert dialog for leaving group channel - rendered once outside the loop */}
                <AlertDialog open={!!leavingGroupChannelId} onOpenChange={(open) => !open && setLeavingGroupChannelId(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Leave {currentChannels.find((c) => c._id === leavingGroupChannelId)?.groupOrServerName || ""} Group?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave{" "}
                        <span className="font-semibold">{currentChannels.find((c) => c._id === leavingGroupChannelId)?.groupOrServerName || ""}</span>{" "}
                        group? You won't be able to rejoin this group unless you are re-invited.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/80">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={async () => {
                          if (leavingGroupChannelId) {
                            await leaveGroupChannel(leavingGroupChannelId);
                            setLeavingGroupChannelId(null);
                          }
                        }}
                      >
                        {isLeavingGroupChannelLoading ? (
                          <>
                            <Spinner />
                            Leaving Group...
                          </>
                        ) : (
                          "Leave Group"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
        </SidebarContent>
      </Sidebar>
      <UserNavigator />

      <Dialog open={openServerInvitationDialog} onOpenChange={(open) => dispatch(setOpenServerInvitationDialog(open))}>
        <DialogContent showCloseButton={true}>
          <DialogHeader className="space-y-2">
            <DialogTitle>Invite friends to {currentChannel?.groupOrServerName}</DialogTitle>
            <DialogDescription className="flex gap-1 items-center text-md">
              Recipients will land in <IconHash size={20} /> {currentChannel?.channelMessageRooms?.find((room) => room.type === "Primary")?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full flex flex-col items-center gap-4">
            <div className="relative w-full">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for friends"
                className="pl-10 h-11"
                value={inviteToServerSearch}
                onChange={(e) => setInviteToServerSearch(e.target.value)}
              />
              {inviteToServerSearch.length > 0 && (
                <Button variant="secondary" className="absolute size-6 right-3 top-1/2 -translate-y-1/2 text-muted-foreground rounded-full" onClick={() => setInviteToServerSearch("")}>
                  <IconX size={16} />
                </Button>
              )}
            </div>
            <ScrollArea className="h-100 w-full">
              {filteredServerInvitationFriends.length > 0 ? filteredServerInvitationFriends.map((friend) => (
                <div key={friend._id} className="flex items-center justify-between w-full hover:bg-main rounded-md p-2">
                  <div className="w-full flex items-center gap-2">
                    <Avatar className="size-9" style={
                      friend.profilePicture === SHORT_LOGO_URL && friend.profilePictureBannerColor
                        ? { backgroundColor: friend.profilePictureBannerColor }
                        : undefined
                    }>
                      <AvatarImage src={friend.profilePicture} alt={friend.displayName} />
                      <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{friend.displayName}</span>
                      <span className="text-xs text-muted-foreground">{friend.username}</span>
                    </div>
                  </div>
                  <Button
                    disabled={invitingFriendId === friend._id}
                    variant="secondary"
                    onClick={() => handleSendServerInvitationLink(friend._id)}
                  >
                    {invitingFriendId === friend._id && isSendingServerInvitationLink ? <Spinner /> : "Send Link"}
                  </Button>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                  <p className="text-sm font-medium">No friends found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="border-t border-main flex-col! pt-4">
            <p className="font-semibold">Or, send a server invite link to a friend</p>
            <div className="relative w-full">
              <Input
                type="text"
                value={currentChannel?.serverInvitationLink?.link || ""}
                className={cn(
                  "h-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input transition-colors duration-300",
                  inviteLinkCopied && "border-[#43a25a] bg-success/10"
                )}
                readOnly
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(currentChannel?.serverInvitationLink?.link || "");
                  setInviteLinkCopied(true);
                  setTimeout(() => setInviteLinkCopied(false), 1500);
                }}
                variant="default"
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 transition-colors duration-300",
                  inviteLinkCopied && "bg-success"
                )}
              >
                {inviteLinkCopied ? "Copied" : "Copy"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openServerCreateChannelDialog} onOpenChange={(open) => {
        setOpenServerCreateChannelDialog(open)
        createChannelCategory.reset()
      }}>
        <DialogContent showCloseButton={true}>
          <DialogHeader className="space-y-1">
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription className="flex gap-1 items-center text-md">
              In {currentChannel?.groupOrServerName} Channels.
            </DialogDescription>
          </DialogHeader>
          <Form {...createChannelCategory}>
            <form id="create-channel-category-form" onSubmit={createChannelCategory.handleSubmit(onCreateChannelCategorySubmit)} className="space-y-4">
              <FormField
                control={createChannelCategory.control}
                name="channelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md">Channel Type</FormLabel>
                    <FormControl className="mt-2">
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        name={field.name}
                      >
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={ServerChannelType.Text} id="r1" />
                            <Label htmlFor="r1" className="text-md font-normal gap-1"><IconHash size={20} /> Text</Label>
                          </div>
                          <p className="pl-10 text-sm text-muted-foreground">Send Messages, images, GIFs, emoji, opinions, and puns</p>
                        </div>

                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={ServerChannelType.Voice} id="r2" />
                            <Label htmlFor="r2" className="text-md font-normal gap-1"><IconVolume size={20} /> Voice</Label>
                          </div>
                          <p className="pl-10 text-sm text-muted-foreground">Hang out together with voice, video, and screen share</p>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={createChannelCategory.control}
                name="channelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md">Channel Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        {createChannelCategory.watch("channelType") === "Text" && <IconHash size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />}
                        {createChannelCategory.watch("channelType") === "Voice" && <IconVolume size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />}
                        <Input {...field} className="pl-10 h-11" placeholder="new-channel" autoComplete="off" />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 ">
                          <ReactionPicker
                            isMessageInput={false}
                            isShortcut={false}
                            currentEmoji={currentEmoji}
                            setCurrentEmoji={setCurrentEmoji}
                            addEmojiToMessage={(emoji) => {
                              setSelectedEmoji(emoji);
                              field.onChange(`${field.value} ${emoji}`);
                            }}
                          />
                        </div>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className="justify-between!">
            <Button variant="secondary" size='xl' className="flex-1" onClick={() => {
              setOpenServerCreateChannelDialog(false)
              createChannelCategory.reset()
            }}>
              Cancel
            </Button>
            <Button disabled={isCreatingServerChannel || createChannelCategory.watch("channelName") === ""} type="submit" form="create-channel-category-form" size='xl' className="flex-1">
              {isCreatingServerChannel ? <><Spinner /> Creating Channel...</> : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}

// context menu for each channel

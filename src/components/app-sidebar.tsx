"use client";
import {
  IconBrandSafari,
  IconIdBadge,
  IconMailFilled,
  IconPhotoPlus,
  IconPlus,
  IconSearch,
  IconSelector,
  IconUserFilled,
  IconVolume,
  IconX,
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
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createServerSchema, CreateServerValues, invitationServerJoinSchema, InvitationServerJoinValues } from "~/lib/validation";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import useUpload from "~/hooks/use-upload";
import { ActiveUI, ConfigPrefix, FriendsSelectorView } from "~/interfaces/app.interface";
import { useCreateChannelMutation, useLeaveGroupChannelMutation } from "~/redux/apis/channel.api";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { toast } from "sonner";
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
import { setActiveUI, setCurrentChannelId } from "~/redux/slices/app/app-slice";
import { selectActiveUI, selectSidebarOpen } from "~/redux/slices/app/app-selector";
import { extractDirectChannelFromMembers, getInitialsFallback } from "~/lib/utils";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [openAddServerDialog, setOpenAddServerDialog] = useState<boolean>(false);
  const [isUploadingLoading, setIsUploadingLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(2);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeUI = useAppSelector(selectActiveUI);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const currentChannels = useAppSelector(selectCurrentUserChannels);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const [createChannel, { isLoading: isCreatingChannel }] = useCreateChannelMutation();
  const [searchUsers, { data: usersQuery }] = useSearchUsersMutation();
  const [leaveGroupChannel, { isLoading: isLeavingGroupChannelLoading }] = useLeaveGroupChannelMutation();
  const [leavingGroupChannelId, setLeavingGroupChannelId] = useState<string | null>(null);
  const { startUpload } = useUpload(ConfigPrefix.SINGLE_IMAGE_UPLOADER, setIsUploadingLoading);

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
  const onInvitationServerJoinSubmit = async (data: InvitationServerJoinValues) => {
    console.log(data);
  };

  const onCreateServerSubmit = async (data: CreateServerValues) => {
    try {
      if (data.serverImage) {
        startUpload([data.serverImage]).then(async (res) => {
          if (res && res[0]) {
            await createChannel({
              members: [currentUserInfo._id],
              groupOrServerLogo: res[0].ufsUrl,
              groupOrServerName: data.serverName,
              type: ChannelType.Server,
            })
              .unwrap()
              .then((res) => {
                router.push(`/servers/${res.data.route}`);
                setOpenAddServerDialog(false);
              });
          }
        });
      } else {
        await createChannel({
          members: [currentUserInfo._id],
          groupOrServerLogo: undefined,
          groupOrServerName: data.serverName,
          type: ChannelType.Server,
        })
          .unwrap()
          .then((res) => {
            router.push(`/servers/${res.data.route}`);
            setOpenAddServerDialog(false);
          });
      }
    } catch (error) {
      const errData = (error as FetchBaseQueryError).data as NestErrorResponse;
      toast.error("Oops, something went wrong!", {
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
    dispatch(setActiveUI(ActiveUI.FRIENDS_LIST));
  };
  return (
    <Sidebar collapsible="icon" className="overflow-hidden relative *:data-[sidebar=sidebar]:flex-row" {...props}>
      {/* first sidebar for servers and some buttons  */}
      <Sidebar
        collapsible="none"
        className={`max-h-[92vh] ${!sidebarOpen && "w-full justify-center items-center"}`}
        {...props}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 16)",
          } as React.CSSProperties
        }
      >
        <SidebarHeader className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleLogoPress()} isActive={true} size="lg" className="relative items-center rounded-sm!">
                <Image src="/vyral-short-logo.svg" alt="PÀO" fill className="object-cover pl-1 pb-0.5" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarSeparator className="mx-auto mt-1" />
        <SidebarContent className="flex-1 min-h-0 mt-4 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4">
              {currentChannels
                .filter((channel) => channel?.type === ChannelType.Server)
                .map((channel) => (
                  <SidebarMenuItem key={channel._id}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      tooltip={{
                        children: channel.groupOrServerName,
                        hidden: false,
                      }}
                      className="data-[slot=sidebar-menu-button]:p-0!"
                    >
                      <Link href={`/server/${channel._id}`} className="relative h-11 w-full">
                        <Image
                          src={channel.groupOrServerLogo || ""}
                          alt={channel.groupOrServerName || ""}
                          sizes="200px"
                          fill
                          className="object-cover rounded-sm"
                        />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </div>
          </ScrollArea>
        </SidebarContent>
        <SidebarSeparator className="mx-auto" />
        <SidebarFooter className="p-1 mt-1">
          <Dialog open={openAddServerDialog} onOpenChange={setOpenAddServerDialog}>
            <DialogTrigger asChild>
              <SidebarMenuButton
                isActive={true}
                tooltip={{
                  children: "Add Server",
                  hidden: false,
                }}
                size="lg"
                className="data-[slot=sidebar-menu-button]:p-1.5! justify-center"
              >
                <IconPlus stroke={2} className="size-5!" />
              </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-w-lg! gap-10">
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
                              <Input type="text" placeholder="https://PÀO.gg/AbCdEf" {...field} />
                            </FormControl>
                            <FormDescription>Invitations should look like https://PÀO.gg/AbCdEf</FormDescription>
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
                                By creating a server, you agree to PÀO's{" "}
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

          <SidebarMenuButton
            isActive={true}
            tooltip={{
              children: "Discover",
              hidden: false,
            }}
            className="data-[slot=sidebar-menu-button]:p-1.5! justify-center"
            size="lg"
          >
            <IconBrandSafari stroke={2} className="size-5!" />
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      {sidebarOpen && <SidebarSeparator orientation="vertical" />}
      {/* second sidebar for channels and some buttons  */}
      <Sidebar collapsible={sidebarOpen ? "none" : "offcanvas"} {...props}>
        <SidebarHeader>
          <SidebarMenu className="gap-2">
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
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="overflow-hidden">
          <SidebarSeparator />
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
                              <Avatar>
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
        </SidebarContent>
      </Sidebar>
      <UserNavigator />
    </Sidebar>
  );
}

// context menu for each channel

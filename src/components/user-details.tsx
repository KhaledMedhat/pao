import { FriendInterface, FriendInterfaceWithFriendIds, User } from "~/interfaces/user.interface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserChannels, selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { extractDirectChannelFromMembers, getInitialsFallback, getMutualFriends, getMutualServers, isTheUserFriend } from "~/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { IconAtOff, IconDots, IconIdBadge, IconMessageCircleFilled, IconUserCheck, IconUserEdit, IconUserPlus } from "@tabler/icons-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import { ChannelType } from "~/interfaces/channels.interface";
import { useRouter } from "next/navigation";
import { setActiveUI, setCurrentChannelId } from "~/redux/slices/app/app-slice";
import { ActiveUI } from "~/interfaces/app.interface";
import { toast } from "sonner";
import { NestErrorResponse } from "~/interfaces/error.interface";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useSendFriendRequestMutation } from "~/redux/apis/user.api";
import { useRemoveFriendMutation } from "~/redux/apis/auth.api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarImage } from "./ui/avatar";
import ReactionPicker from "./reaction-picker";
import { Input } from "./ui/input";
import { useState } from "react";
import { MessageType } from "~/interfaces/message.interface";
import { useSendMessageMutation } from "~/redux/apis/channel.api";
import { selectCurrentChannel } from "~/redux/slices/app/app-selector";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Card, CardContent } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Separator } from "./ui/separator";
import ObsessionBubble from "./obsession-bubble";

const UserDetails: React.FC<{ user: FriendInterface | User; size: "sm" | "md" | "lg"; setDialogOpen?: (open: boolean) => void }> = ({
  user,
  size,
  setDialogOpen,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUserInfo);
  const currentUserChannels = useAppSelector(selectCurrentUserChannels);
  const currentUserChannelServers = currentUserChannels.filter((c) => c.type === ChannelType.Server);
  const mutualFriends = getMutualFriends(currentUser, user as unknown as FriendInterfaceWithFriendIds);
  const mutualServers = getMutualServers(currentUserChannels, user);
  const currentChannel = useAppSelector(selectCurrentChannel);
  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [removeFriend] = useRemoveFriendMutation();
  const [currentEmoji, setCurrentEmoji] = useState<string>("😊")
  const [newMessage, setNewMessage] = useState<string>("")
  const [sendMessage] = useSendMessageMutation();
  const addEmojiToMessage = (emoji: string) => {
    // Check if emoji already exists in the message to prevent duplicates
    if (!newMessage.includes(emoji)) {
      setNewMessage(prevMessage => prevMessage + emoji);
    }
  };
  const onSendFriendRequestSubmit = async (username: string) => {
    try {
      await sendFriendRequest({ username, sender: currentUser }).unwrap();
      toast.success("Friend Request sent successfully");
    } catch (error) {
      const errData = (error as FetchBaseQueryError).data as NestErrorResponse;
      if (errData?.error === "Conflict" || errData?.error === "Not Found") {
        toast.error("Friend Request not sent", {
          description: <span className="text-muted-foreground">{errData.message}</span>,
        });
      } else {
        toast.error("Oops, something went wrong!", {
          description: <span className="text-muted-foreground">{errData?.message || "An unexpected error occurred"}</span>,
        });
      }
    }
  };

  const handleSendMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage({
        referenceId: currentChannel?._id ?? "",
        message: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: newMessage }]
            }
          ]
        },
        sentBy: currentUser._id,
        type: MessageType.TEXT,
      }).unwrap().then(() => {
        setNewMessage("")
      })
    }
  }

  const mountfullProfile = (currentUserId: string) => {
    return (
      <div className="flex items-start justify-between gap-10 h-full">
        <div className="flex flex-col w-full bg-main-primary rounded-t-lg h-full">
          <div className="relative w-full">
            <div className="h-40 w-full bg-cover-placeholder rounded-t-lg"></div>
            <div className="absolute -bottom-10 left-6">
              <Avatar className="size-28">
                <AvatarImage src={user.profilePicture} alt={user.displayName} />
                <AvatarFallback>{getInitialsFallback(user.displayName)}</AvatarFallback>
                <AvatarBadge className="size-7! ring-4 ring-main-primary" variant={user.status.type} />
              </Avatar>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-start gap-6 pl-8">
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl">{user.displayName}</p>
              <span className="flex items-center gap-2">
                <p className="text-muted-foreground">{user.username}</p>
                {user.pronouns && <> &#8226; <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-muted-foreground text-sm">{user.pronouns}</p>
                  </TooltipTrigger>
                  <TooltipContent>Pronouns</TooltipContent>
                </Tooltip>
                </>}

              </span>
            </div>
            {currentUserId === user._id ? <Button>
              Edit Profile
            </Button> : <div className="flex items-center gap-2">
              {isTheUserFriend(currentUser, user._id) ? (
                <Button
                  onClick={() => {
                    const directChannel = extractDirectChannelFromMembers(currentUser._id, currentUserChannels, user._id);
                    if (directChannel) {
                      dispatch(setCurrentChannelId(directChannel._id));
                      dispatch(setActiveUI(ActiveUI.DIRECT_MESSAGES));
                      setDialogOpen?.(false);
                      router.push(`/dm/${directChannel._id}`);
                    }
                  }}
                  variant="default"
                  size="sm"
                >
                  <IconMessageCircleFilled size={16} />
                  Message
                </Button>
              ) : (
                <Button onClick={async () => await onSendFriendRequestSubmit(user.username)} variant="default" size="sm">
                  <IconUserPlus size={16} /> Add Friend
                </Button>
              )}

              {isTheUserFriend(currentUser, user._id) ? (
                <TooltipProvider>
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon">
                            <IconUserCheck size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent side="right">
                        <DropdownMenuItem onClick={async () => await removeFriend({ friendId: user._id })}>Remove Friend</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>Friends</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                // TODO: make an api call to create a channel if there wasnt one to chat even if the user is not a friend
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="sm">
                      <IconMessageCircleFilled size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Message</TooltipContent>
                </Tooltip>
              )}
              <TooltipProvider>
                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon">
                          <IconDots size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <DropdownMenuContent side="right">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Invite to Server</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {currentUserChannelServers.length > 0 ? (
                              currentUserChannelServers.map((server) => (
                                <DropdownMenuItem key={server._id}>{server.groupOrServerName}</DropdownMenuItem>
                              ))
                            ) : (
                              <Empty className="w-full flex items-center justify-center">
                                <EmptyHeader>
                                  <EmptyMedia variant="default">
                                    <IconAtOff className="size-12 text-muted-foreground" />
                                  </EmptyMedia>
                                  <EmptyTitle>No Servers found</EmptyTitle>
                                  <EmptyDescription>You are not in any servers to invite this @{user?.displayName || ""} to.</EmptyDescription>
                                </EmptyHeader>
                              </Empty>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="justify-between" onClick={() => navigator.clipboard.writeText(user?.username || "")}>
                        Copy User ID <IconIdBadge />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TooltipContent>More</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>}
            {user.bio && <p className="max-w-3/4 text-sm">{user.bio}</p>}
            <div className="flex items-start flex-col">
              <p className="text-sm">Member Since</p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
        {currentUserId !== user._id && <div className="w-full h-full">
          <Tabs defaultValue="mutual-friends" className="h-full">
            <TabsList>
              <TabsTrigger value="mutual-friends">
                {mutualFriends.length > 0 ? `${mutualFriends.length} Mutual Friends` : "Mutual Friends"}
              </TabsTrigger>
              <TabsTrigger value="mutual-servers">
                {mutualServers.length > 0 ? `${mutualServers.length} Mutual Servers` : "Mutual Servers"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mutual-friends">
              {mutualFriends.length > 0 ? (
                mutualFriends.map((friend) => (
                  <div className="flex items-center gap-2" key={friend._id}>
                    <Avatar>
                      <AvatarImage src={friend.profilePicture} alt={friend.displayName} />
                      <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                      <AvatarBadge className="size-2.5!" variant={friend.status.type} />
                    </Avatar>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{friend.displayName}</p>
                    </div>
                  </div>
                ))
              ) : (
                <Empty className="w-full h-full flex items-center justify-center">
                  <EmptyHeader>
                    <EmptyMedia variant="default">
                      <IconUserPlus className="size-12 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No Mutual Friends</EmptyTitle>
                    <EmptyDescription>
                      There are no mutual friends between you and {user.displayName} yet. Start a conversation to find mutual friends.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
            <TabsContent value="mutual-servers">
              {mutualServers.length > 0 ? (
                mutualServers.map((server) => (
                  <div className="flex items-center gap-2" key={server._id}>
                    <Avatar>
                      <AvatarImage src={server.groupOrServerLogo || ""} />
                      <AvatarFallback>{getInitialsFallback(server.groupOrServerName || "")}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{server.groupOrServerName}</p>
                    </div>
                  </div>
                ))
              ) : (
                <Empty className="w-full h-full flex items-center justify-cente">
                  <EmptyHeader>
                    <EmptyMedia variant="default">
                      <IconAtOff className="size-12 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No Mutual Servers</EmptyTitle>
                    <EmptyDescription>There are no mutual servers between you and {user.displayName} yet.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
          </Tabs>
        </div>}
      </div>
    )
  }

  const mountUserDetails = () => {
    switch (size) {
      case "sm":
        return (
          <Dialog>
            <div className="w-full flex flex-col gap-4">
              <div className="relative w-full h-30 bg-cover-placeholder rounded-t-md">
                {isTheUserFriend(currentUser, user._id) &&
                  <div className="flex items-center gap-2 absolute top-2 right-2">
                    <TooltipProvider>
                      <Tooltip>
                        <DropdownMenu>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon">
                                <IconUserCheck size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <DropdownMenuContent side="right">
                            <DropdownMenuItem onClick={async () => await removeFriend({ friendId: user._id })}>Remove Friend</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <TooltipContent>Friends</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <DropdownMenu>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon">
                                <IconDots size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <DropdownMenuContent side="right">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Invite to Server</DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  {currentUserChannelServers.length > 0 ? (
                                    currentUserChannelServers.map((server) => (
                                      <DropdownMenuItem key={server._id}>{server.groupOrServerName}</DropdownMenuItem>
                                    ))
                                  ) : (
                                    <Empty className="w-full flex items-center justify-center">
                                      <EmptyHeader>
                                        <EmptyMedia variant="default">
                                          <IconAtOff className="size-12 text-muted-foreground" />
                                        </EmptyMedia>
                                        <EmptyTitle>No Servers found</EmptyTitle>
                                        <EmptyDescription>You are not in any servers to invite this @{user?.displayName || ""} to.</EmptyDescription>
                                      </EmptyHeader>
                                    </Empty>
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="justify-between" onClick={() => navigator.clipboard.writeText(user?.username || "")}>
                              Copy User ID <IconIdBadge />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <TooltipContent>More</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>}
                <div className="absolute -bottom-10 left-4">
                  <DialogTrigger asChild>
                    <Avatar className="size-20 cursor-pointer">
                      <AvatarImage
                        className="hover:grayscale transition-all duration-300"
                        src={user.profilePicture}
                        alt={user.displayName}
                      />
                      <AvatarFallback>{getInitialsFallback(user.displayName)}</AvatarFallback>
                      <AvatarBadge className="size-5!" variant={user.status.type} />
                    </Avatar>
                  </DialogTrigger>
                </div>
                {!isTheUserFriend(currentUser, user._id) && <ObsessionBubble haveObsession={!!user.obsession?.text?.trim() || !!user.obsession?.emoji} prompt={`What's on your mind, ${user.displayName}?`} currentUserInfo={currentUser} />}
              </div>
              <div className="px-4 pt-8 pb-4 flex flex-col items-start gap-2">
                <div className="flex flex-col items-start">
                  <DialogTrigger asChild>
                    <Button variant="link" className="font-semibold text-lg p-0 h-fit">
                      {user.displayName}
                    </Button>
                  </DialogTrigger>
                  <div className="flex items-center gap-2">
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-sm p-0 h-fit">
                        {user.username}
                      </Button>
                    </DialogTrigger>
                    {user.pronouns &&
                      <>
                        &#8226;
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm p-0 h-fit">{user.pronouns}</p>
                          </TooltipTrigger>
                          <TooltipContent>Pronouns</TooltipContent>
                        </Tooltip>
                      </>
                    }

                  </div>
                  {user.bio && <p className="text-sm">{user.bio}</p>}

                </div>
                {isTheUserFriend(currentUser, user._id) &&
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      {mutualFriends.length > 0 && <div className="flex items-center gap-1">
                        <AvatarGroup>
                          {mutualFriends.slice(0, 3).map((friend) => (
                            <Avatar key={friend._id} className="size-4">
                              <AvatarImage src={friend.profilePicture} />
                              <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </AvatarGroup>
                        {mutualFriends.length}
                        <p>Mutual Friends</p>
                      </div>}
                      {mutualServers.length > 0 && <div className="flex items-center gap-1">
                        <AvatarGroup>
                          {mutualServers.slice(0, 3).map((server) => (
                            <Avatar key={server._id} className="size-4">
                              <AvatarImage src={server.groupOrServerLogo || ""} />
                              <AvatarFallback>{getInitialsFallback(server.groupOrServerName || "")}</AvatarFallback>
                            </Avatar>
                          ))}
                        </AvatarGroup>
                        {mutualServers.length}
                        <p>Mutual Servers</p>
                      </div>}
                    </div>
                    <p className="text-muted-foreground text-sm">{user.bio}</p>
                  </div>
                }
                {isTheUserFriend(currentUser, user._id) ? <div className="relative w-full">
                  <Input
                    autoComplete="off"
                    type="text"
                    className="bg-muted h-11 border-main-foreground w-full"
                    placeholder={`Message @${user.displayName}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleSendMessage}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <ReactionPicker isShortcut={false} currentEmoji={currentEmoji} setCurrentEmoji={setCurrentEmoji} isMessageInput={false} addEmojiToMessage={addEmojiToMessage}
                    />
                  </div>
                </div> :
                  <Button variant="default" className="w-full h-11">
                    <Link href="#" className="flex items-center gap-2">
                      <IconUserEdit size={16} />
                      Edit Profile
                    </Link>
                  </Button>
                }
              </div>
            </div>
            <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
              <VisuallyHidden.Root>
                <DialogHeader>
                  <DialogTitle></DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
              </VisuallyHidden.Root>
              {mountfullProfile(currentUser._id)}
            </DialogContent>
          </Dialog>
        );
      case "md":
        return (
          <Dialog>
            <div className="w-full flex flex-col gap-4 justify-between h-full">
              <div className="flex flex-col gap-4">
                <div className="relative w-full h-40 bg-cover-placeholder rounded-t-md">
                  {isTheUserFriend(currentUser, user._id) &&
                    <div className="flex items-center gap-2 absolute top-2 right-2">
                      <TooltipProvider>
                        <Tooltip>
                          <DropdownMenu>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon">
                                  <IconUserCheck size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <DropdownMenuContent side="right">
                              <DropdownMenuItem onClick={async () => await removeFriend({ friendId: user._id })}>Remove Friend</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <TooltipContent>Friends</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <DropdownMenu>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon">
                                  <IconDots size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <DropdownMenuContent side="right">
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Invite to Server</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    {currentUserChannelServers.length > 0 ? (
                                      currentUserChannelServers.map((server) => (
                                        <DropdownMenuItem key={server._id}>{server.groupOrServerName}</DropdownMenuItem>
                                      ))
                                    ) : (
                                      <Empty className="w-full flex items-center justify-center">
                                        <EmptyHeader>
                                          <EmptyMedia variant="default">
                                            <IconAtOff className="size-12 text-muted-foreground" />
                                          </EmptyMedia>
                                          <EmptyTitle>No Servers found</EmptyTitle>
                                          <EmptyDescription>You are not in any servers to invite this @{user?.displayName || ""} to.</EmptyDescription>
                                        </EmptyHeader>
                                      </Empty>
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="justify-between" onClick={() => navigator.clipboard.writeText(user?.username || "")}>
                                Copy User ID <IconIdBadge />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <TooltipContent>More</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>}
                  <div className="absolute -bottom-10 left-4">
                    <DialogTrigger asChild>
                      <Avatar className="size-20 cursor-pointer">
                        <AvatarImage
                          className="hover:grayscale transition-all duration-300"
                          src={user.profilePicture}
                          alt={user.displayName}
                        />
                        <AvatarFallback>{getInitialsFallback(user.displayName)}</AvatarFallback>
                        <AvatarBadge className="size-5! ring-4 ring-main-primary" variant={user.status.type} />
                      </Avatar>
                    </DialogTrigger>
                  </div>
                </div>
                <div className="px-4 pt-8 pb-4 flex flex-col items-start gap-2">
                  <div className="flex flex-col items-start">
                    <DialogTrigger asChild>
                      <Button variant="link" className="font-semibold text-lg p-0 h-fit">
                        {user.displayName}
                      </Button>
                    </DialogTrigger>
                    <div className="flex items-center gap-2">
                      <DialogTrigger asChild>
                        <Button variant="link" className="text-sm p-0 h-fit">
                          {user.username}
                        </Button>
                      </DialogTrigger>
                      {user.pronouns &&
                        <>
                          &#8226;
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm p-0 h-fit">{user.pronouns}</p>
                            </TooltipTrigger>
                            <TooltipContent>Pronouns</TooltipContent>
                          </Tooltip>
                        </>
                      }
                    </div>
                  </div>
                  <Card className="w-full">
                    <CardContent className="text-muted-foreground space-y-2">
                      {user.bio && <div className="flex flex-col items-start gap-1">
                        <p className="text-xs font-bold">About Me</p>
                        <p className="text-xs">{user.bio}</p>
                      </div>
                      }
                      {user.createdAt && <div className="flex flex-col items-start gap-1">
                        <p className="text-xs font-bold">Member Since</p>
                        <p className="text-sm">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>}
                    </CardContent>
                  </Card>

                  {mutualFriends.length > 0 && mutualServers.length > 0 ?

                    <Card className="w-full">
                      <CardContent className="text-muted-foreground space-y-2">
                        <Dialog>
                          {mutualFriends.length > 0 &&
                            <Accordion type="single" collapsible >
                              <AccordionItem value="mutual-friends">
                                <AccordionTrigger>Mutual Friends &#8212; {mutualFriends.length}</AccordionTrigger>
                                {mutualFriends.map((friend) => (
                                  <AccordionContent key={friend._id} asChild>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" className="w-full justify-start h-11">
                                        <Avatar className="size-8">
                                          <AvatarImage src={friend.profilePicture} />
                                          <AvatarFallback>{getInitialsFallback(friend.displayName)}</AvatarFallback>
                                          <AvatarBadge className="size-2!" variant={friend.status.type} />
                                        </Avatar>
                                        {friend.displayName}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
                                      <VisuallyHidden.Root>
                                        <DialogHeader>
                                          <DialogTitle></DialogTitle>
                                          <DialogDescription></DialogDescription>
                                        </DialogHeader>
                                      </VisuallyHidden.Root>
                                      <UserDetails user={friend} size="lg" />
                                    </DialogContent>
                                  </AccordionContent>
                                ))}
                              </AccordionItem>
                            </Accordion>
                          }
                        </Dialog>
                        {mutualServers.length > 0 &&
                          <Accordion type="single" collapsible>
                            <AccordionItem value="mutual-servers">
                              <AccordionTrigger>Mutual Servers &#8212; {mutualServers.length}</AccordionTrigger>
                              {mutualServers.map((server) => (
                                <AccordionContent key={server._id}>
                                  <Link href={`/server/${server._id}`}>
                                    <Button variant="ghost" className="w-full justify-start h-11">
                                      <Avatar className="size-8">
                                        <AvatarImage src={server.groupOrServerLogo || ""} />
                                        <AvatarFallback>{getInitialsFallback(server.groupOrServerName || "")}</AvatarFallback>
                                      </Avatar>
                                      {server.groupOrServerName}
                                    </Button>
                                  </Link>
                                </AccordionContent>
                              ))}
                            </AccordionItem>
                          </Accordion>
                        }
                      </CardContent>
                    </Card>
                    : null
                  }
                </div>
              </div>
              <div className="px-4 py-4 flex flex-col items-center gap-4">
                <Separator className="w-full" />
                <DialogTrigger asChild>
                  <Button variant="link" className="w-full">
                    View Full Profile
                  </Button>
                </DialogTrigger>
              </div>
            </div>
            <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
              <VisuallyHidden.Root>
                <DialogHeader>
                  <DialogTitle></DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
              </VisuallyHidden.Root>
              {mountfullProfile(currentUser._id)}
            </DialogContent>
          </Dialog>
        );
      case "lg":
        return (
          mountfullProfile(currentUser._id)
        );
      default:
        return null;
    }
  };
  return mountUserDetails();
};

export default UserDetails;

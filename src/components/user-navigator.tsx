import { useAppSelector } from "~/redux/hooks";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { Button } from "./ui/button";
import { IconChevronDown, IconChevronRight, IconCopy, IconHeadphonesFilled, IconIdBadge, IconMicrophoneFilled, IconMinus, IconMoon, IconPencil, IconSettingsFilled } from "@tabler/icons-react";
import { ButtonGroup } from "./ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { generateRandomObsessionPrompt, getInitialsFallback } from "~/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import UserDetails from "./user-details";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useRef, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { StatusDuration, StatusType } from "~/interfaces/user.interface";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { DURATIONS, SHORT_LOGO_URL } from "~/constants/constants";
import ObsessionBubble from "./obsession-bubble";
import { useUpdateUserMutation } from "~/redux/apis/auth.api";
import { sileo } from "sileo";
import { selectSidebarOpen } from "~/redux/slices/app/app-selector";


const UserNavigator = () => {
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [prompt, setPrompt] = useState<string>("Any Thoughts ?!");
  const [updateUser] = useUpdateUserMutation();
  const usedIndexes = useRef<Set<number>>(new Set())
  const userStatusSwitcher = (status: StatusType) => {
    switch (status) {
      case StatusType.Online:
        return { icon: <span className="bg-[#43a25a] size-3.5 rounded-full"></span>, label: "Online" };
      case StatusType.Invisible:
        return { icon: <span className="bg-main border-4 border-muted-foreground/40 size-3.5 rounded-full"></span>, label: "Invisible" };
      case StatusType.DoNotDisturb:
        return {
          icon: <span className="bg-red-500 size-3.5 rounded-full">
            <IconMinus className="size-full p-0.5 text-background" strokeWidth={4} />
          </span>, label: "Do Not Disturb"
        };
      case StatusType.Idle:
        return { icon: <IconMoon className="size-3.5 text-yellow-500 fill-yellow-500" />, label: "Idle" };
      default:
        return { icon: <span className="bg-[#43a25a] size-3.5 rounded-full"></span>, label: "Online" };
    }
  }
  return (
    <Dialog>
      <div className={`absolute bottom-4 left-0 right-0 mx-2 flex items-center h-15.5 flex-col gap-2 rounded-md ${sidebarOpen ? "bg-main-primary" : "bg-transparent"}`}>
        {/* the call part here with the seprator  */}
        {/* <div>
        asdasd
      </div> */}
        <div className={`flex items-center h-full w-full px-1 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          <Popover onOpenChange={(open) => {
            const hasNoObsession = !currentUserInfo.obsession?.text?.trim();
            if (open && hasNoObsession) {
              generateRandomObsessionPrompt(setPrompt, usedIndexes);
            }
          }}>
            <PopoverTrigger asChild>
              {sidebarOpen ?
                <div className="flex items-center w-fit group gap-2">
                  <div className="flex items-center gap-2 cursor-pointer group hover:bg-muted-foreground/10 px-2 py-1 rounded-md">
                    <Avatar className="size-9" style={
                      currentUserInfo.profilePicture === SHORT_LOGO_URL && currentUserInfo.profilePictureBannerColor
                        ? { backgroundColor: currentUserInfo.profilePictureBannerColor }
                        : undefined
                    }>
                      <AvatarImage src={currentUserInfo.profilePicture} alt={currentUserInfo.displayName} />
                      <AvatarFallback>{getInitialsFallback(currentUserInfo.displayName)}</AvatarFallback>
                      <AvatarBadge className="size-2.5! ring-3 ring-main-primary" variant={currentUserInfo.status.type} />
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <p className="text-md truncate max-w-[100px] font-semibold">{currentUserInfo.displayName}</p>
                      <p className="text-sm text-muted-foreground">{currentUserInfo.username}</p>
                    </div>
                  </div>
                </div>
                :
                <Avatar className={`${sidebarOpen ? "size-9" : "size-12"}`} style={
                  currentUserInfo.profilePicture === SHORT_LOGO_URL && currentUserInfo.profilePictureBannerColor
                    ? { backgroundColor: currentUserInfo.profilePictureBannerColor }
                    : undefined
                }>
                  <AvatarImage src={currentUserInfo.profilePicture} alt={currentUserInfo.displayName} />
                  <AvatarFallback>{getInitialsFallback(currentUserInfo.displayName)}</AvatarFallback>
                  <AvatarBadge className="size-2.5! ring-3 ring-sidebar" variant={currentUserInfo.status.type} />
                </Avatar>}
            </PopoverTrigger>
            <PopoverContent
              className="p-0 group"
              onOpenAutoFocus={(e) => e.preventDefault()}
              sideOffset={10}
              style={
                {
                  width: "calc(var(--spacing) * 86)",
                  right: "20%",
                  transform: "translateX(2%)",
                } as React.CSSProperties
              }
            >
              <div className="relative w-full h-30 bg-cover-placeholder rounded-t-md">
                <div className="absolute -bottom-10 left-4">
                  <DialogTrigger asChild>
                    <Avatar className="size-20 cursor-pointer" style={
                      currentUserInfo.profilePicture === SHORT_LOGO_URL && currentUserInfo.profilePictureBannerColor
                        ? { backgroundColor: currentUserInfo.profilePictureBannerColor }
                        : undefined
                    }>
                      <AvatarImage
                        className="hover:grayscale transition-all duration-300"
                        src={currentUserInfo.profilePicture}
                        alt={currentUserInfo.displayName}
                      />
                      <AvatarFallback>{getInitialsFallback(currentUserInfo.displayName)}</AvatarFallback>
                      <AvatarBadge className="size-4.5! right-1 ring-4 ring-main-primary" variant={currentUserInfo.status.type} />
                    </Avatar>
                  </DialogTrigger>
                </div>
                <ObsessionBubble haveObsession={!!currentUserInfo.obsession?.text?.trim() || !!currentUserInfo.obsession?.emoji} prompt={prompt} currentUserInfo={currentUserInfo} />

              </div>
              <div className="px-4 pt-12 pb-4 flex flex-col items-start gap-2">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <DialogTrigger asChild>
                      <Button variant="link" className="font-semibold text-lg p-0 h-fit">
                        {currentUserInfo.displayName}
                      </Button>

                    </DialogTrigger>
                    <Tooltip open={isCopied ? true : undefined}>
                      <TooltipTrigger asChild>
                        <Button onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(currentUserInfo.username);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          } catch {
                            sileo.error({
                              title: "Failed to copy username",
                            });
                          }
                        }} size="icon-xs" variant="ghost" className="hover:bg-transparent hidden group-hover:block p-0">
                          <IconCopy size={16} color="var(--foreground)" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent isCopied={isCopied}>{isCopied ? "Copied!" : "Copy Username"}</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-sm p-0 h-fit font-normal">
                        {currentUserInfo.username}
                      </Button>
                    </DialogTrigger>
                    {currentUserInfo.pronouns &&
                      <>
                        &#8226;
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm">{currentUserInfo.pronouns}</p>
                          </TooltipTrigger>
                          <TooltipContent>Pronouns</TooltipContent>
                        </Tooltip>
                      </>
                    }
                  </div>
                </div>
                {currentUserInfo.bio && <p className="text-sm">{currentUserInfo.bio}</p>}

                <Card className="w-full p-2 mt-2">
                  <CardContent className="px-2 space-y-2">
                    <Button variant="ghost" className="w-full justify-start">
                      <IconPencil size={16} />
                      Edit Profile
                    </Button>
                    <Separator />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            {userStatusSwitcher(currentUserInfo.status.type).icon}
                            {userStatusSwitcher(currentUserInfo.status.type).label}
                          </div>
                          <IconChevronRight size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 px-2 py-2 space-y-2" side="right">
                        <DropdownMenuItem className="h-11" onClick={() => updateUser({ status: { type: StatusType.Online, duration: StatusDuration.Forever } })}>
                          <span className="bg-[#43a25a] size-2.5 rounded-full"></span>
                          Online
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="h-11" onClick={() => updateUser({ status: { type: StatusType.Idle, duration: StatusDuration.Forever } })}>
                            <IconMoon className="text-yellow-500 fill-yellow-500 size-3" /> Idle
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {DURATIONS.map((duration) => (
                              <DropdownMenuItem key={duration.value} onClick={() => updateUser({ status: { type: StatusType.Idle, duration: duration.value } })}>
                                {duration.text}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="h-11" onClick={() => updateUser({ status: { type: StatusType.DoNotDisturb, duration: StatusDuration.Forever } })}>
                            <span className="bg-red-500 size-3 rounded-full">
                              <IconMinus className="size-full p-0.5 text-background" strokeWidth={4} />
                            </span>
                            <span>
                              Do Not Disturb
                              <p className="text-xs text-muted-foreground">You will not receive notifications</p>
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {DURATIONS.map((duration) => (
                              <DropdownMenuItem key={duration.value} onClick={() => updateUser({ status: { type: StatusType.DoNotDisturb, duration: duration.value } })}>
                                {duration.text}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="h-11" onClick={() => updateUser({ status: { type: StatusType.Invisible, duration: StatusDuration.Forever } })}>
                            <span className="bg-main border-3 border-muted-foreground/40 size-3 rounded-full"></span>
                            <span>
                              Invisible
                              <p className="text-xs text-muted-foreground">You will appear offline</p>
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {DURATIONS.map((duration) => (
                              <DropdownMenuItem key={duration.value} onClick={() => updateUser({ status: { type: StatusType.Invisible, duration: duration.value } })}>
                                {duration.text}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>

                <Card className="w-full p-2 mt-2">
                  <CardContent className="px-2 space-y-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => {
                      navigator.clipboard.writeText(currentUserInfo._id);
                      sileo.success({
                        title: "User ID copied to clipboard",
                      });
                    }}>
                      <IconIdBadge size={16} />
                      Copy User ID
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </PopoverContent>
          </Popover>

          {sidebarOpen && <TooltipProvider>
            <div className="flex items-center gap-1">
              <ButtonGroup>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <IconMicrophoneFilled size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mute</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon-xs" variant="ghost">
                      <IconChevronDown size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>More</TooltipContent>
                </Tooltip>
              </ButtonGroup>
              <ButtonGroup>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <IconHeadphonesFilled size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Deafen</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon-xs" variant="ghost">
                      <IconChevronDown size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>More</TooltipContent>
                </Tooltip>
              </ButtonGroup>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <IconSettingsFilled size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>}
        </div>
      </div>
      <DialogContent className="max-w-5xl! pb-0 h-[50vh]! overflow-y-auto">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle></DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
        </VisuallyHidden.Root>
        <UserDetails user={currentUserInfo} size="lg" />
      </DialogContent>
    </Dialog >
  );
};

export default UserNavigator;

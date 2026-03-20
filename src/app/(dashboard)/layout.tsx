"use client";
import { AppSidebar } from "~/components/app-sidebar";
import { SocketProvider } from "~/hooks/use-socket";
import { ScrollProvider } from "~/contexts/scroll-context";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Spinner } from "~/components/ui/spinner";
import { useGetUserInfoQuery } from "~/redux/apis/auth.api";
import DashboardHeader from "~/components/dashboard-header/dashboard-header-index";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectAddedToChannel, selectCurrentChannel, selectIsGettingAddedToChannel, selectIsGettingRemovedFromChannel, selectRemovedFromChannel, selectSidebarOpen } from "~/redux/slices/app/app-selector";
import { ChannelType } from "~/interfaces/channels.interface";
import Image from "next/image";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { setActiveChannelRoom, setActiveUI, setAddedToChannel, setCurrentChannelId, setIsGettingAddedToChannel, setIsGettingRemovedFromChannel, setRemovedFromChannel } from "~/redux/slices/app/app-slice";
import { ActiveUI } from "~/interfaces/app.interface";
import { sileo } from "sileo";
export default function ChannelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoading } = useGetUserInfoQuery();
  const currentChannel = useAppSelector(selectCurrentChannel);
  const removedFromChannel = useAppSelector(selectRemovedFromChannel);
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const isGettingRemovedFromChannel = useAppSelector(selectIsGettingRemovedFromChannel);
  const isGettingAddedToChannel = useAppSelector(selectIsGettingAddedToChannel);
  const addedToChannel = useAppSelector(selectAddedToChannel);
  useEffect(() => {
    if (isGettingRemovedFromChannel && removedFromChannel) {
      const pathSegments = pathname.split("/").filter(Boolean);
      const currentPathChannelId =
        pathSegments[0] === "group" || pathSegments[0] === "server"
          ? (pathSegments[1] ?? null)
          : null;
      const isCurrentChannelRemoved = removedFromChannel._id === currentPathChannelId;
      if (isCurrentChannelRemoved) {
        dispatch(setCurrentChannelId(null));
        dispatch(setActiveChannelRoom(null));
        dispatch(setActiveUI(ActiveUI.FRIENDS_LIST));
        router.push(`/channels/${currentUserInfo.channelSlug}`);
      }

      sileo.info({
        title: "Sorry to see you go",
        description: `You have been removed from the channel ${removedFromChannel.groupOrServerName || ""}`,
      });
      dispatch(setIsGettingRemovedFromChannel(false));
      dispatch(setRemovedFromChannel(null));
    }
  }, [isGettingRemovedFromChannel]);
  useEffect(() => {
    if (isGettingAddedToChannel && addedToChannel) {
      sileo.info({
        title: "Welcome to the channel",
        description: `You have been added to the channel ${addedToChannel.groupOrServerName || ""}`,
      });
    }
    dispatch(setIsGettingAddedToChannel(false));
    dispatch(setAddedToChannel(null));
  }, [isGettingAddedToChannel]);
  if (isLoading) return <Spinner />;
  return (
    <SocketProvider>
      <ScrollProvider>
        <div className="w-full flex items-center justify-center bg-sidebar">
          {currentChannel?.type === ChannelType.Server && <div className="flex items-center gap-2 py-2">
            <Image src={currentChannel?.groupOrServerLogo || ""} alt={currentChannel?.groupOrServerName || ""} width={20} height={20} />
            <p className="text-sm font-medium">{currentChannel?.groupOrServerName}</p>
          </div>}
          {(currentChannel?.type !== ChannelType.Server || !currentChannel) && <div className="flex items-center"> <Image src="/vyral-short-logo.svg" alt="Direct Messages" width={30} height={30} /> <p className="text-sm font-medium">Direct Messages</p></div>}
        </div>
        <SidebarProvider
          className="h-screen"
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 70)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset className={`border-t border-r rounded-br-none! ${sidebarOpen ? "rounded-tl-none!" : "rounded-tl-md border-l"}`}>
            <DashboardHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </ScrollProvider>
    </SocketProvider>
  );
}

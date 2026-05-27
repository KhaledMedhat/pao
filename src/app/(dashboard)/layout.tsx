"use client";
import { AppSidebar } from "~/components/app-sidebar";
import { SocketProvider } from "~/hooks/use-socket";
import { ScrollProvider } from "~/contexts/scroll-context";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { SpiralLoader } from "~/components/spiral-loader";
import { useGetUserInfoQuery } from "~/redux/apis/auth.api";
import DashboardHeader from "~/components/dashboard-header/dashboard-header-index";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectAddedToChannel, selectCurrentChannel, selectIsGettingAddedToChannel, selectIsGettingRemovedFromChannel, selectRemovedFromChannel, selectSidebarOpen } from "~/redux/slices/app/app-selector";
import { ChannelType } from "~/interfaces/channels.interface";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { selectCurrentUserInfo, selectFriendRequests } from "~/redux/slices/user/user-selector";
import { setActiveChannelRoom, setActiveUI, setAddedToChannel, setCurrentChannelId, setIsGettingAddedToChannel, setIsGettingRemovedFromChannel, setRemovedFromChannel } from "~/redux/slices/app/app-slice";
import { ActiveUI } from "~/interfaces/app.interface";
import { sileo } from "sileo";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { getInitialsFallback } from "~/lib/utils";
import { useCall, CallProvider } from "~/hooks/use-call";
import IncomingCallModal from "~/components/incoming-call";
import ActiveCallScreen from "~/components/active-call-screen";

function CallOverlay() {
  const {
    incomingCall,
    isInCall,
    activeCallId,
    callType,
    localStream,
    callConsumers,
    currentActiveCalls,
    isMuted,
    isDeafened,
    isVideoEnabled,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    hangUp,
  } = useCall();

  const activeCallMembers = activeCallId
    ? currentActiveCalls[activeCallId]?.members ?? []
    : [];

  return (
    <>
      {incomingCall && !isInCall && <IncomingCallModal incomingCall={incomingCall} />}
      {/* {isInCall && callType && (
        <ActiveCallScreen
          callType={callType}
          members={activeCallMembers}
          localStream={localStream}
          callConsumers={callConsumers}
          isMuted={isMuted}
          isDeafened={isDeafened}
          isVideoEnabled={isVideoEnabled}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onToggleVideo={toggleVideo}
          onHangUp={hangUp}
        />
      )} */}
    </>
  );
}

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
  const [showLoader, setShowLoader] = useState(true);
  const handleLoaderExited = useCallback(() => setShowLoader(false), []);
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
  if (isLoading || showLoader) {
    return <SpiralLoader visible={isLoading} onExited={handleLoaderExited} />;
  }
  return (
    <SocketProvider>
      <CallProvider currentUser={currentUserInfo}>
        <CallOverlay />
        <ScrollProvider>
          <div className="w-full flex items-center justify-center bg-sidebar animate-in fade-in duration-500">
            {currentChannel?.type === ChannelType.Server && <div className="flex items-center gap-2 ">
              <Avatar>
                <AvatarImage src={currentChannel?.groupOrServerLogo || ""} alt={currentChannel?.groupOrServerName || ""} />
                <AvatarFallback>{getInitialsFallback(currentChannel?.groupOrServerName || "")}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium">{currentChannel?.groupOrServerName}</p>
            </div>}
            {(currentChannel?.type !== ChannelType.Server || !currentChannel) && <div className="flex items-center"> <Image src="/vyral-short-logo.svg" alt="Direct Messages" width={30} height={30} /> <p className="text-sm font-medium">Direct Messages</p></div>}
          </div>
          <SidebarProvider
            className="h-screen animate-in fade-in duration-500"
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
      </CallProvider>
    </SocketProvider>
  );
}

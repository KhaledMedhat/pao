"use client";
import { AppSidebar } from "~/components/app-sidebar";
import { SocketProvider } from "~/hooks/use-socket";
import { ScrollProvider } from "~/contexts/scroll-context";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Spinner } from "~/components/ui/spinner";
import { useGetUserInfoQuery } from "~/redux/apis/auth.api";
import DashboardHeader from "~/components/dashboard-header/dashboard-header-index";
import { useAppSelector } from "~/redux/hooks";
import { selectCurrentChannel, selectSidebarOpen } from "~/redux/slices/app/app-selector";
import { ChannelType } from "~/interfaces/channels.interface";
import Image from "next/image";
export default function ChannelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoading } = useGetUserInfoQuery();
  const currentChannel = useAppSelector(selectCurrentChannel);
  const sidebarOpen = useAppSelector(selectSidebarOpen);

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

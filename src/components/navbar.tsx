"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserInfo, selectUserLoggedInStatus } from "~/redux/slices/user/user-selector";
import { syncAuthState } from "~/lib/utils";
import { useEffect } from "react";
import Image from "next/image";
import { setActiveChannelRoom, setActiveUI, setCurrentChannelId, setDashboardFriendsHeaderActiveUI } from "~/redux/slices/app/app-slice";
import { ActiveUI, FriendsView } from "~/interfaces/app.interface";

export function Navbar() {
  const isLoggedIn = useAppSelector(selectUserLoggedInStatus);
  const dispatch = useAppDispatch();
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  useEffect(() => {
    syncAuthState();
  }, []);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/vyral-full-logo.svg" alt="Vyral" width={200} height={200} />
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/">Home</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/features">Features</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/about">About</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/contact">Contact</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-secondary hover:text-secondary-foreground data-[state=open]:bg-secondary">
                Resources
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[280px] gap-2 p-4">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/pricing"
                        className="flex select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground"
                      >
                        <div>
                          <div className="text-sm font-medium">Pricing</div>
                          <p className="text-sm text-muted-foreground">Plans for every team size</p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/help"
                        className="flex select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground"
                      >
                        <div>
                          <div className="text-sm font-medium">Help Center</div>
                          <p className="text-sm text-muted-foreground">Get support and FAQs</p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/blog"
                        className="flex select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground"
                      >
                        <div>
                          <div className="text-sm font-medium">Blog</div>
                          <p className="text-sm text-muted-foreground">Latest news and updates</p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/status"
                        className="flex select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground"
                      >
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <p className="text-sm text-muted-foreground">System status and uptime</p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/privacy"
                        className="flex select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground"
                      >
                        <div>
                          <div className="text-sm font-medium">Privacy Policy</div>
                          <p className="text-sm text-muted-foreground">How we protect your data</p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href={`/channels/${currentUserInfo.channelSlug}`}>
                <Button onClick={() => {
                  dispatch(setActiveUI(ActiveUI.FRIENDS_LIST))
                  dispatch(setDashboardFriendsHeaderActiveUI(FriendsView.ONLINE))
                  dispatch(setActiveChannelRoom(null))
                  dispatch(setCurrentChannelId(null))
                }} >Start Chatting</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

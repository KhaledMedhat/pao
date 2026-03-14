import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { Providers } from "~/redux/provider";
import { Toaster } from "sileo";
import { TooltipProvider } from "~/components/ui/tooltip";
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "VYRAL",
  description:
    "Vyral is a modern way to connect and chat with people. It is a platform that allows you to connect with people from all over the world and chat with them in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${lato.variable} antialiased`}>
        <Providers>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
        <Toaster position="bottom-right" options={{
          duration: 3000,
          fill: "#171717",
          roundness: 16,
          styles: {
            title: "text-foreground! normal-case",
            description: "text-foreground/75! normal-case",
            badge: "bg-foreground/10!",
            button: "bg-foreground/10! hover:bg-foreground/15!",
          },
        }} />
      </body>
    </html>
  );
}

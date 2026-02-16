import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AIWidget from "@/components/AIWidget";
import TerminalWidget from "@/components/terminal/TerminalWidget";
import SessionProvider from "@/components/providers/SessionProvider";
import Navbar from "@/components/Navbar";
import FloatingWidgetStack from "@/components/ui/FloatingWidgetStack";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexical Maxxing",
  description: "Offline-first vocabulary builder",
  icons: {
    icon: "/LM_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
                const root = document.documentElement;
                if (theme === 'dark') {
                  root.classList.add('dark');
                  root.classList.remove('light', 'solarized');
                } else if (theme === 'light') {
                  root.classList.add('light');
                  root.classList.remove('dark', 'solarized');
                } else if (theme === 'solarized') {
                  root.classList.add('solarized');
                  root.classList.remove('dark', 'light');
                } else {
                  root.classList.remove('dark', 'light', 'solarized');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <Navbar />
          {children}
          <FloatingWidgetStack>
            <AIWidget />
            <TerminalWidget />
          </FloatingWidgetStack>
        </SessionProvider>
      </body>
    </html>
  );
}

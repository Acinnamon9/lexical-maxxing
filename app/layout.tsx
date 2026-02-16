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
    shortcut: "/LM_logo.png",
    apple: "/LM_logo.png",
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
                const themes = ['dark', 'light', 'solarized', 'brutalist', 'neubrutalist'];
                
                if (themes.includes(theme)) {
                  root.classList.add(theme);
                  themes.forEach(t => {
                    if (t !== theme) root.classList.remove(t);
                  });
                } else {
                  themes.forEach(t => root.classList.remove(t));
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

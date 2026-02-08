"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useSync } from "@/hooks/useSync";
import AuthModal from "@/components/AuthModal";
import { motion } from "framer-motion";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { isSyncing, triggerSync } = useSync();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      },
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md"
      >
        <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
          {/* Logo / Branding */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-indigo-500/25 transition-all">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm leading-none group-hover:text-indigo-500 transition-colors">
                Lexical
              </span>
              <span className="font-bold tracking-tight text-sm leading-none text-muted-foreground group-hover:text-purple-500 transition-colors">
                Maxxing
              </span>
            </div>
          </Link>

          {/* Navigation Links & Actions */}
          <div className="flex items-center gap-6">
            <Link
              href="/settings"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Settings
            </Link>

            <Link
              href="/debug"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Debug
            </Link>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Sync / Auth Button */}
            {user ? (
              <button
                onClick={() => triggerSync()}
                disabled={isSyncing}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500/20"
              >
                {isSyncing ? (
                  <>
                    <span className="animate-spin">↻</span> Syncing...
                  </>
                ) : (
                  <>
                    <span>☁</span> Synced
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm font-bold bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-foreground/10"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={(u) => {
          setUser(u);
          triggerSync();
        }}
      />
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import TerminalOutput from "./TerminalOutput";
import TerminalInput from "./TerminalInput";
import { AnimatePresence, motion } from "framer-motion";

export default function TerminalWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { history, execute, cwd, path, loading } = useTerminal();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on history change or open
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  // Global toggle hotkey (Ctrl + Backtick)
  // Also support Command + K for command palette feel? No, Stick to terminal standard.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Backtick (`)
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 h-[40vh] bg-background/95 backdrop-blur-md border-t border-border shadow-2xl z-50 flex flex-col font-mono pointer-events-auto"
          >
            {/* Header / Drag handle */}
            <div className="flex justify-between items-center px-4 py-2 bg-muted/50 border-b border-border text-xs select-none">
              <span className="font-bold text-foreground/80">
                TERMINAL &mdash; lex-sh
              </span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground hidden sm:inline">
                  Ctrl + ` to toggle
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-red-500/20 hover:text-red-500 p-1 rounded transition-colors"
                  title="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Output Area */}
            <div
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent p-2"
              onClick={() =>
                document
                  .querySelector<HTMLInputElement>(".terminal-input")
                  ?.focus()
              }
            >
              <TerminalOutput entries={history} />
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <TerminalInput
              onExecute={execute}
              cwdPath={path}
              cwdId={cwd}
              disabled={loading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg border border-white/10 transition-all active:scale-95 flex items-center justify-center w-12 h-12"
        title="Toggle Terminal (Ctrl + `)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      </motion.button>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AppearanceSection() {
  const [theme, setTheme] = useState<"system" | "light" | "dark" | "solarized">(
    "system",
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as
      | "system"
      | "light"
      | "dark"
      | "solarized";

    // Defer state updates to avoid synchronous render cascade warning
    const timer = setTimeout(() => {
      if (savedTheme) {
        setTheme(savedTheme);
      }
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const updateTheme = (newTheme: "system" | "light" | "dark" | "solarized") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    const root = document.documentElement;

    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light", "solarized");
    } else if (newTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark", "solarized");
    } else if (newTheme === "solarized") {
      root.classList.add("solarized");
      root.classList.remove("dark", "light");
    } else {
      root.classList.remove("dark", "light", "solarized");
    }
  };

  return (
    <motion.section variants={item} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </h2>
      <div className="grid gap-2">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              System preference by default
            </p>
          </div>
          <div className="flex bg-background p-1 rounded-xl border border-border shadow-sm min-w-[200px] justify-end">
            {!mounted ? (
              <div className="h-6 w-full animate-pulse bg-muted rounded-lg" />
            ) : (
              <>
                <button
                  onClick={() => updateTheme("system")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === "system" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  System
                </button>
                <button
                  onClick={() => updateTheme("light")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === "light" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Light
                </button>
                <button
                  onClick={() => updateTheme("dark")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === "dark" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => updateTheme("solarized")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === "solarized" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Solarized
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

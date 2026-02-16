"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AppearanceSection() {
  const [theme, setTheme] = useState<
    "system" | "light" | "dark" | "solarized" | "brutalist" | "neubrutalist"
  >("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as any;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const themes = ["dark", "light", "solarized", "brutalist", "neubrutalist"];

    if (themes.includes(theme)) {
      root.classList.add(theme);
      themes.forEach((t) => {
        if (t !== theme) root.classList.remove(t);
      });
    } else {
      themes.forEach((t) => root.classList.remove(t));
    }

    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const updateTheme = (newTheme: any) => {
    setTheme(newTheme);
  };

  return (
    <motion.section variants={item} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </h2>
      <div className="grid gap-2">
        <div className="card flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
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
                <button
                  onClick={() => updateTheme("brutalist")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === "brutalist" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Brutalist
                </button>
                <button
                  onClick={() => updateTheme("neubrutalist")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === "neubrutalist" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Neubrutalist
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

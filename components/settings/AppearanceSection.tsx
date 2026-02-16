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
    const allThemes = [
      "light",
      "dark",
      "solarized",
      "brutalist",
      "brutalist-dark",
      "neubrutalist",
      "neubrutalist-dark",
    ];

    // Remove all theme classes first
    allThemes.forEach((t) => root.classList.remove(t));

    // Add selected theme
    if (theme !== "system") {
      root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const themes = [
    {
      id: "light",
      name: "Light",
      preview: "bg-white border-gray-200 text-gray-900",
    },
    {
      id: "dark",
      name: "Dark",
      preview: "bg-zinc-950 border-zinc-800 text-zinc-100",
    },
    {
      id: "solarized",
      name: "Solarized",
      preview: "bg-[#fdf6e3] border-[#d5cfba] text-[#586e75]",
    },
    {
      id: "brutalist",
      name: "Brutalist",
      preview: "bg-white border-black border-[3px] shadow-[4px_4px_0_#000000]",
    },
    {
      id: "brutalist-dark",
      name: "Brutalist Dark",
      preview:
        "bg-black border-white border-[3px] shadow-[4px_4px_0_#ffffff] text-white",
    },
    {
      id: "neubrutalist",
      name: "Neubrutalist",
      preview:
        "bg-[#fdf6e3] border-black border-[3px] shadow-[4px_4px_0_#000000] rounded-xl",
    },
    {
      id: "neubrutalist-dark",
      name: "Neubrutalist Dark",
      preview:
        "bg-[#0a0a0a] border-white border-[3px] shadow-[4px_4px_0_#ffffff] rounded-xl text-white",
    },
  ];

  return (
    <motion.section variants={item} className="space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {mounted &&
          themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`group relative flex flex-col items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                theme === t.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-transparent hover:bg-muted/50"
              }`}
            >
              <div
                className={`w-full aspect-video rounded-lg ${t.preview} relative overflow-hidden flex items-center justify-center`}
              >
                <div className="w-1/2 h-2 bg-current opacity-20 rounded-full" />
              </div>
              <span className="text-xs font-semibold">{t.name}</span>
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          ))}
      </div>
    </motion.section>
  );
}

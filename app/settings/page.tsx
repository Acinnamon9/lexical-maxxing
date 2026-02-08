"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import AppearanceSection from "@/components/settings/AppearanceSection";
import AIConfigSection from "@/components/settings/AIConfigSection";
import DataManagementSection from "@/components/settings/DataManagementSection";
import AboutSection from "@/components/settings/AboutSection";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto font-sans">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12"
      >
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground font-medium">
          Manage your application preferences
        </p>
      </motion.header>

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-12"
      >
        <AppearanceSection />
        <AIConfigSection />
        <DataManagementSection />
        <AboutSection />
      </motion.main>

      <footer className="mt-20 text-center">
        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
          Made with ❤️ for speed learners
        </p>
      </footer>
    </div>
  );
}

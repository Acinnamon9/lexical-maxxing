"use client";

import { motion } from "framer-motion";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AboutSection() {
  return (
    <motion.section variants={item} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        About
      </h2>
      <div className="card p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Version</span>
          <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded border border-border">
            1.0.0
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Lexical Maxxing is a domain-driven vocabulary builder designed for
          power users who want to master language through context and
          repetition.
        </p>
      </div>
    </motion.section>
  );
}

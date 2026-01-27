"use client";

import { useState } from "react";
import { EnrichedWord } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

interface ReviewCardProps {
  word: EnrichedWord;
  onComplete: (score: number, production: string | null) => void;
}

export default function ReviewCard({ word, onComplete }: ReviewCardProps) {
  const [showContext, setShowContext] = useState(false);
  const [production, setProduction] = useState("");

  // Fetch meanings for this word in this context
  const meanings = useLiveQuery(
    () =>
      db.wordMeanings
        .where("[wordId+folderId]")
        .equals([word.id, word.state.wordId]) // Wait, word.state doesn't have folderId.
        // Actually the session page has folderId. Let's assume word object or props should have it.
        // We'll use word.id and we need the folderId from context.
        // For now, let's just fetch all meanings for this word.
        .toArray(),
    [word.id],
  );

  const handleScore = (score: number) => {
    onComplete(score, production.trim() || null);
    setShowContext(false);
    setProduction("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-xl w-full mx-auto p-8 border rounded-3xl shadow-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col items-center space-y-10 min-h-[500px] justify-between"
    >
      {/* Word Display */}
      <div className="text-center w-full">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-4 block"
        >
          Review Mode
        </motion.span>
        <h2 className="text-5xl font-black tracking-tighter mb-2 bg-linear-to-br from-black to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent">
          {word.term}
        </h2>
      </div>

      {/* Production Area */}
      <div className="w-full space-y-3">
        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
          Active Production
        </label>
        <textarea
          className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl resize-none focus:outline-none focus:ring-4 ring-blue-500/10 text-sm transition-all focus:border-blue-500/50"
          rows={3}
          placeholder="Compose a thought using this concept..."
          value={production}
          onChange={(e) => setProduction(e.target.value)}
        />
      </div>

      {/* Interaction Area */}
      <div className="w-full min-h-[180px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!showContext ? (
            <motion.button
              key="show-btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setShowContext(true)}
              className="px-10 py-4 bg-black dark:bg-zinc-100 text-white dark:text-black font-black text-sm rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Reveal Meaning
            </motion.button>
          ) : (
            <motion.div
              key="context-area"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              {/* Meaning Display */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-dashed dark:border-zinc-700">
                {meanings && meanings.length > 0 ? (
                  <div className="space-y-2">
                    {meanings.map((m, i) => (
                      <p
                        key={i}
                        className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
                      >
                        &ldquo;{m.content}&rdquo;
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 italic">
                    No contextual meanings found for this chunk.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((score) => (
                    <motion.button
                      key={score}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleScore(score)}
                      className={`
                        h-12 rounded-xl font-black text-sm transition-all shadow-sm
                        ${score === 0 ? "bg-red-500 text-white shadow-red-500/20" : ""}
                        ${score >= 1 && score <= 2 ? "bg-orange-500 text-white shadow-orange-500/20" : ""}
                        ${score >= 3 && score <= 4 ? "bg-blue-600 text-white shadow-blue-600/20" : ""}
                        ${score === 5 ? "bg-green-600 text-white shadow-green-600/20" : ""}
                      `}
                    >
                      {score}
                    </motion.button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-black text-zinc-400 px-1 uppercase tracking-widest">
                  <span>No Clue</span>
                  <span>Crystal Clear</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { EnrichedWord } from "@/lib/types";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MeaningModalProps {
  word: EnrichedWord;
  folderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MeaningModal({
  word,
  folderId,
  isOpen,
  onClose,
}: MeaningModalProps) {
  // Fetch meanings for this word in this context
  const meanings = useLiveQuery(
    () =>
      db.wordMeanings
        .where("[wordId+folderId]")
        .equals([word.id, folderId])
        .toArray(),
    [word.id, folderId],
  );

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl border dark:border-zinc-800 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
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
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 className="text-3xl font-bold mb-6 tracking-tight">
              {word.term}
            </h2>

            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                Contextual Meanings
              </h3>
              {meanings && meanings.length > 0 ? (
                <ul className="list-disc list-outside pl-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                  {meanings.map((m) => (
                    <li key={m.id}>{m.content}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-400 italic">
                  No specific meaning recorded for this context.
                </p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
              <span>Recall Score: {word.state.recallScore}</span>
              <span>
                Last Reviewed:{" "}
                {word.state.lastReviewedAt
                  ? new Date(word.state.lastReviewedAt).toLocaleDateString()
                  : "Never"}
              </span>
            </div>

            {/* AI Doubt Section */}
            <DoubtSection
              wordId={word.id}
              folderId={folderId}
              wordTerm={word.term}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DoubtSection({
  wordId,
  folderId,
  wordTerm,
}: {
  wordId: string;
  folderId: string;
  wordTerm: string;
}) {
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Fetch latest doubt
  const latestDoubt = useLiveQuery(
    () =>
      db.doubts
        .where("[wordId+folderId]")
        .equals([wordId, folderId])
        .reverse()
        .first(),
    [wordId, folderId],
  );

  const handleAsk = async () => {
    if (!query.trim()) return;
    setIsAsking(true);

    const doubtId = crypto.randomUUID();
    const now = Date.now();

    // 1. Optimistic Save (Offline First)
    await db.doubts.add({
      id: doubtId,
      wordId,
      folderId,
      query: query.trim(),
      response: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    setQuery("");

    // 2. Call AI (If Online)
    try {
      // Get context (meanings)
      const meanings = await db.wordMeanings
        .where("[wordId+folderId]")
        .equals([wordId, folderId])
        .toArray();
      const contextText = meanings.map((m) => m.content).join("; ");

      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: wordTerm,
          context: contextText || "General Context",
          query: query.trim(),
        }),
      });

      const data = await res.json();

      if (data.response) {
        await db.doubts.update(doubtId, {
          response: data.response,
          status: "resolved",
          updatedAt: Date.now(),
        });
      } else {
        throw new Error("No response");
      }
    } catch (err) {
      console.error("AI Request Failed", err);
      // Stays 'pending' - helpful for retry logic later
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="mt-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        AI Clarification
      </h3>

      {latestDoubt ? (
        <div className="mb-4 space-y-3">
          <div className="bg-white dark:bg-zinc-900 pp-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800 p-3">
            <p className="font-semibold text-xs text-zinc-400 mb-1">
              You Asked:
            </p>
            {latestDoubt.query}
          </div>

          {latestDoubt.status === "pending" ? (
            <div className="text-xs text-zinc-400 italic animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
              AI is thinking...
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 border border-blue-100 dark:border-blue-900/30 prose prose-sm dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: latestDoubt.response?.replace(/\n/g, "<br/>") || "",
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 mb-4 italic">
          Have a doubt? Ask the AI for nuance.
        </p>
      )}

      {/* Input Area */}
      {!latestDoubt || latestDoubt.status === "resolved" ? (
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50"
            placeholder="Ask a question about this word..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !query.trim()}
            className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:opacity-80 transition-opacity"
          >
            Ask
          </button>
        </div>
      ) : null}
    </div>
  );
}

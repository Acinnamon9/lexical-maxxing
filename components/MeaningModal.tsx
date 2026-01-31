"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { EnrichedWord } from "@/lib/types";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoubtSection } from "./word/DoubtSection";
import { MeaningList } from "./word/MeaningList";

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

  const handleToggleMastery = async () => {
    const isMastered = word.state.recallScore >= 5;
    await db.wordStates.update(word.id, {
      recallScore: isMastered ? 0 : 5,
      lastReviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    onClose();
  };

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
            className="bg-background rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
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
              <MeaningList
                word={word}
                folderId={folderId}
                meanings={meanings}
              />
            </div>

            <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex flex-col gap-1">
                <span>Recall Score: {word.state.recallScore}</span>
                <span>
                  Last Reviewed:{" "}
                  {word.state.lastReviewedAt
                    ? new Date(word.state.lastReviewedAt).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
              <button
                onClick={handleToggleMastery}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group/master ${
                  word.state.recallScore >= 5
                    ? "bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20"
                    : "bg-foreground text-background hover:opacity-90 active:scale-95 shadow-lg shadow-foreground/10"
                }`}
              >
                {word.state.recallScore >= 5 ? (
                  <>
                    <span className="group-hover/master:hidden flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Mastered
                    </span>
                    <span className="hidden group-hover/master:flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      Unmaster
                    </span>
                  </>
                ) : (
                  "Mark as Mastered"
                )}
              </button>
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

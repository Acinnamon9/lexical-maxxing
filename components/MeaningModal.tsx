"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { EnrichedWord } from "@/lib/types";
import { useState, useEffect } from "react";
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
  const [showOklch, setShowOklch] = useState(false);
  const [oklch, setOklch] = useState({ l: 70, c: 0.1, h: 200 });

  // Initialize OKLCH from word color if possible
  useEffect(() => {
    if (word.color?.startsWith("oklch")) {
      const match = word.color.match(/oklch\((\d+)%\s+([\d.]+)\s+(\d+)\)/);
      if (match) {
        setOklch({
          l: parseInt(match[1]),
          c: parseFloat(match[2]),
          h: parseInt(match[3]),
        });
        setShowOklch(true);
      }
    }
  }, [word.color]);

  const updateOklch = (key: keyof typeof oklch, val: number) => {
    const newOklch = { ...oklch, [key]: val };
    setOklch(newOklch);
    handleUpdateColor(`oklch(${newOklch.l}% ${newOklch.c} ${newOklch.h})`);
  };
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

  const handleUpdateColor = async (newColor: string) => {
    await db.words.update(word.id, {
      color: newColor,
    });
  };

  const PRESET_COLORS = [
    { name: "Cyber Yellow", value: "#ffeb3b" },
    { name: "Cyan", value: "#00e5ff" },
    { name: "Hot Pink", value: "#f50057" },
    { name: "Electric Blue", value: "#2962ff" },
    { name: "Lime", value: "#aeea00" },
    { name: "Bright Orange", value: "#ffab00" },
    { name: "Vivid Purple", value: "#d500f9" },
    { name: "Teal", value: "#1de9b6" },
    { name: "Crimson", value: "#ff1744" },
    { name: "Spring Green", value: "#00e676" },
    { name: "Lavender", value: "#b388ff" },
    { name: "Salmon", value: "#ff8a80" },
    { name: "Indigo", value: "#3f51b5" },
    { name: "Amber", value: "#ffc107" },
    { name: "Deep Orange", value: "#ff5722" },
    { name: "Light Green", value: "#8bc34a" },
    { name: "Cyan Accent", value: "#00b8d4" },
    { name: "Pink Accent", value: "#ff4081" },
  ];

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

            <div className="flex justify-between items-start mb-6">
              <h2
                className="text-3xl font-bold tracking-tight"
                style={word.color ? { color: word.color } : {}}
              >
                {word.term}
              </h2>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col gap-3 bg-muted/20 p-3 rounded-xl border border-border max-w-[240px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      {showOklch ? "Precision OKLCH" : "Presets"}
                    </span>
                    <button
                      onClick={() => setShowOklch(!showOklch)}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-tighter"
                    >
                      {showOklch ? "Show Presets" : "Custom OKLCH"}
                    </button>
                  </div>

                  {!showOklch ? (
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => handleUpdateColor(c.value)}
                          className={`w-6 h-6 rounded-lg transition-all shrink-0 ${word.color === c.value ? "ring-2 ring-foreground scale-90" : "hover:scale-110"}`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                      <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-border group shrink-0">
                        <input
                          type="color"
                          value={word.color || "#000000"}
                          onChange={(e) => handleUpdateColor(e.target.value)}
                          className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span>Lightness</span>
                          <span>{oklch.l}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={oklch.l}
                          onChange={(e) =>
                            updateOklch("l", parseInt(e.target.value))
                          }
                          className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span>Chroma</span>
                          <span>{oklch.c}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.4"
                          step="0.01"
                          value={oklch.c}
                          onChange={(e) =>
                            updateOklch("c", parseFloat(e.target.value))
                          }
                          className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span>Hue</span>
                          <span>{oklch.h}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={oklch.h}
                          onChange={(e) =>
                            updateOklch("h", parseInt(e.target.value))
                          }
                          className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {word.color && (
                  <button
                    onClick={() => handleUpdateColor("")}
                    className="text-[10px] uppercase font-bold text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Reset Color
                  </button>
                )}
              </div>
            </div>

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

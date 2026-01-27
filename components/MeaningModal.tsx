"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { EnrichedWord } from "@/lib/types";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useSync } from "@/hooks/useSync";

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
              <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Contextual Meanings
              </h3>
              {meanings && meanings.length > 0 ? (
                <ul className="list-disc list-outside pl-4 space-y-2 text-foreground/80">
                  {meanings.map((m) => (
                    <li key={m.id}>{m.content}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">
                  No specific meaning recorded for this context.
                </p>
              )}
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

function DoubtSection({
  wordId,
  folderId,
  wordTerm,
}: {
  wordId: string;
  folderId: string;
  wordTerm: string;
}) {
  const { config } = useAIConfig();
  const { triggerSync } = useSync();
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [model, setModel] = useState("gemini-1.5-flash");

  useEffect(() => {
    if (config.geminiModel) setModel(config.geminiModel);
  }, [config.geminiModel]);

  // Fetch all doubts
  const doubts = useLiveQuery(
    () =>
      db.doubts
        .where("[wordId+folderId]")
        .equals([wordId, folderId])
        .sortBy("createdAt")
        .then((results) => results.reverse()), // Most recent at top
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

    triggerSync(); // Sync optimistic save

    setQuery("");

    // 2. Call AI (If Online)
    try {
      // ... (keep existing logic) ...
      const meanings = await db.wordMeanings
        .where("[wordId+folderId]")
        .equals([wordId, folderId])
        .toArray();
      const contextText = meanings.map((m) => m.content).join("; ");

      const {
        geminiKey: apiKey,
        geminiModel: configModel,
        geminiPrePrompt: prePrompt,
      } = config;

      const activeModel = model || configModel || "gemini-1.5-flash";
      const activePrePrompt = prePrompt;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          word: wordTerm,
          context: contextText || "General Context",
          query: query.trim(),
          apiKey: apiKey || undefined,
          model: activeModel,
          prePrompt: activePrePrompt || undefined,
        }),
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.ok && data.response) {
        await db.doubts.update(doubtId, {
          response: data.response,
          status: "resolved",
          updatedAt: Date.now(),
        });
      } else {
        const errorMsg = data.error || data.response || "No response from AI";
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("AI Request Failed", err);
      // Update the doubt with the error message so the user knows what happened
      await db.doubts.update(doubtId, {
        response: `Error: ${err.message || "Failed to connect to AI"}`,
        status: "resolved", // Marking as resolved so it stops loading, but with error text
        updatedAt: Date.now(),
      });
    } finally {
      setIsAsking(false);
      triggerSync(); // Sync final response
    }
  };

  const handleDeleteDoubt = async (id: string) => {
    await db.doubts.delete(id);
    triggerSync();
  };

  const handleClearAll = async () => {
    if (!doubts) return;
    await Promise.all(doubts.map((d) => db.doubts.delete(d.id)));
    triggerSync();
  };

  return (
    <div className="mt-8 bg-muted/30 rounded-xl p-4 border border-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
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
        {doubts && doubts.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Clear All
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6 mb-6 no-scrollbar">
        {doubts && doubts.length > 0 ? (
          doubts.map((doubt) => (
            <div key={doubt.id} className="space-y-3 relative group">
              <button
                onClick={() => handleDeleteDoubt(doubt.id)}
                className="absolute -right-2 -top-2 p-1 bg-background border border-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shadow-sm z-10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
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

              <div className="bg-background p-3 rounded-lg text-sm text-foreground/80 border border-border">
                <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  You Asked:
                </p>
                {doubt.query}
              </div>

              {doubt.status === "pending" ? (
                <div className="text-xs text-muted-foreground italic animate-pulse flex items-center gap-2 pl-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                  AI is thinking...
                </div>
              ) : (
                <div className="bg-blue-500/5 p-3 rounded-lg text-sm text-foreground/90 border border-blue-500/10 prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="mb-1">{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-2">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-2">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-bold mb-1">{children}</h3>
                      ),
                      code: ({ children }) => (
                        <code className="bg-blue-500/20 px-1 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {doubt.response || ""}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Have a doubt? Ask the AI for nuance.
          </p>
        )}
      </div>

      {/* Input Area - Always visible for follow up */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50"
            placeholder="Ask a clarifying question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !query.trim()}
            className="bg-foreground text-background px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {isAsking ? "Asking..." : "Ask"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Model:
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-[10px] bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 ring-blue-500/30 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <optgroup label="Gemini 3">
              <option value="gemini-3-pro-preview">3 Pro</option>
              <option value="gemini-3-flash-preview">3 Flash</option>
            </optgroup>
            <optgroup label="Gemini 2.5">
              <option value="gemini-2.5-pro">2.5 Pro</option>
              <option value="gemini-2.5-flash">2.5 Flash</option>
              <option value="gemini-2.5-flash-lite">2.5 Lite</option>
            </optgroup>
            <optgroup label="Standard">
              <option value="gemini-1.5-flash">1.5 Flash</option>
              <option value="gemini-1.5-pro">1.5 Pro</option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
}

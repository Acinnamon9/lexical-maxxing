"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useSync } from "@/hooks/useSync";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DoubtSectionProps {
  wordId: string;
  folderId: string;
  wordTerm: string;
}

export function DoubtSection({
  wordId,
  folderId,
  wordTerm,
}: DoubtSectionProps) {
  const { config, availableLmModels } = useAIConfig();
  const { triggerSync } = useSync();
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [isManualModel, setIsManualModel] = useState(false);

  useEffect(() => {
    if (config.provider === "gemini" && config.geminiModel) {
      setModel(config.geminiModel);
    } else if (config.provider === "lmstudio" && config.lmStudioModel) {
      setModel(config.lmStudioModel);
    }
  }, [config.geminiModel, config.lmStudioModel, config.provider]);

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
      response: "",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    triggerSync(); // Sync optimistic save
    setQuery("");

    try {
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

      const activeModel = model || configModel || "gemini-2.5-flash"; // Use local selection, fallback to global setting, then default

      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: wordTerm,
          context: contextText || "General Context",
          query: query.trim(),
          apiKey: apiKey || undefined,
          model: activeModel,
          prePrompt: prePrompt || undefined,
          provider: config.provider,
          lmStudioBaseUrl: config.lmStudioBaseUrl,
          lmStudioModel: config.lmStudioModel,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch AI response");
      }

      // Streaming logic
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = "";

      // Update status to resolved immediately so we can see the text building up
      await db.doubts.update(doubtId, {
        status: "resolved",
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedResponse += chunk;

        // Update DB with partial response (throttling could be added here for performance if needed)
        await db.doubts.update(doubtId, {
          response: streamedResponse,
        });
      }

      // Final update
      await db.doubts.update(doubtId, {
        response: streamedResponse,
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      console.error("AI Request Failed", err);
      await db.doubts.update(doubtId, {
        response: `Error: ${err.message || "Failed to connect to AI"}`,
        status: "resolved",
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Model:
            </span>
            <select
              value={isManualModel ? "manual" : model}
              onChange={(e) => {
                if (e.target.value === "manual") {
                  setIsManualModel(true);
                } else {
                  setIsManualModel(false);
                  setModel(e.target.value);
                }
              }}
              className="text-[10px] bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 ring-blue-500/30 cursor-pointer text-muted-foreground hover:text-foreground transition-colors max-w-[150px] truncate"
            >
              {config.provider === "gemini" ? (
                <>
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
                </>
              ) : (
                <>
                  <optgroup label="Discovered Models">
                    {availableLmModels.map((m: string) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {config.lmStudioModel &&
                      !availableLmModels.includes(config.lmStudioModel) && (
                        <option value={config.lmStudioModel}>
                          {config.lmStudioModel} (Configured)
                        </option>
                      )}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="manual">-- Enter Manually --</option>
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {isManualModel && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Enter model identifier..."
                className="w-full text-[10px] bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 ring-blue-500/30 font-mono"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

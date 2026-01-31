"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { EnrichedWord, WordMeaning } from "@/lib/types";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useSync } from "@/hooks/useSync";

interface MeaningListProps {
  word: EnrichedWord;
  folderId: string;
  meanings: WordMeaning[] | undefined;
}

export function MeaningList({ word, folderId, meanings }: MeaningListProps) {
  const { config } = useAIConfig();
  const { triggerSync } = useSync();
  const [isFetchingMeaning, setIsFetchingMeaning] = useState(false);

  const handleFetchMeaning = async () => {
    setIsFetchingMeaning(true);
    try {
      const res = await fetch("/api/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.term,
          context:
            meanings && meanings.length > 0 ? meanings[0].content : undefined,
          apiKey: config.geminiKey || undefined,
          model: config.geminiModel || undefined,
          provider: config.provider,
          lmStudioBaseUrl: config.lmStudioBaseUrl,
          lmStudioModel: config.lmStudioModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.definition) {
        await db.wordMeanings.add({
          id: crypto.randomUUID(),
          wordId: word.id,
          folderId,
          content: data.definition,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        triggerSync();
      } else {
        throw new Error(data.error || "Failed to fetch meaning");
      }
    } catch (err: any) {
      console.error("Failed to fetch AI meaning:", err);
      alert(err.message || "Failed to fetch AI meaning");
    } finally {
      setIsFetchingMeaning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
          Contextual Meanings
        </h3>
        <button
          onClick={handleFetchMeaning}
          disabled={isFetchingMeaning}
          className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {isFetchingMeaning ? (
            <>
              <div className="w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <span className="text-[12px]">✨</span>
              Fetch from AI
            </>
          )}
        </button>
      </div>
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
  );
}

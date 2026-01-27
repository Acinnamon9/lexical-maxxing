"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createSession } from "@/lib/session";
import { EnrichedWord } from "@/lib/types";
import ReviewCard from "@/components/session/ReviewCard";
import { db } from "@/lib/db";

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const folderId = params.folderId as string;
  const chunkParam = searchParams.get("chunk");
  const chunkIndex = chunkParam ? parseInt(chunkParam, 10) : undefined;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<EnrichedWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    async function init() {
      const sessionWords = await createSession(folderId, chunkIndex);
      setWords(sessionWords);
      setLoading(false);
    }
    init();
  }, [folderId, chunkIndex]);

  const handleCardComplete = (
    score: number,
    productionContent: string | null,
  ) => {
    const currentWord = words[currentIndex];

    console.log(`Word ${currentWord.term} scored: ${score}`);

    // Update Score locally (optimistic)
    // Actual DB update logic for scores should go here (lib/scoring.ts later)

    if (productionContent) {
      db.productions.add({
        id: crypto.randomUUID(),
        wordId: currentWord.id,
        folderId: folderId,
        content: productionContent,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        needsSync: true,
      });
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Session...</div>;

  if (words.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl">No words found in this chunk!</h2>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-500 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-4">Session Complete!</h1>
        <p className="mb-8 text-zinc-500">You reviewed {words.length} words.</p>
        <button
          onClick={() => router.push(`/folder/${folderId}`)}
          className="px-6 py-2 bg-black text-white rounded-full"
        >
          Return to Folder
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 flex flex-col">
      <header className="p-4 flex justify-between items-center text-sm text-zinc-400">
        <span>
          Session: {folderId}{" "}
          {chunkIndex !== undefined ? `(Chunk ${chunkIndex + 1})` : ""}
        </span>
        <span>
          {currentIndex + 1} / {words.length}
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <ReviewCard
          key={words[currentIndex].id}
          word={words[currentIndex]}
          onComplete={handleCardComplete}
        />
      </main>
    </div>
  );
}

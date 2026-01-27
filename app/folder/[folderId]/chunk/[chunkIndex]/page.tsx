"use client";

import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState } from "react";
import Link from "next/link";
import { EnrichedWord } from "@/lib/types";
import MeaningModal from "@/components/MeaningModal";
import { motion } from "framer-motion";

const CHUNK_SIZE = 15;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

export default function ChunkPage() {
  const { folderId, chunkIndex } = useParams() as {
    folderId: string;
    chunkIndex: string;
  };
  const index = parseInt(chunkIndex, 10);

  const getFolder = useLiveQuery(() => db.folders.get(folderId), [folderId]);

  const chunkWords = useLiveQuery(async () => {
    const wordFolders = await db.wordFolders
      .where("folderId")
      .equals(folderId)
      .toArray();
    wordFolders.sort((a, b) => a.wordId.localeCompare(b.wordId));

    const start = index * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const slice = wordFolders.slice(start, end);

    const wordIds = slice.map((wf) => wf.wordId);
    const words = await db.words.bulkGet(wordIds);
    const states = await db.wordStates.bulkGet(wordIds);

    return words
      .map((w, i) => ({
        ...w!,
        state: states[i]!,
      }))
      .filter((w) => !!w);
  }, [folderId, index]);

  const [selectedWord, setSelectedWord] = useState<EnrichedWord | null>(null);

  if (!getFolder || !chunkWords)
    return <div className="p-8">Loading Chunk...</div>;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto font-sans bg-background">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Link
            href={`/folder/${folderId}`}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 block transition-colors"
          >
            &larr; Back to {getFolder.name}
          </Link>
          <h1 className="text-4xl font-black tracking-tight">
            Chunk {index + 1}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium italic">
            {chunkWords.length} semantic units ready for mastery
          </p>
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Link
            href={`/session/${folderId}?chunk=${index}`}
            className="px-8 py-3 text-sm font-bold text-background bg-foreground rounded-full shadow-xl shadow-foreground/10 hover:opacity-90 transition-all flex items-center gap-3 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Active Session
          </Link>
        </motion.div>
      </header>

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {chunkWords.map((word) => (
          <motion.button
            key={word.id}
            variants={item}
            whileHover={{ scale: 1.05, rotate: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedWord(word)}
            className={`p-6 border rounded-2xl transition-all text-left group relative overflow-hidden ${word.state.recallScore >= 5
              ? "bg-green-500/5 border-green-500/30 hover:border-green-500/50"
              : "bg-background border-border hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10"
              }`}
          >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>

            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">
                {word.term}
              </h3>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-md font-black tracking-widest ${word.state.recallScore >= 5
                  ? "bg-green-500 text-white"
                  : word.state.recallScore >= 2
                    ? "bg-green-500/10 text-green-600"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {word.state.recallScore >= 5
                  ? "MASTERED"
                  : word.state.recallScore >= 2
                    ? "FAM"
                    : "NEW"}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-bold flex items-center gap-2 uppercase tracking-tighter">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Inspect Meaning
            </div>
          </motion.button>
        ))}
      </motion.main>

      {selectedWord && (
        <MeaningModal
          word={selectedWord}
          folderId={folderId}
          isOpen={!!selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}

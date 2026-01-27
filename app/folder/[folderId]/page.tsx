"use client";

import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState } from "react";
import Link from "next/link";
import ImportModal from "@/components/import/ImportModal";
import { EnrichedWord } from "@/lib/types";
import { motion } from "framer-motion";

const CHUNK_SIZE = 15;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
};

export default function FolderDetailPage() {
  const { folderId } = useParams() as { folderId: string };
  const getFolder = useLiveQuery(() => db.folders.get(folderId), [folderId]);

  const enrichedWords = useLiveQuery(async () => {
    const wordFolders = await db.wordFolders
      .where("folderId")
      .equals(folderId)
      .toArray();
    wordFolders.sort((a, b) => a.wordId.localeCompare(b.wordId));

    const wordIds = wordFolders.map((wf) => wf.wordId);
    const words = await db.words.bulkGet(wordIds);
    const states = await db.wordStates.bulkGet(wordIds);

    return words
      .map((w, i) => ({
        ...w!,
        state: states[i]!,
      }))
      .filter((w) => !!w);
  }, [folderId]);

  const [showImport, setShowImport] = useState(false);

  if (!getFolder || !enrichedWords)
    return <div className="p-8">Loading Folder...</div>;

  const wordCount = enrichedWords.length;
  const chunks: EnrichedWord[][] = [];
  for (let i = 0; i < enrichedWords.length; i += CHUNK_SIZE) {
    chunks.push(enrichedWords.slice(i, i + CHUNK_SIZE));
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto font-sans bg-zinc-50 dark:bg-black">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-600 mb-2 block transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {getFolder.name}
          </h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            {wordCount} Words &middot; {chunks.length} Chunks
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex gap-3"
        >
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95"
          >
            Import JSON
          </button>
        </motion.div>
      </header>

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {chunks.length === 0 ? (
          <motion.div
            variants={item}
            className="col-span-full text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50"
          >
            <h3 className="text-lg font-medium text-zinc-400">
              This folder is empty.
            </h3>
            <button
              onClick={() => setShowImport(true)}
              className="mt-4 text-blue-500 font-bold hover:underline text-sm"
            >
              Import words to get started
            </button>
          </motion.div>
        ) : (
          chunks.map((chunk, index) => {
            const familiarInChunk = chunk.filter(
              (w) => w.state.recallScore >= 2,
            ).length;

            return (
              <motion.div
                key={index}
                variants={item}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Link
                  href={`/folder/${folderId}/chunk/${index}`}
                  className="block p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors shadow-sm relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xl text-zinc-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      {index + 1}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-md">
                      Chunk
                    </span>
                  </div>

                  <h3 className="font-bold text-xl mb-1 tracking-tight">
                    Chunk {index + 1}
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium">
                    {chunk.length} words &middot; {familiarInChunk} familiar
                  </p>

                  <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800 text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Explore Chunks{" "}
                    <span className="transition-transform group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </motion.main>

      <ImportModal
        folderId={folderId}
        folderName={getFolder.name}
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState } from "react";
import Link from "next/link";
import ImportModal from "@/components/import/ImportModal";
import CreateFolderModal from "@/components/folders/CreateFolderModal";
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
  const subfolders = useLiveQuery(() => db.folders.where({ parentId: folderId }).toArray(), [folderId]);

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
  const [showCreate, setShowCreate] = useState(false);

  if (!getFolder || !enrichedWords || !subfolders)
    return <div className="p-8">Loading Folder...</div>;

  const wordCount = enrichedWords.length;
  const chunks: EnrichedWord[][] = [];
  for (let i = 0; i < enrichedWords.length; i += CHUNK_SIZE) {
    chunks.push(enrichedWords.slice(i, i + CHUNK_SIZE));
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto font-sans bg-background">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground mb-2 block transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {getFolder.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            {wordCount} Words &middot; {chunks.length} Chunks
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex gap-3"
        >
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-bold text-background bg-foreground rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Subfolder
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 text-sm font-semibold text-foreground/80 bg-background border border-border rounded-xl hover:bg-muted/50 transition-all shadow-sm active:scale-95"
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
        {chunks.length === 0 && subfolders.length === 0 ? (
          <motion.div
            variants={item}
            className="col-span-full text-center py-20 border-2 border-dashed border-border rounded-2xl bg-muted/20"
          >
            <h3 className="text-lg font-medium text-muted-foreground">
              This folder is empty.
            </h3>
            <p className="text-sm text-muted-foreground/60 mt-1 mb-6">
              Create a subfolder or import words to get started.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-2 bg-foreground text-background rounded-full font-bold text-sm shadow-xl active:scale-95"
              >
                New Folder
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="px-6 py-2 border border-border rounded-full font-bold text-sm hover:bg-muted transition-colors"
              >
                Import JSON
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {subfolders.map((folder) => (
              <motion.div
                key={folder.id}
                variants={item}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Link
                  href={`/folder/${folder.id}`}
                  className="block p-6 bg-background border border-border rounded-2xl hover:border-blue-500/50 transition-colors shadow-sm relative overflow-hidden group border-l-4 border-l-blue-500"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md">
                      Subfolder
                    </span>
                  </div>

                  <h3 className="font-bold text-xl mb-1 tracking-tight">
                    {folder.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Nested Organization
                  </p>

                  <div className="mt-6 pt-6 border-t border-border text-xs text-blue-500 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Open Folder{" "}
                    <span className="transition-transform group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}

            {chunks.map((chunk, index) => {
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
                    className="block p-6 bg-background border border-border rounded-2xl hover:border-foreground/20 transition-colors shadow-sm relative overflow-hidden group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center font-bold text-xl text-muted-foreground group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        {index + 1}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md">
                        Chunk
                      </span>
                    </div>

                    <h3 className="font-bold text-xl mb-1 tracking-tight">
                      Chunk {index + 1}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      {chunk.length} words &middot; {familiarInChunk} familiar
                    </p>

                    <div className="mt-6 pt-6 border-t border-border text-xs text-blue-500 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Explore Chunks{" "}
                      <span className="transition-transform group-hover:translate-x-1">
                        &rarr;
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </>
        )}
      </motion.main>

      <ImportModal
        folderId={folderId}
        folderName={getFolder.name}
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => { }}
      />

      <CreateFolderModal
        isOpen={showCreate}
        parentId={folderId}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { }}
      />
    </div>
  );
}

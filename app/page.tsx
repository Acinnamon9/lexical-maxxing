"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import { useState } from "react";
import ImportModal from "@/components/import/ImportModal";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const folders = useLiveQuery(() => db.folders.toArray());
  const [importTarget, setImportTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  if (!folders) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto font-sans">
      <header className="mb-12 flex justify-between items-center">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">Lexical Maxxing</h1>
          <p className="text-zinc-500 font-medium">
            Domain-driven vocabulary builder
          </p>
        </motion.div>
        <Link
          href="/debug"
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Debug View
        </Link>
      </header>

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {folders.map((folder) => (
          <motion.div
            key={folder.id}
            variants={item}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="p-6 border rounded-2xl hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600 transition-colors group relative bg-white dark:bg-zinc-900 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {folder.name}
                </h2>
                <p className="text-[10px] text-zinc-400 font-mono mt-1 opacity-50 uppercase tracking-widest">
                  ID: {folder.id}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setImportTarget({ id: folder.id, name: folder.name });
                  }}
                  className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all"
                  title="Import JSON"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </button>
              </div>
            </div>

            <Link
              href={`/folder/${folder.id}`}
              className="inline-flex items-center text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            >
              View Folder{" "}
              <span className="ml-1 group-hover:translate-x-1 transition-transform inline-block">
                &rarr;
              </span>
            </Link>
          </motion.div>
        ))}

        {folders.length === 0 && (
          <motion.div
            variants={item}
            className="text-center p-12 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800"
          >
            No folders found. Check{" "}
            <Link href="/debug" className="underline font-bold">
              Debug
            </Link>{" "}
            to seed data.
          </motion.div>
        )}
      </motion.main>

      {importTarget && (
        <ImportModal
          folderId={importTarget.id}
          folderName={importTarget.name}
          isOpen={!!importTarget}
          onClose={() => setImportTarget(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

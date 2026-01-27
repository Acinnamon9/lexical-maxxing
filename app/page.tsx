"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import { useState } from "react";
import ImportModal from "@/components/import/ImportModal";
import CreateFolderModal from "@/components/folders/CreateFolderModal";
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
  const folders = useLiveQuery(() => db.folders.toCollection().filter(f => !f.parentId).toArray());
  const [showCreate, setShowCreate] = useState(false);
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
          <p className="text-muted-foreground font-medium">
            Domain-driven vocabulary builder
          </p>
        </motion.div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-foreground/10"
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
            New Folder
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <Link
            href="/settings"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/debug"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Debug View
          </Link>
        </div>
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
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="group relative"
          >
            <Link
              href={`/folder/${folder.id}`}
              className="block p-6 border border-border rounded-2xl hover:border-border hover:bg-muted/30 transition-all bg-background shadow-sm"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {folder.name}
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-50 uppercase tracking-widest">
                    ID: {folder.id}
                  </p>
                </div>

                <div className="flex gap-2 relative z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImportTarget({ id: folder.id, name: folder.name });
                    }}
                    className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-all"
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

              <div
                className="inline-flex items-center text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors gap-2"
              >
                View Folder{" "}
                <span className="group-hover:translate-x-1 transition-transform inline-block">
                  &rarr;
                </span>
              </div>
            </Link>
          </motion.div>
        ))}

        {folders.length === 0 && (
          <motion.div
            variants={item}
            className="text-center p-12 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border"
          >
            No folders found. Check{" "}
            <Link href="/debug" className="underline font-bold">
              Debug
            </Link>{" "}
            to seed data.
          </motion.div>
        )}
      </motion.main>

      {
        importTarget && (
          <ImportModal
            folderId={importTarget.id}
            folderName={importTarget.name}
            isOpen={!!importTarget}
            onClose={() => setImportTarget(null)}
            onSuccess={() => { }}
          />
        )
      }

      <CreateFolderModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { }}
      />
    </div >
  );
}

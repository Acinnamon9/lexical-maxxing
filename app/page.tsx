"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import ImportModal from "@/components/import/ImportModal";
import CreateFolderModal from "@/components/folders/CreateFolderModal";
import { useSync } from "@/hooks/useSync";
import { motion } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import FolderCard from "@/components/folders/FolderCard";
import { Folder } from "@/lib/types";

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
  const folders = useLiveQuery(() =>
    db.folders
      .toCollection()
      .filter((f) => !f.parentId)
      .toArray(),
  );
  const [showCreate, setShowCreate] = useState(false);
  const { isSyncing, triggerSync } = useSync();
  const [importTarget, setImportTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allFolders = useLiveQuery(() => db.folders.toArray());
  const allWords = useLiveQuery(() => db.words.toArray());
  const allNotes = useLiveQuery(() => db.notes.toArray());

  const searchResults = searchQuery
    ? {
        folders: (allFolders || []).filter((f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
        words: (allWords || []).filter((w) =>
          w.term.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
        notes: (allNotes || []).filter(
          (n) =>
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }
    : null;

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const handleStartEdit = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditName(folder.name);
  };

  const handleSaveEdit = async (folderId: string) => {
    if (!editName.trim()) {
      setEditingFolderId(null);
      return;
    }
    await db.folders.update(folderId, {
      name: editName.trim(),
      updatedAt: Date.now(),
    });
    setEditingFolderId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const draggedId = active.id as string;
      const targetId = over.id as string;

      await db.folders.update(draggedId, {
        parentId: targetId,
        updatedAt: Date.now(),
      });
      triggerSync();
    }
  };

  useEffect(() => {
    // Sync triggers handled in Navbar now
  }, []);

  if (!folders) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto font-sans">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Your Dashboard</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-foreground/10"
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
      </header>

      {/* Global Search Bar */}
      <div className="mb-8 relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search folders, words, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-muted/40 border-2 border-transparent focus:border-indigo-500/30 focus:bg-background rounded-2xl outline-none transition-all font-medium text-lg shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      <motion.main variants={container} initial="hidden" animate="show">
        {searchQuery ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Folder Results */}
            {searchResults && searchResults.folders.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  Folders ({searchResults.folders.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.folders.map((f) => (
                    <FolderCard
                      key={f.id}
                      folder={f}
                      isEditing={editingFolderId === f.id}
                      editName={editName}
                      onEditNameChange={setEditName}
                      onSaveEdit={handleSaveEdit}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={() => setEditingFolderId(null)}
                      onDelete={async (target) => {
                        if (
                          confirm(
                            `Are you sure you want to delete "${target.name}"?`,
                          )
                        ) {
                          await db.transaction(
                            "rw",
                            db.folders,
                            db.wordFolders,
                            async () => {
                              await db.folders.delete(target.id);
                              await db.wordFolders
                                .where("folderId")
                                .equals(target.id)
                                .delete();
                            },
                          );
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Note Results */}
            {searchResults && searchResults.notes.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Notes ({searchResults.notes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.notes.map((n) => (
                    <Link
                      key={n.id}
                      href={`/folder/${n.folderId}`}
                      className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors group flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{n.title}</span>
                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Open &rarr;
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        {n.content}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Word Results */}
            {searchResults && searchResults.words.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  Words ({searchResults.words.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {searchResults.words.map((w) => (
                    <button
                      key={w.id}
                      className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all text-center flex flex-col items-center justify-center min-h-[70px] relative overflow-hidden bg-muted/50 hover:bg-muted`}
                      style={
                        w.color ? { borderLeft: `4px solid ${w.color}` } : {}
                      }
                      onClick={async () => {
                        const link = await db.wordFolders
                          .where("wordId")
                          .equals(w.id)
                          .first();
                        if (link)
                          window.location.href = `/folder/${link.folderId}`;
                      }}
                    >
                      {w.term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {searchResults &&
              searchResults.folders.length === 0 &&
              searchResults.words.length === 0 &&
              searchResults.notes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">
                    No results found for &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(folders || []).map((folder) => (
                <motion.div key={folder.id} variants={item}>
                  <FolderCard
                    folder={folder}
                    isEditing={editingFolderId === folder.id}
                    editName={editName}
                    onEditNameChange={setEditName}
                    onSaveEdit={handleSaveEdit}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={() => setEditingFolderId(null)}
                    onDelete={async (f) => {
                      if (
                        confirm(
                          `Are you sure you want to delete "${f.name}"? This will not delete the words themselves.`,
                        )
                      ) {
                        db.transaction(
                          "rw",
                          db.folders,
                          db.wordFolders,
                          async () => {
                            await db.folders.delete(f.id);
                            await db.wordFolders
                              .where("folderId")
                              .equals(f.id)
                              .delete();
                          },
                        );
                      }
                    }}
                  />
                </motion.div>
              ))}
            </div>
            {(folders || []).length === 0 && (
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
          </DndContext>
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

      <CreateFolderModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

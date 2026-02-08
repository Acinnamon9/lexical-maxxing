"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import Link from "next/link";
import ImportModal from "@/components/import/ImportModal";
import CreateFolderModal from "@/components/folders/CreateFolderModal";
import NoteList from "@/components/notes/NoteList";
import NoteModal from "@/components/notes/NoteModal";
import BulkImportModal from "@/components/import/BulkImportModal";
import { EnrichedWord, Note, Folder } from "@/lib/types";
import { motion } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import FolderCard from "@/components/folders/FolderCard";
import BreadcrumbDroppable from "@/components/folders/BreadcrumbDroppable";
import { useSync } from "@/hooks/useSync";

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
  const { triggerSync } = useSync();
  const getFolder = useLiveQuery(() => db.folders.get(folderId), [folderId]);
  const subfolders = useLiveQuery(
    () => db.folders.where({ parentId: folderId }).toArray(),
    [folderId],
  );

  const notes = useLiveQuery(
    () =>
      db.notes.where("folderId").equals(folderId).reverse().sortBy("createdAt"),
    [folderId],
  );

  const breadcrumbs = useLiveQuery(async () => {
    let current = await db.folders.get(folderId);
    if (!current) return [];

    const path: { id: string; name: string }[] = [];
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      if (!current.parentId) break;
      const parent = (await db.folders.get(current.parentId)) as
        | Folder
        | undefined;
      if (!parent) break;
      current = parent;
    }
    return path;
  }, [folderId]);

  const rawWords = useLiveQuery(async () => {
    const links = await db.wordFolders
      .where("folderId")
      .equals(folderId)
      .toArray();
    const wordIds = links.map((l) => l.wordId);
    return db.words.where("id").anyOf(wordIds).toArray();
  }, [folderId]);

  const enrichedWords = useLiveQuery(async () => {
    if (!rawWords) return [];
    const enriched = await Promise.all(
      rawWords.map(async (word) => {
        const state = await db.wordStates.get(word.id);
        return {
          ...word,
          state: state || {
            wordId: word.id,
            recallScore: 0,
            lastReviewedAt: 0,
            updatedAt: Date.now(),
          },
        } as EnrichedWord;
      }),
    );
    return enriched.sort(
      (a, b) => (a.state.recallScore || 0) - (b.state.recallScore || 0),
    );
  }, [rawWords]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const [editingSubfolderId, setEditingSubfolderId] = useState<string | null>(
    null,
  );
  const [subfolderEditName, setSubfolderEditName] = useState("");

  // Notes State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showNoteImport, setShowNoteImport] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  const handleCreateNote = async (title: string, content: string) => {
    await db.notes.add({
      id: crypto.randomUUID(),
      folderId,
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const handleUpdateNote = async (title: string, content: string) => {
    if (editingNote) {
      await db.notes.update(editingNote.id, {
        title,
        content,
        updatedAt: Date.now(),
      });
      setEditingNote(undefined);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    if (confirm("Are you sure you want to delete this note?")) {
      await db.notes.delete(note.id);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // New Note: Cmd + N or Ctrl + N
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setEditingNote(undefined);
        setShowNoteModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleStartTitleEdit = () => {
    if (!getFolder) return;
    setTitleValue(getFolder.name);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    await db.folders.update(folderId, {
      name: titleValue.trim(),
      updatedAt: Date.now(),
    });
    setIsEditingTitle(false);
  };

  const handleStartSubfolderEdit = (folder: Folder) => {
    setEditingSubfolderId(folder.id);
    setSubfolderEditName(folder.name);
  };

  const handleSaveSubfolder = async (id: string) => {
    if (!subfolderEditName.trim()) {
      setEditingSubfolderId(null);
      return;
    }
    await db.folders.update(id, {
      name: subfolderEditName.trim(),
      updatedAt: Date.now(),
    });
    setEditingSubfolderId(null);
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

      // targetId could be "root" or a folderId
      await db.folders.update(draggedId, {
        parentId: targetId === "root" ? null : targetId,
        updatedAt: Date.now(),
      });
      triggerSync();
    }
  };

  if (!getFolder || !enrichedWords || !subfolders)
    return <div className="p-8">Loading Folder...</div>;

  const wordCount = enrichedWords.length;
  const chunks: EnrichedWord[][] = [];
  for (let i = 0; i < enrichedWords.length; i += CHUNK_SIZE) {
    chunks.push(enrichedWords.slice(i, i + CHUNK_SIZE));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen p-8 max-w-4xl mx-auto font-sans bg-background">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 flex-wrap">
              <BreadcrumbDroppable id={null} name="Dashboard" isLast={false} />
              {breadcrumbs?.map((bc, idx) => (
                <div key={bc.id} className="flex items-center gap-1.5">
                  <span className="text-[10px] opacity-30 select-none">/</span>
                  <BreadcrumbDroppable
                    id={bc.id}
                    name={bc.name}
                    isLast={idx === breadcrumbs.length - 1}
                  />
                </div>
              ))}
            </nav>
            {isEditingTitle ? (
              <input
                autoFocus
                className="text-3xl font-bold tracking-tight bg-transparent border-b border-blue-500 focus:outline-none w-full"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
              />
            ) : (
              <h1
                className="text-3xl font-bold tracking-tight hover:text-blue-500 cursor-pointer transition-colors flex items-center gap-2"
                onClick={handleStartTitleEdit}
              >
                {getFolder.emoji && <span>{getFolder.emoji}</span>}
                {getFolder.name}
              </h1>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] font-bold text-indigo-500/80 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                {wordCount} words
              </span>
              <span className="text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-widest">
                ID: {folderId}
              </span>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-xs font-bold hover:bg-muted transition-all active:scale-95 shadow-sm"
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
              onClick={() => setShowNoteModal(true)}
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
              New Note
            </button>
            <button
              onClick={() => setShowNoteImport(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-xs font-bold hover:bg-muted transition-all active:scale-95 shadow-sm"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              Paste JSON Notes
            </button>
          </div>
        </header>

        {/* Section: Folders */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
              <span className="w-8 h-px bg-border"></span>
              Subfolders
              <span className="text-[10px] lowercase font-normal opacity-50 tracking-normal">
                ({subfolders.length})
              </span>
            </h2>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {subfolders.map((folder) => (
              <motion.div key={folder.id} variants={item}>
                <FolderCard
                  folder={folder}
                  variant="subfolder"
                  isEditing={editingSubfolderId === folder.id}
                  editName={subfolderEditName}
                  onEditNameChange={setSubfolderEditName}
                  onSaveEdit={handleSaveSubfolder}
                  onStartEdit={handleStartSubfolderEdit}
                  onCancelEdit={() => setEditingSubfolderId(null)}
                  onDelete={async (f) => {
                    if (
                      confirm(`Are you sure you want to delete "${f.name}"?`)
                    ) {
                      await db.transaction(
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
            <motion.div
              variants={item}
              className="flex flex-col gap-4 p-8 border-2 border-dashed border-border rounded-2xl bg-muted/20 items-center justify-center text-center group hover:border-indigo-500/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center text-muted-foreground shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">Organize better</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create subfolders for specific domains.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="px-6 py-2 bg-foreground text-background rounded-xl font-bold text-sm shadow-xl active:scale-95 hover:opacity-90 transition-opacity"
                >
                  New Folder
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="px-6 py-2 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-colors bg-background"
                >
                  Import JSON
                </button>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Section: Notes */}
        <section className="mb-12">
          <NoteList
            notes={notes || []}
            onEdit={(note) => {
              setEditingNote(note);
              setShowNoteModal(true);
            }}
            onDelete={handleDeleteNote}
          />
        </section>

        {/* Section: Words */}
        {enrichedWords.length > 0 && (
          <section className="mb-20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                <span className="w-8 h-px bg-border"></span>
                Vocabulary Map
              </h2>
              <button
                onClick={() => {
                  // Limit to first 10 words to prevent AI response truncation
                  const batchSize = Math.min(wordCount, 10);
                  window.dispatchEvent(
                    new CustomEvent("ai-widget-open", {
                      detail: {
                        query: `Assign thematic colors to the first ${batchSize} words in the "${getFolder.name}" folder based on their semantic meaning. Use hex colors.`,
                        mode: "ARCHITECT",
                      },
                    }),
                  );
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:bg-indigo-500/10 transition-colors border border-indigo-500/20"
              >
                <span>✨</span> Auto-Color AI
              </button>
            </div>
            <div className="space-y-12">
              {chunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="relative">
                  {chunkIdx > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-20">
                      <div className="w-px h-4 bg-foreground" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {chunk.map((word) => (
                      <WordCard key={word.id} word={word} folderId={folderId} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <NoteModal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false);
            setEditingNote(undefined);
          }}
          onSave={editingNote ? handleUpdateNote : handleCreateNote}
          initialTitle={editingNote?.title}
          initialContent={editingNote?.content}
          isEditing={!!editingNote}
        />

        <CreateFolderModal
          isOpen={showCreateFolder}
          parentId={folderId}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => {}}
        />

        <ImportModal
          isOpen={showImport}
          folderId={folderId}
          folderName={getFolder.name}
          onClose={() => setShowImport(false)}
          onSuccess={() => {}}
        />

        <BulkImportModal
          isOpen={showNoteImport}
          onClose={() => setShowNoteImport(false)}
          onSuccess={() => {}}
          mode="notes"
          targetId={folderId}
        />
      </div>
    </DndContext>
  );
}

// Sub-component for word cards to keep main clean
function WordCard({
  word,
  folderId,
}: {
  word: EnrichedWord;
  folderId: string;
}) {
  const [showMeaning, setShowMeaning] = useState(false);

  const recallColors = [
    "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/30",
    "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/30",
    "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/30",
    "bg-lime-500/10 text-lime-600 border-lime-200 dark:border-lime-900/30",
    "bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/30",
    "bg-emerald-500/20 text-emerald-600 border-emerald-300 dark:border-emerald-800/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
  ];

  const colorClass = recallColors[Math.min(word.state.recallScore || 0, 5)];

  return (
    <>
      <motion.button
        whileHover={{
          scale: 1.05,
          y: -4,
          boxShadow: word.color
            ? `0 12px 24px -6px ${word.color}60`
            : "0 10px 20px -5px rgba(0,0,0,0.1)",
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowMeaning(true)}
        className={`px-4 py-4 rounded-2xl text-sm font-bold border transition-all text-center flex flex-col items-center justify-center min-h-[85px] relative overflow-hidden group ${!word.color ? `backdrop-blur-sm ${colorClass}` : ""}`}
        style={
          word.color
            ? {
                backgroundColor: `${word.color}08`, // Subtle greyish-tinted background
                color: word.color,
                borderColor: word.color,
                borderWidth: "2px",
              }
            : {}
        }
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <span className="tracking-tight relative z-10 font-black uppercase">
          {word.term}
        </span>

        <div className="flex gap-0.5 mt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full ${
                i < (word.state.recallScore || 0)
                  ? "bg-current"
                  : "bg-current opacity-20"
              }`}
            />
          ))}
        </div>
      </motion.button>

      {showMeaning && (
        <MeaningModal
          word={word}
          folderId={folderId}
          isOpen={showMeaning}
          onClose={() => setShowMeaning(false)}
        />
      )}
    </>
  );
}

// MeaningModal implementation inside file for now or import if exists
import MeaningModal from "@/components/MeaningModal";

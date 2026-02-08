"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { db } from "@/lib/db";
import BulkImportModal from "@/components/import/BulkImportModal";
import CustomAlert from "@/components/ui/CustomAlert";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function DataManagementSection() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error" | "confirm";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const handleExport = async () => {
    const folders = await db.folders.toArray();
    const words = await db.words.toArray();
    const wordFolders = await db.wordFolders.toArray();
    const wordStates = await db.wordStates.toArray();

    const data = {
      folders,
      words,
      wordFolders,
      wordStates,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexical-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMissingMeanings = async () => {
    const wordFolders = await db.wordFolders.toArray();
    const missing = [];

    for (const wf of wordFolders) {
      const meaningsCount = await db.wordMeanings
        .where("[wordId+folderId]")
        .equals([wf.wordId, wf.folderId])
        .count();

      if (meaningsCount === 0) {
        const word = await db.words.get(wf.wordId);
        const folder = await db.folders.get(wf.folderId);
        if (word && folder) {
          missing.push({
            term: word.term,
            folder: folder.name,
            wordId: word.id,
            folderId: folder.id,
          });
        }
      }
    }

    if (missing.length === 0) {
      setAlertConfig({
        isOpen: true,
        title: "All Caught Up!",
        message: "No words found without meanings in your library.",
        type: "success",
      });
      return;
    }

    const blob = new Blob([JSON.stringify(missing, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missing-meanings-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    setAlertConfig({
      isOpen: true,
      title: "Clear Library?",
      message:
        "This will permanently delete ALL your folders and words. This action cannot be undone.",
      type: "confirm",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await Promise.all([
            db.folders.clear(),
            db.words.clear(),
            db.wordFolders.clear(),
            db.wordStates.clear(),
            db.productions.clear(),
            db.wordMeanings.clear(),
            db.doubts.clear(),
          ]);
          setAlertConfig({
            isOpen: true,
            title: "Cleared!",
            message: "Your library has been successfully wiped.",
            type: "success",
          });
        } catch (error) {
          console.error("Failed to clear data:", error);
          setAlertConfig({
            isOpen: true,
            title: "Error",
            message: "Failed to clear the database. Please try again.",
            type: "error",
          });
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <>
      <motion.section variants={item} className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Data Management
        </h2>
        <div className="grid gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div>
              <p className="font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">
                Download a JSON backup of all your vocabulary
              </p>
            </div>
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
              className="text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          </button>

          <button
            onClick={handleExportMissingMeanings}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div>
              <p className="font-medium">Export Meaningless Words</p>
              <p className="text-xs text-muted-foreground">
                Download a list of words that have no meanings recorded
              </p>
            </div>
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
              className="text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          <button
            onClick={() => setShowFolderImport(true)}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div>
              <p className="font-medium">Import Folders</p>
              <p className="text-xs text-muted-foreground">
                Create multiple folders at once via JSON
              </p>
            </div>
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
              className="text-muted-foreground"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="12" x2="12" y1="8" y2="16" />
              <line x1="8" x2="16" y1="12" y2="12" />
            </svg>
          </button>

          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div>
              <p className="font-medium">Import Meanings Bulk</p>
              <p className="text-xs text-muted-foreground">
                Add meanings to multiple words across folders via JSON
              </p>
            </div>
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
              className="text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </button>

          <button
            onClick={handleClearData}
            disabled={isDeleting}
            className="flex items-center justify-between p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group"
          >
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">
                Clear All Data
              </p>
              <p className="text-xs text-red-500/70">
                Permanently delete all folders and words
              </p>
            </div>
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
              className="text-red-400 group-hover:rotate-12 transition-transform"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </motion.section>

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {}}
        mode="meanings"
      />

      <BulkImportModal
        isOpen={showFolderImport}
        onClose={() => setShowFolderImport(false)}
        onSuccess={() => {
          window.location.reload(); // Refresh to see new folders
        }}
        mode="folders"
      />

      <CustomAlert
        {...alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}

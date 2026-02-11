"use client";

import { useState, useEffect } from "react";
import { bulkImportMeanings, importFolders, importNotes } from "@/lib/import";
import { motion, AnimatePresence } from "framer-motion";

export type ImportMode = "meanings" | "folders" | "notes";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: ImportMode;
  targetId?: string; // folderId for notes
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "meanings",
  targetId,
}: BulkImportModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Configuration based on mode
  const config = {
    meanings: {
      title: "Bulk Meaning Import",
      placeholder: "Paste your JSON bulk meanings here...",
      buttonLabel: "Import Meanings",
      template: [
        {
          term: "Draft",
          folderId: "uuid-here",
          meanings: ["meaning 1", "meaning 2"],
        },
      ],
      description:
        "This matches the format of 'Meaningless Words' export. Just add a 'meanings' array.",
    },
    folders: {
      title: "Import Folders",
      placeholder: "Paste folder JSON here...",
      buttonLabel: "Import Folders",
      template: [
        {
          name: "Academic",
          emoji: "📚",
          color: "#4F46E5",
        },
      ],
      description:
        "Create multiple folders at once. 'emoji' and 'color' are optional.",
    },
    notes: {
      title: "Import Notes",
      placeholder: "Paste note JSON here...",
      buttonLabel: "Import Notes",
      template: [
        {
          title: "Session 1 Review",
          content: "# Key Takeaways\n- Content here in markdown",
        },
      ],
      description: "Notes will be added to the current folder.",
    },
  }[mode];

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, importing]);

  const handleImport = async () => {
    setImporting(true);
    setMessage(null);

    try {
      let result;
      if (mode === "meanings") {
        result = await bulkImportMeanings(jsonText);
      } else if (mode === "folders") {
        result = await importFolders(jsonText);
      } else if (mode === "notes") {
        if (!targetId) throw new Error("Folder targetId is required for notes");
        result = await importNotes(targetId, jsonText);
      }

      if (result?.success) {
        setMessage(result.message);
        setTimeout(() => {
          onSuccess();
          onClose();
          setJsonText("");
          setMessage(null);
        }, 2000);
      } else {
        setMessage(`Error: ${result?.message || "Unknown error"}`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage(`Failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => !importing && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-background rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-border flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-tight">
                {config.title}
              </h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
                disabled={importing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto min-h-[300px] flex flex-col gap-4">
              <div className="bg-muted/50 p-4 rounded-xl relative group border border-border">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Required Format
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(config.template, null, 2),
                      );
                    }}
                    className="text-[10px] bg-muted px-3 py-1 rounded-md hover:bg-accent transition-colors font-semibold"
                  >
                    Copy Template
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground">
                  {JSON.stringify(config.template, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
              <textarea
                className="flex-1 w-full p-4 font-mono text-xs bg-muted/20 border border-border rounded-xl resize-none focus:ring-2 ring-blue-500/50 focus:outline-none min-h-[150px] transition-all"
                placeholder={config.placeholder}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm mt-4 p-3 rounded-lg font-medium ${message.includes("Error") || message.includes("Failed") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
              >
                {message}
              </motion.div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!jsonText.trim() || importing}
                className="px-6 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95"
              >
                {importing ? "Processing..." : config.buttonLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

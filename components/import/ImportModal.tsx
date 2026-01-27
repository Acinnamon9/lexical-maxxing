"use client";

import { useState, useEffect } from "react";
import { importJson } from "@/lib/import";
import { motion, AnimatePresence } from "framer-motion";

interface ImportModalProps {
  folderId: string;
  folderName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({
  folderId,
  folderName,
  isOpen,
  onClose,
  onSuccess,
}: ImportModalProps) {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [jsonText, setJsonText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      let content = "";

      if (mode === "paste") {
        content = jsonText;
      } else {
        if (!file) return;
        content = await file.text();
      }

      const result = await importJson(folderId, content);

      if (result.success) {
        setMessage(
          `Success! Imported ${result.stats?.wordsCreated} new words.`,
        );
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (err) {
      setMessage("Failed to process data");
    } finally {
      setImporting(false);
    }
  };

  const isValid = mode === "paste" ? jsonText.trim().length > 0 : !!file;

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
                Import into "{folderName}"
              </h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
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

            {/* Tabs */}
            <div className="flex border-b border-border mb-6 text-sm">
              <button
                onClick={() => setMode("paste")}
                className={`px-4 py-2 border-b-2 transition-all ${mode === "paste" ? "border-blue-500 text-blue-600 font-semibold" : "border-transparent text-muted-foreground"}`}
              >
                Paste JSON
              </button>
              <button
                onClick={() => setMode("file")}
                className={`px-4 py-2 border-b-2 transition-all ${mode === "file" ? "border-blue-500 text-blue-600 font-semibold" : "border-transparent text-muted-foreground"}`}
              >
                Upload File
              </button>
            </div>

            <div className="flex-1 overflow-auto min-h-[300px] flex flex-col gap-4">
              {mode === "paste" ? (
                <>
                  <div className="bg-muted/50 p-4 rounded-xl relative group border border-border">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        JSON Template
                      </span>
                      <button
                        onClick={() => {
                          const skeleton = JSON.stringify(
                            {
                              words: [
                                {
                                  term: "word_here",
                                  meanings: ["meaning_1", "meaning_2"],
                                },
                              ],
                            },
                            null,
                            2,
                          );
                          navigator.clipboard.writeText(skeleton);
                        }}
                        className="text-[10px] bg-muted px-3 py-1 rounded-md hover:bg-accent transition-colors font-semibold"
                      >
                        Copy Template
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-muted-foreground">
                      {`{
      "words": [
        {
          "term": "term_name",
          "meanings": ["meaning_1", "meaning_2"]
        }
      ]
    }`}
                    </pre>
                  </div>
                  <textarea
                    className="flex-1 w-full p-4 font-mono text-xs bg-muted/20 border border-border rounded-xl resize-none focus:ring-2 ring-blue-500/50 focus:outline-none min-h-[150px] transition-all"
                    placeholder="Paste your JSON here..."
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                  />
                </>
              ) : (
                <div className="h-full flex flex-col justify-center items-center border-2 border-dashed border-border rounded-xl bg-muted/20 p-10">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20 text-center cursor-pointer"
                  />
                </div>
              )}
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm mt-4 p-3 rounded-lg font-medium ${message.includes("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
              >
                {message}
              </motion.div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!isValid || importing}
                className="px-6 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95"
              >
                {importing ? "Processing..." : "Import Words"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

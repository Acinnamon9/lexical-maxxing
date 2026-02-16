"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  onSuccess: (newFolderId: string) => void;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  parentId,
  onSuccess,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ffeb3b"); // Default to Cyber Yellow
  const [bgImage, setBgImage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRESET_COLORS = [
    { name: "Cyber Yellow", value: "#ffeb3b" },
    { name: "Cyan", value: "#00e5ff" },
    { name: "Hot Pink", value: "#f50057" },
    { name: "Electric Blue", value: "#2962ff" },
    { name: "Lime", value: "#aeea00" },
    { name: "Bright Orange", value: "#ffab00" },
    { name: "Vivid Purple", value: "#d500f9" },
    { name: "Teal", value: "#1de9b6" },
    { name: "Crimson", value: "#ff1744" },
    { name: "Spring Green", value: "#00e676" },
    { name: "Lavender", value: "#b388ff" },
    { name: "Salmon", value: "#ff8a80" },
    { name: "Indigo", value: "#3f51b5" },
    { name: "Amber", value: "#ffc107" },
    { name: "Deep Orange", value: "#ff5722" },
    { name: "Light Green", value: "#8bc34a" },
    { name: "Cyan Accent", value: "#00b8d4" },
    { name: "Pink Accent", value: "#ff4081" },
  ];

  useEffect(() => {
    if (isOpen) {
      setName("");
      setColor("#ffeb3b");
      setBgImage("");
      setError(null);
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const id = crypto.randomUUID();
      await db.folders.add({
        id,
        name: name.trim(),
        parentId: parentId || null,
        color: color,
        backgroundImage: bgImage.trim() || undefined,
        updatedAt: Date.now(),
      });
      onSuccess(id);
      onClose();
    } catch (err) {
      setError("Failed to create folder. Please try again.");
    } finally {
      setCreating(false);
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
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-background rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold tracking-tight mb-4">
              {parentId ? "New Subfolder" : "New Folder"}
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
                  Folder Name
                </label>
                <input
                  autoFocus
                  type="text"
                  className="w-full bg-muted/20 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 transition-all font-medium"
                  placeholder="e.g. Philosophical Terms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 block">
                  Theme Color
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-xl border border-border">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono focus:outline-none"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
                  Background Image URL
                </label>
                <input
                  type="text"
                  className="w-full bg-muted/20 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 ring-blue-500/50 transition-all font-mono"
                  placeholder="https://images.unsplash.com/..."
                  value={bgImage}
                  onChange={(e) => setBgImage(e.target.value)}
                  disabled={creating}
                />
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  Tip: Use Unsplash for high-quality Neubrutalist textures.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold hover:bg-muted/50 rounded-xl transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || creating}
                  className="flex-1 px-4 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-30 transition-all active:scale-95 shadow-lg"
                >
                  {creating ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setName("");
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
                parentId: parentId || undefined,
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

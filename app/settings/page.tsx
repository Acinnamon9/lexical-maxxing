"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import BulkImportModal from "@/components/import/BulkImportModal";
import CustomAlert from "@/components/ui/CustomAlert";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [geminiKey, setGeminiKey] = useState("");
    const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
    const [geminiPrePrompt, setGeminiPrePrompt] = useState("");
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
        type: "info"
    });

    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<'system' | 'light' | 'dark' | 'solarized'>('system');

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') as 'system' | 'light' | 'dark' | 'solarized';
        if (savedTheme) {
            setTheme(savedTheme);
            updateTheme(savedTheme);
        }
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) setGeminiKey(savedKey);

        const savedModel = localStorage.getItem('gemini_model');
        if (savedModel) setGeminiModel(savedModel);

        const savedPrePrompt = localStorage.getItem('gemini_pre_prompt');
        if (savedPrePrompt) setGeminiPrePrompt(savedPrePrompt);
    }, []);

    const handleSaveGeminiKey = (key: string) => {
        setGeminiKey(key);
        localStorage.setItem('gemini_api_key', key);
    };

    const handleSaveGeminiModel = (model: string) => {
        setGeminiModel(model);
        localStorage.setItem('gemini_model', model);
    };

    const handleSaveGeminiPrePrompt = (prompt: string) => {
        setGeminiPrePrompt(prompt);
        localStorage.setItem('gemini_pre_prompt', prompt);
    };

    const updateTheme = (newTheme: 'system' | 'light' | 'dark' | 'solarized') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        const root = document.documentElement;

        if (newTheme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light', 'solarized');
        } else if (newTheme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark', 'solarized');
        } else if (newTheme === 'solarized') {
            root.classList.add('solarized');
            root.classList.remove('dark', 'light');
        } else {
            root.classList.remove('dark', 'light', 'solarized');
        }
    };

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
                        folderId: folder.id
                    });
                }
            }
        }

        if (missing.length === 0) {
            setAlertConfig({
                isOpen: true,
                title: "All Caught Up!",
                message: "No words found without meanings in your library.",
                type: "success"
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
            message: "This will permanently delete ALL your folders and words. This action cannot be undone.",
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
                        type: "success"
                    });
                } catch (error) {
                    console.error("Failed to clear data:", error);
                    setAlertConfig({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to clear the database. Please try again.",
                        type: "error"
                    });
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    return (
        <div className="min-h-screen p-8 max-w-2xl mx-auto font-sans">
            <header className="mb-12 flex items-center gap-4">
                <Link
                    href="/"
                    className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
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
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                >
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground font-medium">
                        Manage your application preferences
                    </p>
                </motion.div>
            </header>

            <motion.main
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-12"
            >
                {/* Appearance Section */}
                <motion.section variants={item} className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Appearance
                    </h2>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                            <div>
                                <p className="font-medium">Theme</p>
                                <p className="text-xs text-muted-foreground">System preference by default</p>
                            </div>
                            <div className="flex bg-background p-1 rounded-xl border border-border shadow-sm min-w-[200px] justify-end">
                                {!mounted ? (
                                    <div className="h-6 w-full animate-pulse bg-muted rounded-lg" />
                                ) : (
                                    <>
                                        <button
                                            onClick={() => updateTheme('system')}
                                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === 'system' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            System
                                        </button>
                                        <button
                                            onClick={() => updateTheme('light')}
                                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === 'light' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Light
                                        </button>
                                        <button
                                            onClick={() => updateTheme('dark')}
                                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Dark
                                        </button>
                                        <button
                                            onClick={() => updateTheme('solarized')}
                                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${theme === 'solarized' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Solarized
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* AI Configuration Section */}
                <motion.section variants={item} className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        AI Configuration
                    </h2>
                    <div className="grid gap-2">
                        <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Gemini API Key</p>
                                    <p className="text-xs text-muted-foreground">Used for AI Clarifications</p>
                                </div>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-blue-500 hover:underline px-2 py-1 bg-blue-500/10 rounded-md"
                                >
                                    Get Key &rarr;
                                </a>
                            </div>
                            <input
                                type="password"
                                value={geminiKey}
                                onChange={(e) => handleSaveGeminiKey(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 transition-all font-mono"
                                placeholder="Paste your API key here..."
                            />

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Default Model
                                </label>
                                <select
                                    value={geminiModel}
                                    onChange={(e) => handleSaveGeminiModel(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 appearance-none transition-all cursor-pointer"
                                >
                                    <optgroup label="Gemini 3 (Latest)">
                                        <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                                        <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                    </optgroup>
                                    <optgroup label="Gemini 2.5">
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                                    </optgroup>
                                    <optgroup label="Gemini 2.0 (Legacy)">
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                                    </optgroup>
                                    <optgroup label="Standard Models">
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    AI Instructions (Pre-prompt)
                                </label>
                                <textarea
                                    value={geminiPrePrompt}
                                    onChange={(e) => handleSaveGeminiPrePrompt(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 transition-all font-sans min-h-[100px] resize-y"
                                    placeholder="You are an expert etymologist and linguist... (Leave blank for default instructions)"
                                />
                                <p className="text-[10px] text-muted-foreground italic">
                                    Define how the AI should respond. You can set the persona, tone, and specific formatting rules here.
                                </p>
                            </div>

                            <p className="text-[10px] text-muted-foreground italic">
                                Your key is stored locally in your browser and never sent to our servers.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Data Management Section */}
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
                                <p className="text-xs text-muted-foreground">Download a JSON backup of all your vocabulary</p>
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
                                <p className="text-xs text-muted-foreground">Download a list of words that have no meanings recorded</p>
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
                            onClick={() => setShowBulkImport(true)}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
                        >
                            <div>
                                <p className="font-medium">Import Meanings Bulk</p>
                                <p className="text-xs text-muted-foreground">Add meanings to multiple words across folders via JSON</p>
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
                                <p className="font-medium text-red-600 dark:text-red-400">Clear All Data</p>
                                <p className="text-xs text-red-500/70">Permanently delete all folders and words</p>
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

                {/* About Section */}
                <motion.section variants={item} className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        About
                    </h2>
                    <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Version</span>
                            <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded border border-border">1.0.0</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            Lexical Maxxing is a domain-driven vocabulary builder designed for power users who want to master language through context and repetition.
                        </p>
                    </div>
                </motion.section>
            </motion.main>

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                onSuccess={() => { }}
            />

            <CustomAlert
                {...alertConfig}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />

            <footer className="mt-20 text-center">
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                    Made with ❤️ for speed learners
                </p>
            </footer>
        </div>
    );
}

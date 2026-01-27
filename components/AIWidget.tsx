"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentAction, AgentAction } from "@/hooks/useAgentAction";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

interface Message {
    id: string;
    role: "user" | "agent" | "system";
    text: string;
}

export default function AIWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "agent",
            text: "I'm the Architect. I can build folders and add words for you. Try 'Create a Biology folder'.",
        },
    ]);
    const [pendingActions, setPendingActions] = useState<AgentAction[] | null>(null);

    const { executePlan } = useAgentAction();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Context Awareness
    const params = useParams();
    const folderId = params?.folderId as string | undefined;
    const currentFolder = useLiveQuery(
        () => (folderId ? db.folders.get(folderId) : undefined),
        [folderId]
    );

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            text: query,
        };

        setMessages((prev) => [...prev, userMsg]);
        setQuery("");
        setIsProcessing(true);

        try {
            // 1. Get Plan from Agent
            const res = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: userMsg.text,
                    currentContext: {
                        folderId: folderId || null,
                        folderName: currentFolder?.name || null,
                    }
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to contact Architect");

            const agentMsg: Message = {
                id: crypto.randomUUID(),
                role: "agent",
                text: data.message || "I'm on it.",
            };
            setMessages((prev) => [...prev, agentMsg]);

            // 2. Propose Plan (Don't Execute Yet)
            if (data.actions && data.actions.length > 0) {
                setPendingActions(data.actions);
            }

        } catch (e: any) {
            const errorMsg: Message = {
                id: crypto.randomUUID(),
                role: "system",
                text: `Error: ${e.message}`,
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = async () => {
        if (!pendingActions) return;
        setIsProcessing(true);
        setPendingActions(null); // Clear pending UI

        try {
            const logs = await executePlan(pendingActions);
            if (logs.length > 0) {
                const systemMsg: Message = {
                    id: crypto.randomUUID(),
                    role: "system",
                    text: `✅ Done! ${logs.join(", ")}`,
                };
                setMessages((prev) => [...prev, systemMsg]);
            }
        } catch (e: any) {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "system", text: `Error: ${e.message}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        setPendingActions(null);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "system", text: "Action cancelled." }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="pointer-events-auto bg-background border border-border rounded-xl shadow-2xl w-80 md:w-96 mb-4 overflow-hidden flex flex-col max-h-[500px]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    The Architect
                                </span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 min-h-[300px]"
                        >
                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-lg p-3 text-sm ${m.role === "user"
                                            ? "bg-foreground text-background"
                                            : m.role === "system"
                                                ? "bg-red-500/10 text-red-600 text-xs font-mono"
                                                : "bg-muted text-foreground border border-border"
                                            }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}

                            {/* Verification UI */}
                            {pendingActions && (
                                <div className="flex justify-start">
                                    <div className="bg-muted border border-indigo-500/30 rounded-lg p-3 text-sm flex flex-col gap-2 max-w-[85%]">
                                        <p className="font-semibold text-indigo-500 text-xs uppercase tracking-wide">Proposed Plan:</p>
                                        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                                            {pendingActions.map((action, i) => (
                                                <li key={i}>
                                                    {action.type === "CREATE_FOLDER" && `Create folder "${action.payload.name}"`}
                                                    {action.type === "ADD_WORD" && `Add "${action.payload.term}" to ${action.payload.folderName || "current folder"}`}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={handleConfirm}
                                                className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="bg-transparent border border-border text-foreground px-3 py-1.5 rounded text-xs font-bold hover:bg-muted transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isProcessing && (
                                <div className="flex justify-start">
                                    <div className="bg-muted text-foreground border border-border rounded-lg p-3 text-xs italic flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-border bg-background">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50"
                                    placeholder={pendingActions ? "Confirm or Cancel above..." : "Command the Architect..."}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !pendingActions && handleSend()}
                                    disabled={isProcessing || !!pendingActions}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!query.trim() || isProcessing || !!pendingActions}
                                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl hover:shadow-indigo-500/20 transition-shadow z-50 border-2 border-white/10"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 12v.01" /><path d="M12 16v.01" /></svg>
                )}
            </motion.button>
        </div>
    );
}

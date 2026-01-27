"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAgentAction,
  AgentAction,
  isReadAction,
} from "@/hooks/useAgentAction";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { v4 as uuidv4 } from "uuid";
import { AgentMessage, AgentSession } from "@/lib/types";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useSync } from "@/hooks/useSync";
import { LoginButton } from "@/components/LoginButton";

// Removed local Message interface in favor of AgentMessage

export default function AIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // AI Configuration from centralized hook
  const { config } = useAIConfig();
  const { triggerSync } = useSync();

  // Load active session on mount
  useEffect(() => {
    const loadLastSession = async () => {
      const lastSession = await db.agentSessions.orderBy("updatedAt").last();
      if (lastSession) {
        setSessionId(lastSession.id);
      }
    };
    loadLastSession();
  }, []);

  // Reactive Messages
  const messages = useLiveQuery(
    () =>
      sessionId
        ? db.agentMessages
            .where("sessionId")
            .equals(sessionId)
            .sortBy("createdAt")
        : [],
    [sessionId],
  );

  // Reactive History
  const sessions = useLiveQuery(
    () => db.agentSessions.orderBy("updatedAt").reverse().toArray(),
    [],
  );

  const [pendingActions, setPendingActions] = useState<AgentAction[] | null>(
    null,
  );
  const { executePlan, executeReadAction, undoLastPlan } = useAgentAction();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Context Awareness
  const params = useParams();
  const folderId = params?.folderId as string | undefined;
  const chunkIndex = params?.chunkIndex
    ? parseInt(params.chunkIndex as string)
    : undefined;

  const currentFolder = useLiveQuery(
    () => (folderId ? db.folders.get(folderId) : undefined),
    [folderId],
  );

  // Visible Words Calculation
  const visibleWords = useLiveQuery(async () => {
    if (!folderId) return [];

    // Get all words in folder, sorted by wordId (Must match FolderDetailPage logic)
    const wordFolders = await db.wordFolders
      .where("folderId")
      .equals(folderId)
      .toArray();
    wordFolders.sort((a, b) => a.wordId.localeCompare(b.wordId));

    // Determine slice range
    const CHUNK_SIZE = 15; // Must match FolderDetailPage
    let start = 0;
    let end = wordFolders.length;

    if (chunkIndex !== undefined) {
      start = chunkIndex * CHUNK_SIZE;
      end = start + CHUNK_SIZE;
    }

    const visibleIds = wordFolders.slice(start, end).map((wf) => wf.wordId);
    if (visibleIds.length === 0) return [];

    const words = await db.words.bulkGet(visibleIds);
    return words.filter((w) => !!w).map((w) => w!.term);
  }, [folderId, chunkIndex]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, showHistory]);

  const handleSend = async () => {
    if (!query.trim()) return;

    let activeSessionId = sessionId;
    const currentTimestamp = Date.now();

    // Create new session if none exists
    if (!activeSessionId) {
      activeSessionId = crypto.randomUUID();
      await db.agentSessions.add({
        id: activeSessionId,
        title: query.slice(0, 40) + (query.length > 40 ? "..." : ""),
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      });
      setSessionId(activeSessionId);
    } else {
      await db.agentSessions.update(activeSessionId, {
        updatedAt: currentTimestamp,
      });
    }

    // Add User Message
    await db.agentMessages.add({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      role: "user",
      text: query,
      createdAt: currentTimestamp,
    });

    const userQuery = query; // Capture for API call
    setQuery("");
    setIsProcessing(true);

    try {
      const { geminiKey: apiKey, geminiModel: model } = config;

      // ReAct Loop: Allow up to 3 iterations of read actions
      const MAX_ITERATIONS = 3;
      let iterations = 0;
      let toolResults: Record<string, string> = {};

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userQuery,
            apiKey: apiKey || undefined,
            model: model,
            currentContext: {
              folderId: folderId || null,
              folderName: currentFolder?.name || null,
              visibleWords: visibleWords || [],
            },
            messages: (messages || [])
              .slice(-10)
              .map((m) => ({ role: m.role, content: m.text })),
            toolResults:
              Object.keys(toolResults).length > 0 ? toolResults : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok)
          throw new Error(data.error || "Failed to contact Architect");

        const agentResponseText = data.message || "I'm on it.";
        const actions: AgentAction[] = data.actions || [];

        // Separate read and write actions
        const readActions = actions.filter(isReadAction);
        const writeActions = actions.filter((a) => !isReadAction(a));

        // If there are read actions, execute them and loop back
        if (readActions.length > 0) {
          console.log(
            `[ReAct] Executing ${readActions.length} read action(s)...`,
          );

          for (const action of readActions) {
            const result = await executeReadAction(action);
            if (result) {
              const key = `${action.type}_${JSON.stringify(action.payload)}`;
              toolResults[key] = result;
            }
          }

          // If there are ONLY read actions, continue the loop
          if (writeActions.length === 0) {
            continue;
          }
        }

        // We have write actions or no more read actions - show response
        await db.agentMessages.add({
          id: crypto.randomUUID(),
          sessionId: activeSessionId,
          role: "agent",
          text: agentResponseText,
          createdAt: Date.now(),
        });

        if (writeActions.length > 0) {
          setPendingActions(writeActions);
        }

        break; // Exit the loop - we're done
      }
    } catch (e: any) {
      await db.agentMessages.add({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        role: "system",
        text: `Error: ${e.message}`,
        createdAt: Date.now(),
      });
    } finally {
      setIsProcessing(false);
      triggerSync();
    }
  };

  const handleConfirm = async () => {
    if (!pendingActions || !sessionId) return;
    setIsProcessing(true);
    setPendingActions(null);

    try {
      const logs = await executePlan(pendingActions, sessionId);
      if (logs.length > 0) {
        await db.agentMessages.add({
          id: crypto.randomUUID(),
          sessionId: sessionId,
          role: "system",
          text: `✅ Done! ${logs.join(", ")}`,
          createdAt: Date.now(),
        });
        setCanUndo(true); // Enable undo for a short time
        setTimeout(() => setCanUndo(false), 30000); // Undo available for 30s
      }
    } catch (e: any) {
      await db.agentMessages.add({
        id: crypto.randomUUID(),
        sessionId: sessionId,
        role: "system",
        text: `Error: ${e.message}`,
        createdAt: Date.now(),
      });
    } finally {
      setIsProcessing(false);
      triggerSync();
    }
  };

  const handleUndo = async () => {
    if (!sessionId) return;
    setIsProcessing(true);
    setCanUndo(false);
    try {
      const logs = await undoLastPlan(sessionId);
      await db.agentMessages.add({
        id: crypto.randomUUID(),
        sessionId: sessionId,
        role: "system",
        text: `↩️ ${logs.join(", ")}`,
        createdAt: Date.now(),
      });
    } catch (e: any) {
      await db.agentMessages.add({
        id: crypto.randomUUID(),
        sessionId: sessionId,
        role: "system",
        text: `Undo Error: ${e.message}`,
        createdAt: Date.now(),
      });
    } finally {
      setIsProcessing(false);
      triggerSync();
    }
  };

  const handleCancel = async () => {
    setPendingActions(null);
    if (sessionId) {
      await db.agentMessages.add({
        id: crypto.randomUUID(),
        sessionId: sessionId,
        role: "system",
        text: "Action cancelled.",
        createdAt: Date.now(),
      });
    }
  };

  const handleDeleteMessage = (id: string) => {
    db.agentMessages.delete(id);
  };

  const handleNewChat = () => {
    setSessionId(null);
    setPendingActions(null);
    setShowHistory(false);
  };

  const selectSession = (id: string) => {
    setSessionId(id);
    setShowHistory(false);
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
                  {showHistory ? "History" : "The Architect"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <LoginButton />
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1 text-muted-foreground hover:text-indigo-500 transition-colors"
                  title="Chat History"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20v-6M6 20V10M18 20V4" />
                  </svg>
                </button>
                <button
                  onClick={handleNewChat}
                  className="p-1 text-muted-foreground hover:text-green-500 transition-colors"
                  title="New Chat"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-2 bg-muted/5 min-h-[300px]">
                {sessions?.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground p-4">
                    No history yet.
                  </p>
                )}
                <div className="space-y-1">
                  {sessions?.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs hover:bg-muted/50 transition-colors flex flex-col gap-1 ${sessionId === session.id ? "bg-indigo-500/10 border border-indigo-500/20" : ""}`}
                    >
                      <span className="font-medium truncate">
                        {session.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 min-h-[300px]"
              >
                {!messages || messages.length === 0 ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg p-3 text-sm bg-muted text-foreground border border-border">
                      I'm the Architect. I can build folders and add words for
                      you. Try 'Create a Biology folder'.
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex group/msg relative ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 text-sm relative ${
                          m.role === "user"
                            ? "bg-foreground text-background"
                            : m.role === "system"
                              ? "bg-red-500/10 text-red-600 text-xs font-mono"
                              : "bg-muted text-foreground border border-border"
                        }`}
                      >
                        {m.role === "agent" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 mb-2">
                                    {children}
                                  </ul>
                                ),
                                li: ({ children }) => (
                                  <li className="mb-0">{children}</li>
                                ),
                              }}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          m.text
                        )}

                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className={`absolute -top-2 p-1 bg-background border border-border rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity hover:text-red-500 shadow-sm z-10 ${
                            m.role === "user" ? "-left-2" : "-right-2"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
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
                    </div>
                  ))
                )}

                {/* Verification UI */}
                {pendingActions && (
                  <div className="flex justify-start">
                    <div className="bg-muted border border-indigo-500/30 rounded-lg p-3 text-sm flex flex-col gap-2 max-w-[85%]">
                      <p className="font-semibold text-indigo-500 text-xs uppercase tracking-wide">
                        Proposed Plan:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                        {pendingActions.map((action, i) => (
                          <li key={i}>
                            {action.type === "CREATE_FOLDER" &&
                              `Create folder "${action.payload?.name || "unnamed"}"`}
                            {action.type === "ADD_WORD" &&
                              `Add "${action.payload?.term || "unknown term"}" to ${action.payload?.folderName || "current folder"}`}
                            {action.type === "DELETE_ITEM" &&
                              `Delete ${action.payload?.type} (ID: ${action.payload?.id})`}
                            {action.type === "RENAME_ITEM" &&
                              `Rename ${action.payload?.type} to "${action.payload?.newName}"`}
                            {action.type === "MOVE_ITEM" &&
                              `Move ${action.payload?.type} to folder ${action.payload?.targetFolderId}`}
                            {action.type === "NAVIGATE_TO" &&
                              `Navigate to ${action.payload?.view}`}
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
                      <span
                        className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}

                {canUndo && !isProcessing && (
                  <div className="flex justify-start">
                    <button
                      onClick={handleUndo}
                      className="bg-amber-500/20 text-amber-600 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Undo Last Action
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border bg-background">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50"
                  placeholder={
                    pendingActions
                      ? "Confirm or Cancel above..."
                      : "Command the Architect..."
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !pendingActions && handleSend()
                  }
                  disabled={isProcessing || !!pendingActions}
                />
                <button
                  onClick={handleSend}
                  disabled={!query.trim() || isProcessing || !!pendingActions}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
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
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 12v.01" />
            <path d="M12 16v.01" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}

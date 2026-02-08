"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentAction, isReadAction } from "@/hooks/useAgentAction";
import { AgentAction, ToolResult, ToolName } from "@/lib/types";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { AgentMessage, AgentSession } from "@/lib/types";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useSync } from "@/hooks/useSync";

interface AIWidgetOpenEvent extends CustomEvent {
  detail: {
    query?: string;
    mode?: "auto" | "ARCHITECT" | "SCHOLAR" | "NONE";
  };
}

interface TriggerAgentQueryEvent extends CustomEvent {
  detail: {
    query?: string;
    autoSend?: boolean;
  };
}

// Payload Interfaces for casting
interface CreateFolderPayload {
  name: string;
  emoji?: string;
  color?: string;
}
interface AddWordPayload {
  term: string;
  folderName?: string;
}
interface DeleteItemPayload {
  type: string;
  id: string;
}
interface RenameItemPayload {
  type: string;
  id: string;
  newName: string;
}
interface MoveItemPayload {
  type: string;
  id: string;
  targetFolderId: string;
}
interface NavigateToPayload {
  view: string;
  id?: string;
}
interface UpdateFolderMetadataPayload {
  id: string;
  emoji?: string;
  color?: string;
}
interface UpdateWordMetadataPayload {
  id?: string;
  term?: string;
  color?: string;
}
interface NotePayload {
  id?: string;
  title?: string;
  content?: string;
  folderId?: string;
  folderName?: string;
}
interface CreateDoubtPayload {
  term?: string;
  folderName?: string;
  query: string;
  folderId?: string;
}

// Removed local Message interface in favor of AgentMessage

export default function AIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [agentMode, setAgentMode] = useState<
    "auto" | "ARCHITECT" | "SCHOLAR" | "NONE"
  >("NONE");
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI Configuration from centralized hook
  const { config } = useAIConfig();
  const { triggerSync } = useSync();

  // Resize State
  const [width, setWidth] = useState(384); // Default w-96 = 384px
  const [height, setHeight] = useState(500); // Default max-h-[500px]
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);

  // Reset size when closed
  // Load size from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem("ai-widget-width");
    const savedHeight = localStorage.getItem("ai-widget-height");
    if (savedWidth) setWidth(parseInt(savedWidth, 10));
    if (savedHeight) setHeight(parseInt(savedHeight, 10));
  }, []);

  // Save size when it changes (debounced/effect)
  useEffect(() => {
    localStorage.setItem("ai-widget-width", width.toString());
    localStorage.setItem("ai-widget-height", height.toString());
  }, [width, height]);

  // Global Open Event
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as AIWidgetOpenEvent;
      const { query: incomingQuery, mode } = customEvent.detail || {};
      setIsOpen(true);
      if (mode) setAgentMode(mode);
      if (incomingQuery) {
        setQuery(incomingQuery);
        // Delay slightly to allow state to settle if we wanted to auto-send,
        // but for now, just filling the query box and focusing is good.
      }
    };
    window.addEventListener("ai-widget-open", handleOpenEvent);
    return () => window.removeEventListener("ai-widget-open", handleOpenEvent);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle AI Widget: Cmd + J or Ctrl + J
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Minimize: Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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

  // Resize Handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const startResizingHeight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHeight(true);
  }, []);

  const startResizingCorner = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setIsResizingHeight(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setIsResizingHeight(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX - 24; // 24px right margin
        if (newWidth > 320 && newWidth < 800) {
          setWidth(newWidth);
        }
      }
      if (isResizingHeight) {
        // Calculate height based on distance from bottom
        // Widget bottom is at approx 40px from viewport bottom (bottom-6 + mb-4)
        const newHeight = window.innerHeight - e.clientY - 40;
        if (newHeight > 300 && newHeight < window.innerHeight - 100) {
          setHeight(newHeight);
        }
      }
    },
    [isResizing, isResizingHeight],
  );

  useEffect(() => {
    if (isResizing || isResizingHeight) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, isResizingHeight, resize, stopResizing]);

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
  const { executePlan, executeReadAction, executeToolCall, undoLastPlan } =
    useAgentAction();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);

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

  // Visible Words Calculation - Send all words in the folder to the AI context
  const visibleWords = useLiveQuery(async () => {
    if (!folderId) return [];

    const wordFolders = await db.wordFolders
      .where("folderId")
      .equals(folderId)
      .toArray();

    const wordIds = wordFolders.map((wf) => wf.wordId);
    if (wordIds.length === 0) return [];

    const words = await db.words.bulkGet(wordIds);
    return words.filter((w) => !!w).map((w) => ({ id: w!.id, term: w!.term }));
  }, [folderId]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      // Only auto-scroll if user is already near the bottom (within 100px)
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;

      if (isNearBottom) {
        const now = Date.now();
        if (now - lastScrollTime.current > 200) {
          lastScrollTime.current = now;
          el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }
  }, [messages, isOpen, showHistory]);

  const performAgentLoop = async (
    query: string,
    sessionId: string,
    agentMessageId: string,
    toolResults?: Record<string, ToolResult>,
  ) => {
    try {
      const { geminiKey: apiKey, geminiModel: model } = config;

      // Use streaming endpoint
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({
          query,
          apiKey: apiKey || undefined,
          model: model,
          provider: config.provider,
          lmStudioBaseUrl: config.lmStudioBaseUrl,
          lmStudioModel: config.lmStudioModel,
          agentMode: agentMode,
          toolResults, // Pass tool results if any
          currentContext: {
            folderId: folderId || null,
            folderName: currentFolder?.name || null,
            visibleWords: visibleWords || [],
          },
          messages: (messages || [])
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      console.log("[AIWidget] Sent context:", {
        folderId,
        folderName: currentFolder?.name,
        visibleWordsCount: visibleWords?.length || 0,
        hasToolResults: !!toolResults,
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to contact Agent");
      }

      // Process SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              if (data.type === "delta" && data.content) {
                streamedText += data.content;
                await db.agentMessages.update(agentMessageId, {
                  text: streamedText,
                });
              } else if (data.type === "end") {
                const finalMessage = data.message || streamedText;
                await db.agentMessages.update(agentMessageId, {
                  text: finalMessage,
                });

                const actions: AgentAction[] = data.actions || [];
                console.log("[AIWidget] Received actions:", actions.length);

                // Check for TOOL_CALLS
                const toolCalls = actions.filter((a) => a.type === "TOOL_CALL");
                if (toolCalls.length > 0) {
                  // Execute Tools
                  const results: Record<string, ToolResult> = {};
                  for (const call of toolCalls) {
                    const { tool, params } = call.payload as {
                      tool: ToolName;
                      params: Record<string, unknown>;
                    };
                    // Update UI
                    await db.agentMessages.update(agentMessageId, {
                      text: finalMessage + `\n\n*Running tool: ${tool}...*`,
                    });

                    const result = await executeToolCall(tool, params);
                    results[tool] = result;
                  }

                  // Recursive Loop
                  await performAgentLoop(
                    query,
                    sessionId,
                    agentMessageId,
                    results,
                  );
                  return;
                }

                const readActions = actions.filter(isReadAction);
                const writeActions = actions.filter(
                  (a) => !isReadAction(a) && a.type !== "TOOL_CALL",
                );

                // Execute read actions
                for (const action of readActions) {
                  await executeReadAction(action);
                }

                // Set pending write actions
                if (writeActions.length > 0) {
                  setPendingActions(writeActions);
                }
              } else if (data.type === "error") {
                throw new Error(data.error || "Stream error");
              }
            } catch (e: unknown) {
              console.warn("Error parsing SSE:", e);
            }
          }
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      // If aborted, don't log error
      if (e.name === "AbortError") return;

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

  const handleSend = async (forcedQuery?: string) => {
    const activeQuery = forcedQuery || query;
    if (!activeQuery.trim()) return;

    let activeSessionId = sessionId;
    const currentTimestamp = Date.now();

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

    await db.agentMessages.add({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      role: "user",
      text: query,
      createdAt: currentTimestamp,
    });

    const userQuery = activeQuery;
    if (!forcedQuery) setQuery("");
    setIsProcessing(true);

    abortControllerRef.current = new AbortController();

    const agentMessageId = crypto.randomUUID();
    await db.agentMessages.add({
      id: agentMessageId,
      sessionId: activeSessionId,
      role: "agent",
      text: "",
      createdAt: Date.now(),
    });

    await performAgentLoop(userQuery, activeSessionId, agentMessageId);
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
    } catch (err: unknown) {
      const e = err as Error;
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
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
    } catch (err: unknown) {
      const e = err as Error;
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

  const handleSaveAsNote = async (content: string, title: string) => {
    if (!folderId) {
      alert("Please navigate to a folder to save notes.");
      return;
    }
    await db.notes.add({
      id: crypto.randomUUID(),
      folderId,
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // Optional: Visual feedback
  };

  // Handle external query requests (e.g. from NoteModal Study button)
  useEffect(() => {
    const handleTriggerQuery = (e: Event) => {
      const customEvent = e as TriggerAgentQueryEvent;
      const { query: incomingQuery, autoSend } = customEvent.detail || {};
      if (incomingQuery) {
        setIsOpen(true);
        setQuery(incomingQuery);
        if (autoSend) {
          handleSend(incomingQuery);
        }
      }
    };
    window.addEventListener("trigger-agent-query", handleTriggerQuery);
    return () =>
      window.removeEventListener("trigger-agent-query", handleTriggerQuery);
  }, [handleSend]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto bg-background border border-border rounded-xl shadow-2xl mb-4 overflow-hidden flex flex-col relative transition-[width] duration-0 ease-linear"
            style={{ width, height }}
          >
            {/* Width Resizer Handle (Left) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-indigo-500/50 transition-colors z-50 flex items-center justify-center group"
              onMouseDown={startResizing}
            >
              <div className="h-8 w-0.5 bg-border group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>

            {/* Height Resizer Handle (Top) */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-indigo-500/50 transition-colors z-50 flex items-center justify-center group"
              onMouseDown={startResizingHeight}
            >
              <div className="w-8 h-0.5 bg-border group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>

            {/* Corner Resizer Handle (Top-Left) */}
            <div
              className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-51 hover:bg-indigo-500/50 transition-colors rounded-br-lg"
              onMouseDown={startResizingCorner}
            >
              <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-border group-hover:border-indigo-500 rounded-tl-sm" />
            </div>

            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {showHistory
                      ? "History"
                      : agentMode === "ARCHITECT"
                        ? "Architect"
                        : agentMode === "SCHOLAR"
                          ? "Scholar"
                          : agentMode === "NONE"
                            ? "Raw Chat"
                            : "Agent"}
                  </span>
                  {!showHistory && (
                    <span className="text-[10px] text-muted-foreground font-mono opacity-60 truncate max-w-[100px]">
                      •{" "}
                      {config.provider === "gemini"
                        ? config.geminiModel
                        : config.lmStudioModel || "Local"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
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
              {!showHistory && (
                <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5 self-start">
                  <button
                    onClick={() => setAgentMode("auto")}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${agentMode === "auto" ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                    title="Auto-detect intent"
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setAgentMode("ARCHITECT")}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${agentMode === "ARCHITECT" ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                    title="Force Architect mode (actions)"
                  >
                    Build
                  </button>
                  <button
                    onClick={() => setAgentMode("SCHOLAR")}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${agentMode === "SCHOLAR" ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                    title="Force Scholar mode (explain)"
                  >
                    Ask
                  </button>
                  <button
                    onClick={() => setAgentMode("NONE")}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${agentMode === "NONE" ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                    title="No system prompt, just chat"
                  >
                    Raw
                  </button>
                </div>
              )}
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
                      I&apos;m the Architect. I can build folders and add words
                      for you. Try &apos;Create a Biology folder&apos;.
                    </div>
                  </div>
                ) : (
                  messages.map((m, index) => (
                    <div
                      key={m.id}
                      className={`flex group/msg relative ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 text-sm relative selection:bg-indigo-500/30 selection:text-current ${
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

                        {/* Save as Note Button (Agent only) */}
                        {m.role === "agent" &&
                          index > 0 &&
                          messages[index - 1].role === "user" && (
                            <button
                              onClick={() =>
                                handleSaveAsNote(
                                  m.text,
                                  messages[index - 1].text,
                                )
                              }
                              className="absolute -top-2 -right-8 p-1 bg-background border border-border rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity hover:text-indigo-500 shadow-sm z-10"
                              title="Save response as Note"
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
                                <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
                                <path d="M15 3v5h5" />
                              </svg>
                            </button>
                          )}
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
                              `Create folder "${(action.payload as CreateFolderPayload)?.name || "unnamed"}"`}
                            {action.type === "ADD_WORD" &&
                              `Add "${(action.payload as AddWordPayload)?.term || "unknown term"}" to ${(action.payload as AddWordPayload)?.folderName || "current folder"}`}
                            {action.type === "DELETE_ITEM" &&
                              `Delete ${(action.payload as DeleteItemPayload)?.type} (ID: ${(action.payload as DeleteItemPayload)?.id})`}
                            {action.type === "RENAME_ITEM" &&
                              `Rename ${(action.payload as RenameItemPayload)?.type} to "${(action.payload as RenameItemPayload)?.newName}"`}
                            {action.type === "MOVE_ITEM" &&
                              `Move ${(action.payload as MoveItemPayload)?.type} to folder ${(action.payload as MoveItemPayload)?.targetFolderId}`}
                            {action.type === "NAVIGATE_TO" &&
                              `Navigate to ${(action.payload as NavigateToPayload)?.view}`}
                            {action.type === "UPDATE_FOLDER_METADATA" &&
                              `Update folder ${(action.payload as UpdateFolderMetadataPayload)?.id} aesthetics`}
                            {action.type === "UPDATE_WORD_METADATA" &&
                              `Color word "${(action.payload as UpdateWordMetadataPayload)?.term || (action.payload as UpdateWordMetadataPayload)?.id}"`}
                            {action.type === "CREATE_NOTE" &&
                              `Create note "${(action.payload as NotePayload)?.title}"`}
                            {action.type === "UPDATE_NOTE" &&
                              `Update note "${(action.payload as NotePayload)?.id}"`}
                            {action.type === "DELETE_NOTE" &&
                              `Delete note "${(action.payload as NotePayload)?.id}"`}
                            {action.type === "CREATE_DOUBT" &&
                              `Ask about "${(action.payload as CreateDoubtPayload)?.term || (action.payload as CreateDoubtPayload)?.query}"`}
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
                    <div className="bg-muted text-foreground border border-border rounded-lg p-3 text-xs italic flex items-center gap-3">
                      <div className="flex items-center gap-2">
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
                      <button
                        onClick={handleStop}
                        className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-[10px] font-bold uppercase hover:bg-red-500/30 transition-colors"
                      >
                        Stop
                      </button>
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
                  onClick={() => handleSend()}
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

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  initialTitle?: string;
  initialContent?: string;
  isEditing?: boolean;
}

export default function NoteModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = "",
  initialContent = "",
  isEditing = false,
}: NoteModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  // Resize State
  const [width, setWidth] = useState(896); // Default max-w-4xl approx
  const [height, setHeight] = useState(600); // Default approx 80vh
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);

  // Load size
  useEffect(() => {
    const savedWidth = localStorage.getItem("note-modal-width");
    const savedHeight = localStorage.getItem("note-modal-height");
    if (savedWidth) setWidth(parseInt(savedWidth, 10));
    if (savedHeight) setHeight(parseInt(savedHeight, 10));
  }, []);

  // Save size
  useEffect(() => {
    localStorage.setItem("note-modal-width", width.toString());
    localStorage.setItem("note-modal-height", height.toString());
  }, [width, height]);

  // Handle Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
        // Calculate width: Center is window.innerWidth/2.
        // We are resizing logically from the right edge?
        // Actually NoteModal is centered. This makes standard resizing tricky.
        // If we want simple resizing, maybe we should just track mouse delta?
        // Simpler: Just set width based on mouse X position relative to the left of the modal?
        // OR, since it's centered, `width = (e.clientX - center) * 2`?
        // Let's assume standard behavior: dragging right edge increases width.

        // Since it's centered, if I drag the right edge to the right, the whole thing grows.
        // But `flex items-center justify-center` handles the centering.
        // So if I increase width, it stays centered.
        // Is the mouse position `e.clientX` reflecting the new right edge?
        // Yes, provided the user dragged the right handle.

        // Current Right Edge X = window.innerWidth / 2 + width / 2
        // New Right Edge X = e.clientX
        // So: width / 2 = e.clientX - window.innerWidth / 2
        // width = 2 * (e.clientX - window.innerWidth / 2)

        const newWidth = 2 * (e.clientX - window.innerWidth / 2);
        if (newWidth > 320 && newWidth < window.innerWidth - 40) {
          setWidth(newWidth);
        }
      }
      if (isResizingHeight) {
        // Centered vertically? "flex items-center" -> Yes.
        // Similar logic.
        // width / 2 logic applies to height / 2.
        const newHeight = 2 * (e.clientY - window.innerHeight / 2);
        if (newHeight > 300 && newHeight < window.innerHeight - 40) {
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

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setMode(isEditing ? "preview" : "edit");
    }
  }, [isOpen, initialTitle, initialContent, isEditing]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title, content);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ width, height }}
              className="bg-background border border-border rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden relative"
            >
              {/* Right Resizer Handle */}
              <div
                className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-indigo-500/20 z-50 transition-colors"
                onMouseDown={startResizing}
              />
              {/* Bottom Resizer Handle */}
              <div
                className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize hover:bg-indigo-500/20 z-50 transition-colors"
                onMouseDown={startResizingHeight}
              />
              {/* Corner Resizer Handle (Bottom-Right) */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 hover:bg-indigo-500/50 transition-colors rounded-tl-lg"
                onMouseDown={startResizingCorner}
              >
                <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-border group-hover:border-indigo-500 rounded-br-sm" />
              </div>
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-4 flex-1">
                  <h2 className="text-lg font-semibold">
                    {isEditing ? "Edit Note" : "New Note"}
                  </h2>
                  <div className="flex bg-muted rounded-md p-1 border border-border">
                    <button
                      onClick={() => setMode("edit")}
                      className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                        mode === "edit"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      onClick={() => setMode("preview")}
                      className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                        mode === "preview"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {content.trim() && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("trigger-agent-query", {
                            detail: {
                              query: `Generate study points (ADD_WORD or CREATE_DOUBT) for this note: "${title}"\n\nContent:\n${content}`,
                              autoSend: true,
                            },
                          }),
                        );
                      }}
                      className="p-1.5 px-2.5 text-indigo-500 hover:bg-indigo-500/10 rounded-md transition-all flex items-center gap-1.5 text-xs font-bold border border-indigo-500/20 mr-2"
                      title="AI Study Mode"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m12 14 4-4" />
                        <path d="m3.34 19 1.4-1.4" />
                        <path d="m19.07 4.93-1.41 1.41" />
                        <path d="M7.83 7.83 6.41 6.41" />
                        <path d="m10.5 10.5-2.97 2.97a1.5 1.5 0 1 0 2.12 2.12L12.62 12.62" />
                        <path d="M12 4h.01" />
                        <path d="M20 12h.01" />
                        <path d="M4 12h.01" />
                        <path d="M12 20h.01" />
                        <path d="m16.16 16.16 1.41 1.41" />
                      </svg>
                      Study Mode
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Title Input */}
                <div className="p-4 pb-0">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note Title"
                    className="w-full bg-transparent text-xl font-bold placeholder:text-muted-foreground/50 border-none focus:outline-none focus:ring-0 px-0"
                    autoFocus
                  />
                </div>

                {/* Editor / Preview */}
                <div className="flex-1 overflow-auto p-4">
                  {mode === "edit" ? (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="# Start writing with markdown..."
                      className="w-full h-full bg-transparent resize-none border-none focus:outline-none focus:ring-0 p-0 font-mono text-sm leading-relaxed"
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold mb-4 mt-2 border-b pb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-bold mb-3 mt-4">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold mb-2 mt-3">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-6 mb-4 space-y-1">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-6 mb-4 space-y-1">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="pl-1 marker:text-muted-foreground">
                              {children}
                            </li>
                          ),
                          p: ({ children }) => (
                            <p className="mb-4 leading-relaxed text-justify">
                              {children}
                            </p>
                          ),
                          code: ({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }: {
                            node?: any;
                            inline?: boolean;
                            className?: string;
                            children?: React.ReactNode;
                          }) => {
                            return inline ? (
                              <code
                                className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-indigo-500"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <code
                                className="block bg-muted/50 p-4 rounded-lg text-sm font-mono overflow-x-auto border border-border my-4"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-indigo-500/30 pl-4 italic text-muted-foreground my-4">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {content || "*No content*"}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

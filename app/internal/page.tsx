"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface DocFile {
  name: string;
  path: string;
  category: "SSOT" | "Workflow" | "Project Docs" | "Other";
}

export default function InternalDocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const docs: DocFile[] = [
    // SSOT Documents
    {
      name: "SSOT: Codebase Overview",
      path: ".agent/SSOT_CODEBASE.md",
      category: "SSOT",
    },
    {
      name: "SSOT: Database Schema",
      path: ".agent/SSOT_DATABASE.md",
      category: "SSOT",
    },
    {
      name: "SSOT: AI System",
      path: ".agent/SSOT_AI_SYSTEM.md",
      category: "SSOT",
    },
    {
      name: "SSOT: Components",
      path: ".agent/SSOT_COMPONENTS.md",
      category: "SSOT",
    },
    { name: "Agent README", path: ".agent/README.md", category: "SSOT" },

    // Workflows
    {
      name: "Development Workflow",
      path: ".agent/workflows/development.md",
      category: "Workflow",
    },
    {
      name: "Testing Workflow",
      path: ".agent/workflows/testing.md",
      category: "Workflow",
    },
    {
      name: "Database Operations",
      path: ".agent/workflows/database-operations.md",
      category: "Workflow",
    },
    {
      name: "AI Debugging",
      path: ".agent/workflows/ai-debugging.md",
      category: "Workflow",
    },

    // Project Docs
    { name: "README", path: "README.md", category: "Project Docs" },
    {
      name: "Architecture",
      path: "docs/architecture.md",
      category: "Project Docs",
    },
    {
      name: "Database Schema",
      path: "docs/database.md",
      category: "Project Docs",
    },
    {
      name: "Terminal Roadmap",
      path: "docs/terminal_roadmap.md",
      category: "Project Docs",
    },
    {
      name: "AI Features",
      path: "docs/ai-features.md",
      category: "Project Docs",
    },
    {
      name: "Possible Features",
      path: "docs/Possible_features.md",
      category: "Project Docs",
    },
    { name: "V2 Specs", path: "docs/v2_specs.md", category: "Project Docs" },
    {
      name: "Brutalist Theme",
      path: "docs/brutalist-theme.md",
      category: "Project Docs",
    },
    {
      name: "Neubrutalist Theme",
      path: "docs/neubrutalist-theme.md",
      category: "Project Docs",
    },
  ];

  const loadMarkdown = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/internal/docs?path=${encodeURIComponent(path)}`,
      );
      if (response.ok) {
        const text = await response.text();
        setMarkdown(text);
        setSelectedDoc(path);
      } else {
        setMarkdown("# Error\n\nFailed to load document.");
      }
    } catch (error) {
      setMarkdown("# Error\n\nFailed to fetch document.");
    }
    setLoading(false);
  };

  // Load first doc on mount
  useEffect(() => {
    if (!selectedDoc && docs.length > 0) {
      loadMarkdown(docs[0].path);
    }
  }, []);

  const filteredDocs = docs.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const groupedDocs = filteredDocs.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, DocFile[]>,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📚 Internal Documentation</h1>
              <p className="text-sm text-muted-foreground mt-1">
                SSOT, Workflows, and Project Docs
              </p>
            </div>
            <Link
              href="/"
              className="px-6 py-2 bg-foreground text-background rounded-xl font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-lg"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-muted/30 rounded-2xl shadow-sm border border-border sticky top-24 overflow-hidden">
              {/* Search */}
              <div className="p-4 border-b border-border">
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 ring-blue-500/50 transition-all text-sm font-medium"
                />
              </div>

              {/* Document List */}
              <div className="p-2 max-h-[calc(100vh-240px)] overflow-y-auto no-scrollbar">
                {Object.entries(groupedDocs).map(([category, categoryDocs]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {categoryDocs.map((doc) => (
                        <button
                          key={doc.path}
                          onClick={() => loadMarkdown(doc.path)}
                          className={`
                            w-full text-left px-4 py-2 rounded-xl text-sm transition-all
                            ${
                              selectedDoc === doc.path
                                ? "bg-foreground text-background font-bold shadow-md scale-[1.02]"
                                : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                            }
                          `}
                        >
                          {doc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-background rounded-2xl shadow-sm border border-border p-8 md:p-12 min-h-[70vh]">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-foreground"></div>
                </div>
              ) : (
                <article className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                  </ReactMarkdown>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

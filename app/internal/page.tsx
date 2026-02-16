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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                📚 Internal Documentation
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                SSOT, Workflows, and Project Docs
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-24">
              {/* Search */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Document List */}
              <div className="p-2 max-h-[calc(100vh-240px)] overflow-y-auto">
                {Object.entries(groupedDocs).map(([category, categoryDocs]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {categoryDocs.map((doc) => (
                        <button
                          key={doc.path}
                          onClick={() => loadMarkdown(doc.path)}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg text-sm transition
                            ${
                              selectedDoc === doc.path
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <article className="prose prose-slate dark:prose-invert max-w-none">
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

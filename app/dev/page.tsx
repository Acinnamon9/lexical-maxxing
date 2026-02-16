"use client";

import {
  ARCHITECT_SYSTEM_PROMPT,
  SCHOLAR_SYSTEM_PROMPT,
  CLARIFIER_DEFAULT_PROMPT,
  WORD_DEFINER_PROMPT,
} from "@/lib/ai/prompts";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function DevPage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-12 pb-24">
      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight">
          Developer Console
        </h1>
        <p className="text-muted-foreground text-lg">
          Inspect system prompts and tool definitions used by the AI agents.
        </p>
      </div>

      <div className="grid gap-12">
        <PromptSection
          title="Architect Agent"
          description="The state controller responsible for structural changes (folders, words, etc). Contains all tool definitions."
          content={ARCHITECT_SYSTEM_PROMPT}
          badge="Core System"
        />
        <PromptSection
          title="Scholar Agent"
          description="The knowledge assistant for explanations and teaching. Read-only capabilities."
          content={SCHOLAR_SYSTEM_PROMPT}
          badge="Knowledge"
        />
        <PromptSection
          title="Clarifier"
          description="Lightweight prompt for quick word clarifications."
          content={CLARIFIER_DEFAULT_PROMPT}
          badge="Utility"
        />
        <PromptSection
          title="Word Definer"
          description="Strict dictionary definition prompt."
          content={WORD_DEFINER_PROMPT}
          badge="Utility"
        />
      </div>
    </div>
  );
}

function PromptSection({
  title,
  description,
  content,
  badge,
}: {
  title: string;
  description: string;
  content: string;
  badge?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium min-w-[70px]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div
        className={`bg-muted/30 rounded-xl border border-border overflow-hidden transition-all duration-300 ${isExpanded ? "" : "max-h-[300px] relative"}`}
      >
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-10 flex items-end justify-center pb-4">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs font-bold bg-background border border-border px-4 py-2 rounded-full shadow-sm hover:bg-muted transition-colors"
            >
              Show Full Prompt
            </button>
          </div>
        )}
        <div className="p-6 overflow-x-auto text-xs text-muted-foreground leading-relaxed">
          <ReactMarkdown
            components={{
              pre: ({ node, ...props }) => (
                <pre
                  className="bg-muted p-2 rounded-md overflow-x-auto my-2"
                  {...props}
                />
              ),
              code: ({ node, ...props }) => (
                <code
                  className="bg-muted px-1 py-0.5 rounded text-primary font-mono"
                  {...props}
                />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

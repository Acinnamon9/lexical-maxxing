"use client";

import { motion } from "framer-motion";
import { useAIConfig } from "@/hooks/useAIConfig";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AIConfigSection() {
  const { config, updateKey, updateModel, updatePrePrompt, loading } =
    useAIConfig();

  return (
    <motion.section variants={item} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        AI Configuration
      </h2>
      <div className="grid gap-2">
        <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3 relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Gemini API Key</p>
              <p className="text-xs text-muted-foreground">
                Used for AI Clarifications
              </p>
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
            value={config.geminiKey}
            onChange={(e) => updateKey(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 transition-all font-mono"
            placeholder="Paste your API key here..."
          />

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Default Model
            </label>
            <select
              value={config.geminiModel}
              onChange={(e) => updateModel(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 appearance-none transition-all cursor-pointer"
            >
              <optgroup label="Gemini 3 (Latest)">
                <option value="gemini-3-pro-preview">
                  Gemini 3 Pro Preview
                </option>
                <option value="gemini-3-flash-preview">
                  Gemini 3 Flash Preview
                </option>
              </optgroup>
              <optgroup label="Gemini 2.5">
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-lite">
                  Gemini 2.5 Flash-Lite
                </option>
              </optgroup>
              <optgroup label="Gemini 2.0 (Legacy)">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.0-flash-lite">
                  Gemini 2.0 Flash-Lite
                </option>
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
              value={config.geminiPrePrompt}
              onChange={(e) => updatePrePrompt(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 transition-all font-sans min-h-[100px] resize-y"
              placeholder="You are an expert etymologist and linguist... (Leave blank for default instructions)"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Define how the AI should respond. You can set the persona, tone,
              and specific formatting rules here.
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Your key is stored locally in your browser and never sent to our
            servers.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

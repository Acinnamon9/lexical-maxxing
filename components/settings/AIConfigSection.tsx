"use client";

import { motion } from "framer-motion";
import { useAIConfig } from "@/hooks/useAIConfig";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AIConfigSection() {
  const {
    config,
    updateProvider,
    updateKey,
    updateModel,
    updatePrePrompt,
    updateLmBaseUrl,
    updateLmModel,
    availableLmModels,
    fetchingModels,
    fetchLmModels,
    loading,
  } = useAIConfig();

  return (
    <motion.section variants={item} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        AI Configuration
      </h2>
      <div className="grid gap-2">
        <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Provider
            </label>
            <div className="flex bg-background border border-border rounded-xl p-1 gap-1">
              <button
                onClick={() => updateProvider("gemini")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  config.provider === "gemini"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Gemini
              </button>
              <button
                onClick={() => updateProvider("lmstudio")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  config.provider === "lmstudio"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                LM Studio
              </button>
            </div>
          </div>

          {config.provider === "gemini" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Gemini API Key</p>
                    <p className="text-xs text-muted-foreground">
                      Cloud-based AI features
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
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Gemini Model
                </label>
                <select
                  value={config.geminiModel}
                  onChange={(e) => updateModel(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 appearance-none transition-all cursor-pointer"
                >
                  <optgroup label="Gemini 2.5">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </optgroup>
                  <optgroup label="Standard Models">
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </optgroup>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Local Server URL</p>
                  <p className="text-xs text-muted-foreground">
                    Address of your LM Studio instance
                  </p>
                </div>
                <input
                  type="text"
                  value={config.lmStudioBaseUrl}
                  onChange={(e) => updateLmBaseUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-foreground/20 transition-all font-mono"
                  placeholder="http://localhost:1234/v1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Local Model
                  </label>
                  <button
                    onClick={() =>
                      (fetchLmModels as (baseUrl?: string) => Promise<void>)()
                    }
                    disabled={fetchingModels}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={fetchingModels ? "animate-spin" : ""}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    {fetchingModels ? "REFRESHING..." : "REFRESH MODELS"}
                  </button>
                </div>

                {availableLmModels.length > 0 ? (
                  <select
                    value={config.lmStudioModel}
                    onChange={(e) => updateLmModel(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-foreground/20 appearance-none transition-all cursor-pointer"
                  >
                    {availableLmModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="">-- Enter Manually --</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={config.lmStudioModel}
                    onChange={(e) => updateLmModel(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-foreground/20 transition-all font-mono"
                    placeholder="e.g. qwen2.5-7b-instruct"
                  />
                )}
                {!availableLmModels.length && !fetchingModels && (
                  <p className="text-[10px] text-muted-foreground">
                    No models detected. Ensure LM Studio server is running.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
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
              Define how the AI should respond. Shared across both cloud and
              local providers.
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Configuration is stored locally. API keys and local URLs are never
            sent to our servers.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

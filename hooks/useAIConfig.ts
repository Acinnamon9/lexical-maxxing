"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export interface AIConfig {
  geminiKey: string;
  geminiModel: string;
  geminiPrePrompt: string;
}

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>({
    geminiKey: "",
    geminiModel: "gemini-1.5-flash", // Default
    geminiPrePrompt: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Fetch from DB
      const [dbKey, dbModel, dbPrompt] = await Promise.all([
        db.userSettings.get("gemini_api_key"),
        db.userSettings.get("gemini_model"),
        db.userSettings.get("gemini_pre_prompt"),
      ]);

      // Determine values (DB > LocalStorage > Default)
      const finalKey =
        dbKey?.value || localStorage.getItem("gemini_api_key") || "";
      const finalModel =
        dbModel?.value ||
        localStorage.getItem("gemini_model") ||
        "gemini-1.5-flash";
      const finalPrompt =
        dbPrompt?.value || localStorage.getItem("gemini_pre_prompt") || "";

      setConfig({
        geminiKey: finalKey,
        geminiModel: finalModel,
        geminiPrePrompt: finalPrompt,
      });

      // If we found values in LocalStorage but not DB, migrate them now?
      // Optional, but good for consistency. Let's just keep them in sync on *writes*.
    } catch (error) {
      console.error("Failed to load AI config:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateKey = async (key: string) => {
    setConfig((prev) => ({ ...prev, geminiKey: key }));
    localStorage.setItem("gemini_api_key", key);
    await db.userSettings.put({
      id: "gemini_api_key",
      value: key,
      updatedAt: Date.now(),
    });
  };

  const updateModel = async (model: string) => {
    setConfig((prev) => ({ ...prev, geminiModel: model }));
    localStorage.setItem("gemini_model", model);
    await db.userSettings.put({
      id: "gemini_model",
      value: model,
      updatedAt: Date.now(),
    });
  };

  const updatePrePrompt = async (prompt: string) => {
    setConfig((prev) => ({ ...prev, geminiPrePrompt: prompt }));
    localStorage.setItem("gemini_pre_prompt", prompt);
    await db.userSettings.put({
      id: "gemini_pre_prompt",
      value: prompt,
      updatedAt: Date.now(),
    });
  };

  return {
    config,
    loading,
    updateKey,
    updateModel,
    updatePrePrompt,
    refresh: loadSettings,
  };
}

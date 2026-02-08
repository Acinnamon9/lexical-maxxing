"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useSync } from "@/hooks/useSync";

export interface AIConfig {
  provider: "gemini" | "lmstudio";
  geminiKey: string;
  geminiModel: string;
  geminiPrePrompt: string;
  lmStudioBaseUrl: string;
  lmStudioModel: string;
}

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>({
    provider: "gemini",
    geminiKey: "",
    geminiModel: "gemini-2.5-flash",
    geminiPrePrompt: "",
    lmStudioBaseUrl: "http://localhost:1234/v1",
    lmStudioModel: "",
  });
  const [loading, setLoading] = useState(true);
  const { triggerSync } = useSync();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Fetch from DB
      const [dbProvider, dbKey, dbModel, dbPrompt, dbLmBase, dbLmModel] =
        await Promise.all([
          db.userSettings.get("ai_provider"),
          db.userSettings.get("gemini_api_key"),
          db.userSettings.get("gemini_model"),
          db.userSettings.get("gemini_pre_prompt"),
          db.userSettings.get("lmstudio_base_url"),
          db.userSettings.get("lmstudio_model"),
        ]);

      const finalProvider =
        (dbProvider?.value as "gemini" | "lmstudio") ||
        (localStorage.getItem("ai_provider") as "gemini" | "lmstudio") ||
        "gemini";
      const finalKey =
        dbKey?.value || localStorage.getItem("gemini_api_key") || "";
      const finalModel =
        dbModel?.value ||
        localStorage.getItem("gemini_model") ||
        "gemini-2.5-flash";
      const finalPrompt =
        dbPrompt?.value || localStorage.getItem("gemini_pre_prompt") || "";
      const finalLmBase =
        dbLmBase?.value ||
        localStorage.getItem("lmstudio_base_url") ||
        "http://localhost:1234/v1";
      const finalLmModel =
        dbLmModel?.value || localStorage.getItem("lmstudio_model") || "";

      setConfig({
        provider: finalProvider,
        geminiKey: finalKey,
        geminiModel: finalModel,
        geminiPrePrompt: finalPrompt,
        lmStudioBaseUrl: finalLmBase,
        lmStudioModel: finalLmModel,
      });

      // If we found values in LocalStorage but not DB, migrate them now?
      // Optional, but good for consistency. Let's just keep them in sync on *writes*.
    } catch (error) {
      console.error("Failed to load AI config:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = async (provider: "gemini" | "lmstudio") => {
    setConfig((prev) => ({ ...prev, provider }));
    localStorage.setItem("ai_provider", provider);
    await db.userSettings.put({
      id: "ai_provider",
      value: provider,
      updatedAt: Date.now(),
    });
    triggerSync();
  };

  const updateKey = async (key: string) => {
    setConfig((prev) => ({ ...prev, geminiKey: key }));
    localStorage.setItem("gemini_api_key", key);
    await db.userSettings.put({
      id: "gemini_api_key",
      value: key,
      updatedAt: Date.now(),
    });
    triggerSync();
  };

  const updateModel = async (model: string) => {
    setConfig((prev) => ({ ...prev, geminiModel: model }));
    localStorage.setItem("gemini_model", model);
    await db.userSettings.put({
      id: "gemini_model",
      value: model,
      updatedAt: Date.now(),
    });
    triggerSync();
  };

  const updatePrePrompt = async (prompt: string) => {
    setConfig((prev) => ({ ...prev, geminiPrePrompt: prompt }));
    localStorage.setItem("gemini_pre_prompt", prompt);
    await db.userSettings.put({
      id: "gemini_pre_prompt",
      value: prompt,
      updatedAt: Date.now(),
    });
    triggerSync();
  };

  const updateLmBaseUrl = async (baseUrl: string) => {
    setConfig((prev) => ({ ...prev, lmStudioBaseUrl: baseUrl }));
    localStorage.setItem("lmstudio_base_url", baseUrl);
    await db.userSettings.put({
      id: "lmstudio_base_url",
      value: baseUrl,
      updatedAt: Date.now(),
    });
    triggerSync();
  };

  const updateLmModel = async (model: string) => {
    setConfig((prev) => ({ ...prev, lmStudioModel: model }));
    localStorage.setItem("lmstudio_model", model);
    await db.userSettings.put({
      id: "lmstudio_model",
      value: model,
      updatedAt: Date.now(),
    });
    triggerSync();
  };

  const [availableLmModels, setAvailableLmModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const fetchLmModels = async (baseUrl?: string) => {
    const url = baseUrl || config.lmStudioBaseUrl;
    if (!url) return;

    setFetchingModels(true);
    try {
      // LM Studio usually has /v1/models or /api/v1/models
      // We'll try /api/v1/models first as requested by user
      const response = await fetch(`${url}/models`);
      if (!response.ok) throw new Error("Failed to fetch models");

      const data = await response.json();
      // LM Studio /v1/models returns { data: [{ id: "..." }] }
      // LM Studio /api/v1/models might return something else, but let's assume OpenAI compatibility
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      setAvailableLmModels(models);

      // If current model is empty but we have models, pick the first one
      if (models.length > 0 && !config.lmStudioModel) {
        updateLmModel(models[0]);
      }
    } catch (err) {
      // Silence fetch errors for auto-discovery
      console.warn("LM Studio auto-discovery failed (is it running?):", err);
      setAvailableLmModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  // Fetch models on mount or when provider/baseUrl changes
  useEffect(() => {
    if (config.provider === "lmstudio" && config.lmStudioBaseUrl) {
      fetchLmModels();
    }
  }, [config.provider, config.lmStudioBaseUrl]);

  return {
    config,
    loading,
    availableLmModels,
    fetchingModels,
    fetchLmModels,
    updateProvider,
    updateKey,
    updateModel,
    updatePrePrompt,
    updateLmBaseUrl,
    updateLmModel,
    refresh: loadSettings,
  };
}

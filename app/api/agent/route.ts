import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import {
  ARCHITECT_SYSTEM_PROMPT,
  SCHOLAR_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";

interface AgentRequest {
  query: string;
  apiKey?: string;
  model?: string;
  provider?: "gemini" | "lmstudio";
  lmStudioBaseUrl?: string;
  lmStudioModel?: string;
  agentMode?: "auto" | "ARCHITECT" | "SCHOLAR" | "NONE";
  currentContext?: {
    folderId: string | null;
    folderName: string | null;
    visibleWords?: string[];
  };
  messages?: { role: string; content: string }[];
  toolResults?: Record<string, string>;
}

// Simple heuristic for intent classification
function classifyIntent(query: string): "ARCHITECT" | "SCHOLAR" {
  const q = query.toLowerCase();

  // Strong action signals -> Architect
  const actionVerbs = [
    "create",
    "make",
    "add",
    "put",
    "move",
    "delete",
    "rename",
    "organize",
  ];
  if (actionVerbs.some((v) => q.includes(v))) {
    return "ARCHITECT";
  }

  // Question signals -> Scholar
  const questionWords = [
    "what",
    "why",
    "how",
    "explain",
    "define",
    "meaning",
    "difference",
  ];
  if (q.endsWith("?") || questionWords.some((w) => q.includes(w))) {
    return "SCHOLAR";
  }

  // Specific "Where does X go?" is tricky.
  // "Where should I put X?" -> Scholar (Expert advice)
  // "Put X in Y" -> Architect
  if (q.includes("where")) return "SCHOLAR";

  // Default to Scholar for safety (don't accidentally mutate)
  return "SCHOLAR";
}

export async function POST(req: Request) {
  try {
    const body: AgentRequest = await req.json();
    const {
      query,
      apiKey,
      model: requestedModel,
      currentContext,
      messages,
      provider = "gemini",
      lmStudioBaseUrl,
      lmStudioModel,
      agentMode = "auto",
    } = body;

    // Use manual override if set, otherwise auto-classify
    const intent = agentMode === "auto" ? classifyIntent(query) : agentMode;
    console.log(
      `Agent API: Intent=${intent} (mode=${agentMode}) for query: "${query}"`,
    );

    let systemPrompt = "";

    if (intent === "NONE") {
      // Raw mode - no system prompt, just conversation
      systemPrompt = "";
    } else if (intent === "ARCHITECT") {
      systemPrompt = `
      ${ARCHITECT_SYSTEM_PROMPT}

      ### Context
      Current viewing context: "${currentContext?.folderName || "Home/Root"}".
      Visible Words on Screen: ${currentContext?.visibleWords?.join(", ") || "(None selected)"}
      If they say "here", they mean this folder.
      ${body.toolResults ? `\n### Tool Results from Previous Actions:\n${JSON.stringify(body.toolResults, null, 2)}` : ""}
      `;
    } else {
      // Scholar Mode
      systemPrompt = `
      ${SCHOLAR_SYSTEM_PROMPT}

      ### Context
      Current viewing context: "${currentContext?.folderName || "Home/Root"}".
      Visible Words on Screen: ${currentContext?.visibleWords?.join(", ") || "(None selected)"}
      `;
    }

    if (provider === "lmstudio" && lmStudioBaseUrl) {
      console.log(
        `Agent API: Routing to LM Studio at ${lmStudioBaseUrl} with model: ${lmStudioModel || "default"}`,
      );
      try {
        const response = await fetch(`${lmStudioBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: lmStudioModel || "local-model",
            messages: [
              ...(systemPrompt
                ? [{ role: "system", content: systemPrompt }]
                : []),
              ...(messages || []).map((m) => ({
                role: m.role === "agent" ? "assistant" : m.role,
                content: m.content,
              })),
              {
                role: "user",
                content: query,
              },
            ],
            response_format: { type: "text" },
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LM Studio Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        let responseText = data.choices[0].message.content;

        // For NONE mode, return plain text without JSON parsing
        if (intent === "NONE") {
          return NextResponse.json({
            actions: [],
            message: responseText,
          });
        }

        // Clean up responseText if it contains markdown code blocks
        if (responseText.includes("```")) {
          const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match) {
            responseText = match[1].trim();
          }
        }

        try {
          const jsonResponse = JSON.parse(responseText.trim());
          if (
            intent === "SCHOLAR" &&
            jsonResponse.actions &&
            jsonResponse.actions.length > 0
          ) {
            console.warn("Scholar tried to perform actions. Blocking.");
            jsonResponse.actions = [];
          }
          return NextResponse.json(jsonResponse);
        } catch {
          console.warn(
            "Agent API: Failed to parse LM Studio JSON, falling back to plain message.",
          );
          // Fallback: If it's not JSON, treat the whole thing as a message.
          // This prevents the "Failed to contact Architect" error in the UI.
          return NextResponse.json({
            actions: [],
            message: data.choices[0].message.content, // Use original content
          });
        }
      } catch (err: unknown) {
        const lmError = err as Error;
        console.error("Agent API: LM Studio request failed", lmError);
        return NextResponse.json(
          { error: `LM Studio Error: ${lmError.message}` },
          { status: 500 },
        );
      }
    }

    // Default: Gemini
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      return NextResponse.json(
        { error: "API Key is required. Please set it in Settings." },
        { status: 401 },
      );
    }

    const selectedModel = requestedModel || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        // Only use JSON format if we have a system prompt (Architect/Scholar)
        ...(systemPrompt ? { responseMimeType: "application/json" } : {}),
      },
    });

    // Format conversation history
    const history = (messages || [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    // For NONE mode, just send history + query. For others, include system prompt.
    const fullPrompt = systemPrompt
      ? `
      ${systemPrompt}

      ### Conversation History
      ${history}

      User Request: "${query}"
    `
      : `${history ? `Previous conversation:\n${history}\n\n` : ""}${query}`;

    console.log(`Agent API: Processing request with ${intent} persona.`);

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    // For NONE mode, return plain text without action processing
    if (intent === "NONE") {
      return NextResponse.json({
        actions: [],
        message: responseText,
      });
    }

    try {
      const jsonResponse = JSON.parse(responseText);

      // Safety Check: If Scholar returns actions, strip them
      if (
        intent === "SCHOLAR" &&
        jsonResponse.actions &&
        jsonResponse.actions.length > 0
      ) {
        console.warn("Scholar tried to perform actions. Blocking.");
        jsonResponse.actions = [];
      }

      return NextResponse.json(jsonResponse);
    } catch {
      console.error("Agent API: Failed to parse JSON", responseText);
      return NextResponse.json(
        {
          actions: [],
          message:
            "I understood your request but had trouble structuring the plan. Please try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Agent API Error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

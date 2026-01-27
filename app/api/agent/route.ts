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
    } = body;

    // Prioritize client-provided key, then env var
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
        responseMimeType: "application/json",
      },
    });

    const intent = classifyIntent(query);
    console.log(
      `Agent API: Intent classified as ${intent} for query: "${query}"`,
    );

    let systemPrompt = "";

    if (intent === "ARCHITECT") {
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

    // Format conversation history
    const history = (messages || [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const fullPrompt = `
      ${systemPrompt}

      ### Conversation History
      ${history}

      User Request: "${query}"
    `;

    console.log(`Agent API: Processing request with ${intent} persona.`);

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

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
    } catch (e) {
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
  } catch (error: any) {
    console.error("Agent API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

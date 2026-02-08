import { NextResponse } from "next/server";
import { CLARIFIER_DEFAULT_PROMPT } from "@/lib/ai/prompts";
import { generateText, streamText, AIProvider } from "@/lib/ai/adapter";

interface RequestBody {
  word: string;
  context: string;
  query: string;
  apiKey?: string;
  model?: string;
  prePrompt?: string;
  provider?: AIProvider;
  lmStudioBaseUrl?: string;
  lmStudioModel?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const {
      word,
      context,
      query,
      apiKey,
      model,
      prePrompt,
      provider = "gemini",
      lmStudioBaseUrl,
      lmStudioModel,
    } = body;

    const instructions = prePrompt?.trim() || CLARIFIER_DEFAULT_PROMPT;
    const fullPrompt = `Word: "${word}"\nContext/Existing Meanings: "${context}"\nUser Question: "${query}"`;

    const stream = await streamText({
      provider,
      apiKey,
      model:
        provider === "lmstudio"
          ? lmStudioModel || "local-model"
          : model || "gemini-2.5-flash",
      systemInstruction: instructions,
      prompt: fullPrompt,
      lmStudioBaseUrl,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Clarify API: Internal server error", error);
    return NextResponse.json(
      {
        error: `Internal Error: ${error.message || "Failed to process doubt"}`,
      },
      { status: 500 },
    );
  }
}

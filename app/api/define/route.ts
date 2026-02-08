import { NextResponse } from "next/server";
import { WORD_DEFINER_PROMPT } from "@/lib/ai/prompts";
import { generateText, AIProvider } from "@/lib/ai/adapter";

interface RequestBody {
  word: string;
  context?: string;
  apiKey?: string;
  model?: string;
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
      apiKey,
      model,
      provider = "gemini",
      lmStudioBaseUrl,
      lmStudioModel,
    } = body;

    const fullPrompt = context
      ? `Word: "${word}"\nContext: "${context}"\n\nDefinition:`
      : `Word: "${word}"\n\nDefinition:`;

    const result = await generateText({
      provider,
      apiKey,
      model:
        provider === "lmstudio"
          ? lmStudioModel || "local-model"
          : model || "gemini-2.5-flash",
      systemInstruction: WORD_DEFINER_PROMPT,
      prompt: fullPrompt,
      lmStudioBaseUrl,
      temperature: 0.3,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ definition: result.text });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: `Internal Error: ${error.message || "Failed to generate definition"}`,
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface RequestBody {
  word: string;
  context: string;
  query: string;
  apiKey?: string;
  model?: string;
  prePrompt?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { word, context, query, apiKey, model: requestedModel, prePrompt } = body;
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      console.log("Clarify API: No API key found in request or environment");
      return NextResponse.json(
        { response: "I'm sorry, no Gemini API key was found. Please add your key in Settings or contact the administrator." },
      );
    }

    const selectedModel = requestedModel || "gemini-1.5-flash";
    console.log(`Clarify API: Starting request for "${word}" using model: ${selectedModel}`);

    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({ model: selectedModel });

    const defaultPrompt = `You are an expert etymologist and linguist helping a user understand a specific word or phrase in a learning context. Provide a concise, nuanced clarification of the word based on the user's specific doubt and the provided context. Use Markdown formatting. Use bullet points for comparisons if necessary. Keep the tone encouraging and academic but accessible. If the user's doubt is specifically about how it differs from another word, be precise in the distinction.`;

    const instructions = prePrompt?.trim() || defaultPrompt;

    const fullPrompt = `
      Instructions: ${instructions}
      
      Dynamic Context:
      Word: "${word}"
      Context/Existing Meanings: "${context}"
      User Question: "${query}"
    `;

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text();
      console.log("Clarify API: Successfully generated response");
      return NextResponse.json({ response });
    } catch (modelError: any) {
      console.error("Clarify API: Gemini model execution failed", modelError);
      return NextResponse.json(
        { error: `AI Model Error: ${modelError.message || "Unknown error"}` },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Clarify API: Internal server error", error);
    return NextResponse.json(
      { error: `Internal Error: ${error.message || "Failed to process doubt"}` },
      { status: 500 },
    );
  }
}

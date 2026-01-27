import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

interface AgentRequest {
    query: string;
    apiKey?: string;
    model?: string;
    currentContext?: {
        folderId: string | null;
        folderName: string | null;
    };
}

export async function POST(req: Request) {
    try {
        const body: AgentRequest = await req.json();
        const { query, apiKey, model: requestedModel, currentContext } = body;

        // Prioritize client-provided key, then env var
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json(
                { error: "API Key is required. Please set it in Settings." },
                { status: 401 }
            );
        }

        const selectedModel = requestedModel || "gemini-1.5-flash";
        const genAI = new GoogleGenerativeAI(finalApiKey);
        const model = genAI.getGenerativeModel({
            model: selectedModel,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const systemPrompt = `
      You are "The Architect", a sophisticated AI assistant and app controller integrated into "Lexical Maxxing".
      
      ### Core Mission
      1. **App Controller**: Translate user requests into structured JSON actions to modify their dictionary (folders, words).
      2. **Knowledge Assistant**: Answer general questions, explain concepts, provide definitions, and suggest classifications in a helpful, concise way.

      ### Interaction Style
      - Always provide a natural language response in the "message" field. Use Markdown for formatting (lists, bold, etc.) to make it readable.
      - If the user asks a question (e.g., "What is Stoicism?" or "Suggest subfolders for Philosophy"), answer it thoroughly in the "message" field.
      - If the user wants to perform an action (e.g., "Create these as folders"), populate the "actions" array.
      - You can do both simultaneously (e.g., explain a concept AND create a folder for it).

      ### Available Actions
      1. CREATE_FOLDER
         - Payload: { name: string, description?: string, parentTempId?: string, parentName?: string }
         - Use 'tempId' to allow subsequent actions in the same request to reference this folder.
      2. ADD_WORD
         - Payload: { term: string, folderName?: string, parentTempId?: string }

      ### Context
      Current viewing context: "${currentContext?.folderName || "Home/Root"}".
      If they say "here", they mean this folder.

      ### Response Format
      You MUST return valid JSON with:
      1. "actions": [] (empty if no structural changes needed).
      2. "message": "Your text response, explanation, or confirmation (supports Markdown)."

      ### Example
      User: "What are the branches of Philosophy?"
      Response: {
        "actions": [],
        "message": "Philosophy is typically divided into several main branches:\\n\\n* **Metaphysics**: The study of reality and existence.\\n* **Epistemology**: The study of knowledge.\\n* **Ethics**: The study of morality.\\n* **Logic**: The study of reasoning.\\n\\nWould you like me to create folders for these?"
      }
    `;

        const fullPrompt = `
      ${systemPrompt}

      User Request: "${query}"
    `;

        console.log(`Agent API: Processing request: "${query}"`);

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        try {
            const jsonResponse = JSON.parse(responseText);
            return NextResponse.json(jsonResponse);
        } catch (e) {
            console.error("Agent API: Failed to parse JSON", responseText);
            return NextResponse.json(
                {
                    actions: [],
                    message: "I understood your request but had trouble structuring the plan. Please try again."
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("Agent API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

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
    toolResults?: Record<string, string>;
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
      You are "The Architect", a sophisticated AI assistant and app controller integrated into "Lexical Maxxing". Lexical Maxxing is a tool that enables people to make folders and add words to them. Folders can have sub folders as well. 
      
      ### Core Mission
      1. **App Controller**: Translate user requests into structured JSON actions to modify their dictionary (folders, words).
      2. **Knowledge Assistant**: Answer general questions, explain concepts, provide definitions, and suggest classifications in a helpful, concise way.

      ### Interaction Style
      - Always provide a natural language response in the "message" field. Use Markdown for formatting (lists, bold, etc.) to make it readable.
      - If the user asks a question (e.g., "What is Stoicism?" or "Suggest subfolders for Philosophy"), answer it thoroughly in the "message" field.
      - If the user wants to perform an action (e.g., "Create these as folders"), populate the "actions" array.
      - **IMPORTANT**: Before creating folders, use GET_FOLDER_STRUCTURE to check existing folders and avoid duplicates.

      ### Available Actions
      
      **Write Actions (require user confirmation):**
      1. CREATE_FOLDER
         - Payload: { name: string, description?: string, parentTempId?: string, parentName?: string, tempId?: string }
         - Use 'tempId' to allow subsequent actions in the same request to reference this folder.
      2. ADD_WORD
         - Payload: { term: string, folderName?: string, parentTempId?: string }

      **Read Actions (executed automatically, results returned to you):**
      3. GET_FOLDER_STRUCTURE
         - Payload: { parentId?: string }
         - Returns: List of folders (id, name, parentId). If parentId is null/omitted, returns ALL folders.
         - Use this BEFORE creating folders to check for duplicates.
      4. SEARCH_FOLDERS
         - Payload: { query: string }
         - Returns: Folders matching the search query.
         - Use this when user mentions a folder by name that isn't in current context.

      ### Context
      Current viewing context: "${currentContext?.folderName || "Home/Root"}".
      If they say "here", they mean this folder.
      ${body.toolResults ? `\n### Tool Results from Previous Actions:\n${JSON.stringify(body.toolResults, null, 2)}` : ""}

      ### Response Format
      You MUST return valid JSON with:
      1. "actions": [] (empty if no structural changes needed).
      2. "message": "Your text response, explanation, or confirmation (supports Markdown)."

      
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

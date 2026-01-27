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
      You are "The Architect", an AI agent deeply integrated into a vocabulary learning app called "Lexical Maxxing".
      Your goal is to translate Natural Language user requests into a sequence of structured JSON actions that the frontend can execute.

      ### Capabilities
      You can modify the structure of the user's dictionary.

      ### Available Actions
1. CREATE_FOLDER
    - Payload: { name: string, description ?: string, parentTempId ?: string, parentName ?: string }
- Use 'parentTempId' if referencing a folder created in the SAME request sequence.
         - Use 'parentName' if referencing an existing folder(loose match).
         - Use 'tempId' to allow other actions to reference this new folder.

      2. ADD_WORD
    - Payload: { term: string, folderName ?: string, parentTempId ?: string }
- 'term': The word itself.
         - 'folderName': The target folder name.
           - IF the user says "Add word X" and gives NO folder name:
- AND 'currentContext.folderName' is provided -> Use that as 'folderName'.
- AND no context provided -> Ask for clarification or default to "Inbox".
         - 'parentTempId': Use this if adding a word to a folder created in the same sequence.

      ### Context
      The user is currently viewing the folder: "${currentContext?.folderName || "None(Root or Home)"}".
      If the user says "here" or "this folder", refer to: "${currentContext?.folderName}".

      ### Rules
    - Return a JSON object with:
    1. "actions": Array of action objects { type, payload }.
2. "message": A concise, natural language confirmation of what you are doing.
      - If the user's intent is unclear, return an empty "actions" array and ask for clarification in "message".
    - Be smart: If the user says "Add Physics folder and put Gravity in it", create the folder with a tempId, then add the word referencing that tempId.

      ### Example Input
"Create a Physics folder and put Torque inside it."

      ### Example Output
{
    "actions": [
        { "type": "CREATE_FOLDER", "payload": { "name": "Physics", "tempId": "folder_1" } },
        { "type": "ADD_WORD", "payload": { "term": "Torque", "parentTempId": "folder_1" } }
    ],
        "message": "I'm creating the Physics folder and adding 'Torque' to it."
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

import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  ARCHITECT_SYSTEM_PROMPT,
  SCHOLAR_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { AgentAction } from "@/lib/types";

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
    visibleWords?: (string | { id: string; term: string })[];
  };
  messages?: { role: string; content: string }[];
  toolResults?: Record<string, string>;
}

function classifyIntent(query: string): "ARCHITECT" | "SCHOLAR" {
  const q = query.toLowerCase();
  const actionVerbs = [
    "create",
    "make",
    "add",
    "put",
    "move",
    "delete",
    "rename",
    "organize",
    "list",
    "show",
    "find",
    "search",
    "count",
  ];
  if (actionVerbs.some((v) => q.includes(v))) return "ARCHITECT";
  const questionWords = [
    "what",
    "why",
    "how",
    "explain",
    "define",
    "meaning",
    "difference",
  ];
  if (q.endsWith("?") || questionWords.some((w) => q.includes(w)))
    return "SCHOLAR";
  if (q.includes("where")) return "SCHOLAR";
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

    const intent = agentMode === "auto" ? classifyIntent(query) : agentMode;
    console.log(
      `Agent Stream API: Intent=${intent} (mode=${agentMode}) for query: "${query}"`,
    );

    const formattedWords =
      currentContext?.visibleWords
        ?.map((w) =>
          typeof w === "string" ? w : `- ID: ${w.id}, Term: "${w.term}"`,
        )
        .join("\n") || "(None selected)";

    console.log(
      `Agent Stream API: Visible words count = ${currentContext?.visibleWords?.length || 0}`,
    );

    let systemPrompt = "";
    if (intent === "NONE") {
      systemPrompt = "";
    } else if (intent === "ARCHITECT") {
      systemPrompt = `${ARCHITECT_SYSTEM_PROMPT}\n\n### Context\nCurrent viewing context: "${currentContext?.folderName || "Home/Root"}".\n\nVisible Words on Screen:\n${formattedWords}\n\nIf they say "here", they mean this folder.\n${body.toolResults ? `\n### Tool Results from Previous Actions:\n${JSON.stringify(body.toolResults, null, 2)}` : ""}`;
    } else {
      systemPrompt = `${SCHOLAR_SYSTEM_PROMPT}\n\n### Context\nCurrent viewing context: "${currentContext?.folderName || "Home/Root"}".\n\nVisible Words on Screen:\n${formattedWords}`;
    }

    const encoder = new TextEncoder();

    // LM Studio Streaming
    if (provider === "lmstudio" && lmStudioBaseUrl) {
      console.log(
        `Agent Stream API: Routing to LM Studio at ${lmStudioBaseUrl}`,
      );

      const response = await fetch(`${lmStudioBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            { role: "user", content: query },
          ],
          temperature: 0.2,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio Error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("LM Studio response has no body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          let fullResponse = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === "[DONE]") continue;

                  try {
                    const data = JSON.parse(dataStr);
                    let content = "";

                    // New LM Studio format
                    if (data.type === "message.delta" && data.content) {
                      content = data.content;
                    }
                    // OpenAI-compatible format
                    else if (data.choices?.[0]?.delta?.content) {
                      content = data.choices[0].delta.content;
                    }

                    if (content) {
                      fullResponse += content;
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "delta", content })}\n\n`,
                        ),
                      );
                    }
                  } catch (e) {
                    console.warn("Error parsing SSE:", e);
                  }
                }
              }
            }

            // Send final message with parsed actions (for ARCHITECT/SCHOLAR modes)
            let actions: AgentAction[] = [];
            let message = fullResponse;

            if (intent !== "NONE") {
              // Try to parse JSON from the response
              try {
                // Clean markdown code blocks
                let cleanResponse = fullResponse;
                if (cleanResponse.includes("```")) {
                  const match = cleanResponse.match(
                    /```(?:json)?\s*([\s\S]*?)```/,
                  );
                  if (match) cleanResponse = match[1].trim();
                }
                const parsed = JSON.parse(cleanResponse);
                actions = (parsed.actions as AgentAction[]) || [];
                message = parsed.message || fullResponse;

                // Safety: strip actions from Scholar
                if (intent === "SCHOLAR" && actions.length > 0) {
                  console.warn("Scholar tried to perform actions. Blocking.");
                  actions = [];
                }
              } catch {
                // Not JSON, just use as message
              }
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "end", actions, message })}\n\n`,
              ),
            );
          } catch (err: unknown) {
            const e = err as Error;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`,
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Gemini Streaming
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalApiKey) {
      return new Response(
        JSON.stringify({
          error: "API Key is required. Please set it in Settings.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const selectedModel = requestedModel || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: systemPrompt
        ? { responseMimeType: "application/json", maxOutputTokens: 8192 }
        : { maxOutputTokens: 8192 },
    });

    const history = (messages || [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n### Conversation History\n${history}\n\nUser Request: "${query}"`
      : `${history ? `Previous conversation:\n${history}\n\n` : ""}${query}`;

    const result = await model.generateContentStream(fullPrompt);

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullResponse += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "delta", content: text })}\n\n`,
                ),
              );
            }
          }

          // Parse final response
          let actions: AgentAction[] = [];
          let message = fullResponse;

          if (intent !== "NONE") {
            try {
              // Robust JSON extraction: Find first '{' and last '}'
              let cleanResponse = fullResponse.trim();

              // Remove markdown code blocks if present
              if (cleanResponse.includes("```")) {
                const match = cleanResponse.match(
                  /```(?:json)?\s*([\s\S]*?)```/,
                );
                if (match) cleanResponse = match[1].trim();
              }

              // If still not valid, try to find the outermost JSON object
              if (!cleanResponse.startsWith("{")) {
                const start = cleanResponse.indexOf("{");
                const end = cleanResponse.lastIndexOf("}");
                if (start !== -1 && end !== -1 && end > start) {
                  cleanResponse = cleanResponse.slice(start, end + 1);
                }
              }

              const parsed = JSON.parse(cleanResponse);
              actions = (parsed.actions as AgentAction[]) || [];
              message = parsed.message || fullResponse;

              // Safety: strip actions from Scholar
              if (intent === "SCHOLAR" && actions.length > 0) {
                console.warn("Scholar tried to perform actions. Blocking.");
                actions = [];
              }
            } catch (e) {
              console.warn("Stream API: Failed to parse JSON response", e);
              // Not JSON, just use as message
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "end", actions, message })}\n\n`,
            ),
          );
        } catch (err: unknown) {
          const e = err as Error;
          console.error("Gemini Stream Error:", e);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Agent Stream API Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

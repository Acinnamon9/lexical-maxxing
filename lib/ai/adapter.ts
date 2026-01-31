import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "gemini" | "lmstudio";

export interface AIRequestOptions {
  provider: AIProvider;
  apiKey?: string;
  model: string;
  systemInstruction?: string;
  prompt: string;
  lmStudioBaseUrl?: string;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  error?: string;
}

/**
 * Centrally managed AI adapter for Lexical Maxxing.
 * Standardizes requests to different providers.
 */
export async function generateText(
  options: AIRequestOptions,
): Promise<AIResponse> {
  const {
    provider,
    apiKey,
    model: requestedModel,
    systemInstruction,
    prompt,
    lmStudioBaseUrl,
    temperature = 0.7,
  } = options;

  if (provider === "lmstudio") {
    if (!lmStudioBaseUrl) {
      return { text: "", error: "LM Studio Base URL is missing." };
    }

    try {
      const response = await fetch(`${lmStudioBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: requestedModel || "local-model",
          messages: [
            ...(systemInstruction
              ? [{ role: "system", content: systemInstruction }]
              : []),
            { role: "user", content: prompt },
          ],
          temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      return { text: content };
    } catch (err: any) {
      return { text: "", error: `LM Studio Error: ${err.message}` };
    }
  }

  // Default: Gemini
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!finalApiKey) {
    return {
      text: "",
      error: "No Gemini API key found. Please add your key in Settings.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({
      model: requestedModel || "gemini-2.5-flash",
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return { text };
  } catch (err: any) {
    return {
      text: "",
      error: `Gemini Error: ${err.message || "Unknown error"}`,
    };
  }
}

/**
 * Generates a text stream from the selected AI provider.
 * Returns a ReadableStream that yields text chunks (encoded as Uint8Array).
 */
export async function streamText(
  options: AIRequestOptions,
): Promise<ReadableStream<Uint8Array>> {
  const {
    provider,
    apiKey,
    model: requestedModel,
    systemInstruction,
    prompt,
    lmStudioBaseUrl,
    temperature = 0.7,
  } = options;

  const encoder = new TextEncoder();

  if (provider === "lmstudio") {
    if (!lmStudioBaseUrl) {
      throw new Error("LM Studio Base URL is missing.");
    }

    // Use OpenAI-compatible streaming endpoint
    const response = await fetch(`${lmStudioBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: requestedModel || "local-model",
        messages: [
          ...(systemInstruction
            ? [{ role: "system", content: systemInstruction }]
            : []),
          { role: "user", content: prompt },
        ],
        temperature,
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

    // Transform LM Studio SSE stream into raw text stream
    // New format: event: message.delta\ndata: {"type":"message.delta","content":"..."}
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line

            let currentEventType = "";

            for (const line of lines) {
              const trimmed = line.trim();

              // Parse event type
              if (trimmed.startsWith("event: ")) {
                currentEventType = trimmed.slice(7);
                continue;
              }

              // Parse data
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") continue;

                try {
                  const data = JSON.parse(dataStr);

                  // New LM Studio format: message.delta has content directly
                  if (data.type === "message.delta" && data.content) {
                    controller.enqueue(encoder.encode(data.content));
                  }
                  // Fallback: OpenAI-compatible format
                  else if (data.choices?.[0]?.delta?.content) {
                    controller.enqueue(
                      encoder.encode(data.choices[0].delta.content),
                    );
                  }
                } catch (e) {
                  console.warn("Error parsing LM Studio SSE:", e);
                }
              }
            }
          }
        } catch (err: any) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });
  }

  // Default: Gemini
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!finalApiKey) {
    throw new Error(
      "No Gemini API key found. Please add your key in Settings.",
    );
  }

  const genAI = new GoogleGenerativeAI(finalApiKey);
  const model = genAI.getGenerativeModel({
    model: requestedModel || "gemini-2.5-flash",
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const result = await model.generateContentStream(prompt);

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

import { NextResponse } from "next/server";

interface RequestBody {
  word: string;
  context: string; // The meanings or folder name
  query: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { word, context, query } = body;

    // TODO: Connect to Real AI (OpenAI / Gemini)
    // For now, SIMULATED Persona Response

    const simulatedDelay = new Promise((resolve) => setTimeout(resolve, 800));
    await simulatedDelay;

    const response = `
### clarification on "${word}"

You asked: *"${query}"*

In the context of **${context}**, here is the nuance:

**${word}** is often misunderstood. 
- It specifically refers to the *chaotic* element of the system.
- Unlike in general usage, here it implies a measurable quantity.

*Hope that helps clarify the distinction!*
    `.trim();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "Failed to process doubt" },
      { status: 500 },
    );
  }
}

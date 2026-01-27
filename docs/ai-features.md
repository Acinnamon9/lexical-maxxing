# AI Integration (Gemini)

The application integrates Google's Gemini models to provide intelligent, context-aware clarification for vocabulary.

## The Clarify API (`/api/clarify`)

This is the primary endpoint for AI interactions. It is a **Next.js Route Handler** that performs the following:

1.  **Dynamic Key Management**: Prioritizes a user-provided API key from `localStorage` (passed in the request header/body) over the server's environment variable.
2.  **Model Selection**: Supports dynamic selection from a wide range of models via the `model` parameter:
    *   `gemini-3-pro-preview`
    *   `gemini-2.5-flash`
    *   `gemini-1.5-flash` (Default)
3.  **Context Injection**: The frontend automatically sends the "Folder Context" (other meanings already recorded for that word in that folder) to Gemini. This prevents the AI from giving redundant information.
4.  **Markdown Rendering**: The AI is instructed to respond with valid Markdown, which the frontend renders using `react-markdown`.

## User-Programmable AI

### The Pre-prompt
Users can customize the AI's "brain" via the Settings page. This pre-prompt is stored in `localStorage` and sent with every request as base instructions.
- **Default Instruction**: Acts as an expert linguist and etymologist.
- **Custom Instruction**: Can be anything (e.g., "Explain like I'm 5," "Translate to French," "Only give technical usage examples").

## Robustness Features

- **AbortController**: All AI requests have a hard 30-second timeout to prevent the UI from hanging.
- **Optimistic UI**: When a user asks a question, the doubt is saved to the local database immediately as `pending`. The response is updated asynchronously when the API returns.
- **Chronological History**: Every AI interaction is saved locally, creating a permanent "learning log" for every word in every context.

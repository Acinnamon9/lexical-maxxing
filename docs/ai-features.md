# AI Integration (Gemini)

The application integrates Google's Gemini models to provide intelligent, context-aware clarification for vocabulary and architectural control over the dictionary.

## The Agentic Architecture

Lexical Maxxing uses a **Two-Agent System** to prevent "role collapse" (where an AI tries to be both a teacher and a database admin, failing at both).

### 1. The Intent Router
Every request to the main agent (`/api/agent`) passes through a lightweight heuristic router that detects the user's intent:
- **Commands** ("Add", "Create", "Move") -> **The Architect**
- **Questions** ("What", "Why", "Explain") -> **The Scholar**

### 2. The Architect (State Controller)
- **Role**: Maintains the correctness of the hierarchical workspace.
- **Capabilities**: Can execute `CREATE_FOLDER`, `ADD_WORD`, etc.
- **Constraint**: Forbidden from teaching or explaining definitions.
- **Output**: JSON Actions.

### 3. The Scholar (Knowledge Assistant)
- **Role**: Explains concepts, suggests connections, and answers user doubts.
- **Capabilities**: Read-only access to context.
- **Constraint**: Forbidden from modifying the database (no write tools).
- **Output**: Rich Markdown explanations.

## The Clarify API (`/api/clarify`)

This endpoint is dedicated to **The Scholar** for specific word nuances (Sidebar "Ask AI" feature).
- **Model**: Defaults to `gemini-2.5-flash`.
- **Context Injection**: Automatically sends existing meanings from the folder to prevent redundancy.

## User-Programmable AI

### The Pre-prompt
Users can customize the AI's "brain" via the Settings page. This pre-prompt is stored in Supabase/Dexie and sent with every request.
- **Default Instruction**: Acts as an expert linguist (Scholar) or strict controller (Architect).
- **Custom Instruction**: Users can override the default Scholar prompt for the Clarify API.

## Robustness Features

- **AbortController**: All AI requests have a hard 30-second timeout.
- **Optimistic UI**: Doubts are saved locally as `pending` immediately.
- **History**: All interactions are logged in `agentMessages` or `doubts` tables.

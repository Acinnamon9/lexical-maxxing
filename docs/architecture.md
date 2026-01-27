# Architecture Overview

Lexical Maxxing is an **Offline-First Domain-Specific Vocabulary Builder**. It is designed to help users master complex terminology within specific fields (e.g., medicine, law, engineering) by organizing words into hierarchical semantic chunks.

## Core Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper for offline storage)
- **AI Engine**: [Google Gemini API](https://ai.google.dev/) (via `@google/generative-ai`)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Styling**: Vanilla CSS with [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Markdown**: `react-markdown` with GFM support

## Design Philosophy

### 1. Offline-First & Cross-Device Sync
All user data (folders, words, meanings) is stored locally in **IndexedDB** (via Dexie.js) for zero-latency interactions.

Replication to the cloud happens in the background via **Supabase**:
- **Pull**: On login/load, the app fetches the latest state from Postgres.
- **Push**: Critical actions (save settings, add word, agent interactions) trigger an immediate push to Supabase.
- **Conflict Resolution**: Last-write-wins (LWW) per field.

### 2. Domain-Driven Organization
Unlike general-purpose dictionaries, Lexical Maxxing focuses on **Contextual Meaning**. A word like "Current" can have vastly different meanings in *Oceanography* vs. *Electronics*. The app enforces this by:
- Organizing words into nested **Folders**.
- Splitting folders into manageable **Chunks** (15 words each).
- Attaching meanings specifically to a `[wordId + folderId]` pair.

### 3. Agentic AI Architecture
The app uses a **Two-Agent System** to manage complexity:
- **The Architect**: A strict State Controller responsible for executing database mutations (Create Folder, Add Word). It is forbidden from "teaching".
- **The Scholar**: A read-only Knowledge Assistant that handles explanations and user doubts without risking database corruption.
- **Intent Router**: A heuristic layer that routes user queries to the correct agent.

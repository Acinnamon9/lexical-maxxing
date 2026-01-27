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

### 1. Offline-First
All user data (folders, words, meanings, and AI conversation history) is stored locally in the browser using IndexedDB. This ensures:
- Instant feedback (zero latency for database operations).
- Complete privacy (your dictionary stays on your device).
- Functional usage without an internet connection (except for AI clarifications).

### 2. Domain-Driven Organization
Unlike general-purpose dictionaries, Lexical Maxxing focuses on **Contextual Meaning**. A word like "Current" can have vastly different meanings in *Oceanography* vs. *Electronics*. The app enforces this by:
- Organizing words into nested **Folders**.
- Splitting folders into manageable **Chunks** (15 words each).
- Attaching meanings specifically to a `[wordId + folderId]` pair.

### 3. AI-Augmented Learning
The app doesn't just provide static definitions. It uses Gemini to provide:
- **Nuanced Clarifications**: Answering specific user doubts about a word's usage.
- **Context Awareness**: The AI "sees" the other meanings in your folder to provide a better explanation.
- **Customizable Persona**: Users can define a "Pre-prompt" to control the AI's tone and depth.

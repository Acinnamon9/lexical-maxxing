# Lexical Maxxing 📚

> **"Mastering vocabulary with terminal precision and AI intelligence."**

Lexical Maxxing is an ultra-premium, local-first knowledge management system designed for power users who want to master new words and concepts with surgical precision. It combines a high-bandwidth **Terminal Interface** with a dual-mode **AI Agent** and **Spaced Repetition** to create the ultimate learning environment.

## 🚀 The Vision

Traditional vocabulary apps are too slow. Lexical Maxxing treats your knowledge base like a filesystem. By providing a command-line interface (`lex-sh`) alongside a powerful AI Architect, we enable a high-bandwidth flow between thought and execution. "Smart prompts require smart minds"—the terminal is the bridge for critical thinkers to manipulate their learning environment with absolute control.

---

## 🏗️ Core Pillars

### 🐚 Lexical Shell (`lex-sh`)

The heart of the application. A custom-built terminal interface accessible via `Ctrl + \`` that gives you raw power over your data.

- **Precision Control**: `mkdir`, `cd`, `ls`, `mv`, and `rm` for your vocabulary hierarchy.
- **Rich Output**: Columnated word lists, ASCII charts for mastery tracking, and theme-aware formatting.
- **Persistent History**: Command history that survives sessions, stored locally in IndexedDB.
- **Context Awareness**: The terminal understands your current "working folder" and adapts commands accordingly.

### 🤖 Dual-Mode AI Agent

A sophisticated AI sidekick that lives in your UI (`Cmd + J`) and understands your entire workspace.

- **ARCHITECT Mode**: The "Builder". It can create folders, add words in bulk, reorganize your hierarchy, and execute complex structural changes based on natural language.
- **SCHOLAR Mode**: The "Teacher". It provides deep etymologies, example sentences, and clarifies complex concepts in your notes.
- **Contextual Intelligence**: The AI knows which words you're looking at and which folder you're in, providing zero-shot relevant assistance.
- **Tool Execution**: Directly manipulates the database through a secure action-schema system.

### 🏠 Local-First & Sync

Your data belongs to you. Lexical Maxxing is built on a "local-first" philosophy.

- **IndexedDB (Dexie.js)**: Everything is stored in your browser for sub-millisecond latency and offline perfection.
- **Supabase Sync**: Optional, real-time cloud synchronization to keep your devices in harmony.
- **Conflict Resolution**: Advanced merging strategies for offline edits.

### 🎯 Mastery & Spaced Repetition

Not just a dictionary, but a learning engine.

- **0-5 Mastery Scale**: Separate tracking for recognition and recall.
- **Adaptive Scheduling**: Spaced repetition intervals calculated to minimize review time while maximizing retention.
- **Knowledge Graph**: Link words as synonyms, antonyms, or related concepts to build a non-linear network of knowledge.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB)
- **AI**: [Google Gemini 2.0](https://ai.google.dev/) / [LM Studio](https://lmstudio.ai/)
- **Runtime**: TypeScript
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)

---

## 📂 Project Structure

```text
lexical-maxxing/
├── app/                  # Next.js App Router (Pages & API Routes)
├── components/           # React Components
│   ├── folders/          # Folder management UI
│   ├── terminal/         # The lex-sh interface components
│   ├── word/             # Word & meaning displays
│   ├── notes/            # Markdown note editors
│   └── settings/         # Advanced configuration panels
├── hooks/                # Core logic (useTerminal, useAgentAction, useSync)
├── lib/                  # Backend-lite logic
│   ├── ai/               # Agent prompts, tool definitions, & emitters
│   ├── terminal/         # lex-sh command registry & parser
│   ├── db.ts             # Dexie schema & seeding logic
│   └── types.ts          # Centralized Type declarations
└── docs/                 # Roadmaps & Feature specs
```

---

## 🚦 Getting Started

### 1. Installation

```bash
git clone https://github.com/Acinnamon9/lexical-maxxing.git
cd lexical-maxxing
npm install
```

### 2. Configuration

Copy the example environment file and add your API keys.

```bash
cp .env.local.example .env.local
```

Required: `GEMINI_API_KEY` for AI features.

### 3. Launch

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Use `Ctrl + \`` to open the Terminal or `Cmd + J` for the AI Widget.

---

## 📝 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Inspired by the need for high-bandwidth learning.
- Built with ❤️ by the Lexical team.

---

## 🗺️ Roadmap

We are currently in **Tier 1 (Generic Refinement)** with active development on **Tier 2 (Lexical Mastery)**.

- [x] **Tier 1**: Lexical Shell core, terminal history, basic folder/word CRUD.
- [x] **Tier 2**: AI Architect integration, dual-mode widget, local-first storage.
- [ ] **Tier 3**: Advanced piping (`ls | agent`), semantic search, and collaborative sync.

---

**Master your language. Max your lexicon. 🚀📚**

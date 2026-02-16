# SSOT: Lexical Maxxing Codebase

> **Single Source of Truth for understanding the Lexical Maxxing application architecture and codebase organization**

## Project Overview

**Lexical Maxxing** is an offline-first, AI-powered vocabulary management system designed for power users who want to master domain-specific terminology with precision. It combines a terminal-style CLI interface (`lex-sh`) with dual-mode AI agents and spaced repetition learning.

### Core Philosophy
- **Offline-First**: All data stored locally in IndexedDB via Dexie.js
- **Context-Aware**: Words can have different meanings in different folders/domains
- **High-Bandwidth**: Terminal interface for fast, precise control
- **AI-Augmented**: Dual-mode AI (Architect + Scholar) for structure and learning

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | React-based full-stack framework |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Database** | Dexie.js (IndexedDB) | Client-side offline database |
| **Cloud Sync** | Supabase | Optional real-time cloud sync |
| **AI** | Google Gemini 2.0 | AI agent for vocabulary assistance |
| **Animations** | Framer Motion | Smooth UI transitions |
| **Drag & Drop** | @dnd-kit | Sortable lists and UI components |
| **Auth** | NextAuth.js v5 | Authentication with Prisma adapter |

---

## Project Structure

```
lexical-maxxing/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── folder/[id]/          # Folder detail pages
│   ├── session/              # Learning session pages
│   ├── settings/             # Settings pages
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Home page (main UI)
│
├── components/               # React Components
│   ├── folders/              # Folder management UI
│   ├── terminal/             # Terminal (lex-sh) interface
│   ├── word/                 # Word display and editing
│   ├── notes/                # Markdown note editor
│   ├── settings/             # Settings panels
│   ├── ui/                   # Reusable UI components
│   ├── AIWidget.tsx          # AI agent interface
│   ├── Navbar.tsx            # Top navigation
│   └── MeaningModal.tsx      # Word meaning viewer/editor
│
├── lib/                      # Core business logic
│   ├── ai/                   # AI agent system
│   │   ├── adapter.ts        # AI request handler
│   │   └── prompts.ts        # Agent system prompts
│   ├── terminal/             # Terminal command system
│   │   ├── commands.ts       # Command implementations
│   │   ├── parser.ts         # Command parser
│   │   ├── registry.ts       # Command registry
│   │   └── types.ts          # Terminal types
│   ├── db.ts                 # Dexie database schema
│   ├── types.ts              # Global TypeScript types
│   ├── sync.ts               # Supabase sync logic
│   ├── import.ts             # Import/export utilities
│   ├── seed.ts               # Database seeding
│   └── session.ts            # Learning session management
│
├── hooks/                    # React custom hooks
│
├── docs/                     # Project documentation
│   ├── architecture.md       # Architecture overview
│   ├── database.md           # Database schema docs
│   ├── terminal_roadmap.md   # Terminal feature roadmap
│   ├── ai-features.md        # AI capabilities
│   └── Possible_features.md  # Future feature ideas
│
├── prisma/                   # Prisma ORM (for Supabase)
│
├── public/                   # Static assets
│
└── .agent/                   # Agent SSOT and workflows
    ├── SSOT_*.md             # Single Source of Truth docs
    └── workflows/            # Workflow documentation
```

---

## Architecture Patterns

### 1. Offline-First with Optional Sync

**Local Storage (Primary)**
- All user data lives in IndexedDB via Dexie.js
- Zero-latency reads/writes
- Works completely offline

**Cloud Sync (Secondary)**
- Supabase PostgreSQL for cross-device sync
- Push on critical actions (add word, update settings)
- Pull on login/refresh
- Last-Write-Wins conflict resolution

### 2. Contextual Data Model

The core innovation is **context-specific meanings**. A word like "Current" has different definitions in "Oceanography" vs "Electronics".

**Key Pattern**: Many tables use `[wordId + folderId]` compound keys to ensure meanings are tied to specific contexts.

### 3. Dual-Mode AI System

Two specialized AI agents with strict separation of concerns:

| Agent | Mode | Capabilities | Restrictions |
|-------|------|-------------|--------------|
| **Architect** | State Controller | Create/modify folders, add words, reorganize structure | Cannot teach or explain concepts |
| **Scholar** | Knowledge Assistant | Explain words, provide etymologies, answer questions | Cannot modify database |

**Intent Router**: Heuristic layer that analyzes user queries and routes to the appropriate agent.

### 4. Terminal-First Interface

The `lex-sh` terminal provides a command-line interface for power users:
- Familiar Unix-like commands: `mkdir`, `cd`, `ls`, `mv`, `rm`
- Custom commands: `add`, `search`, `review`, `stats`
- History persistence across sessions
- Theme-aware output formatting

---

## Key Files Reference

### Database Layer
- **[lib/db.ts](file:///s:/lexical-maxxing/lib/db.ts)** - Dexie schema definition
  - Defines all tables: folders, words, wordFolders, wordMeanings, wordStates, etc.
  - IndexedDB schema version management

### AI System
- **[lib/ai/adapter.ts](file:///s:/lexical-maxxing/lib/ai/adapter.ts)** - AI request handler
  - Gemini API integration
  - Streaming response handling
  - Tool/function calling support
  
- **[lib/ai/prompts.ts](file:///s:/lexical-maxxing/lib/ai/prompts.ts)** - Agent system prompts
  - Architect agent instructions
  - Scholar agent instructions
  - Tool definitions

### Terminal System
- **[lib/terminal/commands.ts](file:///s:/lexical-maxxing/lib/terminal/commands.ts)** - Command implementations
  - All terminal command logic (mkdir, cd, ls, add, etc.)
  
- **[lib/terminal/registry.ts](file:///s:/lexical-maxxing/lib/terminal/registry.ts)** - Command registry
  - Command metadata and routing
  
- **[lib/terminal/parser.ts](file:///s:/lexical-maxxing/lib/terminal/parser.ts)** - Command parser
  - Tokenization and argument parsing

### Type System
- **[lib/types.ts](file:///s:/lexical-maxxing/lib/types.ts)** - Global TypeScript types
  - All database table interfaces
  - Agent action types
  - Tool definitions
  - Import/export types

### Main UI
- **[app/page.tsx](file:///s:/lexical-maxxing/app/page.tsx)** - Home page
  - Main application UI
  - Word list, folder tree, terminal toggle
  
- **[components/AIWidget.tsx](file:///s:/lexical-maxxing/components/AIWidget.tsx)** - AI interface
  - Chat UI with streaming responses
  - Mode switching (Architect/Scholar)
  - Tool execution visualization

### Sync Layer
- **[lib/sync.ts](file:///s:/lexical-maxxing/lib/sync.ts)** - Supabase sync
  - Push/pull mechanisms
  - Conflict resolution
  - Sync status tracking

---

## Development Practices

### Type Safety
- Strict TypeScript configuration
- Centralized type definitions in `lib/types.ts`
- Dexie type inference for database operations

### Component Organization
- UI components in `components/`
- Business logic in `lib/` and `hooks/`
- Clear separation of concerns

### State Management
- React hooks for local state
- Dexie live queries for reactive database updates
- Context providers for global state (theme, settings)

### Styling
- Tailwind CSS utility classes
- CSS custom properties for theming
- Responsive design patterns

---

## Critical Concepts for AI Agents

### 1. The Contextual Key
Many operations require both `wordId` AND `folderId` to uniquely identify a word's meaning in a specific domain. Always consider context when working with word data.

### 2. Never Violate Agent Boundaries
- The Architect should NEVER provide teaching/explanations
- The Scholar should NEVER modify the database
- Route queries correctly based on user intent

### 3. Offline-First Means Local-First
Always interact with Dexie (IndexedDB) for reads/writes. Supabase sync is secondary and happens in the background.

### 4. Command Terminal is Sacred
The terminal interface follows strict Unix conventions. Don't break user expectations with non-standard behavior.

### 5. Type Safety is Non-Negotiable
Always use proper TypeScript types from `lib/types.ts`. Never use `any` or bypass type checking.

---

## Common Operations

### Adding a Word
1. Create or find the word in `words` table
2. Link it to a folder via `wordFolders` junction table
3. Add context-specific meaning in `wordMeanings`
4. Initialize state in `wordStates` with recall score 0

### Creating a Folder
1. Insert into `folders` table with unique ID
2. Set `parentId` to create hierarchy
3. Optionally set `emoji` and `color` metadata

### Syncing Data
1. Local changes set `needsSync: true` on relevant records
2. Background sync detects dirty records
3. Push to Supabase with conflict resolution
4. Pull latest changes from cloud on login

---

## Next Steps

For detailed information on specific subsystems, see:
- [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md) - Database schema deep dive
- [SSOT_AI_SYSTEM.md](file:///s:/lexical-maxxing/.agent/SSOT_AI_SYSTEM.md) - AI agent architecture
- [SSOT_COMPONENTS.md](file:///s:/lexical-maxxing/.agent/SSOT_COMPONENTS.md) - Component hierarchy

For common workflows, see:
- [.agent/workflows/](file:///s:/lexical-maxxing/.agent/workflows/) - Development workflows

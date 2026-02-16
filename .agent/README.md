# 📚 Lexical Maxxing Agent Documentation

> **Quick reference guide to all SSOT and workflow documentation for AI agents**

## 📖 Single Source of Truth (SSOT) Documents

These documents provide comprehensive understanding of the codebase:

### 1. [SSOT_CODEBASE.md](file:///s:/lexical-maxxing/.agent/SSOT_CODEBASE.md)
**Purpose**: High-level architecture and project overview  
**Contains**:
- Tech stack breakdown
- Project structure
- Architecture patterns (offline-first, dual-agent AI, terminal interface)
- Key files reference
- Development practices
- Critical concepts for AI agents

**When to use**: First document to read when starting work on the project

---

### 2. [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md)
**Purpose**: Complete database schema and data patterns  
**Contains**:
- All 10+ Dexie.js tables with schemas
- Indexes and relationships
- The contextual key pattern `[wordId+folderId]`
- Common queries and operations
- Migration strategies
- Best practices

**When to use**: Working with data, creating queries, modifying schema

---

### 3. [SSOT_AI_SYSTEM.md](file:///s:/lexical-maxxing/.agent/SSOT_AI_SYSTEM.md)
**Purpose**: Dual-agent architecture deep dive  
**Contains**:
- Architect vs Scholar separation
- Tool system (15+ available tools)
- Intent router logic
- System prompts
- Streaming responses
- Context awareness

**When to use**: Working on AI features, debugging agents, prompt engineering

---

### 4. [SSOT_COMPONENTS.md](file:///s:/lexical-maxxing/.agent/SSOT_COMPONENTS.md)
**Purpose**: React component hierarchy and UI organization  
**Contains**:
- Complete component tree
- Key components breakdown (AIWidget, Terminal, FolderTree, etc.)
- State management patterns
- UI/UX patterns (live queries, animations, accessibility)
- Performance optimizations

**When to use**: Building/modifying UI components, fixing visual bugs

---

## 🔧 Workflow Documents

Step-by-step guides for common development tasks:

### 1. [development.md](file:///s:/lexical-maxxing/.agent/workflows/development.md)
**Purpose**: General development workflow  
**Contains**:
- Starting dev server
- Adding components/tables/commands
- Database operations
- Testing changes
- Debugging common issues
- Git workflow
- Environment setup

**Use cases**: Daily development, onboarding, adding features

---

### 2. [testing.md](file:///s:/lexical-maxxing/.agent/workflows/testing.md)
**Purpose**: Testing strategies and debugging  
**Contains**:
- Manual testing (database, terminal, AI agents)
- Automated testing (unit, integration, E2E)
- Debugging techniques
- Performance testing
- Common test scenarios
- Accessibility testing

**Use cases**: QA, debugging issues, writing tests

---

### 3. [database-operations.md](file:///s:/lexical-maxxing/.agent/workflows/database-operations.md)
**Purpose**: Comprehensive Dexie.js operations guide  
**Contains**:
- CRUD operations
- Advanced queries (pagination, sorting, compound indexes)
- Transactions
- Live queries
- Schema migrations
- Performance optimization
- Sync operations

**Use cases**: Complex database work, optimization, migrations

---

### 4. [ai-debugging.md](file:///s:/lexical-maxxing/.agent/workflows/ai-debugging.md)
**Purpose**: AI agent debugging and optimization  
**Contains**:
- Common issues and solutions
- Prompt engineering techniques
- Performance optimization
- Testing agent behavior
- Monitoring and logging
- Advanced debugging

**Use cases**: AI not responding, wrong tool usage, prompt optimization

---

## 🎯 Quick Start for AI Agents

### First Time Working on This Project?

1. **Read in this order**:
   1. [SSOT_CODEBASE.md](file:///s:/lexical-maxxing/.agent/SSOT_CODEBASE.md) - Get the big picture
   2. [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md) - Understand data model
   3. [development.md](file:///s:/lexical-maxxing/.agent/workflows/development.md) - Start coding

2. **When you need to**:
   - Add a feature → [development.md](file:///s:/lexical-maxxing/.agent/workflows/development.md)
   - Fix a bug → [testing.md](file:///s:/lexical-maxxing/.agent/workflows/testing.md)
   - Work with AI → [SSOT_AI_SYSTEM.md](file:///s:/lexical-maxxing/.agent/SSOT_AI_SYSTEM.md) + [ai-debugging.md](file:///s:/lexical-maxxing/.agent/workflows/ai-debugging.md)
   - Optimize database → [database-operations.md](file:///s:/lexical-maxxing/.agent/workflows/database-operations.md)
   - Build UI → [SSOT_COMPONENTS.md](file:///s:/lexical-maxxing/.agent/SSOT_COMPONENTS.md)

---

## 🔑 Core Concepts to Remember

### 1. The Contextual Key
Many operations require **both `wordId` AND `folderId`** because words can have different meanings in different contexts.

### 2. Offline-First
Always interact with **Dexie (IndexedDB)** first. Supabase sync is secondary.

### 3. Dual-Agent Separation
- **Architect** = Database mutations (CREATE, ADD, MOVE, DELETE)
- **Scholar** = Knowledge assistance (EXPLAIN, DEFINE, TEACH)

Never cross these boundaries!

### 4. Terminal is Unix-Like
The `lex-sh` terminal follows standard Unix conventions. Users expect familiar commands.

### 5. Type Safety
Always use proper TypeScript types from `lib/types.ts`. Never use `any`.

---

## 📂 Project Structure Reminder

```
lexical-maxxing/
├── .agent/                   ← YOU ARE HERE
│   ├── SSOT_*.md             ← Architecture docs
│   ├── workflows/            ← Task guides
│   └── README.md             ← This file
│
├── app/                      ← Next.js pages & API
├── components/               ← React UI components
├── lib/                      ← Core business logic
│   ├── ai/                   ← AI agent system
│   ├── terminal/             ← Terminal commands
│   ├── db.ts                 ← Database schema
│   └── types.ts              ← TypeScript types
├── hooks/                    ← Custom React hooks
└── docs/                     ← Original project docs
```

---

## 📝 Document Maintenance

### When to Update These Docs

**SSOT Documents**:
- Adding new tables → Update [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md)
- New AI tools → Update [SSOT_AI_SYSTEM.md](file:///s:/lexical-maxxing/.agent/SSOT_AI_SYSTEM.md)
- New components → Update [SSOT_COMPONENTS.md](file:///s:/lexical-maxxing/.agent/SSOT_COMPONENTS.md)
- Architecture changes → Update [SSOT_CODEBASE.md](file:///s:/lexical-maxxing/.agent/SSOT_CODEBASE.md)

**Workflow Documents**:
- New commands → Update [development.md](file:///s:/lexical-maxxing/.agent/workflows/development.md)
- Common bugs → Update [testing.md](file:///s:/lexical-maxxing/.agent/workflows/testing.md)
- Database patterns → Update [database-operations.md](file:///s:/lexical-maxxing/.agent/workflows/database-operations.md)
- AI issues → Update [ai-debugging.md](file:///s:/lexical-maxxing/.agent/workflows/ai-debugging.md)

---

## 🆘 Need Help?

1. **Can't find what you're looking for?**
   - Use `Ctrl+F` (Find) in these markdown files
   - Check the [docs/](file:///s:/lexical-maxxing/docs/) folder for original docs

2. **Documentation unclear?**
   - Update it to be clearer!
   - Add examples
   - Fix outdated information

3. **Found a bug in the docs?**
   - These are living documents
   - Update them as the codebase evolves

---

## 📊 Statistics

- **SSOT Documents**: 4 comprehensive guides (~15,000 words)
- **Workflow Documents**: 4 task-specific guides (~12,000 words)
- **Total Coverage**: Database, AI, UI, Terminal, Testing, Debugging
- **Last Updated**: 2026-02-16

---

**Remember**: These documents are your map to the codebase. Refer to them often! 🗺️

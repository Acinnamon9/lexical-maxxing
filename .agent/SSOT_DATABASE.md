# SSOT: Database Schema

> **Single Source of Truth for the Lexical Maxxing database structure, relationships, and data patterns**

## Overview

Lexical Maxxing uses **Dexie.js** (an IndexedDB wrapper) for client-side storage. The schema is designed around a **contextual model** where words can have different meanings in different folders (domains).

**Database Name**: `LexicalDatabase`  
**Location**: IndexedDB (browser storage)  
**Schema Version**: Managed by Dexie.js migrations

---

## Core Tables

### 1. `folders`
Hierarchical organization structure for vocabulary domains.

```typescript
interface Folder {
  id: string;              // UUID primary key
  name: string;            // Display name
  parentId: string | null; // Links to parent folder (null = root)
  emoji?: string;          // Optional emoji icon
  color?: string;          // Hex or CSS color
  updatedAt?: number;      // Timestamp for sync
}
```

**Indexes**:
- Primary: `id`
- Lookup: `parentId` (for finding subfolders)

**Use Cases**:
- Organize words by domain (e.g., "Medicine", "Law", "Engineering")
- Create nested hierarchies (e.g., "Biology > Anatomy > Cardiovascular")
- Visual categorization with emoji and color

---

### 2. `words`
Global word list (term only, no context-specific data).

```typescript
interface Word {
  id: string;      // UUID primary key
  term: string;    // The word itself (e.g., "Current")
  color?: string;  // Optional highlight color
}
```

**Indexes**:
- Primary: `id`

**Design Note**: 
- Words are globally unique by `id`, not by `term`
- A single word can exist in multiple folders with different meanings
- The `term` field is NOT indexed—use `wordFolders` for folder-specific lookups

---

### 3. `wordFolders`
Junction table linking words to folders (many-to-many).

```typescript
interface WordFolder {
  wordId: string;   // Foreign key to words.id
  folderId: string; // Foreign key to folders.id
}
```

**Indexes**:
- Compound: `[wordId+folderId]` (primary key)
- Lookup: `folderId` (find all words in a folder)

**Critical Pattern**: This is the foundation of the contextual model. A word exists in a folder only if a record exists in this table.

---

### 4. `wordMeanings`
Context-specific definitions for words.

```typescript
interface WordMeaning {
  id: string;        // UUID primary key
  wordId: string;    // Foreign key to words.id
  folderId: string;  // Foreign key to folders.id
  content: string;   // Markdown-formatted definition
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}
```

**Indexes**:
- Primary: `id`
- Compound: `[wordId+folderId]` (find meaning for word in specific folder)

**Use Case**:
- "Current" in "Oceanography" folder: "The directional movement of water..."
- "Current" in "Electronics" folder: "The flow of electric charge through a conductor..."

---

### 5. `wordStates`
Tracks user progress and spaced repetition data.

```typescript
interface WordState {
  wordId: string;            // Foreign key to words.id (primary key)
  recognitionScore: number;  // 0-5: Can recognize the word
  recallScore: number;       // 0-5: Can recall definition from memory
  lastReviewedAt: number;    // Timestamp of last review
  nextReviewAt: number;      // Scheduled next review timestamp
  updatedAt: number;         // Last modification timestamp
  needsSync: boolean;        // Dirty flag for Supabase sync
}
```

**Indexes**:
- Primary: `wordId`

**Mastery Levels**:
- `0`: New/Unseen
- `1-2`: Learning (weak recall)
- `3-4`: Familiar (strong recall)
- `5`: Mastered (permanent retention)

**Spaced Repetition**:
- `nextReviewAt` is calculated based on recall score and forgetting curve
- Higher scores = longer intervals between reviews

---

### 6. `productions`
User-generated content (example sentences, mnemonics, custom notes).

```typescript
interface Production {
  id: string;        // UUID primary key
  wordId: string;    // Foreign key to words.id
  folderId: string;  // Foreign key to folders.id
  content: string;   // Markdown content
  version: number;   // Optimistic concurrency control
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  needsSync: boolean;// Sync flag
}
```

**Indexes**:
- Primary: `id`
- Compound: `[wordId+folderId]`

**Use Cases**:
- User writes example sentences: "The ocean current was strong today."
- Creates mnemonic devices: "Current = sea Current"

---

### 7. `notes`
Folder-level notes (not tied to specific words).

```typescript
interface Note {
  id: string;        // UUID primary key
  folderId: string;  // Foreign key to folders.id
  title: string;     // Note title
  content: string;   // Markdown content
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}
```

**Indexes**:
- Primary: `id`
- Lookup: `folderId`

**Use Case**:
- Study guides for a folder
- Domain-specific reference material
- Learning summaries

---

### 8. `doubts`
AI conversation history for word-specific questions.

```typescript
interface Doubt {
  id: string;                               // UUID primary key
  wordId: string;                           // Foreign key to words.id
  folderId: string;                         // Foreign key to folders.id
  query: string;                            // User's question
  response: string | null;                  // AI's response
  status: "pending" | "resolved" | "error"; // Processing status
  createdAt: number;                        // Timestamp
  updatedAt: number;                        // Timestamp
}
```

**Indexes**:
- Primary: `id`
- Compound: `[wordId+folderId]`
- Sort: `createdAt` (chronological order)

**Use Case**:
- Track questions asked about specific words
- Review learning history
- AI Scholar mode conversations

---

### 9. `agentSessions` & `agentMessages`
Chat history with the AI agents.

```typescript
interface AgentSession {
  id: string;        // UUID primary key
  title: string;     // Session name
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

interface AgentMessage {
  id: string;                       // UUID primary key
  sessionId: string;                // Foreign key to agentSessions.id
  role: "user" | "agent" | "system";// Message sender
  text: string;                     // Message content
  createdAt: number;                // Timestamp
}
```

**Indexes**:
- agentSessions: Primary `id`
- agentMessages: Primary `id`, Lookup `sessionId`

**Use Case**:
- Preserve AI conversation context across sessions
- Review past Architect/Scholar interactions

---

### 10. `userSettings`
Key-value store for user preferences (synced to Supabase).

```typescript
interface UserSetting {
  id: string;        // Setting key (e.g., "theme", "defaultFolder")
  value: string;     // JSON-serialized value
  updatedAt: number; // Timestamp
}
```

**Indexes**:
- Primary: `id`

**Synced Settings**:
- Theme preferences
- Default folder selection
- AI agent mode preference
- Terminal history settings

---

## Advanced Tables (Future/Experimental)

### `reviewSessions`
Spaced repetition review sessions.

```typescript
interface ReviewSession {
  id: string;
  folderId: string;
  mode: "spaced_rep" | "random" | "weak_first";
  wordIds: string[];      // Queue of words to review
  currentIndex: number;   // Current position in queue
  completedIds: string[]; // Reviewed words
  createdAt: number;
  updatedAt: number;
}
```

### `wordLinks`
Knowledge graph relationships between words.

```typescript
interface WordLink {
  id: string;
  wordId1: string;
  wordId2: string;
  relationType: "synonym" | "antonym" | "related" | "derives_from" | "part_of";
  createdAt: number;
}
```

### `wordGroups`
Semantic clusters of related words within a folder.

```typescript
interface WordGroup {
  id: string;
  name: string;        // E.g., "Cardiac Terminology"
  folderId: string;
  wordIds: string[];   // Array of word IDs
  createdAt: number;
}
```

---

## Key Data Patterns

### The Contextual Key (`[wordId+folderId]`)

**Critical Concept**: Most word-related operations require BOTH `wordId` AND `folderId` to ensure context-specific data retrieval.

**Example Query**:
```typescript
// Get meaning for "Current" in "Oceanography" folder
const meaning = await db.wordMeanings
  .where('[wordId+folderId]')
  .equals([wordId, folderId])
  .first();
```

**Affected Tables**:
- `wordMeanings`
- `productions`
- `doubts`
- `wordFolders` (junction)

### Sync Flags

Tables with `needsSync: boolean` field participate in Supabase cloud sync:
- `wordStates`
- `productions`
- `userSettings` (always synced)

**Sync Logic**:
1. Local write sets `needsSync: true`
2. Background worker detects dirty records
3. Push to Supabase with Last-Write-Wins conflict resolution
4. Reset `needsSync: false` on success

### Hierarchical Folders

Folders form a tree structure via `parentId`:
- `parentId: null` = Root-level folder
- `parentId: <uuid>` = Child of another folder

**Recursive Query** (find all descendants):
```typescript
async function getDescendants(folderId: string): Promise<Folder[]> {
  const children = await db.folders.where('parentId').equals(folderId).toArray();
  const descendants = [...children];
  for (const child of children) {
    descendants.push(...await getDescendants(child.id));
  }
  return descendants;
}
```

---

## Database Operations Reference

### Common Queries

**Get all words in a folder**:
```typescript
const wordIds = (await db.wordFolders.where('folderId').equals(folderId).toArray())
  .map(wf => wf.wordId);
const words = await db.words.bulkGet(wordIds);
```

**Get enriched word with state**:
```typescript
const word = await db.words.get(wordId);
const state = await db.wordStates.get(wordId);
const enrichedWord = { ...word, state };
```

**Create word with meaning**:
```typescript
const wordId = uuid();
await db.transaction('rw', [db.words, db.wordFolders, db.wordMeanings, db.wordStates], async () => {
  await db.words.add({ id: wordId, term: "Current" });
  await db.wordFolders.add({ wordId, folderId });
  await db.wordMeanings.add({ id: uuid(), wordId, folderId, content: "..." });
  await db.wordStates.add({ wordId, recallScore: 0, recognitionScore: 0, ... });
});
```

---

## Migration Strategy

Dexie handles schema migrations automatically:
1. Update `lib/db.ts` with new table/index definitions
2. Increment the version number: `db.version(N+1).stores({ ... })`
3. Old data is preserved; new indexes are built on first access

**Example**:
```typescript
this.version(1).stores({
  folders: 'id, parentId',
  words: 'id',
});

this.version(2).stores({
  folders: 'id, parentId',
  words: 'id',
  wordStates: 'wordId', // NEW TABLE
});
```

---

## Best Practices for AI Agents

1. **Always use transactions** for multi-table writes to ensure atomicity
2. **Respect the contextual key** pattern—never query `wordMeanings` without both `wordId` and `folderId`
3. **Use batch operations** (`bulkAdd`, `bulkGet`) for performance
4. **Filter sync-enabled tables** when implementing sync logic
5. **Validate foreign keys** before writes to prevent orphaned records
6. **Use live queries** (`useLiveQuery`) in React for reactive UIs

---

## Related Documentation

- [SSOT_CODEBASE.md](file:///s:/lexical-maxxing/.agent/SSOT_CODEBASE.md) - Overall architecture
- [lib/db.ts](file:///s:/lexical-maxxing/lib/db.ts) - Actual Dexie schema implementation
- [lib/types.ts](file:///s:/lexical-maxxing/lib/types.ts) - TypeScript interfaces

# Database Schema (Dexie.js)

The application uses **Dexie.js** to manage an IndexedDB database named `LexicalDatabase`. The schema is designed for fast local lookups and complex relationships.

## Tables & Indices

### 1. `folders`
Stores the hierarchical structure of the dictionary.
- **Fields**: `id`, `name`, `parentId` (links to another folder)
- **Primary Index**: `id`
- **Lookup Index**: `parentId`

### 2. `words`
Global list of terms.
- **Fields**: `id`, `term`
- **Primary Index**: `id`

### 3. `wordFolders`
A junction table representing the relationship between words and folders.
- **Fields**: `wordId`, `folderId`
- **Compound Index**: `[wordId+folderId]`, `folderId`

### 4. `wordMeanings`
Context-specific definitions.
- **Fields**: `id`, `wordId`, `folderId`, `content`, `createdAt`, `updatedAt`
- **Compound Index**: `[wordId+folderId]`

### 5. `wordStates`
Tracks the user's progress and mastery.
- **Fields**: `wordId`, `recallScore` (0-5), `lastReviewedAt`, `nextReviewAt`, `updatedAt`
- **Primary Index**: `wordId`

### 6. `doubts` (AI History)
Stores conversations with the AI.
- **Fields**: `id`, `wordId`, `folderId`, `query`, `response`, `status` (`pending`, `resolved`), `createdAt`
- **Compound Index**: `[wordId+folderId]`
- **Sorting Index**: `createdAt`

## Key Data Patterns

### The "Contextual Key"
Many tables use a compound index `[wordId+folderId]`. This is the "soul" of the app—it ensures that when you ask for a word's meaning, you get the version tied to the current folder (domain), not a generic global definition.

### Recall Scoring
Progress is tracked via `recallScore`:
- `0`: New/Unseen
- `2+`: Familiar (FAM)
- `5`: Mastered (MASTERED)

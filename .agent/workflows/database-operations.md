---
description: Database operations and maintenance workflows
---

# Database Operations Workflow

Guide for working with the Dexie.js IndexedDB database in Lexical Maxxing.

## Database Overview

**Database Name**: `LexicalDatabase`  
**Technology**: Dexie.js (IndexedDB wrapper)  
**Location**: Browser storage (client-side)

---

## Common Database Operations

### Accessing the Database

The database instance is available throughout the app:

```typescript
import { db } from '@/lib/db';
```

In browser console (for debugging):
```javascript
// If exposed globally
window.db
```

---

### Reading Data

#### Get Single Record by ID

```typescript
// Get folder by ID
const folder = await db.folders.get(folderId);

// Get word by ID
const word = await db.words.get(wordId);

// Get word state
const state = await db.wordStates.get(wordId);
```

#### Get All Records

```typescript
// Get all folders
const folders = await db.folders.toArray();

// Get all words
const words = await db.words.toArray();
```

#### Query with Index

```typescript
// Get all child folders of a parent
const children = await db.folders.where('parentId').equals(parentId).toArray();

// Get all words in a folder
const wordLinks = await db.wordFolders.where('folderId').equals(folderId).toArray();
const wordIds = wordLinks.map(wl => wl.wordId);
const words = await db.words.bulkGet(wordIds);
```

#### Query with Compound Index

```typescript
// Get meaning for word in specific folder
const meaning = await db.wordMeanings
  .where('[wordId+folderId]')
  .equals([wordId, folderId])
  .first();

// Get all meanings for a word across all folders
const meanings = await db.wordMeanings
  .where('wordId')
  .equals(wordId)
  .toArray();
```

#### Filter with Multiple Conditions

```typescript
// Get all words with high mastery (recall score >= 4)
const masteredWords = await db.wordStates
  .where('recallScore')
  .aboveOrEqual(4)
  .toArray();

// Get words needing review (nextReviewAt <= now)
const dueWords = await db.wordStates
  .where('nextReviewAt')
  .belowOrEqual(Date.now())
  .toArray();
```

#### Count Records

```typescript
// Count all folders
const folderCount = await db.folders.count();

// Count words in a folder
const wordCount = await db.wordFolders.where('folderId').equals(folderId).count();
```

---

### Writing Data

#### Insert Single Record

```typescript
const folderId = crypto.randomUUID();
await db.folders.add({
  id: folderId,
  name: 'New Folder',
  parentId: null,
  emoji: '📁',
  color: '#3b82f6',
  updatedAt: Date.now(),
});
```

#### Insert Multiple Records (Bulk)

```typescript
await db.words.bulkAdd([
  { id: crypto.randomUUID(), term: 'Word 1' },
  { id: crypto.randomUUID(), term: 'Word 2' },
  { id: crypto.randomUUID(), term: 'Word 3' },
]);
```

#### Update Record

```typescript
// Update by ID
await db.folders.update(folderId, {
  name: 'Updated Name',
  emoji: '✨',
  updatedAt: Date.now(),
});

// Update with where clause
await db.wordStates
  .where('wordId')
  .equals(wordId)
  .modify({
    recallScore: 5,
    lastReviewedAt: Date.now(),
    updatedAt: Date.now(),
  });
```

#### Upsert (Insert or Update)

```typescript
await db.wordStates.put({
  wordId: wordId,
  recognitionScore: 3,
  recallScore: 2,
  lastReviewedAt: Date.now(),
  nextReviewAt: Date.now() + 86400000,
  updatedAt: Date.now(),
  needsSync: true,
});
```

`put()` will insert if not exists, update if exists.

---

### Deleting Data

#### Delete Single Record

```typescript
await db.folders.delete(folderId);
```

#### Delete with Where Clause

```typescript
// Delete all words in a folder (from junction table)
await db.wordFolders.where('folderId').equals(folderId).delete();

// Delete all meanings for a word
await db.wordMeanings.where('wordId').equals(wordId).delete();
```

#### Delete Multiple Records

```typescript
const wordIdsToDelete = ['id1', 'id2', 'id3'];
await db.words.bulkDelete(wordIdsToDelete);
```

---

### Transactions

For operations affecting multiple tables, **always use transactions** to ensure atomicity.

#### Basic Transaction

```typescript
await db.transaction('rw', [db.words, db.wordFolders, db.wordMeanings], async () => {
  const wordId = crypto.randomUUID();

  // All or nothing
  await db.words.add({ id: wordId, term: 'Example' });
  await db.wordFolders.add({ wordId, folderId });
  await db.wordMeanings.add({
    id: crypto.randomUUID(),
    wordId,
    folderId,
    content: 'Definition',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
});
```

If any operation fails, all are rolled back.

#### Complex Transaction

```typescript
// Delete folder with cascade delete of words
await db.transaction('rw', [db.folders, db.wordFolders, db.wordMeanings], async () => {
  // Get all words in this folder
  const wordLinks = await db.wordFolders.where('folderId').equals(folderId).toArray();
  const wordIds = wordLinks.map(wl => wl.wordId);

  // Delete meanings
  await db.wordMeanings.where('folderId').equals(folderId).delete();

  // Delete word-folder links
  await db.wordFolders.where('folderId').equals(folderId).delete();

  // Delete folder
  await db.folders.delete(folderId);

  console.log(`Deleted folder and ${wordIds.length} word links`);
});
```

---

## Advanced Queries

### Pagination

```typescript
// Get page 2 (items 10-19)
const pageSize = 10;
const pageNumber = 2;
const words = await db.words
  .offset(pageSize * (pageNumber - 1))
  .limit(pageSize)
  .toArray();
```

### Sorting

```typescript
// Sort folders alphabetically
const folders = await db.folders.orderBy('name').toArray();

// Sort words by recall score (descending)
const words = await db.wordStates.orderBy('recallScore').reverse().toArray();
```

### Full-Text Search (Limited)

Dexie doesn't support full-text search natively, but you can filter in memory:

```typescript
const allWords = await db.words.toArray();
const searchTerm = 'example';
const results = allWords.filter(w =>
  w.term.toLowerCase().includes(searchTerm.toLowerCase())
);
```

For better search, consider:
- Adding a search library (like Fuse.js)
- Using Supabase full-text search
- Implementing a prefix tree (trie)

---

## Live Queries (React Hook)

### Using `useLiveQuery`

Automatically re-renders components when database changes.

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

function FolderList() {
  const folders = useLiveQuery(() => db.folders.toArray());

  if (!folders) return <div>Loading...</div>;

  return (
    <ul>
      {folders.map(f => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  );
}
```

### Live Query with Dependencies

```typescript
function WordsInFolder({ folderId }: { folderId: string }) {
  const words = useLiveQuery(async () => {
    const wordLinks = await db.wordFolders.where('folderId').equals(folderId).toArray();
    const wordIds = wordLinks.map(wl => wl.wordId);
    return await db.words.bulkGet(wordIds);
  }, [folderId]); // Re-run when folderId changes

  if (!words) return <div>Loading...</div>;

  return <div>{words.length} words</div>;
}
```

---

## Schema Migrations

### Adding a New Table

1. Edit `lib/db.ts`:

```typescript
class LexicalDB extends Dexie {
  folders!: Table<Folder>;
  words!: Table<Word>;
  myNewTable!: Table<MyNewType>; // Add type

  constructor() {
    super('LexicalDatabase');

    this.version(1).stores({
      folders: 'id, parentId',
      words: 'id',
    });

    // Increment version for new table
    this.version(2).stores({
      folders: 'id, parentId',
      words: 'id',
      myNewTable: 'id, someField', // Add schema
    });
  }
}
```

2. Define type in `lib/types.ts`:

```typescript
export interface MyNewType {
  id: string;
  someField: string;
}
```

### Changing Indexes

```typescript
// Version 1
this.version(1).stores({
  words: 'id',
});

// Version 2: Add index on 'term'
this.version(2).stores({
  words: 'id, term',
});
```

### Data Migration

```typescript
this.version(2).stores({
  folders: 'id, parentId, color', // Add 'color' index
}).upgrade(tx => {
  // Set default color for existing folders
  return tx.table('folders').toCollection().modify(folder => {
    if (!folder.color) {
      folder.color = '#3b82f6';
    }
  });
});
```

---

## Maintenance Operations

### Clear Entire Database

```typescript
// Nuclear option: delete and recreate
await db.delete();
location.reload(); // Reinitialized on next load
```

### Clear Specific Table

```typescript
await db.folders.clear();
```

### Vacuum (Not Needed)

IndexedDB handles garbage collection automatically.

### Export All Data

```typescript
async function exportAllData() {
  const data = {
    folders: await db.folders.toArray(),
    words: await db.words.toArray(),
    wordFolders: await db.wordFolders.toArray(),
    wordMeanings: await db.wordMeanings.toArray(),
    wordStates: await db.wordStates.toArray(),
    // ... other tables
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `lexical-backup-${Date.now()}.json`;
  a.click();
}
```

### Import Data

```typescript
async function importData(jsonString: string) {
  const data = JSON.parse(jsonString);

  await db.transaction('rw', db.tables, async () => {
    // Clear existing data
    for (const table of db.tables) {
      await table.clear();
    }

    // Import new data
    await db.folders.bulkAdd(data.folders);
    await db.words.bulkAdd(data.words);
    await db.wordFolders.bulkAdd(data.wordFolders);
    // ... other tables
  });
}
```

---

## Performance Optimization

### Use Indexes Wisely

Only index fields you query by. Too many indexes slow down writes.

✅ **Good**:
```typescript
// Frequently query by parentId
folders: 'id, parentId'
```

❌ **Bad**:
```typescript
// Indexing everything unnecessarily
folders: 'id, name, parentId, emoji, color, updatedAt'
```

### Batch Operations

Use `bulkAdd`, `bulkGet`, `bulkDelete` instead of loops:

❌ **Slow**:
```typescript
for (const word of words) {
  await db.words.add(word);
}
```

✅ **Fast**:
```typescript
await db.words.bulkAdd(words);
```

### Limit Query Results

```typescript
// Don't load all 10,000 words
const words = await db.words.limit(100).toArray();
```

### Use Transactions for Bulk Writes

Wrapping multiple writes in a transaction is faster:

```typescript
await db.transaction('rw', [db.words], async () => {
  for (const word of words) {
    await db.words.add(word);
  }
});
```

---

## Debugging Database Issues

### Check if Database is Open

```javascript
console.log('Database open:', db.isOpen());
console.log('Database version:', db.verno);
```

### List All Tables

```javascript
db.tables.forEach(table => {
  console.log(table.name);
});
```

### Inspect Table Schema

```javascript
const table = db.table('words');
console.log('Primary key:', table.schema.primKey.name);
console.log('Indexes:', table.schema.indexes.map(idx => idx.name));
```

### Monitor All Database Changes

```typescript
db.on('changes', changes => {
  console.log('Database changes:', changes);
});
```

### Find Slow Queries

```typescript
console.time('query');
const results = await db.words.where('term').startsWith('a').toArray();
console.timeEnd('query');
```

---

## Common Patterns

### Get Enriched Word (Word + State)

```typescript
async function getEnrichedWord(wordId: string): Promise<EnrichedWord | null> {
  const word = await db.words.get(wordId);
  if (!word) return null;

  const state = await db.wordStates.get(wordId);
  return { ...word, state };
}
```

### Get Folder Hierarchy

```typescript
async function getFolderHierarchy(folderId: string): Promise<Folder[]> {
  const path: Folder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = await db.folders.get(currentId);
    if (!folder) break;

    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}
```

### Cascade Delete Folder

```typescript
async function deleteFolderRecursive(folderId: string) {
  await db.transaction('rw', [db.folders, db.wordFolders, db.wordMeanings], async () => {
    // Delete all subfolders
    const children = await db.folders.where('parentId').equals(folderId).toArray();
    for (const child of children) {
      await deleteFolderRecursive(child.id);
    }

    // Delete word associations
    await db.wordMeanings.where('folderId').equals(folderId).delete();
    await db.wordFolders.where('folderId').equals(folderId).delete();

    // Delete folder itself
    await db.folders.delete(folderId);
  });
}
```

---

## Sync Operations

### Mark Record as Dirty

```typescript
await db.wordStates.update(wordId, {
  needsSync: true,
  updatedAt: Date.now(),
});
```

### Get All Dirty Records

```typescript
const dirtyStates = await db.wordStates
  .where('needsSync')
  .equals(1) // or true, depending on type
  .toArray();
```

### Push to Supabase

```typescript
async function syncToSupabase() {
  const dirtyRecords = await db.wordStates.where('needsSync').equals(true).toArray();

  for (const record of dirtyRecords) {
    await supabase.from('word_states').upsert({
      word_id: record.wordId,
      recall_score: record.recallScore,
      // ... other fields
    });

    await db.wordStates.update(record.wordId, { needsSync: false });
  }
}
```

---

## Related Documentation

- [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md) - Complete schema reference
- [development.md](file:///s:/lexical-maxxing/.agent/workflows/development.md) - Development setup
- [lib/db.ts](file:///s:/lexical-maxxing/lib/db.ts) - Database implementation

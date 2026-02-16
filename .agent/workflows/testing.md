---
description: Testing and debugging workflows
---

# Testing Workflow

Comprehensive guide for testing Lexical Maxxing features and debugging issues.

## Manual Testing

### Testing Database Operations

#### Create Test Data

1. Open browser console (F12)
2. Run test queries:

```javascript
// Create test folder
const testFolderId = crypto.randomUUID();
await db.folders.add({
  id: testFolderId,
  name: 'Test Folder',
  parentId: null,
  emoji: '🧪',
  color: '#3b82f6'
});

// Create test word
const testWordId = crypto.randomUUID();
await db.words.add({
  id: testWordId,
  term: 'Test Word',
});

// Link word to folder
await db.wordFolders.add({
  wordId: testWordId,
  folderId: testFolderId,
});

// Add meaning
await db.wordMeanings.add({
  id: crypto.randomUUID(),
  wordId: testWordId,
  folderId: testFolderId,
  content: 'This is a test definition.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Initialize word state
await db.wordStates.add({
  wordId: testWordId,
  recognitionScore: 0,
  recallScore: 0,
  lastReviewedAt: Date.now(),
  nextReviewAt: Date.now() + 86400000, // +1 day
  updatedAt: Date.now(),
  needsSync: false,
});
```

#### Verify Test Data

```javascript
// Check folder was created
const folder = await db.folders.get(testFolderId);
console.log('Folder:', folder);

// Check word is linked to folder
const wordFolders = await db.wordFolders.where('folderId').equals(testFolderId).toArray();
console.log('Words in folder:', wordFolders);

// Check meaning exists
const meaning = await db.wordMeanings
  .where('[wordId+folderId]')
  .equals([testWordId, testFolderId])
  .first();
console.log('Meaning:', meaning);
```

#### Clean Up Test Data

```javascript
// Delete test word (cascade)
await db.transaction('rw', [db.words, db.wordFolders, db.wordMeanings, db.wordStates], async () => {
  await db.wordStates.delete(testWordId);
  await db.wordMeanings.where('wordId').equals(testWordId).delete();
  await db.wordFolders.where('wordId').equals(testWordId).delete();
  await db.words.delete(testWordId);
});

// Delete test folder
await db.folders.delete(testFolderId);
```

---

### Testing Terminal Commands

#### Basic Commands

```bash
# List all root folders
ls

# Create a test folder
mkdir "Testing Folder"

# Navigate into it
cd "Testing Folder"

# Add a word
add "example" "A representative instance"

# List words in current folder
ls

# Search for a word
search example

# Get folder statistics
stats

# Navigate back to root
cd ..

# Remove the test folder
rm "Testing Folder"
```

#### Advanced Commands

```bash
# Create nested structure
mkdir Parent
cd Parent
mkdir Child1
mkdir Child2
cd Child1
add "word1" "Definition 1"
add "word2" "Definition 2"

# Navigate and verify
cd ..
cd Child2
ls
cd ../..

# Move folder
mv "Parent/Child1" "Parent/Child2/"

# Verify move
cd "Parent/Child2/Child1"
ls
```

---

### Testing AI Agents

#### Architect Mode Tests

1. Open AI Widget (`Cmd + J`)
2. Switch to **Architect** mode
3. Test these prompts:

**Folder Creation**:
```
Create a folder called "Medical Terminology" with a 🏥 emoji
```

**Word Addition**:
```
Add these words to "Medical Terminology":
- Anemia: Low red blood cell count
- Tachycardia: Abnormally fast heart rate
- Hypoxia: Insufficient oxygen supply
```

**Bulk Operations**:
```
Create a subfolder called "Cardiology" under "Medical Terminology" and move all heart-related words there
```

**Reorganization**:
```
Rename "Medical Terminology" to "Clinical Medicine"
```

**Metadata Updates**:
```
Change the emoji for "Cardiology" to ❤️ and set the color to red
```

#### Expected Behavior:
- Architect should use tool calls (visible in UI)
- Database should update immediately
- Success message should confirm actions

---

#### Scholar Mode Tests

1. Switch to **Scholar** mode
2. Test these prompts:

**Definitions**:
```
What does "mitochondria" mean in the context of cell biology?
```

**Examples**:
```
Give me 5 example sentences using the word "serendipity"
```

**Etymology**:
```
Explain the origin of the word "philosophy"
```

**Comparisons**:
```
What's the difference between "affect" and "effect"?
```

#### Expected Behavior:
- Scholar should NOT use any tools
- Responses should be educational and detailed
- No database modifications

---

### Testing UI Components

#### Folder Tree

1. Create several nested folders via terminal or Architect
2. Verify:
   - [ ] Folders display correct emoji and name
   - [ ] Clicking expands/collapses subfolders
   - [ ] Word count badge is accurate
   - [ ] Selected folder is highlighted
   - [ ] Right-click context menu works

#### Word Grid

1. Navigate to a folder with words
2. Verify:
   - [ ] Words display in grid layout
   - [ ] Mastery badges show correct score (0-5 stars)
   - [ ] Clicking a word opens MeaningModal
   - [ ] Delete button removes word from folder
   - [ ] Chunk pagination works (if >15 words)

#### Meaning Modal

1. Click on a word to open modal
2. Verify:
   - [ ] Displays current meaning (if exists)
   - [ ] Edit button switches to edit mode
   - [ ] Markdown rendering works
   - [ ] Save button persists changes
   - [ ] Cancel button discards changes
   - [ ] "Ask AI Scholar" button works

---

## Automated Testing (Future)

### Unit Tests (Jest)

Test individual functions and components in isolation.

**Example**: Testing a database query function

```typescript
// lib/__tests__/db.test.ts
import { db } from '@/lib/db';

describe('Database Operations', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should create a folder', async () => {
    const folderId = crypto.randomUUID();
    await db.folders.add({
      id: folderId,
      name: 'Test',
      parentId: null,
    });

    const folder = await db.folders.get(folderId);
    expect(folder).toBeDefined();
    expect(folder?.name).toBe('Test');
  });
});
```

**Run tests**:
```bash
npm run test
```

---

### Integration Tests (React Testing Library)

Test component interactions with database.

**Example**: Testing WordCard component

```typescript
// components/__tests__/WordCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCard } from '@/components/word/WordCard';

describe('WordCard', () => {
  it('displays word term and mastery level', () => {
    const mockWord = { id: '1', term: 'Example' };
    const mockState = { recallScore: 3, recognitionScore: 4 };

    render(<WordCard word={mockWord} state={mockState} />);

    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('⭐⭐⭐')).toBeInTheDocument();
  });

  it('opens meaning modal on click', () => {
    const mockOnClick = jest.fn();
    const mockWord = { id: '1', term: 'Example' };

    render(<WordCard word={mockWord} onClick={mockOnClick} />);

    fireEvent.click(screen.getByText('Example'));
    expect(mockOnClick).toHaveBeenCalledWith('1');
  });
});
```

---

### E2E Tests (Playwright)

Test full user workflows in browser.

**Example**: Full folder creation + word addition flow

```typescript
// e2e/folder-creation.spec.ts
import { test, expect } from '@playwright/test';

test('create folder and add word', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Open terminal
  await page.keyboard.press('Control+`');

  // Create folder
  await page.fill('[data-testid="terminal-input"]', 'mkdir "Test Folder"');
  await page.keyboard.press('Enter');

  // Verify folder appears
  await expect(page.locator('text=Test Folder')).toBeVisible();

  // Navigate into folder
  await page.fill('[data-testid="terminal-input"]', 'cd "Test Folder"');
  await page.keyboard.press('Enter');

  // Add word
  await page.fill('[data-testid="terminal-input"]', 'add "example" "definition"');
  await page.keyboard.press('Enter');

  // Verify word appears
  await expect(page.locator('text=example')).toBeVisible();
});
```

**Run E2E tests**:
```bash
npx playwright test
```

---

## Debugging Techniques

### Debugging Database Issues

#### View All Tables

```javascript
// List all table names
console.log(db.tables.map(t => t.name));

// Count records in each table
for (const table of db.tables) {
  const count = await table.count();
  console.log(`${table.name}: ${count} records`);
}
```

#### Inspect Specific Records

```javascript
// Get all folders with their word counts
const folders = await db.folders.toArray();
for (const folder of folders) {
  const wordCount = await db.wordFolders.where('folderId').equals(folder.id).count();
  console.log(`${folder.name}: ${wordCount} words`);
}
```

#### Find Orphaned Records

```javascript
// Find words not linked to any folder
const allWords = await db.words.toArray();
const linkedWordIds = new Set(
  (await db.wordFolders.toArray()).map(wf => wf.wordId)
);

const orphanedWords = allWords.filter(w => !linkedWordIds.has(w.id));
console.log('Orphaned words:', orphanedWords);
```

#### Transaction Debugging

```javascript
// Log all operations in a transaction
await db.transaction('rw', [db.words, db.wordFolders], async () => {
  console.log('Starting transaction...');

  const wordId = crypto.randomUUID();
  await db.words.add({ id: wordId, term: 'Test' });
  console.log('Added word:', wordId);

  await db.wordFolders.add({ wordId, folderId: 'some-folder-id' });
  console.log('Linked word to folder');

  console.log('Transaction complete');
});
```

---

### Debugging AI Agents

#### Monitor Tool Calls

When Architect is running, open DevTools Network tab:
1. Filter by "api" or "gemini"
2. Click on request to see:
   - Request payload (user prompt + tools)
   - Response (tool calls + text)
3. Verify tool parameters are correct

#### Test Prompt in Google AI Studio

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Copy the system prompt from `lib/ai/prompts.ts`
3. Test with user queries
4. Iterate on prompt engineering

#### Log Streaming Responses

```typescript
// In components/AIWidget.tsx
async function sendMessage(text: string) {
  const stream = streamResponse(text, mode);

  for await (const chunk of stream) {
    console.log('Chunk:', chunk);  // Debug each chunk
    // ... update UI
  }
}
```

---

### Debugging Terminal Issues

#### Command Parsing

```typescript
// In lib/terminal/parser.ts
export function parseCommand(cmdLine: string) {
  console.log('Parsing:', cmdLine);
  const parsed = /* parsing logic */;
  console.log('Parsed:', parsed);
  return parsed;
}
```

#### Command Execution

```typescript
// In lib/terminal/commands.ts
export const myCommand: CommandHandler = async (args, context) => {
  console.log('Executing myCommand with args:', args);
  console.log('Context:', context);

  // ... command logic
};
```

---

## Performance Testing

### Measure Database Query Time

```javascript
console.time('query');
const results = await db.words.where('term').startsWith('a').toArray();
console.timeEnd('query');
console.log(`Found ${results.length} results`);
```

### Measure Component Render Time

```typescript
// In component
import { useEffect } from 'react';

useEffect(() => {
  console.time('render');
  return () => console.timeEnd('render');
}, []);
```

### Check Bundle Size

```bash
npm run build
```

Look for warnings about large bundles.

**Analyze bundle**:
```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({});
```

```bash
ANALYZE=true npm run build
```

---

## Common Test Scenarios

### Scenario 1: User adds multiple words via AI

1. Open AI Widget → Architect mode
2. "Add these 10 words to Biology folder: [list words]"
3. Verify:
   - All words appear in folder
   - Each has a meaning
   - Word states are initialized

### Scenario 2: User reviews words with spaced repetition

1. Navigate to a folder
2. Click "Review" button (future feature)
3. Rate each word's mastery
4. Verify `nextReviewAt` is updated correctly

### Scenario 3: User syncs data to Supabase

1. Make local changes (add words, create folders)
2. Trigger manual sync
3. Check Supabase dashboard for new records
4. Verify `needsSync` flags are reset

### Scenario 4: User imports vocabulary from CSV

1. Prepare CSV file:
   ```csv
   term,meaning
   Word1,Definition 1
   Word2,Definition 2
   ```
2. Use import functionality
3. Verify all words are created with meanings

---

## Accessibility Testing

### Keyboard Navigation

- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Arrow keys navigate lists

### Screen Reader Testing

1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate through app
3. Verify:
   - All buttons have labels
   - Form fields have labels
   - Images have alt text
   - ARIA roles are correct

---

## Related Documentation

- [development.md](file:///s:/lexical-maxxing/.agent/workflows/development.md) - Development setup
- [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md) - Database schema
- [SSOT_COMPONENTS.md](file:///s:/lexical-maxxing/.agent/SSOT_COMPONENTS.md) - Component details

---
description: Development workflow for common tasks
---

# Development Workflow

Common development tasks and commands for the Lexical Maxxing project.

## Starting Development

### 1. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 2. Open the Application

Navigate to the browser and:
- Press `Ctrl + \`` to toggle the terminal
- Press `Cmd + J` (or `Ctrl + J`) to open the AI Widget
- Click on folders in the sidebar to navigate

---

## Adding New Features

### Creating a New Component

1. Create the component file in the appropriate directory:
   ```bash
   # For UI components
   touch components/ui/MyComponent.tsx
   
   # For feature components
   touch components/features/MyFeature.tsx
   ```

2. Use this template:
   ```typescript
   import React from 'react';
   
   interface MyComponentProps {
     // Define props here
   }
   
   export function MyComponent({ }: MyComponentProps) {
     return (
       <div>
         {/* Component content */}
       </div>
     );
   }
   ```

3. Import and use in parent component:
   ```typescript
   import { MyComponent } from '@/components/ui/MyComponent';
   ```

### Adding a New Database Table

1. Update the Dexie schema in `lib/db.ts`:
   ```typescript
   this.version(N+1).stores({
     // Existing tables...
     myNewTable: 'id, fieldToIndex, [field1+field2]',
   });
   ```

2. Add the TypeScript interface in `lib/types.ts`:
   ```typescript
   export interface MyNewTable {
     id: string;
     fieldToIndex: string;
     field1: string;
     field2: string;
   }
   ```

3. Add the table to the Dexie class:
   ```typescript
   class LexicalDB extends Dexie {
     // Existing tables...
     myNewTable!: Table<MyNewTable>;
   }
   ```

4. Test in the browser console:
   ```javascript
   await db.myNewTable.add({ id: '1', ... });
   await db.myNewTable.toArray();
   ```

### Adding a Terminal Command

1. Open `lib/terminal/commands.ts`

2. Add the command implementation:
   ```typescript
   export const myCommand: CommandHandler = async (args, context) => {
     // Command logic here
     return {
       success: true,
       output: 'Command executed successfully',
     };
   };
   ```

3. Register in `lib/terminal/registry.ts`:
   ```typescript
   export const commandRegistry = {
     // Existing commands...
     mycommand: {
       name: 'mycommand',
       description: 'Does something useful',
       usage: 'mycommand [options]',
       handler: myCommand,
     },
   };
   ```

4. Test in the terminal:
   - Press `Ctrl + \``
   - Type `mycommand` and press Enter

---

## Working with the Database

### Querying Data

```typescript
// Get all folders
const folders = await db.folders.toArray();

// Get folder by ID
const folder = await db.folders.get(folderId);

// Query with index
const childFolders = await db.folders.where('parentId').equals(parentId).toArray();

// Compound index query
const meaning = await db.wordMeanings
  .where('[wordId+folderId]')
  .equals([wordId, folderId])
  .first();
```

### Inserting Data

```typescript
// Single insert
await db.folders.add({
  id: uuid(),
  name: 'New Folder',
  parentId: null,
});

// Bulk insert
await db.words.bulkAdd([
  { id: uuid(), term: 'Word 1' },
  { id: uuid(), term: 'Word 2' },
]);
```

### Updating Data

```typescript
// Update by ID
await db.folders.update(folderId, {
  name: 'Updated Name',
});

// Update with where clause
await db.wordStates
  .where('wordId')
  .equals(wordId)
  .modify({ recallScore: 5 });
```

### Deleting Data

```typescript
// Delete by ID
await db.folders.delete(folderId);

// Delete with where clause
await db.wordFolders
  .where('folderId')
  .equals(folderId)
  .delete();
```

### Transactions

For multi-table operations, use transactions:

```typescript
await db.transaction('rw', [db.words, db.wordFolders, db.wordMeanings], async () => {
  const wordId = uuid();
  await db.words.add({ id: wordId, term: 'Example' });
  await db.wordFolders.add({ wordId, folderId });
  await db.wordMeanings.add({ id: uuid(), wordId, folderId, content: 'Definition' });
});
```

---

## Testing Changes

### Manual Testing in Browser

1. Open Chrome DevTools: `F12`
2. Go to **Application** → **IndexedDB** → **LexicalDatabase**
3. Inspect tables and data
4. Test queries in the Console tab:
   ```javascript
   // Access the database
   const db = window.db;  // If exposed globally
   await db.folders.toArray();
   ```

### Testing AI Agents

1. Open AI Widget: `Cmd + J`
2. Switch to **Architect** mode
3. Test commands:
   - "Create a folder called 'Test'"
   - "Add 5 words to this folder"
   - "Move 'Test' folder to 'Biology'"
4. Switch to **Scholar** mode
5. Ask knowledge questions:
   - "What does 'mitochondria' mean?"
   - "Give me example sentences for 'serendipity'"

### Testing Terminal Commands

1. Open terminal: `Ctrl + \``
2. Test basic commands:
   ```bash
   ls                  # List folders
   mkdir testfolder    # Create folder
   cd testfolder       # Navigate to folder
   add "word1" "definition"  # Add a word
   search word1        # Search for words
   ```

---

## Debugging

### Database Issues

1. Check if Dexie is initialized:
   ```javascript
   console.log(db.isOpen());  // Should be true
   ```

2. Inspect schema version:
   ```javascript
   console.log(db.verno);  // Current version number
   ```

3. Clear database (nuclear option):
   ```javascript
   await db.delete();
   location.reload();  // Will reinitialize with seed data
   ```

### AI Agent Issues

1. Check console for API errors
2. Verify Gemini API key in `.env.local`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Test API directly:
   ```typescript
   import { GoogleGenerativeAI } from "@google/generative-ai";
   const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
   const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
   const result = await model.generateContent("Hello");
   console.log(result.response.text());
   ```

### Component Rendering Issues

1. Check React DevTools for component tree
2. Look for console errors/warnings
3. Verify props are being passed correctly
4. Use `console.log` in component body to debug

---

## Building for Production

### Create Production Build

```bash
npm run build
```

This will:
- Optimize code with Next.js compiler
- Generate static assets
- Create `.next` build directory

### Test Production Build Locally

```bash
npm run start
```

### Check Build Output

Look for:
- Bundle size warnings
- Any build errors
- Route generation summary

---

## Code Quality

### Run ESLint

```bash
npm run lint
```

Fix issues automatically:
```bash
npx eslint --fix .
```

### TypeScript Type Checking

TypeScript is checked automatically during `npm run dev` and `npm run build`.

To manually check:
```bash
npx tsc --noEmit
```

---

## Common Issues

### Issue: Database not initializing

**Solution**: Check browser console for errors. May need to delete IndexedDB manually:
- DevTools → Application → IndexedDB → Right-click "LexicalDatabase" → Delete

### Issue: AI Widget not responding

**Solution**:
1. Check `.env.local` has valid `GEMINI_API_KEY`
2. Restart dev server: `Ctrl+C`, then `npm run dev`
3. Check network tab for API request failures

### Issue: Terminal commands not working

**Solution**:
1. Check if command is registered in `lib/terminal/registry.ts`
2. Verify command handler is exported from `lib/terminal/commands.ts`
3. Check terminal output for error messages

---

## Git Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### Committing Changes

```bash
git add .
git commit -m "feat: Add new feature description"
```

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Pushing Changes

```bash
git push origin feature/my-new-feature
```

---

## Environment Setup

### Required Environment Variables

Create `.env.local`:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (for Supabase sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (for NextAuth)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to `.env.local`

---

## Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Dexie.js Documentation](https://dexie.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)

# SSOT: Component Hierarchy

> **Single Source of Truth for the React component structure and UI organization**

## Overview

Lexical Maxxing's UI is built with React components organized by feature domain. The application follows a **composition-over-inheritance** pattern with reusable UI primitives.

---

## Component Tree Structure

```
App Layout (app/layout.tsx)
├── Providers (components/providers/)
│   └── DatabaseProvider - Dexie initialization
│
└── Main UI (app/page.tsx)
    ├── Navbar (components/Navbar.tsx)
    │   ├── LoginButton - Auth state toggle
    │   └── Settings menu
    │
    ├── Folder Sidebar
    │   ├── FolderTree (components/folders/)
    │   │   ├── FolderItem - Recursive folder nodes
    │   │   └── CreateFolderButton
    │   └── FolderContextMenu - Right-click actions
    │
    ├── Word List Area
    │   ├── WordGrid (components/word/)
    │   │   ├── WordCard - Individual word display
    │   │   │   ├── Mastery badge
    │   │   │   └── Quick actions
    │   │   └── AddWordButton
    │   └── ChunkPagination - 15-word chunks
    │
    ├── Terminal Toggle (Ctrl+`)
    │   └── Terminal (components/terminal/)
    │       ├── TerminalInput - Command line
    │       ├── TerminalOutput - Formatted results
    │       └── TerminalHistory - Persistent history
    │
    ├── AI Widget (Cmd+J)
    │   └── AIWidget (components/AIWidget.tsx)
    │       ├── ModeToggle - Architect/Scholar switch
    │       ├── ChatHistory - Message list
    │       ├── StreamingResponse - Real-time AI output
    │       └── ToolExecutionLog - Action visualization
    │
    └── Modals
        ├── MeaningModal - Word definition viewer/editor
        ├── AuthModal - Login/Register
        └── SettingsModal - Preferences panel
```

---

## Core Components

### 🏠 Layout & Providers

#### [app/layout.tsx](file:///s:/lexical-maxxing/app/layout.tsx)
Root layout with global providers.

```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DatabaseProvider>
          {children}
        </DatabaseProvider>
      </body>
    </html>
  );
}
```

**Responsibilities**:
- Initialize Dexie database connection
- Provide global theme context
- Set up authentication session

---

#### [components/providers/DatabaseProvider.tsx](file:///s:/lexical-maxxing/components/providers/)
Ensures Dexie is initialized before rendering app.

**Key Features**:
- Lazy database initialization
- Seeding default data on first run
- Error boundary for database failures

---

### 🧭 Navigation

#### [components/Navbar.tsx](file:///s:/lexical-maxxing/components/Navbar.tsx)
Top navigation bar.

**Elements**:
- App logo and title
- Login/logout button
- Settings gear icon
- Sync status indicator

**State Management**:
- Uses `useSession` from NextAuth
- Live database connection status via Dexie hooks

---

### 📁 Folder System

#### [components/folders/FolderTree.tsx](file:///s:/lexical-maxxing/components/folders/)
Hierarchical folder navigation.

**Features**:
- Recursive rendering for nested folders
- Drag-and-drop folder reorganization
- Expand/collapse folder nodes
- Visual indicators: emoji, color, word count

**Key Props**:
```typescript
interface FolderTreeProps {
  rootFolderId?: string | null; // Start point (null = all roots)
  onFolderSelect: (folderId: string) => void;
  selectedFolderId?: string;
}
```

**Uses**:
- `@dnd-kit/core` for drag-and-drop
- `useLiveQuery` for reactive folder updates

---

#### [components/folders/FolderItem.tsx](file:///s:/lexical-maxxing/components/folders/)
Individual folder node (recursive component).

**Rendered Data**:
- Folder emoji and name
- Word count badge
- Expand/collapse chevron
- Color-coded border

**Context Menu**:
Right-click reveals:
- Rename folder
- Change emoji/color
- Create subfolder
- Delete folder
- Move to another parent

---

### 📝 Word Display

#### [components/word/WordGrid.tsx](file:///s:/lexical-maxxing/components/word/)
Grid layout of words in the current folder.

**Layout**:
- Responsive grid (3-5 columns based on screen size)
- 15-word chunks with pagination
- Sort options: alphabetical, mastery level, date added

**Key Logic**:
```typescript
const words = useLiveQuery(() => 
  db.wordFolders
    .where('folderId').equals(currentFolderId)
    .toArray()
    .then(wfs => db.words.bulkGet(wfs.map(wf => wf.wordId)))
);
```

---

#### [components/word/WordCard.tsx](file:///s:/lexical-maxxing/components/word/)
Individual word display card.

**Elements**:
- Word term (styled with custom color if set)
- Mastery badge (0-5 stars)
- Quick actions:
  - View meaning (opens MeaningModal)
  - Quick review (updates mastery)
  - Delete word from folder

**Visual States**:
- Default: White background
- Hovered: Shadow effect
- Selected: Border highlight
- Low mastery: Yellow tint
- Mastered: Green tint

---

### 💬 AI Widget

#### [components/AIWidget.tsx](file:///s:/lexical-maxxing/components/AIWidget.tsx)
The AI agent chat interface.

**Layout**:
- Floating widget (bottom-right corner)
- Expandable/collapsible
- Draggable via header
- Resizable via corner handle

**Key Sections**:

1. **Header**:
   - Mode toggle: Architect 🏗️ / Scholar 📚
   - Session title
   - Minimize/close buttons

2. **Chat Area**:
   - Message list with role-based styling
   - User messages: Right-aligned, blue
   - Agent messages: Left-aligned, gray
   - System messages: Center, italic
   - Auto-scroll to bottom

3. **Input Box**:
   - Multiline textarea
   - Send button
   - Keyboard shortcut: Enter to send, Shift+Enter for newline

4. **Tool Execution Log** (Architect mode only):
   - Shows function calls in real-time
   - Success/error status indicators
   - Collapsible details per tool

**State Management**:
```typescript
const [mode, setMode] = useState<"ARCHITECT" | "SCHOLAR">("SCHOLAR");
const [messages, setMessages] = useState<AgentMessage[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
```

**Streaming Logic**:
```typescript
async function sendMessage(text: string) {
  setIsStreaming(true);
  const stream = streamResponse(text, mode);
  let fullResponse = "";
  
  for await (const chunk of stream) {
    fullResponse += chunk;
    setMessages(prev => [
      ...prev.slice(0, -1),
      { role: "agent", text: fullResponse }
    ]);
  }
  
  setIsStreaming(false);
}
```

---

### 🖥️ Terminal

#### [components/terminal/Terminal.tsx](file:///s:/lexical-maxxing/components/terminal/)
The `lex-sh` command-line interface.

**Layout**:
- Full-width overlay when active (Ctrl+`)
- Transparent dark background
- Monospace font (Fira Code / Consolas)
- Green text for Unix aesthetic

**Sub-Components**:

1. **TerminalInput**:
   - Single-line input with command history
   - Arrow up/down to navigate history
   - Tab completion for commands
   - Autocomplete for folder/word names

2. **TerminalOutput**:
   - Formatted command results
   - Columnar layouts for `ls` output
   - ASCII art for `stats` graphs
   - Error messages in red
   - Success messages in green

3. **TerminalHistory**:
   - Persistent across sessions (stored in localStorage)
   - Displayed above input line
   - Clearable via `clear` command

**Command Execution Flow**:
```typescript
const handleCommand = async (cmdLine: string) => {
  const parsed = parseCommand(cmdLine);
  const handler = commandRegistry[parsed.command];
  
  if (!handler) {
    return { error: `Command not found: ${parsed.command}` };
  }
  
  const result = await handler.execute(parsed.args, context);
  setHistory(prev => [...prev, { input: cmdLine, output: result }]);
};
```

---

### 🎛️ Settings

#### [components/settings/SettingsPanel.tsx](file:///s:/lexical-maxxing/components/settings/)
User preferences configuration.

**Tabs**:
1. **General**:
   - Theme (light/dark/system)
   - Default folder on startup
   - Language preference

2. **Learning**:
   - Spaced repetition algorithm (SM-2, Leitner)
   - Review interval multipliers
   - Mastery thresholds

3. **AI**:
   - API key configuration
   - Default agent mode
   - Max tokens per response

4. **Sync**:
   - Supabase connection status
   - Manual sync trigger
   - Conflict resolution strategy

5. **Data**:
   - Export all data (JSON)
   - Import vocabulary sets
   - Clear database (with confirmation)

---

### 🪟 Modals

#### [components/MeaningModal.tsx](file:///s:/lexical-maxxing/components/MeaningModal.tsx)
Word definition viewer and editor.

**Mode: View**:
- Displays current meaning for `[wordId + folderId]`
- Markdown rendering via `react-markdown`
- Edit button to switch to edit mode

**Mode: Edit**:
- Textarea with markdown preview
- Save/cancel buttons
- Auto-save draft to localStorage

**Mode: Create** (no meaning exists):
- Prompts user to add definition
- Option to "Ask AI Scholar" for definition
- Template suggestions

---

#### [components/AuthModal.tsx](file:///s:/lexical-maxxing/components/AuthModal.tsx)
Login/registration form.

**Tabs**:
- **Login**: Email + password
- **Register**: Email + password + confirm password
- **Reset Password**: Email-based reset

**Integration**:
- Uses NextAuth.js credentials provider
- Validates via Prisma + bcrypt
- Sets session cookie on success

---

## UI Components Library

### [components/ui/FloatingWidgetStack.tsx](file:///s:/lexical-maxxing/components/ui/FloatingWidgetStack.tsx)
Container for stackable floating widgets (AI Widget, Notes, etc.).

**Features**:
- Z-index management
- Bring-to-front on click
- Persist positions to localStorage

---

### Common Patterns

#### Live Queries (Dexie React Hooks)
Most components use `useLiveQuery` for reactive database updates:

```typescript
import { useLiveQuery } from "dexie-react-hooks";

const folders = useLiveQuery(() => db.folders.toArray());
```

**Why**: Automatic re-rendering when database changes.

---

#### Framer Motion Animations
Smooth transitions for modals, lists, and widgets:

```typescript
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
  {children}
</motion.div>
```

---

#### Tailwind CSS Styling
Utility-first approach with custom CSS variables:

```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
  {/* Content */}
</div>
```

**Theme Variables** (in `app/globals.css`):
```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-error: #ef4444;
}
```

---

## Component Communication

### Props Drilling
Simple parent-child communication via props.

### Context API
Used sparingly for deeply nested components:
- Theme context
- Database instance
- Current folder selection

### Event Emitters
For cross-component events (e.g., terminal commands triggering UI updates):

```typescript
// In useTerminal hook
const eventBus = new EventTarget();

eventBus.addEventListener('folderCreated', (e) => {
  refreshFolderTree();
});
```

---

## Performance Optimizations

### Virtualization
Large word lists use virtual scrolling (future enhancement).

### Memoization
Expensive computations cached with `useMemo`:

```typescript
const enrichedWords = useMemo(() => 
  words.map(w => ({ ...w, state: wordStates[w.id] })),
  [words, wordStates]
);
```

### Lazy Loading
Routes and heavy components loaded on-demand:

```typescript
const Settings = lazy(() => import("@/components/settings/SettingsPanel"));
```

---

## Accessibility

### Keyboard Navigation
- All modals: `Esc` to close
- Terminal: `Ctrl+\`` to toggle
- AI Widget: `Cmd+J` to toggle
- Word list: Arrow keys for navigation

### Screen Readers
- ARIA labels on interactive elements
- Semantic HTML (`<nav>`, `<main>`, `<aside>`)
- Focus management in modals

---

## Testing Strategy

### Unit Tests
Test individual component logic in isolation.

**Example**:
```typescript
test('WordCard displays mastery level correctly', () => {
  render(<WordCard word={mockWord} state={{ recallScore: 4 }} />);
  expect(screen.getByText('⭐⭐⭐⭐')).toBeInTheDocument();
});
```

### Integration Tests
Test component interactions with Dexie database.

### E2E Tests
Browser automation for full user flows (Playwright/Cypress).

---

## Related Documentation

- [SSOT_CODEBASE.md](file:///s:/lexical-maxxing/.agent/SSOT_CODEBASE.md) - Overall architecture
- [SSOT_DATABASE.md](file:///s:/lexical-maxxing/.agent/SSOT_DATABASE.md) - Data layer
- [app/page.tsx](file:///s:/lexical-maxxing/app/page.tsx) - Main UI implementation
- [components/AIWidget.tsx](file:///s:/lexical-maxxing/components/AIWidget.tsx) - AI interface

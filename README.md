# Lexical Maxxing 📚

An intelligent vocabulary learning application that combines hierarchical organization, AI-powered assistance, and spaced repetition to help you master new words and concepts.

## 🌟 Features

### 📂 Hierarchical Organization
- **Nested Folder System**: Organize words into folders and subfolders with drag-and-drop support
- **Visual Customization**: Add emojis and colors to folders and words for better visual organization
- **Flexible Structure**: Move words and folders freely to match your learning taxonomy

### 🤖 AI-Powered Learning Assistant
- **Dual-Mode AI Agent**:
  - **ARCHITECT Mode**: Performs actions like creating folders, adding words, organizing content
  - **SCHOLAR Mode**: Provides explanations, definitions, and learning guidance
- **Contextual Awareness**: AI understands your current folder and visible words
- **Tool Execution**: AI can directly manipulate your vocabulary database
- **Multi-Turn Conversations**: Maintains context across interactions

### 📝 Rich Word Management
- **Contextual Meanings**: Define words differently based on the folder/context
- **Mastery Tracking**: 0-5 scale for recognition and recall scores
- **AI Clarification**: Ask questions about specific words and get instant AI explanations
- **Color Coding**: Visual indicators for word difficulty and mastery level
- **Bulk Operations**: Import/export words and meanings in JSON format

### 📖 Notes & Documentation
- **Markdown Support**: Write notes with full markdown formatting
- **Folder-Specific Notes**: Attach notes to specific learning contexts
- **AI Study Mode**: Generate study points and vocabulary from your notes
- **Preview Mode**: Live markdown preview while writing

### 🔄 Sync & Offline-First
- **Local-First Architecture**: All data stored in IndexedDB (Dexie.js)
- **Supabase Sync**: Optional cloud synchronization across devices
- **Offline Capable**: Full functionality without internet connection
- **Conflict Resolution**: Smart merging of local and remote changes

### 🎯 Spaced Repetition & Review
- **Review Sessions**: Create focused review sessions for specific folders
- **Multiple Modes**: Random, spaced repetition, or weak-first review
- **Progress Tracking**: Monitor your learning progress over time
- **Adaptive Scheduling**: Words are scheduled based on mastery level

### 🔗 Knowledge Graph
- **Word Relationships**: Link words as synonyms, antonyms, or related terms
- **Word Groups**: Create thematic groups of related vocabulary
- **Visual Connections**: Build a network of interconnected knowledge

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd lexical-maxxing

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

### Environment Variables

Create a `.env.local` file with:

```env
# Gemini AI (required for AI features)
GEMINI_API_KEY=your_gemini_api_key

# Supabase (optional, for sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NextAuth (optional, for authentication)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build for Production

```bash
npm run build
npm start
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Dexie.js (IndexedDB wrapper)
- **Sync**: Supabase
- **AI**: Google Gemini API / LM Studio (local models)
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **Markdown**: react-markdown with remark-gfm

### Project Structure

```
lexical-maxxing/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (agent, define, clarify)
│   ├── folder/[id]/       # Folder detail pages
│   └── page.tsx           # Dashboard
├── components/            # React components
│   ├── folders/          # Folder-related components
│   ├── word/             # Word-related components
│   ├── notes/            # Note components
│   ├── import/           # Import/export modals
│   └── settings/         # Settings panels
├── hooks/                # Custom React hooks
│   ├── useAgentAction.ts # AI agent action executor
│   ├── useAIConfig.ts    # AI configuration management
│   └── useSync.ts        # Supabase sync logic
├── lib/                  # Core utilities
│   ├── db.ts            # Dexie database schema
│   ├── types.ts         # TypeScript type definitions
│   ├── sync.ts          # Sync logic
│   ├── import.ts        # Import/export utilities
│   └── ai/              # AI prompts and adapters
└── public/              # Static assets
```

## 🎨 Key Concepts

### Agent Actions
The AI can perform various actions through a structured action system:
- **Folder Management**: CREATE_FOLDER, DELETE_FOLDER, RENAME_FOLDER, etc.
- **Word Operations**: ADD_WORD, DELETE_WORD, UPDATE_WORD_METADATA
- **Bulk Operations**: BULK_ADD_WORDS, BULK_UPDATE_METADATA
- **Learning Tools**: SET_WORD_MASTERY, SCHEDULE_REVIEW
- **Knowledge Graph**: LINK_WORDS, CREATE_WORD_GROUP

### Tool System
Read-only tools provide context to the AI:
- `GET_FOLDER_CONTENTS`: List words in a folder
- `GET_WORD_DETAILS`: Detailed word information
- `SEARCH_FOLDERS`: Find folders by query
- `GET_FOLDER_HIERARCHY`: Complete folder tree

### Data Model
- **Folders**: Hierarchical containers with optional parent relationships
- **Words**: Unique terms that can exist in multiple folders
- **WordMeanings**: Context-specific definitions per folder
- **WordStates**: Mastery tracking (recognition/recall scores)
- **Doubts**: AI-answered questions about specific words

## 🔧 Configuration

### AI Providers
The app supports two AI providers:
1. **Gemini** (Google): Cloud-based, requires API key
2. **LM Studio**: Local models, requires running LM Studio locally

Configure in Settings → AI Configuration.

### Themes
- System (auto)
- Light
- Dark
- Solarized

## 📊 Import/Export

### Supported Formats

**Words with Meanings:**
```json
[
  {
    "term": "Ephemeral",
    "folderId": "uuid-here",
    "meanings": ["Lasting for a very short time", "Transitory"]
  }
]
```

**Folders:**
```json
[
  {
    "name": "Academic Vocabulary",
    "emoji": "📚",
    "color": "#4F46E5"
  }
]
```

**Notes:**
```json
[
  {
    "title": "Chapter 1 Review",
    "content": "# Key Points\n- Point 1\n- Point 2"
  }
]
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Icons and animations by [Framer Motion](https://www.framer.com/motion/)
- Offline database by [Dexie.js](https://dexie.org/)

---

**Happy Learning! 🚀📚**

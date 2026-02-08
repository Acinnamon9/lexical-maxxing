export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  emoji?: string;
  color?: string; // Hex or CSS color name
  updatedAt?: number;
}

export interface Word {
  id: string;
  term: string;
  color?: string; // Hex or CSS color name
}

export interface WordFolder {
  wordId: string;
  folderId: string;
}

export interface WordState {
  wordId: string;
  recognitionScore: number;
  recallScore: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  updatedAt: number;
  needsSync: boolean;
}

export interface Production {
  id: string;
  wordId: string;
  folderId: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  needsSync: boolean;
}

// NEW: Contextual Meaning (Reference)
export interface WordMeaning {
  id: string;
  wordId: string;
  folderId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string; // Markdown
  createdAt: number;
  updatedAt: number;
}

export interface EnrichedWord extends Word {
  state: WordState;
}

// Import Types
export interface ImportItem {
  term: string;
  meanings?: string[];
}

export interface ImportFormat {
  words: ImportItem[];
}

export interface Doubt {
  id: string;
  wordId: string;
  folderId: string;
  query: string;
  response: string | null;
  status: "pending" | "resolved" | "error";
  createdAt: number;
  updatedAt: number;
}

export interface AgentSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: "user" | "agent" | "system";
  text: string;
  createdAt: number;
}

export interface UserSetting {
  id: string;
  value: string;
  updatedAt: number;
}

// Review session for spaced repetition
export interface ReviewSession {
  id: string;
  folderId: string;
  mode: "spaced_rep" | "random" | "weak_first";
  wordIds: string[];
  currentIndex: number;
  completedIds: string[];
  createdAt: number;
  updatedAt: number;
}

// Word relationship for knowledge graph
export interface WordLink {
  id: string;
  wordId1: string;
  wordId2: string;
  relationType: "synonym" | "antonym" | "related" | "derives_from" | "part_of";
  createdAt: number;
}

// Word group for semantic clustering
export interface WordGroup {
  id: string;
  name: string;
  folderId: string;
  wordIds: string[];
  createdAt: number;
}

export type ActionType =
  | "CREATE_FOLDER"
  | "ADD_WORD"
  | "GET_FOLDER_STRUCTURE"
  | "SEARCH_FOLDERS"
  | "DELETE_ITEM"
  | "RENAME_ITEM"
  | "MOVE_ITEM"
  | "NAVIGATE_TO"
  | "CREATE_NOTE"
  | "UPDATE_NOTE"
  | "DELETE_NOTE"
  | "CREATE_DOUBT"
  | "UPDATE_FOLDER_METADATA"
  | "UPDATE_WORD_METADATA"
  // Bulk Actions
  | "BULK_ADD_WORDS"
  | "BULK_UPDATE_WORD_METADATA"
  | "BULK_MOVE_ITEMS"
  // Learning & Review
  | "SET_WORD_MASTERY"
  | "SCHEDULE_REVIEW"
  // Organization
  | "DUPLICATE_FOLDER"
  | "MERGE_FOLDERS"
  // Knowledge Graph
  | "LINK_WORDS"
  | "CREATE_WORD_GROUP"
  // Multi-Turn Tool Calls
  | "TOOL_CALL";

// Available tools for multi-turn agent loop
export type ToolName =
  | "GET_ALL_WORDS"
  | "GET_FOLDER_CONTENTS"
  | "SEARCH_WORDS"
  | "GET_WORD_DETAILS"
  | "GET_FOLDER_HIERARCHY"
  | "COUNT_WORDS";

export interface ToolCall {
  tool: ToolName;
  params: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  tool: ToolName;
  success: boolean;
  data: T;
  error?: string;
}

export interface AgentAction {
  type: ActionType;
  payload: unknown; // Payload structure varies by action type, using unknown for safety
}

// Action Journaling for Undo
export interface AgentActionHistory {
  id: string;
  sessionId: string;
  executedActions: AgentAction[];
  inverseActions: AgentAction[];
  timestamp: number;
}

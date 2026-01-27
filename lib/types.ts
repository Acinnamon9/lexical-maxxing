export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Word {
  id: string;
  term: string;
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

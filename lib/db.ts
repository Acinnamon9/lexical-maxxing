import Dexie, { Table } from "dexie";
import {
  Folder,
  Word,
  WordFolder,
  WordState,
  Production,
  WordMeaning,
  Doubt,
  AgentSession,
  AgentMessage,
  UserSetting,
  AgentActionHistory,
  Note,
  ReviewSession,
  WordLink,
  WordGroup,
} from "./types";
import {
  SEED_FOLDERS,
  SEED_WORDS,
  SEED_WORD_FOLDERS,
  SEED_WORD_STATES,
} from "./seed";

export class LexicalDatabase extends Dexie {
  folders!: Table<Folder, string>;
  words!: Table<Word, string>;
  wordFolders!: Table<WordFolder, [string, string]>; // Composite key: [wordId, folderId]
  wordStates!: Table<WordState, string>;
  productions!: Table<Production, string>;
  wordMeanings!: Table<WordMeaning, string>;
  doubts!: Table<Doubt, string>;
  agentSessions!: Table<AgentSession, string>;
  agentMessages!: Table<AgentMessage, string>;
  userSettings!: Table<UserSetting, string>;
  agentActionHistory!: Table<AgentActionHistory, string>;
  notes!: Table<Note, string>;
  // New tables for enhanced AI tooling
  reviewSessions!: Table<ReviewSession, string>;
  wordLinks!: Table<WordLink, string>;
  wordGroups!: Table<WordGroup, string>;

  constructor() {
    super("LexicalDatabase");

    // Schema Definition - Version 12 adds review sessions, word links, word groups
    this.version(12).stores({
      folders: "id, name, parentId",
      words: "id, &term",
      wordFolders: "[wordId+folderId], folderId, wordId",
      wordStates: "wordId, nextReviewAt",
      productions: "id, [wordId+folderId], wordId, folderId",
      wordMeanings: "id, [wordId+folderId], wordId, folderId",
      doubts: "id, [wordId+folderId], status, createdAt",
      agentSessions: "id, createdAt, updatedAt",
      agentMessages: "id, sessionId, createdAt",
      userSettings: "id, updatedAt",
      agentActionHistory: "id, sessionId, timestamp",
      notes: "id, folderId, createdAt, title",
      // New tables
      reviewSessions: "id, folderId, createdAt",
      wordLinks: "id, wordId1, wordId2, relationType",
      wordGroups: "id, folderId, name",
    });

    // Seeding Logic
    this.on("populate", () => {
      console.log("Populating database with seed data...");
      this.transaction(
        "rw",
        this.folders,
        this.words,
        this.wordFolders,
        this.wordStates,
        async () => {
          await this.folders.bulkAdd(SEED_FOLDERS);
          await this.words.bulkAdd(SEED_WORDS);
          await this.wordFolders.bulkAdd(SEED_WORD_FOLDERS);
          await this.wordStates.bulkAdd(SEED_WORD_STATES);
        },
      );
    });
  }
}

export const db = new LexicalDatabase();

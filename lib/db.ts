import Dexie, { Table } from "dexie";
import {
  Folder,
  Word,
  WordFolder,
  WordState,
  Production,
  WordMeaning,
  Doubt,
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
  wordFolders!: Table<WordFolder, number>; // Composite key management via ID or index
  wordStates!: Table<WordState, string>;
  productions!: Table<Production, string>;
  wordMeanings!: Table<WordMeaning, string>;
  doubts!: Table<Doubt, string>;

  constructor() {
    super("LexicalDatabase");

    // Schema Definition
    this.version(4).stores({
      folders: "id, parentId",
      words: "id, &term", // Indexed and Unique
      wordFolders: "[wordId+folderId], folderId, wordId", // Composite Index
      wordStates: "wordId, nextReviewAt",
      productions: "id, [wordId+folderId], wordId, folderId",
      wordMeanings: "id, [wordId+folderId], wordId, folderId",
      doubts: "id, [wordId+folderId], status, createdAt",
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

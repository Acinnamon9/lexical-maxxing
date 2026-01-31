import {
  SEED_FOLDERS,
  SEED_PRODUCTIONS,
  SEED_WORD_FOLDERS,
  SEED_WORD_STATES,
  SEED_WORDS,
} from "./seed";
import { EnrichedWord, Folder, Production, Word } from "./types";

// In-memory "Database"
const folders = [...SEED_FOLDERS];
const words = [...SEED_WORDS];
const wordFolders = [...SEED_WORD_FOLDERS];
const wordStates = [...SEED_WORD_STATES];
const productions = [...SEED_PRODUCTIONS];

export const db = {
  getFolders: (): Folder[] => folders,

  getWordsInFolder: (folderId: string): EnrichedWord[] => {
    // 1. Find all wordIds in this folder
    const targetWordIds = wordFolders
      .filter((wf) => wf.folderId === folderId)
      .map((wf) => wf.wordId);

    // 2. Join with Words and States
    return targetWordIds.map((id) => {
      const word = words.find((w) => w.id === id)!;
      const state = wordStates.find((s) => s.wordId === id)!;
      return { ...word, state };
    });
  },

  getAllWords: (): EnrichedWord[] => {
    return words.map((w) => ({
      ...w,
      state: wordStates.find((s) => s.wordId === w.id)!,
    }));
  },

  getProductions: (wordId: string, folderId: string): Production[] => {
    return productions.filter(
      (p) => p.wordId === wordId && p.folderId === folderId,
    );
  },

  // Simulating a write
  addProduction: (prod: Production) => {
    productions.push(prod);
    console.log("Saved Production:", prod);
  },
};

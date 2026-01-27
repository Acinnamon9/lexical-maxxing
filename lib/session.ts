import { db } from "./db";
import { EnrichedWord } from "./types";

const CHUNK_SIZE = 15;

export async function createSession(
  folderId: string,
  chunkIndex?: number,
): Promise<EnrichedWord[]> {
  // 1. Get relationships for this folder
  const wordFolders = await db.wordFolders
    .where("folderId")
    .equals(folderId)
    .toArray();

  // Sort by ID to match the UI's insertion order view
  wordFolders.sort((a, b) => a.wordId.localeCompare(b.wordId));

  let targetWordIds: string[] = [];

  if (typeof chunkIndex === "number" && chunkIndex >= 0) {
    // CHUNK MODE: Slice specifically the requested chunk
    const start = chunkIndex * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    targetWordIds = wordFolders.slice(start, end).map((wf) => wf.wordId);
  } else {
    // STANDARD MODE (Spaced Rep):
    // For now, take ALL words, then we'd filter by due date.
    // Prototype: take first 15 due?
    // Let's keep it simple: take first 15 for now.
    targetWordIds = wordFolders.slice(0, 15).map((wf) => wf.wordId);
  }

  // 2. Bulk fetch words and states
  const words = await db.words.bulkGet(targetWordIds);
  const states = await db.wordStates.bulkGet(targetWordIds);

  // 3. enrich
  const sessionWords: EnrichedWord[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const state = states[i];

    if (word && state) {
      sessionWords.push({ ...word, state });
    }
  }

  return sessionWords;
}

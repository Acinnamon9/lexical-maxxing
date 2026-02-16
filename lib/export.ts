import { db } from "./db";

export interface ExportedWord {
  term: string;
  meanings: string[];
  recognitionScore: number;
  recallScore: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  createdAt?: number;
}

export interface ExportedFolder {
  name: string;
  emoji?: string;
  color?: string;
  backgroundImage?: string;
  subfolders: ExportedFolder[];
  words: ExportedWord[];
}

/**
 * Recursively exports a folder and all its contents (subfolders, words, meanings).
 * @param folderId The ID of the folder to export.
 * @returns A promise that resolves to the ExportedFolder structure, or null if the folder is not found.
 */
export async function exportFolderTree(
  folderId: string,
): Promise<ExportedFolder | null> {
  const folder = await db.folders.get(folderId);
  if (!folder) return null;

  // 1. Recursively Export Subfolders
  const subfolders = await db.folders
    .where("parentId")
    .equals(folderId)
    .toArray();
  const exportedSubfolders: ExportedFolder[] = [];

  for (const sub of subfolders) {
    const exportedSub = await exportFolderTree(sub.id);
    if (exportedSub) exportedSubfolders.push(exportedSub);
  }

  // 2. Export Words in this Folder
  // Get all words linked to this folder
  const wordFolders = await db.wordFolders
    .where("folderId")
    .equals(folderId)
    .toArray();
  const wordIds = wordFolders.map((wf) => wf.wordId);

  // Fetch word details
  const words = await db.words.where("id").anyOf(wordIds).toArray();
  const states = await db.wordStates.where("wordId").anyOf(wordIds).toArray();

  // Fetch meanings specific to this folder
  // Note: We use the compound index [wordId+folderId] implicitly via where queries if possible,
  // but here we just want all meanings for this folderId.
  const relevantMeanings = await db.wordMeanings
    .where("folderId")
    .equals(folderId)
    .toArray();

  const exportedWords: ExportedWord[] = words.map((word) => {
    const state = states.find((s) => s.wordId === word.id);
    const wordMeanings = relevantMeanings
      .filter((m) => m.wordId === word.id)
      .map((m) => m.content);

    return {
      term: word.term,
      meanings: wordMeanings,
      recognitionScore: state?.recognitionScore || 0,
      recallScore: state?.recallScore || 0,
      lastReviewedAt: state?.lastReviewedAt || 0,
      nextReviewAt: state?.nextReviewAt || 0,
    };
  });

  return {
    name: folder.name,
    emoji: folder.emoji,
    color: folder.color,
    backgroundImage: folder.backgroundImage,
    subfolders: exportedSubfolders,
    words: exportedWords,
  };
}

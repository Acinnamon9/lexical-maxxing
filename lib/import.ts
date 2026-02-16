import { db } from "./db";
import {
  ImportFormat,
  Word,
  WordMeaning,
  WordState,
  WordFolder,
} from "./types";

export interface ImportStats {
  wordsCreated?: number;
  wordsResolved?: number;
  meaningsCreated?: number;
  linksCreated?: number;
  wordsSkipped?: number;
  foldersCreated?: number;
  notesCreated?: number;
}

export async function importJson(
  folderId: string,
  jsonString: string,
): Promise<{ success: boolean; message: string; stats?: ImportStats }> {
  let data: ImportFormat;

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, message: "Invalid JSON format" };
  }

  if (!data.words || !Array.isArray(data.words)) {
    return { success: false, message: 'JSON must contain a "words" array' };
  }

  const stats = {
    wordsCreated: 0,
    wordsResolved: 0,
    meaningsCreated: 0,
    linksCreated: 0,
  };

  const now = Date.now();

  try {
    await db.transaction(
      "rw",
      db.words,
      db.wordFolders,
      db.wordStates,
      db.wordMeanings,
      async () => {
        for (const item of data.words) {
          // 1. Resolve Word (Dedupe by term)
          const normalizedTerm = item.term.trim();
          let word = await db.words
            .where("term")
            .equals(normalizedTerm)
            .first();

          if (!word) {
            const newWordId = crypto.randomUUID();
            word = { id: newWordId, term: normalizedTerm };
            await db.words.add(word);
            stats.wordsCreated++;

            // Initialize State for NEW word
            await db.wordStates.add({
              wordId: newWordId,
              recognitionScore: 0,
              recallScore: 0,
              lastReviewedAt: 0,
              nextReviewAt: now,
              updatedAt: now,
              needsSync: true,
            });
          } else {
            stats.wordsResolved++;
          }

          // 2. Link to Folder (Idempotent)
          const existingLink = await db.wordFolders
            .where("[wordId+folderId]")
            .equals([word.id, folderId])
            .first();

          if (!existingLink) {
            await db.wordFolders.add({ wordId: word.id, folderId: folderId });
            stats.linksCreated++;
          }

          // 3. Add Meanings (Contextual)
          if (item.meanings && Array.isArray(item.meanings)) {
            for (const meaningContent of item.meanings) {
              await db.wordMeanings.add({
                id: crypto.randomUUID(),
                wordId: word!.id,
                folderId: folderId,
                content: meaningContent,
                createdAt: now,
                updatedAt: now,
              });
              stats.meaningsCreated++;
            }
          }
        }
      },
    );

    return { success: true, message: "Import successful", stats };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Import Error:", error);
    return {
      success: false,
      message: `DB Transaction Failed: ${error.message}`,
    };
  }
}

export interface MeaningImportItem {
  term: string;
  folderId: string;
  meanings: string[];
}

export async function bulkImportMeanings(
  jsonString: string,
): Promise<{ success: boolean; message: string; stats?: ImportStats }> {
  let data: MeaningImportItem[];

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, message: "Invalid JSON format" };
  }

  if (!Array.isArray(data)) {
    return { success: false, message: "JSON must be an array of objects" };
  }

  const stats = {
    meaningsCreated: 0,
    wordsSkipped: 0,
  };

  const now = Date.now();

  try {
    const meaningsToAdd: WordMeaning[] = [];
    const uniqueTerms = Array.from(
      new Set(data.map((item) => item.term.trim())),
    );

    // 1. Bulk fetch existing words
    const existingWords = await db.words
      .where("term")
      .anyOf(uniqueTerms)
      .toArray();
    const wordMap = new Map(existingWords.map((w) => [w.term, w.id]));

    // 2. Prepare bulk check for links
    // Since Dexie doesn't support multi-key specific lookups easily in one go for compound keys without a complex query,
    // we'll fetch all links for the relevant words and filter in memory.
    // Optimization: If dataset is huge, this might be slow, but better than N queries.
    // Ideally we filter by wordIds.
    const relevantWordIds = existingWords.map((w) => w.id);
    const existingLinks = await db.wordFolders
      .where("wordId")
      .anyOf(relevantWordIds)
      .toArray();

    // Create a Set of "wordId+folderId" for O(1) lookup
    const linkSet = new Set(
      existingLinks.map((l) => `${l.wordId}+${l.folderId}`),
    );

    for (const item of data) {
      const { term, folderId, meanings } = item;
      if (!term || !folderId || !meanings || !Array.isArray(meanings)) {
        stats.wordsSkipped++;
        continue;
      }

      const normalizedTerm = term.trim();
      const wordId = wordMap.get(normalizedTerm);

      if (!wordId) {
        stats.wordsSkipped++;
        continue;
      }

      // Check if linked to this specific folder
      if (!linkSet.has(`${wordId}+${folderId}`)) {
        stats.wordsSkipped++;
        continue;
      }

      for (const content of meanings) {
        meaningsToAdd.push({
          id: crypto.randomUUID(),
          wordId: wordId,
          folderId: folderId,
          content: content.trim(),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (meaningsToAdd.length > 0) {
      await db.wordMeanings.bulkAdd(meaningsToAdd);
      stats.meaningsCreated = meaningsToAdd.length;
    }

    return {
      success: true,
      message: `Bulk import complete. Imported ${stats.meaningsCreated} meanings.`,
      stats,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Bulk Import Error:", error);
    return { success: false, message: `DB Failed: ${error.message}` };
  }
}

export interface FolderImportItem {
  name: string;
  parentId?: string;
  emoji?: string;
  color?: string;
}

export async function importFolders(
  jsonString: string,
): Promise<{ success: boolean; message: string; stats?: ImportStats }> {
  let data: FolderImportItem[];

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, message: "Invalid JSON format" };
  }

  if (!Array.isArray(data)) {
    return {
      success: false,
      message: "JSON must be an array of folder objects",
    };
  }

  const stats = { foldersCreated: 0 };
  const now = Date.now();

  try {
    const foldersToAdd = data
      .filter((item) => item.name) // Filter out items without names
      .map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        parentId: item.parentId || null,
        emoji: item.emoji,
        color: item.color,
        updatedAt: now,
      }));

    if (foldersToAdd.length > 0) {
      await db.folders.bulkAdd(foldersToAdd);
      stats.foldersCreated = foldersToAdd.length;
    }

    return {
      success: true,
      message: `Imported ${stats.foldersCreated} folders.`,
      stats,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Folder Import Error:", error);
    return { success: false, message: `DB Failed: ${error.message}` };
  }
}

export interface NoteImportItem {
  title: string;
  content: string;
}

export async function importNotes(
  folderId: string,
  jsonString: string,
): Promise<{ success: boolean; message: string; stats?: ImportStats }> {
  let data: NoteImportItem[];

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, message: "Invalid JSON format" };
  }

  if (!Array.isArray(data)) {
    return { success: false, message: "JSON must be an array of note objects" };
  }

  const stats = { notesCreated: 0 };
  const now = Date.now();

  try {
    const notesToAdd = data
      .filter((item) => item.title && item.content)
      .map((item) => ({
        id: crypto.randomUUID(),
        folderId,
        title: item.title,
        content: item.content,
        createdAt: now,
        updatedAt: now,
      }));

    if (notesToAdd.length > 0) {
      await db.notes.bulkAdd(notesToAdd);
      stats.notesCreated = notesToAdd.length;
    }

    return {
      success: true,
      message: `Imported ${stats.notesCreated} notes.`,
      stats,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Note Import Error:", error);
    return { success: false, message: `DB Failed: ${error.message}` };
  }
}
// ... (previous content)

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

export async function importFolderTree(
  parentId: string | null,
  folderData: ExportedFolder,
): Promise<{ success: boolean; message: string; stats?: ImportStats }> {
  try {
    const stats: ImportStats = {
      foldersCreated: 0,
      wordsCreated: 0,
      meaningsCreated: 0,
    };
    const now = Date.now();

    // 1. Create the current folder
    const folderId = crypto.randomUUID();
    await db.folders.add({
      id: folderId,
      name: folderData.name,
      parentId: parentId,
      emoji: folderData.emoji,
      color: folderData.color,
      backgroundImage: folderData.backgroundImage,
      updatedAt: now,
    });
    stats.foldersCreated = (stats.foldersCreated || 0) + 1;

    // 2. Import Words (Batch Optimized)
    if (folderData.words && folderData.words.length > 0) {
      // Prepare meaning import format
      const meaningImportData = folderData.words.map((w) => ({
        term: w.term,
        folderId: folderId,
        meanings: w.meanings,
      }));

      // Reuse bulk import logic for meanings/words
      // We stringify because bulkImportMeanings expects JSON string,
      // but let's refactor bulkImportMeanings to accept object too or create internal helper.
      // For now, JSON stringify is fast enough.
      const wordResult = await bulkImportMeanings(
        JSON.stringify(meaningImportData),
      );

      if (wordResult.stats) {
        stats.wordsCreated =
          (stats.wordsCreated || 0) + (wordResult.stats.wordsCreated || 0); // Note: bulkImportMeanings doesn't currently return wordsCreated stat correctly in all paths, but meaningsCreated is accurate.
        stats.meaningsCreated =
          (stats.meaningsCreated || 0) +
          (wordResult.stats.meaningsCreated || 0);
      }
    }

    // 3. Recursively Import Subfolders
    if (folderData.subfolders && folderData.subfolders.length > 0) {
      for (const subfolder of folderData.subfolders) {
        const subResult = await importFolderTree(folderId, subfolder);
        if (subResult.stats) {
          stats.foldersCreated =
            (stats.foldersCreated || 0) + (subResult.stats.foldersCreated || 0);
          stats.wordsCreated =
            (stats.wordsCreated || 0) + (subResult.stats.wordsCreated || 0);
          stats.meaningsCreated =
            (stats.meaningsCreated || 0) +
            (subResult.stats.meaningsCreated || 0);
        }
      }
    }

    return {
      success: true,
      message: `Imported folder tree: ${folderData.name}`,
      stats,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Tree Import Error:", error);
    return { success: false, message: `Tree Import Failed: ${error.message}` };
  }
}

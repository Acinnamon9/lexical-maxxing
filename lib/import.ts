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
    await db.transaction(
      "rw",
      db.words,
      db.wordFolders,
      db.wordMeanings,
      async () => {
        for (const item of data) {
          const { term, folderId, meanings } = item;
          if (!term || !folderId || !meanings || !Array.isArray(meanings)) {
            stats.wordsSkipped++;
            continue;
          }

          // Resolve word mapping
          const word = await db.words.where("term").equals(term.trim()).first();

          if (!word) {
            stats.wordsSkipped++;
            continue;
          }

          // Ensure the word is actually in that folder link
          const link = await db.wordFolders
            .where("[wordId+folderId]")
            .equals([word.id, folderId])
            .first();

          if (!link) {
            // Optionally create link? For "filling missing", we assume it should be there.
            // But lets be safe and skipping if not linked.
            stats.wordsSkipped++;
            continue;
          }

          for (const content of meanings) {
            await db.wordMeanings.add({
              id: crypto.randomUUID(),
              wordId: word.id,
              folderId: folderId,
              content: content.trim(),
              createdAt: now,
              updatedAt: now,
            });
            stats.meaningsCreated++;
          }
        }
      },
    );

    return { success: true, message: `Bulk import complete.`, stats };
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
    await db.transaction("rw", db.folders, async () => {
      for (const item of data) {
        if (!item.name) continue;
        await db.folders.add({
          id: crypto.randomUUID(),
          name: item.name,
          parentId: item.parentId || null,
          emoji: item.emoji,
          color: item.color,
          updatedAt: now,
        });
        stats.foldersCreated++;
      }
    });

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
    await db.transaction("rw", db.notes, async () => {
      for (const item of data) {
        if (!item.title || !item.content) continue;
        await db.notes.add({
          id: crypto.randomUUID(),
          folderId,
          title: item.title,
          content: item.content,
          createdAt: now,
          updatedAt: now,
        });
        stats.notesCreated++;
      }
    });

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

import { db } from "./db";
import {
  ImportFormat,
  Word,
  WordMeaning,
  WordState,
  WordFolder,
} from "./types";

export async function importJson(
  folderId: string,
  jsonString: string,
): Promise<{ success: boolean; message: string; stats?: any }> {
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
              // Optional: Check context-specific dupe?
              // For now, we just add.
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
  } catch (err: any) {
    console.error("Import Error:", err);
    return { success: false, message: `DB Transaction Failed: ${err.message}` };
  }
}

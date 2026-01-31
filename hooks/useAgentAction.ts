import { db } from "@/lib/db";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ActionType, AgentAction } from "@/lib/types";

// Helper to check if action is a read-only action
export const isReadAction = (action: AgentAction): boolean => {
  return (
    action.type === "GET_FOLDER_STRUCTURE" || action.type === "SEARCH_FOLDERS"
  );
};

export const useAgentAction = () => {
  const router = useRouter();
  // Execute read-only actions and return results
  const executeReadAction = useCallback(
    async (action: AgentAction): Promise<string | null> => {
      if (action.type === "GET_FOLDER_STRUCTURE") {
        const { parentId } = action.payload || {};
        const folders = parentId
          ? await db.folders.where("parentId").equals(parentId).toArray()
          : await db.folders.toArray();

        return JSON.stringify(
          folders.map((f) => ({
            id: f.id,
            name: f.name,
            parentId: f.parentId,
          })),
        );
      }

      if (action.type === "SEARCH_FOLDERS") {
        const { query } = action.payload || {};
        if (!query) return JSON.stringify([]);

        const results: any[] = [];
        const lowerQuery = query.toLowerCase();

        // 1. Search Folders
        const allFolders = await db.folders.toArray();
        const folderMatches = allFolders.filter((f) =>
          f.name.toLowerCase().includes(lowerQuery),
        );
        results.push(
          ...folderMatches.map((f) => ({
            type: "folder",
            id: f.id,
            name: f.name,
            parentId: f.parentId,
          })),
        );

        // 2. Search Words
        const allWords = await db.words.toArray();
        const wordMatches = allWords.filter((w) =>
          w.term.toLowerCase().includes(lowerQuery),
        );
        results.push(
          ...wordMatches.map((w) => ({
            type: "word",
            id: w.id,
            name: w.term,
          })),
        );

        // 3. Search Notes
        const allNotes = await db.notes.toArray();
        const noteMatches = allNotes.filter(
          (n) =>
            n.title.toLowerCase().includes(lowerQuery) ||
            n.content.toLowerCase().includes(lowerQuery),
        );
        results.push(
          ...noteMatches.map((n) => ({
            type: "note",
            id: n.id,
            name: n.title,
            folderId: n.folderId,
          })),
        );

        return JSON.stringify(results);
      }

      return null; // Not a read action
    },
    [],
  );

  // Execute tool calls for multi-turn agent loop
  const executeToolCall = useCallback(
    async (
      toolName: string,
      params: Record<string, any>,
    ): Promise<{ success: boolean; data: any; error?: string }> => {
      try {
        switch (toolName) {
          case "GET_ALL_WORDS": {
            const { folderId } = params;
            let words: any[] = [];

            if (folderId && folderId !== "current") {
              const wordLinks = await db.wordFolders
                .where("folderId")
                .equals(folderId)
                .toArray();
              const wordIds = wordLinks.map((wl) => wl.wordId);
              words = await db.words.where("id").anyOf(wordIds).toArray();
            } else {
              words = await db.words.toArray();
            }

            // Include word states
            const wordStates = await db.wordStates.toArray();
            const stateMap = new Map(wordStates.map((s) => [s.wordId, s]));

            const enrichedWords = words.map((w) => ({
              id: w.id,
              term: w.term,
              color: w.color,
              recallScore: stateMap.get(w.id)?.recallScore || 0,
            }));

            return { success: true, data: enrichedWords };
          }

          case "GET_FOLDER_CONTENTS": {
            const { folderId } = params;
            const allFolders = await db.folders.toArray();
            const subfolders = folderId
              ? allFolders.filter((f) => f.parentId === folderId)
              : allFolders.filter((f) => f.parentId === null);

            const wordLinks = folderId
              ? await db.wordFolders
                  .where("folderId")
                  .equals(folderId)
                  .toArray()
              : [];

            return {
              success: true,
              data: {
                subfolders: subfolders.map((f) => ({
                  id: f.id,
                  name: f.name,
                  emoji: f.emoji,
                })),
                wordCount: wordLinks.length,
              },
            };
          }

          case "SEARCH_WORDS": {
            const { query } = params;
            if (!query)
              return { success: false, data: null, error: "No query provided" };

            const allWords = await db.words.toArray();
            const matches = allWords.filter((w) =>
              w.term.toLowerCase().includes(query.toLowerCase()),
            );

            return {
              success: true,
              data: matches.map((w) => ({
                id: w.id,
                term: w.term,
                color: w.color,
              })),
            };
          }

          case "GET_WORD_DETAILS": {
            const { wordId, term } = params;
            let word = wordId
              ? await db.words.get(wordId)
              : await db.words.where("term").equalsIgnoreCase(term).first();

            if (!word)
              return { success: false, data: null, error: "Word not found" };

            const state = await db.wordStates.get(word.id);
            const meanings = await db.wordMeanings
              .where("wordId")
              .equals(word.id)
              .toArray();
            const doubts = await db.doubts
              .where("wordId")
              .equals(word.id)
              .toArray();
            const folders = await db.wordFolders
              .where("wordId")
              .equals(word.id)
              .toArray();

            return {
              success: true,
              data: {
                ...word,
                state,
                meanings,
                doubts,
                folderIds: folders.map((f) => f.folderId),
              },
            };
          }

          case "GET_FOLDER_HIERARCHY": {
            const allFolders = await db.folders.toArray();

            // Build tree structure
            const buildTree = (parentId: string | null): any[] => {
              return allFolders
                .filter((f) => f.parentId === parentId)
                .map((f) => ({
                  id: f.id,
                  name: f.name,
                  emoji: f.emoji,
                  children: buildTree(f.id),
                }));
            };

            return { success: true, data: buildTree(null) };
          }

          case "COUNT_WORDS": {
            const { folderId } = params;

            if (folderId) {
              const wordLinks = await db.wordFolders
                .where("folderId")
                .equals(folderId)
                .toArray();
              return {
                success: true,
                data: { count: wordLinks.length, folderId },
              };
            } else {
              const totalWords = await db.words.count();
              return {
                success: true,
                data: { count: totalWords, scope: "global" },
              };
            }
          }

          default:
            return {
              success: false,
              data: null,
              error: `Unknown tool: ${toolName}`,
            };
        }
      } catch (e: any) {
        return { success: false, data: null, error: e.message };
      }
    },
    [],
  );

  const executePlan = useCallback(
    async (actions: AgentAction[], sessionId?: string) => {
      const tempIdMap: Record<string, string> = {};
      const log: string[] = [];
      const inverseActions: AgentAction[] = [];

      for (const action of actions) {
        try {
          if (action.type === "CREATE_FOLDER") {
            const { name, tempId, parentTempId, parentName } =
              action.payload || {};
            if (!name) {
              log.push("Skipped CREATE_FOLDER: No folder name provided.");
              continue;
            }

            let parentId = undefined;

            // Resolve Parent
            if (parentTempId && tempIdMap[parentTempId]) {
              parentId = tempIdMap[parentTempId];
            } else if (parentName) {
              const parent = await db.folders
                .where("name")
                .equals(parentName)
                .first();
              if (parent) parentId = parent.id;
            }

            const existing = await db.folders
              .where("name")
              .equals(name)
              .first();
            let folderId = existing?.id;

            if (!existing) {
              const { emoji, color } = action.payload || {};
              folderId = crypto.randomUUID();
              await db.folders.add({
                id: folderId,
                name,
                parentId: parentId || null,
                emoji,
                color,
              });
              log.push(`Created folder: ${name}`);
              // Inverse: DELETE this folder
              inverseActions.push({
                type: "DELETE_ITEM",
                payload: { type: "folder", id: folderId },
              });
            } else {
              log.push(`Folder already exists: ${name}`);
            }

            if (tempId && folderId) {
              tempIdMap[tempId] = folderId;
            }
          }

          if (action.type === "ADD_WORD") {
            const { term, folderName, parentTempId } = action.payload || {};
            if (!term) {
              log.push("Skipped ADD_WORD: No term provided.");
              continue;
            }

            // Resolve Folder
            let folderId: string | undefined = undefined;

            if (parentTempId && tempIdMap[parentTempId]) {
              folderId = tempIdMap[parentTempId];
            } else if (folderName) {
              const folder = await db.folders
                .where("name")
                .equals(folderName)
                .first();
              if (folder) folderId = folder.id;
            }

            // If no folder specified, maybe try to find "Inbox" or "General", else skip/error
            // For now, if no folder, we can't link it strictly.
            // But wait, words CAN exist without folders in some schemas, but here we strictly link them
            // based on `wordFolders`.
            // Let's create a "General" folder if none found?
            // Or just fail gracefully for now.

            if (!folderId) {
              log.push(`Skipped "${term}": target folder not found.`);
              continue;
            }

            // 1. Ensure Word exists
            const existingWord = await db.words
              .where("term")
              .equals(term)
              .first();
            let wordId = existingWord?.id;

            if (!existingWord) {
              wordId = crypto.randomUUID();
              await db.words.add({ id: wordId, term });

              // Add initial state
              await db.wordStates.add({
                wordId,
                recognitionScore: 0,
                recallScore: 0,
                lastReviewedAt: 0,
                nextReviewAt: 0,
                updatedAt: Date.now(),
                needsSync: true,
              });
            }

            if (wordId) {
              // 2. Link to Folder
              const existingLink = await db.wordFolders.get([wordId, folderId]);
              if (!existingLink) {
                await db.wordFolders.add({ wordId, folderId });
                log.push(`Added "${term}" to folder.`);
                // Inverse: DELETE this word
                inverseActions.push({
                  type: "DELETE_ITEM",
                  payload: { type: "word", id: wordId },
                });
              }
            }
          }

          if (action.type === "DELETE_ITEM") {
            const { type, id } = action.payload || {};
            if (!id) {
              log.push("Skipped DELETE_ITEM: No ID provided.");
              continue;
            }

            if (type === "folder") {
              // Capture original data for inverse BEFORE deleting
              const originalFolder = await db.folders.get(id);
              await db.folders.delete(id);
              log.push(`Deleted folder ${id}`);
              if (originalFolder) {
                inverseActions.push({
                  type: "CREATE_FOLDER",
                  payload: {
                    name: originalFolder.name,
                    parentName: originalFolder.parentId
                      ? (await db.folders.get(originalFolder.parentId))?.name
                      : undefined,
                  },
                });
              }
            } else if (type === "word") {
              await db.words.delete(id);
              await db.wordFolders.where("wordId").equals(id).delete();
              await db.wordStates.where("wordId").equals(id).delete();
              log.push(`Deleted word ${id}`);
            } else if (type === "doubt") {
              await db.doubts.delete(id);
              log.push(`Deleted doubt ${id}`);
            }
          }

          if (action.type === "RENAME_ITEM") {
            const { type, id, newName } = action.payload || {};
            if (!id || !newName) {
              log.push("Skipped RENAME_ITEM: Missing ID or newName.");
              continue;
            }

            if (type === "folder") {
              await db.folders.update(id, { name: newName });
              log.push(`Renamed folder to "${newName}"`);
            } else if (type === "word") {
              await db.words.update(id, { term: newName });
              log.push(`Renamed word to "${newName}"`);
            }
          }

          if (action.type === "UPDATE_FOLDER_METADATA") {
            const { id, emoji, color } = action.payload || {};
            if (!id) {
              log.push("Skipped UPDATE_FOLDER_METADATA: Missing ID.");
              continue;
            }
            const update: any = { updatedAt: Date.now() };
            if (emoji !== undefined) update.emoji = emoji;
            if (color !== undefined) update.color = color;
            await db.folders.update(id, update);
            log.push(`Updated metadata for folder ${id}`);
          }

          if (action.type === "UPDATE_WORD_METADATA") {
            const { id, term, color } = action.payload || {};
            if (!id && !term) {
              log.push("Skipped UPDATE_WORD_METADATA: Missing ID or Term.");
              continue;
            }

            let targetId = id;

            // If ID is provided, verify it exists
            if (targetId) {
              const exists = await db.words.get(targetId);
              if (!exists) targetId = undefined;
            }

            // Fallback to term lookup
            if (!targetId && term) {
              const word = await db.words
                .where("term")
                .equalsIgnoreCase(term)
                .first();
              if (word) targetId = word.id;
            }

            if (targetId) {
              const update: any = {};
              if (color !== undefined) update.color = color;
              await db.words.update(targetId, update);
              log.push(`Updated metadata for word "${term || targetId}"`);
            } else {
              log.push(
                `Skipped UPDATE_WORD_METADATA: Word not found (${term || id}).`,
              );
            }
          }

          if (action.type === "MOVE_ITEM") {
            const { type, id, targetFolderId } = action.payload || {};
            if (!id || !targetFolderId) {
              log.push("Skipped MOVE_ITEM: Missing ID or targetFolderId.");
              continue;
            }

            if (type === "folder") {
              await db.folders.update(id, { parentId: targetFolderId });
              log.push(`Moved folder to ${targetFolderId}`);
            } else if (type === "word") {
              // Remove from all folders and add to target
              await db.wordFolders.where("wordId").equals(id).delete();
              await db.wordFolders.add({
                wordId: id,
                folderId: targetFolderId,
              });
              log.push(`Moved word to folder ${targetFolderId}`);
            }
          }

          if (action.type === "NAVIGATE_TO") {
            const { view, id } = action.payload || {};
            if (view === "home") {
              router.push("/");
              log.push("Navigated to Home");
            } else if (view === "folder" && id) {
              router.push(`/folder/${id}`);
              log.push(`Navigated to folder ${id}`);
            }
          }

          // NOTES ACTIONS
          if (action.type === "CREATE_NOTE") {
            const { title, content, folderId, folderName } =
              action.payload || {};
            if (!title) {
              log.push("Skipped CREATE_NOTE: Missing title.");
              continue;
            }

            let targetFolderId = folderId;
            if (!targetFolderId && folderName) {
              const folder = await db.folders
                .where("name")
                .equals(folderName)
                .first();
              if (folder) targetFolderId = folder.id;
            }

            // Fallback to "Inbox" or similar if no folder provided,
            // but for now let's just create it if we have a folderId, OR skip.
            // Actually, we can create a note without a folderId if the schema allows,
            // but our schema enforces strict folder structure usually?
            // The Note type has folderId. Let's assume we need one.

            if (!targetFolderId) {
              // Try to find currently viewing folder from context perhaps?
              // But usually context is injected into the payload by the prompt logic.
              log.push("Skipped CREATE_NOTE: No target folder identified.");
              continue;
            }

            const noteId = crypto.randomUUID();
            await db.notes.add({
              id: noteId,
              folderId: targetFolderId,
              title,
              content: content || "",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            log.push(`Created note: "${title}"`);

            // Inverse: DELETE note
            inverseActions.push({
              type: "DELETE_NOTE",
              payload: { id: noteId },
            });
          }

          if (action.type === "UPDATE_NOTE") {
            const { id, title, content } = action.payload || {};
            if (!id) {
              log.push("Skipped UPDATE_NOTE: No ID provided.");
              continue;
            }

            const originalNote = await db.notes.get(id);
            if (!originalNote) {
              log.push(`Skipped UPDATE_NOTE: Note ${id} not found.`);
              continue;
            }

            const updates: any = { updatedAt: Date.now() };
            if (title) updates.title = title;
            if (content) updates.content = content;

            await db.notes.update(id, updates);
            log.push(`Updated note: "${originalNote.title}"`);

            // Inverse: Restore original
            inverseActions.push({
              type: "UPDATE_NOTE",
              payload: {
                id,
                title: originalNote.title,
                content: originalNote.content,
              },
            });
          }

          if (action.type === "DELETE_NOTE") {
            const { id } = action.payload || {};
            if (!id) continue;

            const originalNote = await db.notes.get(id);
            if (originalNote) {
              await db.notes.delete(id);
              log.push(`Deleted note: "${originalNote.title}"`);

              // Inverse: Re-create
              inverseActions.push({
                type: "CREATE_NOTE",
                payload: {
                  title: originalNote.title,
                  content: originalNote.content,
                  folderId: originalNote.folderId,
                },
              });
            }
          }

          if (action.type === "CREATE_DOUBT") {
            const {
              term,
              folderName,
              query,
              folderId: directFolderId,
            } = action.payload || {};
            if (!query) {
              log.push("Skipped CREATE_DOUBT: Missing query.");
              continue;
            }

            let targetFolderId = directFolderId;
            if (!targetFolderId && folderName) {
              const folder = await db.folders
                .where("name")
                .equals(folderName)
                .first();
              if (folder) targetFolderId = folder.id;
            }

            if (!targetFolderId) {
              log.push("Skipped CREATE_DOUBT: Folder not found.");
              continue;
            }

            // Resolve Word
            let targetWordId = undefined;
            if (term) {
              const word = await db.words.where("term").equals(term).first();
              if (word) {
                targetWordId = word.id;
              } else {
                // Create word if it doesn't exist
                targetWordId = crypto.randomUUID();
                await db.words.add({ id: targetWordId, term });
                await db.wordStates.add({
                  wordId: targetWordId,
                  recognitionScore: 0,
                  recallScore: 0,
                  lastReviewedAt: 0,
                  nextReviewAt: 0,
                  updatedAt: Date.now(),
                  needsSync: true,
                });
                await db.wordFolders.add({
                  wordId: targetWordId,
                  folderId: targetFolderId,
                });
              }
            }

            if (!targetWordId) {
              log.push(
                "Skipped CREATE_DOUBT: Word not found and no term provided.",
              );
              continue;
            }

            const doubtId = crypto.randomUUID();
            await db.doubts.add({
              id: doubtId,
              wordId: targetWordId,
              folderId: targetFolderId,
              query,
              response: null,
              status: "pending",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            log.push(`Added doubt for "${term || targetWordId}"`);

            // Inverse: DELETE doubt
            inverseActions.push({
              type: "DELETE_ITEM",
              payload: { type: "doubt" as any, id: doubtId },
            });
          }

          // ========================================
          // BULK ACTIONS
          // ========================================

          if (action.type === "BULK_ADD_WORDS") {
            const {
              terms,
              folderName,
              folderId: directFolderId,
            } = action.payload || {};
            if (!terms || !Array.isArray(terms) || terms.length === 0) {
              log.push("Skipped BULK_ADD_WORDS: No terms provided.");
              continue;
            }

            let targetFolderId = directFolderId;
            if (!targetFolderId && folderName) {
              const folder = await db.folders
                .where("name")
                .equalsIgnoreCase(folderName)
                .first();
              if (folder) targetFolderId = folder.id;
            }

            if (!targetFolderId) {
              log.push("Skipped BULK_ADD_WORDS: Folder not found.");
              continue;
            }

            let addedCount = 0;
            for (const term of terms) {
              if (!term || typeof term !== "string") continue;

              // Check if word exists
              let word = await db.words
                .where("term")
                .equalsIgnoreCase(term.trim())
                .first();
              let wordId = word?.id;

              if (!wordId) {
                wordId = crypto.randomUUID();
                await db.words.add({ id: wordId, term: term.trim() });
                await db.wordStates.add({
                  wordId,
                  recognitionScore: 0,
                  recallScore: 0,
                  lastReviewedAt: 0,
                  nextReviewAt: 0,
                  updatedAt: Date.now(),
                  needsSync: true,
                });
              }

              // Link to folder if not already linked
              const existingLink = await db.wordFolders.get([
                wordId,
                targetFolderId,
              ]);
              if (!existingLink) {
                await db.wordFolders.add({ wordId, folderId: targetFolderId });
                addedCount++;
              }
            }

            log.push(`Added ${addedCount} words to folder.`);
          }

          if (action.type === "BULK_UPDATE_WORD_METADATA") {
            const { updates, folderId } = action.payload || {};
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
              log.push(
                "Skipped BULK_UPDATE_WORD_METADATA: No updates provided.",
              );
              continue;
            }

            let updatedCount = 0;
            for (const update of updates) {
              const { term, id, color } = update || {};
              if (!term && !id) continue;

              let word = id
                ? await db.words.get(id)
                : await db.words.where("term").equalsIgnoreCase(term).first();

              if (word) {
                const changes: any = {};
                if (color !== undefined) changes.color = color;
                await db.words.update(word.id, changes);
                updatedCount++;
              }
            }

            log.push(`Updated metadata for ${updatedCount} words.`);
          }

          if (action.type === "BULK_MOVE_ITEMS") {
            const { itemIds, targetFolderId, type } = action.payload || {};
            if (!itemIds || !Array.isArray(itemIds) || !targetFolderId) {
              log.push(
                "Skipped BULK_MOVE_ITEMS: Missing itemIds or targetFolderId.",
              );
              continue;
            }

            let movedCount = 0;
            for (const itemId of itemIds) {
              if (type === "folder") {
                await db.folders.update(itemId, { parentId: targetFolderId });
                movedCount++;
              } else {
                // Words: Remove existing links, add new one
                await db.wordFolders.where("wordId").equals(itemId).delete();
                await db.wordFolders.add({
                  wordId: itemId,
                  folderId: targetFolderId,
                });
                movedCount++;
              }
            }

            log.push(`Moved ${movedCount} items to folder.`);
          }

          // ========================================
          // LEARNING & REVIEW
          // ========================================

          if (action.type === "SET_WORD_MASTERY") {
            const { wordId, term, score } = action.payload || {};
            if (score === undefined || score < 0 || score > 5) {
              log.push(
                "Skipped SET_WORD_MASTERY: Invalid score (must be 0-5).",
              );
              continue;
            }

            let targetWordId = wordId;
            if (!targetWordId && term) {
              const word = await db.words
                .where("term")
                .equalsIgnoreCase(term)
                .first();
              if (word) targetWordId = word.id;
            }

            if (!targetWordId) {
              log.push(`Skipped SET_WORD_MASTERY: Word not found.`);
              continue;
            }

            await db.wordStates.update(targetWordId, {
              recallScore: score,
              lastReviewedAt: Date.now(),
              updatedAt: Date.now(),
            });

            log.push(
              `Set mastery for "${term || targetWordId}" to ${score}/5.`,
            );
          }

          if (action.type === "SCHEDULE_REVIEW") {
            const { folderId, mode = "random" } = action.payload || {};
            if (!folderId) {
              log.push("Skipped SCHEDULE_REVIEW: Missing folderId.");
              continue;
            }

            // Get all words in the folder
            const wordLinks = await db.wordFolders
              .where("folderId")
              .equals(folderId)
              .toArray();
            const wordIds = wordLinks.map((wl) => wl.wordId);

            if (wordIds.length === 0) {
              log.push("Skipped SCHEDULE_REVIEW: No words in folder.");
              continue;
            }

            // Create review session
            const sessionId = crypto.randomUUID();
            await db.reviewSessions.add({
              id: sessionId,
              folderId,
              mode: mode as "spaced_rep" | "random" | "weak_first",
              wordIds,
              currentIndex: 0,
              completedIds: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });

            log.push(`Created review session with ${wordIds.length} words.`);
          }

          // ========================================
          // ORGANIZATION
          // ========================================

          if (action.type === "DUPLICATE_FOLDER") {
            const { folderId, newName } = action.payload || {};
            if (!folderId) {
              log.push("Skipped DUPLICATE_FOLDER: Missing folderId.");
              continue;
            }

            const original = await db.folders.get(folderId);
            if (!original) {
              log.push("Skipped DUPLICATE_FOLDER: Folder not found.");
              continue;
            }

            const newFolderId = crypto.randomUUID();
            await db.folders.add({
              id: newFolderId,
              name: newName || `${original.name} (Copy)`,
              parentId: original.parentId,
              emoji: original.emoji,
              color: original.color,
              updatedAt: Date.now(),
            });

            // Copy word associations
            const wordLinks = await db.wordFolders
              .where("folderId")
              .equals(folderId)
              .toArray();
            for (const link of wordLinks) {
              await db.wordFolders.add({
                wordId: link.wordId,
                folderId: newFolderId,
              });
            }

            log.push(
              `Duplicated folder "${original.name}" with ${wordLinks.length} words.`,
            );
          }

          if (action.type === "MERGE_FOLDERS") {
            const { sourceId, targetId } = action.payload || {};
            if (!sourceId || !targetId) {
              log.push("Skipped MERGE_FOLDERS: Missing sourceId or targetId.");
              continue;
            }

            const source = await db.folders.get(sourceId);
            const target = await db.folders.get(targetId);
            if (!source || !target) {
              log.push("Skipped MERGE_FOLDERS: Folder not found.");
              continue;
            }

            // Move all words from source to target
            const wordLinks = await db.wordFolders
              .where("folderId")
              .equals(sourceId)
              .toArray();
            for (const link of wordLinks) {
              // Check if already exists in target
              const existing = await db.wordFolders.get([
                link.wordId,
                targetId,
              ]);
              if (!existing) {
                await db.wordFolders.add({
                  wordId: link.wordId,
                  folderId: targetId,
                });
              }
            }

            // Delete word links for source
            await db.wordFolders.where("folderId").equals(sourceId).delete();

            // Move subfolders to target
            await db.folders
              .where("parentId")
              .equals(sourceId)
              .modify({ parentId: targetId });

            // Delete source folder
            await db.folders.delete(sourceId);

            log.push(`Merged "${source.name}" into "${target.name}".`);
          }

          // ========================================
          // KNOWLEDGE GRAPH
          // ========================================

          if (action.type === "LINK_WORDS") {
            const {
              wordId1,
              wordId2,
              term1,
              term2,
              relationType = "related",
            } = action.payload || {};

            let resolvedId1 = wordId1;
            let resolvedId2 = wordId2;

            if (!resolvedId1 && term1) {
              const word = await db.words
                .where("term")
                .equalsIgnoreCase(term1)
                .first();
              if (word) resolvedId1 = word.id;
            }
            if (!resolvedId2 && term2) {
              const word = await db.words
                .where("term")
                .equalsIgnoreCase(term2)
                .first();
              if (word) resolvedId2 = word.id;
            }

            if (!resolvedId1 || !resolvedId2) {
              log.push("Skipped LINK_WORDS: One or both words not found.");
              continue;
            }

            await db.wordLinks.add({
              id: crypto.randomUUID(),
              wordId1: resolvedId1,
              wordId2: resolvedId2,
              relationType: relationType as any,
              createdAt: Date.now(),
            });

            log.push(
              `Linked "${term1 || resolvedId1}" ↔ "${term2 || resolvedId2}" (${relationType}).`,
            );
          }

          if (action.type === "CREATE_WORD_GROUP") {
            const { name, wordIds, terms, folderId } = action.payload || {};
            if (!name) {
              log.push("Skipped CREATE_WORD_GROUP: Missing group name.");
              continue;
            }

            // Resolve word IDs from terms if needed
            let resolvedWordIds = wordIds || [];
            if (terms && Array.isArray(terms)) {
              for (const term of terms) {
                const word = await db.words
                  .where("term")
                  .equalsIgnoreCase(term)
                  .first();
                if (word) resolvedWordIds.push(word.id);
              }
            }

            if (resolvedWordIds.length === 0) {
              log.push("Skipped CREATE_WORD_GROUP: No words found.");
              continue;
            }

            await db.wordGroups.add({
              id: crypto.randomUUID(),
              name,
              folderId: folderId || "",
              wordIds: resolvedWordIds,
              createdAt: Date.now(),
            });

            log.push(
              `Created word group "${name}" with ${resolvedWordIds.length} words.`,
            );
          }
        } catch (e: any) {
          console.error("Agent Execution Error", e);
          log.push(`Error executing action: ${e.message}`);
        }
      }

      // Save history for undo if sessionId provided
      if (sessionId && inverseActions.length > 0) {
        await db.agentActionHistory.add({
          id: crypto.randomUUID(),
          sessionId,
          executedActions: actions,
          inverseActions: inverseActions.reverse(), // Reverse order for proper undo
          timestamp: Date.now(),
        });
      }

      return log;
    },
    [router],
  );

  // Undo the last executed plan for a session
  const undoLastPlan = useCallback(
    async (sessionId: string) => {
      const lastHistory = await db.agentActionHistory
        .where("sessionId")
        .equals(sessionId)
        .reverse()
        .first();

      if (!lastHistory) {
        return ["Nothing to undo."];
      }

      // Execute inverse actions (without session to avoid infinite journaling)
      const log = await executePlan(lastHistory.inverseActions);

      // Delete the history entry
      await db.agentActionHistory.delete(lastHistory.id);

      return ["Undo complete.", ...log];
    },
    [executePlan],
  );

  return { executePlan, executeReadAction, executeToolCall, undoLastPlan };
};

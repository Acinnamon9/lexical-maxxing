import { db } from "@/lib/db";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  ActionType,
  AgentAction,
  ToolResult,
  ToolName,
  AgentMessage,
  Folder,
  Word,
} from "@/lib/types";

// Type definitions for payloads to replace 'any' casting
interface FolderPayload {
  id?: string;
  parentId?: string;
  name?: string;
  query?: string;
  tempId?: string;
  parentTempId?: string;
  parentName?: string;
  emoji?: string;
  color?: string;
}

interface WordPayload {
  term: string;
  folderName?: string;
  parentTempId?: string;
  id?: string;
  color?: string;
}

interface DeletePayload {
  type: "folder" | "word" | "doubt";
  id: string;
}

interface RenamePayload {
  type: "folder" | "word";
  id: string;
  newName: string;
}

interface MovePayload {
  type: "folder" | "word";
  id: string;
  targetFolderId: string;
}

interface NavigatePayload {
  view: "home" | "folder";
  id?: string;
}

interface NotePayload {
  id?: string;
  title?: string;
  content?: string;
  folderId?: string;
  folderName?: string;
}

interface DoubtPayload {
  term?: string;
  folderName?: string;
  query: string;
  folderId?: string;
}

interface BulkWordsPayload {
  terms: string[];
  folderName?: string;
  folderId?: string;
}

interface BulkMetadataPayload {
  updates: { id?: string; term?: string; color?: string }[];
  folderId?: string;
}

interface BulkMovePayload {
  itemIds: string[];
  targetFolderId: string;
  type: "folder" | "word";
}

interface MasteryPayload {
  wordId?: string;
  term?: string;
  score: number;
}

interface ReviewPayload {
  folderId: string;
  mode?: "spaced_rep" | "random" | "weak_first";
}

interface KnowledgePayload {
  wordId1?: string;
  wordId2?: string;
  term1?: string;
  term2?: string;
  relationType?: "synonym" | "antonym" | "related";
  name?: string;
  wordIds?: string[];
  terms?: string[];
  folderId?: string;
}

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
        const payload = action.payload as FolderPayload;
        const { parentId } = payload || {};
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
        const payload = action.payload as FolderPayload;
        const { query } = payload || {};
        if (!query) return JSON.stringify([]);

        const results: (
          | {
              type: "folder";
              id: string;
              name: string;
              parentId: string | null;
            }
          | { type: "word"; id: string; name: string }
          | { type: "note"; id: string; name: string; folderId: string }
        )[] = [];
        const lowerQuery = query.toLowerCase();

        // 1. Search Folders
        const allFolders = await db.folders.toArray();
        const folderMatches = allFolders.filter((f) =>
          f.name.toLowerCase().includes(lowerQuery),
        );
        results.push(
          ...folderMatches.map((f) => ({
            type: "folder" as const,
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
            type: "word" as const,
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
            type: "note" as const,
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
      toolName: ToolName | string,
      params: Record<string, unknown>,
    ): Promise<ToolResult> => {
      try {
        switch (toolName) {
          case "GET_ALL_WORDS": {
            const { folderId } = params as { folderId?: string };
            let words: Word[] = [];

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

            return {
              tool: "GET_ALL_WORDS",
              success: true,
              data: enrichedWords,
            };
          }

          case "GET_FOLDER_CONTENTS": {
            const { folderId } = params as { folderId?: string };
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
              tool: "GET_FOLDER_CONTENTS",
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
            const { query } = params as { query?: string };
            if (!query)
              return {
                tool: "SEARCH_WORDS",
                success: false,
                data: null,
                error: "No query provided",
              };

            const allWords = await db.words.toArray();
            const matches = allWords.filter((w) =>
              w.term.toLowerCase().includes(query.toLowerCase()),
            );

            return {
              tool: "SEARCH_WORDS",
              success: true,
              data: matches.map((w) => ({
                id: w.id,
                term: w.term,
                color: w.color,
              })),
            };
          }

          case "GET_WORD_DETAILS": {
            const { wordId, term } = params as {
              wordId?: string;
              term?: string;
            };
            let word = wordId
              ? await db.words.get(wordId)
              : term
                ? await db.words.where("term").equalsIgnoreCase(term).first()
                : undefined;

            if (!word)
              return {
                tool: "GET_WORD_DETAILS",
                success: false,
                data: null,
                error: "Word not found",
              };

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
              tool: "GET_WORD_DETAILS",
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

            interface FolderNode {
              id: string;
              name: string;
              emoji?: string;
              children: FolderNode[];
            }

            // Build tree structure
            const buildTree = (parentId: string | null): FolderNode[] => {
              return allFolders
                .filter((f) => f.parentId === parentId)
                .map((f) => ({
                  id: f.id,
                  name: f.name,
                  emoji: f.emoji,
                  children: buildTree(f.id),
                }));
            };

            return {
              tool: "GET_FOLDER_HIERARCHY",
              success: true,
              data: buildTree(null),
            };
          }

          case "COUNT_WORDS": {
            const { folderId } = params as { folderId?: string };

            if (folderId) {
              const wordLinks = await db.wordFolders
                .where("folderId")
                .equals(folderId)
                .toArray();
              return {
                tool: "COUNT_WORDS",
                success: true,
                data: { count: wordLinks.length, folderId },
              };
            } else {
              const totalWords = await db.words.count();
              return {
                tool: "COUNT_WORDS",
                success: true,
                data: { count: totalWords, scope: "global" },
              };
            }
          }

          default:
            return {
              tool: toolName as ToolName,
              success: false,
              data: null,
              error: `Unknown tool: ${toolName}`,
            };
        }
      } catch (err: unknown) {
        const e = err as Error;
        return {
          tool: toolName as ToolName,
          success: false,
          data: null,
          error: e.message,
        };
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
            const payload = action.payload as FolderPayload;
            const { name, tempId, parentTempId, parentName } = payload || {};
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
              const { emoji, color } = payload || {};
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
                payload: { type: "folder", id: folderId } as DeletePayload,
              });
            } else {
              log.push(`Folder already exists: ${name}`);
            }

            if (tempId && folderId) {
              tempIdMap[tempId] = folderId;
            }
          }

          if (action.type === "ADD_WORD") {
            const payload = action.payload as WordPayload;
            const { term, folderName, parentTempId } = payload || {};
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
                  payload: { type: "word", id: wordId } as DeletePayload,
                });
              }
            }
          }

          if (action.type === "DELETE_ITEM") {
            const payload = action.payload as DeletePayload;
            const { type, id } = payload || {};
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
                const parentFolder = originalFolder.parentId
                  ? await db.folders.get(originalFolder.parentId)
                  : null;
                inverseActions.push({
                  type: "CREATE_FOLDER",
                  payload: {
                    name: originalFolder.name,
                    parentName: parentFolder?.name,
                  } as FolderPayload,
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
            const payload = action.payload as RenamePayload;
            const { type, id, newName } = payload || {};
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
            const payload = action.payload as FolderPayload;
            const { id, emoji, color } = payload || {};
            if (!id) {
              log.push("Skipped UPDATE_FOLDER_METADATA: Missing ID.");
              continue;
            }
            const update: Partial<Folder> & { updatedAt: number } = {
              updatedAt: Date.now(),
            };
            if (emoji !== undefined) update.emoji = emoji;
            if (color !== undefined) update.color = color;
            await db.folders.update(id, update);
            log.push(`Updated metadata for folder ${id}`);
          }

          if (action.type === "UPDATE_WORD_METADATA") {
            const payload = action.payload as WordPayload;
            const { id, term, color } = payload || {};
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
              const update: Partial<Word> = {};
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
            const payload = action.payload as MovePayload;
            const { type, id, targetFolderId } = payload || {};
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
            const payload = action.payload as NavigatePayload;
            const { view, id } = payload || {};
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
            const payload = action.payload as NotePayload;
            const { title, content, folderId, folderName } = payload || {};
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

            if (!targetFolderId) {
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
              payload: { id: noteId } as NotePayload,
            });
          }

          if (action.type === "UPDATE_NOTE") {
            const payload = action.payload as NotePayload;
            const { id, title, content } = payload || {};
            if (!id) {
              log.push("Skipped UPDATE_NOTE: No ID provided.");
              continue;
            }

            const originalNote = await db.notes.get(id);
            if (!originalNote) {
              log.push(`Skipped UPDATE_NOTE: Note ${id} not found.`);
              continue;
            }

            const updates: Partial<NotePayload> & { updatedAt: number } = {
              updatedAt: Date.now(),
            };
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
              } as NotePayload,
            });
          }

          if (action.type === "DELETE_NOTE") {
            const payload = action.payload as NotePayload;
            const { id } = payload || {};
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
                } as NotePayload,
              });
            }
          }

          if (action.type === "CREATE_DOUBT") {
            const payload = action.payload as DoubtPayload;
            const {
              term,
              folderName,
              query,
              folderId: directFolderId,
            } = payload || {};
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
              payload: { type: "doubt", id: doubtId } as DeletePayload,
            });
          }

          // ========================================
          // BULK ACTIONS
          // ========================================

          if (action.type === "BULK_ADD_WORDS") {
            const payload = action.payload as BulkWordsPayload;
            const {
              terms,
              folderName,
              folderId: directFolderId,
            } = payload || {};
            if (!terms || !Array.isArray(terms)) {
              log.push("Skipped BULK_ADD_WORDS: Missing terms.");
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

            for (const term of terms) {
              let word = await db.words
                .where("term")
                .equalsIgnoreCase(term)
                .first();
              if (!word) {
                const wordId = crypto.randomUUID();
                word = { id: wordId, term };
                await db.words.add(word);
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

              // Check if already in folder
              const exists = await db.wordFolders.get([
                word.id,
                targetFolderId,
              ]);
              if (!exists) {
                await db.wordFolders.add({
                  wordId: word.id,
                  folderId: targetFolderId,
                });
              }
            }
            log.push(`Bulk added ${terms.length} words to folder.`);
          }

          if (action.type === "BULK_UPDATE_WORD_METADATA") {
            const payload = action.payload as BulkMetadataPayload;
            const { updates, folderId } = payload || {};
            if (!updates || !Array.isArray(updates)) {
              log.push("Skipped BULK_UPDATE_WORD_METADATA: Missing updates.");
              continue;
            }

            let updatedCount = 0;
            for (const update of updates) {
              let targetId = update.id;
              if (!targetId && update.term) {
                const word = await db.words
                  .where("term")
                  .equalsIgnoreCase(update.term)
                  .first();
                if (word) targetId = word.id;
              }

              if (targetId) {
                await db.words.update(targetId, { color: update.color });
                updatedCount++;
              }
            }
            log.push(`Bulk updated ${updatedCount} words.`);
          }

          if (action.type === "BULK_MOVE_ITEMS") {
            const payload = action.payload as BulkMovePayload;
            const { itemIds, targetFolderId, type } = payload || {};
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
            const payload = action.payload as MasteryPayload;
            const { wordId, term, score } = payload || {};
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
            const payload = action.payload as ReviewPayload;
            const { folderId, mode = "random" } = payload || {};
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
              mode,
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
            const payload = action.payload as FolderPayload;
            const { id: folderId, name: newName } = payload || {};
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
            const payload = action.payload as {
              sourceId: string;
              targetId: string;
            };
            const { sourceId, targetId } = payload || {};
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
            const payload = action.payload as KnowledgePayload;
            const {
              wordId1,
              wordId2,
              term1,
              term2,
              relationType = "related",
            } = payload || {};

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
              relationType: relationType as "synonym" | "antonym" | "related",
              createdAt: Date.now(),
            });

            log.push(
              `Linked "${term1 || resolvedId1}" ↔ "${term2 || resolvedId2}" (${relationType}).`,
            );
          }

          if (action.type === "CREATE_WORD_GROUP") {
            const payload = action.payload as KnowledgePayload;
            const { name, wordIds, terms, folderId } = payload || {};
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
        } catch (err: unknown) {
          const e = err as Error;
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

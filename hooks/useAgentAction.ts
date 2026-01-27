import { db } from "@/lib/db";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

export type ActionType =
  | "CREATE_FOLDER"
  | "ADD_WORD"
  | "GET_FOLDER_STRUCTURE"
  | "SEARCH_FOLDERS"
  | "DELETE_ITEM"
  | "RENAME_ITEM"
  | "MOVE_ITEM"
  | "NAVIGATE_TO";

export interface AgentAction {
  type: ActionType;
  payload: any;
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

        const allFolders = await db.folders.toArray();
        const matches = allFolders.filter((f) =>
          f.name.toLowerCase().includes(query.toLowerCase()),
        );
        return JSON.stringify(
          matches.map((f) => ({
            id: f.id,
            name: f.name,
            parentId: f.parentId,
          })),
        );
      }

      return null; // Not a read action
    },
    [],
  );

  const executePlan = useCallback(async (actions: AgentAction[]) => {
    const tempIdMap: Record<string, string> = {};
    const log: string[] = [];

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

          const existing = await db.folders.where("name").equals(name).first();
          let folderId = existing?.id;

          if (!existing) {
            folderId = crypto.randomUUID();
            await db.folders.add({
              id: folderId,
              name,
              parentId: parentId || null, // undefined breaks Dexie
            });
            log.push(`Created folder: ${name}`);
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
            await db.folders.delete(id);
            log.push(`Deleted folder ${id}`);
          } else if (type === "word") {
            await db.words.delete(id);
            await db.wordFolders.where("wordId").equals(id).delete();
            await db.wordStates.where("wordId").equals(id).delete();
            log.push(`Deleted word ${id}`);
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
            await db.wordFolders.add({ wordId: id, folderId: targetFolderId });
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
      } catch (e: any) {
        console.error("Agent Execution Error", e);
        log.push(`Error executing action: ${e.message}`);
      }
    }

    return log;
  }, []);

  return { executePlan, executeReadAction };
};

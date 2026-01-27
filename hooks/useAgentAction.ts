import { db } from "@/lib/db";
import { useCallback } from "react";

export type ActionType = "CREATE_FOLDER" | "ADD_WORD";

export interface AgentAction {
    type: ActionType;
    payload: any;
}

export const useAgentAction = () => {
    const executePlan = useCallback(async (actions: AgentAction[]) => {
        const tempIdMap: Record<string, string> = {};
        const log: string[] = [];

        for (const action of actions) {
            try {
                if (action.type === "CREATE_FOLDER") {
                    const { name, tempId, parentTempId, parentName } = action.payload;

                    let parentId = undefined;

                    // Resolve Parent
                    if (parentTempId && tempIdMap[parentTempId]) {
                        parentId = tempIdMap[parentTempId];
                    } else if (parentName) {
                        const parent = await db.folders.where("name").equals(parentName).first();
                        if (parent) parentId = parent.id;
                    }

                    const existing = await db.folders.where("name").equals(name).first();
                    let folderId = existing?.id;

                    if (!existing) {
                        folderId = crypto.randomUUID();
                        await db.folders.add({
                            id: folderId,
                            name,
                            parentId: parentId || null // undefined breaks Dexie
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
                    const { term, folderName, parentTempId } = action.payload;

                    // Resolve Folder
                    let folderId: string | undefined = undefined;

                    if (parentTempId && tempIdMap[parentTempId]) {
                        folderId = tempIdMap[parentTempId];
                    } else if (folderName) {
                        const folder = await db.folders.where("name").equals(folderName).first();
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
                    const existingWord = await db.words.where("term").equals(term).first();
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
            } catch (e: any) {
                console.error("Agent Execution Error", e);
                log.push(`Error executing action: ${e.message}`);
            }
        }

        return log;
    }, []);

    return { executePlan };
};

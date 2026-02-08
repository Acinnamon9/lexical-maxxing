import { Table, IndexableType } from "dexie";
import { db } from "./db";
import { supabase } from "./supabase";
import {
  AgentMessage,
  AgentSession,
  Folder,
  UserSetting,
  Word,
  WordFolder,
  Note,
} from "./types";

type SyncItem =
  | Folder
  | Word
  | WordFolder
  | AgentSession
  | AgentMessage
  | UserSetting
  | Note;

export async function syncData(userId: string) {
  console.log("Starting sync for user:", userId);

  try {
    // 1. Folders
    await syncTable("folders", db.folders, userId, "folders");

    // 2. Words
    await syncTable("words", db.words, userId, "words");

    // 3. WordFolders (Composite Key)
    // Special handling might be needed for composite keys if using Upsert
    // But Supabase upsert works with composite primary keys if defined in DB
    await syncTable(
      "wordFolders",
      db.wordFolders,
      userId,
      "word_folders",
      true,
    );

    // 4. Agent Sessions
    await syncTable(
      "agentSessions",
      db.agentSessions,
      userId,
      "agent_sessions",
    );

    // 5. Agent Messages
    await syncTable(
      "agentMessages",
      db.agentMessages,
      userId,
      "agent_messages",
    );

    // 6. User Settings
    await syncTable("userSettings", db.userSettings, userId, "user_settings");

    // 7. Notes
    await syncTable("notes", db.notes, userId, "notes");

    console.log("Sync complete!");
    return true;
  } catch (error) {
    console.error("Sync failed:", error);
    return false;
  }
}

async function syncTable<T extends SyncItem, K extends IndexableType>(
  dexieTableName: string,
  dexieTable: Table<T, K>,
  userId: string,
  supabaseTableName: string,
  isComposite = false,
) {
  // A. PUSH: Get all local data and upsert to Supabase
  const localData = await dexieTable.toArray();
  if (localData.length > 0) {
    const recordsToPush = localData.map((item: T) => {
      // Map camelCase to snake_case if needed
      return transformToSupabase(item, userId, supabaseTableName);
    });

    const { error: pushError } = await supabase
      .from(supabaseTableName)
      .upsert(recordsToPush, {
        onConflict: isComposite ? "word_id, folder_id" : "id",
      });

    if (pushError)
      console.error(`Error pushing ${supabaseTableName}:`, {
        message: pushError.message,
        details: pushError.details,
        hint: pushError.hint,
        code: pushError.code,
      });
  }

  // B. PULL: Get all data from Supabase and put into Dexie
  const { data: remoteData, error: pullError } = await supabase
    .from(supabaseTableName)
    .select("*")
    .eq("user_id", userId);

  if (pullError) {
    console.error(`Error pulling ${supabaseTableName}:`, pullError);
    return;
  }

  if (remoteData && remoteData.length > 0) {
    const recordsToPull = remoteData.map((item) =>
      transformFromSupabase(item as Record<string, unknown>, dexieTableName),
    ) as T[];
    await dexieTable.bulkPut(recordsToPull);
  }
}

function transformToSupabase(
  item: SyncItem,
  userId: string,
  tableName: string,
) {
  // Map specific fields based on table
  if (tableName === "folders") {
    const folder = item as Folder;
    return {
      id: folder.id,
      user_id: userId,
      name: folder.name,
      parent_id: folder.parentId || null, // Camel to Snake
      updated_at: folder.updatedAt
        ? new Date(folder.updatedAt).toISOString()
        : new Date().toISOString(),
    };
  }
  if (tableName === "notes") {
    const note = item as Note;
    return {
      id: note.id,
      folder_id: note.folderId,
      user_id: userId,
      title: note.title,
      content: note.content,
      created_at: new Date(note.createdAt).toISOString(),
      updated_at: new Date(note.updatedAt).toISOString(),
    };
  }
  if (tableName === "word_folders") {
    const wf = item as WordFolder;
    return {
      word_id: wf.wordId,
      folder_id: wf.folderId,
      user_id: userId,
    };
  }
  if (tableName === "agent_sessions") {
    const session = item as AgentSession;
    return {
      id: session.id,
      user_id: userId,
      title: session.title,
      created_at: new Date(session.createdAt).toISOString(),
      updated_at: new Date(session.updatedAt).toISOString(),
    };
  }
  if (tableName === "agent_messages") {
    const msg = item as AgentMessage;
    return {
      id: msg.id,
      user_id: userId,
      session_id: msg.sessionId,
      role: msg.role,
      text: msg.text,
      created_at: new Date(msg.createdAt).toISOString(),
    };
  }
  if (tableName === "user_settings") {
    const setting = item as UserSetting;
    return {
      id: setting.id,
      user_id: userId,
      value: setting.value,
      updated_at: new Date(setting.updatedAt).toISOString(),
    };
  }
  // Default for Words (no special mapping needed if keys match, but created_at?)
  return { ...item, user_id: userId };
}

function transformFromSupabase(
  item: Record<string, unknown>,
  tableName: string,
) {
  // Map snake_case back to camelCase
  if (tableName === "folders") {
    return {
      id: item.id as string,
      name: item.name as string,
      parentId: (item.parent_id as string) || null,
      updatedAt: item.updated_at
        ? new Date(item.updated_at as string).getTime()
        : Date.now(),
    };
  }
  if (tableName === "notes") {
    return {
      id: item.id as string,
      folderId: item.folder_id as string,
      title: item.title as string,
      content: item.content as string,
      createdAt: new Date(item.created_at as string).getTime(),
      updatedAt: new Date(item.updated_at as string).getTime(),
    };
  }
  if (tableName === "wordFolders") {
    return {
      wordId: item.word_id as string,
      folderId: item.folder_id as string,
    };
  }
  if (tableName === "agentSessions") {
    return {
      id: item.id as string,
      title: item.title as string,
      createdAt: new Date(item.created_at as string).getTime(),
      updatedAt: new Date(item.updated_at as string).getTime(),
    };
  }
  if (tableName === "agentMessages") {
    return {
      id: item.id as string,
      sessionId: item.session_id as string,
      role: item.role as "user" | "agent" | "system",
      text: item.text as string,
      createdAt: new Date(item.created_at as string).getTime(),
    };
  }
  if (tableName === "userSettings") {
    return {
      id: item.id as string,
      value: item.value as string,
      updatedAt: new Date(item.updated_at as string).getTime(),
    };
  }
  // Default
  return item;
}

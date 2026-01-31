import { Table } from "dexie";
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

export async function syncData(userId: string) {
  console.log("Starting sync for user:", userId);

  try {
    // 1. Folders
    await syncTable<Folder>("folders", db.folders, userId, "folders");

    // 2. Words
    await syncTable<Word>("words", db.words, userId, "words");

    // 3. WordFolders (Composite Key)
    // Special handling might be needed for composite keys if using Upsert
    // But Supabase upsert works with composite primary keys if defined in DB
    await syncTable<WordFolder>(
      "wordFolders",
      db.wordFolders,
      userId,
      "word_folders",
      true,
    );

    // 4. Agent Sessions
    await syncTable<AgentSession>(
      "agentSessions",
      db.agentSessions,
      userId,
      "agent_sessions",
    );

    // 5. Agent Messages
    await syncTable<AgentMessage>(
      "agentMessages",
      db.agentMessages,
      userId,
      "agent_messages",
    );

    // 6. User Settings
    await syncTable<UserSetting>(
      "userSettings",
      db.userSettings,
      userId,
      "user_settings",
    );

    // 7. Notes
    await syncTable<Note>("notes", db.notes, userId, "notes");

    console.log("Sync complete!");
    return true;
  } catch (error) {
    console.error("Sync failed:", error);
    return false;
  }
}

async function syncTable<T extends { id?: string } | object>(
  dexieTableName: string,
  dexieTable: Table<T, any>,
  userId: string,
  supabaseTableName: string,
  isComposite = false,
) {
  // A. PUSH: Get all local data and upsert to Supabase
  const localData = await dexieTable.toArray();
  if (localData.length > 0) {
    const recordsToPush = localData.map((item: T) => {
      // Map camelCase to snake_case if needed, or just ensure DB columns match
      // Ideally, we keep them same or map them.
      // For this MVP, let's assume we map keys manually or use a transformer if needed.
      // But our Supabase schema uses snake_case for FKs (user_id, parent_id).
      // Let's do a quick transformation.
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
    const recordsToPull = remoteData.map((item: any) =>
      transformFromSupabase(item, dexieTableName),
    ) as T[];
    await dexieTable.bulkPut(recordsToPull);
  }
}

function transformToSupabase(item: any, userId: string, tableName: string) {
  const base = { ...item, user_id: userId };

  // Map specific fields based on table
  if (tableName === "folders") {
    return {
      id: item.id,
      user_id: userId,
      name: item.name,
      parent_id: item.parentId || null, // Camel to Snake
      updated_at: item.updatedAt
        ? new Date(item.updatedAt).toISOString()
        : new Date().toISOString(),
    };
  }
  if (tableName === "notes") {
    return {
      id: item.id,
      folder_id: item.folderId,
      user_id: userId,
      title: item.title,
      content: item.content,
      created_at: new Date(item.createdAt).toISOString(),
      updated_at: new Date(item.updatedAt).toISOString(),
    };
  }
  if (tableName === "word_folders") {
    return {
      word_id: item.wordId,
      folder_id: item.folderId,
      user_id: userId,
    };
  }
  if (tableName === "agent_sessions") {
    return {
      id: item.id,
      user_id: userId,
      title: item.title,
      created_at: new Date(item.createdAt).toISOString(),
      updated_at: new Date(item.updatedAt).toISOString(),
    };
  }
  if (tableName === "agent_messages") {
    return {
      id: item.id,
      user_id: userId,
      session_id: item.sessionId,
      role: item.role,
      text: item.text,
      created_at: new Date(item.createdAt).toISOString(),
    };
  }
  if (tableName === "user_settings") {
    return {
      id: item.id,
      user_id: userId,
      value: item.value,
      updated_at: new Date(item.updatedAt).toISOString(),
    };
  }
  // Default for Words (no special mapping needed if keys match, but created_at?)
  return base;
}

function transformFromSupabase(item: any, tableName: string) {
  // Map snake_case back to camelCase
  if (tableName === "folders") {
    return {
      id: item.id,
      name: item.name,
      parentId: item.parent_id,
      updatedAt: item.updated_at
        ? new Date(item.updated_at).getTime()
        : Date.now(),
    };
  }
  if (tableName === "notes") {
    return {
      id: item.id,
      folderId: item.folder_id,
      title: item.title,
      content: item.content,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: new Date(item.updated_at).getTime(),
    };
  }
  if (tableName === "wordFolders") {
    return {
      wordId: item.word_id,
      folderId: item.folder_id,
    };
  }
  if (tableName === "agentSessions") {
    return {
      id: item.id,
      title: item.title,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: new Date(item.updated_at).getTime(),
    };
  }
  if (tableName === "agentMessages") {
    return {
      id: item.id,
      sessionId: item.session_id,
      role: item.role,
      text: item.text,
      createdAt: new Date(item.created_at).getTime(),
    };
  }
  if (tableName === "userSettings") {
    return {
      id: item.id,
      value: item.value,
      updatedAt: new Date(item.updated_at).getTime(),
    };
  }
  // Default
  return item;
}

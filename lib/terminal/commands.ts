import { db } from "@/lib/db";
import { Folder } from "@/lib/types";
import { CommandHandler, CommandResult } from "./types";

// Helper to get folders by parentId, handling Dexie null key limitation
async function getFolders(parentId: string | null) {
  if (parentId === null) {
    return await db.folders
      .toCollection()
      .filter((f) => f.parentId === null)
      .toArray();
  }
  return await db.folders.where("parentId").equals(parentId).toArray();
}

// Helper to resolve path
// This is a simplified version. A real filesystem has absolute paths, relative paths, etc.
// Here we assume:
// - / or ~: root
// - ..: parent
// - foldername: child
// - No complex paths like a/b/c yet, just single level or root.
// Actually, let's try to support basic paths.

async function resolvePath(
  cwd: string,
  pathArg: string,
): Promise<{ id: string; name: string } | null> {
  if (pathArg === "/" || pathArg === "~") {
    return { id: "root", name: "Root" };
  }

  if (pathArg === "..") {
    if (cwd === "root") return { id: "root", name: "Root" };
    const current = await db.folders.get(cwd);
    if (!current || !current.parentId) return { id: "root", name: "Root" };
    const parent = await db.folders.get(current.parentId);
    return parent
      ? { id: parent.id, name: parent.name }
      : { id: "root", name: "Root" };
  }

  // Resolve absolute path (if starts with /)?
  // For now, assume relative to CWD.
  // We need to find a folder with name `pathArg` inside `cwd`.
  // If cwd is root, parentId is null.
  const parentId = cwd === "root" ? null : cwd;

  const folders = await getFolders(parentId);
  const folder = folders.find(
    (f) => f.name.toLowerCase() === pathArg.toLowerCase(),
  );

  if (folder) {
    return { id: folder.id, name: folder.name };
  }

  return null;
}

export const ls: CommandHandler = async (args, flags, context) => {
  const targetId = args[0]
    ? (await resolvePath(context.cwd, args[0]))?.id
    : context.cwd;

  if (!targetId) {
    return {
      output: `Directory not found: ${args[0]}`,
      type: "error",
    };
  }

  const parentIdForQuery = targetId === "root" ? null : targetId;
  const folders = await getFolders(parentIdForQuery);

  let items: { name: string; type: "folder" | "file"; meta?: string }[] =
    folders.map((f) => ({
      name: f.name,
      type: "folder",
      meta: f.emoji || "📂",
    }));

  // If not root, get words
  if (targetId !== "root") {
    const wordFolders = await db.wordFolders
      .where("folderId")
      .equals(targetId)
      .toArray();
    const wordIds = wordFolders.map((wf) => wf.wordId);
    const words = await db.words.where("id").anyOf(wordIds).toArray();
    // Get mastery?
    const wordStates = await db.wordStates
      .where("wordId")
      .anyOf(wordIds)
      .toArray();
    const stateMap = new Map(wordStates.map((s) => [s.wordId, s]));

    const wordFiles = words.map((w) => {
      const state = stateMap.get(w.id);
      const score = state
        ? Math.round((state.recognitionScore + state.recallScore) / 2)
        : 0;
      const stars = "★".repeat(score) + "☆".repeat(5 - score);
      return {
        name: w.term,
        type: "file" as const,
        meta: stars,
      };
    });

    items = [...items, ...wordFiles];
  }

  if (items.length === 0) {
    return { output: "(empty)", type: "info" };
  }

  // Sort: folders first, then alphabetical
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const output = items
    .map((f) => `${f.meta} ${f.name}${f.type === "folder" ? "/" : ""}`)
    .join("\n");

  return {
    output,
    type: "grid",
  };
};

export const cd: CommandHandler = async (args, _flags, context) => {
  const target = args[0] || "~";
  const resolved = await resolvePath(context.cwd, target);

  if (!resolved) {
    return {
      output: `cd: no such file or directory: ${target}`,
      type: "error",
    };
  }

  return {
    output: "",
    newCwd: resolved.id,
  };
};

export const pwd: CommandHandler = async (_args, _flags, context) => {
  // context.path should be passed in?
  // or we resolve it here.
  // For now, just return the constructed path from context if available,
  // or rebuild it.
  // Let's assume context.path has the names.
  return {
    output: "/" + context.path.join("/"),
    type: "info",
  };
};

export const mkdir: CommandHandler = async (args, flags, context) => {
  const name = args[0];
  if (!name) return { output: "usage: mkdir <name>", type: "error" };

  const emoji = (flags.emoji as string) || undefined;
  const color = (flags.color as string) || undefined;

  const parentId = context.cwd === "root" ? null : context.cwd;

  await db.folders.add({
    id: crypto.randomUUID(),
    name,
    parentId,
    emoji,
    color,
    updatedAt: Date.now(),
  });

  return {
    output: `Created folder "${name}"`,
    type: "success",
  };
};

export const touch: CommandHandler = async (args, flags, context) => {
  // Alias for add word?
  // "touch word" -> ensure word exists?
  // "add word" -> create word.
  // Let's make 'add' the command for words, 'touch' for empty?
  return { output: "Use 'add' to create words.", type: "info" };
};

export const add: CommandHandler = async (args, flags, context) => {
  const term = args[0];
  if (!term) return { output: "usage: add <term>", type: "error" };

  if (context.cwd === "root") {
    return {
      output: "Cannot add words to root. Please cd into a folder.",
      type: "error",
    };
  }

  const meaning = flags.meaning as string; // Optional

  // Check if word exists
  let word = await db.words.where("term").equals(term).first();
  let wordId = word?.id;

  if (!word) {
    wordId = crypto.randomUUID();
    await db.words.add({
      id: wordId,
      term,
      color: flags.color as string,
    });

    // Init state
    await db.wordStates.add({
      wordId,
      recognitionScore: 0,
      recallScore: 0,
      lastReviewedAt: 0,
      nextReviewAt: Date.now(),
      updatedAt: Date.now(),
      needsSync: true,
    });
  }

  // Link to folder
  const existingLink = await db.wordFolders
    .where("[wordId+folderId]")
    .equals([wordId!, context.cwd])
    .first();
  if (!existingLink) {
    await db.wordFolders.add({
      wordId: wordId!,
      folderId: context.cwd,
    });
  }

  // Add meaning if provided
  if (meaning) {
    await db.wordMeanings.add({
      id: crypto.randomUUID(),
      wordId: wordId!,
      folderId: context.cwd,
      content: meaning,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return {
    output: `Added "${term}" to current folder.`,
    type: "success",
  };
};

export const rm: CommandHandler = async (args, _flags, context) => {
  const targetName = args[0];
  if (!targetName) return { output: "usage: rm <name>", type: "error" };

  const parentId = context.cwd === "root" ? null : context.cwd;
  const folders = await getFolders(parentId);
  const folder = folders.find(
    (f) => f.name.toLowerCase() === targetName.toLowerCase(),
  );

  if (folder) {
    // Recursive delete? For now, just delete the folder entry.
    // Real implementation needs to delete children.
    // Let's block if not empty?
    const childFolders = await db.folders
      .where("parentId")
      .equals(folder.id as any)
      .count();
    const childWords = await db.wordFolders
      .where("folderId")
      .equals(folder.id)
      .count();

    if (childFolders > 0 || childWords > 0) {
      return {
        output: `Directory not empty: ${targetName}`,
        type: "error",
      };
    }
    await db.folders.delete(folder.id);
    return { output: `Deleted folder "${targetName}"`, type: "success" };
  }

  // Try word
  // We need to find the word ID from the name...
  const word = await db.words.where("term").equals(targetName).first();
  if (word) {
    // Check if it's in this folder
    const link = await db.wordFolders
      .where("[wordId+folderId]")
      .equals([word.id, context.cwd])
      .first();
    if (link) {
      // Remove link
      await db.wordFolders
        .where("[wordId+folderId]")
        .equals([word.id, context.cwd])
        .delete();
      return {
        output: `Removed "${targetName}" from folder.`,
        type: "success",
      };
    }
  }

  return {
    output: `rm: cannot remove '${targetName}': No such file or directory`,
    type: "error",
  };
};

// This registry maps command strings to their definitions.
// It acts as the "MANUAL" for the terminal.

import { CommandDefinition } from "./types";
import { ls, cd, pwd, mkdir, add, rm } from "./commands";

export const COMMAND_REGISTRY: Record<string, CommandDefinition> = {
  ls: {
    name: "ls",
    description: "List directory contents",
    usage: "ls [folder]",
    action: ls,
  },
  cd: {
    name: "cd",
    description: "Change current directory",
    usage: "cd <folder>",
    action: cd,
  },
  pwd: {
    name: "pwd",
    description: "Print working directory",
    usage: "pwd",
    action: pwd,
  },
  mkdir: {
    name: "mkdir",
    description: "Create a new folder",
    usage: "mkdir <name> [--emoji <char>] [--color <hex>] [--image <url>]",
    action: mkdir,
    flags: {
      "--emoji": "Set emoji icon for layer",
      "--color": "Set color label",
      "--image": "Set background image URL",
    },
  },
  add: {
    name: "add",
    description: "Add a word to the current folder",
    usage: "add <term> [--meaning <text>] [--color <hex>]",
    action: add,
    flags: {
      "--meaning": "Initial meaning for the word",
      "--color": "Set color label (hex)",
    },
  },
  rm: {
    name: "rm",
    description: "Remove a file or directory",
    usage: "rm <name>",
    action: rm,
  },
  help: {
    name: "help",
    description: "List available commands",
    usage: "help [command]",
    action: async (args) => {
      const cmdName = args[0];
      if (cmdName) {
        const cmd = COMMAND_REGISTRY[cmdName];
        if (cmd) {
          return {
            output: `${cmd.name} - ${cmd.description}\nUsage: ${cmd.usage}`,
            type: "info",
          };
        }
        return { output: `Unknown command: ${cmdName}`, type: "error" };
      }

      const list = Object.values(COMMAND_REGISTRY)
        .map((c) => `${c.name}\t${c.description}`)
        .join("\n");
      return { output: `Available commands:\n${list}`, type: "info" };
    },
  },
  clear: {
    name: "clear",
    description: "Clear terminal history",
    usage: "clear",
    action: async () => ({ output: "", type: "success" }), // Handled by UI mostly
  },
};

// Completion Helper
export async function getCompletions(
  input: string,
  cwd: string,
): Promise<string[]> {
  console.log("getCompletions called with:", { input, cwd });
  const parts = input.split(" ");
  const cmd = parts[0];

  // 1. Command Completion
  if (parts.length === 1) {
    const matches = Object.keys(COMMAND_REGISTRY)
      .filter((k) => k.startsWith(cmd) && k !== cmd)
      .sort();
    console.log("Command matches:", matches);
    return matches;
  }

  // 2. Argument Completion (for ls, cd, rm)
  if (["ls", "cd", "rm"].includes(cmd)) {
    const arg = parts.slice(1).join(" "); // simplistic, assumes last arg
    // We only support completing the last segment of a path for now
    // e.g. "cd fo" -> "folder"
    // "cd folder/su" -> "folder/subfolder" not yet supported well without full resolvePath logic reuse
    // Let's implement basic current-folder completion first.

    const { db } = await import("@/lib/db");
    const parentId = cwd === "root" ? null : cwd;

    // We can reuse the getFolders helper from commands.ts if we export it,
    // or just inline the query here for speed/simplicity since it's just one query.
    // Let's inline a safe query.

    let items: string[] = [];

    // Get folders
    let folders;
    if (parentId === null) {
      folders = await db.folders
        .toCollection()
        .filter((f) => !f.parentId)
        .toArray();
    } else {
      folders = await db.folders.where("parentId").equals(parentId).toArray();
    }
    items = folders.map((f) => f.name);

    // Get words (only for ls, rm? cd implies folders only?)
    // cd should only autocomplete folders.
    if (cmd !== "cd") {
      if (parentId !== null) {
        const wordFolders = await db.wordFolders
          .where("folderId")
          .equals(parentId)
          .toArray();
        const wordIds = wordFolders.map((wf) => wf.wordId);
        const words = await db.words.where("id").anyOf(wordIds).toArray();
        items = [...items, ...words.map((w) => w.term)];
      }
    }

    // Filter by current input arg
    // Case insensitive
    const prefix = arg.toLowerCase();
    const matches = items.filter((i) => i.toLowerCase().startsWith(prefix));
    console.log("File/Folder matches for prefix:", prefix, matches);

    return matches.sort();

    // verification: if exact match, don't show? or show to confirm?
    // usually completion showing nothing means "complete".

    // Return full string to replace? Or just the suffix?
    // The consumer expects the full string to REPLACE the input?
    // Or just the completion options?
    // Let's return the options, UI decides how to apply.
    // Wait, standard shell completion returns the *completed segments*.
    // If I type "cd fo", and "folder" exists. I want "cd folder".
    // So I should return ["folder"].

    return matches.sort();
  }

  return [];
}

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { parseCommand } from "@/lib/terminal/parser";
import { COMMAND_REGISTRY } from "@/lib/terminal/registry";
import { CommandResult } from "@/lib/terminal/types";
import { Folder } from "@/lib/types";

export interface TerminalEntry {
  id: string;
  type: "command" | "output";
  content: React.ReactNode | string;
  timestamp: number;
  // For output styling
  outputType?: "success" | "error" | "info" | "grid";
}

export function useTerminal() {
  const [cwd, setCwd] = useState<string>("root");
  const [path, setPath] = useState<string[]>(["~"]);
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Update path display when CWD changes
  useEffect(() => {
    const updatePath = async () => {
      if (cwd === "root") {
        setPath(["~"]);
        return;
      }

      // Build breadcrumb
      const segments: string[] = [];
      let currentId: string | null = cwd;

      while (currentId && currentId !== "root") {
        const folder: Folder | undefined = await db.folders.get(currentId);
        if (folder) {
          segments.unshift(folder.name);
          currentId = folder.parentId;
        } else {
          // Orphan or not found
          break;
        }
      }
      setPath(["~", ...segments]);
    };

    updatePath();
  }, [cwd]);

  const execute = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      const entryId = crypto.randomUUID();
      const timestamp = Date.now();

      // Add command to history
      setHistory((prev) => [
        ...prev,
        {
          id: entryId,
          type: "command",
          content: input,
          timestamp,
        },
      ]);

      setLoading(true);

      try {
        const { command, args, flags } = parseCommand(input);

        if (command === "clear") {
          setHistory([]);
          setLoading(false);
          return;
        }

        const cmdDef = COMMAND_REGISTRY[command];

        let result: CommandResult;

        if (!cmdDef) {
          result = {
            output: `Command not found: ${command}. Type 'help' for available commands.`,
            type: "error",
          };
        } else {
          result = await cmdDef.action(args, flags, { cwd, path });
        }

        // Handle state changes
        if (result.newCwd) {
          setCwd(result.newCwd);
        }

        // Add output to history
        if (result.output) {
          setHistory((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "output",
              content: result.output,
              timestamp: Date.now(),
              outputType: result.type,
            },
          ]);
        }
      } catch (err: any) {
        setHistory((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "output",
            content: `Error: ${err.message}`,
            timestamp: Date.now(),
            outputType: "error",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [cwd, path],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    cwd,
    path,
    history,
    execute,
    clearHistory,
    loading,
  };
}

export type CommandHandler = (
  args: string[],
  flags: Record<string, string | boolean>,
  context: CommandContext,
) => Promise<CommandResult>;

export interface CommandContext {
  cwd: string; // Current folder ID (or 'root')
  path: string[]; // Current path names for display (e.g. ["Home", "Physics"])
}

export interface CommandResult {
  output: React.ReactNode | string;
  type?: "success" | "error" | "info" | "grid";
  // Optional: New state to apply after command
  newCwd?: string;
  newPath?: string[];
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  action: CommandHandler;
  // Metadata for autocomplete/help
  flags?: Record<string, string>; // e.g. { "--emoji": "Set emoji icon" }
}

export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

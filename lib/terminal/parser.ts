import { ParsedCommand } from "./types";

/**
 * Parses a command string into command name, positional arguments, and flags.
 * Handles quoted strings (single and double) and key-value flags.
 *
 * Example:
 * mkdir "My Folder" --emoji "📁" --color red
 * -> {
 *   command: "mkdir",
 *   args: ["My Folder"],
 *   flags: { emoji: "📁", color: "red" }
 * }
 */
export function parseCommand(input: string): ParsedCommand {
  const tokens: string[] = [];
  let currentToken = "";
  let inQuote: "'" | '"' | null = null;
  let escape = false;

  // 1. Tokenize (respecting quotes)
  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escape) {
      currentToken += char;
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null; // End quote
        // We accumulate the quoted string.
        // Don't push yet, wait for space divisor or end of string?
        // Actually, usually quotes delimit a single token.
        // But what about: foo="bar baz"
        // Let's stick to simple shell rules: quotes are part of the token unless spaces separate them.
      } else {
        currentToken += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inQuote = char;
      } else if (char === " ") {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = "";
        }
      } else {
        currentToken += char;
      }
    }
  }
  // Push last token
  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  // 2. Parse into Structure
  const command = tokens.length > 0 ? tokens[0] : "";
  const rawArgs = tokens.slice(1);
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const token = rawArgs[i];

    if (token.startsWith("--")) {
      const flagName = token.slice(2);
      // Check if next token is a value (not another flag)
      // Limitation: Bool flags must be handled if we know the schema,
      // but generic parser assumes "if next is not flag, it's value"
      // or "switches are always bool unless value is strictly attached?"
      // Simple approach: look ahead.
      const nextToken = rawArgs[i + 1];

      if (nextToken && !nextToken.startsWith("-")) {
        flags[flagName] = nextToken;
        i++; // Skip next token
      } else {
        flags[flagName] = true;
      }
    } else if (token.startsWith("-")) {
      // Short flags - logic similar to long flags or combined boolean flags?
      // For now, treat -f as flag "f"
      const flagName = token.slice(1);
      const nextToken = rawArgs[i + 1];
      if (nextToken && !nextToken.startsWith("-")) {
        flags[flagName] = nextToken;
        i++;
      } else {
        flags[flagName] = true;
      }
    } else {
      args.push(token);
    }
  }

  return { command, args, flags };
}

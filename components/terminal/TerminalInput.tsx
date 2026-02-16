import { useState, useRef, useEffect } from "react";

interface TerminalInputProps {
  onExecute: (input: string) => void | Promise<void>;
  cwdPath: string[];
  cwdId: string;
  disabled?: boolean;
}

export default function TerminalInput({
  onExecute,
  cwdPath,
  cwdId,
  disabled,
}: TerminalInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount and click
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (input.trim()) {
        onExecute(input);
        setInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault(); // Prevent focus loss

      const { getCompletions } = await import("@/lib/terminal/registry");
      // Getting cwdPath from props is ["~", "folder"], but we need the ID or "root"?
      // Actually registry.ts needs the ID.
      // But TerminalInput only receives `cwdPath` strings for display!
      // The `onExecute` doesn't pass CWD ID.
      // We need to pass the actual CWD ID to TerminalInput to support completion.

      // WAIT. TerminalInput props: cwdPath is string[].
      // useTerminal hook has `cwd` (id) and `path` (names).
      // We need to pass `cwd` (id) to TerminalInput!

      // Let's check TerminalWidget usage of TerminalInput.
      // It passes `cwdPath={path}`.
      // We need to add `cwdId` prop.
    }
  };

  // Format path for prompt: ~/Physics/Quantum
  // Replace "root" with "~"
  const displayPath = cwdPath
    .map((p) => (p === "root" ? "~" : p))
    .join("/")
    .replace(/^\//, "");
  // Actually, cwdPath from hook is ["~", "Physics"]
  // So join("/") gives "~/Physics" which is perfect.

  return (
    <div className="flex items-center gap-2 px-4 py-2 font-mono text-sm border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 select-none whitespace-nowrap">
        <span className="text-green-500 font-bold">user@lexical</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-blue-500 font-bold">{cwdPath.join("/")}</span>
        <span className="text-muted-foreground">$</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground/50 w-full min-w-[50px]"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        autoFocus
      />
    </div>
  );
}

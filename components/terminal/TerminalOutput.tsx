import { TerminalEntry } from "@/hooks/useTerminal";

interface TerminalOutputProps {
  entries: TerminalEntry[];
}

export default function TerminalOutput({ entries }: TerminalOutputProps) {
  return (
    <div className="flex flex-col gap-2 p-4 font-mono text-sm">
      {entries.map((entry) => (
        <div key={entry.id} className="break-words whitespace-pre-wrap">
          {entry.type === "command" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-blue-500 font-bold">➜</span>
              <span>{entry.content}</span>
            </div>
          ) : (
            <div
              className={`pl-5 ${
                entry.outputType === "error"
                  ? "text-red-500"
                  : entry.outputType === "success"
                    ? "text-green-500"
                    : entry.outputType === "info"
                      ? "text-blue-400"
                      : "text-foreground"
              }`}
            >
              {entry.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

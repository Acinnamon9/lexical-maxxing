"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { importJson } from "@/lib/import";

export default function DebugPage() {
  const folders = useLiveQuery(() => db.folders.toArray());
  const words = useLiveQuery(() => db.words.toArray());
  const wordFolders = useLiveQuery(() => db.wordFolders.toArray());
  const productions = useLiveQuery(() => db.productions.toArray());
  const wordMeanings = useLiveQuery(() => db.wordMeanings.toArray());

  return (
    <div className="p-8 font-mono text-xs md:text-sm space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">IndexedDB Debugger</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-bold mb-2">
            Folders ({folders?.length})
          </h2>
          <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(folders, null, 2)}
          </pre>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Words ({words?.length})</h2>
          <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(words, null, 2)}
          </pre>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">
            Relationships ({wordFolders?.length})
          </h2>
          <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(wordFolders, null, 2)}
          </pre>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">
            Productions ({productions?.length})
          </h2>
          <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(productions, null, 2)}
          </pre>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">
            Word Meanings ({wordMeanings?.length})
          </h2>
          <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(wordMeanings, null, 2)}
          </pre>
        </section>
      </div>

      <div className="pt-8 border-t dark:border-zinc-800 flex gap-4">
        <button
          onClick={async () => {
            await db.delete();
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset Database
        </button>

        <button
          onClick={async () => {
            const sampleData = {
              words: [
                { term: "Heuristic", meanings: ["A mental shortcut"] },
                { term: "Stochastic", meanings: ["Randomly determined"] },
              ],
            };
            const res = await importJson("f_sys", JSON.stringify(sampleData));
            alert(res.message);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Import (to Systems)
        </button>
      </div>
    </div>
  );
}

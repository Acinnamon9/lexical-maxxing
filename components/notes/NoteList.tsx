import { Note } from "@/lib/types";
import { motion } from "framer-motion";

interface NoteListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
};

export default function NoteList({ notes, onEdit, onDelete }: NoteListProps) {
  if (notes.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
          <path d="M15 3v5h5" />
        </svg>
        Notes
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <motion.div
            key={note.id}
            variants={item}
            className="group relative bg-muted/40 border border-border p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden min-h-[120px] flex flex-col"
            onClick={() => onEdit(note)}
          >
            {/* Top Fold Effect */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-linear-to-bl from-black/5 to-transparent pointer-events-none" />

            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-foreground truncate pr-6">
                {note.title}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3 font-mono leading-relaxed opacity-80 flex-1">
              {note.content.replace(/[#*`_]/g, "")}
            </p>

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note);
                }}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-md transition-colors"
                title="Delete Note"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>

            <div className="mt-3 text-[10px] text-muted-foreground font-medium opacity-50 flex justify-between items-end">
              <span>Markdown</span>
              <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

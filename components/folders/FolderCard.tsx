"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import Link from "next/link";
import { Folder } from "@/lib/types";
import { db } from "@/lib/db";

interface FolderCardProps {
  folder: Folder;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onSaveEdit: (id: string) => void;
  onStartEdit: (folder: Folder) => void;
  onCancelEdit: () => void;
  onDelete: (folder: Folder) => void;
  variant?: "dashboard" | "subfolder";
}

export default function FolderCard({
  folder,
  isEditing,
  editName,
  onEditNameChange,
  onSaveEdit,
  onStartEdit,
  onCancelEdit,
  onDelete,
  variant = "dashboard",
}: FolderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: folder.id,
    data: { type: "folder", folder },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: folder.id,
    data: { type: "folder", folder },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const content = (
    <div
      ref={setRefs}
      style={style}
      className={`group relative ${isOver ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-background" : ""}`}
    >
      <Link
        href={`/folder/${folder.id}`}
        className={`block border border-border rounded-2xl hover:border-border transition-all bg-background shadow-sm overflow-hidden ${
          variant === "dashboard" ? "p-6" : "p-6"
        } ${isOver ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-muted/30"}`}
        style={{
          ...(folder.color ? { borderLeft: `8px solid ${folder.color}` } : {}),
          ...(folder.backgroundImage
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6)), url(${folder.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: "white",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }
            : {}),
        }}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
        />

        <div className="relative z-10 pointer-events-none">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 mr-4 pointer-events-auto">
              {variant === "subfolder" && (
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  {folder.emoji ? (
                    <span className="text-2xl">{folder.emoji}</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                    </svg>
                  )}
                </div>
              )}

              {isEditing ? (
                <input
                  autoFocus
                  className="text-xl font-bold tracking-tight bg-transparent border-b border-blue-500 focus:outline-none w-full pointer-events-auto"
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  onBlur={() => onSaveEdit(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(folder.id);
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h2
                  className={`text-xl font-bold tracking-tight flex items-center gap-2 ${variant === "subfolder" ? "" : ""}`}
                >
                  {variant === "dashboard" && folder.emoji && (
                    <span className="text-2xl">{folder.emoji}</span>
                  )}
                  {folder.name}
                </h2>
              )}
              <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-50 uppercase tracking-widest">
                ID: {folder.id}
              </p>
            </div>

            <div className="flex gap-1 relative z-20 shrink-0 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStartEdit(folder);
                }}
                className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-all"
                title="Rename Folder"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={variant === "dashboard" ? "18" : "16"}
                  height={variant === "dashboard" ? "18" : "16"}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(folder);
                }}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                title="Delete Folder"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={variant === "dashboard" ? "18" : "16"}
                  height={variant === "dashboard" ? "18" : "16"}
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
          </div>
        </div>
      </Link>
    </div>
  );

  return content;
}

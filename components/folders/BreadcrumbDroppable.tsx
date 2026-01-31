"use client";

import { useDroppable } from "@dnd-kit/core";
import Link from "next/link";

interface BreadcrumbDroppableProps {
  id: string | null; // null for root
  name: string;
  isLast: boolean;
}

export default function BreadcrumbDroppable({
  id,
  name,
  isLast,
}: BreadcrumbDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id || "root",
    data: { type: "breadcrumb", folderId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1.5 transition-all rounded px-1 ${
        isOver ? "bg-indigo-500/20 text-indigo-600 scale-105" : ""
      }`}
    >
      {!id ? (
        <Link
          href="/"
          className={`hover:text-foreground transition-colors ${isOver ? "font-bold" : ""}`}
        >
          {name}
        </Link>
      ) : isLast ? (
        <span
          className={`font-semibold text-foreground truncate max-w-[120px] ${isOver ? "underline" : ""}`}
        >
          {name}
        </span>
      ) : (
        <Link
          href={`/folder/${id}`}
          className={`hover:text-foreground transition-colors truncate max-w-[120px] ${isOver ? "font-bold text-indigo-500" : ""}`}
        >
          {name}
        </Link>
      )}
    </div>
  );
}

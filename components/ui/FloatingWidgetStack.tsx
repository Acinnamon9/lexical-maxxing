"use client";

import React from "react";

interface FloatingWidgetStackProps {
  children: React.ReactNode;
}

/**
 * FloatingWidgetStack is a container for floating UI elements like the AI Widget and Terminal.
 * It ensures they stack vertically from the bottom-right without overlapping.
 */
export default function FloatingWidgetStack({
  children,
}: FloatingWidgetStackProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-4 pointer-events-none">
      {/* 
        flex-col-reverse makes the first child in layout.tsx appear at the bottom.
        Each child must have pointer-events-auto for interactions.
      */}
      {children}
    </div>
  );
}

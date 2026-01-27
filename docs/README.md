# Lexical Maxxing Documentation Index

Welcome to the technical documentation for Lexical Maxxing. Because this app handles complex domain relationships and an offline-first data flow, this folder explains how everything works under the hood.

## Core Documentation

1.  **[Architecture](./architecture.md)**: The high-level design, tech stack, and philosophy.
2.  **[Database Schema](./database.md)**: Details on the IndexedDB structure and the Dexie.js pattern.
3.  **[AI Integration](./ai-features.md)**: How Gemini is used, pre-prompts, and request handling.

## Component Overview

- **`MeaningModal.tsx`**: The most complex component in the app. Handles contextual meanings, AI clarifications (via `DoubtSection`), conversation history, and mastery toggles.
- **`Settings/page.tsx`**: Manages global state stored in `localStorage` (Theme, API Keys, Default Models, Pre-prompts).
- **`ChunkPage`**: Implements the "Semantic Chunking" logic, splitting folders into 15-word units for better memorization.

## Key UI Utilities

- **`.no-scrollbar`**: A CSS utility used in modals to provide a clean look while maintaining scroll functionality.
- **`framer-motion`**: Used for all springs, staggers, and modal entrance/exit animations.
- **`Solarized Theme`**: A custom color palette implemented via CSS variables in `globals.css`.

---

*This documentation is updated as new features are added. Last updated: January 2026.*

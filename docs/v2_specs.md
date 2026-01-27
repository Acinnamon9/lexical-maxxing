# Vocabulary App – Consolidated Project Specification (v2)

---

## 1. Product Vision

A **personal, domain-driven vocabulary system** designed to turn words into **usable thinking tools**, not passive knowledge.

Core principle:

> A word is learned only when it can be **used correctly in thought and expression within a specific context**.

The app is:

* Opinionated
* Offline-first
* Depth-focused
* Builder-first (personal use → extensible later)

---

## 2. Core Problem

Most vocabulary tools:

* Optimize memorization
* Collapse multiple meanings into one
* Ignore expressive ability
* Track progress abstractly

This app solves:

* Contextual meaning loss
* Poor recall under cognitive load
* Shallow domain thinking
* Inability to express precise ideas

---

## 3. Target User

Primary:

* Self-directed learners
* Engineers, builders, thinkers
* People learning complex domains (psychology, systems, philosophy, AI, business)

Initial user:

* The builder themselves

---

## 4. Core Concepts

### 4.1 Word (Lexical Token)

* A word is a **symbol**, not a meaning
* Meanings emerge only in **context**

### 4.2 Folder (Semantic Context)

* Folders represent **thinking domains**
* Tree-based hierarchy
* **Learning context lives at the n-th (leaf) subfolder**

Example:

```
Computer Science
 └─ Systems
    └─ Databases
```

### 4.3 Word–Context Relationship

* A word can exist in multiple leaf folders
* Each `(word, folder)` pair represents a **distinct meaning**
* Production and examples are contextual, not global

---

## 5. Learning State Model

### 5.1 Global Learning Scores (Per Word)

Tracks retrieval strength independent of context.

```ts
recognitionScore: number // 0–5
recallScore: number      // 0–5
lastReviewedAt
nextReviewAt
updatedAt
needsSync
```

Rules:

* Scores only increase
* No penalties for failure
* Maximum +1 per session per score

---

### 5.2 Derived Status (Non-Editable)

| Status   | Rule                                                                 |
| -------- | -------------------------------------------------------------------- |
| NEW      | recallScore ≤ 1                                                      |
| FAMILIAR | recallScore ≥ 2                                                      |
| USABLE   | recallScore ≥ 3 **and** at least one production exists (any context) |

Status is **derived**, never user-controlled.

---

## 6. Production System (Core Differentiator)

### Philosophy

> Production is a **thinking workspace**, not a test.

* Optional
* Persistent
* Versioned
* Contextual

### Properties

* Production is **never explicitly prompted**
* UI affordances always exist to write/refine thoughts
* Writing improves spacing and mastery indirectly

---

### 6.1 Production Entries

Stored separately from learning scores.

```ts
id
wordId
folderId        // required (leaf context)
content
version
createdAt
updatedAt
```

Rules:

* Multiple productions per `(word, folder)`
* Refinement creates new versions
* No hard correctness checks
* First production unlocks long-term spacing benefits

---

## 7. Folder Model

* Strict tree structure
* Unlimited depth
* Only **leaf folders** can host production
* Non-leaf folders are organizational only

A word may belong to **multiple leaf folders** simultaneously.

---

## 8. Session Model

### Structure

* Default: **15 words per session**
* Configurable via settings
* Clear start and end
* Fully offline

### Composition Rules

Each session includes:

* New words
* Due reviews
* At most **2 cognitively heavy items** (e.g. recall failures or deep review)

Production:

* Never forced
* Always available
* Not counted toward session size

---

## 9. Learning Loop

### Level 1 — Recognition

* Meaning identification
* Correct usage detection

### Level 2 — Recall

* Definition → word
* Fill-in-the-blank
* Active retrieval

### Level 3 — Production (Ambient)

* Free-text usage
* Explanation or reframing
* Contextual, versioned
* Optional but mastery-relevant

---

## 10. Scheduling System

### Interval Tiers (Days)

| Tier | Interval |
| ---- | -------- |
| T0   | 0        |
| T1   | 1        |
| T2   | 3        |
| T3   | 7        |
| T4   | 14       |
| T5   | 30       |

### Tier Calculation

```ts
baseTier = floor((recognitionScore + recallScore) / 2)
if (productionCount > 0) baseTier += 1
tier = min(baseTier, 5)
```

```ts
nextReviewAt = now + interval[tier]
```

Failure:

* Blocks tier increase for that session
* Does not decrement scores

---

## 11. Offline-First Architecture

Principle:

> IndexedDB is the **source of truth**.

Flow:

```
IndexedDB → React State → UI
```

* App works fully offline
* UI never blocks on network
* Sync is asynchronous and optional

---

## 12. IndexedDB Schema

### Object Stores

* `folders`
* `words`
* `wordFolders`
* `wordStates`
* `wordProductions`

---

### Folder

```ts
id
name
parentId | null
```

---

### Word

```ts
id
term
```

*(No global meaning fields)*

---

### WordFolder (many-to-many)

```ts
wordId
folderId
```

---

### WordState (Global)

```ts
wordId
recognitionScore
recallScore
lastReviewedAt
nextReviewAt
updatedAt
needsSync
```

---

### WordProduction (Contextual)

```ts
id
wordId
folderId
content
version
createdAt
updatedAt
needsSync
```

---

## 13. Persistence Flow

1. App loads → hydrate from IndexedDB
2. Session runs fully in memory
3. WordStates and Productions updated locally
4. Batch save at session end

IndexedDB is persistence, not live state.

---

## 14. Sync Model (Later)

### Scope

* Sync `wordStates`
* Sync `wordProductions`
* Words and folders are static/canonical

### Strategy

* Timestamp-based last-write-wins
* Eventual consistency
* No real-time sync

Required field:

```ts
updatedAt: number
```

---

## 15. Backend (Later – Supabase)

### Tables

* `word_states`
* `word_productions`

Composite keys:

```
(user_id, word_id)
(user_id, word_id, folder_id, version)
```

---

## 16. Folder → Session Resolution

When a folder is selected:

1. Collect all descendant leaf folders
2. Resolve all `(wordId, folderId)` pairs
3. Deduplicate by `wordId`
4. Apply scheduling logic
5. Select session words

Learning scores remain **global**.

---

## 17. Android Strategy (Later)

Options:

1. PWA + TWA
2. Native rebuild with shared data model

Architecture is platform-agnostic.

---

## 18. Build Order (Strict)

1. Hardcode folders + 5 words
2. Build session loop end-to-end
3. Add IndexedDB
4. Expand to 50 words
5. Use daily for 1–2 weeks
6. Add auth
7. Add sync

---

## 19. Success Metric

> I can express ideas in this domain **faster, clearer, and with less cognitive strain**.

Not streaks.
Not XP.
Not word count.

---

## 20. Product Philosophy

* Expression > memorization
* Context > abstraction
* Depth > scale
* Opinionated > generic
* Finish > perfection

If you can’t *use* a word **in context**, you don’t own it.

---

## 21. Contextual Word & Meaning Import System (JSON-Based)

---

### 21.1 Purpose

Enable users to **ingest words along with their meanings directly into a specific semantic context**, without violating the core principle:

> Meanings are contextual.
> There are no global definitions.

This system supports:

* Rapid domain expansion
* Frontend-only ingestion
* Builder-controlled vocabulary growth
* Offline-first operation

Importing a word with meanings **does not imply learning, familiarity, or usability**.

---

### 21.2 Import Entry Points (UI)

Each **folder node** in the folder tree exposes a **“+” action** with two options:

1. **Add Subfolder**
2. **Import Words (JSON)**

Rules:

* JSON imports are always scoped to the **selected folder**
* If the selected folder is non-leaf:

  * Imported words are attached to that folder *only if it is treated as a leaf*
  * Otherwise, the user must import into / create a leaf subfolder

This enforces **explicit contextual placement**.

---

### 21.3 Import Philosophy (Critical)

* Meanings are **context-bound**
* Meanings are **initial scaffolding**, not mastery
* Imported meanings:

  * Aid recognition
  * Do not grant recall or usability
  * Do not affect scores directly

> Imported meanings are “borrowed understanding” until production occurs.

---

### 21.4 JSON File Format

The app accepts a JSON file with the following structure:

```json
{
  "words": [
    {
      "term": "idempotent",
      "meanings": [
        "An operation that can be applied multiple times without changing the result beyond the initial application"
      ]
    },
    {
      "term": "affect",
      "meanings": [
        "To influence something",
        "An observable expression of emotion"
      ]
    }
  ]
}
```

#### Rules

* `term` is required
* `meanings` is optional but recommended
* Meanings are treated as **contextual reference text**
* Meanings belong to the **(word, folder)** relationship, not the word globally
* No examples or production are auto-generated

---

### 21.5 Data Model Impact (Minimal, Explicit)

Meanings are stored **per context**, alongside production but conceptually distinct.

Add a new store or field:

#### Option A (Preferred – explicit):

```ts
WordMeaning {
  id
  wordId
  folderId
  content
  createdAt
  updatedAt
}
```

#### Option B (Acceptable – merged):

* Meanings stored as `version = 0` production entries
* Marked internally as `type: "meaning"`

**Rule:**
Meanings must never be confused with user production.

---

### 21.6 Import Resolution Logic

For each imported word (scoped to the selected folder):

1. Normalize the term
2. Resolve or create the `Word`
3. Associate `(wordId, folderId)` via `WordFolder`
4. For each meaning:

   * Create a contextual meaning entry
   * Do **not** mark as production
5. Initialize `WordState` **only if missing**

Default state for new words:

```ts
recognitionScore = 0
recallScore = 0
lastReviewedAt = null
nextReviewAt = now
```

---

### 21.7 Constraints & Safeguards

Import **never**:

* Sets recognitionScore or recallScore
* Creates production credit
* Advances scheduling tiers
* Marks a word as familiar or usable

Import **always**:

* Preserves existing learning state
* Preserves existing production
* Ignores duplicate meanings gracefully

---

### 21.8 Offline & Persistence Guarantees

* Import works fully offline
* All changes go to IndexedDB first
* Batch persistence
* Sync (later) applies only to:

  * WordStates
  * WordProductions
  * (Optional) WordMeanings

---

### 21.9 Failure Modes

* Invalid JSON → reject with explanation
* Empty meanings → allowed
* Duplicate words → merged by term
* Duplicate meanings → ignored or deduped
* Partial failure → best-effort import

---

### 21.10 Design Rationale

This design preserves:

* Context-first semantics
* Builder control
* No shortcut to mastery
* Clear separation between:

  * **Reference meaning**
  * **Active production**
  * **Learning state**

Imported meanings answer:

> “What does this word usually mean *here*?”

Production answers:

> “Can *I* actually use it?”

---

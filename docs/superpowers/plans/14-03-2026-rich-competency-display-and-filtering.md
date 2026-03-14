# Rich Competency Display & Tag-Based Filtering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up CBME 2024 data quality, display all competency metadata as rich color-coded badges with expandable details, and add multi-criteria filtering by domain, level, teaching methods, and assessment methods.

**Architecture:** Three sequential workstreams — data cleanup scripts (TypeScript + AI), shared display components consumed by all views, and a filter panel with API extensions. Data cleanup must complete first; display and filtering share components and can partially parallel after that.

**Tech Stack:** TypeScript, Next.js 15 App Router, Tailwind CSS, shadcn/ui (Badge, Checkbox, Popover, ScrollArea), better-sqlite3, Anthropic SDK (dev only for Haiku text cleanup)

**Spec:** `docs/superpowers/specs/14-03-2026-rich-competency-display-and-filtering-design.md`

---

## Chunk 1: Data Cleanup

### Task 1: Regex-Based Text and Level Normalization Script

**Files:**
- Create: `scripts/cleanup-text.ts`

This script fixes stuck-together words in competency_text and normalizes competency_level values in the 2024 database.

- [ ] **Step 1: Create the cleanup script**

```typescript
// scripts/cleanup-text.ts
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "src/data/competencies-2024.db");
const db = new Database(dbPath);

// ── Phase 1: Fix stuck-together words ──

// Common patterns where PDF extraction lost spaces
// Only match lowercase letter before the word to avoid false positives
const STUCK_WORD_PATTERNS: [RegExp, string][] = [
  // Preposition + article patterns (most common)
  [/([a-z])ofthe([a-z])/g, "$1 of the $2"],
  [/([a-z])andthe([a-z])/g, "$1 and the $2"],
  [/([a-z])inthe([a-z])/g, "$1 in the $2"],
  [/([a-z])isthe([a-z])/g, "$1 is the $2"],
  [/([a-z])tothe([a-z])/g, "$1 to the $2"],
  [/([a-z])forthe([a-z])/g, "$1 for the $2"],
  [/([a-z])onthe([a-z])/g, "$1 on the $2"],
  [/([a-z])atthe([a-z])/g, "$1 at the $2"],
  [/([a-z])bythe([a-z])/g, "$1 by the $2"],
  [/([a-z])withthe([a-z])/g, "$1 with the $2"],
  [/([a-z])fromthe([a-z])/g, "$1 from the $2"],
  // Preposition + other common words
  [/([a-z])ofan([a-z])/g, "$1 of an $2"],
  [/([a-z])ofa([A-Z])/g, "$1 of a $2"],
  [/\basa([a-z])/g, "as a $1"],  // Word boundary guard to avoid matching inside words like "nasalization"
  [/([a-z])inan([a-z])/g, "$1 in an $2"],
  [/([a-z])ina([A-Z])/g, "$1 in a $2"],
  // Lowercase-to-uppercase boundary (missing space at word boundary)
  // e.g., "evaluationofpatients" won't match, but "principlesof" will be caught above
  [/([a-z]{3,})([A-Z][a-z])/g, "$1 $2"],
];

// Get all competency texts
const rows = db
  .prepare("SELECT id, competency_text FROM competencies")
  .all() as { id: number; competency_text: string }[];

const textChanges: { id: number; oldText: string; newText: string }[] = [];

for (const row of rows) {
  let text = row.competency_text;
  for (const [pattern, replacement] of STUCK_WORD_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  // Normalize multiple spaces
  text = text.replace(/\s{2,}/g, " ").trim();

  if (text !== row.competency_text) {
    textChanges.push({ id: row.id, oldText: row.competency_text, newText: text });
  }
}

console.log(`\n=== TEXT FIXES (${textChanges.length} rows) ===\n`);
for (const change of textChanges) {
  console.log(`  ID ${change.id}:`);
  console.log(`    OLD: ${change.oldText.slice(0, 100)}`);
  console.log(`    NEW: ${change.newText.slice(0, 100)}`);
}

// ── Phase 2: Normalize competency_level values ──

const LEVEL_CANONICAL = ["K", "KH", "SH", "P"];

function normalizeLevel(raw: string): string {
  // Remove backticks, trim
  let level = raw.replace(/`/g, "").trim();
  // Replace separators with /
  level = level.replace(/[,\s]+/g, "/");
  // Collapse multiple /
  level = level.replace(/\/+/g, "/");
  // Remove trailing/leading /
  level = level.replace(/^\/|\/$/g, "");
  // Remove "C" suffix (e.g., "K C" → "K", "KH, C" → "KH")
  // "C" appears to be a certification marker, not a level
  const parts = level.split("/").map((p) => p.trim()).filter((p) => LEVEL_CANONICAL.includes(p));
  // Deduplicate and sort in canonical order
  const unique = [...new Set(parts)];
  unique.sort((a, b) => LEVEL_CANONICAL.indexOf(a) - LEVEL_CANONICAL.indexOf(b));
  return unique.join("/") || raw.trim(); // Fallback to original if nothing matched
}

const levelRows = db
  .prepare("SELECT DISTINCT competency_level FROM competencies ORDER BY competency_level")
  .all() as { competency_level: string }[];

const levelChanges: { oldLevel: string; newLevel: string; count: number }[] = [];

for (const row of levelRows) {
  const normalized = normalizeLevel(row.competency_level);
  if (normalized !== row.competency_level) {
    const countResult = db
      .prepare("SELECT COUNT(*) as count FROM competencies WHERE competency_level = ?")
      .get(row.competency_level) as { count: number };
    levelChanges.push({
      oldLevel: row.competency_level,
      newLevel: normalized,
      count: countResult.count,
    });
  }
}

console.log(`\n=== LEVEL NORMALIZATION (${levelChanges.length} distinct values) ===\n`);
for (const change of levelChanges) {
  console.log(`  "${change.oldLevel}" → "${change.newLevel}" (${change.count} rows)`);
}

// ── Apply changes ──

const args = process.argv.slice(2);
if (args.includes("--apply")) {
  console.log("\n=== APPLYING CHANGES ===\n");

  const updateText = db.prepare("UPDATE competencies SET competency_text = ? WHERE id = ?");
  const updateLevel = db.prepare(
    "UPDATE competencies SET competency_level = ? WHERE competency_level = ?"
  );

  db.transaction(() => {
    for (const change of textChanges) {
      updateText.run(change.newText, change.id);
    }
    for (const change of levelChanges) {
      updateLevel.run(change.newLevel, change.oldLevel);
    }
  })();

  console.log(`  Applied ${textChanges.length} text fixes`);
  console.log(`  Applied ${levelChanges.length} level normalizations`);

  // Verify
  const distinctLevels = db
    .prepare("SELECT DISTINCT competency_level FROM competencies ORDER BY competency_level")
    .all() as { competency_level: string }[];
  console.log(`\n  Distinct levels after normalization: ${distinctLevels.map((r) => r.competency_level).join(", ")}`);
} else {
  console.log("\n  Run with --apply to apply changes");
}

db.close();
```

- [ ] **Step 2: Run in preview mode to verify changes**

Run: `npx tsx scripts/cleanup-text.ts`
Expected: Lists text fixes and level normalizations without applying them. Review the output for false positives (especially check the `asa` pattern doesn't split words like "nasalization").

- [ ] **Step 2.5: Backup the database before applying**

Run: `cp src/data/competencies-2024.db src/data/competencies-2024.db.bak`

- [ ] **Step 3: Apply the changes**

Run: `npx tsx scripts/cleanup-text.ts --apply`
Expected: "Applied N text fixes" and "Applied N level normalizations". Distinct levels should be: K, KH, KH/SH, K/KH, K/KH/SH, KH/P, P, SH, SH/P (or subset).

- [ ] **Step 4: Commit**

```bash
git add scripts/cleanup-text.ts src/data/competencies-2024.db
git commit -m "Add text cleanup script and apply regex fixes to 2024 DB"
```

(The `.bak` file is intentionally not committed — it's a local safety net.)

---

### Task 2: Teaching/Assessment Method Normalization Script

**Files:**
- Create: `scripts/normalize-methods.ts`

This script normalizes the messy comma/slash-separated teaching and assessment method values into canonical forms.

- [ ] **Step 1: Create the normalization script**

```typescript
// scripts/normalize-methods.ts
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "src/data/competencies-2024.db");
const db = new Database(dbPath);

// ── Canonical method mappings ──

// Map variant strings to canonical form (case-insensitive matching)
const TEACHING_METHOD_MAP: Record<string, string> = {
  "lgt": "LGT",
  "lecture": "LGT",
  "large group teaching": "LGT",
  "large group discussion": "LGT",
  "sgt": "SGT",
  "small group teaching": "SGT",
  "small group discussion": "SGT",
  "small group": "SGT",
  "doap": "DOAP",
  "doap session": "DOAP",
  "bedside clinic": "Bedside clinic",
  "bed side clinic": "Bedside clinic",
  "bed-side clinic": "Bedside clinic",
  "bedside": "Bedside clinic",
  "bsc": "Bedside clinic",
  "skill lab": "Skill lab",
  "skills lab": "Skill lab",
  "skill station": "Skill lab",
  "skills station": "Skill lab",
  "tutorial": "Tutorial",
  "tutorials": "Tutorial",
  "seminar": "Seminar",
  "seminars": "Seminar",
  "role play": "Role play",
  "roleplay": "Role play",
  "demonstration": "Demonstration",
  "sdl": "SDL",
  "self directed learning": "SDL",
  "self-directed learning": "SDL",
  "animations": "Animations/Videos",
  "videos": "Animations/Videos",
  "animations, videos": "Animations/Videos",
  "field visit": "Field visit",
  "field visits": "Field visit",
  "panel discussion": "Panel discussion",
};

const ASSESSMENT_METHOD_MAP: Record<string, string> = {
  "written": "Written",
  "viva voce": "Viva voce",
  "viva voice": "Viva voce",
  "vivavoce": "Viva voce",
  "viva": "Viva voce",
  "skill assessment": "Skill assessment",
  "skill assessment-": "Skill assessment",
  "skil l assessment": "Skill assessment",
  "skills assessment": "Skill assessment",
  "osce": "OSCE",
  "logbook": "Logbook",
  "log book": "Logbook",
  "long case": "Long case",
  "short case": "Short case",
  "application based question": "Application based question",
  "application based questions": "Application based question",
  "application": "Application based question",
  "documentation": "Documentation",
  "documentation in journal": "Documentation",
  "journal": "Documentation",
};

function splitMethods(raw: string): string[] {
  // Split on comma, slash, or newline — but not slash inside known terms
  // First replace known multi-word terms to protect them
  let protected_ = raw;
  const protectedTerms = [
    "Viva voce", "viva voce", "Viva voice", "viva voice",
    "Skill assessment", "skill assessment",
    "Long case", "long case", "Short case", "short case",
    "Application based question", "application based question",
    "Application based questions", "application based questions",
    "Bed side clinic", "bed side clinic", "Bedside clinic", "bedside clinic",
    "Bed-side clinic", "bed-side clinic",
    "Skill lab", "skill lab", "Skills lab", "skills lab",
    "Skill station", "skill station", "Skills station", "skills station",
    "Role play", "role play",
    "Field visit", "field visit", "Field visits", "field visits",
    "Panel discussion", "panel discussion",
    "Small group discussion", "small group discussion",
    "Large group discussion", "large group discussion",
    "Self directed learning", "self directed learning",
    "Self-directed learning", "self-directed learning",
  ];
  const placeholders: Map<string, string> = new Map();
  for (let i = 0; i < protectedTerms.length; i++) {
    const term = protectedTerms[i];
    const placeholder = `__PROTECTED_${i}__`;
    if (protected_.toLowerCase().includes(term.toLowerCase())) {
      // Find exact case match
      const idx = protected_.toLowerCase().indexOf(term.toLowerCase());
      const actual = protected_.slice(idx, idx + term.length);
      protected_ = protected_.replace(actual, placeholder);
      placeholders.set(placeholder, actual);
    }
  }

  // Split on comma, slash, newline
  const parts = protected_.split(/[,\/\n]+/);

  // Restore protected terms and clean up
  return parts
    .map((p) => {
      let result = p.trim();
      for (const [placeholder, original] of placeholders) {
        result = result.replace(placeholder, original);
      }
      return result;
    })
    .filter((p) => p.length > 0);
}

function normalizeMethodList(
  raw: string,
  methodMap: Record<string, string>
): string {
  const parts = splitMethods(raw);
  const normalized: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (methodMap[key]) {
      normalized.push(methodMap[key]);
    } else {
      // Try partial matching — only match if the input starts with a known key
      // (do NOT match if key is a prefix of mapKey, to avoid "skill" → "Skill assessment")
      let matched = false;
      for (const [mapKey, mapValue] of Object.entries(methodMap)) {
        if (key.startsWith(mapKey)) {
          normalized.push(mapValue);
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Keep original but capitalize first letter, and log for review
        console.warn(`  ⚠ Unmatched method fragment: "${trimmed}"`);
        normalized.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      }
    }
  }

  // Deduplicate while preserving order
  const unique = [...new Set(normalized)];
  return unique.join(", ");
}

// ── Process teaching methods ──

const teachingRows = db
  .prepare(
    "SELECT DISTINCT teaching_methods FROM competencies WHERE teaching_methods IS NOT NULL ORDER BY teaching_methods"
  )
  .all() as { teaching_methods: string }[];

console.log(`\n=== TEACHING METHOD NORMALIZATION (${teachingRows.length} distinct values) ===\n`);

const teachingChanges: { old: string; new_: string; count: number }[] = [];
for (const row of teachingRows) {
  const normalized = normalizeMethodList(row.teaching_methods, TEACHING_METHOD_MAP);
  if (normalized !== row.teaching_methods) {
    const countResult = db
      .prepare("SELECT COUNT(*) as count FROM competencies WHERE teaching_methods = ?")
      .get(row.teaching_methods) as { count: number };
    teachingChanges.push({ old: row.teaching_methods, new_: normalized, count: countResult.count });
    console.log(`  "${row.teaching_methods}" → "${normalized}" (${countResult.count} rows)`);
  }
}

// ── Process assessment methods ──

const assessmentRows = db
  .prepare(
    "SELECT DISTINCT assessment_methods FROM competencies WHERE assessment_methods IS NOT NULL ORDER BY assessment_methods"
  )
  .all() as { assessment_methods: string }[];

console.log(`\n=== ASSESSMENT METHOD NORMALIZATION (${assessmentRows.length} distinct values) ===\n`);

const assessmentChanges: { old: string; new_: string; count: number }[] = [];
for (const row of assessmentRows) {
  const normalized = normalizeMethodList(row.assessment_methods, ASSESSMENT_METHOD_MAP);
  if (normalized !== row.assessment_methods) {
    const countResult = db
      .prepare("SELECT COUNT(*) as count FROM competencies WHERE assessment_methods = ?")
      .get(row.assessment_methods) as { count: number };
    assessmentChanges.push({ old: row.assessment_methods, new_: normalized, count: countResult.count });
    console.log(`  "${row.assessment_methods}" → "${normalized}" (${countResult.count} rows)`);
  }
}

// ── Apply ──

const args = process.argv.slice(2);
if (args.includes("--apply")) {
  console.log("\n=== APPLYING CHANGES ===\n");

  const updateTeaching = db.prepare(
    "UPDATE competencies SET teaching_methods = ? WHERE teaching_methods = ?"
  );
  const updateAssessment = db.prepare(
    "UPDATE competencies SET assessment_methods = ? WHERE assessment_methods = ?"
  );

  db.transaction(() => {
    for (const change of teachingChanges) {
      updateTeaching.run(change.new_, change.old);
    }
    for (const change of assessmentChanges) {
      updateAssessment.run(change.new_, change.old);
    }
  })();

  console.log(`  Applied ${teachingChanges.length} teaching method normalizations`);
  console.log(`  Applied ${assessmentChanges.length} assessment method normalizations`);

  // Show final distinct values
  const finalTeaching = db
    .prepare("SELECT DISTINCT teaching_methods FROM competencies WHERE teaching_methods IS NOT NULL ORDER BY teaching_methods")
    .all() as { teaching_methods: string }[];
  console.log(`\n  Distinct teaching methods after: ${finalTeaching.length}`);
  for (const r of finalTeaching) console.log(`    - ${r.teaching_methods}`);

  const finalAssessment = db
    .prepare("SELECT DISTINCT assessment_methods FROM competencies WHERE assessment_methods IS NOT NULL ORDER BY assessment_methods")
    .all() as { assessment_methods: string }[];
  console.log(`\n  Distinct assessment methods after: ${finalAssessment.length}`);
  for (const r of finalAssessment) console.log(`    - ${r.assessment_methods}`);
} else {
  console.log(`\n  Teaching: ${teachingChanges.length} values to normalize`);
  console.log(`  Assessment: ${assessmentChanges.length} values to normalize`);
  console.log("  Run with --apply to apply changes");
}

db.close();
```

- [ ] **Step 2: Run in preview mode**

Run: `npx tsx scripts/normalize-methods.ts`
Expected: Lists all teaching and assessment method normalizations. Review for correctness — especially check that no meaning is lost and that the canonical mappings cover all variants.

- [ ] **Step 3: Apply the changes**

Run: `npx tsx scripts/normalize-methods.ts --apply`
Expected: "Applied N teaching method normalizations" and "Applied N assessment method normalizations". Final distinct value counts should be significantly reduced (from ~30+ each to ~10-15 each).

- [ ] **Step 4: Commit**

```bash
git add scripts/normalize-methods.ts src/data/competencies-2024.db
git commit -m "Add method normalization script and apply to 2024 DB"
```

---

### Task 3: AI Text Cleanup for Remaining Issues

**Files:**
- Create: `scripts/fix-text-ai.ts`

Uses Claude Haiku to fix any remaining spacing issues not caught by regex.

- [ ] **Step 1: Install the Anthropic SDK as a dev dependency**

Run: `npm install --save-dev @anthropic-ai/sdk`

- [ ] **Step 2: Create the AI cleanup script**

```typescript
// scripts/fix-text-ai.ts
import Anthropic from "@anthropic-ai/sdk";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "src/data/competencies-2024.db");
const db = new Database(dbPath);

const client = new Anthropic();

// Find texts that still look like they have stuck-together words
// Heuristic: long lowercase runs without spaces (>15 chars of lowercase letters)
const SUSPICIOUS_PATTERN = /[a-z]{15,}/;

const rows = db
  .prepare("SELECT id, competency_code, competency_text FROM competencies")
  .all() as { id: number; competency_code: string; competency_text: string }[];

const suspicious = rows.filter((r) => SUSPICIOUS_PATTERN.test(r.competency_text));

console.log(`Found ${suspicious.length} texts with potential spacing issues\n`);

if (suspicious.length === 0) {
  console.log("No texts need AI cleanup!");
  process.exit(0);
}

// Process in batches of 10
const BATCH_SIZE = 10;
const changes: { id: number; code: string; oldText: string; newText: string }[] = [];

async function processBatch(batch: typeof suspicious) {
  const textsFormatted = batch
    .map((r, i) => `[${i}] ${r.competency_text}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Fix spacing and word boundary issues in these medical competency texts. Only fix spacing — do not change meaning, terminology, abbreviations, or structure. Return ONLY the corrected texts in the exact same format [N] text, one per line. If a text has no issues, return it unchanged.\n\n${textsFormatted}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return;

  const lines = content.text.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (!match) continue;
    const idx = parseInt(match[1]);
    const fixedText = match[2].trim();
    if (idx < batch.length && fixedText !== batch[idx].competency_text) {
      changes.push({
        id: batch[idx].id,
        code: batch[idx].competency_code,
        oldText: batch[idx].competency_text,
        newText: fixedText,
      });
    }
  }
}

async function main() {
  for (let i = 0; i < suspicious.length; i += BATCH_SIZE) {
    const batch = suspicious.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(suspicious.length / BATCH_SIZE)}...`);
    await processBatch(batch);
  }

  console.log(`\n=== AI TEXT FIXES (${changes.length} changes) ===\n`);
  for (const change of changes) {
    console.log(`  ${change.code} (ID ${change.id}):`);
    console.log(`    OLD: ${change.oldText.slice(0, 120)}`);
    console.log(`    NEW: ${change.newText.slice(0, 120)}`);
    console.log();
  }

  const args = process.argv.slice(2);
  if (args.includes("--apply")) {
    const updateStmt = db.prepare("UPDATE competencies SET competency_text = ? WHERE id = ?");
    db.transaction(() => {
      for (const change of changes) {
        updateStmt.run(change.newText, change.id);
      }
    })();
    console.log(`Applied ${changes.length} AI text fixes`);
  } else {
    console.log("Run with --apply to apply changes");
  }

  db.close();
}

main().catch(console.error);
```

- [ ] **Step 3: Run in preview mode, review the output**

Run: `ANTHROPIC_API_KEY=<your-key> npx tsx scripts/fix-text-ai.ts`
Expected: Shows proposed text fixes. Review each one carefully — AI should only fix spacing, not change meaning.

- [ ] **Step 4: Apply the fixes**

Run: `ANTHROPIC_API_KEY=<your-key> npx tsx scripts/fix-text-ai.ts --apply`
Expected: "Applied N AI text fixes"

- [ ] **Step 5: Rebuild FTS5 index to reflect cleaned text**

Run: `DB_VERSION=2024 npx tsx scripts/init-db.ts`
This runs `initializeDatabase()` which includes `rebuildFTS5Index()`. Since tables already exist, the migration is idempotent — it only rebuilds the FTS index.
Expected: Output includes "FTS5 index rebuilt with 2623 entries"

- [ ] **Step 6: Commit**

```bash
git add scripts/fix-text-ai.ts src/data/competencies-2024.db
git commit -m "Add AI text cleanup script and apply fixes to 2024 DB"
```

---

## Chunk 2: Shared Display Components & Type Changes

### Task 4: Extend CompetencyFilters Type

**Files:**
- Modify: `src/types/index.ts:92-99`

- [ ] **Step 1: Add new filter fields to CompetencyFilters**

In `src/types/index.ts`, replace the existing `CompetencyFilters` interface:

```typescript
// Old (lines 92-99):
export interface CompetencyFilters {
  subject?: string | string[];
  topic?: string;
  domain?: string | string[];
  coreOnly?: boolean;
  searchQuery?: string;
}

// New:
export interface CompetencyFilters {
  subject?: string | string[];
  topic?: string;
  domain?: string | string[];
  level?: string[];
  coreOnly?: boolean;
  searchQuery?: string;
  teachingMethod?: string[];
  assessmentMethod?: string[];
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -5` (or just `npx tsc --noEmit`)
Expected: No type errors (new fields are all optional)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "Extend CompetencyFilters with level, teachingMethod, assessmentMethod"
```

---

### Task 5: Create CompetencyBadges Shared Component

**Files:**
- Create: `src/components/competency/CompetencyBadges.tsx`

Reusable component that renders domain, level, and core badges for a competency. Used by CompetencyList, SearchResults, TreeNode, and CompetencyTooltip.

- [ ] **Step 0: Create the directory**

Run: `mkdir -p src/components/competency`

- [ ] **Step 1: Create the component**

```typescript
// src/components/competency/CompetencyBadges.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Domain color mapping
const DOMAIN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  K: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", label: "Knowledge" },
  S: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", label: "Skill" },
  A: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", label: "Attitude" },
};

interface CompetencyBadgesProps {
  domain?: string;
  level?: string;
  isCore?: boolean;
  compact?: boolean; // Smaller badges for tight spaces like tree nodes
  className?: string;
}

export function CompetencyBadges({
  domain,
  level,
  isCore,
  compact = false,
  className,
}: CompetencyBadgesProps) {
  const badgeSize = compact ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0";

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {/* Domain badges — split K/S/A into individual badges */}
      {domain &&
        domain.split("/").map((d) => {
          const trimmed = d.trim();
          const colors = DOMAIN_COLORS[trimmed];
          if (!colors) return null;
          return (
            <Badge
              key={trimmed}
              className={cn(badgeSize, colors.bg, colors.text, "border-0 font-medium")}
              title={colors.label}
            >
              {trimmed}
            </Badge>
          );
        })}

      {/* Level badge */}
      {level && (
        <Badge variant="outline" className={cn(badgeSize, "font-normal")}>
          {level}
        </Badge>
      )}

      {/* Core badge */}
      {isCore && (
        <Badge
          variant="secondary"
          className={cn(
            badgeSize,
            "border-primary/50 bg-primary/10 text-primary font-medium"
          )}
        >
          Core
        </Badge>
      )}
    </div>
  );
}

/**
 * Render teaching or assessment methods as pill tags
 */
interface MethodPillsProps {
  methods?: string;
  type: "teaching" | "assessment";
  className?: string;
}

export function MethodPills({ methods, type, className }: MethodPillsProps) {
  if (!methods) return null;

  const items = methods.split(",").map((m) => m.trim()).filter(Boolean);
  if (items.length === 0) return null;

  const pillColor =
    type === "teaching"
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      : "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300";

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            pillColor
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/competency/CompetencyBadges.tsx
git commit -m "Add CompetencyBadges and MethodPills shared components"
```

---

### Task 6: Create CompetencyDetails Expandable Panel

**Files:**
- Create: `src/components/competency/CompetencyDetails.tsx`

Expandable details panel showing teaching methods, assessment methods, and topic.

- [ ] **Step 1: Create the component**

```typescript
// src/components/competency/CompetencyDetails.tsx
"use client";

import { MethodPills } from "./CompetencyBadges";
import { cn } from "@/lib/utils";

interface CompetencyDetailsProps {
  teachingMethods?: string;
  assessmentMethods?: string;
  topicName?: string;
  className?: string;
}

export function CompetencyDetails({
  teachingMethods,
  assessmentMethods,
  topicName,
  className,
}: CompetencyDetailsProps) {
  const hasContent = teachingMethods || assessmentMethods || topicName;
  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "mt-2 pt-2 border-t border-dashed space-y-2 text-xs",
        className
      )}
    >
      {teachingMethods && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground font-medium shrink-0 w-20">Teaching:</span>
          <MethodPills methods={teachingMethods} type="teaching" />
        </div>
      )}
      {assessmentMethods && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground font-medium shrink-0 w-20">Assessment:</span>
          <MethodPills methods={assessmentMethods} type="assessment" />
        </div>
      )}
      {topicName && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground font-medium shrink-0 w-20">Topic:</span>
          <span className="text-muted-foreground">{topicName}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify both shared components compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/competency/CompetencyDetails.tsx
git commit -m "Add CompetencyDetails expandable panel component"
```

---

## Chunk 3: Rich Display Integration

### Task 7: Enhance CompetencyList (Browse View)

**Files:**
- Modify: `src/components/browse/CompetencyList.tsx`

Add CompetencyBadges inline and expandable CompetencyDetails on click.

- [ ] **Step 1: Update CompetencyList with badges and expandable details**

Replace the entire content of `src/components/browse/CompetencyList.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompetencyBadges } from "@/components/competency/CompetencyBadges";
import { CompetencyDetails } from "@/components/competency/CompetencyDetails";
import { cn } from "@/lib/utils";
import type { CompetencyWithDetails } from "@/types";

interface CompetencyListProps {
  competencies: CompetencyWithDetails[];
  selectedCodes: string[];
  onSelect: (competency: CompetencyWithDetails) => void;
  maxHeight?: number;
}

export function CompetencyList({
  competencies,
  selectedCodes,
  onSelect,
  maxHeight = 300,
}: CompetencyListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">
        Competencies ({competencies.length})
      </label>
      <ScrollArea
        className="border rounded-md"
        style={{ height: `${maxHeight}px` }}
      >
        <div className="p-2 space-y-1">
          {competencies.map((competency) => {
            const isSelected = selectedCodes.includes(competency.competency_code);
            const isExpanded = expandedIds.has(competency.id);
            return (
              <button
                key={competency.id}
                onClick={() => onSelect(competency)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isSelected && "bg-primary/10 border border-primary/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => toggleExpand(competency.id, e)}
                        className="p-0.5 rounded hover:bg-muted-foreground/10 shrink-0"
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </span>
                      <span className="font-mono text-sm font-medium text-primary">
                        {competency.competency_code}
                      </span>
                      <CompetencyBadges
                        domain={competency.domain}
                        level={competency.competency_level}
                        isCore={Boolean(competency.is_core)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 ml-6">
                      {competency.competency_text}
                    </p>
                    {isExpanded && (
                      <div className="ml-6">
                        <CompetencyDetails
                          teachingMethods={competency.teaching_methods}
                          assessmentMethods={competency.assessment_methods}
                          topicName={competency.topic_name}
                        />
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders in the browser**

Run: Refresh http://localhost:3000, go to Browse tab, select a subject and topic. Verify:
- Domain badges appear color-coded (K=blue, S=green, A=amber)
- Level badge appears as outline
- Core badge appears for core competencies
- Clicking the chevron expands to show teaching/assessment method pills and topic

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/CompetencyList.tsx
git commit -m "Enhance CompetencyList with rich badges and expandable details"
```

---

### Task 8: Enhance SearchResults

**Files:**
- Modify: `src/components/search/SearchResults.tsx`

Add CompetencyBadges and expandable details to search results.

- [ ] **Step 1: Update SearchResults with badges and expandable details**

Replace the entire content of `src/components/search/SearchResults.tsx`:

```typescript
"use client";

import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompetencyBadges } from "@/components/competency/CompetencyBadges";
import { CompetencyDetails } from "@/components/competency/CompetencyDetails";
import type { CompetencyWithDetails, CompetencyTag, GroupedSearchResults } from "@/types";
import { cn, truncate } from "@/lib/utils";

interface SearchResultsProps {
  groupedResults: GroupedSearchResults | null;
  isLoading: boolean;
  error: Error | null;
  query: string;
  selectedCodes?: string[];
  onSelect: (tag: CompetencyTag) => void;
  persistent?: boolean;
}

export function SearchResults({
  groupedResults,
  isLoading,
  error,
  query,
  selectedCodes = [],
  onSelect,
  persistent = false,
}: SearchResultsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (comp: CompetencyWithDetails) => {
    const tag: CompetencyTag = {
      value: comp.competency_code,
      code: comp.competency_code,
      text: comp.competency_text,
      subjectCode: comp.subject_code,
      subjectName: comp.subject_name,
      topicName: comp.topic_name,
      domain: comp.domain || undefined,
      level: comp.competency_level || undefined,
      isCore: Boolean(comp.is_core),
      teachingMethods: comp.teaching_methods || undefined,
      assessmentMethods: comp.assessment_methods || undefined,
      integrations: comp.integrations || undefined,
    };
    onSelect(tag);
  };

  const containerClass = persistent
    ? "mt-4 w-full max-w-full rounded-md border bg-popover shadow-md overflow-hidden"
    : "absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md overflow-hidden";

  if (error) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error.message}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      </div>
    );
  }

  if (query.length < 2) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">Type at least 2 characters to search</p>
        </div>
      </div>
    );
  }

  if (!groupedResults || groupedResults.total === 0) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">No competencies found for &quot;{query}&quot;</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <ScrollArea className="h-[400px]">
        <div>
          {groupedResults.groups.map((group) => (
            <div key={group.subject.code} className="border-b last:border-b-0">
              <div className="sticky top-0 z-10 bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                {group.subject.name} ({group.competencies.length})
              </div>
              <div className="divide-y">
                {group.competencies.map((comp) => {
                  const isSelected = selectedCodes.includes(comp.competency_code);
                  const isExpanded = expandedIds.has(comp.id);
                  return (
                    <div
                      key={comp.id}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition-colors overflow-hidden",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={(e) => toggleExpand(comp.id, e)}
                          className="p-0.5 rounded hover:bg-muted-foreground/10 shrink-0 mt-0.5"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => !isSelected && handleSelect(comp)}
                              disabled={isSelected}
                              className={cn(
                                "font-mono text-xs font-semibold text-primary",
                                !isSelected && "hover:underline cursor-pointer",
                                isSelected && "cursor-not-allowed"
                              )}
                            >
                              {comp.competency_code}
                            </button>
                            <CompetencyBadges
                              domain={comp.domain}
                              level={comp.competency_level}
                              isCore={Boolean(comp.is_core)}
                              compact
                            />
                            {isSelected && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {truncate(comp.competency_text, 150)}
                          </p>
                          {isExpanded && (
                            <CompetencyDetails
                              teachingMethods={comp.teaching_methods}
                              assessmentMethods={comp.assessment_methods}
                              topicName={comp.topic_name}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            {groupedResults.total} result{groupedResults.total !== 1 && "s"}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: Refresh http://localhost:3000, use the Search tab, search for "anatomy". Verify domain/level/core badges appear and chevron expand works.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchResults.tsx
git commit -m "Enhance SearchResults with rich badges and expandable details"
```

---

### Task 9: Enhance CompetencyTooltip

**Files:**
- Modify: `src/components/tags/CompetencyTooltip.tsx`

Add teaching/assessment method pills to the tooltip content.

- [ ] **Step 1: Update CompetencyTooltip**

Replace the content of `src/components/tags/CompetencyTooltip.tsx`:

```typescript
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompetencyBadges, MethodPills } from "@/components/competency/CompetencyBadges";
import type { CompetencyTag } from "@/types";

interface CompetencyTooltipProps {
  tag: CompetencyTag;
  children: React.ReactNode;
}

export function CompetencyTooltip({ tag, children }: CompetencyTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-sm p-4 space-y-3"
        >
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">
                {tag.code}
              </span>
              <CompetencyBadges
                domain={tag.domain}
                level={tag.level}
                isCore={tag.isCore}
                compact
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {tag.subjectName} &bull; {tag.topicName}
            </div>
          </div>

          {/* Competency Text */}
          <p className="text-sm leading-relaxed">{tag.text}</p>

          {/* Teaching Methods */}
          {tag.teachingMethods && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Teaching
              </span>
              <MethodPills methods={tag.teachingMethods} type="teaching" />
            </div>
          )}

          {/* Assessment Methods */}
          {tag.assessmentMethods && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Assessment
              </span>
              <MethodPills methods={tag.assessmentMethods} type="assessment" />
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Verify in browser**

Select a competency, then hover over the tag in the "Selected Competencies" area. Verify the tooltip shows color-coded domain/level badges plus teaching and assessment method pills.

- [ ] **Step 3: Commit**

```bash
git add src/components/tags/CompetencyTooltip.tsx
git commit -m "Enhance CompetencyTooltip with method pills and color-coded badges"
```

---

### Task 10: Add Badges to Tree View Competency Nodes

**Files:**
- Modify: `src/components/tree/TreeNode.tsx`

Add compact domain badges as colored dots next to competency node labels in the SVG tree view.

- [ ] **Step 1: Update TreeNode to show domain indicator**

In `src/components/tree/TreeNode.tsx`, add domain color dots after the competency label. Since this is SVG-based and can't use React Badge components, use small colored circles.

Add domain color constants after the `nodeStyles` object (after line 21):

```typescript
const DOMAIN_SVG_COLORS: Record<string, string> = {
  K: "hsl(217, 91%, 60%)",  // blue
  S: "hsl(142, 71%, 45%)",  // green
  A: "hsl(38, 92%, 50%)",   // amber
};
```

The `TreeNode` type in `src/types/tree.ts` stores `data?: Subject | Topic | CompetencyWithDetails`. When competency nodes are created, `data` is set to the full `CompetencyWithDetails` object which includes `domain`. We need to cast `node.data` to access `domain`.

Add a helper inside the component function (after line 38):

```typescript
// Extract domain from competency node data
const competencyDomain = isLeaf && node.data && "domain" in node.data
  ? (node.data as CompetencyWithDetails).domain
  : undefined;
```

Add the import at the top of the file:

```typescript
import type { CompetencyWithDetails } from "@/types";
```

Then inside the `<g>` element, after the label `<text>` element (before the closing `</g>` at line 183), add:

```typescript
{/* Domain indicator dots for competency nodes */}
{competencyDomain && (
  <g transform={`translate(${style.radius + 28}, 8)`}>
    {competencyDomain.split("/").map((d: string, i: number) => {
      const color = DOMAIN_SVG_COLORS[d.trim()];
      if (!color) return null;
      return (
        <circle
          key={d}
          cx={i * 10}
          cy={0}
          r={3}
          fill={color}
          className="pointer-events-none"
        />
      );
    })}
  </g>
)}
```

- [ ] **Step 2: Verify in browser and verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify in browser**

Open Tree View tab, expand a subject and topic. Competency nodes should show small colored domain dots below their label.

- [ ] **Step 4: Commit**

```bash
git add src/components/tree/TreeNode.tsx
# Add any other modified tree files
git commit -m "Add domain indicator dots to Tree View competency nodes"
```

---

## Chunk 4: Filtering — API & Service Layer

### Task 11: Add Methods Endpoint

**Files:**
- Create: `src/app/api/competencies/methods/route.ts`

New endpoint that returns distinct canonical method values for populating filter dropdowns.

- [ ] **Step 1: Add `getDistinctMethods` to CompetencyService**

In `src/services/competencyService.ts`, add this method to the `CompetencyService` class (before the `getStats()` method around line 505):

```typescript
/**
 * Get distinct canonical values for teaching or assessment methods
 */
getDistinctMethods(type: "teaching" | "assessment"): string[] {
  const column = type === "teaching" ? "teaching_methods" : "assessment_methods";
  const rows = this.db
    .prepare(`SELECT DISTINCT ${column} as methods FROM competencies WHERE ${column} IS NOT NULL AND deleted_at IS NULL`)
    .all() as { methods: string }[];

  // Split comma-separated values, deduplicate, sort
  const allMethods = new Set<string>();
  for (const row of rows) {
    row.methods.split(",").forEach((m) => {
      const trimmed = m.trim();
      if (trimmed) allMethods.add(trimmed);
    });
  }

  return Array.from(allMethods).sort();
}
```

- [ ] **Step 2: Create the API route**

```typescript
// src/app/api/competencies/methods/route.ts
import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "teaching" | "assessment" | null;
    const version = searchParams.get("version") || undefined;

    if (type !== "teaching" && type !== "assessment") {
      return NextResponse.json(
        { error: "type must be 'teaching' or 'assessment'" },
        { status: 400 }
      );
    }

    const service = getCompetencyService(version);
    const methods = service.getDistinctMethods(type);
    return NextResponse.json({ methods });
  } catch (error) {
    console.error("Error fetching methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch methods" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Test the endpoint**

Run: `curl -s "http://localhost:3000/api/competencies/methods?type=teaching&version=2024" | python3 -m json.tool`
Expected: `{ "methods": ["Bedside clinic", "DOAP", "Demonstration", "LGT", "SGT", ...] }`

Run: `curl -s "http://localhost:3000/api/competencies/methods?type=assessment&version=2024" | python3 -m json.tool`
Expected: `{ "methods": ["Application based question", "Long case", "Logbook", "OSCE", ...] }`

- [ ] **Step 4: Commit**

```bash
git add src/services/competencyService.ts src/app/api/competencies/methods/route.ts
git commit -m "Add /api/competencies/methods endpoint for filter dropdowns"
```

---

### Task 12: Add Filter Support to CompetencyService.getFiltered and getCompetenciesByTopic

**Files:**
- Modify: `src/services/competencyService.ts:74-92` (getCompetenciesByTopic)
- Modify: `src/services/competencyService.ts:199-246` (getFiltered)

Both methods need to support the new filter fields: level, teachingMethod, assessmentMethod. Also fix domain filtering to use LIKE for multi-domain values.

- [ ] **Step 1: Update getCompetenciesByTopic to accept filters**

Replace the `getCompetenciesByTopic` method (lines 74-92):

```typescript
/**
 * Get competencies by topic ID, optionally filtered
 */
getCompetenciesByTopic(topicId: number, filters?: CompetencyFilters): CompetencyWithDetails[] {
  let sql = `
    SELECT
      c.*,
      t.name AS topic_name,
      s.code AS subject_code,
      s.name AS subject_name
    FROM competencies c
    JOIN topics t ON c.topic_id = t.id
    JOIN subjects s ON t.subject_id = s.id
    WHERE c.topic_id = ?
      AND c.deleted_at IS NULL
  `;
  const params: (string | number)[] = [topicId];

  if (filters) {
    sql += this.buildFilterClauses(filters, params);
  }

  sql += ` ORDER BY c.competency_code`;
  return this.db.prepare(sql).all(...params) as CompetencyWithDetails[];
}
```

- [ ] **Step 2: Extract shared filter clause builder**

Add a private method to the `CompetencyService` class (after the `getFiltered` method):

```typescript
/**
 * Build SQL WHERE clauses for filter fields
 * Appends clauses to the provided params array and returns the SQL string
 */
private buildFilterClauses(filters: CompetencyFilters, params: (string | number)[]): string {
  let sql = "";

  if (filters.subject) {
    if (Array.isArray(filters.subject)) {
      sql += ` AND s.code IN (${filters.subject.map(() => "?").join(",")})`;
      params.push(...filters.subject);
    } else {
      sql += ` AND s.code = ?`;
      params.push(filters.subject);
    }
  }

  if (filters.topic) {
    sql += ` AND t.name = ?`;
    params.push(filters.topic);
  }

  // Domain: use LIKE to match multi-domain values like K/S, K/S/A
  if (filters.domain) {
    const domains = Array.isArray(filters.domain) ? filters.domain : [filters.domain];
    if (domains.length > 0) {
      const domainClauses = domains.map(() => "c.domain LIKE ?");
      sql += ` AND (${domainClauses.join(" OR ")})`;
      for (const d of domains) {
        params.push(`%${d}%`);
      }
    }
  }

  // Level: OR logic
  if (filters.level && filters.level.length > 0) {
    const levelClauses = filters.level.map(() => "c.competency_level LIKE ?");
    sql += ` AND (${levelClauses.join(" OR ")})`;
    for (const l of filters.level) {
      params.push(`%${l}%`);
    }
  }

  if (filters.coreOnly) {
    sql += ` AND c.is_core = 1`;
  }

  // Teaching method: AND logic (all selected must be present)
  if (filters.teachingMethod && filters.teachingMethod.length > 0) {
    for (const method of filters.teachingMethod) {
      sql += ` AND c.teaching_methods LIKE ?`;
      params.push(`%${method}%`);
    }
  }

  // Assessment method: AND logic
  if (filters.assessmentMethod && filters.assessmentMethod.length > 0) {
    for (const method of filters.assessmentMethod) {
      sql += ` AND c.assessment_methods LIKE ?`;
      params.push(`%${method}%`);
    }
  }

  return sql;
}
```

- [ ] **Step 3: Update getFiltered to use the shared builder**

Replace the `getFiltered` method body to use `buildFilterClauses`:

```typescript
getFiltered(filters: CompetencyFilters): CompetencyWithDetails[] {
  let sql = `
    SELECT
      c.*,
      t.name AS topic_name,
      s.code AS subject_code,
      s.name AS subject_name
    FROM competencies c
    JOIN topics t ON c.topic_id = t.id
    JOIN subjects s ON t.subject_id = s.id
    WHERE c.deleted_at IS NULL
  `;
  const params: (string | number)[] = [];

  sql += this.buildFilterClauses(filters, params);
  sql += ` ORDER BY s.display_order, t.display_order, c.competency_code`;

  return this.db.prepare(sql).all(...params) as CompetencyWithDetails[];
}
```

- [ ] **Step 4: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/services/competencyService.ts
git commit -m "Add filter clause builder with domain LIKE, level, method filtering"
```

---

### Task 13: Update SearchService to Support New Filters

**Files:**
- Modify: `src/services/searchService.ts:36-108`

The `executeSearch` method needs to support level, teachingMethod, and assessmentMethod filters, and fix domain to use LIKE.

- [ ] **Step 1: Update executeSearch**

In `src/services/searchService.ts`, replace lines 78-101 (the filter application block inside `executeSearch`):

```typescript
    // Apply filters
    if (filters?.subject) {
      if (Array.isArray(filters.subject)) {
        sql += ` AND s.code IN (${filters.subject.map(() => "?").join(",")})`;
        params.push(...filters.subject);
      } else {
        sql += ` AND s.code = ?`;
        params.push(filters.subject);
      }
    }

    // Domain: use LIKE to match multi-domain values (K/S, K/S/A, etc.)
    if (filters?.domain) {
      const domains = Array.isArray(filters.domain) ? filters.domain : [filters.domain];
      if (domains.length > 0) {
        const domainClauses = domains.map(() => "c.domain LIKE ?");
        sql += ` AND (${domainClauses.join(" OR ")})`;
        for (const d of domains) {
          params.push(`%${d}%`);
        }
      }
    }

    // Level: OR logic
    if (filters?.level && filters.level.length > 0) {
      const levelClauses = filters.level.map(() => "c.competency_level LIKE ?");
      sql += ` AND (${levelClauses.join(" OR ")})`;
      for (const l of filters.level) {
        params.push(`%${l}%`);
      }
    }

    if (filters?.coreOnly) {
      sql += ` AND c.is_core = 1`;
    }

    // Teaching method: AND logic
    if (filters?.teachingMethod && filters.teachingMethod.length > 0) {
      for (const method of filters.teachingMethod) {
        sql += ` AND c.teaching_methods LIKE ?`;
        params.push(`%${method}%`);
      }
    }

    // Assessment method: AND logic
    if (filters?.assessmentMethod && filters.assessmentMethod.length > 0) {
      for (const method of filters.assessmentMethod) {
        sql += ` AND c.assessment_methods LIKE ?`;
        params.push(`%${method}%`);
      }
    }
```

- [ ] **Step 2: Also update the GET handler in the search route**

In `src/app/api/competencies/search/route.ts`, update the GET handler (lines 36-65) to parse the new filter params from query string:

After line 43 (`const version = searchParams.get("version") || undefined;`), add:

```typescript
    const level = searchParams.get("level");
    const teachingMethod = searchParams.get("teachingMethod");
    const assessmentMethod = searchParams.get("assessmentMethod");
```

After line 56 (`if (coreOnly) filters.coreOnly = true;`), add:

```typescript
    if (level) filters.level = level.split(",");
    if (teachingMethod) filters.teachingMethod = teachingMethod.split(",");
    if (assessmentMethod) filters.assessmentMethod = assessmentMethod.split(",");
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/services/searchService.ts src/app/api/competencies/search/route.ts
git commit -m "Add level, method, and LIKE-based domain filtering to SearchService"
```

---

### Task 14: Update Topic Competencies API Route

**Files:**
- Modify: `src/app/api/topics/[id]/competencies/route.ts`

The browse flow uses this endpoint. Add filter query parameter parsing.

- [ ] **Step 1: Update the route handler**

Replace `src/app/api/topics/[id]/competencies/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";
import type { CompetencyFilters } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    const topicId = parseInt(id);
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: "Invalid topic ID" },
        { status: 400 }
      );
    }

    // Parse optional filters
    const filters: CompetencyFilters = {};
    const domain = searchParams.get("domain");
    if (domain) filters.domain = domain.split(",");

    const level = searchParams.get("level");
    if (level) filters.level = level.split(",");

    const coreOnly = searchParams.get("coreOnly");
    if (coreOnly === "true") filters.coreOnly = true;

    const teachingMethod = searchParams.get("teachingMethod");
    if (teachingMethod) filters.teachingMethod = teachingMethod.split(",");

    const assessmentMethod = searchParams.get("assessmentMethod");
    if (assessmentMethod) filters.assessmentMethod = assessmentMethod.split(",");

    const hasFilters = Object.keys(filters).length > 0;

    const service = getCompetencyService(version);
    const competencies = service.getCompetenciesByTopic(
      topicId,
      hasFilters ? filters : undefined
    );
    return NextResponse.json(competencies);
  } catch (error) {
    console.error("Error fetching competencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch competencies" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test the endpoint**

Run: `curl -s "http://localhost:3000/api/topics/1/competencies?version=2024&domain=K&level=KH" | python3 -m json.tool | head -20`
Expected: Returns only competencies from topic 1 where domain contains K and level contains KH.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/topics/[id]/competencies/route.ts
git commit -m "Add filter params to topic competencies API endpoint"
```

---

## Chunk 5: Filtering — UI Components & Integration

### Task 15: Create useCompetencyFilters Hook

**Files:**
- Create: `src/hooks/useCompetencyFilters.ts`

Manages filter state and provides methods to update individual filters.

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useCompetencyFilters.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import type { CompetencyFilters } from "@/types";

interface UseCompetencyFiltersReturn {
  filters: CompetencyFilters;
  setDomains: (domains: string[]) => void;
  setLevels: (levels: string[]) => void;
  setCoreOnly: (coreOnly: boolean) => void;
  setTeachingMethods: (methods: string[]) => void;
  setAssessmentMethods: (methods: string[]) => void;
  clearAll: () => void;
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

export function useCompetencyFilters(): UseCompetencyFiltersReturn {
  const [domains, setDomains] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [coreOnly, setCoreOnly] = useState(false);
  const [teachingMethods, setTeachingMethods] = useState<string[]>([]);
  const [assessmentMethods, setAssessmentMethods] = useState<string[]>([]);

  const filters = useMemo<CompetencyFilters>(() => {
    const f: CompetencyFilters = {};
    if (domains.length > 0) f.domain = domains;
    if (levels.length > 0) f.level = levels;
    if (coreOnly) f.coreOnly = true;
    if (teachingMethods.length > 0) f.teachingMethod = teachingMethods;
    if (assessmentMethods.length > 0) f.assessmentMethod = assessmentMethods;
    return f;
  }, [domains, levels, coreOnly, teachingMethods, assessmentMethods]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (domains.length > 0) count++;
    if (levels.length > 0) count++;
    if (coreOnly) count++;
    if (teachingMethods.length > 0) count++;
    if (assessmentMethods.length > 0) count++;
    return count;
  }, [domains, levels, coreOnly, teachingMethods, assessmentMethods]);

  const clearAll = useCallback(() => {
    setDomains([]);
    setLevels([]);
    setCoreOnly(false);
    setTeachingMethods([]);
    setAssessmentMethods([]);
  }, []);

  return {
    filters,
    setDomains,
    setLevels,
    setCoreOnly,
    setTeachingMethods,
    setAssessmentMethods,
    clearAll,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCompetencyFilters.ts
git commit -m "Add useCompetencyFilters hook for filter state management"
```

---

### Task 16: Create MethodSelect Component

**Files:**
- Create: `src/components/filters/MethodSelect.tsx`

Multi-select dropdown for teaching/assessment methods, populated from the API.

- [ ] **Step 0: Create the directory**

Run: `mkdir -p src/components/filters`

- [ ] **Step 1: Create the component**

```typescript
// src/components/filters/MethodSelect.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MethodSelectProps {
  type: "teaching" | "assessment";
  selected: string[];
  onChange: (selected: string[]) => void;
  version?: string;
  className?: string;
}

export function MethodSelect({
  type,
  selected,
  onChange,
  version,
  className,
}: MethodSelectProps) {
  const [methods, setMethods] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch methods from API
  useEffect(() => {
    const url = `/api/competencies/methods?type=${type}${version ? `&version=${version}` : ""}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMethods(data.methods || []))
      .catch(console.error);
  }, [type, version]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleMethod = (method: string) => {
    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
    } else {
      onChange([...selected, method]);
    }
  };

  const label = type === "teaching" ? "Teaching Method" : "Assessment Method";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-xs h-8"
      >
        <span className="truncate">
          {selected.length > 0
            ? `${label} (${selected.length})`
            : label}
        </span>
        <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((method) => (
            <Badge
              key={method}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 gap-1 cursor-pointer"
              onClick={() => toggleMethod(method)}
            >
              {method}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {methods.map((method) => {
            const isChecked = selected.includes(method);
            return (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-xs flex items-center gap-2",
                  "hover:bg-accent hover:text-accent-foreground",
                  isChecked && "bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                    isChecked
                      ? "bg-primary border-primary"
                      : "border-input"
                  )}
                >
                  {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                {method}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/filters/MethodSelect.tsx
git commit -m "Add MethodSelect multi-select dropdown component"
```

---

### Task 17: Create FilterPanel Component

**Files:**
- Create: `src/components/filters/FilterPanel.tsx`

Collapsible filter bar with domain checkboxes, level checkboxes, core toggle, and method selects.

- [ ] **Step 1: Create the component**

```typescript
// src/components/filters/FilterPanel.tsx
"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MethodSelect } from "./MethodSelect";
import { cn } from "@/lib/utils";

const DOMAINS = [
  { value: "K", label: "K", description: "Knowledge" },
  { value: "S", label: "S", description: "Skill" },
  { value: "A", label: "A", description: "Attitude" },
];

const LEVELS = [
  { value: "K", label: "K", description: "Know" },
  { value: "KH", label: "KH", description: "Know How" },
  { value: "SH", label: "SH", description: "Show How" },
  { value: "P", label: "P", description: "Perform" },
];

interface FilterPanelProps {
  domains: string[];
  levels: string[];
  coreOnly: boolean;
  teachingMethods: string[];
  assessmentMethods: string[];
  onDomainsChange: (domains: string[]) => void;
  onLevelsChange: (levels: string[]) => void;
  onCoreOnlyChange: (coreOnly: boolean) => void;
  onTeachingMethodsChange: (methods: string[]) => void;
  onAssessmentMethodsChange: (methods: string[]) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  version?: string;
  className?: string;
}

export function FilterPanel({
  domains,
  levels,
  coreOnly,
  teachingMethods,
  assessmentMethods,
  onDomainsChange,
  onLevelsChange,
  onCoreOnlyChange,
  onTeachingMethodsChange,
  onAssessmentMethodsChange,
  onClearAll,
  activeFilterCount,
  version,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDomain = (domain: string) => {
    if (domains.includes(domain)) {
      onDomainsChange(domains.filter((d) => d !== domain));
    } else {
      onDomainsChange([...domains, domain]);
    }
  };

  const toggleLevel = (level: string) => {
    if (levels.includes(level)) {
      onLevelsChange(levels.filter((l) => l !== level));
    } else {
      onLevelsChange([...levels, level]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2 text-xs h-8"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs h-8 gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter controls */}
      {isOpen && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Domain */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Domain
              </label>
              <div className="flex gap-3">
                {DOMAINS.map((d) => (
                  <label
                    key={d.value}
                    className="flex items-center gap-1.5 cursor-pointer text-xs"
                    title={d.description}
                  >
                    <Checkbox
                      checked={domains.includes(d.value)}
                      onCheckedChange={() => toggleDomain(d.value)}
                      className="h-3.5 w-3.5"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Level
              </label>
              <div className="flex gap-3">
                {LEVELS.map((l) => (
                  <label
                    key={l.value}
                    className="flex items-center gap-1.5 cursor-pointer text-xs"
                    title={l.description}
                  >
                    <Checkbox
                      checked={levels.includes(l.value)}
                      onCheckedChange={() => toggleLevel(l.value)}
                      className="h-3.5 w-3.5"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Core only */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Core
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                <Checkbox
                  checked={coreOnly}
                  onCheckedChange={(checked) => onCoreOnlyChange(checked === true)}
                  className="h-3.5 w-3.5"
                />
                Core competencies only
              </label>
            </div>
          </div>

          {/* Method selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Teaching Method
              </label>
              <MethodSelect
                type="teaching"
                selected={teachingMethods}
                onChange={onTeachingMethodsChange}
                version={version}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Assessment Method
              </label>
              <MethodSelect
                type="assessment"
                selected={assessmentMethods}
                onChange={onAssessmentMethodsChange}
                version={version}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check for existing core-only toggles**

Search the codebase for any existing standalone "core only" toggle in BrowseInterface or SearchInterface. If found, remove it — the FilterPanel now owns the core filter. The current codebase does not have a standalone core toggle in the UI (it was only in `CompetencyFilters` type), so no removal should be needed.

- [ ] **Step 3: Commit**

```bash
git add src/components/filters/FilterPanel.tsx
git commit -m "Add FilterPanel collapsible filter bar component"
```

---

### Task 18: Integrate Filters into BrowseInterface

**Files:**
- Modify: `src/components/browse/BrowseInterface.tsx`
- Modify: `src/hooks/useCompetencyBrowse.ts`

Wire up the FilterPanel to the browse flow: pass filters to the API, re-fetch when they change.

- [ ] **Step 1: Update useCompetencyBrowse to accept and pass filters**

In `src/hooks/useCompetencyBrowse.ts`, update the options interface and the competency fetch:

Add `filters` to the options interface (line 6-8):

```typescript
interface UseCompetencyBrowseOptions {
  version?: string;
  filters?: CompetencyFilters;
}
```

Add the import for `CompetencyFilters` at line 4:

```typescript
import type { Subject, Topic, CompetencyWithDetails, CompetencyFilters } from "@/types";
```

Destructure filters in the hook (line 27):

```typescript
const { version, filters } = options;
```

Update the `buildUrl` function to also accept extra params (replace lines 40-47). Keep the string-based approach to remain SSR-safe:

```typescript
const buildUrl = useCallback(
  (baseUrl: string, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (version) params.set("version", version);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  },
  [version]
);
```

Update the competency loading effect (lines 103-127) to pass filters:

```typescript
// Load competencies when topic or filters change
useEffect(() => {
  if (!selectedTopic) {
    setCompetencies([]);
    return;
  }

  const loadCompetencies = async () => {
    setIsLoadingCompetencies(true);
    try {
      const filterParams: Record<string, string> = {};
      if (filters?.domain) {
        const domains = Array.isArray(filters.domain) ? filters.domain : [filters.domain];
        filterParams.domain = domains.join(",");
      }
      if (filters?.level) filterParams.level = filters.level.join(",");
      if (filters?.coreOnly) filterParams.coreOnly = "true";
      if (filters?.teachingMethod) filterParams.teachingMethod = filters.teachingMethod.join(",");
      if (filters?.assessmentMethod) filterParams.assessmentMethod = filters.assessmentMethod.join(",");

      const response = await fetch(
        buildUrl(`/api/topics/${selectedTopic}/competencies`, filterParams)
      );
      if (!response.ok) throw new Error("Failed to load competencies");
      const data = await response.json();
      setCompetencies(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load competencies"));
    } finally {
      setIsLoadingCompetencies(false);
    }
  };

  loadCompetencies();
}, [selectedTopic, buildUrl, filters]);
```

Also update the subjects and topics loading effects to use the new `buildUrl` signature (pass `undefined` as second arg or just omit it since it's optional).

- [ ] **Step 2: Update BrowseInterface to include FilterPanel**

In `src/components/browse/BrowseInterface.tsx`, add the filter hook and panel. Update the file:

Add imports:
```typescript
import { FilterPanel } from "@/components/filters/FilterPanel";
import { useCompetencyFilters } from "@/hooks/useCompetencyFilters";
```

Inside the component, add the filter hook and pass filters to useCompetencyBrowse:

```typescript
const {
  filters: activeFilters,
  setDomains,
  setLevels,
  setCoreOnly,
  setTeachingMethods,
  setAssessmentMethods,
  clearAll: clearFilters,
  activeFilterCount,
} = useCompetencyFilters();

const {
  subjects,
  topics,
  competencies,
  selectedSubject,
  selectedTopic,
  selectSubject,
  selectTopic,
  isLoadingSubjects,
  isLoadingTopics,
  isLoadingCompetencies,
  error,
} = useCompetencyBrowse({ version, filters: activeFilters });
```

Add FilterPanel to the JSX, after the dropdowns and before the competency list:

```tsx
{/* Filter Panel - show when a topic is selected */}
{selectedTopic && (
  <FilterPanel
    domains={activeFilters.domain ? (Array.isArray(activeFilters.domain) ? activeFilters.domain : [activeFilters.domain]) : []}
    levels={activeFilters.level || []}
    coreOnly={activeFilters.coreOnly || false}
    teachingMethods={activeFilters.teachingMethod || []}
    assessmentMethods={activeFilters.assessmentMethod || []}
    onDomainsChange={setDomains}
    onLevelsChange={setLevels}
    onCoreOnlyChange={setCoreOnly}
    onTeachingMethodsChange={setTeachingMethods}
    onAssessmentMethodsChange={setAssessmentMethods}
    onClearAll={clearFilters}
    activeFilterCount={activeFilterCount}
    version={version}
  />
)}
```

- [ ] **Step 3: Verify in browser**

Browse tab → select subject → select topic → click "Filters" button. Verify:
- Domain checkboxes filter competencies
- Level checkboxes filter competencies
- Teaching/Assessment method dropdowns populate from API and filter with AND logic
- Clear button resets all filters
- Competency list updates in real-time

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCompetencyBrowse.ts src/components/browse/BrowseInterface.tsx
git commit -m "Integrate FilterPanel into Browse view with real-time filtering"
```

---

### Task 19: Integrate Filters into SearchInterface

**Files:**
- Modify: `src/components/search/SearchInterface.tsx`

Wire up FilterPanel to the search flow.

- [ ] **Step 1: Update SearchInterface to include FilterPanel**

In `src/components/search/SearchInterface.tsx`, add the filter hook and pass filters to the search hook.

Add imports:
```typescript
import { FilterPanel } from "@/components/filters/FilterPanel";
import { useCompetencyFilters } from "@/hooks/useCompetencyFilters";
```

Inside the component, add the filter hook:

```typescript
const {
  filters: activeFilters,
  setDomains,
  setLevels,
  setCoreOnly,
  setTeachingMethods,
  setAssessmentMethods,
  clearAll: clearFilters,
  activeFilterCount,
} = useCompetencyFilters();
```

Merge external filters (from props) with active filters when passing to the search hook:

```typescript
const mergedFilters = useMemo(() => ({
  ...filters,
  ...activeFilters,
}), [filters, activeFilters]);

const { groupedResults, isLoading, error, search, clear } = useCompetencySearch({
  filters: mergedFilters,
  version,
});
```

Add `useMemo` to the imports from React.

Add FilterPanel to the JSX, between the search bar and results:

```tsx
{/* Filter Panel */}
<FilterPanel
  domains={activeFilters.domain ? (Array.isArray(activeFilters.domain) ? activeFilters.domain : [activeFilters.domain]) : []}
  levels={activeFilters.level || []}
  coreOnly={activeFilters.coreOnly || false}
  teachingMethods={activeFilters.teachingMethod || []}
  assessmentMethods={activeFilters.assessmentMethod || []}
  onDomainsChange={setDomains}
  onLevelsChange={setLevels}
  onCoreOnlyChange={setCoreOnly}
  onTeachingMethodsChange={setTeachingMethods}
  onAssessmentMethodsChange={setAssessmentMethods}
  onClearAll={clearFilters}
  activeFilterCount={activeFilterCount}
  version={version}
/>
```

- [ ] **Step 2: Verify in browser**

Search tab → type a search query → click "Filters" → apply domain/level/method filters. Verify results update to match both the search query and the active filters.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchInterface.tsx
git commit -m "Integrate FilterPanel into Search view"
```

---

### Task 20: Final Verification and Version Bump

- [ ] **Step 1: Run full app verification**

Run the dev server and verify:
1. Browse view: domain/level badges appear, expand/collapse works, filters work
2. Search view: badges appear, expand/collapse works, filters combine with search
3. Tag tooltip: shows domain badges, level, teaching/assessment method pills
4. Tree view: domain dots appear on competency nodes
5. Version selector: switching between 2019 and 2024 works correctly
6. Filter dropdowns: populated with canonical method values from the API

- [ ] **Step 2: Bump version in package.json**

In `package.json`, update version from `"1.2.6"` to `"1.3.0"` (minor version bump for new features).

- [ ] **Step 3: Commit everything**

```bash
git add package.json
git commit -m "Bump version to 1.3.0 — rich display and tag-based filtering"
```

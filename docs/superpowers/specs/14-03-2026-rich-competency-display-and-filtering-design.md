# Rich Competency Display & Tag-Based Filtering

**Date:** 14-03-2026
**Status:** Approved

## Problem

The CBME 2024 competency data has three issues:
1. **Poor display** — competency metadata (domain, level, teaching/assessment methods) exists in the database but is barely shown in the UI. Search results show only the domain letter and topic. Tag tooltips show domain and level but not methods.
2. **No method-based filtering** — users can't filter by teaching method, assessment method, or level. Only subject, topic, domain, and core status are filterable.
3. **Data quality** — 50+ competency texts have words stuck together from PDF extraction (e.g., "principlesandthepracticalaspects"). Teaching and assessment method values are inconsistent (~30+ variants of the same methods).

## Solution Overview

Three sequential workstreams:

1. **Data cleanup** — normalize DB values so display and filtering work on clean data
2. **Rich display** — show all metadata as color-coded badges with expandable details
3. **Tag-based filtering** — add a filter panel for domain, level, teaching methods, and assessment methods

## Workstream 1: Data Cleanup Pipeline

Apply directly to `competencies-2024.db`. The source PDF and Excel files are preserved for reference.

### Phase 1 — Deterministic Regex Fixes

**Stuck words in competency_text** (~50 affected rows):
- Pattern-based splits: `ofthe` → `of the`, `andthe` → `and the`, `inthe` → `in the`, `isthe` → `is the`, `tothe` → `to the`, `forthe` → `for the`, `onthe` → `on the`, `atthe` → `at the`, `bythe` → `by the`
- Extend to other common patterns: lowercase+uppercase boundaries where a space is missing (e.g., `evaluationofpatients` → `evaluation of patients`)
- Apply carefully to avoid false positives (e.g., don't split "anther" into "an the r")

**Level normalization** (competency_level column):
- Inconsistent separators: `KH/ SH`, `KH SH`, `KH,SH`, `KH, SH` → `KH/SH`
- Trim whitespace, normalize to `/`-separated format
- Strip trailing backtick (`SH\``)
- Canonical values: `K`, `KH`, `SH`, `P` and combinations like `K/KH`, `KH/SH`, `SH/P`, `K/KH/SH`

**Domain** — already clean (K, S, A, K/S, K/S/A, K/A, S/A). No changes needed.

### Phase 2 — Teaching/Assessment Method Normalization

Build canonical method sets by analyzing all distinct values, splitting compounds, and mapping variants.

**Canonical teaching methods:**
- `LGT` (Large Group Teaching/Lecture)
- `SGT` (Small Group Teaching)
- `DOAP` (Demonstration, Observation, Assistance, Performance)
- `Bedside clinic`
- `Skill lab`
- `Tutorial`
- `Seminar`
- `Role play`
- `Demonstration`
- `SDL` (Self-Directed Learning)
- Others as discovered from data

**Canonical assessment methods:**
- `Written`
- `Viva voce`
- `Skill assessment`
- `OSCE`
- `Logbook`
- `Long case`
- `Short case`
- `Application based question`
- `Documentation`
- Others as discovered from data

**Normalization process:**
1. Split each raw value on `,`, `/`, `\n`
2. Trim whitespace from each fragment
3. Map to canonical form (case-insensitive matching, handle plural variants like "questions" → "question")
4. Rejoin as comma-separated canonical values
5. Update DB in place

Write as a TypeScript script (`scripts/normalize-methods.ts`) that:
- Reads all distinct values
- Applies the mapping
- Prints a diff preview before committing changes
- Updates the database

### Phase 3 — AI Text Cleanup (Claude Haiku)

For competency texts that still have quality issues after regex:
- Write a script (`scripts/fix-text-ai.ts`) using the Anthropic SDK
- Send batches of competency texts to Claude Haiku with a prompt: "Fix spacing and word boundary issues in this medical competency text. Only fix spacing — do not change meaning, terminology, or structure."
- Show diff for human review before applying
- Estimated cost: ~$0.01 for 50 texts

## Workstream 2: Rich Competency Display

### Badge Design

Color-coded inline badges shown on every competency across all views (Search Results, Browse CompetencyList, Tree View nodes):

| Field | Style | Colors |
|-------|-------|--------|
| Domain K | Filled badge | Blue (bg-blue-100 text-blue-700) |
| Domain S | Filled badge | Green (bg-green-100 text-green-700) |
| Domain A | Filled badge | Amber (bg-amber-100 text-amber-700) |
| Domain C | Filled badge | Purple (bg-purple-100 text-purple-700) |
| Level | Outline badge | Gray outline |
| Core | Filled primary badge | Primary color (existing) |

Multi-domain values (e.g., K/S) display as multiple individual domain badges.

### Competency Row Layout

```
┌─────────────────────────────────────────────────────────────┐
│ AN35.9  [K] [KH] [Core]                              [▼]   │
│ Describe the clinical features of compression of...         │
├ ─ ─ ─ ─ ─ ─ ─ ─ (expanded, toggle with ▼) ─ ─ ─ ─ ─ ─ ─ ┤
│ Teaching:    [LGT] [SGT]                                    │
│ Assessment:  [Written] [Viva voce]                          │
│ Topic:       Topic 35: Axilla and Brachial Plexus           │
└─────────────────────────────────────────────────────────────┘
```

- Collapsed by default — shows code, domain badges, level badge, core badge, truncated text
- Click row or chevron to expand — reveals teaching methods, assessment methods, topic as pill tags
- Teaching method pills: neutral/muted color
- Assessment method pills: slightly different hue to distinguish from teaching

### Tooltip Enhancement

Update `CompetencyTooltip` to show all fields:
- Code, Core badge (existing)
- Subject and Topic (existing)
- Competency text (existing)
- Domain badges (enhanced with colors)
- Level badge (existing)
- Teaching methods as pill list (new)
- Assessment methods as pill list (new)

### Files Modified

- `src/components/browse/CompetencyList.tsx` — add badges, expandable details
- `src/components/search/SearchResults.tsx` — add badges, expandable details
- `src/components/tags/CompetencyTooltip.tsx` — add method pills
- `src/components/tree/TreeNode.tsx` — add badges where space allows
- New shared component: `src/components/competency/CompetencyBadges.tsx` — reusable domain/level badge rendering
- New shared component: `src/components/competency/CompetencyDetails.tsx` — expandable details panel

## Workstream 3: Tag-Based Filtering

### Filter Panel

New collapsible filter bar above competency lists in Browse and Search views.

**Controls:**
- **Domain** — multi-select checkboxes: K, S, A, C. OR logic (any selected domain matches)
- **Level** — multi-select checkboxes: K, KH, SH, P. OR logic
- **Core only** — toggle switch (existing, move into filter panel)
- **Teaching Method** — multi-select dropdown, populated dynamically from DB. AND logic (all selected methods must be present)
- **Assessment Method** — multi-select dropdown, AND logic

**UI behavior:**
- Filter bar collapsed by default, shows "Filters" button with active count badge
- Expands to show all controls
- Real-time filtering as controls change
- Filters combine with search queries (search "heart" + filter domain=K + assessment="Viva voce")
- Filter state persists across subject/topic changes within session
- "Clear all" button resets all filters

### API Changes

Extend existing endpoints to accept new query parameters:

**`/api/competencies?version=2024`** — add:
- `level` — comma-separated level values (OR match)
- `teachingMethod` — comma-separated method names (AND match, uses SQL LIKE)
- `assessmentMethod` — comma-separated method names (AND match, uses SQL LIKE)

**`/api/competencies/search?q=...&version=2024`** — same additional params

**SQL approach for method matching (AND logic):**
```sql
-- Example: assessment must include both "Viva voce" AND "Logbook"
WHERE assessment_methods LIKE '%Viva voce%'
  AND assessment_methods LIKE '%Logbook%'
```

### New Components

- `src/components/filters/FilterPanel.tsx` — collapsible filter bar
- `src/components/filters/MethodSelect.tsx` — multi-select dropdown for teaching/assessment methods
- `src/hooks/useCompetencyFilters.ts` — filter state management hook
- New API route or extension: endpoint to return distinct method values for populating dropdowns

### Files Modified

- `src/components/browse/BrowseInterface.tsx` — integrate FilterPanel
- `src/components/search/SearchInterface.tsx` — integrate FilterPanel
- `src/app/api/competencies/route.ts` — add filter params
- `src/app/api/competencies/search/route.ts` — add filter params
- `src/types/index.ts` — extend CompetencyFilters type
- `src/hooks/useCompetencyBrowse.ts` — pass filters to API
- `src/hooks/useCompetencySearch.ts` — pass filters to API

## Out of Scope

- No changes to Tree View layout/visualization (only badge rendering within existing nodes)
- No cleanup of 2019 database (can be done later with the same scripts)
- No changes to admin or import flows
- No Tagify integration (staying with custom React tag system)

## Dependencies

- Existing: Next.js, Tailwind, shadcn/ui, better-sqlite3
- New: `@anthropic-ai/sdk` for Haiku text cleanup script (dev dependency only, not used at runtime)

## Execution Order

1. Data cleanup (workstream 1) — must complete before display/filtering work
2. Rich display (workstream 2) — can start once data is clean
3. Filtering (workstream 3) — can be built in parallel with display, shares some components

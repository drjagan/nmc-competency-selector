/**
 * cleanup-text.ts
 * Fixes stuck-together words in competency_text and normalizes competency_level values.
 *
 * Usage:
 *   npx tsx scripts/cleanup-text.ts          # Preview mode (no DB writes)
 *   npx tsx scripts/cleanup-text.ts --apply  # Apply changes
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'competencies-2024.db');
const applyMode = process.argv.includes('--apply');

const db = new Database(DB_PATH);

// ─── TEXT FIXES ──────────────────────────────────────────────────────────────

const textPatterns: [RegExp, string][] = [
  // "Xofthe" → "X of the" (require lowercase before to avoid false positives)
  [/([a-z])ofthe\b/g, '$1 of the'],
  [/([a-z])andthe\b/g, '$1 and the'],
  [/([a-z])(?<!xpla)inthe\b/g, '$1 in the'],
  [/([a-z])isthe\b/g, '$1 is the'],
  [/([a-z])tothe\b/g, '$1 to the'],
  [/([a-z])forthe\b/g, '$1 for the'],
  [/([a-z])onthe\b/g, '$1 on the'],
  [/([a-z])atthe\b/g, '$1 at the'],
  [/([a-z])bythe\b/g, '$1 by the'],
  [/([a-z])withthe\b/g, '$1 with the'],
  [/([a-z])fromthe\b/g, '$1 from the'],
  // "Xofan" → "X of an"
  [/([a-z])ofan\b/g, '$1 of an'],
  // "Xofa" + uppercase → "X of a"
  [/([a-z])ofa([A-Z])/g, '$1 of a $2'],
  // "asa" → "as a" (use word boundary to avoid breaking words like "nasalization")
  [/\basa\b/g, 'as a'],
  // "Xinan" → "X in an"
  [/([a-z])inan\b/g, '$1 in an'],
  // "Xina" + uppercase → "X in a"
  [/([a-z])ina([A-Z])/g, '$1 in a $2'],
  // Lowercase-to-uppercase boundary (3+ lowercase chars then uppercase start)
  [/([a-z]{3,})([A-Z][a-z])/g, '$1 $2'],
];

function fixText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of textPatterns) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── LEVEL NORMALIZATION ─────────────────────────────────────────────────────

const CANONICAL_ORDER = ['K', 'KH', 'SH', 'P'];

function normalizeLevel(raw: string): string {
  if (!raw || !raw.trim()) return raw;

  let val = raw.trim();
  // Strip backticks
  val = val.replace(/`/g, '');
  // Strip trailing periods/dots
  val = val.replace(/\.+$/, '');

  // Normalize separators: replace comma, space, slash combos with a single /
  // First handle explicit separators
  val = val.replace(/[,\s/]+/g, '/');

  // Split into parts
  let parts = val.split('/').map(p => p.trim()).filter(Boolean);

  // Remove "C" (certification marker, not a level)
  parts = parts.filter(p => p !== 'C');

  // Map "S" → "SH", "A" → remove (unknown/invalid)
  parts = parts.map(p => {
    if (p === 'S') return 'SH';
    if (p === 'A') return ''; // drop invalid
    return p;
  }).filter(Boolean);

  // Deduplicate
  parts = [...new Set(parts)];

  // Sort in canonical order
  parts.sort((a, b) => {
    const ia = CANONICAL_ORDER.indexOf(a);
    const ib = CANONICAL_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return parts.join('/');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Mode: ${applyMode ? 'APPLY' : 'PREVIEW (dry run)'}\n`);

  // --- Text fixes ---
  const rows = db.prepare('SELECT id, competency_text FROM competencies WHERE competency_text IS NOT NULL').all() as { id: number; competency_text: string }[];

  const textChanges: { id: number; before: string; after: string }[] = [];

  for (const row of rows) {
    const fixed = fixText(row.competency_text);
    if (fixed !== row.competency_text) {
      textChanges.push({ id: row.id, before: row.competency_text, after: fixed });
    }
  }

  console.log(`=== TEXT FIXES (${textChanges.length} rows) ===\n`);
  for (const change of textChanges) {
    console.log(`  ID ${change.id}:`);
    console.log(`    BEFORE: ${change.before.substring(0, 150)}`);
    console.log(`    AFTER:  ${change.after.substring(0, 150)}`);
    console.log();
  }

  // --- Level normalization ---
  const levelRows = db.prepare('SELECT id, competency_level FROM competencies WHERE competency_level IS NOT NULL').all() as { id: number; competency_level: string }[];

  const levelChanges: { id: number; before: string; after: string }[] = [];

  for (const row of levelRows) {
    const normalized = normalizeLevel(row.competency_level);
    if (normalized !== row.competency_level) {
      levelChanges.push({ id: row.id, before: row.competency_level, after: normalized });
    }
  }

  console.log(`=== LEVEL NORMALIZATION (${levelChanges.length} rows) ===\n`);
  const levelSummary = new Map<string, string>();
  for (const change of levelChanges) {
    levelSummary.set(change.before, change.after);
  }
  for (const [before, after] of [...levelSummary.entries()].sort()) {
    console.log(`  "${before}" → "${after}"`);
  }
  console.log();

  // --- Apply ---
  if (applyMode) {
    console.log('Applying changes in a transaction...\n');

    const updateText = db.prepare('UPDATE competencies SET competency_text = ? WHERE id = ?');
    const updateLevel = db.prepare('UPDATE competencies SET competency_level = ? WHERE id = ?');

    db.transaction(() => {
      for (const change of textChanges) {
        updateText.run(change.after, change.id);
      }
      for (const change of levelChanges) {
        updateLevel.run(change.after, change.id);
      }
    })();

    console.log(`Applied ${textChanges.length} text fixes and ${levelChanges.length} level normalizations.\n`);

    // Show resulting distinct levels
    const distinctLevels = db.prepare('SELECT DISTINCT competency_level FROM competencies ORDER BY competency_level').all() as { competency_level: string }[];
    console.log('=== RESULTING DISTINCT LEVELS ===');
    for (const row of distinctLevels) {
      console.log(`  "${row.competency_level}"`);
    }
  } else {
    console.log('Run with --apply to apply these changes.');
  }
}

main();
db.close();

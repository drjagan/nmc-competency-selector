/**
 * fix-text-ai.ts
 * Uses Claude Haiku to fix stuck-together words in competency texts.
 * Targets texts with 15+ consecutive lowercase characters (heuristic for PDF extraction artifacts).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/fix-text-ai.ts          # Preview mode
 *   ANTHROPIC_API_KEY=... npx tsx scripts/fix-text-ai.ts --apply  # Apply changes
 */

import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'competencies-2024.db');
const applyMode = process.argv.includes('--apply');
const BATCH_SIZE = 10;

const client = new Anthropic();

interface Row {
  id: number;
  competency_text: string;
}

interface Change {
  id: number;
  before: string;
  after: string;
}

async function fixBatchWithAI(rows: Row[]): Promise<Map<number, string>> {
  const prompt = rows
    .map((r, i) => `[${i + 1}] ${r.competency_text}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Fix spacing and word boundary issues in these medical competency texts. Only fix spacing — do not change meaning, terminology, abbreviations, or structure. Return ONLY the corrected texts in the exact same format [N] text, one per line. If a text has no issues, return it unchanged.\n\n${prompt}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  const results = new Map<number, string>();
  const lines = responseText.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      const fixedText = match[2].trim();
      if (idx >= 0 && idx < rows.length) {
        results.set(rows[idx].id, fixedText);
      }
    }
  }

  return results;
}

async function main() {
  console.log(`Mode: ${applyMode ? 'APPLY' : 'PREVIEW (dry run)'}\n`);

  const db = new Database(DB_PATH);

  // Find rows with 15+ consecutive lowercase characters (stuck words)
  const allRows = db
    .prepare(
      'SELECT id, competency_text FROM competencies WHERE competency_text IS NOT NULL'
    )
    .all() as Row[];

  const stuckRows = allRows.filter((r) => /[a-z]{15,}/.test(r.competency_text));

  console.log(
    `Found ${stuckRows.length} rows with 15+ consecutive lowercase chars\n`
  );

  if (stuckRows.length === 0) {
    console.log('Nothing to fix.');
    db.close();
    return;
  }

  // Process in batches
  const allChanges: Change[] = [];
  const totalBatches = Math.ceil(stuckRows.length / BATCH_SIZE);

  for (let i = 0; i < stuckRows.length; i += BATCH_SIZE) {
    const batch = stuckRows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`Processing batch ${batchNum}/${totalBatches}...`);

    const fixes = await fixBatchWithAI(batch);

    for (const row of batch) {
      const fixed = fixes.get(row.id);
      if (fixed && fixed !== row.competency_text) {
        allChanges.push({ id: row.id, before: row.competency_text, after: fixed });
      }
    }
  }

  console.log(`\n=== AI TEXT FIXES (${allChanges.length} changes) ===\n`);
  for (const change of allChanges) {
    console.log(`  ID ${change.id}:`);
    console.log(`    BEFORE: ${change.before.substring(0, 200)}`);
    console.log(`    AFTER:  ${change.after.substring(0, 200)}`);
    console.log();
  }

  if (applyMode) {
    console.log('Applying changes in a transaction...\n');

    const update = db.prepare(
      'UPDATE competencies SET competency_text = ? WHERE id = ?'
    );

    db.transaction(() => {
      for (const change of allChanges) {
        update.run(change.after, change.id);
      }
    })();

    console.log(`Applied ${allChanges.length} AI text fixes.\n`);
  } else {
    console.log('Run with --apply to apply these changes.');
  }

  db.close();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

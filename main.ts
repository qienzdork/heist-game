// Midnight Vault — The Meridian Job: make.fun hand-in program (Node 22,
// standard library only). It copies this repository's game/ and screenshots/
// into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, so the sealed
// gate can check the game and the judge can read its outline.
//
// Outside the grader:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse to hand in a broken entry instead of shipping it silently: the
// game must exist with an index, and every screenshot must be a real file
// under the 256 KiB gate cap.
function assertHandInReady(): void {
  const index = join(repoRoot, 'game', 'index.html');
  if (!existsSync(index)) throw new Error('missing game/index.html');
  const shots = join(repoRoot, 'screenshots');
  if (!existsSync(shots)) throw new Error('missing screenshots/');
  const files = readdirSync(shots).filter((f) => !f.startsWith('.')).sort();
  if (files.length < 3 || files.length > 4) {
    throw new Error(`expected 3-4 screenshots, found ${files.length}`);
  }
  for (const file of files) {
    const size = statSync(join(shots, file)).size;
    if (size > 262144) throw new Error(`screenshot ${file} is ${size} bytes, over 256 KiB`);
  }
}

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

// The hand-in itself: validate, copy game/ and screenshots/, then write the
// dossier exactly as the vendored library builds it from those files.
assertHandInReady();
mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// Gate caps from the kit's RULES (game_files, screenshots, dossier): the
// dossier text is capped at 160 KiB, screenshots at 4 files / 256 KiB each,
// game/ at 993 files and directories and 48 MiB in all.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

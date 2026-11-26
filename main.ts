// main.ts — the entrypoint that hands NestEgg in (Node 22, stdlib only).
//
// The site is plain static files in app/ (index.html, CSS, ES modules, no
// build step, no network) and its screenshots in screenshots/. This program
// copies both into the output directory and writes dossier.json with the
// vendored make.fun library, which is the summary the judge reads.
//
// The grader runs this twice in a fresh container with no network; both
// runs must write the same bytes. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// vendor/makefun-frontend.ts is the kit's copy, unchanged: the scorer
// rebuilds the dossier with its own copy and compares the two byte for byte.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy a directory tree, refusing anything that is not a plain file or directory. */
function copyTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source)) {
    const from = join(source, name);
    const to = join(target, name);
    const info = statSync(from);
    if (info.isDirectory()) copyTree(from, to);
    else if (info.isFile()) cpSync(from, to);
    // Anything else (a symlink, socket, device) is refused: the gate only
    // accepts plain files and directories under app/ and screenshots/.
    else throw new Error(`refusing to copy non-file entry: ${from}`);
  }
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
}

// The caps match the gate's own limits: at most 4 screenshots of 256 KiB,
// at most 993 files and 16 MiB under app/, and the dossier text at 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

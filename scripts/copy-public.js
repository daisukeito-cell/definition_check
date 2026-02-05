import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');
const distDir = join(root, '..', 'dist');
const pdfWorkerSrc = join(root, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const pdfWorkerDest = join(distDir, 'pdf.worker.min.mjs');

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}

const stats = await stat(publicDir).catch(() => null);
if (!stats || !stats.isDirectory()) {
  throw new Error('public/ directory not found.');
}

await copyDir(publicDir, distDir);
await copyFile(pdfWorkerSrc, pdfWorkerDest);

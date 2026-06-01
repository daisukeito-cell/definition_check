/**
 * ローカル開発サーバー
 * - src / public の変更を監視して再ビルド
 * - dist を http://localhost:3000 で配信（Vercel本番と同じ構成）
 */
import { watch } from 'node:fs';
import { dirname, join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const preferredPort = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function build() {
  const buildProc = Bun.spawn({
    cmd: ['bun', 'build', './src/index.html', './src/check.html', '--outdir=dist'],
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await buildProc.exited) !== 0) {
    throw new Error('bun build に失敗しました');
  }

  const copyProc = Bun.spawn({
    cmd: ['bun', 'run', 'copy-public'],
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await copyProc.exited) !== 0) {
    throw new Error('copy-public に失敗しました');
  }
}

function resolveFilePath(urlPath) {
  let pathname = decodeURIComponent(urlPath.split('?')[0]);
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }
  const relative = pathname.replace(/^\//, '');
  const filePath = normalize(join(distDir, relative));
  if (!filePath.startsWith(distDir)) {
    return null;
  }
  return filePath;
}

async function serveStatic(filePath) {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return null;
  }
  const type = MIME[extname(filePath)] ?? 'application/octet-stream';
  return new Response(file, { headers: { 'Content-Type': type } });
}

let building = false;
let pendingRebuild = false;

async function runBuild() {
  if (building) {
    pendingRebuild = true;
    return;
  }
  building = true;
  try {
    console.log('\n[dev] 再ビルド中...');
    await build();
    console.log('[dev] ビルド完了\n');
  } catch (err) {
    console.error('[dev] ビルドエラー:', err instanceof Error ? err.message : err);
  } finally {
    building = false;
    if (pendingRebuild) {
      pendingRebuild = false;
      await runBuild();
    }
  }
}

console.log('[dev] 初回ビルド...');
await build();

let debounceTimer;
function scheduleRebuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runBuild();
  }, 400);
}

for (const watchDir of [join(root, 'src'), join(root, 'public')]) {
  watch(watchDir, { recursive: true }, () => scheduleRebuild());
}

function startServer() {
  const fetchHandler = async (req) => {
    const filePath = resolveFilePath(new URL(req.url).pathname);
    if (!filePath) {
      return new Response('Not Found', { status: 404 });
    }
    const response = await serveStatic(filePath);
    return response ?? new Response('Not Found', { status: 404 });
  };

  for (let offset = 0; offset < 10; offset += 1) {
    const port = preferredPort + offset;
    try {
      return Bun.serve({ port, fetch: fetchHandler });
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
      if (code !== 'EADDRINUSE') {
        throw err;
      }
      if (offset === 0) {
        console.warn(`[dev] ポート ${port} は使用中のため別ポートを試します...`);
      }
    }
  }
  throw new Error(
    `[dev] ポート ${preferredPort}〜${preferredPort + 9} はすべて使用中です。PORT=3010 などを指定するか、既存のサーバーを終了してください。`,
  );
}

const server = startServer();

console.log('');
console.log(`[dev] 演習ルーム:       http://localhost:${server.port}/`);
console.log(`[dev] 定義チェック:     http://localhost:${server.port}/check.html`);
console.log(`[dev] 端末セットアップ: http://localhost:${server.port}/setup_Tool/AI_setup.html`);
console.log('[dev] src / public を保存すると自動で再ビルドします（Ctrl+C で終了）');
console.log('');

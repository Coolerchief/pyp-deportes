// Generates public/img/placeholder/<category>.webp from the ImagenGenerica component (T0.5).
//
// Starts `next dev` (the /dev/genericas sheet only exists there), screenshots each tile with
// Playwright's Chromium and encodes it with sharp. Set PLACEHOLDERS_URL to reuse a running
// dev server, e.g. PLACEHOLDERS_URL=http://localhost:3000 pnpm placeholders.

import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const webDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../public/img/placeholder/', import.meta.url));
const config = JSON.parse(await readFile(new URL('./placeholders.json', import.meta.url), 'utf8'));

const PORT = 3200;
let server;
let baseUrl = process.env.PLACEHOLDERS_URL;

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`El servidor no respondió en ${url}`);
}

function stopServer() {
  if (!server || server.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    process.kill(-server.pid, 'SIGTERM');
  }
}

async function main() {
  if (!baseUrl) {
    baseUrl = `http://localhost:${PORT}`;
    server = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'dev', '--port', String(PORT)],
      { cwd: webDir, stdio: 'ignore', detached: process.platform !== 'win32' },
    );
  }
  const pageUrl = `${baseUrl}/dev/genericas`;
  await waitForServer(pageUrl);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: config.scale,
    });
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    // Fonts, monogram images and no dev overlay before capturing.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
      document.querySelectorAll('nextjs-portal').forEach((node) => node.remove());
    });

    await mkdir(outDir, { recursive: true });
    for (const { slug } of config.categories) {
      // Exact 4:5 clip: an element screenshot rounds fractional positions outward (1px extra).
      const box = await page.locator(`[data-placeholder="${slug}"] > div`).boundingBox();
      const clip = {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: config.cssWidth,
        height: (config.cssWidth * 5) / 4,
      };
      const png = await page.screenshot({ clip, animations: 'disabled', scale: 'device' });
      const webp = await sharp(png).webp({ quality: config.quality, effort: 6 }).toBuffer();
      await writeFile(`${outDir}${slug}.webp`, webp);
      const { width, height } = await sharp(webp).metadata();
      console.log(`${slug}.webp  ${width}×${height}  ${(webp.length / 1024).toFixed(1)} KB`);
    }
  } finally {
    await browser.close();
  }
}

try {
  await main();
} finally {
  stopServer();
}

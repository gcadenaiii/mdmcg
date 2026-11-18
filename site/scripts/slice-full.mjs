/* Cuts every *_full.png in a folder into consecutive pieces a reviewer can read.  node scripts/slice-full.mjs <dir> */
import sharp from 'sharp';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
const dir = process.argv[2];
for (const f of (await readdir(dir)).filter((x) => x.endsWith('_full.png'))) {
  const src = path.join(dir, f); const m = await sharp(src).metadata();
  const step = m.width > 1000 ? 1500 : 1600; let i = 0;
  for (let y = 0; y < m.height; y += step) await sharp(src).extract({ left: 0, top: y, width: m.width, height: Math.min(step, m.height - y) }).toFile(path.join(dir, f.replace('_full.png', `_part${String(++i).padStart(2, '0')}.png`)));
  await unlink(src);
}

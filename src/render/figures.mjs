// 그림 임베드: L.그림[].src(작업폴더 상대경로) → data URI. 단일 파일 자체완결 유지.
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

/** L.그림[].src를 읽어 data URI(embed)로 채운다. 파일이 없는 항목은 경고 후 제외(깨진 <img> 방지). */
export function embedFigures(L, root) {
  if (!Array.isArray(L.그림)) return { embedded: 0, missing: 0 };
  const kept = []; let missing = 0;
  for (const f of L.그림) {
    if (!f || typeof f.src !== 'string') continue;
    const p = path.isAbsolute(f.src) ? f.src : path.join(root, f.src);
    if (!fs.existsSync(p)) { console.warn(`  그림 없음(건너뜀): ${f.src}`); missing++; continue; }
    const mime = MIME[path.extname(p).toLowerCase()] || 'image/png';
    f.embed = `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
    kept.push(f);
  }
  L.그림 = kept;
  return { embedded: kept.length, missing };
}

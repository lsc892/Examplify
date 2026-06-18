// HWP 5.0(OLE 복합 파일) → 텍스트 추출. LibreOffice가 .hwp를 못 열 때의 폴백.
// 본문(BodyText/SectionN)은 raw-deflate 압축, PARA_TEXT 레코드에 UTF-16LE 텍스트가 들어있다.

const HWPTAG_PARA_TEXT = 67; // HWPTAG_BEGIN(0x10) + 51
// 8 WCHAR(16바이트) 폭을 차지하는 제어문자(인라인/확장).
const WIDE_CTRL = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);

/** HWP5 레코드 스트림 파싱 → [{tagID, level, data:Buffer}]. */
export function parseRecords(buf) {
  const recs = [];
  let i = 0;
  while (i + 4 <= buf.length) {
    const header = buf.readUInt32LE(i); i += 4;
    const tagID = header & 0x3ff;
    const level = (header >> 10) & 0x3ff;
    let size = (header >> 20) & 0xfff;
    if (size === 0xfff) { size = buf.readUInt32LE(i); i += 4; }
    recs.push({ tagID, level, data: buf.subarray(i, i + size) });
    i += size;
  }
  return recs;
}

/** 한 섹션 버퍼에서 PARA_TEXT 텍스트를 추출. */
export function extractParaText(sectionBuf) {
  let out = '';
  for (const r of parseRecords(sectionBuf)) {
    if (r.tagID !== HWPTAG_PARA_TEXT) continue;
    const d = r.data; let s = '';
    for (let j = 0; j + 1 < d.length;) {
      const code = d.readUInt16LE(j);
      if (WIDE_CTRL.has(code)) { j += 16; continue; }     // 8 WCHAR
      if (code === 13 || code === 10) { s += '\n'; j += 2; continue; }
      if (code === 9) { s += '\t'; j += 2; continue; }
      if (code < 32) { j += 2; continue; }
      s += String.fromCharCode(code); j += 2;
    }
    if (s.trim()) out += s + '\n';
  }
  return out;
}

/** .hwp 버퍼 → 본문 텍스트. cfb/fflate 없으면 null(호출부가 스킵). */
export async function hwpToText(buffer) {
  let CFB, fflate;
  try { const mod = await import('cfb'); CFB = mod.default ?? mod; }
  catch { return null; }
  try { fflate = await import('fflate'); }
  catch { return null; }

  const c = CFB.read(new Uint8Array(buffer), { type: 'buffer' });
  const idxOf = suffix => c.FullPaths.findIndex(p => p.endsWith(suffix));

  const fhI = idxOf('FileHeader');
  const compressed = fhI >= 0 ? (Buffer.from(c.FileIndex[fhI].content)[36] & 1) === 1 : true;

  const sections = c.FullPaths
    .map((p, i) => ({ p, i }))
    .filter(x => /BodyText\/Section\d+$/i.test(x.p))
    .sort((a, b) => a.p.localeCompare(b.p, 'en', { numeric: true }));

  let text = '';
  for (const { i } of sections) {
    let buf = Buffer.from(c.FileIndex[i].content);
    if (compressed) { try { buf = Buffer.from(fflate.inflateSync(new Uint8Array(buf))); } catch { /* 비압축 시도 */ } }
    text += extractParaText(buf);
  }
  return text.trim();
}

// XLSX → 텍스트 추출. 순수 파서는 의존성 없음.

/** xl/sharedStrings.xml → 문자열 배열(인덱스 = string id). */
export function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t, s = '';
    while ((t = tRe.exec(m[1]))) s += decodeXml(t[1]);
    out.push(s);
  }
  return out;
}

/** 워크시트 XML → [{ref, value}]. type="s"는 sharedStrings로 해석. */
export function parseSheet(xml, sharedStrings = []) {
  if (!xml) return [];
  const cells = [];
  const cRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  let m;
  while ((m = cRe.exec(xml))) {
    const attrs = m[1], body = m[2];
    const ref = (attrs.match(/r="([^"]+)"/) || [])[1] || '';
    const type = (attrs.match(/t="([^"]+)"/) || [])[1] || 'n';
    let value = '';
    if (type === 's') {
      const idx = Number((body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]);
      value = sharedStrings[idx] ?? '';
    } else if (type === 'inlineStr') {
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g; let t;
      while ((t = tRe.exec(body))) value += decodeXml(t[1]);
    } else {
      value = decodeXml((body.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '');
    }
    if (ref && value !== '') cells.push({ ref, value });
  }
  return cells;
}

function decodeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // &amp; 마지막(이중 디코드 방지)
}

/** xlsx 버퍼 → "Sheet!Ref\tvalue" 텍스트. fflate 없으면 null(호출부가 스킵). */
export async function xlsxToText(buffer) {
  let unzipSync;
  try { ({ unzipSync } = await import('fflate')); }
  catch { return null; }
  const files = unzipSync(new Uint8Array(buffer));
  const dec = new TextDecoder('utf-8');
  const sharedXml = files['xl/sharedStrings.xml'] ? dec.decode(files['xl/sharedStrings.xml']) : '';
  const shared = parseSharedStrings(sharedXml);
  const lines = [];
  for (const name of Object.keys(files)) {
    const m = name.match(/^xl\/worksheets\/(sheet\d+)\.xml$/);
    if (!m) continue;
    for (const c of parseSheet(dec.decode(files[name]), shared)) {
      lines.push(`${m[1]}!${c.ref}\t${c.value}`);
    }
  }
  return lines.join('\n');
}

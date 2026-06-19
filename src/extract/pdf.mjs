// PDF → 텍스트 추출(pdfjs-dist, Node). 이미 PDF인 자료를 분석용 텍스트로 덤프.

/** 여러 공백/개행 정리(순수, 테스트 대상). */
export function collapseWs(s) {
  return String(s ?? '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** .pdf 버퍼 → 페이지 표시가 붙은 본문 텍스트. pdfjs 없으면 null(호출부가 스킵). */
export async function pdfToText(buffer) {
  let pdfjs;
  try { pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'); }
  catch { return null; }
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push(`[p.${p}] ` + content.items.map(i => i.str).join(' '));
  }
  return collapseWs(pages.join('\n'));
}

/**
 * .pdf 버퍼 → 페이지별 `## p.N` 헤더가 붙은 마크다운(폴백용, 이미지 없음).
 * Python(pymupdf4llm) 미설치 시 artifacts/build/md/<file>.md 를 이 텍스트로 대체한다.
 * pdfjs 없으면 null.
 */
export async function pdfToMarkdown(buffer) {
  let pdfjs;
  try { pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'); }
  catch { return null; }
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false,
  }).promise;
  const parts = ['> 폴백 추출(텍스트만, 이미지 없음). 그림/사진은 artifacts/build/pages PNG로 시각 판독.\n'];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    parts.push(`## p.${p}\n\n` + collapseWs(content.items.map(i => i.str).join(' ')));
  }
  return parts.join('\n\n');
}

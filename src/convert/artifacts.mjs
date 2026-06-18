// build 산출물의 경로 규칙·검증(순수). 파일명 충돌 방지와 pymupdf4llm 경로 안전화 포함.
import path from 'node:path';

/** 원본 → 기대 PDF 경로. .pdf는 그대로 통과(이름 유지), 그 외는 파일명 전체+.pdf로 충돌 방지. */
export function expectedPdf(srcFile, outdir) {
  if (path.extname(srcFile).toLowerCase() === '.pdf') return path.join(outdir, path.basename(srcFile));
  return path.join(outdir, `${path.basename(srcFile)}.pdf`);
}

/** soffice가 실제로 출력하는 경로(<base>.pdf, 원본 확장자 제거). */
export function sofficeOutputPdf(srcFile, outdir) {
  return path.join(outdir, `${path.basename(srcFile, path.extname(srcFile))}.pdf`);
}

/** 출력 디렉터리/파일명 안전화: 공백류를 _로(pymupdf4llm가 image_path 공백을 치환해 경로 불일치 유발). */
export function safeName(name) {
  return String(name).replace(/\s+/g, '_');
}

/** PDF(또는 원본) → 마크다운 출력 경로. build/md/<safe-basename>.md */
export function mdPath(srcOrPdf, mdDir) {
  return path.join(mdDir, `${safeName(path.basename(srcOrPdf))}.md`);
}

/** PDF(또는 원본) → 페이지 PNG 디렉터리. build/pages/<safe-basename>/ */
export function pagesDir(srcOrPdf, pagesRoot) {
  return path.join(pagesRoot, safeName(path.basename(srcOrPdf)));
}

/** PDF(또는 원본) → 임베디드 이미지 디렉터리. build/md/<safe-basename>.assets/ */
export function assetsDir(srcOrPdf, mdDir) {
  return path.join(mdDir, `${safeName(path.basename(srcOrPdf))}.assets`);
}

/** 각 원본이 비어있지 않은 PDF를 냈는지 검증. statSize(p)->number|null. */
export function verifyOutputs(sources, outdir, statSize) {
  return sources.map(src => {
    const pdf = expectedPdf(src, outdir);
    const size = statSize(pdf);
    return { src, pdf, ok: size != null && size > 0, size: size ?? 0 };
  });
}

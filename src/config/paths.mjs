// 경로·디렉터리 설정 한 곳. 엔진(번들) 자산은 패키지 루트 기준, 작업 산출물은 ROOT 기준.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 패키지 루트: src/config/paths.mjs → ../../ . 어디서 실행하든 고정(번들 위치).
export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// 번들 자산(실행 위치와 무관).
export const PY_SCRIPT = path.join(PKG_ROOT, 'scripts', 'pdf_to_md.py');
export const CSS_FILE = path.join(PKG_ROOT, 'templates', 'guide.css');

export const DEFAULT_DPI = 150;

/** 작업 폴더(ROOT) 기준 디렉터리 묶음. EXAM_GUIDE_DIR 미지정 시 현재 작업 디렉터리. */
export function workspace(root = process.env.EXAM_GUIDE_DIR || process.cwd()) {
  return {
    root,
    srcDir: path.join(root, 'Lecture slides'),
    pdfDir: path.join(root, 'build', 'pdf'),
    dumpDir: path.join(root, 'build', 'xlsx-dump'),
    hwpDir: path.join(root, 'build', 'hwp-dump'),
    mdDir: path.join(root, 'build', 'md'),
    pagesRoot: path.join(root, 'build', 'pages'),
    lecDir: path.join(root, 'Analyze', 'lectures'),
    courseJson: path.join(root, 'Analyze', 'course.json'),
    outHtml: path.join(root, 'output', 'study-guide.html'),
  };
}

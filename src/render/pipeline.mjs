// 렌더 파이프라인: Analyze/*.json 검증·그림 임베드 → output/study-guide.html (자체완결 단일 파일).
import fs from 'node:fs';
import path from 'node:path';
import { workspace, CSS_FILE } from '../config/paths.mjs';
import { buildHtml } from './html.mjs';
import { embedFigures } from './figures.mjs';
import { validateLecture, validateCourse } from '../schema/validate.mjs';

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

export function runRender(ws = workspace()) {
  const { root, lecDir, courseJson, outHtml } = ws;
  if (!fs.existsSync(courseJson)) {
    console.error('Analyze/course.json 없음 — 분석 단계를 먼저 완료하세요.'); process.exit(1);
  }
  const course = readJson(courseJson);
  const cv = validateCourse(course);
  if (!cv.ok) { console.error('course.json 검증 실패:\n  - ' + cv.errors.join('\n  - ')); process.exit(1); }

  const files = fs.existsSync(lecDir)
    ? fs.readdirSync(lecDir).filter(f => f.endsWith('.json')).sort() : [];
  if (files.length === 0) { console.error('Analyze/lectures/*.json 없음.'); process.exit(1); }

  const lectures = []; let bad = 0, figs = 0, figMiss = 0;
  for (const f of files) {
    const L = readJson(path.join(lecDir, f));
    const v = validateLecture(L);
    if (!v.ok) { console.warn(`검증 경고 ${f}:\n  - ${v.errors.join('\n  - ')}`); bad++; }
    const r = embedFigures(L, root);
    figs += r.embedded; figMiss += r.missing;
    lectures.push(L);
  }
  const css = fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '';
  const html = buildHtml({ course, lectures, css });
  fs.mkdirSync(path.dirname(outHtml), { recursive: true });
  fs.writeFileSync(outHtml, html, 'utf8');
  console.log(`생성 완료: ${outHtml} (강의 ${lectures.length}개, 검증 경고 ${bad}개, 그림 ${figs}개 임베드${figMiss ? `, 누락 ${figMiss}개` : ''})`);
}

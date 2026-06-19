// 분석 산출물 검증 실행: desk/analyze/lectures/*.json·course.json 을 스키마로 점검. 실패 시 exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { workspace } from '../config/paths.mjs';
import { validateLecture, validateCourse } from './validate.mjs';

export function runValidate(ws = workspace()) {
  let fail = 0;
  if (fs.existsSync(ws.lecDir)) {
    for (const f of fs.readdirSync(ws.lecDir).filter(n => n.endsWith('.json'))) {
      const r = validateLecture(JSON.parse(fs.readFileSync(path.join(ws.lecDir, f), 'utf8')));
      console.log(`${f}: ${r.ok ? 'OK' : 'FAIL'}`);
      if (!r.ok) { fail++; r.errors.forEach(e => console.log('  - ' + e)); }
    }
  }
  if (fs.existsSync(ws.courseJson)) {
    const r = validateCourse(JSON.parse(fs.readFileSync(ws.courseJson, 'utf8')));
    console.log(`course.json: ${r.ok ? 'OK' : 'FAIL'}`);
    if (!r.ok) { fail++; r.errors.forEach(e => console.log('  - ' + e)); }
  }
  process.exit(fail ? 1 : 0);
}

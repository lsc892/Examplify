const LEVELS = ['high', 'med', 'low'];

/** 강의 분석 객체 검증 → {ok, errors:string[]}. */
export function validateLecture(o) {
  const e = [];
  if (!o || typeof o !== 'object') return { ok: false, errors: ['루트가 객체가 아님'] };
  for (const k of ['lecture', 'title', 'topic'])
    if (typeof o[k] !== 'string' || !o[k]) e.push(`필수 문자열 누락: ${k}`);
  for (const k of ['이해할_개념', '외울_것', '공식', '예상_출제포인트'])
    if (!Array.isArray(o[k])) e.push(`배열 필드 누락: ${k}`);
  (Array.isArray(o.이해할_개념) ? o.이해할_개념 : []).forEach((c, i) => {
    for (const k of ['term', 'explain', 'why', 'exam'])
      if (!c || typeof c[k] !== 'string') e.push(`이해할_개념[${i}].${k} 누락`);
    if (c && !LEVELS.includes(c.exam)) e.push(`이해할_개념[${i}].exam 값 오류`);
  });
  (Array.isArray(o.외울_것) ? o.외울_것 : []).forEach((m, i) => {
    for (const k of ['item', 'content', 'exam'])
      if (!m || typeof m[k] !== 'string') e.push(`외울_것[${i}].${k} 누락`);
    if (m && !LEVELS.includes(m.exam)) e.push(`외울_것[${i}].exam 값 오류`);
  });
  (Array.isArray(o.공식) ? o.공식 : []).forEach((f, i) => {
    for (const k of ['name', 'tex'])
      if (!f || typeof f[k] !== 'string') e.push(`공식[${i}].${k} 누락`);
  });
  // 그림(선택): 있으면 배열, 각 항목은 src·caption 문자열 필수.
  if (o.그림 !== undefined && !Array.isArray(o.그림)) e.push('배열 필드 오류: 그림');
  (Array.isArray(o.그림) ? o.그림 : []).forEach((g, i) => {
    for (const k of ['src', 'caption'])
      if (!g || typeof g[k] !== 'string') e.push(`그림[${i}].${k} 누락`);
  });
  // 문제(선택): 문제풀이 모드용. 있으면 배열, 각 항목은 type(객관식|주관식)별 형식.
  if (o.문제 !== undefined && !Array.isArray(o.문제)) e.push('배열 필드 오류: 문제');
  (Array.isArray(o.문제) ? o.문제 : []).forEach((q, i) => {
    if (!q || typeof q !== 'object') { e.push(`문제[${i}] 객체 아님`); return; }
    if (q.type !== '객관식' && q.type !== '주관식') e.push(`문제[${i}].type 은 객관식|주관식`);
    if (typeof q.q !== 'string' || !q.q) e.push(`문제[${i}].q 누락`);
    if (q.type === '객관식') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) e.push(`문제[${i}].choices 2개 이상 필요`);
      const n = Array.isArray(q.choices) ? q.choices.length : 0;
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= n) e.push(`문제[${i}].answer 인덱스(0-base) 오류`);
    } else if (q.type === '주관식') {
      if (typeof q.answer !== 'string' || !q.answer) e.push(`문제[${i}].answer(모범답안) 누락`);
    }
  });
  return { ok: e.length === 0, errors: e };
}

/** 과목 종합 객체 검증. */
export function validateCourse(o) {
  const e = [];
  if (!o || typeof o !== 'object') return { ok: false, errors: ['루트가 객체가 아님'] };
  for (const k of ['course', 'summary'])
    if (typeof o[k] !== 'string' || !o[k]) e.push(`필수 문자열 누락: ${k}`);
  if (!Array.isArray(o.시험_출제경향)) e.push('배열 필드 누락: 시험_출제경향');
  if (!Array.isArray(o.학습_우선순위)) e.push('배열 필드 누락: 학습_우선순위');
  (Array.isArray(o.시험_출제경향) ? o.시험_출제경향 : []).forEach((t, i) => {
    for (const k of ['topic', 'likelihood', '근거'])
      if (!t || typeof t[k] !== 'string') e.push(`시험_출제경향[${i}].${k} 누락`);
  });
  return { ok: e.length === 0, errors: e };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLecture, validateCourse } from './validate.mjs';

const goodLecture = {
  lecture: 'Lec5_1', title: 'Trip Distribution', topic: '통행분포',
  이해할_개념: [{ term: '중력모형', explain: 'x', why: 'y', exam: 'high', src: 'p.5' }],
  외울_것: [{ item: '중력모형 식', content: 'Tij=...', exam: 'high' }],
  공식: [{ name: '중력모형', tex: 'T_{ij}=...' }],
  예상_출제포인트: ['분포 1회 반복'],
};

test('validateLecture: 정상 객체 통과', () => {
  assert.equal(validateLecture(goodLecture).ok, true);
});

test('validateLecture: 필수 문자열 누락 감지', () => {
  const bad = { ...goodLecture, title: undefined };
  const r = validateLecture(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('title')));
});

test('validateLecture: 배열 필드 누락 감지', () => {
  const bad = { ...goodLecture, 외울_것: undefined };
  assert.equal(validateLecture(bad).ok, false);
});

test('validateLecture: exam 값 오류 감지', () => {
  const bad = { ...goodLecture, 이해할_개념: [{ term: 'a', explain: 'b', why: 'c', exam: 'HOT' }] };
  assert.ok(validateLecture(bad).errors.some(e => e.includes('exam')));
});

test('validateLecture: 그림 선택 필드 없어도 통과', () => {
  assert.equal(validateLecture(goodLecture).ok, true);  // 그림 미포함
});

test('validateLecture: 그림 정상 항목 통과', () => {
  const ok = { ...goodLecture, 그림: [{ src: 'artifacts/build/pages/L05/p003.png', caption: '현시도', why: '흐름' }] };
  assert.equal(validateLecture(ok).ok, true);
});

test('validateLecture: 그림 항목 src/caption 누락 감지', () => {
  const bad = { ...goodLecture, 그림: [{ caption: '캡션만' }] };
  const r = validateLecture(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('그림[0].src')));
});

test('validateCourse: 정상/이상', () => {
  const good = { course: '교통수요분석', summary: 's',
    시험_출제경향: [{ topic: '로짓', likelihood: 'high', 근거: '예제' }], 학습_우선순위: ['a'] };
  assert.equal(validateCourse(good).ok, true);
  assert.equal(validateCourse({ course: '', summary: 's', 시험_출제경향: [], 학습_우선순위: [] }).ok, false);
});

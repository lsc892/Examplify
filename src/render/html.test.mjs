import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml, lectureAnchor, renderConceptTable, renderMemorizeTable,
  renderFormulaTable, renderFigures, renderLectureSection, renderToc, buildHtml,
  normalizeQuestions, quizData,
} from './html.mjs';

test('escapeHtml: 위험 문자 이스케이프', () => {
  assert.equal(escapeHtml('<a> & "b" \'c\''), '&lt;a&gt; &amp; &quot;b&quot; &#39;c&#39;');
});

test('lectureAnchor: 안전한 앵커', () => {
  assert.equal(lectureAnchor('Lec7_1'), 'lec-Lec7_1');
});

test('renderConceptTable: 개념|설명 표, "왜 중요" 미포함', () => {
  const h = renderConceptTable({ 이해할_개념: [
    { term: '중력모형', explain: '설명문', why: '이유텍스트', exam: 'high' }] });
  assert.match(h, /<table class="study concepts">/);
  assert.match(h, /중력모형/); assert.match(h, /설명문/);
  assert.doesNotMatch(h, /이유텍스트/);  // why 제거됨
  assert.doesNotMatch(h, /badge/);        // 뱃지 제거됨
});

test('renderConceptTable: 빈 배열 → 빈 문자열', () => {
  assert.equal(renderConceptTable({ 이해할_개념: [] }), '');
});

test('renderMemorizeTable: 항목|내용, 팁은 내용 아래(div.tip)', () => {
  const h = renderMemorizeTable({ 외울_것: [
    { item: '식', content: '내용텍스트', tip: '팁텍스트', exam: 'high' }] });
  assert.match(h, /<table class="study memorize">/);
  assert.match(h, /내용텍스트/);
  assert.match(h, /<div class="tip">팁: 팁텍스트<\/div>/);
  // 팁이 내용 뒤에 위치
  assert.ok(h.indexOf('내용텍스트') < h.indexOf('팁텍스트'));
});

test('renderFormulaTable: 수식을 $...$로 감싸 출력 + 공식명', () => {
  const h = renderFormulaTable({ 공식: [{ name: '중력', tex: 'T_{ij}', vars: 'v' }] });
  assert.match(h, /\$T_\{ij\}\$/); assert.match(h, /중력/);
});

test('renderFigures: embed(data URI) 우선 사용 + 캡션/why', () => {
  const h = renderFigures({ 그림: [
    { src: 'build/pages/L05/p003.png', embed: 'data:image/png;base64,AAAA',
      caption: '신호 현시도', why: '제어 흐름 이해' }] });
  assert.match(h, /<h3>핵심 그림<\/h3>/);
  assert.match(h, /src="data:image\/png;base64,AAAA"/);  // embed 사용
  assert.match(h, /신호 현시도/);
  assert.match(h, /<span class="why"> — 제어 흐름 이해<\/span>/);
});

test('renderFigures: embed 없으면 src로 폴백, why 생략 가능', () => {
  const h = renderFigures({ 그림: [{ src: 'a.png', caption: 'cap' }] });
  assert.match(h, /src="a\.png"/);
  assert.doesNotMatch(h, /class="why"/);
});

test('renderFigures: embed·src 둘 다 없는 항목은 제외, 전부 없으면 빈 문자열', () => {
  assert.equal(renderFigures({ 그림: [{ caption: 'x' }] }), '');
  assert.equal(renderFigures({}), '');
});

test('renderLectureSection: 앵커 id + 개념/외울 것 헤딩', () => {
  const h = renderLectureSection({ lecture: 'Lec5_1', title: 'TD', topic: '통행분포',
    이해할_개념: [{ term: 'a', explain: 'b' }], 외울_것: [{ item: 'c', content: 'd' }], 공식: [] });
  assert.match(h, /id="lec-Lec5_1"/);
  assert.match(h, /이해할 개념/); assert.match(h, /외울 것/);
});

test('renderToc: 강의 링크 + 검색 입력', () => {
  const h = renderToc([{ lecture: 'Lec5_1', title: 'TD' }]);
  assert.match(h, /href="#lec-Lec5_1"/); assert.match(h, /toc-filter/);
});

test('renderToc: 강의별 체크박스 + 문제풀이 버튼 + 선택 영역', () => {
  const h = renderToc([{ lecture: 'Lec5_1', title: 'TD' }]);
  assert.match(h, /class="toc-check" data-anchor="lec-Lec5_1"/);
  assert.match(h, /id="toc-list"/);
  assert.match(h, /id="toc-selected"/);
  assert.match(h, /id="open-quiz"[^>]*>📝 문제풀이/);
});

test('normalizeQuestions: 객관식 정규화 + answer 인덱스 클램프', () => {
  const qs = normalizeQuestions({ 문제: [
    { type: '객관식', q: '?', choices: ['a', 'b', 'c'], answer: 1 },
    { type: '객관식', q: '?', choices: ['a', 'b'], answer: 9 },  // 범위 밖 → 0
  ] });
  assert.equal(qs.length, 2);
  assert.equal(qs[0].answer, 1); assert.equal(qs[1].answer, 0);
});

test('normalizeQuestions: 주관식은 모범답안 필수, 불량 항목 제거', () => {
  const qs = normalizeQuestions({ 문제: [
    { type: '주관식', q: '설명?', answer: '모범답안' },
    { type: '주관식', q: '답없음' },                 // answer 없음 → 제거
    { type: '객관식', q: '선지부족', choices: ['a'], answer: 0 },  // choice<2 → 제거
    { q: '' },                                         // 빈 q → 제거
  ] });
  assert.equal(qs.length, 1);
  assert.equal(qs[0].type, '주관식'); assert.equal(qs[0].answer, '모범답안');
});

test('normalizeQuestions: 문제 필드 없으면 빈 배열', () => {
  assert.deepEqual(normalizeQuestions({}), []);
});

test('quizData: 강의별 anchor + 정규화된 questions', () => {
  const d = quizData([{ lecture: 'Lec5_1', title: 'TD',
    문제: [{ type: '객관식', q: '?', choices: ['a', 'b'], answer: 0 }] }]);
  assert.equal(d[0].anchor, 'lec-Lec5_1');
  assert.equal(d[0].questions.length, 1);
});

test('buildHtml: 강의 섹션만, 출제경향/공식시트/체크리스트 미포함', () => {
  const html = buildHtml({
    course: { course: '교통수요분석' },
    lectures: [{ lecture: 'Lec5_1', title: 'TD', topic: '통행분포',
      이해할_개념: [{ term: 'a', explain: 'b' }], 외울_것: [], 공식: [] }],
    css: 'body{}',
  });
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /id="lec-Lec5_1"/);
  assert.match(html, /katex/);        // 수식 자산
  assert.match(html, /body\{\}/);     // CSS 주입
  assert.doesNotMatch(html, /id="exam-trends"/);
  assert.doesNotMatch(html, /id="formula-sheet"/);
  assert.doesNotMatch(html, /id="checklist"/);
});

test('buildHtml: 퀴즈 모달 + 임베드된 quiz-data(JSON, <안전)', () => {
  const html = buildHtml({
    course: { course: '교통수요분석' },
    lectures: [{ lecture: 'Lec5_1', title: 'TD', topic: 't',
      이해할_개념: [], 외울_것: [], 공식: [],
      문제: [{ type: '객관식', q: 'x<y?', choices: ['a', 'b'], answer: 0 }] }],
    css: 'body{}',
  });
  assert.match(html, /id="quiz-modal"/);
  assert.match(html, /id="quiz-data"/);
  assert.match(html, /id="open-quiz"/);
  // JSON 안의 < 는 \\u003c 로 이스케이프되어 </script> 조기 종료 방지
  assert.match(html, /x\\u003cy\?/);
  assert.doesNotMatch(html, /x<y\?/);
});

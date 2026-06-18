import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSharedStrings, parseSheet } from './xlsx.mjs';

test('parseSharedStrings: <si>의 <t> 런들을 합쳐 배열로', () => {
  const xml = '<sst><si><t>Hello</t></si><si><t>A</t><t>B</t></si></sst>';
  assert.deepEqual(parseSharedStrings(xml), ['Hello', 'AB']);
});

test('parseSharedStrings: XML 엔티티 디코드', () => {
  assert.deepEqual(parseSharedStrings('<si><t>a &amp; b</t></si>'), ['a & b']);
});

test('parseSharedStrings: 빈 입력 → 빈 배열', () => {
  assert.deepEqual(parseSharedStrings(''), []);
});

test('parseSheet: 공유문자열(type="s") 셀 해석', () => {
  const shared = ['편익', '비용'];
  const xml = '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c>';
  assert.deepEqual(parseSheet(xml, shared), [
    { ref: 'A1', value: '편익' }, { ref: 'B1', value: '비용' }]);
});

test('parseSheet: 숫자 셀(type 없음) 읽기', () => {
  assert.deepEqual(parseSheet('<c r="A2"><v>1234.5</v></c>'),
    [{ ref: 'A2', value: '1234.5' }]);
});

test('parseSheet: inlineStr 셀', () => {
  assert.deepEqual(parseSheet('<c r="C3" t="inlineStr"><is><t>X</t></is></c>'),
    [{ ref: 'C3', value: 'X' }]);
});

import { xlsxToText } from './xlsx.mjs';
import fs from 'node:fs';

test('xlsxToText: 실제 Lec6_2 워크북에서 텍스트 추출(fflate 있을 때만)', async () => {
  const p = 'Lecture slides/Lec6_2_4단계 모형 - 화물철도 경제성분석.xlsx';
  if (!fs.existsSync(p)) return;            // 파일 없으면 스킵
  const text = await xlsxToText(fs.readFileSync(p));
  if (text === null) return;                // fflate 미설치 → 스킵(그레이스풀)
  assert.ok(text.length > 0, '비어있지 않은 덤프');
  assert.match(text, /\t/, '탭 구분 셀 포함');
});

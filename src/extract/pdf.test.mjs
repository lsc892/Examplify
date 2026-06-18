import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collapseWs, pdfToText } from './pdf.mjs';

test('collapseWs: 연속 공백/개행 정리', () => {
  assert.equal(collapseWs('a   b\t c'), 'a b c');
  assert.equal(collapseWs('a  \n  b'), 'a\nb');
  assert.equal(collapseWs('a\n\n\n\nb'), 'a\n\nb');
});

test('pdfToText: 실제 PDF에서 한국어 추출(pdfjs 있을 때만)', async () => {
  const dir = 'Lecture slides';
  if (!fs.existsSync(dir)) return;
  const pdf = fs.readdirSync(dir).find(f => f.toLowerCase().endsWith('.pdf'));
  if (!pdf) return;
  const text = await pdfToText(fs.readFileSync(`${dir}/${pdf}`));
  if (text === null) return; // pdfjs-dist 미설치 → 스킵
  assert.ok(text.length > 50, '비어있지 않은 본문');
  assert.match(text, /\[p\.1\]/, '페이지 표시 포함');
});

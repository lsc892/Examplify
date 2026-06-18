import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  expectedPdf, sofficeOutputPdf, safeName, mdPath, pagesDir, assetsDir, verifyOutputs,
} from './artifacts.mjs';

test('expectedPdf: 원본 파일명 전체 + .pdf (동일 베이스명 충돌 방지)', () => {
  assert.equal(
    expectedPdf('Lecture slides/Lec5_1_Trip Distribution.pptx', 'build/pdf').endsWith('Lec5_1_Trip Distribution.pptx.pdf'),
    true);
  // 같은 베이스명, 다른 확장자 → 서로 다른 PDF 경로
  assert.notEqual(expectedPdf('Lecture slides/Lec6_2.hwp', 'o'), expectedPdf('Lecture slides/Lec6_2.xlsx', 'o'));
});

test('expectedPdf: .pdf는 이름 유지(통과), .pdf.pdf 안 됨', () => {
  assert.equal(expectedPdf('Lecture slides/교통안전공학 1장.pdf', 'build/pdf'),
    path.join('build/pdf', '교통안전공학 1장.pdf'));
});

test('sofficeOutputPdf: soffice 실제 출력명(<base>.pdf)', () => {
  assert.equal(
    sofficeOutputPdf('Lecture slides/Lec5_1_Trip Distribution.pptx', 'build/pdf').endsWith('Lec5_1_Trip Distribution.pdf'),
    true);
});

test('safeName: 공백류를 _로 치환', () => {
  assert.equal(safeName('교통안전공학 1장.pdf'), '교통안전공학_1장.pdf');
  assert.equal(safeName('a\tb  c'), 'a_b_c');
});

test('mdPath/pagesDir/assetsDir: basename 기준 + 공백 안전화 경로', () => {
  assert.equal(mdPath('Lecture slides/Lec5.pptx', 'build/md'), path.join('build/md', 'Lec5.pptx.md'));
  assert.equal(pagesDir('build/pdf/Lec5.pptx.pdf', 'build/pages'),
    path.join('build/pages', 'Lec5.pptx.pdf'));
  assert.equal(assetsDir('Lecture slides/1장.pdf', 'build/md'), path.join('build/md', '1장.pdf.assets'));
  // 공백 포함 → _로 안전화(pymupdf4llm image_path 경로 불일치 방지)
  assert.equal(mdPath('Lecture slides/교통안전공학 1장.pdf', 'build/md'),
    path.join('build/md', '교통안전공학_1장.pdf.md'));
  assert.equal(pagesDir('build/pdf/교통안전공학 1장.pdf', 'build/pages'),
    path.join('build/pages', '교통안전공학_1장.pdf'));
});

test('verifyOutputs: 빈/누락 PDF를 실패로 표시', () => {
  const sizes = { [path.join('build/pdf', 'a.hwp.pdf')]: 100, [path.join('build/pdf', 'b.ppt.pdf')]: 0 };
  const statSize = p => (p in sizes ? sizes[p] : null);
  const rep = verifyOutputs(['x/a.hwp', 'x/b.ppt', 'x/c.xlsx'], 'build/pdf', statSize);
  assert.equal(rep[0].ok, true);
  assert.equal(rep[1].ok, false); // 0바이트
  assert.equal(rep[2].ok, false); // 누락(null)
});

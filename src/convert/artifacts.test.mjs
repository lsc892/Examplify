import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  expectedPdf, sofficeOutputPdf, safeName, mdPath, pagesDir, assetsDir, verifyOutputs,
} from './artifacts.mjs';

test('expectedPdf: 원본 파일명 전체 + .pdf (동일 베이스명 충돌 방지)', () => {
  assert.equal(
    expectedPdf('desk/intake/Lec5_1_Trip Distribution.pptx', 'artifacts/build/pdf').endsWith('Lec5_1_Trip Distribution.pptx.pdf'),
    true);
  // 같은 베이스명, 다른 확장자 → 서로 다른 PDF 경로
  assert.notEqual(expectedPdf('desk/intake/Lec6_2.hwp', 'o'), expectedPdf('desk/intake/Lec6_2.xlsx', 'o'));
});

test('expectedPdf: .pdf는 이름 유지(통과), .pdf.pdf 안 됨', () => {
  assert.equal(expectedPdf('desk/intake/교통안전공학 1장.pdf', 'artifacts/build/pdf'),
    path.join('artifacts/build/pdf', '교통안전공학 1장.pdf'));
});

test('sofficeOutputPdf: soffice 실제 출력명(<base>.pdf)', () => {
  assert.equal(
    sofficeOutputPdf('desk/intake/Lec5_1_Trip Distribution.pptx', 'artifacts/build/pdf').endsWith('Lec5_1_Trip Distribution.pdf'),
    true);
});

test('safeName: 공백류를 _로 치환', () => {
  assert.equal(safeName('교통안전공학 1장.pdf'), '교통안전공학_1장.pdf');
  assert.equal(safeName('a\tb  c'), 'a_b_c');
});

test('safeName: 괄호 등 특수문자도 _로(한글·숫자·._- 보존)', () => {
  // pymupdf4llm가 ()를 -로 치환해 경로가 어긋나던 회귀
  assert.equal(safeName('Lecture_04 대중교통 용량(5-7주차)-2.pdf'),
    'Lecture_04_대중교통_용량_5-7주차_-2.pdf');
  assert.equal(safeName('a(b)c'), 'a_b_c');
  // 영문/숫자/._- 만 있으면 그대로
  assert.equal(safeName('L05_TMC_Actuated-signal.pdf'), 'L05_TMC_Actuated-signal.pdf');
});

test('mdPath/pagesDir/assetsDir: basename 기준 + 공백 안전화 경로', () => {
  assert.equal(mdPath('desk/intake/Lec5.pptx', 'artifacts/build/md'), path.join('artifacts/build/md', 'Lec5.pptx.md'));
  assert.equal(pagesDir('artifacts/build/pdf/Lec5.pptx.pdf', 'artifacts/build/pages'),
    path.join('artifacts/build/pages', 'Lec5.pptx.pdf'));
  assert.equal(assetsDir('desk/intake/1장.pdf', 'artifacts/build/md'), path.join('artifacts/build/md', '1장.pdf.assets'));
  // 공백 포함 → _로 안전화(pymupdf4llm image_path 경로 불일치 방지)
  assert.equal(mdPath('desk/intake/교통안전공학 1장.pdf', 'artifacts/build/md'),
    path.join('artifacts/build/md', '교통안전공학_1장.pdf.md'));
  assert.equal(pagesDir('artifacts/build/pdf/교통안전공학 1장.pdf', 'artifacts/build/pages'),
    path.join('artifacts/build/pages', '교통안전공학_1장.pdf'));
});

test('verifyOutputs: 빈/누락 PDF를 실패로 표시', () => {
  const sizes = { [path.join('artifacts/build/pdf', 'a.hwp.pdf')]: 100, [path.join('artifacts/build/pdf', 'b.ppt.pdf')]: 0 };
  const statSize = p => (p in sizes ? sizes[p] : null);
  const rep = verifyOutputs(['x/a.hwp', 'x/b.ppt', 'x/c.xlsx'], 'artifacts/build/pdf', statSize);
  assert.equal(rep[0].ok, true);
  assert.equal(rep[1].ok, false); // 0바이트
  assert.equal(rep[2].ok, false); // 누락(null)
});

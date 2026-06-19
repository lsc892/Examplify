import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRecords, extractParaText, hwpToText } from './hwp.mjs';

function record(tagID, data) {
  const header = Buffer.alloc(4);
  header.writeUInt32LE((data.length << 20) | tagID, 0);
  return Buffer.concat([header, data]);
}

test('parseRecords: 헤더(tagID/size) 파싱', () => {
  const recs = parseRecords(record(67, Buffer.from([1, 2, 3, 4])));
  assert.equal(recs.length, 1);
  assert.equal(recs[0].tagID, 67);
  assert.equal(recs[0].data.length, 4);
});

test('extractParaText: UTF-16 텍스트 추출 + 8WCHAR 제어문자 건너뜀', () => {
  const units = [0x41, 0x42, 0x0002, 0, 0, 0, 0, 0, 0, 0, 0x43]; // A B [wide-ctrl=8wchar] C
  const data = Buffer.alloc(units.length * 2);
  units.forEach((u, k) => data.writeUInt16LE(u, k * 2));
  assert.equal(extractParaText(record(67, data)).trim(), 'ABC');
});

test('extractParaText: PARA_TEXT(67) 외 레코드는 무시', () => {
  const data = Buffer.alloc(4); data.writeUInt16LE(0x41, 0); data.writeUInt16LE(0x42, 2);
  assert.equal(extractParaText(record(66, data)).trim(), '');
});

test('hwpToText: 실제 .hwp에서 한국어 추출(cfb 있을 때만)', async () => {
  const p = 'desk/intake/Lec7_1_도시화물수요분석모형.hwp';
  if (!fs.existsSync(p)) return;
  const t = await hwpToText(fs.readFileSync(p));
  if (t === null) return; // cfb 미설치 → 스킵
  assert.ok(t.length > 50, '비어있지 않은 본문');
  assert.match(t, /통행/, '한국어 본문 포함');
});

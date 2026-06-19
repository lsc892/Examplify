import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { discoverSources, pickExisting } from './sources.mjs';

test('discoverSources: 지원 확장자만 정렬해 경로로', () => {
  const fakeReaddir = () => ['b.pptx', 'a.hwp', 'note.txt', 'c.xlsx', 'd.PPT'];
  const got = discoverSources('desk/intake', fakeReaddir);
  assert.deepEqual(got, ['a.hwp', 'b.pptx', 'c.xlsx', 'd.PPT'].map(n => path.join('desk/intake', n)));
});

test('pickExisting: 존재하는 첫 후보 반환', () => {
  assert.equal(pickExisting(['A', 'B', 'C'], p => p === 'B'), 'B');
  assert.equal(pickExisting(['A'], () => false), null);
});

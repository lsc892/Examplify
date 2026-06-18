import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pythonCandidates, buildPyArgs } from './python.mjs';

test('pythonCandidates: py 런처 우선, python/python3 포함', () => {
  const c = pythonCandidates();
  assert.deepEqual(c[0], ['py', '-3']);
  assert.ok(c.some(([cmd]) => cmd === 'python'));
  assert.ok(c.some(([cmd]) => cmd === 'python3'));
});

test('buildPyArgs: pdf_to_md.py CLI 인자(py 런처 prefix 포함)', () => {
  const args = buildPyArgs({
    prefix: ['-3'], script: 's.py', pdf: 'a.pdf',
    mdOut: 'm.md', assets: 'as', pages: 'pg', dpi: 150,
  });
  assert.deepEqual(args, ['-3', 's.py', '--pdf', 'a.pdf', '--md-out', 'm.md',
    '--assets-dir', 'as', '--pages-dir', 'pg', '--dpi', '150']);
});

test('buildPyArgs: prefix 기본값은 빈 배열, dpi 문자열화', () => {
  const args = buildPyArgs({ script: 's.py', pdf: 'a.pdf', mdOut: 'm.md', assets: 'as', pages: 'pg' });
  assert.equal(args[0], 's.py');
  assert.equal(args[args.length - 1], '150');
});

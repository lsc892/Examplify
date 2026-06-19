import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sofficeCandidates, buildConvertArgs, findSoffice } from './libreoffice.mjs';

test('sofficeCandidates: Windows 기본 경로 포함', () => {
  assert.ok(sofficeCandidates().some(p => p.includes('LibreOffice')));
});

test('buildConvertArgs: headless pdf 변환 인자', () => {
  const args = buildConvertArgs('desk/intake/a.hwp', 'artifacts/build/pdf', 'file:///tmp/p');
  assert.deepEqual(args, ['--headless', '-env:UserInstallation=file:///tmp/p',
    '--convert-to', 'pdf', '--outdir', 'artifacts/build/pdf', 'desk/intake/a.hwp']);
});

test('findSoffice: 후보 없으면 PATH의 soffice로 위임', () => {
  assert.equal(findSoffice(() => false), 'soffice');
  assert.equal(findSoffice(p => p === sofficeCandidates()[0]), sofficeCandidates()[0]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pythonInstallPlan, pipInstallArgs } from './install.mjs';

test('pythonInstallPlan: win32 → winget', () => {
  const p = pythonInstallPlan('win32');
  assert.equal(p.manager, 'winget');
  assert.equal(p.check, 'winget');
  assert.equal(p.cmd, 'winget');
  assert.ok(p.args.includes('Python.Python.3.12'));
});

test('pythonInstallPlan: darwin → brew', () => {
  const p = pythonInstallPlan('darwin');
  assert.equal(p.check, 'brew');
  assert.deepEqual(p.args, ['install', 'python']);
});

test('pythonInstallPlan: linux → apt-get(sudo)', () => {
  const p = pythonInstallPlan('linux');
  assert.equal(p.cmd, 'sudo');
  assert.equal(p.check, 'apt-get');
  assert.ok(p.args.includes('python3'));
});

test('pythonInstallPlan: 미지원 플랫폼 → cmd=null, manualUrl 존재', () => {
  const p = pythonInstallPlan('aix');
  assert.equal(p.cmd, null);
  assert.equal(p.check, null);
  assert.match(p.manualUrl, /python\.org/);
});

test('pipInstallArgs: py.prefix + -m pip install -r', () => {
  const args = pipInstallArgs({ cmd: 'py', prefix: ['-3'] }, '/x/requirements.txt');
  assert.deepEqual(args, ['-3', '-m', 'pip', 'install', '-r', '/x/requirements.txt']);
});

test('pipInstallArgs: prefix 없으면 -m 부터', () => {
  const args = pipInstallArgs({ cmd: 'python', prefix: [] }, 'req.txt');
  assert.deepEqual(args, ['-m', 'pip', 'install', '-r', 'req.txt']);
});

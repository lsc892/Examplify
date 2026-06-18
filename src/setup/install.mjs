// 환경 설치 어댑터: OS별 설치 명령 플래너(순수) + spawn/readline I/O.
import { spawnSync } from 'node:child_process';
import readline from 'node:readline';

/** OS별 Python 설치 계획(순수). 자동 설치 불가 플랫폼은 cmd=null.
 *  check = 설치 관리자 존재 확인용 바이너리. */
export function pythonInstallPlan(platform = process.platform) {
  const manualUrl = 'https://www.python.org/downloads/';
  switch (platform) {
    case 'win32':
      return {
        manager: 'winget', check: 'winget', cmd: 'winget',
        args: ['install', '-e', '--id', 'Python.Python.3.12', '--source', 'winget'],
        manualUrl,
      };
    case 'darwin':
      return { manager: 'Homebrew', check: 'brew', cmd: 'brew', args: ['install', 'python'], manualUrl };
    case 'linux':
      return {
        manager: 'apt', check: 'apt-get', cmd: 'sudo',
        args: ['apt-get', 'install', '-y', 'python3', 'python3-pip'], manualUrl,
      };
    default:
      return { manager: null, check: null, cmd: null, args: [], manualUrl };
  }
}

/** pip 설치 인자(순수). 실행 파일은 py.cmd, 인자에 py.prefix 포함. */
export function pipInstallArgs(py, requirementsPath) {
  return [...py.prefix, '-m', 'pip', 'install', '-r', requirementsPath];
}

/** 설치 관리자(winget/brew/apt-get 등)가 실행 가능한지. */
export function commandExists(cmd) {
  if (!cmd) return false;
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  return !r.error && (r.status === 0 || /\d/.test(r.stdout || ''));
}

/** Python 모듈 존재 여부(import 시도). */
export function hasModule(py, moduleName) {
  const r = spawnSync(py.cmd, [...py.prefix, '-c', `import ${moduleName}`], { encoding: 'utf8' });
  return !r.error && r.status === 0;
}

/** 설치 명령 실행(출력 그대로 노출). 성공 시 true. */
export function runInstall(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  return !r.error && r.status === 0;
}

/** y/N 확인 프롬프트. 'y'/'yes'만 true, 빈 입력·그 외는 false. */
export function confirm(question, { input = process.stdin, output = process.stdout } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input, output });
    rl.question(question, ans => { rl.close(); resolve(/^y(es)?$/i.test(ans.trim())); });
  });
}

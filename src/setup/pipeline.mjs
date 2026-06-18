// setup 오케스트레이션: Python·pymupdf4llm 점검 → 안내 → 동의 시 설치.
// 그림·페이지 PNG 추출(PyMuPDF4LLM)에 필요한 환경을 준비한다.
import { REQUIREMENTS } from '../config/paths.mjs';
import { pickPython } from '../convert/python.mjs';
import {
  pythonInstallPlan, pipInstallArgs, commandExists, hasModule, runInstall, confirm,
} from './install.mjs';

/** 의존성을 인자로 받아 테스트에서 가짜 주입 가능. 준비 완료 시 true. */
export async function runSetup(opts = {}) {
  const {
    platform = process.platform,
    pick = pickPython,
    ask = confirm,
    install = runInstall,
    canRun = commandExists,
    moduleCheck = hasModule,
    requirements = REQUIREMENTS,
    autoYes = process.argv.includes('-y') || process.argv.includes('--yes'),
  } = opts;
  const yes = q => (autoYes ? Promise.resolve(true) : ask(q));

  console.log('환경 점검: Python + pymupdf4llm (그림·페이지 PNG 추출용)\n');

  // 1) Python
  let py = pick();
  if (!py) {
    console.log('✗ 동작하는 Python을 찾지 못했습니다.');
    const plan = pythonInstallPlan(platform);
    if (plan.cmd && canRun(plan.check)) {
      console.log(`  → ${plan.manager}로 설치 가능: ${plan.cmd} ${plan.args.join(' ')}`);
      if (await yes(`  Python을 ${plan.manager}로 설치할까요? (y/N) `)) {
        if (!install(plan.cmd, plan.args)) console.warn('  설치 명령이 실패했습니다.');
        py = pick();
        if (!py) {
          console.warn('  설치 후에도 Python을 찾지 못했습니다. 터미널을 새로 열고 다시 실행하거나 수동 설치하세요:');
          console.warn(`  ${plan.manualUrl}`);
          return false;
        }
        console.log('  ✓ Python 준비됨.');
      } else {
        console.log(`  설치를 건너뜁니다. 수동 설치: ${plan.manualUrl}`);
        return false;
      }
    } else {
      console.log(`  자동 설치 관리자(${plan.manager || '미지원 플랫폼'})를 찾지 못했습니다. 수동 설치하세요:`);
      console.log(`  ${plan.manualUrl}`);
      return false;
    }
  } else {
    console.log(`✓ Python: ${py.cmd}${py.prefix.length ? ' ' + py.prefix.join(' ') : ''}`);
  }

  // 2) pymupdf4llm
  if (moduleCheck(py, 'pymupdf4llm')) {
    console.log('✓ pymupdf4llm 설치됨 — 풀 추출(이미지 포함) 가능.\n\n준비 완료.');
    return true;
  }
  console.log('✗ pymupdf4llm 미설치 — 현재는 텍스트만 추출됩니다(이미지·페이지 PNG 없음).');
  console.log(`  → 설치 명령: ${py.cmd} ${pipInstallArgs(py, requirements).join(' ')}`);
  if (await yes('  pymupdf4llm을 설치할까요? (y/N) ')) {
    if (install(py.cmd, pipInstallArgs(py, requirements)) && moduleCheck(py, 'pymupdf4llm')) {
      console.log('  ✓ pymupdf4llm 준비됨.\n\n준비 완료.');
      return true;
    }
    console.warn('  설치에 실패했습니다. 수동으로: pip install -r requirements.txt');
    return false;
  }
  console.log('  설치를 건너뜁니다. 나중에: npm run setup (또는 pip install -r requirements.txt)');
  return false;
}

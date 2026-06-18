// Python 추출기(pdf_to_md.py) 어댑터: 후보·인자 구성(순수) + 실행기 탐색·추출 실행(I/O).
import { spawnSync } from 'node:child_process';
import { DEFAULT_DPI } from '../config/paths.mjs';

/** Python 실행기 후보(Windows 우선). 각 항목은 [cmd, ...prefixArgs]. */
export function pythonCandidates() {
  return [['py', '-3'], ['python'], ['python3']];
}

/** pdf_to_md.py 호출 인자. prefix(예: ['-3'])는 py 런처용. */
export function buildPyArgs({ prefix = [], script, pdf, mdOut, assets, pages, dpi = DEFAULT_DPI }) {
  return [
    ...prefix, script,
    '--pdf', pdf,
    '--md-out', mdOut,
    '--assets-dir', assets,
    '--pages-dir', pages,
    '--dpi', String(dpi),
  ];
}

/** 실제 Python 코드를 실행할 수 있는지 검증(Windows Store 스텁 배제). */
export function isRealPython(cmd, prefix) {
  const r = spawnSync(cmd, [...prefix, '-c', 'import sys;print(sys.version)'], { encoding: 'utf8' });
  return !r.error && r.status === 0 && /\d+\.\d+/.test(r.stdout || '');
}

/** 동작하는 Python 실행기 탐색({cmd, prefix}) 또는 null. PYTHON 환경변수로 강제 지정 가능. */
export function pickPython(env = process.env) {
  const candidates = env.PYTHON
    ? [[env.PYTHON], ...pythonCandidates()]
    : pythonCandidates();
  for (const [cmd, ...prefix] of candidates) {
    if (isRealPython(cmd, prefix)) return { cmd, prefix };
  }
  return null;
}

/** PyMuPDF4LLM 추출(MD + assets 이미지 + 페이지 PNG). 성공 시 true. */
export function runPythonExtract(py, args) {
  const r = spawnSync(py.cmd, buildPyArgs({ prefix: py.prefix, ...args }),
    { stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' } });
  return !r.error && r.status === 0;
}

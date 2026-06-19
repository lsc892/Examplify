// 변환 파이프라인 오케스트레이션: 자료(desk/intake/) → desk/build/ 산출물(PDF·MD·페이지 PNG·덤프).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workspace, PY_SCRIPT, DEFAULT_DPI } from '../config/paths.mjs';
import { discoverSources } from './sources.mjs';
import { findSoffice, convertToPdf } from './libreoffice.mjs';
import { pickPython, runPythonExtract } from './python.mjs';
import {
  expectedPdf, sofficeOutputPdf, verifyOutputs, mdPath, pagesDir, assetsDir,
} from './artifacts.mjs';
import { xlsxToText } from '../extract/xlsx.mjs';
import { hwpToText } from '../extract/hwp.mjs';
import { pdfToMarkdown } from '../extract/pdf.mjs';

/** 폴백: pdfjs 텍스트 → desk/build/md/<file>.md (이미지 없음). 성공 시 true. */
async function fallbackMarkdown(src, pdfPath, mdDir) {
  try {
    const md = await pdfToMarkdown(fs.readFileSync(pdfPath));
    if (md == null) { console.warn('  (md 폴백 건너뜀: pdfjs-dist 미설치)'); return false; }
    fs.writeFileSync(mdPath(src, mdDir), md, 'utf8');
    return true;
  } catch (e) { console.warn(`  md 폴백 실패: ${e.message}`); return false; }
}

export async function runConvert(ws = workspace()) {
  const { srcDir, pdfDir, dumpDir, hwpDir, mdDir, pagesRoot } = ws;
  if (!fs.existsSync(srcDir)) { console.error(`자료 폴더 없음: ${srcDir}`); process.exit(1); }
  for (const d of [pdfDir, dumpDir, hwpDir, mdDir, pagesRoot]) fs.mkdirSync(d, { recursive: true });

  const soffice = findSoffice();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lo-profile-'));
  const profileUri = pathToFileURL(profileDir).href;

  const sources = discoverSources(srcDir, d => fs.readdirSync(d));
  if (sources.length === 0) { console.error('변환할 파일이 없습니다.'); process.exit(1); }

  const hwpDumped = new Set();
  const producedPdfs = []; // { src, pdf } — MD/페이지 추출 대상
  for (const src of sources) {
    const ext = path.extname(src).toLowerCase();
    if (fs.statSync(src).size === 0) { console.warn(`건너뜀(빈 파일): ${path.basename(src)}`); continue; }

    // 이미 PDF인 자료: 변환 없이 그대로 통과.
    if (ext === '.pdf') {
      console.log(`통과(PDF): ${path.basename(src)}`);
      const out = expectedPdf(src, pdfDir);
      fs.copyFileSync(src, out);
      producedPdfs.push({ src, pdf: out });
      continue;
    }

    console.log(`변환: ${path.basename(src)}`);
    const r = convertToPdf(soffice, src, pdfDir, profileUri);
    if (r.error && r.error.code === 'ENOENT') {
      console.error('\nLibreOffice(soffice)를 찾을 수 없습니다. 설치 후 다시 실행하세요:');
      console.error('  https://www.libreoffice.org/download/');
      process.exit(1);
    }
    // soffice 출력(<base>.pdf)을 유일명(<원본파일명>.pdf)으로 이동 → 동일 베이스명 충돌 방지
    const sout = sofficeOutputPdf(src, pdfDir);
    const target = expectedPdf(src, pdfDir);
    if (fs.existsSync(sout) && path.resolve(sout) !== path.resolve(target)) {
      fs.rmSync(target, { force: true });
      fs.renameSync(sout, target);
    }
    if (fs.existsSync(target) && fs.statSync(target).size > 0) producedPdfs.push({ src, pdf: target });

    if (ext === '.xlsx') {
      try {
        const text = await xlsxToText(fs.readFileSync(src));
        if (text == null) console.warn('  (xlsx 덤프 건너뜀: fflate 미설치)');
        else fs.writeFileSync(path.join(dumpDir, path.basename(src) + '.txt'), text, 'utf8');
      } catch (e) { console.warn(`  xlsx 덤프 실패: ${e.message}`); }
    }
    if (ext === '.hwp') {
      // LibreOffice HWP 가져오기 실패에 대비한 텍스트 폴백.
      try {
        const text = await hwpToText(fs.readFileSync(src));
        if (text == null) console.warn('  (hwp 텍스트 폴백 건너뜀: cfb 미설치)');
        else if (text.length) {
          fs.writeFileSync(path.join(hwpDir, path.basename(src) + '.txt'), text, 'utf8');
          hwpDumped.add(src);
        }
      } catch (e) { console.warn(`  hwp 텍스트 폴백 실패: ${e.message}`); }
    }
  }

  // PDF → 마크다운(+이미지) + 페이지 PNG 추출.
  const py = pickPython();
  if (py) console.log(`\n추출(Python ${py.cmd} ${py.prefix.join(' ')}): desk/build/md + desk/build/pages`);
  else console.warn('\nPython 미발견 → Node pdfjs 텍스트 폴백(이미지 없음). 그림 판독이 필요하면 `npm run setup`으로 Python+pymupdf4llm 설치.');
  let mdOk = 0, pagesOk = 0, mdFallback = 0;
  for (const { src, pdf } of producedPdfs) {
    let extracted = false;
    if (py) extracted = runPythonExtract(py, {
      script: PY_SCRIPT, pdf,
      mdOut: mdPath(src, mdDir), assets: assetsDir(src, mdDir),
      pages: pagesDir(src, pagesRoot), dpi: DEFAULT_DPI,
    });
    if (extracted) {
      mdOk++;
      if (fs.existsSync(pagesDir(src, pagesRoot))) pagesOk++;
    } else {
      if (py) console.warn(`  ↪ Python 추출 실패 → 텍스트 폴백: ${path.basename(src)}`);
      if (await fallbackMarkdown(src, pdf, mdDir)) { mdOk++; mdFallback++; }
    }
  }

  const report = verifyOutputs(sources, pdfDir, p => (fs.existsSync(p) ? fs.statSync(p).size : null));
  const noPdf = report.filter(r => !r.ok);
  const fellBack = noPdf.filter(r => hwpDumped.has(r.src));
  const trueFail = noPdf.filter(r => !hwpDumped.has(r.src));
  console.log(`\nPDF 변환: ${report.length - noPdf.length}/${report.length} 성공`);
  console.log(`마크다운: ${mdOk}/${producedPdfs.length} (텍스트 폴백 ${mdFallback}), 페이지 PNG: ${pagesOk}/${producedPdfs.length}`);
  for (const f of fellBack) console.log(`  ↪ HWP 텍스트 폴백: ${path.basename(f.src)} (desk/build/hwp-dump/)`);
  for (const f of trueFail) console.warn(`  ✗ 실패: ${path.basename(f.src)}`);
  if (trueFail.length) console.warn('  → 해당 파일은 PDF/텍스트 모두 실패. 원본을 PDF로 직접 저장 후 재시도 권장.');

  fs.rmSync(profileDir, { recursive: true, force: true });
}

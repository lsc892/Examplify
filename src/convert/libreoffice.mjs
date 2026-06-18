// LibreOffice(soffice) 어댑터: 후보 탐색·인자 구성(순수) + headless PDF 변환 실행(I/O).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pickExisting } from './sources.mjs';

/** Windows soffice 후보 경로. */
export function sofficeCandidates() {
  return [
    'C:/Program Files/LibreOffice/program/soffice.exe',
    'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
  ];
}

/** headless PDF 변환 인자. */
export function buildConvertArgs(file, outdir, profileUri) {
  return ['--headless', `-env:UserInstallation=${profileUri}`,
    '--convert-to', 'pdf', '--outdir', outdir, file];
}

/** 설치된 soffice 경로(없으면 PATH의 'soffice'에 위임). */
export function findSoffice(exists = fs.existsSync) {
  return pickExisting(sofficeCandidates(), exists) || 'soffice';
}

/** soffice로 한 파일을 PDF로 변환(blocking). spawnSync 결과 반환. */
export function convertToPdf(soffice, src, outdir, profileUri) {
  return spawnSync(soffice, buildConvertArgs(src, outdir, profileUri), { stdio: 'inherit' });
}

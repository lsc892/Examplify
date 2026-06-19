#!/usr/bin/env node
// 컨텍스트 사용량 로거: 현재 세션 트랜스크립트(JSONL)의 토큰 usage를 읽어
// "현재 컨텍스트 채움 %" + "누계 토큰"을 artifacts/ctx-usage.log 에 한 줄씩 누적한다.
// 모델은 자기 컨텍스트를 직접 못 읽으므로, Claude Code가 남기는 세션 트랜스크립트를 파싱한다.
//
// 사용: node scripts/ctxlog.mjs "<라벨>"
//   라벨 = 지금 막 끝낸 PDF/문서 이름, 또는 마지막 호출이면 FINAL.
// 환경변수:
//   CTX_LIMIT      컨텍스트 창 토큰 한도(기본 200000)
//   CTX_PROJECTS   트랜스크립트 루트(기본 ~/.claude/projects)
//   EXAM_GUIDE_DIR 작업 폴더(미지정 시 cwd) — 로그 위치 결정용

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { workspace } from '../src/config/paths.mjs';

const LIMIT = Number(process.env.CTX_LIMIT) || 200000;
const PROJECTS = process.env.CTX_PROJECTS || path.join(os.homedir(), '.claude', 'projects');

/** cwd → Claude Code 프로젝트 슬러그 후보(영숫자 외 → '-'). 정확 일치 없으면 대소문자 무시 매칭. */
function projectDir(cwd) {
  const slug = cwd.replace(/[^a-zA-Z0-9]/g, '-');
  const exact = path.join(PROJECTS, slug);
  if (fs.existsSync(exact)) return exact;
  if (!fs.existsSync(PROJECTS)) return null;
  const lc = slug.toLowerCase();
  const hit = fs.readdirSync(PROJECTS).find((d) => d.toLowerCase() === lc);
  return hit ? path.join(PROJECTS, hit) : null;
}

/** 프로젝트 폴더에서 가장 최근 수정된 *.jsonl = 활성 세션 트랜스크립트. */
function activeTranscript(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dir, f))
    .map((p) => ({ p, m: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return files.length ? files[0].p : null;
}

/** 트랜스크립트의 모든 assistant usage를 모은다. */
function readUsages(file) {
  const usages = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const u = obj?.message?.usage;
    if (u && typeof u.input_tokens === 'number') usages.push(u);
  }
  return usages;
}

const fmt = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);

function main() {
  const label = process.argv.slice(2).join(' ').trim() || '(unlabeled)';
  const cwd = process.env.EXAM_GUIDE_DIR || process.cwd();
  const dir = projectDir(cwd);
  const ws = workspace(cwd);
  const logPath = ws.ctxLog;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  if (!dir) {
    fs.appendFileSync(logPath, `# ${new Date().toISOString()} | ${label} | 트랜스크립트 폴더 못 찾음\n`);
    console.error('ctxlog: 프로젝트 트랜스크립트 폴더를 못 찾음:', cwd);
    return;
  }
  const file = activeTranscript(dir);
  if (!file) {
    fs.appendFileSync(logPath, `# ${new Date().toISOString()} | ${label} | 트랜스크립트 없음\n`);
    return;
  }

  const usages = readUsages(file);
  const last = usages[usages.length - 1] || {};
  const ctx =
    (last.input_tokens || 0) +
    (last.cache_creation_input_tokens || 0) +
    (last.cache_read_input_tokens || 0);
  const pct = ((ctx / LIMIT) * 100).toFixed(1);

  let cin = 0,
    ccc = 0,
    ccr = 0,
    cout = 0;
  for (const u of usages) {
    cin += u.input_tokens || 0;
    ccc += u.cache_creation_input_tokens || 0;
    ccr += u.cache_read_input_tokens || 0;
    cout += u.output_tokens || 0;
  }
  const gross = cin + ccc + ccr + cout;

  // 새 파일이면 헤더 한 줄.
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    fs.appendFileSync(
      logPath,
      `# ctx-usage log | limit=${LIMIT} | ctx=현재컨텍스트(in+캐시생성+캐시읽기) | gross=누계총처리(in+cc+cr+out)\n`,
    );
  }

  const line =
    `${new Date().toISOString()} | ${label} | ` +
    `ctx=${fmt(ctx)}/${fmt(LIMIT)} (${pct}%) | ` +
    `turn(in=${last.input_tokens || 0} cc=${last.cache_creation_input_tokens || 0} cr=${last.cache_read_input_tokens || 0} out=${last.output_tokens || 0}) | ` +
    `gross=${fmt(gross)} (in=${fmt(cin)} cc=${fmt(ccc)} cr=${fmt(ccr)} out=${fmt(cout)}) | ` +
    `turns=${usages.length} | session=${path.basename(file).slice(0, 8)}\n`;

  fs.appendFileSync(logPath, line);
  process.stdout.write(line);
}

main();

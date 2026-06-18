// 입력 자료 탐색(순수). 지원 확장자 필터 + 후보 경로 선택.
import path from 'node:path';

export const SUPPORTED_EXT = new Set(['.pdf', '.hwp', '.ppt', '.pptx', '.xlsx', '.doc', '.docx']);

/** 디렉터리 내 지원 파일 경로 목록(정렬). readdir(dir)->string[]. */
export function discoverSources(dir, readdir) {
  return readdir(dir)
    .filter(n => SUPPORTED_EXT.has(path.extname(n).toLowerCase()))
    .sort()
    .map(n => path.join(dir, n));
}

/** exists(p)가 true인 첫 후보, 없으면 null. */
export function pickExisting(candidates, exists) {
  for (const c of candidates) if (exists(c)) return c;
  return null;
}

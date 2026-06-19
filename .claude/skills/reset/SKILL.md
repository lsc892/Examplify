---
name: reset
description: desk 작업공간을 비워 새 과목/시험 준비를 시작한다. exam-guide로 처리하던 중간 산출물(build)·분석(analyze)·결과(output)를 정리한다. 자료(intake)는 명시 요청 시에만 삭제. "초기화/리셋/정리해줘", 새 강의자료로 다시 시작할 때 사용.
---

# reset — desk 작업공간 정리

exam-guide 파이프라인이 만든 **처리 산출물**을 지워 새 자료로 깨끗하게 다시 시작한다.
폴더 구조(`.gitkeep`)는 유지하고 내용만 비운다. desk 내용은 모두 `.gitignore` 대상이라 **파일시스템 정리일 뿐, git 변경은 없다.**

작업 폴더 기준: `EXAM_GUIDE_DIR` 환경변수, 없으면 현재 작업 디렉터리. 아래는 cwd 기준.

## 정리 대상

| 폴더 | 내용 | 기본 동작 |
|---|---|---|
| `artifacts/build/` | 변환 산출물(PDF·md·페이지 PNG·덤프) | **삭제** (재생성 가능) |
| `artifacts/analyze/` | 분석 JSON(lectures·course) | **삭제** (재작성 대상) |
| `desk/output/` | 완성 HTML | **삭제** (재렌더 가능) |
| `desk/intake/` | 원본 강의자료 | **보존** — 사용자가 "전체/intake까지/자료도"라고 명시할 때만 삭제 |

## 절차

1. **현황 표시**: 각 폴더에 무엇이 몇 개 있는지 먼저 보여준다(무엇을 지우는지 사용자가 알도록).
   ```bash
   for d in desk/intake artifacts/build artifacts/analyze desk/output; do
     echo "$d: $(find "$d" -mindepth 1 -not -name .gitkeep | wc -l) items"
   done
   ```
2. **파생 산출물 정리** (build·analyze·output) — 기본:
   ```bash
   find artifacts/build artifacts/analyze desk/output -mindepth 1 -not -name .gitkeep -delete
   ```
3. **자료(intake)까지 정리** — 사용자가 명시적으로 요청한 경우에만. 원본 자료는 재생성 불가하므로 지우기 전에 한 번 확인한다:
   ```bash
   find desk/intake -mindepth 1 -not -name .gitkeep -delete
   ```
4. **결과 보고**: 비운 폴더와 보존한 폴더를 한 줄로 알린다. 이후 `desk/intake/`에 새 자료를 넣고 `npm run convert`부터 다시 시작하면 된다고 안내.

## 주의
- `.gitkeep`은 절대 지우지 않는다(폴더 구조 유지). 위 `find … -not -name .gitkeep` 조건을 반드시 포함.
- intake를 지우는 것은 되돌릴 수 없다 — 사용자가 분명히 요청했는지 확인하고 실행.
- desk 밖(코드·문서·node_modules)은 건드리지 않는다.

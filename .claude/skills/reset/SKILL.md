---
name: reset
description: desk·artifacts 작업공간을 통째로 비워 새 과목/시험 준비를 시작한다. 자료(intake)·변환(build)·분석(analyze)·결과(output)를 모두 정리한다. "초기화/리셋/정리해줘", 새 강의자료로 다시 시작할 때 사용.
---

# reset — 작업공간 정리

exam-guide 파이프라인의 입력과 산출물을 **한 번에 비워** 새 자료로 깨끗하게 다시 시작한다.
폴더 구조(`.gitkeep`)는 유지하고 내용만 비운다. 대상은 모두 `.gitignore` 대상이라 **파일시스템 정리일 뿐, git 변경은 없다.**

작업 폴더 기준: `EXAM_GUIDE_DIR` 환경변수, 없으면 현재 작업 디렉터리. 아래는 cwd 기준.

## 정리 대상 (모두 삭제)

| 폴더 | 내용 |
|---|---|
| `desk/intake/` | 원본 강의자료 |
| `artifacts/build/` | 변환 산출물(PDF·md·페이지 PNG·덤프) |
| `artifacts/analyze/` | 분석 JSON(lectures·course) |
| `desk/output/` | 완성 HTML |

## 절차

**한 PowerShell 명령으로 네 폴더의 내용을 비운다**(`.gitkeep` 제외). 단계별 판단·반복 호출 없이 그대로 실행:

```powershell
foreach ($d in 'desk\intake','artifacts\build','artifacts\analyze','desk\output') {
  Get-ChildItem -LiteralPath $d -Force | Where-Object Name -ne '.gitkeep' | Remove-Item -Recurse -Force
}
```

확인이 필요하면 정리 전후 개수만 한 줄로 보여준다:

```powershell
foreach ($d in 'desk\intake','artifacts\build','artifacts\analyze','desk\output') {
  $n = (Get-ChildItem -LiteralPath $d -Recurse -Force | Where-Object Name -ne '.gitkeep').Count
  Write-Host "$d : $n items"
}
```

이후 `desk/intake/`에 새 자료를 넣고 `npm run convert`부터 다시 시작하면 된다.

## 주의
- `.gitkeep`은 절대 지우지 않는다(폴더 구조 유지). `Where-Object Name -ne '.gitkeep'` 조건을 반드시 포함.
- intake까지 모두 지우므로 **원본 자료는 사라진다** — 되돌릴 수 없다. 보관본이 따로 있는지 전제하고 실행.
- 작업공간(desk·artifacts) 밖(코드·문서·node_modules)은 건드리지 않는다.

[홈](README.md) · [아키텍처](architecture.md) · **convert**

# convert — 자료 → build 변환 파이프라인 (①단계)

> **책임**: `desk/intake/`의 원본 자료를 `artifacts/build/`의 분석용 산출물(PDF · 마크다운 · 페이지 PNG · 텍스트 덤프)로 만든다. 결정적(코드만, 판단 없음).

소스: [src/convert/](../../src/convert/) · 진입: `npm run convert` → [scripts/convert.mjs](../../scripts/convert.mjs) → `runConvert()`

## 모듈 (순수 ↔ 어댑터 ↔ 조립)

| 모듈 | export | 책임 | 종류 |
|---|---|---|---|
| [sources.mjs](../../src/convert/sources.mjs) | `SUPPORTED_EXT`, `discoverSources`, `pickExisting` | 지원 확장자 필터·정렬, 후보 선택 | 순수 |
| [artifacts.mjs](../../src/convert/artifacts.mjs) | `expectedPdf`, `sofficeOutputPdf`, `safeName`, `mdPath`, `pagesDir`, `assetsDir`, `verifyOutputs` | 산출물 경로 규칙·검증 | 순수 |
| [libreoffice.mjs](../../src/convert/libreoffice.mjs) | `sofficeCandidates`, `buildConvertArgs`, `findSoffice`, `convertToPdf` | soffice 탐색·인자·headless 변환 | 어댑터 |
| [python.mjs](../../src/convert/python.mjs) | `pythonCandidates`, `buildPyArgs`, `isRealPython`, `pickPython`, `runPythonExtract` | Python 실행기 탐색·인자·추출 실행 | 어댑터 |
| [pipeline.mjs](../../src/convert/pipeline.mjs) | `runConvert` | 위를 조립한 오케스트레이션 | 조립 |

## runConvert 흐름

1. `workspace()`로 디렉터리 확보, `artifacts/build/*` 생성.
2. [`discoverSources`](../../src/convert/sources.mjs)로 자료 목록(정렬). 빈 파일은 건너뜀.
3. 파일별:
   - **`.pdf`** → 변환 없이 `artifacts/build/pdf/`로 그대로 통과(이름 유지).
   - **그 외** → [`convertToPdf`](../../src/convert/libreoffice.mjs)(LibreOffice headless)로 PDF. 출력명을 `<원본파일명>.pdf`로 유일화([`expectedPdf`](../../src/convert/artifacts.mjs)) — 동일 베이스명 충돌 방지.
   - **`.xlsx`/`.hwp`** → [extract](extract.md)로 텍스트 덤프 추가(`artifacts/build/xlsx-dump`·`artifacts/build/hwp-dump`).
4. 확보된 PDF마다 추출:
   - [`pickPython`](../../src/convert/python.mjs) 성공 → [`runPythonExtract`](../../src/convert/python.mjs)가 [pdf_to_md.py](../../scripts/pdf_to_md.py) 실행 → `artifacts/build/md/*.md`(페이지 마커 `<!-- PAGE n | pNNN.png -->`) + `.assets` 이미지 + `artifacts/build/pages/*.png`.
   - Python 없음/실패 → [`pdfToMarkdown`](../../src/extract/pdf.mjs) 텍스트 폴백(이미지 없음, `## p.N`).
5. [`verifyOutputs`](../../src/convert/artifacts.mjs)로 성공/실패·HWP폴백 리포트.

## 핵심 규칙

- **경로 안전화**: [`safeName`](../../src/convert/artifacts.mjs)이 공백을 `_`로 — pymupdf4llm가 `image_path` 공백을 치환해 경로가 어긋나는 문제 차단.
- **다층 폴백**: LibreOffice 실패 → hwp 텍스트 폴백 / Python 실패 → pdfjs 텍스트 폴백. 한 자료가 깨져도 나머지는 진행.
- **환경 준비**: 그림·페이지 PNG 추출에 필요한 Python/pymupdf4llm이 없으면 `npm run setup`이 점검 후 동의 시 설치한다([setup 오케스트레이션](../../src/setup/pipeline.mjs)). 없을 때는 그대로 텍스트 폴백.
- **의존성 주입**: `findSoffice(exists)`·`pickPython(env)`가 인자로 환경을 받아 테스트 가능.

## 산출물 (다음 단계 입력)
`artifacts/build/md`(텍스트·표) + `artifacts/build/pages`(페이지 PNG)를 **Claude가 읽고 봐서** `artifacts/analyze/*.json`을 만든다 → [schema](schema.md). 페이지 마커로 md↔PNG를 매칭하는 의도는 [exam-guide 스킬](../../.claude/skills/exam-guide/SKILL.md) 참고.

## 관련 문서
[extract](extract.md) · [config](config.md) · [schema](schema.md) · [아키텍처](architecture.md)

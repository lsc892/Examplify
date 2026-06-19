[홈](README.md) · **아키텍처**

# 아키텍처

전체 폴더 구조, 런타임 데이터 흐름, 폴더별 책임, pickPython 분기를 한 곳에 모은다.

## 폴더 트리

```
scripts/                  얇은 CLI entrypoint (조립만, 각 3~5줄)
  convert.mjs · render.mjs · validate.mjs
  pdf_to_md.py            Python 추출기 (서브프로세스로 호출)

src/
  config/
    paths.mjs             경로·디렉터리·DPI 설정 한 곳
  extract/                포맷별 추출기 (한 포맷 = 한 책임)
    pdf.mjs · xlsx.mjs · hwp.mjs
  convert/                자료 → build 변환 파이프라인
    sources.mjs           소스 탐색·확장자 필터
    libreoffice.mjs       soffice 탐색·인자·변환 실행
    python.mjs            python 탐색·인자·추출 실행
    artifacts.mjs         산출물 경로 규칙·검증 (순수)
    pipeline.mjs          오케스트레이션 runConvert
  schema/
    validate.mjs          검증 규칙 (순수)
    check.mjs             검증 실행 runValidate
  render/
    html.mjs              HTML 생성 (순수)
    figures.mjs           그림 임베드 (I/O)
    pipeline.mjs          오케스트레이션 runRender
  setup/                  Python·pymupdf4llm 점검·설치 (npm run setup)
    install.mjs · pipeline.mjs

templates/guide.css       렌더 결과에 인라인되는 스타일
schema/lecture.schema.md  강의/과목 JSON 포맷 정의(사람용)
docs/wiki/                이 위키
```

작업 산출물(`artifacts/build/`, `artifacts/analyze/`, `desk/output/`, `desk/intake/`)은 `.gitignore` 대상 — 코드가 아니라 데이터.

## 런타임 데이터 흐름

```mermaid
flowchart TD
  subgraph convert["① convert (runConvert)"]
    S[desk/intake/*] --> DISC[discoverSources]
    DISC -->|.pdf 그대로 복사| PDF[artifacts/build/pdf/*.pdf]
    DISC -->|그 외 포맷| LO[libreoffice: convertToPdf]
    LO --> PDF
    DISC -->|.xlsx 보조 덤프| XL[extract/xlsx → artifacts/build/xlsx-dump]
    DISC -->|.hwp 보조·폴백| HW[extract/hwp → artifacts/build/hwp-dump]
    PDF --> PY{pickPython 있음?}
    PY -->|예| PYX[runPythonExtract → pdf_to_md.py]
    PY -->|아니오| FB[extract/pdf: pdfToMarkdown 폴백]
    PYX --> MD[artifacts/build/md + artifacts/build/pages PNG]
    FB --> MD
  end
  MD -.->|② Claude 분석 (자료별 서브에이전트 map → 메인 reduce)| AJ[artifacts/analyze/lectures·course.json]
  XL -.->|보충 참조| AJ
  HW -.->|보충 참조| AJ
  subgraph render["③ render (runRender)"]
    AJ --> V[schema/validate]
    V --> FIG[render/figures: embedFigures]
    FIG --> H[render/html: buildHtml]
    H --> OUT[desk/output/study-guide.html]
  end
```

각 단계 상세: [convert](convert.md) · [extract](extract.md) · [schema](schema.md) · [render](render.md). 경로 상수는 [config](config.md).

## ② 분석 — 자료별 서브에이전트 (map-reduce)

분석은 메인 스레드가 한 번에 다 읽지 않는다. 한 세션에서 모든 자료(md·페이지 PNG)를 직접 Read하면 원문이 메인 컨텍스트에 자료 수만큼 누적되기 때문이다([ctxlog.mjs](../../scripts/ctxlog.mjs)가 그 단조 증가를 측정한다). 대신:

- **map**: `artifacts/build/md/*.md` 자료 1개마다 [`exam-analyzer`](../../.claude/agents/exam-analyzer.md) 서브에이전트를 1개씩 디스패치한다. 각 워커는 **자기 격리 컨텍스트**에서 그 자료의 md·PNG를 읽어 강의별 `artifacts/analyze/lectures/<Lec>.json`만 쓰고, 가벼운 경로·요약만 반환한다. 무거운 원문은 워커 컨텍스트와 함께 폐기된다 → 메인 컨텍스트는 평탄 유지.
- **reduce**: 메인은 가벼운 `lectures/*.json`만 모아 `course.json`을 쓴다(원본 md·PNG 재독 없음).

즉 추출(JSON 외부 저장)에 더해 **입력 폐기(컨텍스트 비움)** 까지 갖춘 map-reduce다. 절차는 [exam-guide 스킬](../../.claude/skills/exam-guide/SKILL.md) 3절.

## pickPython 분기 — 왜 두 갈래인가

`artifacts/build/pdf/*.pdf`를 마크다운 + 페이지 PNG로 만드는 추출은 Python 라이브러리 **PyMuPDF4LLM**에 의존한다. 그래서 추출 직전에 [`pickPython`](../../src/convert/python.mjs)으로 **실제 동작하는 Python이 있는지** 확인하고 갈래를 정한다.

- **`pickPython`이 하는 일**: `py -3` → `python` → `python3` 순으로 후보를 시도한다(윈도우 우선). `PYTHON` 환경변수로 특정 실행기를 강제할 수도 있다. 각 후보는 `import sys; print(sys.version)`를 **실제로 실행해 검증**하는데(`isRealPython`), 이는 이름만 `python`이고 실행하면 스토어가 열리는 **윈도우 스토어 스텁**을 걸러내기 위함이다. 동작하는 게 있으면 `{cmd, prefix}`, 없으면 `null`을 돌려준다.
- **있음 → 풀 추출**: `pdf_to_md.py`(PyMuPDF4LLM)로 `artifacts/build/md` + 임베디드 이미지(`*.assets`) + 전 페이지 150dpi PNG(`artifacts/build/pages`)를 만든다. 그림·도표·수식까지 시각 판독 가능.
- **없음 → 텍스트 폴백**: Node의 [`extract/pdf`](../../src/extract/pdf.mjs) `pdfToMarkdown`(pdfjs)로 `artifacts/build/md`만 만든다. **이미지·페이지 PNG 없음** → 텍스트만 분석.

즉 이 분기의 목적은 "그림까지 보는 풀 추출"과 "텍스트만 보는 폴백" 중 환경에 맞는 쪽을 자동 선택하는 것. 그림 판독이 필요하면 `requirements.txt`를 설치하면 된다. (개별 PDF 추출이 실패하면 그 파일만 폴백으로 다시 시도한다 — [pipeline.mjs:102-108](../../src/convert/pipeline.mjs#L102-L108).)

## 각 폴더의 책임

| 폴더 | 책임 | 핵심 파일 |
|---|---|---|
| `scripts/` | 얇은 CLI 진입점 — 파이프라인 함수를 조립만(각 3~5줄) | `convert.mjs` · `render.mjs` · `validate.mjs` · `pdf_to_md.py`(Python 추출기, 서브프로세스로 호출) |
| `src/config/` | 경로·디렉터리·DPI 등 설정을 한 곳에. 아무것도 import 안 하고 설정만 제공 | `paths.mjs` |
| `src/extract/` | 포맷별 추출기(한 포맷 = 한 책임) | `pdf.mjs`(pdfjs 텍스트 폴백) · `xlsx.mjs`(셀 텍스트) · `hwp.mjs`(HWP5 본문 텍스트) |
| `src/convert/` | 자료 → `artifacts/build/` 변환 파이프라인 | `sources`(탐색·확장자 필터) · `libreoffice`(soffice 변환) · `python`(파이썬 추출 실행) · `artifacts`(산출물 경로 규칙·검증) · `pipeline`(오케스트레이션 `runConvert`) |
| `src/schema/` | 분석 JSON 검증 | `validate`(규칙) · `check`(실행 `runValidate`) |
| `src/render/` | 분석 JSON → 단일 HTML | `html`(생성) · `figures`(그림 임베드) · `pipeline`(오케스트레이션 `runRender`) |
| `src/setup/` | Python·pymupdf4llm 환경 점검·설치(`npm run setup`) | `install`(OS별 설치 플래너·어댑터) · `pipeline`(오케스트레이션 `runSetup`) |
| `templates/` | 렌더 결과에 인라인되는 스타일 | `guide.css` |
| `schema/`(루트) | 강의/과목 JSON 포맷 정의(사람용 문서) | `lecture.schema.md` |
| `docs/wiki/` | 이 위키 | — |

각 모듈은 부수효과 유무로도 나뉜다 — **순수 로직**(I/O 없음: `artifacts`·`sources`·`html`·`validate`·`extract/*` 파서), **어댑터**(`spawnSync`/`fs` 등 부수효과: `libreoffice`·`python`·`figures`), 둘을 조립하는 **오케스트레이션**(`*/pipeline`·`schema/check`). `config/paths`는 아무것도 import하지 않고 설정만 제공한다.

## 관련 문서
- [홈](README.md)
- 영역별: [config](config.md) · [extract](extract.md) · [convert](convert.md) · [schema](schema.md) · [render](render.md)

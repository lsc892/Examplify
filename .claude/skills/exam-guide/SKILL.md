---
name: exam-guide
description: 수업 자료(.hwp/.ppt/.pptx/.xlsx/.pdf)로 기말시험 대비 HTML 학습 가이드를 만든다. 자료를 desk/intake/에 넣고 변환→분석→렌더 3단계를 실행할 때 사용.
---

# Exam Study Guide

수업 자료를 단일 HTML 학습 가이드(이해할 개념 / 외울 것 / 핵심 공식)로 변환한다.
파이프라인은 3단계: ① convert(결정적) → ② 분석(Claude) → ③ render(결정적).
핵심: 모든 자료를 **마크다운 + 페이지 PNG**로 만들어, 텍스트뿐 아니라 **그림·사진·도표까지 에이전트가 시각 판독**한 뒤 필수 개념과 외울 것만 뽑는다.

## 사전 준비
- Node.js 18+ , `npm install` (의존성: fflate, cfb, pdfjs-dist)
- **Python 3 + `pip install -r requirements.txt`** (pymupdf4llm) — PDF→마크다운(+이미지 추출)·페이지 PNG 래스터용. **미설치 시 자동으로 Node pdfjs 텍스트 폴백**(이미지 없이 텍스트만).
- LibreOffice 설치(.ppt/.pptx/.xlsx/.hwp 변환용). Windows 기본 경로 자동 탐색. **자료가 이미 전부 PDF면 LibreOffice 없이도 동작**.

## 절차
1. **자료 배치**: 대상 파일을 `desk/intake/`에 넣는다. (불완전 다운로드 `.part`·0바이트 파일은 자동 건너뜀)
2. **변환**: `npm run convert`
   - `.pdf` → 변환 없이 `artifacts/build/pdf/`로 **그대로 통과(passthrough)**.
   - `.ppt/.pptx/.xlsx/.doc` → LibreOffice headless로 `artifacts/build/pdf/<원본파일명>.pdf`.
   - 확보된 모든 `artifacts/build/pdf/*.pdf`에 대해 Python 추출기(`scripts/pdf_to_md.py`, PyMuPDF4LLM) 실행:
     - `artifacts/build/md/<파일>.md` — 마크다운(헤딩·표·본문 + 임베디드 이미지를 `![](…assets…)` 로 참조). **각 페이지 경계에 `<!-- PAGE n | pNNN.png -->` 마커**가 박혀, md 내용이 몇 페이지 것인지·어떤 페이지 PNG와 매칭되는지 바로 안다. (텍스트 폴백은 `## p.N` 헤더로 페이지 표시.)
     - `artifacts/build/md/<파일>.assets/*.png` — 추출된 임베디드 이미지(사진·다이어그램).
     - `artifacts/build/pages/<파일>/p001.png …` — **전 페이지를 150dpi PNG로 래스터**(벡터 도표·수식·레이아웃까지 그대로).
   - Python/pymupdf4llm 미설치·실패 시 → `artifacts/build/md/<파일>.md`를 pdfjs 텍스트 폴백으로 생성(이미지 없음).
   - `.xlsx` → 추가로 `artifacts/build/xlsx-dump/`에 셀 텍스트(숫자 정확도 보강).
   - `.hwp` → LibreOffice가 못 열면(흔함) `artifacts/build/hwp-dump/`에 HWP5 본문 텍스트 폴백 자동 생성.
   - PDF 출력명은 `<원본파일명>.pdf`로 유일화(동일 베이스명 충돌 방지). 단 `.pdf`는 이름 유지.
3. **분석(Claude) — 자료별 서브에이전트 디스패치(map) → 종합(reduce)**:
   - **왜 이 구조인가**: 한 세션에서 모든 자료를 직접 Read하면 읽은 md·PNG가 메인 대화에 계속 누적돼 컨텍스트가 자료 수에 비례해 차오른다. 자료별 분석을 **격리된 콜드 컨텍스트(서브에이전트)** 에서 돌려, 무거운 원문은 그 컨텍스트와 함께 버리고 메인엔 **가벼운 JSON·요약만** 남긴다(map-reduce + 외부 상태화).
   - **map (자료별 격리)**: `artifacts/build/md/*.md` 한 파일 = 자료 1개. 자료마다 `Agent`(subagent_type: `exam-analyzer`)를 1개씩 디스패치해, 그 자료의 md·페이지 PNG를 **서브에이전트 자기 컨텍스트에서** 읽고 강의별 `artifacts/analyze/lectures/<Lec>.json`만 쓰게 한다. 서로 독립이므로 한 메시지에서 여러 개 **병렬** 가능(자료가 많으면 적당히 배치). 자료별 분석 규칙(md로 싸게 훑기 → 핵심 개념 페이지만 PNG 시각 교차검증 → `이해할_개념`+`외울_것`+`공식`+`예상_출제포인트`만 lean, 글로 대체 어려운 도표만 `그림`, 각 항목 `exam` 난이도·근거)은 `exam-analyzer` 에이전트가 이 절과 `schema/lecture.schema.md`를 읽어 따른다.
   - **컨텍스트 로깅**: 자료 서브에이전트가 하나 끝나 돌아올 때마다 `node scripts/ctxlog.mjs "<방금 끝낸 자료명>"` 을 호출한다 → 메인 컨텍스트가 자료 수에 비례해 차오르지 않고 평탄 유지됨이 `artifacts/ctx-usage.log`(gitignore됨)에 한 줄씩 기록된다.
   - **reduce (메인)**: 모든 자료가 끝나면 가벼운 `artifacts/analyze/lectures/*.json`만 읽어 과목 종합 `artifacts/analyze/course.json`을 `schema/lecture.schema.md` 형식으로 작성한다(시험 출제경향·학습 우선순위 = 강의 JSON들의 신호 + 과목 도메인 지식). **원본 md·PNG를 메인에서 다시 읽지 않는다.**
   - 작성 후 `node scripts/validate.mjs` 가 exit 0 인지 확인하고, 이어 `node scripts/ctxlog.mjs "FINAL"` 로 마감 줄을 남긴다.
4. **렌더**: `npm run render` → `desk/output/study-guide.html`. 브라우저로 확인.
   - 렌더(output)까지 끝나면 `node scripts/ctxlog.mjs "OUTPUT-DONE"` 로 최종 누계를 한 줄 더 남긴다.

## 주의
- 페이지 PNG는 기본 150dpi. 작은 글씨가 안 읽히면 `src/config/paths.mjs`의 `DEFAULT_DPI`(또는 `pdf_to_md.py --dpi`)를 올린다(파일·토큰 비용 증가).
- 대용량 자료는 `artifacts/build/md` 텍스트로 전체를 훑고, **그림이 의미 있는 핵심 페이지만** PNG로 시각 판독해 비용을 아낀다.
- `.hwp`는 LibreOffice HWP 가져오기가 자주 실패 → HWP5(OLE) 본문 텍스트 폴백을 사용(그림·수식 손실). 그림/수식이 꼭 필요하면 한글에서 PDF로 저장해 `desk/intake/`에 넣으면 페이지 PNG까지 생성된다.
- 수식은 KaTeX(CDN) — 볼 때 인터넷 필요. 오프라인 단일 파일이 필요하면 KaTeX 자산 vendoring.
- 테스트: `npm test` (순수 함수 회귀, node:test).

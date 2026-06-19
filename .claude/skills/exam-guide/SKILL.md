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
3. **분석(Claude)**:
   - `artifacts/build/md/*.md`를 읽어 텍스트·표를 싸게 파악한다(대용량 우선 경로).
   - md에서 중요한 개념을 만나면 **바로 위 `<!-- PAGE n -->` 마커로 페이지 번호를 확인**하고, 그 `artifacts/build/pages/<파일>/pNNN.png` 를 콕 집어 **Read 도구로 시각 판독**한다 → md 텍스트와 페이지 그림을 정확히 교차검증한다. (마커는 있는데 본문이 거의 비면 = 이미지·도표 위주 페이지이므로 반드시 PNG로 확인.)
   - 필요한 페이지만 선별해 보고(전 페이지 정독 금지), `artifacts/build/md/<파일>.assets/*.png` 의 임베디드 이미지도 함께 본다 → 그림·사진·도표·이미지로 된 수식까지 실제로 보고 근거로 삼는다.
   - 보충(필요 시): `artifacts/build/hwp-dump`·`artifacts/build/xlsx-dump` 텍스트.
   - 강의 단위로 **필수 개념(`이해할_개념`) + 외울 것(`외울_것`) + 핵심 공식(`공식`)만** 추려 `artifacts/analyze/lectures/<Lec>.json` 과 `artifacts/analyze/course.json` 을 `schema/lecture.schema.md` 형식으로 작성한다. 부가 설명은 넣지 않는다(가이드는 시험 직전용으로 lean하게).
   - **그림이 개념 이해에 실제로 도움이 됐거나 중요한 경우** → 그 이미지를 강의의 `그림` 배열에 `{ src, caption, why }`로 넣는다. `src`는 본 이미지의 작업폴더 상대경로(`artifacts/build/pages/<파일>/p003.png` 또는 `artifacts/build/md/<파일>.assets/<img>.png`). render가 읽어 HTML에 base64로 인라인한다. **도표·다이어그램·사진처럼 글로 대체하기 어려운 것만** 골라 남발하지 않는다.
   - 출제 경향 = 자료 신호(반복·워크드 예제·강조·도표) + 과목 도메인 지식. 각 항목에 `exam` 난이도와 근거를 단다.
   - 작성 후 `node scripts/validate.mjs` 가 exit 0 인지 확인한다.
4. **렌더**: `npm run render` → `desk/output/study-guide.html`. 브라우저로 확인.

## 주의
- 페이지 PNG는 기본 150dpi. 작은 글씨가 안 읽히면 `src/config/paths.mjs`의 `DEFAULT_DPI`(또는 `pdf_to_md.py --dpi`)를 올린다(파일·토큰 비용 증가).
- 대용량 자료는 `artifacts/build/md` 텍스트로 전체를 훑고, **그림이 의미 있는 핵심 페이지만** PNG로 시각 판독해 비용을 아낀다.
- `.hwp`는 LibreOffice HWP 가져오기가 자주 실패 → HWP5(OLE) 본문 텍스트 폴백을 사용(그림·수식 손실). 그림/수식이 꼭 필요하면 한글에서 PDF로 저장해 `desk/intake/`에 넣으면 페이지 PNG까지 생성된다.
- 수식은 KaTeX(CDN) — 볼 때 인터넷 필요. 오프라인 단일 파일이 필요하면 KaTeX 자산 vendoring.
- 테스트: `npm test` (순수 함수 회귀, node:test).

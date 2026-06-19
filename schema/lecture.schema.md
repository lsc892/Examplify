# 분석 JSON 스키마

## 강의별: `desk/analyze/lectures/<Lec>.json`
- `lecture` (string, 필수): 강의 ID, 예 "Lec5_1"
- `title` (string, 필수): 강의 제목
- `topic` (string, 필수): 주제(한글, 영어 병기 권장)
- `sources` (string[]): 근거 PDF 파일명
- `이해할_개념` (array, 필수): `{ term, explain, why, exam(high|med|low), src }`
- `외울_것` (array, 필수): `{ item, content, tip?, exam(high|med|low), src? }`
- `공식` (array, 필수): `{ name, tex(KaTeX), vars?, use? }`
- `예상_출제포인트` (string[], 필수)
- `문제` (array, 선택): 문제풀이(퀴즈) 모드용. 강의별로 **객관식·주관식을 섞어** 넣는다. 렌더된 가이드에서 목차 체크 + 문제 수로 무작위 출제된다.
  - 객관식: `{ type:"객관식", q, choices(string[], 2개 이상), answer(정답 choice의 0-base 인덱스), explain?(해설), exam?(high|med|low) }`
  - 주관식(서술형): `{ type:"주관식", q, answer(모범답안 텍스트), explain?(해설), exam? }` — 자동채점 없이 모범답안 자가채점.
  - 본문/선지/답안 안의 수식은 다른 필드와 동일하게 `$...$` LaTeX. 분량 가이드: 강의당 객관식 3~6 + 주관식 1~3.
- `그림` (array, 선택): 분석 중 **시각 판독한 PDF 그림/페이지 중 개념 이해에 실제로 중요했던 것만** 추려 넣는다. `{ src, caption, why? }`
  - `src`: 작업폴더 기준 상대경로. 추출 이미지 `desk/build/md/<파일>.assets/<img>.png` 또는 페이지 래스터 `desk/build/pages/<파일>/p003.png`. (렌더러가 읽어 data URI로 인라인 → 단일 파일 유지)
  - `caption`: 그림이 무엇인지 한 줄.
  - `why?`: 왜 중요/도움이 되는지(예: "신호 현시 다이어그램으로 actuated 제어 흐름 이해"). 남발 금지 — 도표·다이어그램·사진처럼 글로 대체 어려운 것만.

## 수식 표기 규약 (중요)
- 본문(`explain`/`content`/`tip`/`vars`) 안의 수식은 **`$...$` 로 감싼 LaTeX**로 작성한다. 렌더러가 KaTeX auto-render로 처리한다.
  - 예: `"content": "$T_{ij} = a_i b_j O_i D_j f(c_{ij})$"`
- `공식[].tex` 는 `$` 없이 순수 LaTeX만 적는다(렌더러가 자동으로 `$...$`로 감쌈).
- **`$...$` 안에는 한국어를 넣지 않는다**(KaTeX에 한글 글리프 없음). 한국어 설명은 수식 밖에 둔다.
  - 좋음: `거듭제곱형 $f(c_{ij}) = c_{ij}^{-\beta}$`  /  나쁨: `$f = c^{-\beta}\text{(거듭제곱형)}$`
- JSON 문자열이므로 LaTeX 백슬래시는 `\\` 로 이스케이프(`\\dfrac`, `\\beta`, `\\sum`).

## 과목 종합: `desk/analyze/course.json`
- `course` (string, 필수): 과목명
- `summary` (string, 필수): 한 줄 요약
- `시험_출제경향` (array, 필수): `{ topic, likelihood(high|med|low), 근거, 관련강의?:string[] }`
- `학습_우선순위` (string[], 필수)

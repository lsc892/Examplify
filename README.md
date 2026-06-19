# Exam Study Guide

수업 자료(.hwp/.ppt/.pptx/.xlsx/.pdf)를 시험 직전용 단일 HTML 학습 가이드로 변환하는 도구.

**변환 → 분석(Claude) → 렌더** 3단계 파이프라인. ①③은 결정적 스크립트, ②만 판단.

## 문서
전체 구조·데이터 흐름·모듈별 설명은 위키에서:

→ **[docs/wiki/](docs/wiki/README.md)** (홈)

빠른 시작:

```bash
npm install
npm run setup     # Python + pymupdf4llm 점검·설치(그림 판독용; 안내 후 동의 시 설치)
# desk/intake/ 에 자료를 넣고
npm run convert   # ① 자료 → desk/build/
#  ② Claude가 desk/build/ 읽고 desk/analyze/*.json 작성
npm run validate  # 분석 결과 검증
npm run render    # ③ → desk/output/study-guide.html
```

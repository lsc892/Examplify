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
npm run convert   # ① 자료 → artifacts/build/
#  ② Claude가 artifacts/build/ 읽고 artifacts/analyze/*.json 작성
#     (자료별 서브에이전트 map → 메인 reduce — 아래 참고)
npm run validate  # 분석 결과 검증
npm run render    # ③ → desk/output/study-guide.html
```

## ② 분석 — 자료별 서브에이전트 (map-reduce)

분석 단계는 메인 컨텍스트가 자료 수만큼 차오르지 않도록 **map-reduce + 컨텍스트 격리**로 돈다:

- **map**: `artifacts/build/md/*.md` 자료 1개마다 `exam-analyzer` 서브에이전트를 1개씩 띄워, **각자 격리 컨텍스트**에서 그 자료의 md·페이지 PNG를 읽고 강의별 `artifacts/analyze/lectures/<Lec>.json`만 쓴 뒤 가벼운 요약만 반환한다(무거운 원문은 워커와 함께 폐기).
- **reduce**: 메인은 가벼운 `lectures/*.json`만 모아 `artifacts/analyze/course.json`을 쓴다.

즉 JSON 추출(외부 저장)에 더해 **입력 폐기(컨텍스트 비움)** 까지 갖춘 구조다. 자료별 분석 규칙은 [exam-guide 스킬](.claude/skills/exam-guide/SKILL.md) 3절, 워커 정의는 [exam-analyzer 에이전트](.claude/agents/exam-analyzer.md). 컨텍스트 채움은 `node scripts/ctxlog.mjs`로 `artifacts/ctx-usage.log`에 기록된다.

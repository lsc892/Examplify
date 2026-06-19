[홈](README.md) · [아키텍처](architecture.md) · **schema**

# schema — 분석 JSON 검증 (②와 ③ 사이)

> **책임**: 분석 단계(②)가 만든 `artifacts/analyze/*.json`이 렌더가 기대하는 형식을 지키는지 점검한다. 검증 **규칙**(순수)과 검증 **실행**(I/O)을 분리.

소스: [src/schema/](../../src/schema/) · 진입: `npm run validate` → [scripts/validate.mjs](../../scripts/validate.mjs) → `runValidate()`

## 모듈

| 모듈 | export | 책임 | 종류 |
|---|---|---|---|
| [validate.mjs](../../src/schema/validate.mjs) | `validateLecture`, `validateCourse` | `{ok, errors[]}` 반환하는 순수 검증 규칙 | 순수 |
| [check.mjs](../../src/schema/check.mjs) | `runValidate` | 디렉터리 읽어 검증·리포트, 실패 시 `exit 1` | 어댑터 |

## 검증하는 형식 (요약)

- **강의(lecture)**: `lecture`/`title`/`topic` 문자열 필수. `이해할_개념`·`외울_것`·`공식`·`예상_출제포인트` 배열 필수. 각 항목 필드와 `exam` 난이도(`high`/`med`/`low`) 점검. `그림`은 선택이되 있으면 `src`·`caption` 필수.
- **과목(course)**: `course`/`summary` 문자열, `시험_출제경향`·`학습_우선순위` 배열, 경향 항목의 `topic`/`likelihood`/`근거`.

사람이 읽는 전체 포맷 정의는 [schema/lecture.schema.md](../../schema/lecture.schema.md).

## 어디에 쓰이나
- 독립 실행: `npm run validate`로 분석 결과를 점검(분석 단계 마무리 확인).
- 렌더 중 재사용: [render/pipeline](../../src/render/pipeline.mjs)이 같은 `validateLecture`/`validateCourse`로 빌드 전 검증 — course는 실패 시 중단, lecture는 경고 후 진행.

## 관련 문서
[convert](convert.md) — 검증 대상 JSON을 만드는 분석의 입력 · [render](render.md) — 검증 통과분을 HTML로 · [아키텍처](architecture.md)

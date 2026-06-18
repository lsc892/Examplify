[홈](README.md) · [아키텍처](architecture.md) · **render**

# render — 분석 JSON → HTML (③단계)

> **책임**: 검증된 `Analyze/*.json`을 **자체완결 단일 HTML**(`output/study-guide.html`)로 만든다. 결정적. 그림은 base64로 인라인해 파일 하나로 끝나게 한다.

소스: [src/render/](../../src/render/) · 진입: `npm run render` → [scripts/render.mjs](../../scripts/render.mjs) → `runRender()`

## 모듈

| 모듈 | export | 책임 | 종류 |
|---|---|---|---|
| [html.mjs](../../src/render/html.mjs) | `escapeHtml`, `lectureAnchor`, `renderConceptTable`, `renderMemorizeTable`, `renderFormulaTable`, `renderFigures`, `renderLectureSection`, `renderToc`, `buildHtml` | 데이터 → HTML 문자열(순수) | 순수 |
| [figures.mjs](../../src/render/figures.mjs) | `embedFigures` | `그림[].src` 파일 → data URI(embed) | 어댑터 |
| [pipeline.mjs](../../src/render/pipeline.mjs) | `runRender` | 검증·임베드·빌드·쓰기 조립 | 조립 |

## runRender 흐름

1. `Analyze/course.json` 없으면 중단. 있으면 [`validateCourse`](../../src/schema/validate.mjs) — 실패 시 중단.
2. `Analyze/lectures/*.json` 정렬 로드, 각 [`validateLecture`](../../src/schema/validate.mjs) — 실패는 **경고 후 진행**.
3. 강의별 [`embedFigures`](../../src/render/figures.mjs): `src`(작업폴더 상대경로)를 읽어 `embed` data URI로 채움. 파일 없는 그림은 경고 후 제외(깨진 `<img>` 방지).
4. [`buildHtml`](../../src/render/html.mjs)로 조립 → [templates/guide.css](../../templates/guide.css) 인라인, 강의 섹션·목차·검색 포함.
5. `output/study-guide.html` 쓰기 + 리포트(강의 수·경고·임베드/누락 그림).

## 결과 HTML 특징

- **자체완결**: CSS 인라인 + 그림 base64 → 파일 하나만 열면 됨.
- **수식**: 공식의 `tex`를 `$...$`로 감싸 KaTeX(CDN) auto-render가 처리 → 볼 때 인터넷 필요. 오프라인 단일 파일이 필요하면 KaTeX 자산 vendoring.
- **표 구성**: 이해할 개념 / 외울 것(팁 포함) / 공식 / 핵심 그림. 시험 직전용으로 lean하게.

## 관련 문서
[schema](schema.md) — 입력 JSON 검증 · [config](config.md) — `CSS_FILE`·`outHtml` · [아키텍처](architecture.md)

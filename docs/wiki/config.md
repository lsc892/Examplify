[홈](README.md) · [아키텍처](architecture.md) · **config**

# config — 경로·설정

> **책임**: 번들 자산 위치와 작업 폴더(ROOT) 기준 디렉터리를 **한 곳**에서 해석한다. 다른 모듈은 경로를 직접 조립하지 않고 여기서 가져온다.

소스: [src/config/paths.mjs](../../src/config/paths.mjs)

## 핵심 개념: 번들 vs 작업 폴더

| 기준 | 무엇 | 어떻게 |
|---|---|---|
| **번들(PKG_ROOT)** | 도구 자체 자산(`pdf_to_md.py`, `guide.css`) | `paths.mjs` 위치에서 `../../`로 패키지 루트 고정 → **어디서 실행하든 불변** |
| **작업 폴더(ROOT)** | 사용자 자료·산출물(`desk/build/`, `desk/analyze/`, `desk/output/`) | `EXAM_GUIDE_DIR` 환경변수, 없으면 `process.cwd()` |

이 분리 덕분에 도구를 한 곳에 두고 아무 작업 폴더에서나 실행할 수 있다.

## export

| 이름 | 종류 | 의미 |
|---|---|---|
| `PKG_ROOT` | 상수 | 패키지 루트 절대경로 (번들 기준) |
| `PY_SCRIPT` | 상수 | `scripts/pdf_to_md.py` 경로 |
| `CSS_FILE` | 상수 | `templates/guide.css` 경로 |
| `REQUIREMENTS` | 상수 | `requirements.txt` 경로 (setup의 pip 설치용) |
| `DEFAULT_DPI` | 상수 | 페이지 PNG 래스터 기본 150 |
| `workspace(root?)` | 함수 | ROOT 기준 디렉터리 묶음 반환 |

## `workspace()`가 주는 디렉터리

```
root        작업 폴더
srcDir      desk/intake/         (입력 자료)
pdfDir      desk/build/pdf/              (변환된 PDF)
dumpDir     desk/build/xlsx-dump/        (xlsx 셀 텍스트)
hwpDir      desk/build/hwp-dump/         (hwp 본문 폴백)
mdDir       desk/build/md/               (마크다운 + .assets 이미지)
pagesRoot   desk/build/pages/            (페이지 PNG)
lecDir      desk/analyze/lectures/       (강의별 분석 JSON)
courseJson  desk/analyze/course.json     (과목 종합)
outHtml     desk/output/study-guide.html (최종 결과)
```

## 사용처
- [convert/pipeline](../../src/convert/pipeline.mjs), [render/pipeline](../../src/render/pipeline.mjs), [schema/check](../../src/schema/check.mjs)이 `workspace()`로 디렉터리를 받는다.
- [convert/python](../../src/convert/python.mjs)이 `PY_SCRIPT`·`DEFAULT_DPI`를, [render/pipeline](../../src/render/pipeline.mjs)이 `CSS_FILE`을 쓴다.

> 페이지 PNG 글씨가 작아 안 읽히면 `DEFAULT_DPI`를 올린다(파일·토큰 비용 증가). [pdf_to_md.py](../../scripts/pdf_to_md.py) `--dpi`로도 가능.

## 관련 문서
[convert](convert.md) · [render](render.md) · [아키텍처](architecture.md)

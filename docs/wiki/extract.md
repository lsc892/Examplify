[홈](README.md) · [아키텍처](architecture.md) · **extract**

# extract — 포맷별 추출기

> **책임**: 각 파일 포맷(pdf·xlsx·hwp)을 텍스트/마크다운으로 푸는 **독립 파서**. 한 포맷 = 한 모듈 = 한 책임. 의존성이 없으면 `null`을 반환해 호출부가 폴백하게 한다(절대 throw로 파이프라인을 죽이지 않음).

소스: [src/extract/](../../src/extract/)

## 모듈

| 모듈 | export | 역할 | 의존 |
|---|---|---|---|
| [pdf.mjs](../../src/extract/pdf.mjs) | `collapseWs`, `pdfToText`, `pdfToMarkdown` | PDF → 텍스트/마크다운(페이지 `## p.N` 헤더). **Python 추출기 폴백용** | pdfjs-dist |
| [xlsx.mjs](../../src/extract/xlsx.mjs) | `parseSharedStrings`, `parseSheet`, `xlsxToText` | XLSX → `Sheet!Ref\tvalue` 텍스트(숫자 정확도 보강) | fflate(zip) |
| [hwp.mjs](../../src/extract/hwp.mjs) | `parseRecords`, `extractParaText`, `hwpToText` | HWP5(OLE) → 본문 텍스트. **LibreOffice가 .hwp 못 열 때 폴백** | cfb, fflate |

## 설계 포인트

- **순수 파서 분리**: 각 모듈은 XML/바이너리 파싱 함수(순수, 테스트 대상)와 버퍼→텍스트 진입 함수로 나뉜다. 예) xlsx의 `parseSheet`는 순수, `xlsxToText`는 zip 해제까지.
- **선택적 의존성**: `import('fflate')` 등을 동적 로드해 실패 시 `null` 반환 → 설치 안 돼 있어도 도구가 죽지 않고 해당 보강만 건너뛴다.
- **HWP 한계**: 그림·수식은 손실되고 본문 텍스트만 나온다. 그림이 필요하면 한글에서 PDF로 저장해 넣는 게 정석.

## 누가 부르나
- [convert/pipeline](../../src/convert/pipeline.mjs)이 `.xlsx`/`.hwp`마다 덤프를, Python 추출 실패 시 `pdfToMarkdown` 폴백을 호출.
- 테스트: 각 모듈 옆 `*.test.mjs` (실제 샘플 있으면 검증, 없으면 스킵).

## 관련 문서
[convert](convert.md) — 이 추출기들을 언제 호출하는지 · [아키텍처](architecture.md)

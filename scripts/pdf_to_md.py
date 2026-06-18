#!/usr/bin/env python3
"""PDF -> Markdown(+임베디드 이미지) + 전 페이지 PNG 래스터.

PyMuPDF4LLM로 마크다운(헤딩·표·본문)과 임베디드 이미지를 추출하고,
PyMuPDF(fitz)로 각 페이지를 지정 DPI(기본 150) PNG로 래스터화한다.
이미지가 손실되던 기존 텍스트-온리 추출을 대체 — 에이전트가 그림/사진/도표를
build/pages 의 페이지 PNG로 직접 시각 판독할 수 있게 한다.

의존성 미설치/오류 시 비-0 종료 → 호출부(convert.mjs)가 Node 폴백으로 전환.

사용:
  python scripts/pdf_to_md.py --pdf <in.pdf> --md-out <out.md> \
      --assets-dir <dir> --pages-dir <dir> [--dpi 150]
"""
import argparse
import os
import sys


def eprint(*a):
    print(*a, file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--md-out", required=True)
    ap.add_argument("--assets-dir", required=True)
    ap.add_argument("--pages-dir", required=True)
    ap.add_argument("--dpi", type=int, default=150)
    args = ap.parse_args()

    try:
        import pymupdf  # PyMuPDF (fitz)
        import pymupdf4llm
    except Exception as e:  # 미설치 등 → 폴백 유도
        eprint(f"[pdf_to_md] import 실패(폴백 전환): {e}")
        return 3

    os.makedirs(os.path.dirname(os.path.abspath(args.md_out)) or ".", exist_ok=True)
    os.makedirs(args.assets_dir, exist_ok=True)
    os.makedirs(args.pages_dir, exist_ok=True)

    # 페이지 PNG 파일명 자리수(p001.png …). md 마커가 동일 이름을 가리키도록 먼저 계산.
    try:
        doc = pymupdf.open(args.pdf)
        page_count = doc.page_count
        doc.close()
    except Exception as e:
        eprint(f"[pdf_to_md] open 실패: {e}")
        return 4
    width = max(3, len(str(page_count)))

    def png_name(n):
        return f"p{n:0{width}d}.png"

    # 1) 마크다운 + 임베디드 이미지 추출. page_chunks=True로 페이지별로 받아
    #    각 페이지 경계에 `<!-- PAGE n | pNNN.png -->` 마커를 박는다 →
    #    에이전트가 md 내용을 build/pages/<파일>/pNNN.png 와 정확히 매칭해 시각 판독.
    try:
        chunks = pymupdf4llm.to_markdown(
            args.pdf,
            write_images=True,
            image_path=args.assets_dir,
            image_format="png",
            dpi=args.dpi,
            page_chunks=True,
        )
    except Exception as e:
        eprint(f"[pdf_to_md] to_markdown 실패: {e}")
        return 4

    parts = []
    for i, chunk in enumerate(chunks, start=1):
        text = (chunk.get("text") if isinstance(chunk, dict) else str(chunk)) or ""
        parts.append(f"<!-- PAGE {i} | {png_name(i)} -->\n\n{text.strip()}")
    md = "\n\n".join(parts)

    with open(args.md_out, "w", encoding="utf-8") as f:
        f.write(md)

    # 2) 전 페이지를 PNG로 래스터화(벡터 도표/수식/레이아웃까지 시각 판독용).
    n_pages = 0
    try:
        doc = pymupdf.open(args.pdf)
        for i, page in enumerate(doc, start=1):
            pix = page.get_pixmap(dpi=args.dpi)
            pix.save(os.path.join(args.pages_dir, png_name(i)))
            n_pages += 1
        doc.close()
    except Exception as e:
        eprint(f"[pdf_to_md] 페이지 래스터 실패: {e}")
        return 5

    print(f"[pdf_to_md] md={args.md_out} pages={n_pages} assets-> {args.assets_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

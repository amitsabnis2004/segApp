from __future__ import annotations

import json
from urllib.parse import quote
from pathlib import Path

import httpx


OUT_DIR = Path(__file__).resolve().parents[2] / "sample_data" / "online_hbn"
META_PATH = OUT_DIR / "metadata.json"


def query_wikipedia_image_titles(page_title: str, limit: int = 200) -> list[str]:
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "titles": page_title,
        "prop": "images",
        "imlimit": str(limit),
        "format": "json",
    }

    with httpx.Client(timeout=30, headers={"User-Agent": "hbn-thickness-lab/1.0"}) as client:
        response = client.get(url, params=params)
        if response.status_code != 200:
            return []
        payload = response.json()

    titles: list[str] = []
    for page in payload.get("query", {}).get("pages", {}).values():
        for item in page.get("images", []) or []:
            t = str(item.get("title") or "")
            if t.startswith("File:"):
                titles.append(t)
    return titles


def collect(max_images: int = 20) -> list[dict[str, object]]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    page_titles = [
        "Hexagonal boron nitride",
        "Boron nitride",
        "Two-dimensional materials",
    ]

    collected: list[dict[str, object]] = []
    seen_urls: set[str] = set()

    with httpx.Client(timeout=60, headers={"User-Agent": "hbn-thickness-lab/1.0"}) as client:
        for page_title in page_titles:
            file_titles = query_wikipedia_image_titles(page_title, limit=200)

            for file_title in file_titles:
                file_name = file_title.replace("File:", "", 1)
                encoded = quote(file_name)
                url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}"
                if not url or url in seen_urls:
                    continue

                try:
                    data = client.get(url, follow_redirects=True)
                    data.raise_for_status()
                except Exception:
                    continue

                final_url = str(data.url)
                if not any(final_url.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp")):
                    continue
                if len(data.content) < 10_000:
                    continue

                idx = len(collected) + 1
                ext = Path(final_url).suffix or ".jpg"
                filename = f"hbn_online_{idx:03d}{ext}"
                out_path = OUT_DIR / filename
                out_path.write_bytes(data.content)

                record = {
                    "title": file_title,
                    "source_url": final_url,
                    "mime": data.headers.get("content-type"),
                    "local_file": str(out_path.relative_to(Path(__file__).resolve().parents[2]).as_posix()),
                }
                collected.append(record)
                seen_urls.add(final_url)

                if len(collected) >= max_images:
                    META_PATH.write_text(json.dumps(collected, indent=2), encoding="utf-8")
                    return collected

    META_PATH.write_text(json.dumps(collected, indent=2), encoding="utf-8")
    return collected


def main() -> None:
    items = collect(max_images=20)
    print(f"Collected {len(items)} online images into {OUT_DIR}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Fetch Google News RSS search feeds and write a static JSON file."""

from __future__ import annotations

import email.utils
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "news.json"
FEEDS = [
    ("markets", "stock market OR bond market OR oil OR gold OR currency when:2d"),
    ("economy", "global economy OR inflation OR central bank OR interest rates when:2d"),
    ("business", "global business OR companies OR earnings OR trade when:2d"),
    ("technology", "technology business OR artificial intelligence companies OR semiconductor when:2d"),
]
MAX_PER_FEED = 30
USER_AGENT = "MarketBriefNewsBot/1.0 (+https://github.com/)"


def text_content(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def child_text(element: ET.Element, name: str) -> str:
    for child in element:
        if child.tag.rsplit("}", 1)[-1] == name:
            return (child.text or "").strip()
    return ""


def parse_date(value: str) -> str:
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        return datetime.now(timezone.utc).isoformat()


def fetch_feed(category: str, query: str) -> list[dict[str, str]]:
    params = urllib.parse.urlencode({"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"})
    url = f"https://news.google.com/rss/search?{params}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                payload = response.read()
            root = ET.fromstring(payload)
            items: list[dict[str, str]] = []
            for node in root.iter():
                if node.tag.rsplit("}", 1)[-1] != "item":
                    continue
                title = text_content(child_text(node, "title"))
                link = child_text(node, "link")
                if not title or not link:
                    continue
                source = child_text(node, "source") or urllib.parse.urlparse(link).hostname or "Google News"
                items.append({
                    "title": title,
                    "description": text_content(child_text(node, "description"))[:260],
                    "link": link,
                    "source": source.removeprefix("www."),
                    "category": category,
                    "publishedAt": parse_date(child_text(node, "pubDate")),
                })
                if len(items) >= MAX_PER_FEED:
                    break
            return items
        except (urllib.error.URLError, TimeoutError, ET.ParseError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not fetch {category} feed: {last_error}")


def main() -> None:
    articles: dict[str, dict[str, str]] = {}
    failures: list[str] = []
    for category, query in FEEDS:
        try:
            for article in fetch_feed(category, query):
                articles.setdefault(article["link"], article)
            print(f"Fetched {category}: {sum(item['category'] == category for item in articles.values())} articles")
        except RuntimeError as error:
            failures.append(str(error))
            print(f"WARNING: {error}")

    if not articles:
        raise SystemExit("All RSS feeds failed; keeping the previous news data. " + "; ".join(failures))

    sorted_articles = sorted(articles.values(), key=lambda item: item["publishedAt"], reverse=True)
    data = {"updatedAt": datetime.now(timezone.utc).isoformat(), "items": sorted_articles}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(sorted_articles)} articles to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

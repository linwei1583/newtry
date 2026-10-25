#!/usr/bin/env python3
"""Fetch the ten most-starred public repositories from GitHub."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "repositories.json"
API_URL = "https://api.github.com/search/repositories?" + urllib.parse.urlencode({
    "q": "is:public fork:false stars:>0",
    "sort": "stars",
    "order": "desc",
    "per_page": 10,
})


def fetch() -> list[dict]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GitHub-Pulse-Top-Repositories",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(API_URL, headers=headers)
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.load(response)
            entries = result.get("items", [])
            if not entries:
                raise RuntimeError("GitHub API returned no repositories")
            repos = []
            for rank, item in enumerate(entries[:10], start=1):
                license_info = item.get("license") or {}
                repos.append({
                    "rank": rank,
                    "name": item["name"],
                    "fullName": item["full_name"],
                    "owner": item["owner"]["login"],
                    "url": item["html_url"],
                    "description": item.get("description") or "",
                    "language": item.get("language"),
                    "stars": item.get("stargazers_count", 0),
                    "forks": item.get("forks_count", 0),
                    "pushedAt": item.get("pushed_at"),
                    "license": license_info.get("spdx_id") or license_info.get("name") or "",
                    "topics": item.get("topics", []),
                })
            return repos
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not fetch GitHub repository ranking: {last_error}")


def main() -> None:
    repositories = fetch()
    data = {"updatedAt": datetime.now(timezone.utc).isoformat(), "repositories": repositories}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(repositories)} repositories to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

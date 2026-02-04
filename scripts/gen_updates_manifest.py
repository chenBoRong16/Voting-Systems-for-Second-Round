#!/usr/bin/env python3
"""Generate updates/manifest.json.

- Scans updates/*.md (YYYY-MM-DD.md)
- Sorts newest first
- Writes a JSON manifest used by /web/updates/

This script is safe to run repeatedly.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

DATE_MD_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.md$")


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    updates_dir = repo_root / "updates"
    updates_dir.mkdir(parents=True, exist_ok=True)

    files = [p for p in updates_dir.glob("*.md") if DATE_MD_RE.match(p.name)]
    files.sort(key=lambda p: p.name, reverse=True)  # ISO date => lexicographic

    manifest = {
        "notes": [f"updates/{p.name}" for p in files],
    }

    out = updates_dir / "manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(manifest['notes'])} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Lightweight internal link checker for this repo.

Goals:
- Catch broken relative links in docs/ and web/.
- Understand the site's special pattern: /web/*/?doc=/docs/*.md
- Skip requirement/ by default (spec says it's out of scope).

Usage:
  python3 scripts/check_internal_links.py
  python3 scripts/check_internal_links.py --verbose

Exit code:
- 0 if no problems
- 1 if any broken references are found

This is intentionally conservative: it only checks links that are clearly local
files. It ignores:
- http(s) links
- mailto/tel
- pure anchors (#...)
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, parse_qs

REPO_ROOT = Path(__file__).resolve().parents[1]

SKIP_DIRS = {
    "requirement",
    ".git",
    ".vscode",
    "node_modules",
    "__pycache__",
}


@dataclass(frozen=True)
class Problem:
    file: Path
    link: str
    reason: str


def is_external(href: str) -> bool:
    href = href.strip()
    return bool(re.match(r"^(https?:)?//", href, re.I)) or href.startswith("mailto:") or href.startswith("tel:")


def is_anchor_only(href: str) -> bool:
    href = href.strip()
    return href.startswith("#")


def normalize_repo_abs(path_str: str) -> Path:
    # Accept both "/docs/.." and "docs/..".
    s = path_str.strip()
    if s.startswith("/"):
        s = s[1:]
    return (REPO_ROOT / s).resolve()


def exists_case_sensitive(p: Path) -> bool:
    # On Linux this is redundant, but it helps keep intent clear.
    return p.exists()


class LinkHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []
        self.srcs: list[str] = []

    def handle_starttag(self, tag: str, attrs):
        attrs_dict = dict(attrs)
        if tag in {"a", "link"} and "href" in attrs_dict:
            self.hrefs.append(str(attrs_dict["href"]))
        if tag in {"script", "img", "source"} and "src" in attrs_dict:
            self.srcs.append(str(attrs_dict["src"]))


MD_LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")


def iter_files(root: Path) -> list[Path]:
    out: list[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel_parts = p.relative_to(root).parts
        if any(part in SKIP_DIRS for part in rel_parts):
            continue
        if p.suffix.lower() in {".md", ".html"}:
            out.append(p)
    return out


def check_html_file(p: Path) -> list[str]:
    text = p.read_text(encoding="utf-8", errors="replace")
    parser = LinkHTMLParser()
    parser.feed(text)
    return [*parser.hrefs, *parser.srcs]


def check_md_file(p: Path) -> list[str]:
    text = p.read_text(encoding="utf-8", errors="replace")
    links: list[str] = []
    for m in MD_LINK_RE.finditer(text):
        href = m.group(1).strip()
        # Strip title part: (path "title")
        if " " in href and not href.startswith("<"):
            href = href.split(" ", 1)[0].strip()
        href = href.strip("<>")
        links.append(href)
    return links


def resolve_relative(from_file: Path, href: str) -> Path:
    # Resolve relative links against the file's directory.
    base = from_file.parent
    # Drop anchors
    href = href.split("#", 1)[0]
    return (base / href).resolve()


def check_href(from_file: Path, href: str, verbose: bool) -> list[Problem]:
    href = href.strip()
    if not href or is_external(href) or is_anchor_only(href):
        return []

    # Ignore data: urls
    if href.startswith("data:"):
        return []

    # Handle our viewer pattern: ?doc=/docs/....md
    if "?doc=" in href:
        parsed = urlparse(href)
        qs = parse_qs(parsed.query)
        doc = (qs.get("doc") or [""])[0]
        if not doc:
            return [Problem(from_file, href, "missing doc parameter")]
        target = normalize_repo_abs(doc)
        if not exists_case_sensitive(target):
            return [Problem(from_file, href, f"doc target not found: {target.relative_to(REPO_ROOT)}")]
        return []

    # Absolute-from-root paths like /docs/x.md
    if href.startswith("/"):
        target = normalize_repo_abs(href)
        if not exists_case_sensitive(target):
            return [Problem(from_file, href, f"target not found: {target.relative_to(REPO_ROOT)}")]
        return []

    # Relative paths
    # Some hrefs are just querystrings (unlikely here) – ignore.
    if href.startswith("?"):
        return []

    target = resolve_relative(from_file, href)

    # If it resolves outside repo root, ignore.
    try:
        target.relative_to(REPO_ROOT)
    except ValueError:
        return []

    if not exists_case_sensitive(target):
        return [Problem(from_file, href, f"target not found: {target.relative_to(REPO_ROOT)}")]

    return []


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args(argv)

    problems: list[Problem] = []
    files = iter_files(REPO_ROOT)

    for f in files:
        try:
            if f.suffix.lower() == ".html":
                links = check_html_file(f)
            else:
                links = check_md_file(f)
        except Exception as e:
            problems.append(Problem(f, "(parse)", f"failed to parse: {e}"))
            continue

        for href in links:
            problems.extend(check_href(f, href, args.verbose))

    if problems:
        print(f"Found {len(problems)} potential problem(s):")
        for pr in problems:
            rel = pr.file.relative_to(REPO_ROOT)
            print(f"- {rel}: {pr.link} -> {pr.reason}")
        return 1

    print("No broken internal links found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""Audit runtime asset references and tracked binary duplication.

This is read-only. It catches missing runtime PNGs, unregistered lair assets, and
superseded paths that should not return. Exact duplicate groups are reported for review
rather than failed because a small number are intentional comparison fixtures.
"""
from __future__ import annotations

import hashlib
import re
import subprocess
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_REGISTRY = ROOT / "js/assets.js"
OPTIONAL_RUNTIME = {"assets/ending_art.png"}  # Procedural ending is the fallback.
STALE_PATH_PARTS = (
    "assets/experiments/entrance_continuity/",
    "assets/story/entrance_v2/",
    "assets/story/entrance_v3/",
    "assets/story/entrance_v4/",
    "assets/story/entrance_v5/",
    "assets/story/entrance_v6/",
)


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, check=True, capture_output=True
    )
    return [item.decode() for item in result.stdout.split(b"\0") if item]


def runtime_assets() -> list[str]:
    return re.findall(r"['\"](assets/[^'\"]+)['\"]", ASSET_REGISTRY.read_text())


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def main() -> int:
    tracked = tracked_files()
    failures: list[str] = []

    registered = set(runtime_assets())
    missing = sorted(path for path in registered if not (ROOT / path).is_file())
    required_missing = [path for path in missing if path not in OPTIONAL_RUNTIME]
    failures.extend(f"missing runtime asset: {path}" for path in required_missing)

    lair_files = {
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / "assets/lair").glob("*")
        if path.is_file()
    }
    failures.extend(
        f"unregistered lair asset: {path}" for path in sorted(lair_files - registered)
    )

    stale = sorted(path for path in tracked if path.startswith(STALE_PATH_PARTS))
    failures.extend(f"superseded tracked path: {path}" for path in stale)

    binary_paths = [
        ROOT / path for path in tracked
        if path.startswith("assets/") and (ROOT / path).is_file()
    ]
    groups: dict[tuple[int, str], list[Path]] = defaultdict(list)
    for path in binary_paths:
        size = path.stat().st_size
        if size:
            groups[(size, digest(path))].append(path)
    duplicates = [paths for paths in groups.values() if len(paths) > 1]
    duplicate_bytes = sum((len(paths) - 1) * paths[0].stat().st_size for paths in duplicates)

    print(f"runtime registry: {len(registered)} paths")
    print(f"optional missing fallbacks: {len(missing) - len(required_missing)}")
    print(f"tracked asset files: {len(binary_paths)}")
    print(f"exact duplicate groups: {len(duplicates)} ({duplicate_bytes / 1024 / 1024:.2f} MiB)")
    print("duplicate groups are informational; comparison and production copies may be intentional")

    if failures:
        print("\nFAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("PASS: repository asset contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

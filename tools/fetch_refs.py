#!/usr/bin/env python3
"""Download likeness reference photos for the cast.

The gachi wikis sit behind a bot check that curl cannot pass, so this pulls
from image search instead. Results are filtered to reasonably sized images and
saved as assets/ref/<name>_<n>.jpg for review before they are used as
generation references. Reference photos are never shipped in the game build.

Usage:
  fetch_refs.py "billy=Billy Herrington bodybuilder portrait" [more...] [--count 4]
"""
import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request

OUT = "assets/ref"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def get(url, referer=None, timeout=20):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "*/*",
        **({"Referer": referer} if referer else {}),
    })
    return urllib.request.urlopen(req, timeout=timeout).read()


def search(query, count):
    page = get("https://duckduckgo.com/?q=" + urllib.parse.quote(query) + "&iax=images&ia=images").decode("utf-8", "ignore")
    m = re.search(r'vqd=["\']?([\w-]+)["\']?', page)
    if not m:
        return []
    vqd = m.group(1)
    api = ("https://duckduckgo.com/i.js?l=us-en&o=json&q=" + urllib.parse.quote(query)
           + "&vqd=" + vqd + "&f=,,,&p=1")
    data = json.loads(get(api, referer="https://duckduckgo.com/").decode("utf-8", "ignore"))
    out = []
    for r in data.get("results", []):
        w, h = r.get("width", 0), r.get("height", 0)
        if w < 300 or h < 300:
            continue
        out.append(r["image"])
        if len(out) >= count * 3:
            break
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("specs", nargs="+", help="name=search query")
    p.add_argument("--count", type=int, default=4)
    args = p.parse_args()
    os.makedirs(OUT, exist_ok=True)
    for spec in args.specs:
        name, _, query = spec.partition("=")
        urls = search(query, args.count)
        saved = 0
        for url in urls:
            if saved >= args.count:
                break
            try:
                blob = get(url, timeout=15)
            except Exception:
                continue
            if len(blob) < 12000:
                continue
            ext = ".png" if blob[:4] == b"\x89PNG" else ".jpg"
            with open(f"{OUT}/{name}_{saved}{ext}", "wb") as f:
                f.write(blob)
            saved += 1
        print(f"{name}: {saved} refs")
        time.sleep(1)


if __name__ == "__main__":
    main()

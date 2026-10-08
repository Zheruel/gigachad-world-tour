#!/usr/bin/env python3
"""Build the GitHub Pages site: the tracked runtime files, plus a .webp beside every PNG under assets/.

    python3 tools/production/build_pages.py [out_dir=_site] [--jobs N]

Colour is lossy for opaque images and for large transparent layers (stage plates, props, cards);
character frames and small sprites are lossless. Alpha is always exact, so silhouettes and
outlines never change. The PNGs ship too (index.html and anything outside
js/asset_url.js still use them); the build turns WEBP on in its copy of js/asset_url.js.
Needs cwebp (libwebp) and Pillow.
"""
import os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Reference material, production tools and checks are never fetched by the game.
SKIP = ('assets/sources/', 'audio/sources/', 'tools/production/', 'tools/verification/', 'docs/', '.claude/', '.github/')
LOSSY = ['-q', '90', '-alpha_q', '100', '-m', '6', '-sharp_yuv', '-metadata', 'none']
LOSSLESS = ['-lossless', '-z', '6', '-metadata', 'none']


def runtime_files():
    out = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, check=True, capture_output=True).stdout.decode().split('\0')
    return [f for f in out if f and not f.startswith(SKIP) and not f.endswith('.md') and os.path.isfile(os.path.join(ROOT, f))]


def lossy(rel, path):
    with Image.open(path) as im:
        if 'A' not in im.getbands() and 'transparency' not in im.info:
            return True
        if im.convert('RGBA').getchannel('A').getextrema()[0] == 255:
            return True
        # Small sprites show lossy colour error at their edges; character frames are kept exact.
        return not rel.startswith('assets/frames/') and im.width * im.height >= 256 * 256


def to_webp(out, rel):
    src, dst = os.path.join(out, rel), os.path.join(out, rel[:-4] + '.webp')
    subprocess.run(['cwebp', '-quiet', *(LOSSY if lossy(rel, src) else LOSSLESS), src, '-o', dst], check=True)
    return os.path.getsize(src), os.path.getsize(dst)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    jobs = int(sys.argv[sys.argv.index('--jobs') + 1]) if '--jobs' in sys.argv else os.cpu_count()
    out = os.path.abspath(args[0] if args else os.path.join(ROOT, '_site'))
    if os.path.exists(out):
        shutil.rmtree(out)
    files = runtime_files()
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(out, f)), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, f), os.path.join(out, f))
    pngs = [f for f in files if f.startswith('assets/') and f.endswith('.png')]
    with ThreadPoolExecutor(jobs) as pool:
        sizes = list(pool.map(lambda f: to_webp(out, f), pngs))
    url = os.path.join(out, 'js/asset_url.js')
    with open(url) as fh:
        code = fh.read()
    if 'const WEBP = false;' not in code:
        sys.exit('js/asset_url.js no longer has the WEBP switch')
    with open(url, 'w') as fh:
        fh.write(code.replace('const WEBP = false;', 'const WEBP = true;'))
    png, webp = sum(s[0] for s in sizes), sum(s[1] for s in sizes)
    print(f'{len(files)} files, {len(pngs)} images: {png / 1e6:.1f} MB PNG -> {webp / 1e6:.1f} MB WebP')


if __name__ == '__main__':
    main()

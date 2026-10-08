#!/usr/bin/env python3
"""Build the GitHub Pages site: the tracked runtime files, plus a compressed copy of each image and sample.

    python3 tools/production/build_pages.py [out_dir=_site] [--jobs N]

Colour is lossy for opaque images and for large transparent layers (stage plates, props, cards);
character frames and small sprites are lossless. Alpha is always exact, so silhouettes and
outlines never change. Runtime WAVs under audio/ get a VBR MP3 (browsers trim LAME's encoder
delay, so onsets and loops line up). The sources ship too (index.html and anything outside
js/asset_url.js still use them); the build turns COMPRESSED on in its copy of js/asset_url.js.
Needs cwebp (libwebp), lame and Pillow.
"""
import os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Reference material, production tools and checks are never fetched by the game.
SKIP = ('assets/sources/', 'audio/sources/', 'tools/production/', 'tools/verification/', 'docs/', '.claude/', '.github/')
LOSSY = ['-q', '90', '-alpha_q', '100', '-m', '6', '-sharp_yuv', '-metadata', 'none']
LOSSLESS = ['-lossless', '-z', '6', '-metadata', 'none']
MP3 = ['lame', '--quiet', '-V', '2']


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


def to_mp3(out, rel):
    src, dst = os.path.join(out, rel), os.path.join(out, rel[:-4] + '.mp3')
    subprocess.run([*MP3, src, dst], check=True)
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
    wavs = [f for f in files if f.startswith('audio/') and f.endswith('.wav')]
    clash = [f for f in wavs if f[:-4] + '.mp3' in files]
    if clash:
        sys.exit(f'an .mp3 already sits beside {clash[0]}')
    with ThreadPoolExecutor(jobs) as pool:
        images = list(pool.map(lambda f: to_webp(out, f), pngs))
        samples = list(pool.map(lambda f: to_mp3(out, f), wavs))
    url = os.path.join(out, 'js/asset_url.js')
    with open(url) as fh:
        code = fh.read()
    if 'const COMPRESSED = false;' not in code:
        sys.exit('js/asset_url.js no longer has the COMPRESSED switch')
    with open(url, 'w') as fh:
        fh.write(code.replace('const COMPRESSED = false;', 'const COMPRESSED = true;'))
    mb = lambda sizes, i: sum(s[i] for s in sizes) / 1e6
    print(f'{len(files)} files; {len(pngs)} images {mb(images, 0):.1f} -> {mb(images, 1):.1f} MB WebP; '
          f'{len(wavs)} samples {mb(samples, 0):.1f} -> {mb(samples, 1):.1f} MB MP3')


if __name__ == '__main__':
    main()

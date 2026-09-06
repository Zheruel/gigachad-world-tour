#!/bin/bash
# build_title.sh SRC.png [TOP] - crop a generated lair plate to the title band and
# pixelate it into assets/ui/title_art.png (984x372 = 492x186 logical at RS 2).
# TOP is the top edge of the crop as a fraction of source height; the band is the
# 2.645:1 slice below it, so TOP chooses what the logo sits over.
set -euo pipefail
cd "$(dirname "$0")/../.."

src="$1"; top="${2:-0.18}"
bot=$(./.venv/bin/python -c "
from PIL import Image
im = Image.open('$src')
print(min(1.0, $top + (im.width / 2.645) / im.height))
")
./.venv/bin/python tools/production/pixelate.py "$src" assets/ui/title_art.png \
  --size 984x372 --colors 128 --crop "0,$top,1,$bot"

"""Prepare the selected illustrated results card; lettering remains live UI."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
im=Image.open(ROOT/'assets/sources/production/ui/results_card.png').convert('RGB')
im.resize((960,540),Image.Resampling.LANCZOS).save(ROOT/'assets/ui/results_card.png')

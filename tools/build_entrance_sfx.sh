#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$PROJECT_ROOT/audio/sfx/raw/road_rash_1996"
OUT="$PROJECT_ROOT/audio/sfx"

# Road Rash 95 stores the player's engine as a 26 ms loop and changes its
# playback rate as the motorcycle accelerates. Recreate that late-32-bit
# stepped pitch behaviour, then crossfade the gears so the entrance remains
# cinematic rather than sounding like a hard sample switch.
ffmpeg -hide_banner -loglevel error -y \
  -stream_loop -1 -t 6 -i "$RAW/ENGSPORT.WAV" \
  -filter_complex "\
    [0:a]asplit=4[e0][e1][e2][e3];\
    [e0]asetrate=8200,aresample=22050,atrim=duration=0.86,afade=t=in:st=0:d=0.05[s0];\
    [e1]asetrate=9600,aresample=22050,atrim=duration=0.95[s1];\
    [e2]asetrate=11600,aresample=22050,atrim=duration=0.95[s2];\
    [e3]asetrate=7600,aresample=22050,atrim=duration=0.85,afade=t=out:st=0.58:d=0.27[s3];\
    [s0][s1]acrossfade=d=0.08:c1=tri:c2=tri[x1];\
    [x1][s2]acrossfade=d=0.08:c1=tri:c2=tri[x2];\
    [x2][s3]acrossfade=d=0.08:c1=tri:c2=tri,\
      highpass=f=55,lowpass=f=5200,acompressor=threshold=0.18:ratio=2.5:attack=8:release=90,\
      volume=0.46,alimiter=limit=0.82[engine]" \
  -map "[engine]" -ar 22050 -ac 1 -c:a pcm_s16le "$OUT/entrance_engine.wav"

# Use Road Rash's dedicated asphalt skid instead of repurposing a combat
# sweep. A short gated echo gives the brake room to read on the Delhi street.
ffmpeg -hide_banner -loglevel error -y \
  -i "$RAW/SKIDONNR.WAV" \
  -af "aresample=22050,highpass=f=90,lowpass=f=6200,aecho=0.8:0.58:58:0.16,apad=pad_dur=0.14,atrim=duration=0.56,afade=t=out:st=0.38:d=0.18,volume=0.62,alimiter=limit=0.86" \
  -ar 22050 -ac 1 -c:a pcm_s16le "$OUT/entrance_skid.wav"

printf '%s\n' "Built Road Rash 95 entrance engine and skid cues."

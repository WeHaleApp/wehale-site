#!/bin/zsh
# The home hero loops, cut from the brand film (WH_16x9.mp4 for desktop, WH_9x16.mp4 for phones: the same edit, so
# phones get their own framing instead of a tight crop). No audio, a calm grade, fade in and out so the loop breathes.
#   scripts/make-hero-video.sh "<folder with WH_16x9.mp4 and WH_9x16.mp4>"
set -e
SRC=${1:-"$HOME/Documents/WeHale/03-Marketing/3. Brandfilm"}
OUT=public/assets/video/hero
GRADE="eq=saturation=0.88:contrast=0.96:gamma=1.02"
mk() { # name, filter_complex (uses [0:v]), total seconds
  local name=$1 fc=$2 dur=$3
  for f in 16x9 9x16; do
    if [[ $f == 16x9 ]]; then S="scale=1280:720"; W=1280; else S="scale=540:960"; W=540; fi
    ffmpeg -v error -y -i "$SRC/WH_$f.mp4" -filter_complex "$fc,$GRADE,$S,fade=t=in:st=0:d=1.2,fade=t=out:st=$(( dur - 1.2 )):d=1.2,format=yuv420p[v]" \
      -map "[v]" -an -c:v libx264 -preset slow -crf 27 -profile:v high -movflags +faststart -r 24 "$OUT/$name-$f.mp4"
    ffmpeg -v error -y -ss 1.4 -i "$OUT/$name-$f.mp4" -frames:v 1 -vf "scale=$W:-1" -q:v 3 "$OUT/$name-$f-poster.jpg"
  done
}
# film (release 2): whole shots only, cut inside the film's own shot bounds (scene cuts at 6.97, 21.06, 26.53, 35.99,
# 42.17 s), each holding 3 s or more on its own, joined by 1 s cross-dissolves, and a seamless loop: the end dissolves
# back into the valley and the first second is trimmed, so the last frame meets the first.
#   valley 0.3–6.8 → the woman under the pink sky 21.3–26.3 → eyes closed 36.05–38.85 (slowed to 65 %, before they open)
#   → the valley again 0.3–1.3
mkloop() {
  for f in 16x9 9x16; do
    if [[ $f == 16x9 ]]; then S="scale=1280:720"; W=1280; else S="scale=540:960"; W=540; fi
    ffmpeg -v error -y -i "$SRC/WH_$f.mp4" -filter_complex "[0:v]trim=0.3:6.8,setpts=PTS-STARTPTS[a];[0:v]trim=21.3:26.3,setpts=PTS-STARTPTS[b];[0:v]trim=36.05:38.85,setpts=(PTS-STARTPTS)/0.65[c];[0:v]trim=0.3:1.3,setpts=PTS-STARTPTS[d];[a][b]xfade=transition=fade:duration=1:offset=5.5[ab];[ab][c]xfade=transition=fade:duration=1:offset=9.5[abc];[abc][d]xfade=transition=fade:duration=1:offset=12.8,trim=1.0,setpts=PTS-STARTPTS,$GRADE,$S,format=yuv420p[v]" \
      -map "[v]" -an -c:v libx264 -preset slow -crf 27 -profile:v high -movflags +faststart -r 24 "$OUT/film-$f.mp4"
    # the poster is what iOS shows when autoplay is blocked (Low Power Mode): the misty valley at about 2 s, lifted a little
    ffmpeg -v error -y -ss 2.0 -i "$OUT/film-$f.mp4" -frames:v 1 -vf "eq=gamma=1.18:brightness=0.02:saturation=1.05,scale=$W:-1" -q:v 2 "$OUT/film-$f-poster.jpg"
  done
}
mkloop
# valley: the opening landscape only, slowed to 60 %
mk valley "[0:v]trim=0.3:7.8,setpts=(PTS-STARTPTS)/0.6" 12.5
# stillness: the closed-eyes shot, slowed to 75 %
mk still "[0:v]trim=37.6:42.8,setpts=(PTS-STARTPTS)/0.75" 6.9
ls -la $OUT

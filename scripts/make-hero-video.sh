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
# film: the valley at dawn, a woman under a pink sky, eyes closed; each shot cross-fades into the next
mk film "[0:v]trim=0.5:7.0,setpts=PTS-STARTPTS[a];[0:v]trim=20.5:26.5,setpts=PTS-STARTPTS[b];[0:v]trim=37.8:43.8,setpts=PTS-STARTPTS[c];[a][b]xfade=transition=fade:duration=1.2:offset=5.3[ab];[ab][c]xfade=transition=fade:duration=1.2:offset=10.1" 16.3
# valley: the opening landscape only, slowed to 60 %
mk valley "[0:v]trim=0.3:7.8,setpts=(PTS-STARTPTS)/0.6" 12.5
# stillness: the closed-eyes shot, slowed to 75 %
mk still "[0:v]trim=37.6:42.8,setpts=(PTS-STARTPTS)/0.75" 6.9
ls -la $OUT

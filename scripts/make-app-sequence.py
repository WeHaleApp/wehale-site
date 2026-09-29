#!/usr/bin/env python3
"""The app showcase clip. HONEST LABEL: an animated sequence of real app captures (the Design session's capture set,
admin/workspace/public/screens in wehale-app, made-up personas), with slow push-ins and cross-fades. It is not a screen
recording: the only simulator on this machine belongs to another session, and the capture pipeline makes stills.
  python3 scripts/make-app-sequence.py <folder of story-*.png at 720 px>"""
import subprocess, sys
IN, OUT = sys.argv[1], "public/assets/video/app"
D, X, FPS = 2.6, 0.6, 24
names = ["story-1-home", "story-2-choose", "story-3-breathe", "story-4-closing", "story-5-after", "story-6-week"]
args, fc = [], ""
for i, n in enumerate(names):
    args += ["-loop", "1", "-t", str(D), "-i", f"{IN}/{n}.png"]
    fc += (f"[{i}:v]scale=1080:-2,zoompan=z='min(1+0.0009*on,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
           f"d=1:s=540x1100:fps={FPS},setsar=1,format=yuv420p[s{i}];")
prev, off = "s0", 0.0
for j in range(1, len(names)):
    off += D - X
    fc += f"[{prev}][s{j}]xfade=transition=fade:duration={X}:offset={off:.2f}[x{j}];"
    prev = f"x{j}"
total = off + D
fc += f"[{prev}]fade=t=out:st={total - 0.5:.2f}:d=0.5[v]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow",
                "-crf", "26", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", f"{OUT}/app-sequence.mp4"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.2", "-i", f"{OUT}/app-sequence.mp4", "-frames:v", "1", "-q:v", "3", f"{OUT}/app-sequence-poster.jpg"], check=True)
print(f"{total:.1f} s")

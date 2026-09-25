"""Frame grabs so a rendered cut can be reviewed as images.

python tools/stills.py output/cheese-heist_16x9.mp4                 -> contact sheet every 2.5s
python tools/stills.py output/x.mp4 --at 32.0 32.2 46.8             -> individual frames
python tools/stills.py output/x.mp4 --every 1 --cols 4 --width 480  -> denser sheet
"""
import argparse
import json
import subprocess
from pathlib import Path


def duration(video):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", video],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--at", nargs="*", type=float)
    ap.add_argument("--every", type=float, default=2.5)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--width", type=int, default=400)
    ap.add_argument("--out", default="output/stills")
    a = ap.parse_args()

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    stem = Path(a.video).stem
    if a.at:
        for t in a.at:
            png = out / f"{stem}_{t:06.2f}.png"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", a.video, "-frames:v", "1", str(png)], check=True)
            print(png)
        return
    n = max(1, int(duration(a.video) / a.every))
    rows = (n + a.cols - 1) // a.cols
    png = out / f"{stem}_sheet.png"
    font = Path("C:/Windows/Fonts/arial.ttf")
    fontopt = "fontfile='C\\:/Windows/Fonts/arial.ttf':" if font.exists() else ""
    vf = (f"fps=1/{a.every},scale={a.width}:-1,"
          f"drawtext={fontopt}text='%{{pts\\:hms}}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,"
          f"tile={a.cols}x{rows}:padding=4:color=black")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-vf", vf, "-frames:v", "1", str(png)], check=True)
    print(png)


if __name__ == "__main__":
    main()

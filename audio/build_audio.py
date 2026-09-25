"""Builds the full 60s soundtrack (music + SFX + voices) from src/story/shotlist.json.

Usage: python audio/build_audio.py
Output: audio/out/soundtrack.wav
"""
import asyncio
import hashlib
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SHOTLIST = ROOT / "src" / "story" / "shotlist.json"
OUT_DIR = ROOT / "audio" / "out"
CACHE_DIR = ROOT / "audio" / "cache"
SR = 44100
MUSIC_GAIN = 0.30
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- helpers
def tt(dur):
    return np.arange(int(dur * SR)) / SR


def expdec(dur, rate):
    return np.exp(-tt(dur) * rate)


def adsr(n, a=0.005, r=0.02):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def noise(dur):
    return rng.uniform(-1, 1, int(dur * SR))


def band(x, lo, hi):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(x))


def sweep(f0, f1, dur, curve="exp"):
    t = tt(dur)
    if curve == "exp":
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * t / dur
    return 2 * np.pi * np.cumsum(f) / SR


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) if len(x) else 0
    return x * (peak / m) if m > 0 else x


def mix_at(dst, src, start):
    i = int(round(start * SR))
    if i >= len(dst) or len(src) == 0:
        return
    if i < 0:
        src, i = src[-i:], 0
    j = min(len(dst), i + len(src))
    dst[i:j] += src[: j - i]


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- SFX
def s_tick():
    return norm(band(noise(0.03), 2500, 9000) * expdec(0.03, 250) + 0.6 * np.sin(2 * np.pi * 3200 * tt(0.03)) * expdec(0.03, 180))


def s_tock():
    return norm(band(noise(0.03), 1200, 5000) * expdec(0.03, 250) + 0.7 * np.sin(2 * np.pi * 1900 * tt(0.03)) * expdec(0.03, 160))


def s_snore():
    inhale = band(noise(0.8), 200, 1800) * np.sin(np.linspace(0, np.pi, int(0.8 * SR))) ** 2 * 0.6
    t = tt(0.9)
    saw = 2 * ((70 * t) % 1) - 1
    flutter = 0.5 + 0.5 * np.sin(2 * np.pi * 28 * t)
    exhale = band(saw * flutter + 0.3 * noise(0.9), 40, 900) * np.sin(np.linspace(0, np.pi, len(t)))
    return norm(np.concatenate([inhale, np.zeros(int(0.1 * SR)), exhale]))


def s_whoosh():
    d = 0.45
    e = np.sin(np.linspace(0, np.pi, int(d * SR))) ** 2
    lo = band(noise(d), 200, 900) * e
    hi = band(noise(d), 900, 3500) * e * np.linspace(0.2, 1, len(e))
    return norm(lo + hi)


def s_sparkle():
    out = np.zeros(int(0.9 * SR))
    for k, f in enumerate([2637, 3136, 3951, 4699, 3520]):
        ping = np.sin(2 * np.pi * f * tt(0.4)) * expdec(0.4, 10)
        mix_at(out, ping, k * 0.07)
    return norm(out)


def s_pop():
    d = 0.09
    return norm(np.sin(sweep(260, 950, d)) * adsr(int(d * SR), 0.002, 0.03))


def s_sniff():
    d = 0.14
    return norm(band(noise(d), 1800, 6000) * np.sin(np.linspace(0, np.pi, int(d * SR))))


def s_love():
    out = np.zeros(int(0.9 * SR))
    for k, m in enumerate([84, 88, 91, 96]):
        t = tt(0.35)
        f = midi_hz(m) * (1 + 0.02 * np.sin(2 * np.pi * 14 * t))
        tone = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * expdec(0.35, 9)
        mix_at(out, tone, k * 0.09)
    return norm(out)


def s_tip(freq=1250):
    d = 0.05
    return norm(np.sin(2 * np.pi * freq * tt(d)) * expdec(d, 90) + 0.3 * band(noise(d), 2000, 7000) * expdec(d, 300))


def s_creak():
    d = 0.8
    t = tt(d)
    wob = 110 + 45 * np.sin(2 * np.pi * 1.7 * t) + 20 * np.sin(2 * np.pi * 5.3 * t)
    ph = 2 * np.pi * np.cumsum(wob) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    grit = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t))
    return norm(band(saw * grit, 250, 2600) * np.sin(np.linspace(0, np.pi, len(t))))


def s_boing(f0=180, f1=330, d=0.6, depth=0.25):
    t = tt(d)
    base = f0 + (f1 - f0) * np.minimum(1, t / 0.08)
    f = base * (1 + depth * np.sin(2 * np.pi * 13 * t) * np.exp(-t * 5))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm((np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * expdec(d, 5) * adsr(len(t), 0.003, 0.05))


def s_boing_small():
    return s_boing(360, 520, 0.35, 0.18)


def s_phew():
    d = 0.6
    e = np.sin(np.linspace(0, np.pi, int(d * SR))) ** 1.5
    return norm(band(noise(d), 500, 2200) * e * np.linspace(1, 0.4, len(e)))


def s_scramble(length=1.5):
    out = np.zeros(int((length + 0.1) * SR))
    t = 0.0
    k = 0
    while t < length:
        mix_at(out, s_tip(900 + 500 * rng.random()) * (0.6 + 0.4 * (k % 2)), t)
        t += 0.045 + 0.015 * rng.random()
        k += 1
    return norm(out)


def s_strain():
    d = 0.7
    t = tt(d)
    f = (200 + 350 * t / d) * (1 + 0.04 * np.sin(2 * np.pi * 18 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm((np.sin(ph) + 0.3 * np.sin(3 * ph)) * adsr(len(t), 0.05, 0.1))


def s_ding():
    d = 1.3
    out = sum(a * np.sin(2 * np.pi * 1320 * p * tt(d)) * expdec(d, r) for p, a, r in [(1, 1, 3), (2.76, 0.5, 5), (5.4, 0.25, 8), (8.9, 0.1, 12)])
    return norm(out)


def brass(midi, d, bright=3500, vib=5.0):
    t = tt(d)
    f = midi_hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 12))
    return band(saw, 40, bright) * adsr(len(t), 0.03, 0.08)


def s_sting():
    out = np.zeros(int(2.2 * SR))
    for start, dur, notes in [(0, 0.22, [48, 51, 55]), (0.3, 0.22, [47, 50, 54]), (0.6, 1.5, [46, 49, 53, 58])]:
        mix_at(out, sum(brass(n, dur, 2500) for n in notes) * (expdec(dur, 1.2) if dur > 1 else 1), start)
    return norm(out)


def s_gleam():
    d = 0.5
    t = tt(d)
    tone = np.sin(2 * np.pi * 3000 * t) + 0.6 * np.sin(2 * np.pi * 4520 * t)
    return norm(tone * expdec(d, 7) * (0.7 + 0.3 * np.sin(2 * np.pi * 22 * t)))


def s_gulp():
    a = np.sin(sweep(520, 160, 0.16)) * adsr(int(0.16 * SR), 0.003, 0.04)
    b = np.sin(sweep(300, 120, 0.12)) * adsr(int(0.12 * SR), 0.003, 0.04)
    return norm(np.concatenate([a, np.zeros(int(0.05 * SR)), b]))


def s_thud():
    d = 0.4
    body = np.sin(sweep(95, 38, d)) * expdec(d, 9)
    hit = band(noise(d), 60, 600) * expdec(d, 30)
    return norm(body + 0.6 * hit)


def s_zip(f0=600, f1=2600, d=0.22):
    return norm(np.sin(sweep(f0, f1, d)) * adsr(int(d * SR), 0.005, 0.05) + 0.25 * band(noise(d), 2000, 8000) * adsr(int(d * SR), 0.005, 0.05))


def s_zip_up():
    d = 0.55
    t = tt(d)
    f = 300 * (10 ** (t / d)) * (1 + 0.03 * np.sin(2 * np.pi * 9 * t))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(len(t), 0.01, 0.08))


def s_bonk():
    d = 0.9
    t = tt(d)
    metal = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * r) for f, a, r in [(540, 1.0, 9), (812, 0.7, 11), (1251, 0.5, 14), (1893, 0.3, 18)])
    thump = np.sin(sweep(140, 55, d)) * expdec(d, 12) * 1.4
    crack = band(noise(d), 800, 7000) * expdec(d, 60)
    wob = np.sin(2 * np.pi * np.cumsum(260 * (1 + 0.15 * np.sin(2 * np.pi * 11 * t))) / SR) * expdec(d, 4) * 0.35
    return norm(metal + thump + crack + wob)


def s_slide_down(f0=1800, f1=260, d=1.0):
    t = tt(d)
    f = (f0 * (f1 / f0) ** (t / d)) * (1 + 0.025 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm((np.sin(ph) + 0.15 * np.sin(2 * ph)) * adsr(len(t), 0.02, 0.12))


def s_tweety(length=3.0):
    out = np.zeros(int((length + 0.3) * SR))
    t = 0.0
    while t < length:
        chirp = np.sin(sweep(2400, 3600 + 400 * rng.random(), 0.07)) * adsr(int(0.07 * SR), 0.005, 0.02)
        mix_at(out, np.concatenate([chirp, np.zeros(int(0.03 * SR)), chirp]), t)
        t += 0.28
    return norm(out)


def s_brrr():
    d = 0.6
    t = tt(d)
    f = 190 * (1 + 0.1 * np.sin(2 * np.pi * 7 * t))
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * t))
    return norm(band(saw * am, 80, 2500) * adsr(len(t), 0.02, 0.1))


def s_grr():
    d = 0.9
    t = tt(d)
    saw = 2 * ((85 * t) % 1) - 1
    am = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 19 * t + 3 * np.sin(2 * np.pi * 3 * t)))
    return norm(band(saw * am + 0.3 * noise(d), 50, 1400) * adsr(len(t), 0.06, 0.2))


def s_click():
    one = band(noise(0.02), 3000, 9000) * expdec(0.02, 250) + 0.5 * np.sin(2 * np.pi * 2600 * tt(0.02)) * expdec(0.02, 150)
    return norm(np.concatenate([one, np.zeros(int(0.07 * SR)), one * 1.3]))


def s_shing():
    d = 0.5
    t = tt(d)
    swipe = band(noise(d), 3000, 9000) * np.sin(np.linspace(0, np.pi, len(t))) * 0.5
    ring = (np.sin(2 * np.pi * 5200 * t) + 0.5 * np.sin(2 * np.pi * 7800 * t)) * expdec(d, 6) * np.minimum(1, t / 0.12)
    return norm(swipe + ring)


def s_snap():
    d = 0.35
    crack = band(noise(d), 600, 9000) * expdec(d, 90)
    wood = np.sin(2 * np.pi * 1450 * tt(d)) * expdec(d, 40)
    low = np.sin(sweep(160, 60, d)) * expdec(d, 18)
    return norm(crack + 0.8 * wood + low)


def s_scratch():
    d = 0.45
    t = tt(d)
    return norm(band(noise(d), 1800, 6500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 32 * t))) * adsr(len(t), 0.01, 0.1))


def s_clang():
    d = 1.8
    t = tt(d)
    out = sum(a * np.sin(2 * np.pi * 420 * p * t) * np.exp(-t * r) for p, a, r in [(1, 1, 2.5), (1.47, 0.8, 3), (2.09, 0.6, 3.5), (2.56, 0.5, 4), (3.2, 0.35, 5), (4.1, 0.2, 6)])
    out = out * (1 + 0.2 * np.sin(2 * np.pi * 6 * t))
    return norm(out + band(noise(d), 1000, 8000) * expdec(d, 40))


def s_chomp():
    d = 0.09
    return norm(band(noise(d), 150, 1500) * expdec(d, 40) + 0.4 * np.sin(sweep(420, 180, d)) * expdec(d, 30))


def s_swish():
    d = 0.4
    return norm(band(noise(d), 700, 3200) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 2)


def s_tada():
    out = np.zeros(int(2.4 * SR))
    chord = [60, 64, 67, 72]
    mix_at(out, sum(brass(n, 0.18) for n in chord), 0)
    mix_at(out, sum(brass(n, 1.6) for n in chord) * expdec(1.6, 1.4), 0.26)
    return norm(out)


def s_fanfare():
    out = np.zeros(int(2.6 * SR))
    for k, n in enumerate([55, 60, 64, 67]):
        mix_at(out, brass(n, 0.16), k * 0.14)
    mix_at(out, sum(brass(n, 1.4) for n in [60, 64, 67, 72]) * expdec(1.4, 1.5), 0.6)
    return norm(out)


SFX = {
    "tick": s_tick, "tock": s_tock, "snore": s_snore, "whoosh": s_whoosh, "sparkle": s_sparkle,
    "pop": s_pop, "sniff": s_sniff, "love": s_love, "tip": s_tip, "tipLow": lambda: s_tip(700),
    "creak": s_creak, "boing": s_boing, "boingSmall": s_boing_small, "phew": s_phew,
    "scramble": s_scramble, "strain": s_strain, "ding": s_ding, "sting": s_sting, "gleam": s_gleam,
    "gulp": s_gulp, "thud": s_thud, "zip": s_zip, "zipUp": s_zip_up, "bonk": s_bonk,
    "slideDown": s_slide_down, "tweety": s_tweety, "brrr": s_brrr, "grr": s_grr, "click": s_click,
    "shing": s_shing, "snap": s_snap, "scratch": s_scratch, "clang": s_clang, "chomp": s_chomp,
    "swish": s_swish, "tada": s_tada, "fanfare": s_fanfare,
}
LENGTH_AWARE = {"scramble", "tweety"}


# ---------------------------------------------------------------- music
def inst(name, midi, d, vel):
    f = midi_hz(midi)
    t = tt(d)
    n = len(t)
    if n == 0:
        return np.zeros(0)
    if name == "pluck":
        x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (6 + 5 * k)) / k for k in range(1, 6))
        return x * adsr(n, 0.002, 0.02) * vel
    if name == "bass":
        x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
        return x * np.exp(-t * 4) * adsr(n, 0.004, 0.03) * vel
    if name == "clarinet":
        ph = 2 * np.pi * np.cumsum(f * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))) / SR
        x = np.sin(ph) + 0.45 * np.sin(3 * ph) + 0.2 * np.sin(5 * ph) + 0.08 * np.sin(7 * ph)
        return x * adsr(n, 0.03, 0.05) * vel * 0.6
    if name == "bell":
        x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
        return x * np.exp(-t * 3) * adsr(n, 0.002, 0.05) * vel
    if name == "wobble":
        ph = 2 * np.pi * np.cumsum(f * (1 + 0.03 * np.sin(2 * np.pi * 4 * t)) * (1 - 0.04 * t / max(d, 0.01))) / SR
        return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-t * 2) * adsr(n, 0.01, 0.05) * vel
    if name == "trem":
        ph = 2 * np.pi * f * t
        x = sum(np.sin(k * ph) / k for k in range(1, 8))
        return x * (0.55 + 0.45 * np.sin(2 * np.pi * 13 * t)) * adsr(n, 0.08, 0.1) * vel * 0.5
    if name == "brass":
        return brass(midi, d) * vel * 0.5
    raise ValueError(name)


# Each style: bpm, beats per bar, and a list of (beat, len_beats, midi, instrument, velocity) per bar-loop.
def pattern(style):
    if style == "title":
        bars = [
            [(0, .5, 36, "bass", .9), (1, .4, 60, "pluck", .5), (1, .4, 64, "pluck", .5), (2, .5, 43, "bass", .8), (3, .4, 60, "pluck", .5), (3, .4, 64, "pluck", .5),
             (0, 1, 67, "clarinet", .7), (1, 1, 69, "clarinet", .7), (2, 1, 71, "clarinet", .7), (3, 1, 72, "clarinet", .8)],
            [(0, .5, 41, "bass", .9), (1, .4, 65, "pluck", .5), (1, .4, 69, "pluck", .5), (2, .5, 43, "bass", .8), (3, .4, 67, "pluck", .5), (3, .4, 71, "pluck", .5),
             (0, 1.5, 76, "clarinet", .8), (1.5, .5, 74, "clarinet", .7), (2, 1, 72, "clarinet", .7), (3, 1, 67, "clarinet", .7)],
        ]
        return 132, 4, bars
    if style == "curious":
        bars = [[(0, .5, 60, "pluck", .6), (1, .5, 64, "pluck", .6), (2, .5, 67, "pluck", .6), (3, .5, 71, "pluck", .7), (3.5, 1, 83, "bell", .35)],
                [(0, .5, 62, "pluck", .6), (1, .5, 65, "pluck", .6), (2, .5, 69, "pluck", .6), (3, 1, 72, "bell", .4)]]
        return 100, 4, bars
    if style in ("sneak", "sneakFast"):
        bars = [[(0, .3, 45, "pluck", .9), (1, .3, 48, "pluck", .7), (2, .3, 52, "pluck", .8), (3, .3, 53, "pluck", .7)],
                [(0, .3, 52, "pluck", .9), (1, .3, 48, "pluck", .7), (2, .3, 47, "pluck", .8), (3, .3, 44, "pluck", .7)]]
        if style == "sneak":
            bars[0].append((0, 3.5, 57, "clarinet", .25))
            bars[1].append((0, 3.5, 56, "clarinet", .25))
        return (150 if style == "sneak" else 300), 4, bars
    if style == "suspense":
        bars = [[(0, 4, 45, "trem", .5), (0, 4, 48, "trem", .4), (0, 4, 51, "trem", .35), (0, .4, 33, "bass", 1.0), (2, .4, 33, "bass", .8)]]
        return 150, 4, bars
    if style == "chase":
        run = [69, 72, 76, 81, 79, 76, 72, 76]
        run2 = [71, 74, 77, 83, 81, 77, 74, 71]
        bars = [[(i * .5, .45, m, "clarinet", .6) for i, m in enumerate(run)] + [(0, .4, 33, "bass", 1), (1, .3, 57, "pluck", .6), (2, .4, 40, "bass", .9), (3, .3, 57, "pluck", .6), (0, .25, 57, "brass", .5)],
                [(i * .5, .45, m, "clarinet", .6) for i, m in enumerate(run2)] + [(0, .4, 38, "bass", 1), (1, .3, 59, "pluck", .6), (2, .4, 40, "bass", .9), (3, .3, 56, "pluck", .6), (0, .25, 56, "brass", .5)]]
        return 176, 4, bars
    if style == "dizzy":
        bars = [[(0, 1, 79, "wobble", .5), (1, 1, 76, "wobble", .4), (2, 1, 72, "wobble", .4), (0, 1, 48, "bass", .6)],
                [(0, 1, 77, "wobble", .5), (1, 1, 74, "wobble", .4), (2, 1, 71, "wobble", .4), (0, 1, 43, "bass", .6)]]
        return 90, 3, bars
    if style == "scheme":
        bars = [[(0, .5, 40, "pluck", .9), (1, .5, 41, "pluck", .8), (2, .5, 42, "pluck", .8), (3, .5, 43, "pluck", .9), (0, 4, 52, "clarinet", .2)],
                [(0, .5, 43, "pluck", .9), (1, .5, 42, "pluck", .8), (2, .5, 41, "pluck", .8), (3, .5, 40, "pluck", .9), (3.5, .5, 64, "bell", .3)]]
        return 120, 4, bars
    if style == "happy":
        bars = [[(0, .5, 41, "bass", .9), (1, .4, 65, "pluck", .5), (1, .4, 69, "pluck", .5), (2, .5, 48, "bass", .8), (3, .4, 65, "pluck", .5), (3, .4, 69, "pluck", .5),
                 (0, .5, 72, "clarinet", .6), (.5, .5, 74, "clarinet", .6), (1, 1, 77, "clarinet", .7), (2, .5, 76, "clarinet", .6), (2.5, .5, 74, "clarinet", .6), (3, 1, 72, "clarinet", .6)],
                [(0, .5, 46, "bass", .9), (1, .4, 65, "pluck", .5), (1, .4, 70, "pluck", .5), (2, .5, 48, "bass", .8), (3, .4, 64, "pluck", .5), (3, .4, 70, "pluck", .5),
                 (0, 1, 74, "clarinet", .6), (1, 1, 72, "clarinet", .6), (2, 1, 70, "clarinet", .6), (3, 1, 69, "clarinet", .7)]]
        return 120, 4, bars
    if style == "finale":
        bars = [[(0, 3, 53, "clarinet", .5), (0, 3, 57, "clarinet", .45), (0, 3, 60, "clarinet", .45), (0, 3, 65, "bell", .4), (0, 3, 41, "bass", .8)]]
        return 60, 3, bars
    raise ValueError(style)


def render_section(style, dur):
    bpm, beats_per_bar, bars = pattern(style)
    spb = 60.0 / bpm
    out = np.zeros(int((dur + 2.0) * SR))
    bar_len = beats_per_bar * spb
    bar_i = 0
    t0 = 0.0
    while t0 < dur:
        for beat, length, midi, name, vel in bars[bar_i % len(bars)]:
            start = t0 + beat * spb
            if start < dur:
                mix_at(out, inst(name, midi, length * spb, vel), start)
        t0 += bar_len
        bar_i += 1
    out = out[: int(dur * SR)]
    return out * adsr(len(out), 0.01, 0.06)


# ---------------------------------------------------------------- voices
def ffmpeg_exe():
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.exit("ffmpeg not found on PATH")
    return exe


def read_wav_mono(path):
    with wave.open(str(path), "rb") as w:
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        if w.getnchannels() > 1:
            data = data.reshape(-1, w.getnchannels()).mean(axis=1)
    return data


async def tts_save(text, voice, rate, pitch, path):
    import edge_tts

    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(path))


def voice_clip(v):
    key = hashlib.sha1(json.dumps(v, sort_keys=True).encode()).hexdigest()[:12]
    wav = CACHE_DIR / f"voice_{key}.wav"
    if not wav.exists():
        mp3 = CACHE_DIR / f"voice_{key}.mp3"
        asyncio.run(tts_save(v["text"], v["voice"], v.get("rate", "+0%"), v.get("pitch", "+0Hz"), mp3))
        speed = float(v.get("speedup", 1.0))
        af = f"asetrate=24000*{speed},aresample={SR}"
        subprocess.run([ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(mp3), "-af", af, "-ac", "1", str(wav)], check=True)
    return read_wav_mono(wav)


# ---------------------------------------------------------------- build
def resolve(entry_t, beats):
    return float(beats[entry_t]) if isinstance(entry_t, str) else float(entry_t)


def main():
    story = json.loads(SHOTLIST.read_text(encoding="utf-8"))
    beats = story["beats"]
    total = float(story["duration"])
    n = int(total * SR)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    music = np.zeros(n)
    for sec in story["music"]:
        mix_at(music, render_section(sec["style"], sec["to"] - sec["from"]), sec["from"])
    music = norm(music, 1.0) * MUSIC_GAIN

    sfx = np.zeros(n)
    cache = {}
    for e in story["sfx"]:
        names = e["sound"] if isinstance(e["sound"], list) else [e["sound"]]
        if "repeat" in e:
            r = e["repeat"]
            times = list(np.arange(r["from"], r["to"] + 1e-6, r["every"]))
        else:
            times = [resolve(e["t"], beats) + e.get("offset", 0.0)]
        for i, t in enumerate(times):
            name = names[i % len(names)]
            if name in LENGTH_AWARE and "length" in e:
                clip = SFX[name](e["length"])
            else:
                clip = cache.setdefault(name, SFX[name]())
            mix_at(sfx, clip * e.get("gain", 1.0), t)

    voices = np.zeros(n)
    for v in story["voice"]:
        try:
            clip = norm(voice_clip(v)) * v.get("gain", 1.0)
            mix_at(voices, clip, resolve(v["t"], beats))
        except Exception as ex:  # TTS needs network; keep the build going without voices
            print(f"warning: voice '{v['text']}' skipped: {ex}")

    # Duck music under voices for readability.
    env = np.convolve(np.abs(voices), np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
    duck = 1 - 0.6 * np.clip(env * 6, 0, 1)
    master = music * duck + sfx * 0.8 + voices
    master = norm(master, 0.92)
    fade = int(0.8 * SR)
    master[-fade:] *= np.linspace(1, 0, fade)

    pcm = (np.clip(master, -1, 1) * 32767).astype(np.int16)
    stereo = np.repeat(pcm[:, None], 2, axis=1)
    out = OUT_DIR / "soundtrack.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())
    print(f"wrote {out} ({total:.1f}s)")


if __name__ == "__main__":
    main()

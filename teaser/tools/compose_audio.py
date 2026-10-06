"""Compose the deterministic original electronic score for the 60 s GALI teaser.

Scene cuts (seconds) must match CUTS in src/film.js.
Run: python tools/compose_audio.py  -> assets/GALI-Score.wav (build.mjs converts it to MP3).
"""

from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile

DURATION = 60.0
CUTS = [0, 8, 18, 30, 45, 55]
SAMPLE_RATE = 48000
BPM = 120
BEAT = 60.0 / BPM
RNG = np.random.default_rng(20610)
audio = np.zeros((int(DURATION * SAMPLE_RATE), 2), dtype=np.float64)


def add(sound: np.ndarray, start: float, gain: float = 1.0, pan: float = 0.0) -> None:
    offset = max(0, round(start * SAMPLE_RATE))
    end = min(len(audio), offset + len(sound))
    if offset >= end:
        return
    sound = sound[: end - offset] * gain
    audio[offset:end, 0] += sound * np.sqrt((1 - pan) / 2)
    audio[offset:end, 1] += sound * np.sqrt((1 + pan) / 2)


def times(seconds: float) -> np.ndarray:
    return np.arange(round(seconds * SAMPLE_RATE)) / SAMPLE_RATE


def note(midi: int) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def pluck(midi: int, length: float = 0.55) -> np.ndarray:
    t = times(length)
    f = note(midi)
    env = (1 - np.exp(-t * 160)) * np.exp(-t * 7)
    return env * (np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * f * 2 * t)
                  + .10 * np.sin(2 * np.pi * f * 3 * t))


def kick() -> np.ndarray:
    t = times(.38)
    f = 48 + 145 * np.exp(-t * 42)
    phase = 2 * np.pi * np.cumsum(f) / SAMPLE_RATE
    return np.sin(phase) * np.exp(-t * 12) + .10 * RNG.normal(size=len(t)) * np.exp(-t * 100)


def snare() -> np.ndarray:
    t = times(.22)
    noise = RNG.normal(size=len(t))
    noise = signal.sosfilt(signal.butter(2, [700, 10000], btype="bandpass", fs=SAMPLE_RATE, output="sos"), noise)
    return noise * np.exp(-t * 21) * .75 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 28) * .25


def hat() -> np.ndarray:
    t = times(.08)
    noise = signal.sosfilt(signal.butter(2, 7000, btype="highpass", fs=SAMPLE_RATE, output="sos"), RNG.normal(size=len(t)))
    return noise * np.exp(-t * 70)


def bass(midi: int, seconds: float = .41) -> np.ndarray:
    t = times(seconds)
    f = note(midi)
    env = (1 - np.exp(-t * 65)) * np.minimum(1, (seconds - t) * 30) * np.exp(-t * 1.2)
    return (np.sin(2 * np.pi * f * t) + .2 * np.sin(2 * np.pi * f * 2 * t)) * env


chords = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]]
# Evolving pad, with detuned oscillators and gentle stereo movement.
for section in range(16):
    start = section * 4.0
    chord = chords[section % 4]
    t = times(4.4)
    env = np.minimum(1, t * 1.8) * np.minimum(1, (4.4 - t) * 2.4)
    for i, n in enumerate(chord):
        f = note(n + 12)
        sound = (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * f * 1.0014 * t)) * env
        add(sound, start, .035 if start < 18 else .045, -.55 + i * .36)

for step in range(int(DURATION / .25)):
    start = step * .25
    chord = chords[int(start / 4) % 4]
    if start < 8 or start > 55:
        continue
    midi = chord[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] + 24
    amp = .040 if start < 18 else .072
    add(pluck(midi), start, amp, np.sin(step * .7) * .6)
    add(pluck(midi), start + .375, amp * .28, -np.sin(step * .7) * .7)
    add(hat(), start, .030 if step % 2 else .047, .22 if step % 2 else -.22)

for beat in range(int(DURATION / BEAT)):
    start = beat * BEAT
    active = (start >= 18 and start < 54.5) or (start >= 2 and start < 18 and beat % 4 == 0)
    if active:
        add(kick(), start, .31 if start >= 21 else .22)
    if start >= 30 and start < 54.5 and beat % 4 in (1, 3):
        add(snare(), start, .13)
    if start >= 8 and start < 55:
        root = chords[int(start / 4) % 4][0] - 12
        add(bass(root if beat % 4 < 3 else root + 7), start, .18)

# Scene cuts receive a low impact and a stereo air sweep.
for cut in CUTS:
    add(kick(), cut, .38)
    t = times(.9)
    pulse = np.sin(2 * np.pi * (40 * t + 52 * (1 - np.exp(-t * 7)))) * np.exp(-t * 4)
    add(pulse, cut, .24)
    sweep_t = times(.72)
    noise = signal.sosfilt(signal.butter(2, [1700, 8500], btype="bandpass", fs=SAMPLE_RATE, output="sos"), RNG.normal(size=len(sweep_t)))
    env = np.sin(np.pi * sweep_t / .72) ** 2
    add(noise * env, max(0, cut - .53), .075, -.35)

# Soft closing chord and enough breathing room for the brand lockup.
for i, midi in enumerate([62, 65, 69, 74]):
    t = times(5.8)
    sound = np.sin(2 * np.pi * note(midi) * t) * np.exp(-t * .75) * (1 - np.exp(-t * 24))
    add(sound, 55, .105, -.45 + i * .3)

audio = np.tanh(audio * 1.25)
audio /= max(1.0, np.abs(audio).max() / .88)
fade_in = np.minimum(1, np.arange(len(audio)) / (SAMPLE_RATE * .04))
fade_out = np.minimum(1, (len(audio) - np.arange(len(audio))) / (SAMPLE_RATE * 1.2))
audio *= (fade_in * fade_out)[:, None]
out = Path(__file__).resolve().parent.parent / "assets" / "GALI-Score.wav"
out.parent.mkdir(parents=True, exist_ok=True)
wavfile.write(out, SAMPLE_RATE, (audio * 32767).astype(np.int16))
print(f"Original score: {out} ({DURATION:g}s, stereo, {SAMPLE_RATE}Hz)")

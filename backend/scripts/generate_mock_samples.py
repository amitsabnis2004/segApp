from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


OUT_DIR = Path(__file__).resolve().parents[2] / "sample_data" / "images"


def save_image(name: str, arr: np.ndarray) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr.astype(np.uint8)).save(OUT_DIR / name)


def make_gradient_sample() -> np.ndarray:
    h, w = 480, 640
    base = np.full((h, w, 3), [210, 215, 220], dtype=np.uint8)
    img = Image.fromarray(base)
    draw = ImageDraw.Draw(img)

    draw.polygon([(130, 160), (260, 110), (300, 190), (170, 230)], fill=(190, 205, 238))
    draw.polygon([(310, 210), (430, 170), (470, 280), (360, 315)], fill=(155, 180, 220))
    draw.polygon([(180, 285), (330, 255), (370, 370), (230, 395)], fill=(110, 145, 200))
    draw.polygon([(420, 95), (545, 70), (595, 170), (480, 195)], fill=(185, 168, 125))

    return np.array(img, dtype=np.uint8)


def make_noise_sample() -> np.ndarray:
    h, w = 512, 512
    substrate = np.full((h, w, 3), [212, 214, 219], dtype=np.int16)
    noise = np.random.normal(0, 5, (h, w, 3)).astype(np.int16)
    arr = np.clip(substrate + noise, 0, 255).astype(np.uint8)

    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)
    draw.ellipse((80, 90, 250, 240), fill=(165, 182, 225))
    draw.ellipse((285, 130, 440, 305), fill=(125, 155, 208))
    draw.rectangle((210, 320, 430, 460), fill=(178, 160, 118))
    return np.array(img, dtype=np.uint8)


def make_roi_sample() -> np.ndarray:
    h, w = 360, 640
    arr = np.full((h, w, 3), [215, 216, 222], dtype=np.uint8)

    arr[120:250, 190:450] = [150, 177, 218]
    arr[155:230, 250:385] = [112, 143, 198]
    return arr


def main() -> None:
    save_image("hbn_mock_01.png", make_gradient_sample())
    save_image("hbn_mock_02.png", make_noise_sample())
    save_image("hbn_mock_03.png", make_roi_sample())
    print(f"Generated mock images in {OUT_DIR}")


if __name__ == "__main__":
    main()

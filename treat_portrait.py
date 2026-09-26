import os
import sys
import numpy as np
import cv2
from rembg import remove, new_session

img_path = r"c:\Users\vijay\Desktop\portfolio\public\photo_1.jpeg"
out_path = r"c:\Users\vijay\Desktop\portfolio\public\portrait_monochrome.png"

print(f"Reading {img_path}...")
img = cv2.imread(img_path)
h, w = img.shape[:2]

session = new_session("isnet-general-use")
print("Removing background with rembg (isnet-general-use)...")
# rembg expects RGBA or RGB bytes/PIL/numpy
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
result_rgba = remove(img_rgb, session=session)

# Extract alpha channel
alpha = result_rgba[:, :, 3].astype(np.float32) / 255.0

# Convert RGB to grayscale
gray = cv2.cvtColor(result_rgba[:, :, :3], cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0

# High contrast monochrome curves:
# Deep blacks, sharp midtones, crisp highlights
contrast = np.power(gray, 1.22)

# Sharpening
kernel = np.array([[-0.2, -0.4, -0.2], [-0.4, 3.4, -0.4], [-0.2, -0.4, -0.2]], dtype=np.float32)
sharp = cv2.filter2D(contrast, -1, kernel)
sharp = np.clip(sharp, 0.0, 1.0)

# Multi-directional organic fades
# 1. Bottom fade: lower body dissolves seamlessly into obsidian deep (#0c0d0e)
y_coords = np.arange(h, dtype=np.float32).reshape(h, 1)
bottom_start = h * 0.52
bottom_end = h * 0.96
bottom_fade = np.clip(1.0 - (y_coords - bottom_start) / (bottom_end - bottom_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# 2. Left side fade: dissolves towards the left edge to blend with text
x_coords = np.arange(w, dtype=np.float32).reshape(1, w)
left_start = w * 0.35
left_fade = np.clip(x_coords / left_start, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# 3. Right edge fade: dissolves smoothly into the right side
right_start = w * 0.82
right_fade = np.clip(1.0 - (x_coords - right_start) / (w - right_start), 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# 4. Top soft edge
top_end = h * 0.10
top_fade = np.clip(y_coords / top_end, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

# Combine alpha with fades
final_alpha = alpha * bottom_fade * left_fade * right_fade * top_fade

# Subtle film grain / noise
np.random.seed(42)
noise = np.random.normal(0, 0.015, (h, w)).astype(np.float32)
final_gray = np.clip(sharp + noise, 0.0, 1.0) * 255.0
final_alpha = np.clip(final_alpha * 255.0, 0.0, 255.0)

# Build BGRA
out_bgra = np.zeros((h, w, 4), dtype=np.uint8)
out_bgra[:, :, 0] = final_gray.astype(np.uint8)
out_bgra[:, :, 1] = final_gray.astype(np.uint8)
out_bgra[:, :, 2] = final_gray.astype(np.uint8)
out_bgra[:, :, 3] = final_alpha.astype(np.uint8)

with open(out_path, "wb") as f:
    success, enc = cv2.imencode(".png", out_bgra)
    if success:
        f.write(enc.tobytes())
        print("Written successfully to:", out_path)
    else:
        print("Failed to encode PNG")

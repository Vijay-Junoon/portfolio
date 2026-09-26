import cv2
import numpy as np
import os
from PIL import Image

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print("Loading photo_1.jpeg...")
img_bgr = cv2.imread(input_path)
h, w, _ = img_bgr.shape
print(f"Original photo shape: {w}x{h}")

# Convert to high contrast monochrome
gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

# Calibrated contrast curve matching the reference image:
# Rich deep blacks in the chair, shirt, background; bright natural highlights on the face, forehead, arm, watch
# S-curve:
contrast = np.power(gray, 1.18)
# Sigmoid contrast curve
contrast = 1.0 / (1.0 + np.exp(-9.5 * (contrast - 0.40)))
contrast = (contrast - contrast.min()) / (contrast.max() - contrast.min() + 1e-6)

# Unsharp mask for high texture definition (hair, facial details, watch, fabric)
blur = cv2.GaussianBlur(contrast, (0, 0), 1.8)
sharpened = cv2.addWeighted(contrast, 1.45, blur, -0.45, 0)
sharpened = np.clip(sharpened, 0.0, 1.0)

# Multi-directional cinematic falloff mask
# Notice in the reference image:
# - Left side of the photo fades completely to pure black (alpha = 0) starting from around x: 0% to x: 45% of width
# - Top fades softly to pure black
# - Bottom fades subtly into the bottom edge
# - Right edge fades softly into the right margin

y_coords = np.arange(h, dtype=np.float32).reshape(h, 1)
x_coords = np.arange(w, dtype=np.float32).reshape(1, w)

# 1. Left Fade: Smooth wide cosine fade so it dissolves into pitch darkness on the left
left_fade_end = w * 0.45
left_factor = np.clip(x_coords / left_fade_end, 0.0, 1.0)
left_factor = 0.5 * (1.0 - np.cos(np.pi * left_factor))

# 2. Top Fade: Soft fade at the top
top_fade_end = h * 0.15
top_factor = np.clip(y_coords / top_fade_end, 0.0, 1.0)
top_factor = 0.5 * (1.0 - np.cos(np.pi * top_factor))

# 3. Bottom Fade: Soft fade at the bottom
bottom_fade_start = h * 0.85
bottom_factor = np.clip(1.0 - (y_coords - bottom_fade_start) / (h - bottom_fade_start), 0.0, 1.0)
bottom_factor = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_factor)))

# 4. Right Fade: Soft fade on the rightmost edge
right_fade_start = w * 0.92
right_factor = np.clip(1.0 - (x_coords - right_fade_start) / (w - right_fade_start), 0.0, 1.0)
right_factor = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_factor)))

# Combine fades
master_alpha = left_factor * top_factor * bottom_factor * right_factor

# Darken the background/shadows in the image progressively as alpha decreases
# This ensures that the transition to obsidian #0c0d0e is 100% seamless
darkened_gray = sharpened * np.power(master_alpha, 0.8)

# Add subtle cinematic film grain
np.random.seed(42)
grain = np.random.normal(0, 0.012, (h, w)).astype(np.float32)
final_gray = np.clip(darkened_gray + grain * master_alpha, 0.0, 1.0) * 255.0
final_alpha = np.clip(master_alpha * 255.0, 0.0, 255.0)

# Build BGRA
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Generated exact match portrait asset: {output_png} (Size: {os.path.getsize(output_png)} bytes)")

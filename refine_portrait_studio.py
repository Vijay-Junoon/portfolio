import os
import cv2
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print(f"Processing portrait from {input_path}...")

# 1. Load the rembg cutout if available or run rembg
from rembg import remove, new_session
session = new_session("u2net")
img_pil = Image.open(input_path).convert("RGB")
w_orig, h_orig = img_pil.size
print(f"Original size: {w_orig}x{h_orig}")

cutout = remove(img_pil, session=session)
cutout_np = np.array(cutout)

r = cutout_np[:, :, 0]
g = cutout_np[:, :, 1]
b = cutout_np[:, :, 2]
alpha = cutout_np[:, :, 3].astype(np.float32) / 255.0

# 2. Clean edge halo / fringing
# Erode alpha slightly and blur slightly for organic edge blending
kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
alpha_eroded = cv2.erode((alpha * 255).astype(np.uint8), kernel_erode, iterations=1).astype(np.float32) / 255.0
alpha_feathered = cv2.GaussianBlur(alpha_eroded, (5, 5), 1.2)

# 3. High contrast monochrome conversion
# Convert RGB to grayscale with weighted luminance
gray = (0.299 * r + 0.587 * g + 0.114 * b).astype(np.float32) / 255.0

# Calibrated studio contrast: Deep rich obsidian blacks, crisp midtone definition, clean highlights
# Apply S-curve:
# Power curve for deep shadows
gray_contrast = np.power(gray, 1.28)
# Sigmoid for punchy dynamic range
gray_contrast = 1.0 / (1.0 + np.exp(-11.0 * (gray_contrast - 0.46)))
# Normalize
gray_contrast = (gray_contrast - gray_contrast.min()) / (gray_contrast.max() - gray_contrast.min() + 1e-6)

# Unsharp mask for crisp facial features
blur_for_sharp = cv2.GaussianBlur(gray_contrast, (0, 0), 1.5)
gray_sharp = cv2.addWeighted(gray_contrast, 1.4, blur_for_sharp, -0.4, 0)
gray_sharp = np.clip(gray_sharp, 0.0, 1.0)

# 4. Multi-directional organic fades
h, w = gray.shape
y_coords = np.arange(h, dtype=np.float32).reshape(h, 1)
x_coords = np.arange(w, dtype=np.float32).reshape(1, w)

# A. Bottom fade: Fade starts around 50% height and reaches pure black/transparent at 92%
bottom_start = h * 0.52
bottom_end = h * 0.92
bottom_fade = np.clip(1.0 - (y_coords - bottom_start) / (bottom_end - bottom_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# B. Left fade: Soft feathering on the left side so background mesh merges seamlessly
left_start = w * 0.22
left_fade = np.clip(x_coords / left_start, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# C. Right edge fade
right_start = w * 0.88
right_fade = np.clip(1.0 - (x_coords - right_start) / (w - right_start), 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# D. Top soft fade
top_end = h * 0.06
top_fade = np.clip(y_coords / top_end, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

# Combine alpha masks
final_alpha = alpha_feathered * bottom_fade * left_fade * right_fade * top_fade

# 5. Film grain overlay
np.random.seed(42)
noise = np.random.normal(0, 0.015, (h, w)).astype(np.float32)
final_gray = np.clip(gray_sharp + noise, 0.0, 1.0) * 255.0
final_alpha = np.clip(final_alpha * 255.0, 0.0, 255.0)

# Deepen black levels at the edge of alpha so silhouette fades into #0c0d0e
darken_factor = np.clip(final_alpha / 60.0, 0.0, 1.0)
final_gray = final_gray * darken_factor

# Build BGRA
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Successfully generated studio portrait at: {output_png}")

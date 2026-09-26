import cv2
import numpy as np
import os
from PIL import Image

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print("Generating exact reference composite...")
img_bgr = cv2.imread(input_path)
h, w, _ = img_bgr.shape
print(f"Dimensions: {w}x{h}")

# 1. Extract subject matte using u2net
from rembg import remove, new_session
session = new_session("u2net")
img_pil = Image.open(input_path).convert("RGB")
cutout = remove(img_pil, session=session)
cutout_np = np.array(cutout)

subject_mask = cutout_np[:, :, 3].astype(np.float32) / 255.0

# 2. Convert original photo to grayscale
gray_orig = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

# 3. Tone curve for the Subject:
# Punchy highlights on face, forehead, arms, laptop, deep blacks in clothes
subject_contrast = np.power(gray_orig, 1.15)
subject_contrast = 1.0 / (1.0 + np.exp(-10.0 * (subject_contrast - 0.42)))
subject_contrast = (subject_contrast - subject_contrast.min()) / (subject_contrast.max() - subject_contrast.min() + 1e-6)

# Unsharp mask for high texture definition (eyes, hair, watch, keyboard)
blur_s = cv2.GaussianBlur(subject_contrast, (0, 0), 1.6)
subject_sharp = cv2.addWeighted(subject_contrast, 1.45, blur_s, -0.45, 0)
subject_sharp = np.clip(subject_sharp, 0.0, 1.0)

# 4. Tone curve for the Room Background:
# In the reference image, the room is deeply dark (obsidian / charcoal #101214) with faint subtle texture
bg_dark = np.power(gray_orig, 1.8) * 0.18

# 5. Composite Subject and Darkened Background with soft feathered transition
# Smooth the subject mask slightly to avoid any hard edge
mask_feathered = cv2.GaussianBlur(subject_mask, (11, 11), 2.5)

# Composite
composite = subject_sharp * mask_feathered + bg_dark * (1.0 - mask_feathered)

# 6. Multi-directional left-to-right dissolve (matching reference image)
y_coords = np.arange(h, dtype=np.float32).reshape(h, 1)
x_coords = np.arange(w, dtype=np.float32).reshape(1, w)

# Left fade: Smoothly dissolves the left side of the photo into pure pitch black
left_fade_end = w * 0.42
left_fade = np.clip(x_coords / left_fade_end, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# Top fade: Softly dissolves the top into darkness
top_fade_end = h * 0.14
top_fade = np.clip(y_coords / top_fade_end, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

# Bottom fade: Soft fade at bottom
bottom_fade_start = h * 0.88
bottom_fade = np.clip(1.0 - (y_coords - bottom_fade_start) / (h - bottom_fade_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# Right edge fade: Soft fade at right edge
right_fade_start = w * 0.94
right_fade = np.clip(1.0 - (x_coords - right_fade_start) / (w - right_fade_start), 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

alpha_map = left_fade * top_fade * bottom_fade * right_fade

# Multiply composite by alpha map so shadows and borders blend seamlessly to 0
final_composite = composite * alpha_map

# 7. Add subtle cinematic film grain
np.random.seed(42)
grain = np.random.normal(0, 0.015, (h, w)).astype(np.float32)
final_gray = np.clip(final_composite + grain * alpha_map, 0.0, 1.0) * 255.0
final_alpha = np.clip(alpha_map * 255.0, 0.0, 255.0)

# Build BGRA
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Output saved to {output_png} (Size: {os.path.getsize(output_png)} bytes)")

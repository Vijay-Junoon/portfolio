import os
import cv2
import numpy as np
from PIL import Image

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print("Processing master portrait asset...")

# 1. Load original photo
img_pil = Image.open(input_path).convert("RGB")
w_orig, h_orig = img_pil.size
print(f"Original photo size: {w_orig}x{h_orig}")

# 2. Extract matte using rembg u2net
from rembg import remove, new_session
session = new_session("u2net")
cutout = remove(img_pil, session=session)
cutout_np = np.array(cutout)

# 3. Smart tight crop to maximize subject scale and facial presence
# Target region: focus on Vijay's upper body and head
# Based on 1200x1600 original dimensions:
y_min = int(h_orig * 0.18) # ~288
y_max = int(h_orig * 0.94) # ~1504
x_min = int(w_orig * 0.16) # ~192
x_max = int(w_orig * 0.96) # ~1152

cropped_cutout = cutout_np[y_min:y_max, x_min:x_max]
h_crop, w_crop, _ = cropped_cutout.shape
print(f"Cropped portrait dimensions: {w_crop}x{h_crop}")

r = cropped_cutout[:, :, 0].astype(np.float32)
g = cropped_cutout[:, :, 1].astype(np.float32)
b = cropped_cutout[:, :, 2].astype(np.float32)
raw_alpha = cropped_cutout[:, :, 3].astype(np.float32) / 255.0

# 4. Grayscale with studio perceptual weights
gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

# 5. Studio Monochrome Contrast & Sharpness
# S-curve for crisp highlights and deep velvety blacks
contrast = np.power(gray, 1.22)
contrast = 1.0 / (1.0 + np.exp(-11.5 * (contrast - 0.45)))
contrast = (contrast - contrast.min()) / (contrast.max() - contrast.min() + 1e-6)

# Unsharp mask for crisp eyes, hair, and facial contours
blur = cv2.GaussianBlur(contrast, (0, 0), 1.5)
sharpened = cv2.addWeighted(contrast, 1.45, blur, -0.45, 0)
sharpened = np.clip(sharpened, 0.0, 1.0)

# 6. Clean edge de-fringing (removes any ambient light rim around hair & shoulders)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
alpha_eroded = cv2.erode((raw_alpha * 255).astype(np.uint8), kernel, iterations=1).astype(np.float32) / 255.0
alpha_soft = cv2.GaussianBlur(alpha_eroded, (7, 7), 2.0)

# 7. Multi-directional organic fades
y_idx = np.arange(h_crop, dtype=np.float32).reshape(h_crop, 1)
x_idx = np.arange(w_crop, dtype=np.float32).reshape(1, w_crop)

# A. Bottom Fade: Begins below the chest and smoothly fades desk/laptop to 0
b_start = h_crop * 0.44
b_end = h_crop * 0.88
b_fade = np.clip(1.0 - (y_idx - b_start) / (b_end - b_start), 0.0, 1.0)
b_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - b_fade)))

# B. Left Edge Fade: Soft feather on the left
l_start = w_crop * 0.20
l_fade = np.clip(x_idx / l_start, 0.0, 1.0)
l_fade = 0.5 * (1.0 - np.cos(np.pi * l_fade))

# C. Right Edge Fade: Soft feather on the right
r_start = w_crop * 0.88
r_fade = np.clip(1.0 - (x_idx - r_start) / (w_crop - r_start), 0.0, 1.0)
r_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - r_fade)))

# D. Top Vignette: Softens hair boundary
t_end = h_crop * 0.06
t_fade = np.clip(y_idx / t_end, 0.0, 1.0)
t_fade = 0.5 * (1.0 - np.cos(np.pi * t_fade))

# Combined Alpha Channel
combined_alpha = alpha_soft * b_fade * l_fade * r_fade * t_fade

# 8. Edge Luma Clamping: Fade perimeter luminance to deep obsidian black (#0c0d0e)
luma_ramp = np.power(np.clip(combined_alpha / 0.80, 0.0, 1.0), 1.15)
final_gray = sharpened * luma_ramp

# 9. Fine film grain for organic cohesion
np.random.seed(42)
noise = np.random.normal(0, 0.012, (h_crop, w_crop)).astype(np.float32)
final_gray = np.clip(final_gray + noise, 0.0, 1.0) * 255.0
final_alpha = np.clip(combined_alpha * 255.0, 0.0, 255.0)

# Build BGRA
bgra = np.zeros((h_crop, w_crop, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Masterpiece portrait generated successfully: {output_png}")
print(f"File size: {os.path.getsize(output_png)} bytes")

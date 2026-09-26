import os
import cv2
import numpy as np
from PIL import Image

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print("Generating studio-grade seamless monochrome silhouette...")

# 1. Load the original image and extract matte
from rembg import remove, new_session
session = new_session("u2net")
img_pil = Image.open(input_path).convert("RGB")
w_orig, h_orig = img_pil.size
print(f"Dimensions: {w_orig}x{h_orig}")

cutout = remove(img_pil, session=session)
cutout_np = np.array(cutout)

r = cutout_np[:, :, 0].astype(np.float32)
g = cutout_np[:, :, 1].astype(np.float32)
b = cutout_np[:, :, 2].astype(np.float32)
raw_alpha = cutout_np[:, :, 3].astype(np.float32) / 255.0

# 2. Grayscale conversion with precise perceptual weights
gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

# 3. Locate Face & Key Features for Targeted Luminance
# Face is approximately at x: 60%..85%, y: 25%..55% in the cropped cutout
# Calibrate high dynamic range contrast
# Deep rich shadows, punchy midtones, crisp highlights on face
contrast = np.power(gray, 1.25)
# S-curve for cinematic monochrome
contrast = 1.0 / (1.0 + np.exp(-12.0 * (contrast - 0.44)))
contrast = (contrast - contrast.min()) / (contrast.max() - contrast.min() + 1e-6)

# Unsharp mask for high fidelity face definition
blur = cv2.GaussianBlur(contrast, (0, 0), 1.6)
sharpened = cv2.addWeighted(contrast, 1.45, blur, -0.45, 0)
sharpened = np.clip(sharpened, 0.0, 1.0)

# 4. CRITICAL: Edge De-fringing & Halo Elimination
# Erode alpha slightly to remove background fringe
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
alpha_eroded = cv2.erode((raw_alpha * 255).astype(np.uint8), kernel, iterations=1).astype(np.float32) / 255.0

# Soft Gaussian blur on alpha for organic, feather-light transition
alpha_soft = cv2.GaussianBlur(alpha_eroded, (9, 9), 2.5)

# 5. Multi-Stage Atmospheric Dissolve
h, w = gray.shape
y_idx = np.arange(h, dtype=np.float32).reshape(h, 1)
x_idx = np.arange(w, dtype=np.float32).reshape(1, w)

# A. Bottom Fade: Smooth cosine fade from chest/desk down into 0
b_start = h * 0.48
b_end = h * 0.90
b_fade = np.clip(1.0 - (y_idx - b_start) / (b_end - b_start), 0.0, 1.0)
b_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - b_fade)))

# B. Left Edge Fade: Smoothly dissolve the left side
l_start = w * 0.26
l_fade = np.clip(x_idx / l_start, 0.0, 1.0)
l_fade = 0.5 * (1.0 - np.cos(np.pi * l_fade))

# C. Right Edge Fade: Smoothly dissolve the right side
r_start = w * 0.86
r_fade = np.clip(1.0 - (x_idx - r_start) / (w - r_start), 0.0, 1.0)
r_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - r_fade)))

# D. Top Edge Soft Vignette
t_end = h * 0.08
t_fade = np.clip(y_idx / t_end, 0.0, 1.0)
t_fade = 0.5 * (1.0 - np.cos(np.pi * t_fade))

# Combined alpha
combined_alpha = alpha_soft * b_fade * l_fade * r_fade * t_fade

# 6. Edge Luma Clamping: Ensure all peripheral alpha edges fade to deep black (#0c0d0e)
# Any pixel where alpha is below 0.8 gets progressively darker towards 0
# This prevents bright halo lines and makes the silhouette emerge naturally from darkness
luma_ramp = np.power(np.clip(combined_alpha / 0.85, 0.0, 1.0), 1.2)
final_gray = sharpened * luma_ramp

# 7. Add subtle, fine cinematic film grain
np.random.seed(42)
noise = np.random.normal(0, 0.012, (h, w)).astype(np.float32)
final_gray = np.clip(final_gray + noise, 0.0, 1.0) * 255.0
final_alpha = np.clip(combined_alpha * 255.0, 0.0, 255.0)

# Build BGRA
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Saved studio silhouette to {output_png} (Size: {os.path.getsize(output_png)} bytes)")

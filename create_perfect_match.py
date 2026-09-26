import cv2
import numpy as np
import os
from PIL import Image

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print("Generating exact visual match...")
img_bgr = cv2.imread(input_path)
h_orig, w_orig, _ = img_bgr.shape
print(f"Source photo size: {w_orig}x{h_orig}")

# 1. Smart crop to match the reference composition framing:
# In the reference image:
# - Head is near top right
# - Left elbow / arm on table
# - Laptop on bottom right
# - Desk and mouse in foreground
# Crop:
y_min = int(h_orig * 0.08) # ~128
y_max = int(h_orig * 0.98) # ~1568
x_min = int(w_orig * 0.05) # ~60
x_max = int(w_orig * 0.98) # ~1176

crop_bgr = img_bgr[y_min:y_max, x_min:x_max]
h, w, _ = crop_bgr.shape
print(f"Cropped dimensions: {w}x{h}")

# 2. Extract matte using u2net on cropped image
from rembg import remove, new_session
session = new_session("u2net")
crop_pil = Image.fromarray(cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB))
cutout = remove(crop_pil, session=session)
cutout_np = np.array(cutout)

raw_mask = cutout_np[:, :, 3].astype(np.float32) / 255.0

# 3. Grayscale conversion of cropped photo
gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

# 4. Subject Monochrome Calibration:
# High-contrast, luminous facial tones, crisp highlights, deep velvety clothing
contrast = np.power(gray, 1.16)
contrast = 1.0 / (1.0 + np.exp(-10.5 * (contrast - 0.40)))
contrast = (contrast - contrast.min()) / (contrast.max() - contrast.min() + 1e-6)

# Unsharp mask for facial definition and texture
blur = cv2.GaussianBlur(contrast, (0, 0), 1.6)
subject_sharp = cv2.addWeighted(contrast, 1.45, blur, -0.45, 0)
subject_sharp = np.clip(subject_sharp, 0.0, 1.0)

# 5. Clean Edge De-fringing (suppress any bright room fringe on hair/shoulders)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
mask_eroded = cv2.erode((raw_mask * 255).astype(np.uint8), kernel, iterations=1).astype(np.float32) / 255.0
mask_feather = cv2.GaussianBlur(mask_eroded, (9, 9), 2.0)

# 6. Deep Cinematic Dark Background with Gritty Texture (matching reference image)
# In reference image: The room background is dark charcoal/obsidian (#0c0d10 to #141619) with gritty room texture
bg_texture = np.power(gray, 2.2) * 0.06 + 0.02 # very subtle dark tone (2% - 8% intensity)

# Composite subject and dark background
composite = subject_sharp * mask_feather + bg_texture * (1.0 - mask_feather)

# 7. Seamless Left-to-Right and Edge Dissolves (matching reference image)
y_idx = np.arange(h, dtype=np.float32).reshape(h, 1)
x_idx = np.arange(w, dtype=np.float32).reshape(1, w)

# Left Fade: Smoothly dissolves the left side of the photo into pure pitch black (0.0)
left_fade_end = w * 0.38
left_fade = np.clip(x_idx / left_fade_end, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# Top Fade: Soft fade at top
top_fade_end = h * 0.12
top_fade = np.clip(y_idx / top_fade_end, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

# Bottom Fade: Soft subtle dissolve at the bottom edge
bottom_fade_start = h * 0.90
bottom_fade = np.clip(1.0 - (y_idx - bottom_fade_start) / (h - bottom_fade_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# Right Fade: Soft dissolve at right edge
right_fade_start = w * 0.94
right_fade = np.clip(1.0 - (x_idx - right_fade_start) / (w - right_fade_start), 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# Alpha map
alpha_map = left_fade * top_fade * bottom_fade * right_fade

# Multiply composite by alpha map so shadows and borders blend seamlessly to pitch black
final_composite = composite * alpha_map

# 8. Add subtle cinematic film grain
np.random.seed(42)
grain = np.random.normal(0, 0.014, (h, w)).astype(np.float32)
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

import os
import cv2
import numpy as np
from PIL import Image

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print(f"Loading {input_path}...")
img_pil = Image.open(input_path).convert("RGB")
w_orig, h_orig = img_pil.size
print(f"Original size: {w_orig}x{h_orig}")

# 1. Run high-precision rembg u2net extraction
from rembg import remove, new_session
session = new_session("u2net")
cutout = remove(img_pil, session=session)
cutout_np = np.array(cutout)

# 2. Intelligent Crop focused on Face and Upper Body
# In 1200x1600 original:
# Head is at roughly y: 320..680, x: 550..920
# Torso/Arms extend down to y: 1350
y_start = int(h_orig * 0.16)  # ~256
y_end = int(h_orig * 0.90)    # ~1440
x_start = int(w_orig * 0.22)  # ~264
x_end = int(w_orig * 0.98)    # ~1176

crop = cutout_np[y_start:y_end, x_start:x_end]
h, w, _ = crop.shape
print(f"Cropped dimensions: {w}x{h}")

r = crop[:, :, 0].astype(np.float32)
g = crop[:, :, 1].astype(np.float32)
b = crop[:, :, 2].astype(np.float32)
raw_alpha = crop[:, :, 3].astype(np.float32) / 255.0

# 3. Grayscale conversion with studio luminance weights
gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

# 4. Studio Cinematic Monochrome Contrast S-Curve
# Keep highlights on the face luminous, shadows deep and velvety
contrast = np.power(gray, 1.20)
contrast = 1.0 / (1.0 + np.exp(-11.0 * (contrast - 0.44)))
contrast = (contrast - contrast.min()) / (contrast.max() - contrast.min() + 1e-6)

# Unsharp mask specifically on facial details for crisp clarity
blur = cv2.GaussianBlur(contrast, (0, 0), 1.5)
sharpened = cv2.addWeighted(contrast, 1.4, blur, -0.4, 0)
sharpened = np.clip(sharpened, 0.0, 1.0)

# 5. ZERO WHITE OUTLINE / ANTI-HALO ALGORITHM (Crucial Step)
# Hair and body silhouettes often pick up the light background color from the room.
# Step A: Erode alpha mask by 4 pixels to cut completely inside the subject
kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
alpha_eroded = cv2.erode((raw_alpha * 255).astype(np.uint8), kernel_erode, iterations=1).astype(np.float32) / 255.0

# Step B: Soft feather on the eroded mask
alpha_feather = cv2.GaussianBlur(alpha_eroded, (15, 15), 3.5)

# Step C: Matte Spill Suppression (Luminance Clamping)
# Near any transition edge (alpha < 0.95), force the RGB value to ramp down to 0 (pure black)
# This guarantees that edge pixels CANNOT be bright or white, making the silhouette fade into pitch darkness
edge_darkening = np.power(np.clip(alpha_feather / 0.90, 0.0, 1.0), 2.2)
gray_darkened = sharpened * edge_darkening

# 6. Multi-Directional Atmospheric Dissolve (Soft, Organic Falloff)
y_idx = np.arange(h, dtype=np.float32).reshape(h, 1)
x_idx = np.arange(w, dtype=np.float32).reshape(1, w)

# A. Bottom Fade: Smooth dissolve starting around 45% height down to 88%
b_start = h * 0.42
b_end = h * 0.86
b_fade = np.clip(1.0 - (y_idx - b_start) / (b_end - b_start), 0.0, 1.0)
b_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - b_fade)))

# B. Left Edge Fade: Wide cosine fade so background mesh and darkness blend cleanly
l_start = w * 0.28
l_fade = np.clip(x_idx / l_start, 0.0, 1.0)
l_fade = 0.5 * (1.0 - np.cos(np.pi * l_fade))

# C. Right Edge Fade: Dissolves into right viewport margin
r_start = w * 0.82
r_fade = np.clip(1.0 - (x_idx - r_start) / (w - r_start), 0.0, 1.0)
r_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - r_fade)))

# D. Top Fade: Gentle softening at the very top of hair
t_end = h * 0.06
t_fade = np.clip(y_idx / t_end, 0.0, 1.0)
t_fade = 0.5 * (1.0 - np.cos(np.pi * t_fade))

# Combined Master Alpha
master_alpha = alpha_feather * b_fade * l_fade * r_fade * t_fade

# 7. Final Deep Tone Integration
# Deepen shadows across the lower torso and edges so everything melts into #0c0d0e
final_luma = gray_darkened * np.clip(master_alpha / 0.75, 0.0, 1.0)

# Add subtle cinematic film grain
np.random.seed(42)
grain = np.random.normal(0, 0.010, (h, w)).astype(np.float32)
final_gray = np.clip(final_luma + grain, 0.0, 1.0) * 255.0
final_alpha = np.clip(master_alpha * 255.0, 0.0, 255.0)

# Build BGRA
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Generated cinematic master portrait: {output_png} (Size: {os.path.getsize(output_png)} bytes)")

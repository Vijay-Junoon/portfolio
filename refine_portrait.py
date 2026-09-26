import os
import cv2
import numpy as np
from rembg import remove, new_session

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

img_bgr = cv2.imread(input_path)
h, w = img_bgr.shape[:2]

session_human = new_session("u2net_human_seg")
img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
cutout = remove(img_rgb, session=session_human)
alpha = cutout[:, :, 3].astype(np.float32) / 255.0

# Also include laptop from isnet
session_gen = new_session("isnet-general-use")
cutout_gen = remove(img_rgb, session=session_gen)
gen_alpha = cutout_gen[:, :, 3].astype(np.float32) / 255.0

# Keep only laptop and person, discard left side desk accessories (x < 350)
gen_alpha[:, :360] = 0.0
alpha[:, :320] = 0.0

combined_alpha = np.maximum(alpha, gen_alpha * 0.95)

# Convert to grayscale
gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

# High contrast monochrome curves:
# Strong deep blacks on shirt and shadows, luminous crisp highlights on skin/face
contrast = np.power(gray, 1.28)
s_curve = 1.0 / (1.0 + np.exp(-12.0 * (contrast - 0.40)))
s_curve = (s_curve - s_curve.min()) / (s_curve.max() - s_curve.min())

# Unsharp mask for high definition
blur = cv2.GaussianBlur(s_curve, (0, 0), 1.2)
sharp = np.clip(s_curve * 1.45 - blur * 0.45, 0.0, 1.0)

y_grid, x_grid = np.mgrid[0:h, 0:w]

# 1. Left fade: smooth cosine decay starting at x=340 up to x=520
left_fade = np.clip((x_grid - 320.0) / 180.0, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# 2. Bottom fade: smooth cosine decay from y=800 to y=1400
bottom_fade = np.clip(1.0 - (y_grid - 800.0) / 600.0, 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# 3. Right fade: smooth cosine decay from x=900 to x=1180
right_fade = np.clip(1.0 - (x_grid - 900.0) / 280.0, 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# 4. Top fade: soft feather from y=0 to y=350
top_fade = np.clip(y_grid / 350.0, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

final_alpha = combined_alpha * left_fade * bottom_fade * right_fade * top_fade

# Edge feathering
alpha_blur = cv2.GaussianBlur(final_alpha, (11, 11), 0)
final_alpha = np.maximum(final_alpha * 0.7 + alpha_blur * 0.3, 0.0)

# Subtle film grain
np.random.seed(42)
grain = np.random.normal(0, 0.012, (h, w)).astype(np.float32)
final_gray = np.clip(sharp + grain, 0.0, 1.0)

# Crop
valid_rows = np.where(final_alpha.max(axis=1) > 0.01)[0]
valid_cols = np.where(final_alpha.max(axis=0) > 0.01)[0]

min_r, max_r = max(0, valid_rows[0] - 10), min(h, valid_rows[-1] + 10)
min_c, max_c = max(0, valid_cols[0] - 10), min(w, valid_cols[-1] + 10)

cropped_gray = final_gray[min_r:max_r, min_c:max_c]
cropped_alpha = final_alpha[min_r:max_r, min_c:max_c]

out_h, out_w = cropped_gray.shape
bgra = np.zeros((out_h, out_w, 4), dtype=np.uint8)
bgra[:, :, 0] = (cropped_gray * 255.0).astype(np.uint8)
bgra[:, :, 1] = (cropped_gray * 255.0).astype(np.uint8)
bgra[:, :, 2] = (cropped_gray * 255.0).astype(np.uint8)
bgra[:, :, 3] = (cropped_alpha * 255.0).astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"Generated perfect portrait: {output_png} ({out_w}x{out_h})")

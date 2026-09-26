import os
import cv2
import numpy as np
from ultralytics import YOLO

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print(f"Reading {input_path}...")
img_bgr = cv2.imread(input_path)
h, w, _ = img_bgr.shape
print(f"Dimensions: {w}x{h}")

print("Running YOLO segmentation...")
model = YOLO("yolov8m-seg.pt")
results = model(input_path)

# Segment subject
mask = np.zeros((h, w), dtype=np.float32)

for r in results:
    if r.masks is not None:
        for idx, cls_id in enumerate(r.boxes.cls):
            cls_name = model.names[int(cls_id)]
            print(f"Found object: {cls_name}")
            mask_data = r.masks.data[idx].cpu().numpy()
            mask_resized = cv2.resize(mask_data, (w, h), interpolation=cv2.INTER_CUBIC)
            if cls_name in ['person', 'chair', 'laptop', 'dining table', 'mouse', 'tv']:
                mask = np.maximum(mask, mask_resized)

# Smooth edges with Gaussian Blur
mask_blurred = cv2.GaussianBlur(mask, (31, 31), 0)
mask_blurred = np.clip(mask_blurred * 1.15, 0.0, 1.0)

# Convert image to Grayscale
gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

# High contrast monochrome adjustment
# Normalize and apply cinematic contrast S-curve
gray_norm = gray / 255.0
# S-curve for punchy highlights and deep shadows
contrast_curve = np.power(gray_norm, 1.25)
# Sharpening
kernel = np.array([[0, -0.4, 0], [-0.4, 2.6, -0.4], [0, -0.4, 0]], dtype=np.float32)
sharpened = cv2.filter2D(contrast_curve, -1, kernel)
sharpened = np.clip(sharpened, 0.0, 1.0)

# Multi-directional organic fades
# 1. Bottom fade: lower body / desk dissolves smoothly into black (#0c0d0e)
y_coords = np.arange(h, dtype=np.float32).reshape(h, 1)
bottom_start = h * 0.50
bottom_end = h * 0.95
bottom_fade = np.clip(1.0 - (y_coords - bottom_start) / (bottom_end - bottom_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# 2. Left side fade: dissolves so text on left has clean negative space
x_coords = np.arange(w, dtype=np.float32).reshape(1, w)
left_start = w * 0.32
left_fade = np.clip(x_coords / left_start, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# 3. Right edge fade: dissolves smoothly into the dark right border
right_start = w * 0.82
right_fade = np.clip(1.0 - (x_coords - right_start) / (w - right_start), 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# 4. Top subtle vignette
top_end = h * 0.12
top_fade = np.clip(y_coords / top_end, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

combined_alpha = mask_blurred * bottom_fade * left_fade * right_fade * top_fade

# Subtle film grain / noise
np.random.seed(42)
noise = np.random.normal(0, 0.015, (h, w)).astype(np.float32)
final_gray = np.clip(sharpened + noise, 0.0, 1.0) * 255.0
final_alpha = np.clip(combined_alpha * 255.0, 0.0, 255.0)

# Build 4-channel BGRA image
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"File exists? {os.path.exists(output_png)}, Size: {os.path.getsize(output_png)} bytes")

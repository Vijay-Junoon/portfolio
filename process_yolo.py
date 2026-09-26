import os
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
from ultralytics import YOLO

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print("Loading YOLO segmentation model (yolov8m-seg.pt)...")
model = YOLO("yolov8m-seg.pt")

print("Running segmentation on input image...")
results = model(input_path)

img_bgr = cv2.imread(input_path)
h, w, _ = img_bgr.shape

# Person mask
person_mask = np.zeros((h, w), dtype=np.float32)

for r in results:
    if r.masks is not None:
        for idx, cls_id in enumerate(r.boxes.cls):
            cls_name = model.names[int(cls_id)]
            print(f"Detected class: {cls_name}")
            mask_data = r.masks.data[idx].cpu().numpy()
            mask_resized = cv2.resize(mask_data, (w, h), interpolation=cv2.INTER_CUBIC)
            if cls_name in ['person', 'chair', 'laptop', 'dining table', 'tv']:
                person_mask = np.maximum(person_mask, mask_resized)

# Smooth mask edges
person_mask = cv2.GaussianBlur(person_mask, (15, 15), 0)
person_mask = np.clip(person_mask * 1.1, 0, 1.0)

# Convert image to RGB PIL
img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
pil_img = Image.fromarray(img_rgb)

# Convert to high contrast monochrome
mono_base = ImageOps.grayscale(pil_img)
enhancer = ImageEnhance.Contrast(mono_base)
mono_contrast = enhancer.enhance(1.4)
enhancer_sharp = ImageEnhance.Sharpness(mono_contrast)
mono_sharp = enhancer_sharp.enhance(1.3)

mono_arr = np.array(mono_sharp).astype(np.float32)

# Deepen shadows to melt into obsidian deep (#0c0d0e)
mono_arr = np.power(mono_arr / 255.0, 1.15) * 255.0

# Add organic edge falloffs:
# 1. Bottom fade: fade out lower body and desk into obsidian deep
y_coords = np.arange(h).reshape(h, 1)
bottom_fade_start = h * 0.55
bottom_fade_end = h * 0.95
bottom_fade = np.clip(1.0 - (y_coords - bottom_fade_start) / (bottom_fade_end - bottom_fade_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# 2. Left side fade to merge with hero left text column
x_coords = np.arange(w).reshape(1, w)
left_fade_start = w * 0.25
left_fade = np.clip(x_coords / left_fade_start, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# 3. Right side fade
right_fade_start = w * 0.85
right_fade = np.clip(1.0 - (x_coords - right_fade_start) / (w - right_fade_start), 0.0, 1.0)
right_factor = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# 4. Top subtle fade
top_fade_end = h * 0.12
top_fade = np.clip(y_coords / top_fade_end, 0.0, 1.0)
top_factor = 0.5 * (1.0 - np.cos(np.pi * top_fade))

total_alpha = person_mask * bottom_fade * left_fade * right_factor * top_factor

# Subtle film grain
np.random.seed(42)
noise = np.random.normal(0, 3.5, (h, w))
mono_arr = np.clip(mono_arr + noise, 0, 255).astype(np.uint8)
total_alpha = np.clip(total_alpha * 255.0, 0, 255).astype(np.uint8)

final_img = Image.fromarray(np.dstack((mono_arr, mono_arr, mono_arr, total_alpha)), mode="RGBA")
final_img.save(output_png, "PNG", optimize=True)
print(f"Successfully generated {output_png}, size={final_img.size}")

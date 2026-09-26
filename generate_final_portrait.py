import os
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

input_path = os.path.abspath(r"public/photo_1.jpeg")
output_png = os.path.abspath(r"public/hero_portrait.png")

print(f"[1/5] Loading source image from: {input_path}")
img_bgr = cv2.imread(input_path)
if img_bgr is None:
    raise FileNotFoundError(f"Cannot read {input_path}")

h, w, _ = img_bgr.shape
print(f"Source image dimensions: {w}x{h}")

# Check if rembg u2net is available or use YOLOv8m-seg
mask = np.zeros((h, w), dtype=np.float32)

use_rembg = False
try:
    from rembg import remove, new_session
    print("[2/5] Attempting rembg extraction...")
    img_pil = Image.open(input_path).convert("RGB")
    session = new_session("u2net")
    rembg_out = remove(img_pil, session=session)
    rembg_rgba = np.array(rembg_out)
    if rembg_rgba.shape[2] == 4:
        mask = rembg_rgba[:, :, 3].astype(np.float32) / 255.0
        use_rembg = True
        print("rembg extraction succeeded!")
except Exception as e:
    print(f"rembg not available or still downloading: {e}")

if not use_rembg:
    print("[2/5] Using local YOLOv8m-seg model for segmentation...")
    from ultralytics import YOLO
    model = YOLO("yolov8m-seg.pt")
    results = model(input_path)
    
    for r in results:
        if r.masks is not None:
            for idx, cls_id in enumerate(r.boxes.cls):
                cls_name = model.names[int(cls_id)]
                print(f"Detected object: {cls_name}")
                if cls_name in ['person', 'chair', 'laptop', 'dining table']:
                    mask_data = r.masks.data[idx].cpu().numpy()
                    mask_resized = cv2.resize(mask_data, (w, h), interpolation=cv2.INTER_CUBIC)
                    mask = np.maximum(mask, mask_resized)

# Ensure the mask is refined with soft edge feathering
print("[3/5] Refining matte and feathering edges...")
# Gaussian smoothing on mask for organic edges
mask_blurred = cv2.GaussianBlur(mask, (15, 15), 0)
mask_blurred = np.clip(mask_blurred, 0.0, 1.0)

# Convert image to pure monochrome / grayscale
print("[4/5] Converting to cinematic high-contrast monochrome...")
gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

# Calibrated cinematic tone curve:
# Deep blacks (obsidian), punchy midtones, crisp clean highlights
contrast_adjusted = np.power(gray, 1.22)
# S-curve enhancement
contrast_adjusted = 1.0 / (1.0 + np.exp(-10.0 * (contrast_adjusted - 0.48)))
# Normalize back to 0..1 range
contrast_adjusted = (contrast_adjusted - contrast_adjusted.min()) / (contrast_adjusted.max() - contrast_adjusted.min())

# Subtle unsharp mask for crisp facial definition
blur_for_unsharp = cv2.GaussianBlur(contrast_adjusted, (0, 0), 1.8)
sharpened = cv2.addWeighted(contrast_adjusted, 1.35, blur_for_unsharp, -0.35, 0)
sharpened = np.clip(sharpened, 0.0, 1.0)

# Generate multi-directional organic falloff gradients
print("[5/5] Applying multi-directional falloff gradients...")
y_coords = np.arange(h, dtype=np.float32).reshape(h, 1)
x_coords = np.arange(w, dtype=np.float32).reshape(1, w)

# 1. Bottom fade: lower body dissolves seamlessly into dark background (#0c0d0e)
bottom_start = h * 0.48
bottom_end = h * 0.94
bottom_fade = np.clip(1.0 - (y_coords - bottom_start) / (bottom_end - bottom_start), 0.0, 1.0)
bottom_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_fade)))

# 2. Left side fade: dissolves so text area on the left has clean negative space
left_start = w * 0.28
left_fade = np.clip(x_coords / left_start, 0.0, 1.0)
left_fade = 0.5 * (1.0 - np.cos(np.pi * left_fade))

# 3. Right edge fade: smoothly dissolves towards the right border
right_start = w * 0.84
right_fade = np.clip(1.0 - (x_coords - right_start) / (w - right_start), 0.0, 1.0)
right_fade = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_fade)))

# 4. Top subtle vignette: softens the upper boundary
top_end = h * 0.08
top_fade = np.clip(y_coords / top_end, 0.0, 1.0)
top_fade = 0.5 * (1.0 - np.cos(np.pi * top_fade))

# Combine all fades into final alpha channel
combined_alpha = mask_blurred * bottom_fade * left_fade * right_fade * top_fade

# Subtle film grain / noise to ensure seamless blending with dark canvas
np.random.seed(42)
noise = np.random.normal(0, 0.012, (h, w)).astype(np.float32)
final_gray = np.clip(sharpened + noise, 0.0, 1.0) * 255.0
final_alpha = np.clip(combined_alpha * 255.0, 0.0, 255.0)

# Deepen shadows to blend smoothly into obsidian #0c0d0e
final_gray = np.where(final_alpha < 30, final_gray * (final_alpha / 30.0), final_gray)

# Build BGRA output image
bgra = np.zeros((h, w, 4), dtype=np.uint8)
bgra[:, :, 0] = final_gray.astype(np.uint8)
bgra[:, :, 1] = final_gray.astype(np.uint8)
bgra[:, :, 2] = final_gray.astype(np.uint8)
bgra[:, :, 3] = final_alpha.astype(np.uint8)

cv2.imwrite(output_png, bgra)
print(f"✓ Saved high-contrast monochrome portrait to: {output_png}")
print(f"File size: {os.path.getsize(output_png)} bytes")

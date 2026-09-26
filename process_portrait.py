import os
import sys
sys.path.append(r"C:\Users\vijay\AppData\Roaming\Python\Python312\site-packages")
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
from rembg import remove, new_session

input_path = r"c:\Users\vijay\Desktop\portfolio\public\photo_1.jpeg"
output_png = r"c:\Users\vijay\Desktop\portfolio\public\hero_portrait.png"

print("Reading input image...")
img = Image.open(input_path).convert("RGB")
print("Image size:", img.size)

# Remove background using u2net session
session = new_session("u2net")
print("Extracting foreground matte with rembg...")
cutout = remove(img, session=session)

# Convert cutout to RGBA
cutout = cutout.convert("RGBA")

# Extract alpha channel and RGB channels
r, g, b, a = cutout.split()

# Convert RGB to high-contrast monochrome
# Grayscale conversion
mono_base = ImageOps.grayscale(Image.merge("RGB", (r, g, b)))

# Enhance contrast & sharpness
enhancer = ImageEnhance.Contrast(mono_base)
mono_contrast = enhancer.enhance(1.4)

enhancer_sharp = ImageEnhance.Sharpness(mono_contrast)
mono_sharp = enhancer_sharp.enhance(1.3)

# Enhance brightness slightly if needed, keeping rich blacks
enhancer_bright = ImageEnhance.Brightness(mono_sharp)
mono_final = enhancer_bright.enhance(0.95)

# Convert back to RGBA with original alpha
mono_rgba = Image.merge("RGBA", (mono_final, mono_final, mono_final, a))

# Now create an organic falloff / fade mask
w, h = mono_rgba.size
alpha_arr = np.array(a).astype(np.float32)

# Create gradients
# 1. Bottom fade: fade to 0 starting from 60% height to 98% height
y_coords = np.arange(h).reshape(h, 1)
bottom_fade_start = h * 0.55
bottom_fade_end = h * 0.98
bottom_factor = np.clip(1.0 - (y_coords - bottom_fade_start) / (bottom_fade_end - bottom_fade_start), 0.0, 1.0)

# Smooth cosine fade
bottom_factor = 0.5 * (1.0 + np.cos(np.pi * (1.0 - bottom_factor)))

# 2. Left side subtle fade to merge with hero center text area
x_coords = np.arange(w).reshape(1, w)
left_fade_start = w * 0.25
left_factor = np.clip(x_coords / left_fade_start, 0.0, 1.0)
left_factor = 0.5 * (1.0 - np.cos(np.pi * left_factor))

# 3. Right edge subtle fade
right_fade_start = w * 0.82
right_factor = np.clip(1.0 - (x_coords - right_fade_start) / (w - right_fade_start), 0.0, 1.0)
right_factor = 0.5 * (1.0 + np.cos(np.pi * (1.0 - right_factor)))

# Combine fades
combined_mask = (alpha_arr / 255.0) * bottom_factor * left_factor * right_factor

# Add subtle film grain in the alpha & shadows for organic integration
np.random.seed(42)
noise = np.random.normal(0, 3.0, (h, w))

final_alpha = np.clip(combined_mask * 255.0, 0, 255).astype(np.uint8)

# Convert RGB array and deepen shadows to obsidian deep (#0c0d0e)
rgb_arr = np.array(mono_final).astype(np.float32)
# Apply gamma curve for cinematic studio lighting
rgb_arr = np.power(rgb_arr / 255.0, 1.15) * 255.0
rgb_arr = np.clip(rgb_arr + noise * 0.5, 0, 255).astype(np.uint8)

final_img = Image.fromarray(np.dstack((rgb_arr, rgb_arr, rgb_arr, final_alpha)), mode="RGBA")

final_img.save(output_png, "PNG", optimize=True)
print("Saved successfully to:", output_png)

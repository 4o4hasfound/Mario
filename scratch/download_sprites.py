import os
import urllib.request
from PIL import Image
from io import BytesIO

# URL of the classic Mario sprite sheet
url = "https://raw.githubusercontent.com/justinmeister/Mario-Level-1/master/resources/graphics/mario_bros.png"

# Output directory
out_dir = r"d:\Program1\Software Studio\Mario\assets\AS2_source\player_new"
os.makedirs(out_dir, exist_ok=True)

print("Downloading sprite sheet...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    img_data = response.read()

img = Image.open(BytesIO(img_data)).convert("RGBA")

# Frame definitions: (x, y, width, height)
# Based on the python repo coordinates
frames = {
    "small_walk_1.png": (80, 32, 15, 16),
    "small_walk_2.png": (96, 32, 16, 16),
    "small_walk_3.png": (112, 32, 16, 16),
    "small_jump.png": (144, 32, 16, 16),
    
    "big_walk_1.png": (81, 0, 16, 32),
    "big_walk_2.png": (97, 0, 15, 32),
    "big_walk_3.png": (113, 0, 15, 32),
    "big_jump.png": (144, 0, 16, 32)
}

print("Cropping and saving frames...")
for name, rect in frames.items():
    x, y, w, h = rect
    # PIL crop expects (left, upper, right, lower)
    cropped = img.crop((x, y, x + w, y + h))
    # We should resize them so they are not tiny 16x16, let's scale by 2x for better game-ready use without blur?
    # Actually, Cocos Creator handles scale, but standardizing size is good. Let's keep original size.
    # But wait, small mario is 16x16, big mario is 16x32.
    out_path = os.path.join(out_dir, name)
    cropped.save(out_path)
    print(f"Saved {name} ({w}x{h})")

print("Done!")

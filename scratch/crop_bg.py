import os
import urllib.request
from PIL import Image
from io import BytesIO
import base64

url_tiles = "https://raw.githubusercontent.com/justinmeister/Mario-Level-1/master/resources/graphics/tile_set.png"

def download_img(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        return Image.open(BytesIO(response.read())).convert("RGBA")

img_tiles = download_img(url_tiles)

cloud_img = img_tiles.crop((0, 320, 48, 344))
mountain_img = img_tiles.crop((80, 320, 128, 352))

def img_to_b64(img):
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

cloud_b64 = img_to_b64(cloud_img)
mountain_b64 = img_to_b64(mountain_img)

ts_content = f"""
// Auto-generated from crop_bg.py
export const cloudBase64 = "{cloud_b64}";
export const mountainBase64 = "{mountain_b64}";
"""

out_path = r"d:\Program1\Software Studio\Mario\assets\scripts\BgAssets.ts"
with open(out_path, "w") as f:
    f.write(ts_content)

print(f"Generated {out_path}")

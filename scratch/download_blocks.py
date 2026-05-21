import os
import urllib.request
from PIL import Image
from io import BytesIO

url_tiles = "https://raw.githubusercontent.com/justinmeister/Mario-Level-1/master/resources/graphics/tile_set.png"
url_items = "https://raw.githubusercontent.com/justinmeister/Mario-Level-1/master/resources/graphics/item_objects.png"

out_dir = r"d:\Program1\Software Studio\Mario\assets\AS2_source\blocks_new"
os.makedirs(out_dir, exist_ok=True)

print("Downloading sprite sheets...")
def download_img(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        return Image.open(BytesIO(response.read())).convert("RGBA")

img_tiles = download_img(url_tiles)
img_items = download_img(url_items)

# tile_set frames
frames_tiles = {
    "ground.png": (0, 0, 16, 16),
    "brick.png": (16, 0, 16, 16),
    "hard_block.png": (0, 16, 16, 16),
    "pipe_top.png": (0, 128, 32, 16),
    "pipe_body.png": (0, 144, 32, 16),
    "question_block.png": (384, 0, 16, 16),
    "used_block.png": (432, 0, 16, 16)
}

# item_objects frames
frames_items = {
    "coin.png": (52, 113, 8, 14),
    "mushroom.png": (0, 0, 16, 16)
}

print("Cropping and saving frames...")

for name, rect in frames_tiles.items():
    x, y, w, h = rect
    cropped = img_tiles.crop((x, y, x + w, y + h))
    cropped.save(os.path.join(out_dir, name))
    print(f"Saved {name} ({w}x{h})")

for name, rect in frames_items.items():
    x, y, w, h = rect
    cropped = img_items.crop((x, y, x + w, y + h))
    
    # If it's the coin, put it in a 16x16 canvas so it doesn't get stretched strangely
    if name == "coin.png":
        bg = Image.new("RGBA", (16, 16), (255, 255, 255, 0))
        bg.paste(cropped, (4, 1))
        cropped = bg
        w, h = 16, 16

    cropped.save(os.path.join(out_dir, name))
    print(f"Saved {name} ({w}x{h})")

print("Done!")

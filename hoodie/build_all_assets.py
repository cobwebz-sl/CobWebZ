import os
import rembg
import numpy as np
from PIL import Image
import skimage.color as skcolor

BRAIN = r"C:\Users\Shenith\.gemini\antigravity\brain\7fd7e169-4f08-42d2-9486-2661ef108d57"
OUT_DIR = r"D:\Documents\WEBSITES\hoodie\images"
os.makedirs(OUT_DIR, exist_ok=True)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0

# 1. Base Cutouts
base_raw = {
    "charcoal_front": os.path.join(BRAIN, "charcoal_hoodie_solid_white_1793277705567.jpg"),
    "charcoal_back": os.path.join(BRAIN, "hoodie_charcoal_back_1793279303283.jpg"),
    "zip_sage": os.path.join(BRAIN, "sage_green_zip_hoodie_1793279238994.jpg"),
    "crew_stone": os.path.join(BRAIN, "stone_grey_crewneck_1793279247517.jpg"),
    "kids_bone": os.path.join(BRAIN, "kids_bone_hoodie_studio_1793279257133.jpg"),
}

cutouts = {}
for key, in_path in base_raw.items():
    print(f"Extracting cutout for {key}...")
    img = Image.open(in_path)
    cutouts[key] = rembg.remove(img)

# Save the base transparent cutouts
cutouts["charcoal_front"].save(os.path.join(OUT_DIR, "hoodie-charcoal-front.png"))
cutouts["charcoal_back"].save(os.path.join(OUT_DIR, "hoodie-charcoal-back.png"))
cutouts["zip_sage"].save(os.path.join(OUT_DIR, "zip-sage-front.png"))
cutouts["crew_stone"].save(os.path.join(OUT_DIR, "crew-stone-front.png"))
cutouts["kids_bone"].save(os.path.join(OUT_DIR, "hoodie-kids-bone.png"))

# 2. Details
Image.open(os.path.join(BRAIN, "charcoal_hoodie_hood_detail_1793279287081.jpg")).save(os.path.join(OUT_DIR, "detail-hood.png"))
Image.open(os.path.join(BRAIN, "charcoal_hoodie_pocket_detail_1793279276294.jpg")).save(os.path.join(OUT_DIR, "detail-pocket.png"))

# 3. Recolor algorithm for front and back
PALETTE = {
    "bone": "#ECE6DC",
    "sand": "#D6CBBB",
    "stone": "#B8B3AB",
    "sage": "#7F918A",
    "mocha": "#7A5F4C",
    "charcoal": "#3D3F44",
    "ink": "#1D1D1F",
}

def recolor_image(base_img, target_hex):
    arr = np.array(base_img, dtype=np.float64) / 255.0
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    mask = alpha > 0.03
    
    lab = skcolor.rgb2lab(rgb)
    L = lab[:, :, 0]
    
    garment_L = L[mask]
    med_L = np.median(garment_L)
    std_L = np.std(garment_L)
    
    target_rgb = hex_to_rgb(target_hex)
    target_lab = skcolor.rgb2lab(target_rgb.reshape(1, 1, 3))[0, 0]
    target_L = target_lab[0]
    
    ratio = (L - med_L) / (std_L + 1e-5)
    
    if target_L < 30: # ink
        new_std = min(std_L * 0.75, target_L * 0.4)
    elif target_L > 75: # bone
        new_std = min(std_L * 0.8, (100.0 - target_L) * 0.5)
    else:
        new_std = std_L * 0.9
        
    new_L = np.clip(target_L + ratio * new_std, 0.0, 100.0)
    
    res_lab = lab.copy()
    res_lab[:, :, 0] = np.where(mask, new_L, 0)
    res_lab[:, :, 1] = np.where(mask, target_lab[1], 0)
    res_lab[:, :, 2] = np.where(mask, target_lab[2], 0)
    
    res_rgb = np.clip(skcolor.lab2rgb(res_lab), 0.0, 1.0)
    res_rgba = np.dstack([res_rgb, alpha])
    
    return Image.fromarray((res_rgba * 255.0).astype(np.uint8), mode="RGBA")

# Generate all 7 colorways for front and back
for name, hex_code in PALETTE.items():
    if name != "charcoal":
        f_img = recolor_image(cutouts["charcoal_front"], hex_code)
        f_img.save(os.path.join(OUT_DIR, f"hoodie-{name}-front.png"))
        
        b_img = recolor_image(cutouts["charcoal_back"], hex_code)
        b_img.save(os.path.join(OUT_DIR, f"hoodie-{name}-back.png"))
    else:
        # Save back view as well
        cutouts["charcoal_back"].save(os.path.join(OUT_DIR, "hoodie-charcoal-back.png"))
    print(f"Generated hoodie {name} front and back")

# Generate remaining zip & crew variants
# zip-bone-front.png
recolor_image(cutouts["zip_sage"], PALETTE["bone"]).save(os.path.join(OUT_DIR, "zip-bone-front.png"))
# crew-sand-front.png & crew-ink-front.png
recolor_image(cutouts["crew_stone"], PALETTE["sand"]).save(os.path.join(OUT_DIR, "crew-sand-front.png"))
recolor_image(cutouts["crew_stone"], PALETTE["ink"]).save(os.path.join(OUT_DIR, "crew-ink-front.png"))

# Lookbook model images
lookbook_charcoal = Image.open(os.path.join(BRAIN, "charcoal_oversized_hoodie_lookbook_1793280855501.jpg"))
lookbook_charcoal.save(os.path.join(OUT_DIR, "lookbook-charcoal-front.jpg"))

lookbook_back = Image.open(os.path.join(BRAIN, "hoodie_charcoal_back_1793281006912.jpg"))
lookbook_back.save(os.path.join(OUT_DIR, "lookbook-charcoal-back.jpg"))

lookbook_bone = Image.open(os.path.join(BRAIN, "bone_hoodie_lookbook_1793281012498.jpg"))
lookbook_bone.save(os.path.join(OUT_DIR, "lookbook-bone-front.jpg"))

print("All assets generated successfully!")


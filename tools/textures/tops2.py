import cv2, numpy as np, sys
tex, out = sys.argv[1], sys.argv[2]
TW, TH = 2048, 352
rng = np.random.default_rng(5)

def smooth_bg(img, holes, k=8):
    small = cv2.resize(img, (TW // k, TH // k), interpolation=cv2.INTER_AREA)
    hm = cv2.resize(holes, (TW // k, TH // k), interpolation=cv2.INTER_NEAREST)
    small = cv2.dilate(small, np.ones((3, 3), np.uint8))     # quita líneas finas oscuras
    small = cv2.inpaint(small, cv2.dilate(hm, np.ones((3, 3), np.uint8)), 5, cv2.INPAINT_TELEA)
    small = cv2.GaussianBlur(small, (0, 0), 2)
    return cv2.resize(small, (TW, TH), interpolation=cv2.INTER_CUBIC).astype(np.float32)

def marble(base, seed, amp, dark=False):
    r = np.random.default_rng(seed)
    n = np.zeros((TH, TW), np.float32)
    for s, a in [(256, 1.0), (96, 0.5), (32, 0.25)]:
        z = r.normal(0, 1, (TH // s * 4 + 4, TW // s * 4 + 4)).astype(np.float32)
        n += cv2.resize(z, (TW, TH), interpolation=cv2.INTER_CUBIC) * a
    n = cv2.GaussianBlur(n, (0, 0), 14)
    img = np.ones((TH, TW, 3), np.float32) * np.array(base, np.float32)
    img += n[..., None] * amp
    # arañazos finos
    for i in range(90):
        x, y = r.uniform(0, TW), r.uniform(0, TH); l = r.uniform(40, 260); ang = r.uniform(-0.5, 0.2)
        c = r.uniform(3, 7) * (1 if dark else -1)
        cv2.line(img, (int(x), int(y)), (int(x + l * np.cos(ang)), int(y + l * np.sin(ang))), [float(v + c) for v in base], 1, cv2.LINE_AA)
    img = cv2.GaussianBlur(img, (0, 0), 0.6)
    return img

# ---------- Blanca ----------
w = cv2.imread(tex + '/top_white.png')
holes = np.zeros((TH, TW), np.uint8)
holes[:, 440:790] = 255; holes[:, 1185:1465] = 255
holes[:18] = 255; holes[-10:] = 255
holes[20:340, 850:1225] = 255; holes[100:270, 1480:1620] = 255; holes[55:240, 450:520] = 255
bg = smooth_bg(w, holes)
ink = np.clip(w.astype(np.float32) / np.maximum(bg, 1), 0, 1)
ink = np.clip((ink - 0.12) / 0.83, 0, 1)            # contraste de la tinta
keep = np.zeros((TH, TW), np.float32)
keep[40:335, 880:1182] = 1     # oso
keep[110:260, 1500:1610] = 1   # logo PREMIUM SQUAD

keep = cv2.GaussianBlur(keep, (0, 0), 4)[..., None]
ink = 1 - (1 - ink) * keep
# texto de la cola: solo trazos finos (black-hat), sin la sombra de la fijación
Lw = cv2.cvtColor(w, cv2.COLOR_BGR2GRAY)
bh = cv2.morphologyEx(Lw, cv2.MORPH_BLACKHAT, np.ones((11, 11), np.uint8)).astype(np.float32)
txt = np.clip((bh - 18) / 70, 0, 1)
box = np.zeros((TH, TW), np.float32); box[60:235, 455:515] = 1
box = cv2.GaussianBlur(box, (0, 0), 3)
ink = ink * (1 - (txt * box)[..., None] * 0.92)
board = marble((238, 239, 241), 11, 2.2)   # BGR casi blanco
res = board * ink
res += rng.normal(0, 1.2, res.shape[:2])[..., None]
cv2.imwrite(out + '/drake-top.jpg', np.clip(res, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])

# ---------- Negra ----------
k = cv2.imread(tex + '/top_black.png')
k = cv2.resize(k[4:326], (TW, TH), interpolation=cv2.INTER_AREA)
hsv = cv2.cvtColor(k, cv2.COLOR_BGR2HSV)
lab = cv2.cvtColor(k, cv2.COLOR_BGR2LAB)
orange = (((hsv[..., 0] < 25) | (hsv[..., 0] > 165)) & (hsv[..., 1] > 60) & (hsv[..., 2] > 45)).astype(np.uint8) * 255
binds = np.zeros((TH, TW), np.uint8); binds[:, 530:830] = 255; binds[:, 1280:1585] = 255
mask = cv2.dilate(orange, np.ones((25, 25), np.uint8)) & binds
light = ((lab[..., 0] > 140) & (hsv[..., 1] < 60)).astype(np.uint8) * 255
light[:, 140:1950] = 0
mask |= light
bright = (lab[..., 0] > 55).astype(np.uint8) * 255
fill = smooth_bg(k, mask | bright, 8)
fill = np.minimum(fill, np.array([40, 30, 26], np.float32))
m = cv2.GaussianBlur((mask > 0).astype(np.float32), (0, 0), 5)[..., None]
res = k.astype(np.float32) * (1 - m) + fill * m
res += rng.normal(0, 1.4, res.shape[:2])[..., None]
res = np.clip((res - 3) * 1.04, 0, 255)
cv2.imwrite(out + '/snake-top.jpg', res.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])

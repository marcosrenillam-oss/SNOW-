import cv2, numpy as np, sys
tex, out = sys.argv[1], sys.argv[2]
TW, TH = 2048, 352
rng = np.random.default_rng(3)
def feather(mask, r):
    m = cv2.dilate(mask, np.ones((r, r), np.uint8)).astype(np.float32) / 255
    return cv2.GaussianBlur(m, (0, 0), r / 2)[..., None]

# ---------- Blanca (oso) ----------
w = cv2.imread(tex + '/top_white.png').astype(np.float32)
w[:16] = w[16:32][::-1]
lab = cv2.cvtColor(w.astype(np.uint8), cv2.COLOR_BGR2LAB)
L = lab[..., 0]
mask = np.zeros((TH, TW), np.uint8)
for x0, x1 in [(440, 790), (1185, 1465)]:
    sub = (L[:, x0:x1] < 192).astype(np.uint8) * 255
    mask[:, x0:x1] = sub
mask[60:232, 458:512] = 0           # texto "The / DRAKE x PRO"
m = feather(mask, 15)
patch = w.copy()
patch[:, 440:790] = w[:, 90:440]
patch[:, 1185:1465] = w[:, 1580:1860]
w = w * (1 - m) + patch * m
# limpiar tono: neutro y un poco más luminoso
g = w.mean(2, keepdims=True)
w = g + (w - g) * 0.55
w = (w - 18) * 1.08
w = np.clip(w, 0, 255)
cv2.imwrite(out + '/drake-top.jpg', w.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])

# ---------- Negra (serpiente) ----------
k = cv2.imread(tex + '/top_black.png')
k = cv2.resize(k[0:334], (TW, TH), interpolation=cv2.INTER_AREA)
hsv = cv2.cvtColor(k, cv2.COLOR_BGR2HSV)
orange = (((hsv[..., 0] < 22) | (hsv[..., 0] > 170)) & (hsv[..., 1] > 90) & (hsv[..., 2] > 90)).astype(np.uint8) * 255
lab = cv2.cvtColor(k, cv2.COLOR_BGR2LAB)
light = (lab[..., 0] > 150).astype(np.uint8) * 255   # fondo claro que se cuela
light[:, 140:1950] = 0
mask = cv2.dilate(orange, np.ones((21, 21), np.uint8)) | light
filled = cv2.inpaint(k, mask, 9, cv2.INPAINT_TELEA).astype(np.float32)
filled += rng.normal(0, 1.6, filled.shape[:2])[..., None]
filled = np.clip((filled - 4) * 1.05, 0, 255)
cv2.imwrite(out + '/snake-top.jpg', filled.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])

# ---------- Bases (DRAKE) ----------
red = np.load(tex + '/b2_red.npy')
r2 = cv2.resize(red, (TW * 2, TH * 2), interpolation=cv2.INTER_CUBIC)
r2 = cv2.GaussianBlur(r2, (0, 0), 6)
r2 = np.clip((r2 - 0.5) * 8 + 0.5, 0, 1)
red = cv2.resize(r2, (TW, TH), interpolation=cv2.INTER_AREA)
red = red[::-1, ::-1]            # que se lea DRAKE al dar la vuelta a la tabla
def paint(c1, c2, name):
    a = red[..., None]
    img = a * np.array(c1, np.float32) + (1 - a) * np.array(c2, np.float32)
    img += rng.normal(0, 2.2, img.shape[:2])[..., None]
    cv2.imwrite(name, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
paint((62, 36, 218), (80, 50, 38), out + '/drake-base.jpg')
paint((24, 104, 255), (26, 22, 20), out + '/snake-base.jpg')

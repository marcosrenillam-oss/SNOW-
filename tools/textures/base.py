import cv2, numpy as np, sys
src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src)
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
H, S, V = cv2.split(hsv)
# tabla = rojo saturado o azul marino oscuro; nieve = clara y poco saturada
board = ((S > 70) | (V < 120)).astype(np.uint8) * 255
board = cv2.morphologyEx(board, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
board = cv2.morphologyEx(board, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
cnts, _ = cv2.findContours(board, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
c = max(cnts, key=cv2.contourArea)
rect = cv2.minAreaRect(c)
print('rect', rect)
box = cv2.boxPoints(rect)
# ordenar: eje largo
(cx, cy), (w, h), ang = rect
pts = box
# determinar extremos del eje largo
if w < h: L, Wd = h, w
else: L, Wd = w, h
# vectores
d01 = pts[1] - pts[0]; d12 = pts[2] - pts[1]
if np.linalg.norm(d01) > np.linalg.norm(d12):
    # 0->1 largo
    a0, a1, b1, b0 = pts[0], pts[1], pts[2], pts[3]
else:
    a0, a1, b1, b0 = pts[1], pts[2], pts[3], pts[0]
# a0->a1 lado largo; b0->b1 lado opuesto. extremo "tail" = el más abajo-derecha
TW, TH = 2048, 352
# Queremos u=0 tail (abajo-derecha) u=1 nose (arriba-izquierda)
ends = [(a0 + b0) / 2, (a1 + b1) / 2]
if ends[0][1] > ends[1][1]:
    tail_side = (a0, b0); nose_side = (a1, b1)
else:
    tail_side = (a1, b1); nose_side = (a0, b0)
srcq = np.float32([tail_side[0], nose_side[0], nose_side[1], tail_side[1]])
dstq = np.float32([[0, 0], [TW, 0], [TW, TH], [0, TH]])
M = cv2.getPerspectiveTransform(srcq, dstq)
rect_img = cv2.warpPerspective(im, M, (TW, TH), flags=cv2.INTER_CUBIC)
mask = cv2.warpPerspective(board, M, (TW, TH))
cv2.imwrite(out + '_raw.png', rect_img)
# nieve sobre la base -> inpaint
hsv2 = cv2.cvtColor(rect_img, cv2.COLOR_BGR2HSV)
snow = ((hsv2[..., 1] < 85) & (hsv2[..., 2] > 125)).astype(np.uint8) * 255
snow = cv2.dilate(snow, np.ones((5, 5), np.uint8))
fill = cv2.inpaint(rect_img, snow, 9, cv2.INPAINT_TELEA)
cv2.imwrite(out + '_fill.png', fill)
# Dos tintas: rojo o marino
f = cv2.medianBlur(fill, 7)
hsv3 = cv2.cvtColor(f, cv2.COLOR_BGR2HSV).astype(np.float32)
redness = (hsv3[..., 1] / 255.0) * ((hsv3[..., 0] < 12) | (hsv3[..., 0] > 160)) * (hsv3[..., 2] / 255.0)
red = (redness > 0.32).astype(np.float32)
red = cv2.GaussianBlur(red, (0, 0), 3)
red = cv2.resize(red, (TW * 2, TH * 2), interpolation=cv2.INTER_CUBIC)
red = cv2.GaussianBlur(red, (0, 0), 2.5)
red = np.clip((red - 0.5) * 6 + 0.5, 0, 1)
red = cv2.resize(red, (TW, TH), interpolation=cv2.INTER_AREA)
np.save(out + '_redmask.npy', red)
def paint(c1, c2, name):
    a = red[..., None]
    img = a * np.array(c1, np.float32) + (1 - a) * np.array(c2, np.float32)
    noise = np.random.default_rng(1).normal(0, 2.0, img.shape[:2])[..., None]
    img = np.clip(img + noise, 0, 255).astype(np.uint8)
    cv2.imwrite(name, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
# BGR
paint((63, 40, 220), (73, 48, 38), out + '_drake.jpg')     # rojo DRAKE / azul marino
paint((26, 106, 255), (28, 24, 22), out + '_snake.jpg')    # naranja / negro

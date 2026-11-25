import cv2, numpy as np, sys
im = cv2.imread(sys.argv[1]); out = sys.argv[2]
lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
board = ((A > 145) | ((L < 75) & (B < 121))).astype(np.uint8) * 255
board = cv2.morphologyEx(board, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
cols = np.where(board.sum(0) > 255 * 40)[0]
x0, x1 = cols.min(), cols.max()
mid = board[:, (x0 + x1) // 2 - 300:(x0 + x1) // 2 + 300]
rows = np.where(mid.mean(1) > 128)[0]
y0, y1 = rows.min(), rows.max()
print('crop', x0, x1, y0, y1)
crop = im[y0:y1 + 1, x0:x1 + 1]
lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB).astype(np.float32)
L, A = lab[..., 0], lab[..., 1]
snow = ((L > 105) & (A < 150)).astype(np.uint8) * 255
snow = cv2.dilate(snow, np.ones((5, 5), np.uint8))
fill = cv2.inpaint(crop, snow, 7, cv2.INPAINT_TELEA)
TW, TH = 2048, 352
fill = cv2.resize(fill, (TW, TH), interpolation=cv2.INTER_AREA)
A = cv2.cvtColor(cv2.medianBlur(fill, 5), cv2.COLOR_BGR2LAB).astype(np.float32)[..., 1]
red = np.clip((A - 143) / 6, 0, 1)
red = cv2.resize(red, (TW * 2, TH * 2), interpolation=cv2.INTER_CUBIC)
red = cv2.GaussianBlur(red, (0, 0), 3)
red = (red > 0.5).astype(np.uint8) * 255
red = cv2.morphologyEx(red, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
red = cv2.GaussianBlur(red.astype(np.float32) / 255, (0, 0), 1.2)
red = cv2.resize(red, (TW, TH), interpolation=cv2.INTER_AREA)
np.save(out + '_red.npy', red)
def paint(c1, c2, name, grain=2.5):
    a = red[..., None]
    img = a * np.array(c1, np.float32) + (1 - a) * np.array(c2, np.float32)
    img += np.random.default_rng(1).normal(0, grain, img.shape[:2])[..., None]
    cv2.imwrite(name, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
paint((62, 36, 218), (78, 50, 39), out + '_drake.jpg')
paint((24, 104, 255), (26, 22, 20), out + '_snake.jpg')
cv2.imwrite(out + '_fill.jpg', fill)

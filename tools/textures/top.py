import cv2, numpy as np, sys
im = cv2.imread(sys.argv[1])
TW, TH = 2048, 352
def warp(tail, nose, width, name):
    tail = np.float32(tail); nose = np.float32(nose)
    a = (nose - tail) / np.linalg.norm(nose - tail)
    perp = np.float32([-a[1], a[0]])  # gira 90°
    if perp[0] < 0: perp = -perp          # que apunte hacia la derecha de la foto
    hw = width / 2
    # destino: x = u (tail->nose), y = v (izquierda foto -> derecha foto)
    srcq = np.float32([tail - perp * hw, nose - perp * hw, nose + perp * hw, tail + perp * hw])
    dstq = np.float32([[0, 0], [TW, 0], [TW, TH], [0, TH]])
    M = cv2.getPerspectiveTransform(srcq, dstq)
    out = cv2.warpPerspective(im, M, (TW, TH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    cv2.imwrite(name, out)
warp((537, 1905), (268, 622), 214, sys.argv[2] + '_white.png')
warp((896.8, 1692), (688.4, 655), 146, sys.argv[2] + '_black.png')

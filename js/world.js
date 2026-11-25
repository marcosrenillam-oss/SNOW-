// Objetos 3D: tablas (la blanca del oso y la negra de la serpiente), fijaciones, botas, rider y pista de prácticas.
import * as THREE from 'three';

export const BOARD = {
  half: 0.8,        // media longitud (la tabla mide 1.6 m aprox.)
  contact: 0.58,
  wWaist: 0.122,
  wTip: 0.148,
  T: 0.022,
  stance: 0.27,
};

export const COLORS = {
  red: 0xe5233d, navy: 0x263049, black: 0x111216, white: 0xf2f3f5,
  orange: 0xff6a1a, blue: 0x3b6cff,
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function halfWidth(x) {
  const ax = Math.abs(x);
  const { contact, half, wWaist, wTip } = BOARD;
  if (ax <= contact) return wWaist + (wTip - wWaist) * Math.pow(ax / contact, 2);
  const u = Math.min(1, (ax - contact) / (half - contact));
  const p = 2.4;
  return wTip * Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
}

export function lift(x) {
  const ax = Math.abs(x);
  const tip = 0.095 * Math.pow(smooth(0.46, BOARD.half, ax), 1.7);
  const camber = ax < 0.46 ? 0.007 * (1 - Math.pow(ax / 0.46, 2)) : 0;
  return tip + camber;
}

/* ================= Texturas ================= */
const DISPLAY = '"Archivo", "Arial Black", sans-serif';

function canvasTex(w, h, draw, renderer) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Oso: dibujado en un cuadro de ~200 px centrado en el origen, "arriba" = −y
function drawBear(g, eyeGlow = true) {
  const stroke = '#3d4149';
  g.lineJoin = 'round'; g.lineCap = 'round';
  // Orejas
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(s * 62, -66, 24, 0, Math.PI * 2);
    g.fillStyle = '#d9dce0'; g.fill(); g.lineWidth = 5; g.strokeStyle = stroke; g.stroke();
    g.beginPath(); g.arc(s * 62, -64, 12, 0, Math.PI * 2); g.fillStyle = '#9aa0a8'; g.fill();
  }
  // Cabeza con pelo en punta
  const head = [[0, -88], [-34, -84], [-62, -48], [-84, -30], [-80, -14], [-102, 2], [-84, 10], [-100, 30], [-78, 36], [-90, 56], [-62, 62], [-60, 84], [-36, 92], [-18, 106], [0, 98]];
  g.beginPath();
  head.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = head.length - 2; i >= 0; i--) g.lineTo(-head[i][0], head[i][1]);
  g.closePath();
  g.fillStyle = '#e4e6e9'; g.fill(); g.lineWidth = 6; g.strokeStyle = stroke; g.stroke();
  // Mechones
  g.lineWidth = 3; g.strokeStyle = '#6d727b';
  const tufts = [[-40, -62, -22, -50], [-12, -70, -4, -54], [14, -68, 8, -52], [40, -60, 24, -48], [-66, -6, -50, 0], [66, -6, 50, 0], [-70, 22, -54, 26], [70, 22, 54, 26], [-52, 46, -40, 44], [52, 46, 40, 44]];
  for (const [a, b, c, d] of tufts) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  // Cejas enfadadas
  g.lineWidth = 7; g.strokeStyle = '#2b2e34';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 50, -34); g.lineTo(s * 12, -16); g.stroke(); }
  // Ojos rojos
  for (const s of [-1, 1]) {
    g.save();
    if (eyeGlow) { g.shadowColor = '#ff2a40'; g.shadowBlur = 18; }
    g.beginPath(); g.moveTo(s * 44, -18); g.quadraticCurveTo(s * 30, -30, s * 14, -12); g.quadraticCurveTo(s * 30, -6, s * 44, -18);
    g.fillStyle = '#e5233d'; g.fill();
    g.restore();
    g.beginPath(); g.arc(s * 27, -15, 3.5, 0, Math.PI * 2); g.fillStyle = '#2a0a0e'; g.fill();
  }
  // Hocico
  g.beginPath(); g.ellipse(0, 26, 40, 34, 0, 0, Math.PI * 2);
  g.fillStyle = '#f2f3f5'; g.fill(); g.lineWidth = 4; g.strokeStyle = stroke; g.stroke();
  // Nariz
  g.beginPath(); g.moveTo(-17, 2); g.quadraticCurveTo(0, -6, 17, 2); g.quadraticCurveTo(10, 18, 0, 20); g.quadraticCurveTo(-10, 18, -17, 2);
  g.fillStyle = '#25282d'; g.fill();
  // Boca abierta rugiendo
  g.beginPath(); g.moveTo(-28, 36); g.quadraticCurveTo(0, 28, 28, 36); g.quadraticCurveTo(22, 74, 0, 82); g.quadraticCurveTo(-22, 74, -28, 36);
  g.fillStyle = '#1c1e23'; g.fill();
  g.beginPath(); g.ellipse(0, 66, 13, 9, 0, 0, Math.PI * 2); g.fillStyle = '#c21d33'; g.fill();
  // Colmillos
  g.fillStyle = '#ffffff';
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 22, 37); g.lineTo(s * 14, 37); g.lineTo(s * 18, 54); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(s * 16, 76); g.lineTo(s * 8, 78); g.lineTo(s * 13, 62); g.closePath(); g.fill();
  }
}

function drawDrakeTop(g, w, h) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#eceef0'); bg.addColorStop(0.5, '#f6f7f8'); bg.addColorStop(1, '#e4e6e9');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // Arañazos / cepillado gris
  const r = rnd(7);
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h, l = 20 + r() * 160;
    g.strokeStyle = `rgba(120,126,136,${0.04 + r() * 0.09})`;
    g.lineWidth = 1 + r() * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - l * 0.35); g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const gr = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 260);
    gr.addColorStop(0, 'rgba(150,156,166,0.10)'); gr.addColorStop(1, 'rgba(150,156,166,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  // Oso en el centro (mirando hacia el nose)
  g.save(); g.translate(w * 0.5, h * 0.5); g.rotate(Math.PI / 2); g.scale(1.45, 1.45); drawBear(g); g.restore();
  // Logo cerca del nose
  g.save(); g.translate(w * 0.79, h * 0.5); g.rotate(Math.PI / 2);
  g.fillStyle = '#2b2e34'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 22px ${DISPLAY}`; g.fillText('PREMIUM', 0, -58);
  g.font = `900 26px ${DISPLAY}`; g.fillText('SQUAD', 0, -34);
  g.save(); g.translate(0, 8); g.scale(0.28, 0.28); drawBear(g, false); g.restore();
  g.font = `900 46px ${DISPLAY}`; g.fillText('DRAKE', 0, 62);
  g.restore();
  // Texto cerca del tail
  g.save(); g.translate(w * 0.17, h * 0.5); g.rotate(Math.PI / 2);
  g.fillStyle = '#2b2e34'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `italic 600 34px Georgia, serif`; g.fillText('The Squad', 0, -26);
  g.font = `900 34px ${DISPLAY}`; g.fillText('DRAKE × PROFE', 0, 18);
  g.restore();
  // Filetes rojos en los bordes
  g.fillStyle = '#e5233d';
  g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
}

function drawDrakeBase(g, w, h) {
  g.fillStyle = '#dc2840'; g.fillRect(0, 0, w, h);
  // Letras gigantes
  g.save();
  g.font = `900 ${h * 1.08}px ${DISPLAY}`;
  g.textBaseline = 'middle'; g.textAlign = 'center';
  const m = g.measureText('DRAKE').width;
  g.translate(w / 2, h * 0.53);
  g.scale((w * 0.9) / m, 1);
  g.fillStyle = '#263049';
  g.fillText('DRAKE', 0, 0);
  g.restore();
  // Cortes diagonales rojos sobre las letras
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#dc2840';
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 230;
    g.beginPath(); g.moveTo(x, h + 10); g.lineTo(x + 26, h + 10); g.lineTo(x + 196, -10); g.lineTo(x + 170, -10); g.closePath(); g.fill();
  }
  g.restore();
  // Motas de nieve
  const r = rnd(3);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; g.beginPath(); g.arc(r() * w, r() * h, r() * 2.4, 0, 7); g.fill(); }
}

function drawSnakeTop(g, w, h) {
  g.fillStyle = '#121418'; g.fillRect(0, 0, w, h);
  const r = rnd(11);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.03})`; g.fillRect(r() * w, r() * h, 2, 2); }
  // Serpiente enrollada
  const path = (o) => { g.beginPath(); for (let x = -40; x <= w + 40; x += 8) { const y = h * 0.5 + Math.sin(x / 150 + o) * h * 0.28 + Math.sin(x / 47) * 10; x === -40 ? g.moveTo(x, y) : g.lineTo(x, y); } };
  g.lineCap = 'round';
  path(0); g.strokeStyle = '#2a2e36'; g.lineWidth = 78; g.stroke();
  path(0); g.strokeStyle = '#3a404b'; g.lineWidth = 3; g.setLineDash([18, 14]); g.stroke();
  g.setLineDash([]);
  path(0); g.strokeStyle = 'rgba(90,98,112,0.6)'; g.lineWidth = 1.5; g.stroke();
  for (let x = 0; x < w; x += 22) {
    const y = h * 0.5 + Math.sin(x / 150) * h * 0.28 + Math.sin(x / 47) * 10;
    g.strokeStyle = 'rgba(80,88,100,0.55)'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 16, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  }
  // Cabeza
  const hx = w * 0.86, hy = h * 0.5 + Math.sin(hx / 150) * h * 0.28;
  g.fillStyle = '#2f343d'; g.beginPath(); g.ellipse(hx + 40, hy, 70, 44, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(hx + 70, hy - 16, 7, 0, 7); g.fill(); g.beginPath(); g.arc(hx + 70, hy + 16, 7, 0, 7); g.fill();
  g.strokeStyle = '#ff6a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(hx + 108, hy); g.lineTo(hx + 140, hy); g.lineTo(hx + 152, hy - 10); g.moveTo(hx + 140, hy); g.lineTo(hx + 152, hy + 10); g.stroke();
  g.fillStyle = '#3b6cff'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
}

function drawSnakeBase(g, w, h) {
  g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff6a1a';
  for (let i = 0; i < 5; i++) {
    const x = 260 + i * 330;
    g.beginPath(); g.moveTo(x, h); g.lineTo(x + 60, h); g.lineTo(x + 220, 0); g.lineTo(x + 160, 0); g.closePath(); g.fill();
  }
  g.save();
  g.font = `900 ${h * 0.55}px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const m = g.measureText('SERPIENTE').width;
  g.translate(w / 2, h * 0.52); g.scale(Math.min(1, (w * 0.78) / m), 1);
  g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.strokeText('SERPIENTE', 0, 0);
  g.restore();
}

function sideTex(color, renderer) {
  const t = canvasTex(8, 64, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 8, 44);
    g.fillStyle = '#c9ced6'; g.fillRect(0, 44, 8, 20);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, 46, 8, 3);
  }, renderer);
  return t;
}

function snowTex(renderer) {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#eef3f9'; g.fillRect(0, 0, w, h);
    const r = rnd(5);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(170,185,210,0.22)' : 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(r() * w, r() * h, r() * 2.2, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(160,175,205,0.16)'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, renderer);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function radialTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ================= Tabla ================= */
function boardGeometry() {
  const N = 180, M = 14;
  const { half, T } = BOARD;
  const pos = [], uv = [], idx = [], groups = [];
  const v = (x, y, z, a, b) => { pos.push(x, y, z); uv.push(a, b); };
  const xs = [];
  for (let i = 0; i <= N; i++) { const s = -1 + 2 * i / N; xs.push(half * Math.sign(s) * Math.pow(Math.abs(s), 0.85)); }

  for (const top of [true, false]) {
    const base = pos.length / 3, start = idx.length;
    for (let i = 0; i <= N; i++) {
      const x = xs[i], hw = halfWidth(x), y = lift(x) + (top ? T / 2 : -T / 2);
      for (let j = 0; j <= M; j++) {
        const s = -1 + 2 * j / M;
        v(x, y, s * hw, (x + half) / (2 * half), top ? (1 - s) / 2 : (s + 1) / 2);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = base + i * (M + 1) + j, b = a + M + 1, c = b + 1, d = a + 1;
      if (top) idx.push(a, d, b, d, c, b); else idx.push(a, b, d, d, b, c);
    }
    groups.push([start, idx.length - start, top ? 0 : 1]);
  }
  const start = idx.length;
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const x = xs[i], hw = halfWidth(x), l = lift(x);
      v(x, l + T / 2, s * hw, i / N, 1);
      v(x, l - T / 2, s * hw, i / N, 0);
    }
    for (let i = 0; i < N; i++) {
      const A = base + i * 2, D = A + 1, B = A + 2, C = A + 3;
      if (s > 0) idx.push(A, D, B, D, C, B); else idx.push(A, B, D, D, B, C);
    }
  }
  groups.push([start, idx.length - start, 2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  for (const [s, c, m] of groups) geo.addGroup(s, c, m);
  geo.computeVertexNormals();
  return geo;
}

function edgeLine(side, color) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const x = -0.74 + 1.48 * i / 80;
    pts.push(new THREE.Vector3(x, lift(x) - BOARD.T * 0.2, side * (halfWidth(x) + 0.004)));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.008, 6, false);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
}

/* ================= Fijación ================= */
function arch(points, r, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 8, false), mat);
  return m;
}

function makeBinding(M) {
  const g = new THREE.Group();
  const parts = {};

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 40), M.disc);
  disc.position.y = 0.004;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 6, 40), M.detail);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.009;
  disc.add(ring);
  g.add(disc); parts.disc = disc;

  const frame = new THREE.Group();
  g.add(frame); parts.frame = frame;

  // Base
  const s = new THREE.Shape();
  const W = 0.052, L = 0.13, r = 0.036;
  s.moveTo(-W + r, -L); s.lineTo(W - r, -L); s.quadraticCurveTo(W, -L, W, -L + r);
  s.lineTo(W, L - r); s.quadraticCurveTo(W, L, W - r, L); s.lineTo(-W + r, L);
  s.quadraticCurveTo(-W, L, -W, L - r); s.lineTo(-W, -L + r); s.quadraticCurveTo(-W, -L, -W + r, -L);
  const plateGeo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
  plateGeo.rotateX(Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, M.frame);
  plate.position.y = 0.024;
  frame.add(plate);

  // Laterales que suben hacia el talón
  const side = new THREE.Shape();
  side.moveTo(-0.12, 0); side.lineTo(0.08, 0); side.lineTo(0.08, 0.018); side.quadraticCurveTo(-0.02, 0.03, -0.08, 0.07); side.lineTo(-0.12, 0.075); side.closePath();
  const sideGeo = new THREE.ExtrudeGeometry(side, { depth: 0.008, bevelEnabled: false });
  sideGeo.rotateY(-Math.PI / 2);
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(sideGeo, M.frame);
    m.position.set(sx * 0.054 + (sx > 0 ? 0.008 : 0), 0.02, 0);
    frame.add(m);
  }
  // Heelcup
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.07, 24, 1, true, Math.PI / 2, Math.PI), M.frame);
  cup.position.set(0, 0.06, -0.105);
  frame.add(cup);

  // Highback
  const hb = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.22, 24, 1, true, Math.PI / 2 + 0.12, Math.PI - 0.24), M.high);
  shell.position.y = 0.11;
  hb.add(shell);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.17, 0.008), M.detail);
  spine.position.set(0, 0.11, -0.058);
  hb.add(spine);
  const hbStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0535, 0.0555, 0.018, 24, 1, true, Math.PI / 2 + 0.5, Math.PI - 1), M.accent);
  hbStripe.position.y = 0.19;
  hb.add(hbStripe);
  hb.position.set(0, 0.07, -0.112);
  hb.rotation.x = -0.22;
  g.add(hb); parts.highback = hb;

  // Strap de tobillo (acolchado, con carraca)
  const ankle = new THREE.Group();
  const ankleStrap = arch([[-0.056, 0.0, 0.0], [-0.05, 0.06, 0.015], [0, 0.085, 0.022], [0.05, 0.06, 0.015], [0.056, 0.0, 0.0]], 0.012, M.strap);
  ankleStrap.scale.set(1, 1, 2.2);
  ankle.add(ankleStrap);
  const ratchet = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.05, 0.03), M.detail);
  ratchet.position.set(0.058, 0.035, 0.01); ratchet.rotation.z = -0.4;
  ankle.add(ratchet);
  ankle.position.set(0, 0.07, -0.05);
  g.add(ankle); parts.ankle = ankle;

  // Strap de puntera
  const toe = new THREE.Group();
  const toeStrap = arch([[-0.052, 0.0, 0.0], [-0.044, 0.04, 0.01], [0, 0.055, 0.014], [0.044, 0.04, 0.01], [0.052, 0.0, 0.0]], 0.008, M.strap);
  toeStrap.scale.set(1, 1, 2);
  toe.add(toeStrap);
  toe.position.set(0, 0.03, 0.085);
  g.add(toe); parts.toe = toe;

  // Bota
  const boot = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 6, 14), M.boot);
  sole.rotation.x = Math.PI / 2; sole.scale.set(1, 1, 0.72); sole.position.set(0, 0.062, 0.005);
  boot.add(sole);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.058, 0.18, 18), M.boot);
  shaft.position.set(0, 0.15, -0.07); shaft.rotation.x = 0.15;
  boot.add(shaft);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 20), M.bootAccent);
  collar.rotation.x = Math.PI / 2 + 0.15; collar.position.set(0, 0.235, -0.083);
  boot.add(collar);
  const lace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.11), M.bootDark);
  lace.position.set(0, 0.104, 0.035); lace.rotation.x = -0.25;
  boot.add(lace);
  g.add(boot); parts.boot = boot;

  // Anclajes
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  parts.aHighback = anchor(hb, 0, 0.21, -0.03);
  parts.aAnkle = anchor(ankle, 0, 0.1, 0.03);
  parts.aToe = anchor(toe, 0, 0.07, 0.02);
  parts.aDisc = anchor(disc, 0.06, 0.004, 0.02);
  parts.aAnkleBone = anchor(g, 0, 0.14, -0.05);
  parts.aFoot = anchor(g, 0, 0.12, 0.04);
  g.userData.parts = parts;
  return g;
}

/* ================= Rider ================= */
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();

function limb(r1, r2, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 1, 14), mat); }
function place(mesh, a, b) {
  const d = tmpV.subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}
function ik(a, c, l1, l2, hint, out) {
  const ac = new THREE.Vector3().subVectors(c, a);
  const d = Math.min(ac.length(), l1 + l2 - 1e-4);
  const dir = ac.normalize();
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const perp = hint.clone().addScaledVector(dir, -hint.dot(dir)).normalize();
  return out.copy(a).addScaledVector(dir, x).addScaledVector(perp, h);
}

function makeRider() {
  const M = {
    jacket: new THREE.MeshStandardMaterial({ color: 0xe5233d, roughness: 0.62 }),
    jacketDark: new THREE.MeshStandardMaterial({ color: 0x7c0f1d, roughness: 0.7 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x1b1d23, roughness: 0.8 }),
    helmet: new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.28, metalness: 0.05 }),
    black: new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 0.6 }),
    lens: new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x8a2a00, emissiveIntensity: 0.5, roughness: 0.05, metalness: 0.9, side: THREE.DoubleSide }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  };
  const g = new THREE.Group();
  const P = {};
  P.thighL = limb(0.08, 0.072, M.pants); P.thighR = limb(0.08, 0.072, M.pants);
  P.shinL = limb(0.07, 0.066, M.pants); P.shinR = limb(0.07, 0.066, M.pants);
  P.cuffL = limb(0.078, 0.08, M.pants); P.cuffR = limb(0.078, 0.08, M.pants);
  P.upperL = limb(0.058, 0.052, M.jacket); P.upperR = limb(0.058, 0.052, M.jacket);
  P.foreL = limb(0.052, 0.048, M.jacket); P.foreR = limb(0.052, 0.048, M.jacket);
  P.wristL = limb(0.05, 0.05, M.black); P.wristR = limb(0.05, 0.05, M.black);
  for (const k in P) g.add(P[k]);
  const ball = (r, m, sx = 1, sy = 1, sz = 1) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); s.scale.set(sx, sy, sz); g.add(s); return s; };
  P.kneeL = ball(0.075, M.pants); P.kneeR = ball(0.075, M.pants);
  P.hipL = ball(0.082, M.pants); P.hipR = ball(0.082, M.pants);
  P.elbowL = ball(0.054, M.jacket); P.elbowR = ball(0.054, M.jacket);
  P.shL = ball(0.07, M.jacket); P.shR = ball(0.07, M.jacket);
  P.handL = ball(0.055, M.black, 1, 0.85, 1.25); P.handR = ball(0.055, M.black, 1, 0.85, 1.25);
  P.pelvis = ball(0.13, M.pants, 1.25, 0.8, 0.95);

  // Torso: chaqueta con forma (más ancha en el pecho)
  const prof = [[0.0, 0], [0.155, 0.0], [0.168, 0.05], [0.162, 0.14], [0.172, 0.26], [0.182, 0.36], [0.16, 0.43], [0.1, 0.47], [0.05, 0.48], [0.0, 0.48]].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), M.jacket);
  body.scale.set(1, 1, 0.74);
  torso.add(body);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.018, 8, 28), M.jacketDark);
  hem.rotation.x = Math.PI / 2; hem.scale.set(1, 0.74, 1); hem.position.y = 0.02;
  torso.add(hem);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.42, 0.01), M.black);
  zip.position.set(0, 0.24, 0.128); zip.rotation.x = -0.04;
  torso.add(zip);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.176, 0.181, 0.035, 24, 1, true), M.white);
  stripe.scale.set(1, 1, 0.75); stripe.position.y = 0.3;
  torso.add(stripe);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.jacketDark);
  hood.position.set(0, 0.44, -0.07); hood.rotation.x = -0.5; hood.scale.set(1.2, 0.7, 0.9);
  torso.add(hood);
  const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 12), M.black);
  pack.position.set(0, 0.26, -0.16); pack.scale.set(1.15, 1, 0.55);
  torso.add(pack);
  g.add(torso); P.torso = torso;

  // Cabeza: casco, gafas espejo naranja y braga de cuello
  const head = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.1, 16), M.black);
  neck.position.y = -0.1;
  head.add(neck);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), M.black);
  face.position.y = -0.02;
  head.add(face);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.122, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), M.helmet);
  helmet.position.y = 0.0; helmet.scale.set(1, 1.05, 1.08);
  head.add(helmet);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.121, 0.012, 8, 32), M.jacket);
  strap.rotation.x = Math.PI / 2; strap.position.y = -0.005; strap.scale.set(1, 1.08, 1);
  head.add(strap);
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.126, 0.07, 28, 1, true, -1.15, 2.3), M.black);
  frame.material = frame.material.clone(); frame.material.side = THREE.DoubleSide;
  frame.position.y = -0.005;
  head.add(frame);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.129, 0.129, 0.05, 28, 1, true, -1.0, 2.0), M.lens);
  lens.position.y = -0.005;
  head.add(lens);
  g.add(head); P.head = head;

  P.aKnee = new THREE.Object3D(); P.aHip = new THREE.Object3D(); P.aShoulder = new THREE.Object3D(); P.aHead = new THREE.Object3D();
  g.add(P.aKnee, P.aHip, P.aShoulder, P.aHead);
  g.userData.P = P;
  g.userData.M = M;
  return g;
}

const _v = {
  hip: new THREE.Vector3(), hipL: new THREE.Vector3(), hipR: new THREE.Vector3(), kL: new THREE.Vector3(), kR: new THREE.Vector3(),
  chest: new THREE.Vector3(), shL: new THREE.Vector3(), shR: new THREE.Vector3(), eL: new THREE.Vector3(), eR: new THREE.Vector3(),
  hL: new THREE.Vector3(), hR: new THREE.Vector3(), side: new THREE.Vector3(), t: new THREE.Vector3(), cL: new THREE.Vector3(), cR: new THREE.Vector3(),
};
const hintL = new THREE.Vector3(0.25, 0, 1).normalize(), hintR = new THREE.Vector3(-0.25, 0, 1).normalize();
const aHintL = new THREE.Vector3(0.3, -0.2, -0.6), aHintR = new THREE.Vector3(-0.3, -0.2, -0.6);

/** footL / footR en espacio del rider. o = { crouch, shiftX, shiftZ, lookYaw, arms, twist } */
export function poseRider(rider, footL, footR, o) {
  const P = rider.userData.P, V = _v;
  const THIGH = 0.44, SHIN = 0.44, UPPER = 0.28, FORE = 0.26;
  const midX = (footL.x + footR.x) / 2, midZ = (footL.z + footR.z) / 2, footY = (footL.y + footR.y) / 2;
  V.hip.set(midX + o.shiftX, footY + 0.84 - o.crouch * 0.34, midZ - 0.05 - o.crouch * 0.07 + o.shiftZ);
  const tw = o.twist || 0;
  V.side.set(Math.cos(tw), 0, -Math.sin(tw));
  V.hipL.copy(V.hip).addScaledVector(V.side, 0.1);
  V.hipR.copy(V.hip).addScaledVector(V.side, -0.1);
  ik(V.hipL, footL, THIGH, SHIN, hintL, V.kL);
  ik(V.hipR, footR, THIGH, SHIN, hintR, V.kR);
  place(P.thighL, V.hipL, V.kL); place(P.shinL, V.kL, footL);
  place(P.thighR, V.hipR, V.kR); place(P.shinR, V.kR, footR);
  V.cL.copy(V.kL).sub(footL).normalize().multiplyScalar(0.08).add(footL); place(P.cuffL, footL, V.cL);
  V.cR.copy(V.kR).sub(footR).normalize().multiplyScalar(0.08).add(footR); place(P.cuffR, footR, V.cR);
  P.kneeL.position.copy(V.kL); P.kneeR.position.copy(V.kR);
  P.hipL.position.copy(V.hipL); P.hipR.position.copy(V.hipR);
  P.pelvis.position.copy(V.hip).add(V.t.set(0, 0.04, 0));
  P.pelvis.rotation.set(0, tw, 0);

  const lean = 0.06 + o.crouch * 0.13;
  V.chest.copy(V.hip).add(V.t.set(o.shiftX * 0.5, 0.44 - o.crouch * 0.04, lean + o.shiftZ * 0.6));
  const tdir = new THREE.Vector3().subVectors(V.chest, V.hip);
  const tlen = tdir.length();
  P.torso.position.copy(V.hip).add(V.t.set(0, 0.03, 0));
  P.torso.quaternion.setFromUnitVectors(UP, tdir.normalize());
  P.torso.rotateY(tw);
  P.torso.scale.set(1, tlen / 0.46, 1);

  P.head.position.copy(V.chest).add(V.t.set(0, 0.2, 0.015));
  P.head.rotation.set(0.05, o.lookYaw || 0, 0);

  V.shL.copy(V.chest).addScaledVector(V.side, 0.2).add(V.t.set(0, -0.05, 0));
  V.shR.copy(V.chest).addScaledVector(V.side, -0.2).add(V.t.set(0, -0.05, 0));
  P.shL.position.copy(V.shL); P.shR.position.copy(V.shR);
  const arms = o.arms ?? 0.4;
  V.hL.copy(V.shL).addScaledVector(V.side, 0.15 + arms * 0.17).add(V.t.set(0, -0.36 + arms * 0.13, 0.13));
  V.hR.copy(V.shR).addScaledVector(V.side, -0.15 - arms * 0.17).add(V.t.set(0, -0.36 + arms * 0.13, 0.13));
  ik(V.shL, V.hL, UPPER, FORE, aHintL, V.eL);
  ik(V.shR, V.hR, UPPER, FORE, aHintR, V.eR);
  place(P.upperL, V.shL, V.eL); place(P.foreL, V.eL, V.hL);
  place(P.upperR, V.shR, V.eR); place(P.foreR, V.eR, V.hR);
  place(P.wristL, V.t.copy(V.eL).lerp(V.hL, 0.82), V.hL);
  place(P.wristR, new THREE.Vector3().copy(V.eR).lerp(V.hR, 0.82), V.hR);
  P.elbowL.position.copy(V.eL); P.elbowR.position.copy(V.eR);
  P.handL.position.copy(V.hL); P.handR.position.copy(V.hR);
  P.handL.quaternion.copy(P.foreL.quaternion); P.handR.quaternion.copy(P.foreR.quaternion);

  P.aKnee.position.copy(V.kL);
  P.aHip.position.copy(V.hip);
  P.aShoulder.position.copy(V.shR);
  P.aHead.position.copy(P.head.position).add(V.t.set(0, 0.1, 0));
}

/* ================= Mundo ================= */
export function buildWorld(renderer) {
  const scene = new THREE.Scene();

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#08090c') }, bottom: { value: new THREE.Color('#22252e') }, sun: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float sun; varying vec3 vP;
      void main(){
        float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(bottom, top, smoothstep(0.45, 0.95, h));
        float glow = pow(max(0.0, dot(normalize(vP), normalize(vec3(-0.4, 0.35, 1.0)))), 16.0) * sun;
        c += vec3(1.0, 0.86, 0.62) * glow * 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.Fog('#22252e', 14, 60);

  const hemi = new THREE.HemisphereLight(0xf3f6ff, 0x2a2d36, 0.7);
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(2.5, 4, -2);
  const rim = new THREE.DirectionalLight(0xff5a6a, 1.0); rim.position.set(-3, 1.5, 3);
  const warm = new THREE.PointLight(0xe5233d, 2.2, 5, 1.6); warm.position.set(1.2, -1.2, 1.0);
  const fill = new THREE.DirectionalLight(0xbfd2ff, 0.6); fill.position.set(3, 1, 3);
  scene.add(hemi, key, rim, warm, fill);

  // Pieles de tabla
  const skins = {
    drake: { top: canvasTex(2048, 384, drawDrakeTop, renderer), base: canvasTex(2048, 384, drawDrakeBase, renderer), side: sideTex('#e5233d', renderer),
      frame: 0x17191e, high: 0x121317, strap: 0x23262d, detail: 0x8d939c, accent: 0x2b2f37 },
    snake: { top: canvasTex(2048, 384, drawSnakeTop, renderer), base: canvasTex(2048, 384, drawSnakeBase, renderer), side: sideTex('#3b6cff', renderer),
      frame: 0xff6a1a, high: 0xff6a1a, strap: 0xff7d33, detail: 0x1b1c20, accent: 0xffffff },
  };
  const mats = {
    top: new THREE.MeshPhysicalMaterial({ map: skins.drake.top, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.4 }),
    base: new THREE.MeshStandardMaterial({ map: skins.drake.base, roughness: 0.45, envMapIntensity: 0.5 }),
    side: new THREE.MeshStandardMaterial({ map: skins.drake.side, roughness: 0.35, metalness: 0.4 }),
    frame: new THREE.MeshStandardMaterial({ color: skins.drake.frame, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }),
    high: new THREE.MeshStandardMaterial({ color: skins.drake.high, roughness: 0.4, metalness: 0.15, side: THREE.DoubleSide }),
    strap: new THREE.MeshStandardMaterial({ color: skins.drake.strap, roughness: 0.75 }),
    detail: new THREE.MeshStandardMaterial({ color: skins.drake.detail, roughness: 0.3, metalness: 0.8 }),
    accent: new THREE.MeshStandardMaterial({ color: skins.drake.accent, roughness: 0.4, side: THREE.DoubleSide }),
    disc: new THREE.MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.4, metalness: 0.5 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x24272e, roughness: 0.6, transparent: true }),
    bootDark: new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, transparent: true }),
    bootAccent: new THREE.MeshStandardMaterial({ color: 0xe5233d, roughness: 0.5, transparent: true }),
  };

  const rig = new THREE.Group(); rig.rotation.order = 'YXZ'; scene.add(rig);
  const boardGroup = new THREE.Group(); boardGroup.rotation.order = 'YXZ'; rig.add(boardGroup);
  const board = new THREE.Mesh(boardGeometry(), [mats.top, mats.base, mats.side]);
  boardGroup.add(board);
  const heelEdge = edgeLine(-1, COLORS.blue), toeEdge = edgeLine(1, COLORS.red);
  boardGroup.add(heelEdge, toeEdge);

  const bindL = makeBinding(mats), bindR = makeBinding(mats);
  bindL.position.set(BOARD.stance, lift(BOARD.stance) + BOARD.T / 2, 0);
  bindR.position.set(-BOARD.stance, lift(BOARD.stance) + BOARD.T / 2, 0);
  boardGroup.add(bindL, bindR);

  const glowTex = radialTex();
  const glowMat = (c) => new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glowL = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glowMat(COLORS.blue));
  const glowR = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glowMat(COLORS.red));
  for (const [gm, b] of [[glowL, bindL], [glowR, bindR]]) { gm.rotation.x = -Math.PI / 2; gm.position.set(b.position.x, b.position.y + 0.003, 0); boardGroup.add(gm); }

  const anchors = {};
  const addA = (name, x, y, z, parent = boardGroup) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); anchors[name] = o; };
  addA('nose', 0.72, lift(0.72) + 0.02, 0);
  addA('tail', -0.72, lift(0.72) + 0.02, 0);
  addA('edge', 0.06, 0.0, halfWidth(0.06) + 0.004);
  addA('heelEdge', -0.12, 0.0, -halfWidth(0.12) - 0.004);
  addA('toeEdge', 0.12, 0.0, halfWidth(0.12) + 0.004);
  addA('baseC', 0.0, -BOARD.T, 0.0);
  addA('topC', 0.0, BOARD.T, 0.0);
  addA('rocker', -0.5, lift(0.5), halfWidth(0.5));
  addA('center', 0, 0.02, 0);
  addA('baseSpot', 0.12, 0.02, -0.06);

  const rider = makeRider();
  rig.add(rider);

  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.07); arrowShape.lineTo(0.32, 0.07); arrowShape.lineTo(0.32, 0.15);
  arrowShape.lineTo(0.5, 0); arrowShape.lineTo(0.32, -0.15); arrowShape.lineTo(0.32, -0.07); arrowShape.lineTo(0, -0.07);
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
  arrow.rotation.x = -Math.PI / 2;
  rig.add(arrow);
  const tip = new THREE.Object3D(); tip.position.set(0.5, 0, 0); arrow.add(tip); arrow.userData.tip = tip;

  // Pista de prácticas
  const slope = new THREE.Group(); scene.add(slope);
  const snowMap = snowTex(renderer); snowMap.repeat.set(16, 24);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: snowMap, roughness: 0.95, transparent: true, opacity: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = 18;
  slope.add(ground);

  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1f3b36, roughness: 0.9, transparent: true, opacity: 0, flatShading: true });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.8, transparent: true, opacity: 0, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9, transparent: true, opacity: 0 });
  const trees = [];
  const tr = rnd(21);
  for (let i = 0; i < 46; i++) {
    const t = new THREE.Group();
    const h = 1.2 + tr() * 1.6;
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55 - k * 0.13, h * 0.5, 7), k === 2 ? capMat : treeMat);
      cone.position.y = h * 0.3 + k * h * 0.22;
      t.add(cone);
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), trunkMat);
    trunk.position.y = 0.15; t.add(trunk);
    const s = i % 2 ? 1 : -1;
    t.position.set(s * (3.2 + tr() * 9), 0, -6 + tr() * 46);
    t.scale.setScalar(0.8 + tr() * 0.7);
    slope.add(t); trees.push(t);
  }

  const TRAIL = 220;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 6), 3));
  const tIdx = [];
  for (let i = 0; i < TRAIL - 1; i++) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  trailGeo.setIndex(tIdx);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xa9b6cc, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.frustumCulled = false; trail.position.y = 0.003;
  slope.add(trail);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: radialTex('rgba(10,14,30,0.75)', 'rgba(10,14,30,0)'), transparent: true, depthWrite: false, opacity: 0 }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const FLAKES = 1400;
  const fpos = new Float32Array(FLAKES * 3), fspd = new Float32Array(FLAKES);
  const fr = rnd(9);
  for (let i = 0; i < FLAKES; i++) { fpos[i * 3] = (fr() - 0.5) * 18; fpos[i * 3 + 1] = fr() * 9 - 2; fpos[i * 3 + 2] = (fr() - 0.5) * 18; fspd[i] = 0.25 + fr() * 0.5; }
  const flakeGeo = new THREE.BufferGeometry();
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ size: 0.045, map: radialTex(), transparent: true, depthWrite: false, opacity: 0.85 }));
  flakes.userData.speed = fspd;
  flakes.frustumCulled = false;
  scene.add(flakes);

  // Puntos fijos alrededor de la tabla (consejos)
  const ring = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const o = new THREE.Object3D();
    o.position.set(Math.cos(a) * 1.05, Math.sin(a) * 0.62, 0.2);
    scene.add(o); ring.push(o);
  }

  function setSkin(name) {
    const s = skins[name] || skins.drake;
    mats.top.map = s.top; mats.base.map = s.base; mats.side.map = s.side;
    mats.frame.color.setHex(s.frame); mats.high.color.setHex(s.high); mats.strap.color.setHex(s.strap);
    mats.detail.color.setHex(s.detail); mats.accent.color.setHex(s.accent);
  }

  return {
    scene, sky, skyMat, hemi, key, rim, warm, fill, rig, boardGroup, board, bindL, bindR, glowL, glowR,
    heelEdge, toeEdge, anchors, rider, arrow, slope, ground, groundMat, snowMap, trees,
    treeMats: [treeMat, capMat, trunkMat], trail, trailMat, TRAIL, shadow, flakes, mats, ring, setSkin, snowTex: () => snowTex(renderer),
  };
}

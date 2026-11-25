// Objetos 3D: tus tablas (texturas sacadas de tus fotos), fijaciones, botas, rider y pista de prácticas.
import * as THREE from 'three';
import { RGBELoader } from '../vendor/jsm/loaders/RGBELoader.js';

export const BOARD = {
  half: 0.8,        // 1,6 m
  contact: 0.68,    // donde empieza a redondearse la punta
  wWaist: 0.121,    // medio ancho en la cintura
  wTip: 0.131,      // medio ancho máximo (proporciones de tu foto)
  T: 0.02,
  stance: 0.27,
  chamfer: 0.0035,
};

// Cada tabla trae su paleta: al cambiar de tabla cambia toda la app
export const THEMES = {
  drake: {
    name: 'La blanca · Oso',
    accent: 0xe5233d, accent2: 0x263049, cool: 0x3b6cff,
    side: '#d62a3e', top: 'assets/drake-top.jpg', base: 'assets/drake-base.jpg',
    binding: { frame: 0x17181c, high: 0x111215, strap: 0x1d1f24, detail: 0x9aa0a8, accent: 0x2c2f36, pad: 0x26282e },
    rider: { jacket: 0xe5233d, jacketDark: 0x7c0f1d, pants: 0x18191e, stripe: 0xffffff, lens: 0xff7a1a, helmet: 0xf2f3f5 },
    studio: ['#07080b', '#25272f'], css: { accent: '#e5233d', accent2: '#ff3d55', deep: '#263049', bg: '#0b0c10' },
  },
  snake: {
    name: 'La negra · Serpiente',
    accent: 0xff6a1a, accent2: 0x1a1c22, cool: 0x3b6cff,
    side: '#2f55d8', top: 'assets/snake-top.jpg', base: 'assets/snake-base.jpg',
    binding: { frame: 0xff6a1a, high: 0xff6a1a, strap: 0xff7d33, detail: 0x1b1c20, accent: 0xff5a10, pad: 0xe8601a },
    rider: { jacket: 0x16171b, jacketDark: 0x2a2c33, pants: 0x2b2e36, stripe: 0xff6a1a, lens: 0x3b6cff, helmet: 0x1b1c20 },
    studio: ['#060607', '#1e1c1b'], css: { accent: '#ff6a1a', accent2: '#ff8c45', deep: '#16181d', bg: '#09090a' },
  },
};
export const COLORS = { red: 0xe5233d, blue: 0x3b6cff, orange: 0xff6a1a };

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function halfWidth(x) { return hwFn(x); }
function hwFn(x) {
  const ax = Math.abs(x);
  const { contact, half, wWaist, wTip } = BOARD;
  if (ax <= contact) return wWaist + (wTip - wWaist) * Math.pow(ax / contact, 2);
  const u = Math.min(1, (ax - contact) / (half - contact));
  const p = 2.3;
  return wTip * Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
}
export function lift(x) {
  const ax = Math.abs(x);
  const tip = 0.085 * Math.pow(smooth(0.52, BOARD.half, ax), 1.6);
  const camber = ax < 0.52 ? 0.006 * (1 - Math.pow(ax / 0.52, 2)) : 0;
  return tip + camber;
}

function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function canvasTex(w, h, draw, renderer, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
export function radialTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function sideTex(color, renderer) {
  return canvasTex(8, 64, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 8, 46);
    g.fillStyle = '#d4d9e0'; g.fillRect(0, 46, 8, 18);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, 48, 8, 3);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 8, 4);
  }, renderer);
}
// Grano fino para el barniz (normal map suave)
function grainNormal(renderer) {
  const t = canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    const r = rnd(4);
    for (let i = 0; i < w * h; i++) {
      const n = (r() - 0.5) * 18;
      img.data[i * 4] = 128 + n; img.data[i * 4 + 1] = 128 + (r() - 0.5) * 18; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, renderer, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function snowTex(renderer) {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#eef3f9'; g.fillRect(0, 0, w, h);
    const r = rnd(5);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(170,185,210,0.2)' : 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(r() * w, r() * h, r() * 2.2, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(160,175,205,0.14)'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, renderer);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function snowNormal(renderer) {
  const t = canvasTex(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    const r = rnd(8);
    const hgt = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) hgt[i] = r();
    for (let k = 0; k < 2; k++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      hgt[i] = (hgt[i] * 2 + hgt[y * w + ((x + 1) % w)] + hgt[((y + 1) % h) * w + x]) / 4;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dx = hgt[y * w + ((x + 1) % w)] - hgt[y * w + ((x - 1 + w) % w)];
      const dy = hgt[((y + 1) % h) * w + x] - hgt[((y - 1 + h) % h) * w + x];
      img.data[i * 4] = 128 + dx * 220; img.data[i * 4 + 1] = 128 + dy * 220; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, renderer, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

async function loadTex(url, renderer) {
  const t = await new THREE.TextureLoader().loadAsync(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* ================= Tabla ================= */
function boardGeometry(T = BOARD.T, ch = BOARD.chamfer, inset = 0, N = 200, M = 16) {
  const { half, wTip } = BOARD;
  const halfWidth = (x) => Math.max(0, hwFn(x) - inset);
  const pos = [], uv = [], idx = [], groups = [];
  const v = (x, y, z, a, b) => { pos.push(x, y, z); uv.push(a, b); };
  const xs = [];
  for (let i = 0; i <= N; i++) { const s = -1 + 2 * i / N; xs.push(half * Math.sign(s) * Math.pow(Math.abs(s), 0.8)); }
  for (const top of [true, false]) {
    const base = pos.length / 3, start = idx.length;
    for (let i = 0; i <= N; i++) {
      const x = xs[i], hw = halfWidth(x), w = top ? Math.max(0, hw - ch) : hw;
      const y = lift(x) + (top ? T / 2 : -T / 2);
      for (let j = 0; j <= M; j++) {
        const z = (-1 + 2 * j / M) * w;
        v(x, y, z, (x + half) / (2 * half), top ? 0.5 - z / (2 * wTip) : 0.5 + z / (2 * wTip));
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = base + i * (M + 1) + j, b = a + M + 1, c = b + 1, d = a + 1;
      if (top) idx.push(a, d, b, d, c, b); else idx.push(a, b, d, d, b, c);
    }
    groups.push([start, idx.length - start, top ? 0 : 1]);
  }
  // Cantos con chaflán (se ven redondeados)
  const start = idx.length;
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const x = xs[i], hw = halfWidth(x), l = lift(x);
      v(x, l + T / 2, s * Math.max(0, hw - ch), i / N, 1);
      v(x, l + T / 2 - ch * 0.8, s * hw, i / N, 0.82);
      v(x, l - T / 2, s * hw, i / N, 0);
    }
    for (let i = 0; i < N; i++) for (let r = 0; r < 2; r++) {
      const A = base + i * 3 + r, D = A + 1, B = A + 3, C = A + 4;
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
  for (let i = 0; i <= 80; i++) { const x = -0.74 + 1.48 * i / 80; pts.push(new THREE.Vector3(x, lift(x) - BOARD.T * 0.2, side * (halfWidth(x) + 0.004))); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.008, 6, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
}


/* ================= Capas de la tabla (vista despiezada) ================= */
function woodTex(renderer) {
  return canvasTex(1024, 128, (g, w, h) => {
    const r = rnd(12);
    g.fillStyle = '#d9b98a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 1) {
      const n = Math.sin(y * 0.35) * 0.5 + Math.sin(y * 0.11 + 2) * 0.5;
      g.fillStyle = `rgba(${150 + n * 30},${110 + n * 20},${60 + n * 10},${0.25 + r() * 0.2})`; g.fillRect(0, y, w, 1);
    }
    // listones
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(120,80,40,.18)' : 'rgba(255,240,210,.12)'; g.fillRect(0, (i / 9) * h, w, h / 9); }
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(110,70,35,${r() * 0.25})`; g.lineWidth = 1; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + r() * 6 - 3, w * 0.6, y + r() * 6 - 3, w, y + r() * 4 - 2); g.stroke(); }
  }, renderer);
}
function weaveTex(renderer) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2;
    for (let i = -w; i < w * 2; i += 10) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < w; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, renderer);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 2);
  return t;
}
function outline(y, offset, segs = 220) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = i / segs, x = -BOARD.half + a * 2 * BOARD.half;
    pts.push(new THREE.Vector3(x, lift(x) + y, hwFn(x) + offset));
  }
  for (let i = segs; i >= 0; i--) {
    const a = i / segs, x = -BOARD.half + a * 2 * BOARD.half;
    pts.push(new THREE.Vector3(x, lift(x) + y, -hwFn(x) - offset));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}
export function buildLayers(mats, renderer) {
  const g = new THREE.Group();
  const plain = (c, extra = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, ...extra });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe7ef, map: weaveTex(renderer), roughness: 0.25, transparent: true, opacity: 0.55, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const wood = new THREE.MeshStandardMaterial({ map: woodTex(renderer), roughness: 0.7 });
  const inner = plain(0x1b1c20);
  const L = [
    { key: 'top', geo: boardGeometry(0.004, 0.0015), mats: [mats.top, plain(0xf2f2f2), mats.side], y: 0.5 },
    { key: 'glass1', geo: boardGeometry(0.002, 0, 0.002, 160, 8), mats: [glass, glass, glass], y: 0.3 },
    { key: 'core', geo: boardGeometry(0.012, 0, 0.008, 160, 10), mats: [wood, wood, wood], y: 0.1 },
    { key: 'glass2', geo: boardGeometry(0.002, 0, 0.002, 160, 8), mats: [glass, glass, glass], y: -0.1 },
    { key: 'base', geo: boardGeometry(0.004, 0), mats: [inner, mats.base, inner], y: -0.3 },
  ];
  for (const l of L) {
    const m = new THREE.Mesh(l.geo, l.mats);
    m.castShadow = true; m.userData.y = l.y;
    g.add(m); l.mesh = m;
  }
  const edge = new THREE.Mesh(new THREE.TubeGeometry(outline(-0.008, 0.0015), 440, 0.004, 6, true), new THREE.MeshStandardMaterial({ color: 0xd3d8df, metalness: 1, roughness: 0.2 }));
  edge.userData.y = -0.48; g.add(edge);
  L.push({ key: 'edge', mesh: edge });
  const anchors = {};
  for (const l of L) { const a = new THREE.Object3D(); a.position.set(BOARD.half * 0.62, lift(0.5), hwFn(0.5)); l.mesh.add(a); anchors[l.key] = a; }
  g.visible = false;
  g.userData.layers = L; g.userData.anchors = anchors;
  g.userData.set = (e) => {
    g.visible = e > 0.003;
    for (const l of L) { l.mesh.position.y = l.mesh.userData.y * e; l.mesh.rotation.x = 0; }
  };
  return g;
}

/* ================= Fijación ================= */
// Cinta plana a lo largo de una curva (straps acolchados)
function ribbon(points, width, thick, mat, segs = 32) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const K = 10, pos = [], idx = [];
  const side = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPoint(t), T = curve.getTangent(t);
    const N = new THREE.Vector3().crossVectors(T, side).normalize();
    for (let k = 0; k < K; k++) {
      const a = (k / K) * Math.PI * 2;
      const q = p.clone().addScaledVector(side, Math.cos(a) * width / 2).addScaledVector(N, Math.sin(a) * thick / 2);
      pos.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < segs; i++) for (let k = 0; k < K; k++) {
    const a = i * K + k, b = i * K + (k + 1) % K, c = a + K, d = b + K;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
// Highback: concha curvada con el borde de arriba redondeado
function highbackGeo() {
  const R0 = 0.06, R1 = 0.052, H = 0.235, A = Math.PI - 0.3, S = 28, V = 10;
  const pos = [], idx = [];
  for (let j = 0; j <= V; j++) for (let i = 0; i <= S; i++) {
    const u = i / S, th = Math.PI / 2 + 0.15 + u * A;
    const k = (u - 0.5) * 2;
    const hmax = H * (1 - 0.42 * k * k * k * k - 0.1 * k * k);
    const y = (j / V) * hmax;
    const r = R0 + (R1 - R0) * (y / H);
    pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
  }
  for (let j = 0; j < V; j++) for (let i = 0; i < S; i++) {
    const a = j * (S + 1) + i, b = a + 1, c = a + S + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
function makeBinding(M) {
  const g = new THREE.Group();
  const parts = {};
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.008, 48), M.disc);
  disc.position.y = 0.004;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 12), M.detail);
    screw.position.set(Math.cos(a) * 0.035, 0.006, Math.sin(a) * 0.035);
    disc.add(screw); (parts.screws ||= []).push(screw);
  }
  g.add(disc); parts.disc = disc;

  const frame = new THREE.Group(); g.add(frame); parts.frame = frame;
  const s = new THREE.Shape();
  const W = 0.054, L = 0.13, r = 0.04;
  s.moveTo(-W + r, -L); s.lineTo(W - r, -L); s.quadraticCurveTo(W, -L, W, -L + r);
  s.lineTo(W, L - r); s.quadraticCurveTo(W, L, W - r, L); s.lineTo(-W + r, L);
  s.quadraticCurveTo(-W, L, -W, L - r); s.lineTo(-W, -L + r); s.quadraticCurveTo(-W, -L, -W + r, -L);
  const plateGeo = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 10 });
  plateGeo.rotateX(Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, M.frame); plate.position.y = 0.024; frame.add(plate);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.2), M.pad); pad.position.set(0, 0.028, 0.005); frame.add(pad);

  const side = new THREE.Shape();
  side.moveTo(-0.125, 0); side.lineTo(0.085, 0); side.lineTo(0.085, 0.015);
  side.bezierCurveTo(0.02, 0.022, -0.04, 0.05, -0.085, 0.08); side.lineTo(-0.125, 0.082); side.closePath();
  const sideGeo = new THREE.ExtrudeGeometry(side, { depth: 0.007, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 });
  sideGeo.rotateY(-Math.PI / 2);
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(sideGeo, M.frame); m.position.set(sx * 0.056 + (sx > 0 ? 0.007 : 0), 0.02, 0); frame.add(m); }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.075, 28, 1, true, Math.PI / 2, Math.PI), M.frame);
  cup.position.set(0, 0.06, -0.105); frame.add(cup);
  // Logo redondo lateral
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 8, 24), M.detail);
    ring.position.set(sx * 0.066, 0.055, -0.05); ring.rotation.y = Math.PI / 2; frame.add(ring);
  }

  const hb = new THREE.Group();
  const shell = new THREE.Mesh(highbackGeo(), M.high); hb.add(shell);
  for (let i = -1; i <= 1; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.11, 0.004), M.accent);
    const a = Math.PI + i * 0.32;
    slot.position.set(Math.sin(a) * 0.058, 0.13, Math.cos(a) * 0.058); slot.rotation.y = a;
    hb.add(slot);
  }
  hb.position.set(0, 0.06, -0.06);
  hb.rotation.x = -0.22;
  g.add(hb); parts.highback = hb;

  const ankle = new THREE.Group();
  ankle.add(ribbon([[-0.058, 0, 0], [-0.052, 0.055, 0.012], [-0.02, 0.088, 0.02], [0.02, 0.088, 0.02], [0.052, 0.055, 0.012], [0.058, 0, 0]], 0.05, 0.014, M.strap));
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.045, 0.024), M.detail);
  buckle.position.set(0.06, 0.03, 0.006); buckle.rotation.z = -0.35; ankle.add(buckle);
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.014), M.frame);
  ladder.position.set(-0.06, 0.02, 0.0); ankle.add(ladder);
  ankle.position.set(0, 0.075, -0.045);
  g.add(ankle); parts.ankle = ankle;

  const toe = new THREE.Group();
  toe.add(ribbon([[-0.054, 0, 0], [-0.046, 0.035, 0.008], [0, 0.052, 0.012], [0.046, 0.035, 0.008], [0.054, 0, 0]], 0.032, 0.01, M.strap));
  toe.position.set(0, 0.035, 0.088);
  g.add(toe); parts.toe = toe;

  const boot = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.2, 8, 18), M.boot);
  sole.rotation.x = Math.PI / 2; sole.scale.set(1, 1, 0.74); sole.position.set(0, 0.064, 0.005); boot.add(sole);
  const outsole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.29), M.bootDark); outsole.position.set(0, 0.032, 0.005); boot.add(outsole);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.06, 0.19, 20), M.boot);
  shaft.position.set(0, 0.155, -0.07); shaft.rotation.x = 0.15; boot.add(shaft);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.013, 10, 24), M.bootAccent);
  collar.rotation.x = Math.PI / 2 + 0.15; collar.position.set(0, 0.245, -0.084); boot.add(collar);
  const lace = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.012, 0.11), M.bootDark);
  lace.position.set(0, 0.108, 0.035); lace.rotation.x = -0.25; boot.add(lace);
  g.add(boot); parts.boot = boot;

  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  parts.aHighback = anchor(hb, 0, 0.21, -0.03);
  parts.aAnkle = anchor(ankle, 0, 0.09, 0.03);
  parts.aToe = anchor(toe, 0, 0.055, 0.02);
  parts.aDisc = anchor(disc, 0.062, 0.004, 0.02);
  parts.aAnkleBone = anchor(g, 0, 0.145, -0.05);
  parts.aFoot = anchor(g, 0, 0.12, 0.04);
  g.userData.parts = parts;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

/* ================= Rider ================= */
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
function seg(r, len, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); m.castShadow = true; return m; }
function placeSeg(mesh, a, b) {
  const d = tmpV.subVectors(b, a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}
function place(mesh, a, b) {
  const d = tmpV.subVectors(b, a); const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5); mesh.scale.set(1, len, 1);
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
const LEN = { THIGH: 0.44, SHIN: 0.44, UPPER: 0.28, FORE: 0.26 };

function makeRider() {
  const M = {
    jacket: new THREE.MeshStandardMaterial({ color: 0xe5233d, roughness: 0.7 }),
    jacketDark: new THREE.MeshStandardMaterial({ color: 0x7c0f1d, roughness: 0.75 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x18191e, roughness: 0.85 }),
    helmet: new THREE.MeshPhysicalMaterial({ color: 0xf2f3f5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.65 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, emissive: 0x6a2200, emissiveIntensity: 0.4, roughness: 0.05, metalness: 0.9, clearcoat: 1, side: THREE.DoubleSide }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  };
  const g = new THREE.Group();
  const P = {};
  P.thighL = seg(0.082, LEN.THIGH, M.pants); P.thighR = seg(0.082, LEN.THIGH, M.pants);
  P.shinL = seg(0.072, LEN.SHIN, M.pants); P.shinR = seg(0.072, LEN.SHIN, M.pants);
  P.upperL = seg(0.06, LEN.UPPER, M.jacket); P.upperR = seg(0.06, LEN.UPPER, M.jacket);
  P.foreL = seg(0.055, LEN.FORE, M.jacket); P.foreR = seg(0.055, LEN.FORE, M.jacket);
  const cyl = (r1, r2, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 1, 18), m); c.castShadow = true; return c; };
  P.cuffL = cyl(0.08, 0.084, M.pants); P.cuffR = cyl(0.08, 0.084, M.pants);
  P.wristL = cyl(0.058, 0.058, M.jacketDark); P.wristR = cyl(0.058, 0.058, M.jacketDark);
  for (const k in P) g.add(P[k]);
  const ball = (r, m, sx = 1, sy = 1, sz = 1) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); s.scale.set(sx, sy, sz); s.castShadow = true; g.add(s); return s; };
  P.hipL = ball(0.086, M.pants); P.hipR = ball(0.086, M.pants);
  P.shL = ball(0.074, M.jacket); P.shR = ball(0.074, M.jacket);
  P.handL = ball(0.056, M.black, 1, 0.8, 1.3); P.handR = ball(0.056, M.black, 1, 0.8, 1.3);
  P.pelvis = ball(0.135, M.pants, 1.22, 0.78, 0.95);
  // rodilleras / pliegues
  P.kneeL = ball(0.084, M.pants); P.kneeR = ball(0.084, M.pants);

  const prof = [[0.0, 0], [0.158, 0.0], [0.17, 0.05], [0.164, 0.14], [0.176, 0.26], [0.186, 0.36], [0.164, 0.43], [0.1, 0.47], [0.05, 0.48], [0.0, 0.48]].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), M.jacket); body.scale.set(1, 1, 0.74); body.castShadow = true; torso.add(body);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 10, 32), M.jacketDark); hem.rotation.x = Math.PI / 2; hem.scale.set(1, 0.74, 1); hem.position.y = 0.02; torso.add(hem);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), M.black); zip.position.set(0, 0.24, 0.13); zip.rotation.x = -0.04; torso.add(zip);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.185, 0.03, 32, 1, true), M.stripe); stripe.scale.set(1, 1, 0.75); stripe.position.y = 0.3; torso.add(stripe);
  for (const sx of [-1, 1]) { const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.01), M.jacketDark); pocket.position.set(sx * 0.08, 0.12, 0.122); pocket.rotation.y = sx * 0.35; torso.add(pocket); }
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.07, 24, 1, true), M.jacket); collar.material = M.jacket; collar.position.y = 0.49; torso.add(collar);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.jacketDark); hood.position.set(0, 0.44, -0.075); hood.rotation.x = -0.55; hood.scale.set(1.2, 0.7, 0.9); torso.add(hood);
  const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 14), M.black); pack.position.set(0, 0.26, -0.165); pack.scale.set(1.15, 1, 0.55); pack.castShadow = true; torso.add(pack);
  g.add(torso); P.torso = torso;

  const head = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.1, 18), M.black); neck.position.y = -0.1; head.add(neck);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.102, 24, 16), M.black); face.position.y = -0.02; head.add(face);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.124, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), M.helmet); helmet.scale.set(1, 1.05, 1.1); helmet.castShadow = true; head.add(helmet);
  for (let i = -1; i <= 1; i++) { const vent = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.09), M.black); vent.position.set(i * 0.035, 0.125, -0.01); head.add(vent); }
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.123, 0.012, 8, 36), M.jacket); strap.rotation.x = Math.PI / 2; strap.position.y = -0.005; strap.scale.set(1, 1.1, 1); head.add(strap);
  const frameM = M.black.clone(); frameM.side = THREE.DoubleSide;
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.072, 32, 1, true, -1.15, 2.3), frameM); frame.position.y = -0.005; head.add(frame);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.131, 0.131, 0.052, 32, 1, true, -1.0, 2.0), M.lens); lens.position.y = -0.005; head.add(lens);
  g.add(head); P.head = head;

  P.aKnee = new THREE.Object3D(); P.aHip = new THREE.Object3D(); P.aShoulder = new THREE.Object3D(); P.aHead = new THREE.Object3D();
  g.add(P.aKnee, P.aHip, P.aShoulder, P.aHead);
  g.userData.P = P; g.userData.M = M; g.userData.strap = strap;
  return g;
}

const _v = {};
for (const k of ['hip', 'hipL', 'hipR', 'kL', 'kR', 'chest', 'shL', 'shR', 'eL', 'eR', 'hL', 'hR', 'side', 't', 'cL', 'cR', 'g']) _v[k] = new THREE.Vector3();
const hintL = new THREE.Vector3(0.25, 0, 1).normalize(), hintR = new THREE.Vector3(-0.25, 0, 1).normalize();
const aHintL = new THREE.Vector3(0.3, -0.2, -0.6), aHintR = new THREE.Vector3(-0.3, -0.2, -0.6);

/** footL / footR en espacio del rider. o = { crouch, shiftX, shiftZ, lookYaw, arms, twist, grab, flail } */
export function poseRider(rider, footL, footR, o) {
  const P = rider.userData.P, V = _v;
  const midX = (footL.x + footR.x) / 2, midZ = (footL.z + footR.z) / 2, footY = (footL.y + footR.y) / 2;
  const crouch = Math.min(1.15, o.crouch + (o.grab || 0) * 0.45);
  V.hip.set(midX + o.shiftX, footY + 0.84 - crouch * 0.34, midZ - 0.05 - crouch * 0.07 + o.shiftZ);
  const tw = o.twist || 0;
  V.side.set(Math.cos(tw), 0, -Math.sin(tw));
  V.hipL.copy(V.hip).addScaledVector(V.side, 0.1);
  V.hipR.copy(V.hip).addScaledVector(V.side, -0.1);
  ik(V.hipL, footL, LEN.THIGH, LEN.SHIN, hintL, V.kL);
  ik(V.hipR, footR, LEN.THIGH, LEN.SHIN, hintR, V.kR);
  placeSeg(P.thighL, V.hipL, V.kL); placeSeg(P.shinL, V.kL, footL);
  placeSeg(P.thighR, V.hipR, V.kR); placeSeg(P.shinR, V.kR, footR);
  V.cL.copy(V.kL).sub(footL).normalize().multiplyScalar(0.09).add(footL); place(P.cuffL, footL, V.cL);
  V.cR.copy(V.kR).sub(footR).normalize().multiplyScalar(0.09).add(footR); place(P.cuffR, footR, V.cR);
  P.kneeL.position.copy(V.kL); P.kneeR.position.copy(V.kR);
  P.hipL.position.copy(V.hipL); P.hipR.position.copy(V.hipR);
  P.pelvis.position.copy(V.hip).add(V.t.set(0, 0.04, 0)); P.pelvis.rotation.set(0, tw, 0);

  const lean = 0.06 + crouch * 0.13;
  V.chest.copy(V.hip).add(V.t.set(o.shiftX * 0.5, 0.44 - crouch * 0.05, lean + o.shiftZ * 0.6));
  const tdir = new THREE.Vector3().subVectors(V.chest, V.hip);
  const tlen = tdir.length();
  P.torso.position.copy(V.hip).add(V.t.set(0, 0.03, 0));
  P.torso.quaternion.setFromUnitVectors(UP, tdir.normalize());
  P.torso.rotateY(tw);
  P.torso.scale.set(1, tlen / 0.46, 1);
  P.head.position.copy(V.chest).add(V.t.set(0, 0.2, 0.015));
  P.head.rotation.set(0.05 + (o.grab || 0) * 0.3, o.lookYaw || 0, 0);

  V.shL.copy(V.chest).addScaledVector(V.side, 0.2).add(V.t.set(0, -0.05, 0));
  V.shR.copy(V.chest).addScaledVector(V.side, -0.2).add(V.t.set(0, -0.05, 0));
  P.shL.position.copy(V.shL); P.shR.position.copy(V.shR);
  const arms = o.arms ?? 0.4, fl = o.flail || 0;
  V.hL.copy(V.shL).addScaledVector(V.side, 0.15 + arms * 0.17).add(V.t.set(0, -0.36 + arms * 0.13 + fl * 0.5, 0.13));
  V.hR.copy(V.shR).addScaledVector(V.side, -0.15 - arms * 0.17).add(V.t.set(0, -0.36 + arms * 0.13 + fl * 0.4, 0.13));
  if (o.grab) { // mano de atrás al canto de puntas (indy)
    V.g.set(midX, footY + 0.06, midZ + 0.16);
    const back = (o.dir || 1) > 0 ? V.hR : V.hL;
    back.lerp(V.g, Math.min(1, o.grab));
  }
  ik(V.shL, V.hL, LEN.UPPER, LEN.FORE, aHintL, V.eL);
  ik(V.shR, V.hR, LEN.UPPER, LEN.FORE, aHintR, V.eR);
  placeSeg(P.upperL, V.shL, V.eL); placeSeg(P.foreL, V.eL, V.hL);
  placeSeg(P.upperR, V.shR, V.eR); placeSeg(P.foreR, V.eR, V.hR);
  place(P.wristL, V.t.copy(V.eL).lerp(V.hL, 0.8), V.hL);
  place(P.wristR, V.g.copy(V.eR).lerp(V.hR, 0.8), V.hR);
  P.handL.position.copy(V.hL); P.handR.position.copy(V.hR);
  P.handL.quaternion.copy(P.foreL.quaternion); P.handR.quaternion.copy(P.foreR.quaternion);
  P.aKnee.position.copy(V.kL); P.aHip.position.copy(V.hip); P.aShoulder.position.copy(V.shR);
  P.aHead.position.copy(P.head.position).add(V.t.set(0, 0.1, 0));
}

/* ================= Mundo ================= */
export async function buildWorld(renderer) {
  const scene = new THREE.Scene();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#07080b') }, bottom: { value: new THREE.Color('#25272f') }, sun: { value: 0 }, glow: { value: new THREE.Color('#e5233d') }, glowAmt: { value: 0.0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float sun; uniform vec3 glow; uniform float glowAmt; varying vec3 vP;
      void main(){
        float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(bottom, top, smoothstep(0.42, 0.95, h));
        float sg = pow(max(0.0, dot(normalize(vP), normalize(vec3(-0.4, 0.35, 1.0)))), 16.0) * sun;
        c += vec3(1.0, 0.86, 0.62) * sg * 0.55;
        float halo = pow(max(0.0, 1.0 - abs(vP.y + 0.05) * 2.2), 3.0) * glowAmt;
        c += glow * halo * 0.18;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.Fog('#25272f', 14, 60);

  const hemi = new THREE.HemisphereLight(0xf3f6ff, 0x2a2d36, 0.65);
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(2.2, 4.5, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 14 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key.target);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(-3, 1.8, -3);
  const warm = new THREE.PointLight(0xe5233d, 1.6, 6, 1.6); warm.position.set(1.2, -1.2, 1.0);
  const fill = new THREE.DirectionalLight(0xc8d6ff, 0.55); fill.position.set(3, 1, 3);
  scene.add(hemi, key, rim, warm, fill);

  const [dTop, dBase, sTop, sBase, bgTex, snowD, snowNm, snowR] = await Promise.all([
    ...['drake-top', 'drake-base', 'snake-top', 'snake-base'].map((n) => loadTex(`assets/${n}.jpg`, renderer)),
    loadTex('assets/env/mountain-bg.jpg', renderer),
    loadTex('assets/snow/snow_diff.jpg', renderer), loadTex('assets/snow/snow_nor_gl.jpg', renderer), loadTex('assets/snow/snow_rough.jpg', renderer),
  ]);
  snowNm.colorSpace = THREE.NoColorSpace; snowR.colorSpace = THREE.NoColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rgbe = new RGBELoader();
  const [hdrStudio, hdrMountain] = await Promise.all([rgbe.loadAsync('assets/env/studio.hdr'), rgbe.loadAsync('assets/env/mountain.hdr')]);
  const envStudio = pmrem.fromEquirectangular(hdrStudio).texture;
  const envMountain = pmrem.fromEquirectangular(hdrMountain).texture;
  hdrStudio.dispose(); hdrMountain.dispose();
  // Fondo real (montaña nevada) en una esfera que aparece en las escenas de pista
  bgTex.wrapS = THREE.RepeatWrapping; bgTex.repeat.x = -1;
  const bgSphere = new THREE.Mesh(new THREE.SphereGeometry(500, 64, 32), new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }));
  bgSphere.renderOrder = -9; bgSphere.rotation.y = 0.6;
  scene.add(bgSphere);
  const pbr = (t, rep) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rep[0], rep[1]); return c; };
  const skins = {
    drake: { top: dTop, base: dBase, side: sideTex(THEMES.drake.side, renderer) },
    snake: { top: sTop, base: sBase, side: sideTex(THEMES.snake.side, renderer) },
  };
  const grain = grainNormal(renderer); grain.repeat.set(10, 2);
  const mats = {
    top: new THREE.MeshPhysicalMaterial({ map: dTop, color: 0xe9e9e9, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.12, normalMap: grain, normalScale: new THREE.Vector2(0.05, 0.05), envMapIntensity: 0.32 }),
    base: new THREE.MeshPhysicalMaterial({ map: dBase, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.7 }),
    side: new THREE.MeshStandardMaterial({ map: skins.drake.side, roughness: 0.3, metalness: 0.45 }),
    frame: new THREE.MeshPhysicalMaterial({ color: 0x17181c, roughness: 0.45, clearcoat: 0.3, side: THREE.DoubleSide }),
    high: new THREE.MeshPhysicalMaterial({ color: 0x111215, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    strap: new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.8 }),
    pad: new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.9 }),
    detail: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.25, metalness: 0.9 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.5 }),
    disc: new THREE.MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.35, metalness: 0.6 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x24272e, roughness: 0.62, transparent: true }),
    bootDark: new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.7, transparent: true }),
    bootAccent: new THREE.MeshStandardMaterial({ color: 0xe5233d, roughness: 0.5, transparent: true }),
  };

  const rig = new THREE.Group(); rig.rotation.order = 'YXZ'; scene.add(rig);
  const boardGroup = new THREE.Group(); boardGroup.rotation.order = 'YXZ'; rig.add(boardGroup);
  const board = new THREE.Mesh(boardGeometry(), [mats.top, mats.base, mats.side]);
  board.castShadow = true; board.receiveShadow = true;
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
  const addA = (name, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); boardGroup.add(o); anchors[name] = o; };
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
  arrowShape.moveTo(0, 0.07); arrowShape.lineTo(0.32, 0.07); arrowShape.lineTo(0.32, 0.15); arrowShape.lineTo(0.5, 0);
  arrowShape.lineTo(0.32, -0.15); arrowShape.lineTo(0.32, -0.07); arrowShape.lineTo(0, -0.07);
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
  arrow.rotation.x = -Math.PI / 2; rig.add(arrow);
  const tip = new THREE.Object3D(); tip.position.set(0.5, 0, 0); arrow.add(tip); arrow.userData.tip = tip;

  // Suelo invisible que solo recibe la sombra (estudio)
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.32 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.62; catcher.receiveShadow = true;
  scene.add(catcher);

  // Pista de prácticas
  const slope = new THREE.Group(); scene.add(slope);
  const snowMap = pbr(snowD, [24, 24]), snowN = pbr(snowNm, [24, 24]), snowRough = pbr(snowR, [24, 24]);
  const fade = radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'); fade.colorSpace = THREE.NoColorSpace;
  const fadeCv = document.createElement('canvas'); fadeCv.width = fadeCv.height = 256;
  { const g = fadeCv.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  const fadeTex = new THREE.CanvasTexture(fadeCv);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: snowMap, normalMap: snowN, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: snowRough, roughness: 1, alphaMap: fadeTex, transparent: true, opacity: 0, depthWrite: false });
  // suelo que se funde con la nieve del cielo real
  const ground = new THREE.Mesh(new THREE.CircleGeometry(45, 96), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = 10; ground.receiveShadow = true;
  slope.add(ground);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1f3b36, roughness: 0.9, transparent: true, opacity: 0, flatShading: true });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.8, transparent: true, opacity: 0, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9, transparent: true, opacity: 0 });
  const trees = [];
  const tr = rnd(21);
  for (let i = 0; i < 46; i++) {
    const t = new THREE.Group();
    const h = 1.2 + tr() * 1.6;
    for (let k = 0; k < 3; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55 - k * 0.13, h * 0.5, 7), k === 2 ? capMat : treeMat); cone.position.y = h * 0.3 + k * h * 0.22; t.add(cone); }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), trunkMat); trunk.position.y = 0.15; t.add(trunk);
    const s = i % 2 ? 1 : -1;
    t.position.set(s * (3.2 + tr() * 9), 0, -6 + tr() * 46); t.scale.setScalar(0.8 + tr() * 0.7);
    t.visible = false; trees.push(t);
  }
  const TRAIL = 220;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 6), 3));
  const tIdx = []; for (let i = 0; i < TRAIL - 1; i++) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  trailGeo.setIndex(tIdx);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xa9b6cc, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const trail = new THREE.Mesh(trailGeo, trailMat); trail.frustumCulled = false; trail.position.y = 0.003; slope.add(trail);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: radialTex('rgba(10,14,30,0.6)', 'rgba(10,14,30,0)'), transparent: true, depthWrite: false, opacity: 0 }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  const FLAKES = 1400;
  const fpos = new Float32Array(FLAKES * 3), fspd = new Float32Array(FLAKES);
  const fr = rnd(9);
  for (let i = 0; i < FLAKES; i++) { fpos[i * 3] = (fr() - 0.5) * 18; fpos[i * 3 + 1] = fr() * 9 - 2; fpos[i * 3 + 2] = (fr() - 0.5) * 18; fspd[i] = 0.25 + fr() * 0.5; }
  const flakeGeo = new THREE.BufferGeometry(); flakeGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ size: 0.04, map: radialTex(), transparent: true, depthWrite: false, opacity: 0.8 }));
  flakes.userData.speed = fspd; flakes.frustumCulled = false; scene.add(flakes);

  const ring = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3; const o = new THREE.Object3D(); o.position.set(Math.cos(a) * 1.05, Math.sin(a) * 0.62, 0.2); scene.add(o); ring.push(o); }

  const RM = rider.userData.M;
  function setSkin(name) {
    const th = THEMES[name] || THEMES.drake, s = skins[name] || skins.drake;
    mats.top.map = s.top; mats.base.map = s.base; mats.side.map = s.side;
    const b = th.binding;
    mats.frame.color.setHex(b.frame); mats.high.color.setHex(b.high); mats.strap.color.setHex(b.strap);
    mats.detail.color.setHex(b.detail); mats.accent.color.setHex(b.accent); mats.pad.color.setHex(b.pad);
    mats.bootAccent.color.setHex(th.accent);
    const r = th.rider;
    RM.jacket.color.setHex(r.jacket); RM.jacketDark.color.setHex(r.jacketDark); RM.pants.color.setHex(r.pants);
    RM.stripe.color.setHex(r.stripe); RM.lens.color.setHex(r.lens); RM.helmet.color.setHex(r.helmet);
    rider.userData.strap.material = name === 'snake' ? RM.stripe : RM.jacket;
    toeEdge.material.color.setHex(th.accent); glowR.material.color.setHex(th.accent); arrow.material.color.setHex(th.accent);
    warm.color.setHex(th.accent);
    skyMat.uniforms.glow.value.setHex(th.accent);
  }

  return {
    scene, sky, skyMat, bgSphere, envStudio, envMountain, snowTextures: { snowD, snowNm, snowR }, layers: buildLayers(mats, renderer), hemi, key, rim, warm, fill, rig, boardGroup, board, bindL, bindR, glowL, glowR,
    heelEdge, toeEdge, anchors, rider, arrow, slope, ground, groundMat, snowMap, snowN, trees, catcher,
    treeMats: [treeMat, capMat, trunkMat], trail, trailMat, TRAIL, shadow, flakes, mats, ring, setSkin,
  };
}

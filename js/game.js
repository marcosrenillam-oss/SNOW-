// La bajada: pista roja estilo Formigal con snowpark (kickers y cajones).
// Pedales → giras. Mantén SALTAR para cargar y suelta para saltar. En el aire: pedales = giras sobre ti mismo, SALTAR = grab.
import * as THREE from 'three';
import { radialTex, snowNormal } from './world.js';

export const RUN = 900;
export const centerX = (z) => 14 * Math.sin(z / 70) + 7 * Math.sin(z / 27 + 1);
export const pisteW = (z) => 24 + 6 * Math.sin(z / 110);
export const baseY = (z) => -z * 0.27 - 5 * Math.sin(z / 150);
export function H(x, z) {
  const c = centerX(z), w = pisteW(z);
  const d = Math.abs(x - c) - w / 2;
  let y = baseY(z) + 0.12 * Math.sin(x / 5.1) * Math.sin(z / 7.3);
  if (d > 0) y += d * 0.34 + d * d * 0.006 + Math.sin(x * 0.21 + z * 0.13) * Math.min(d, 20) * 0.04;
  return y;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Snowpark
const KICKERS = [
  { z: 215, off: 0, len: 7, h: 1.5, w: 6 },
  { z: 330, off: -5, len: 8, h: 1.9, w: 6.5 },
  { z: 455, off: 4, len: 9, h: 2.3, w: 7 },
  { z: 640, off: -2, len: 7, h: 1.6, w: 6 },
];
const BOXES = [
  { z: 270, off: 6, len: 9, top: 0.55 },
  { z: 390, off: -6, len: 10, top: 0.6 },
  { z: 520, off: 0, len: 11, top: 0.6 },
  { z: 700, off: 5, len: 9, top: 0.55 },
];
for (const k of KICKERS) k.x = centerX(k.z) + k.off;
for (const b of BOXES) b.x = centerX(b.z) + b.off;

function kickerH(x, z) {
  for (const k of KICKERS) {
    const u = (z - k.z) / k.len;
    if (u < 0 || u > 1) continue;
    const side = clamp((k.w / 2 + 0.8 - Math.abs(x - k.x)) / 0.8, 0, 1);
    if (side <= 0) continue;
    return k.h * u * u * sstep(0, 1, side);
  }
  return 0;
}
export const G = (x, z) => H(x, z) + kickerH(x, z);

function bannerTex(text, bg) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 160);
  g.fillStyle = '#fff'; g.font = '800 84px "Inter Tight", "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 86);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 0, 1024, 8); g.fillRect(0, 152, 1024, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}


// Pino realista: pisos de ramas caídas, con nieve en las caras de arriba
function pineGeometry(seed) {
  const r = rnd(seed);
  const pos = [], col = [];
  const green = [new THREE.Color('#1b3029'), new THREE.Color('#223a31'), new THREE.Color('#2b4436')], snowC = new THREE.Color('#eef3f8'), bark = new THREE.Color('#3b2c22');
  const tri = (a, b, c, color) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b); };
  const H = 5.2, tiers = 8;
  for (let t = 0; t < tiers; t++) {
    const u = t / (tiers - 1);
    const y0 = 0.7 + u * (H - 1.2), rad = 1.7 * (1 - u * 0.86) + 0.15, drop = 0.55 + (1 - u) * 0.35;
    const seg = 11;
    const ring = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2 + r() * 0.3;
      const rr = rad * (0.78 + r() * 0.4);
      ring.push([Math.cos(a) * rr, y0 - drop * (0.8 + r() * 0.4), Math.sin(a) * rr, a]);
    }
    const apex = [0, y0 + 0.55 + (1 - u) * 0.2, 0];
    for (let i = 0; i < seg; i++) {
      const A = ring[i], B = ring[(i + 1) % seg];
      // punta intermedia (rama) entre A y B
      const am = (A[3] + B[3]) / 2 + (B[3] < A[3] ? Math.PI : 0);
      const M = [Math.cos(am) * rad * 0.62, (A[1] + B[1]) / 2 + 0.18, Math.sin(am) * rad * 0.62];
      const g = green[Math.floor(r() * 3)];
      tri(apex, [B[0], B[1], B[2]], [A[0], A[1], A[2]], g);
      tri([A[0], A[1], A[2]], [B[0], B[1], B[2]], M, g);
    }
  }
  // tronco
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2, R0 = 0.16, R1 = 0.1;
    const p0 = [Math.cos(a0) * R0, 0, Math.sin(a0) * R0], p1 = [Math.cos(a1) * R0, 0, Math.sin(a1) * R0];
    const q0 = [Math.cos(a0) * R1, 1.4, Math.sin(a0) * R1], q1 = [Math.cos(a1) * R1, 1.4, Math.sin(a1) * R1];
    tri(p0, q0, p1, bark); tri(p1, q0, q1, bark);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  // nieve en las caras que miran arriba
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i += 3) {
    const ny = (n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3;
    const y = pos[i * 3 + 1];
    if (y > 0.5 && ny > 0.45 + r() * 0.25) for (let k = 0; k < 3; k++) { col[(i + k) * 3] = snowC.r; col[(i + k) * 3 + 1] = snowC.g; col[(i + k) * 3 + 2] = snowC.b; }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

function buildMountain(W, renderer) {
  const group = new THREE.Group();
  const r = rnd(42);
  const LEN = RUN + 260, WID = 280;
  const geo = new THREE.PlaneGeometry(WID, LEN, 160, 600);
  geo.rotateX(-Math.PI / 2); geo.translate(0, 0, LEN / 2 - 120);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  const cWhite = new THREE.Color('#f7f9fc'), cEdge = new THREE.Color('#e6ecf5'), cOff = new THREE.Color('#d9e3f0'), cRock = new THREE.Color('#6c7380'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, H(x, z));
    const d = Math.abs(x - centerX(z)) - pisteW(z) / 2;
    if (d < 0) c.copy(cWhite); else if (d < 4) c.copy(cWhite).lerp(cEdge, d / 4); else c.copy(cEdge).lerp(cOff, clamp((d - 4) / 20, 0, 1));
    const n = Math.sin(x * 0.11 + z * 0.07) * Math.sin(x * 0.05 - z * 0.09);
    if (d > 26 && n > 0.45) c.lerp(cRock, clamp((n - 0.45) * 3, 0, 0.85));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const tile = (t, n) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(WID / n, LEN / n); c.anisotropy = renderer.capabilities.getMaxAnisotropy(); return c; };
  const { snowD, snowNm, snowR } = W.snowTextures;
  const map = tile(snowD, 4), nmap = tile(snowNm, 4), rmap = tile(snowR, 4);
  const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, map, normalMap: nmap, normalScale: new THREE.Vector2(1.2, 1.2), roughnessMap: rmap, roughness: 1, envMapIntensity: 0.9 });
  const terrain = new THREE.Mesh(geo, snowMat);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Pinos
  const N = 820;
  const pineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  const inst = [pineGeometry(7), pineGeometry(19)].map((g) => { const m = new THREE.InstancedMesh(g, pineMat, N); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; });
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const z = -80 + r() * (RUN + 200), side = r() < 0.5 ? -1 : 1;
    const d = 3.5 + Math.pow(r(), 1.6) * 90;
    const x = centerX(z) + side * (pisteW(z) / 2 + d), s = 0.75 + r() * 0.9;
    p.set(x, H(x, z) - 0.25, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6); sc.set(s, s * (0.9 + r() * 0.4), s);
    mtx.compose(p, q, sc); inst[i % 2].setMatrixAt(i, mtx); inst[(i + 1) % 2].setMatrixAt(i, hide);
  }

  // Jalones rojos
  const poles = Math.floor(RUN / 16) * 2;
  const pw = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff }), poles);
  const pr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 6).translate(0, 1.3, 0), new THREE.MeshStandardMaterial({ color: 0xe5233d, emissive: 0x330008 }), poles);
  let k = 0;
  for (let z = 10; z < RUN && k < poles; z += 16) for (const s of [-1, 1]) {
    const x = centerX(z) + s * (pisteW(z) / 2 + 0.6);
    mtx.makeTranslation(x, H(x, z), z); pw.setMatrixAt(k, mtx); pr.setMatrixAt(k, mtx); k++;
  }
  group.add(pw, pr);

  // Kickers
  const kickMat = new THREE.MeshStandardMaterial({ color: 0xdfe8f4, normalMap: nmap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.7 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.6 });
  for (const kk of KICKERS) {
    const SX = 14, SU = 16, gpos = [], gidx = [];
    for (let j = 0; j <= SU; j++) for (let i = 0; i <= SX; i++) {
      const x = kk.x + (i / SX - 0.5) * (kk.w + 1.6), z = kk.z + (j / SU) * kk.len;
      gpos.push(x, G(x, z) + 0.02, z);
    }
    for (let j = 0; j < SU; j++) for (let i = 0; i < SX; i++) { const a = j * (SX + 1) + i, b = a + 1, c2 = a + SX + 1, d = c2 + 1; gidx.push(a, c2, b, b, c2, d); }
    const base = gpos.length / 3;
    for (let i = 0; i <= SX; i++) {
      const x = kk.x + (i / SX - 0.5) * (kk.w + 1.6), z = kk.z + kk.len;
      gpos.push(x, G(x, z - 0.001) + 0.02, z, x, H(x, z), z);
    }
    for (let i = 0; i < SX; i++) { const a = base + i * 2; gidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3)); kg.setIndex(gidx); kg.computeVertexNormals();
    const mesh = new THREE.Mesh(kg, kickMat); mesh.material.side = THREE.DoubleSide; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(kk.w, 0.06, 0.12), lipMat);
    lip.position.set(kk.x, G(kk.x, kk.z + kk.len - 0.01) + 0.03, kk.z + kk.len - 0.05); group.add(lip);
    for (const sx of [-1, 1]) {
      const pts = [];
      for (let j = 0; j <= 12; j++) { const z = kk.z + (j / 12) * kk.len; pts.push(new THREE.Vector3(kk.x + sx * (kk.w / 2), G(kk.x, z) + 0.05, z)); }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 6), lipMat));
    }
  }
  // Cajones
  const boxTop = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.25, clearcoat: 1 });
  const boxSide = new THREE.MeshStandardMaterial({ color: 0xe5233d, roughness: 0.5 });
  for (const b of BOXES) {
    const y0 = H(b.x, b.z), y1 = H(b.x, b.z + b.len);
    const ang = Math.atan2(y0 - y1, b.len);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, b.top, b.len), [boxSide, boxSide, boxTop, boxSide, boxSide, boxSide]);
    m.position.set(b.x, (y0 + y1) / 2 + b.top / 2, b.z + b.len / 2);
    m.rotation.x = ang; m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }

  // Telesilla
  const lx = 52, towerMat = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, metalness: 0.6, roughness: 0.4 });
  const tops = [];
  for (let z = -30; z < RUN + 20; z += 46) {
    const y0 = H(lx, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 11, 8), towerMat); t.position.set(lx, y0 + 5.5, z); t.castShadow = true; group.add(t);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 0.3), towerMat); bar.position.set(lx, y0 + 10.8, z); group.add(bar);
    tops.push(new THREE.Vector3(lx, y0 + 10.6, z));
  }
  const cableMat = new THREE.LineBasicMaterial({ color: 0x2a2d33 });
  for (const s of [-1.9, 1.9]) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tops.map((v) => v.clone().setX(lx + s))), cableMat));
  const chairs = [], nCh = 60;
  const seatI = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.12, 0.55).translate(0, -1.9, 0), new THREE.MeshStandardMaterial({ color: 0xe5233d }), nCh);
  const hangI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.9, 0.05).translate(0, -0.95, 0), towerMat, nCh);
  for (let i = 0; i < nCh; i++) chairs.push({ s: (i / (nCh / 2)) % 1, side: i < nCh / 2 ? -1.9 : 1.9 });
  group.add(seatI, hangI);
  const updateChairs = (t) => {
    chairs.forEach((ch, i) => {
      const u = ((ch.s + t * 0.004 * (ch.side > 0 ? 1 : -1)) % 1 + 1) % 1;
      const f = u * (tops.length - 1), a = Math.floor(f), b = Math.min(a + 1, tops.length - 1);
      p.copy(tops[a]).lerp(tops[b], f - a); p.x = lx + ch.side; p.y -= 0.3;
      mtx.makeTranslation(p.x, p.y, p.z); seatI.setMatrixAt(i, mtx); hangI.setMatrixAt(i, mtx);
    });
    seatI.instanceMatrix.needsUpdate = true; hangI.instanceMatrix.needsUpdate = true;
  };

  const arch = (z, text, color) => {
    const cx = centerX(z), w = pisteW(z) + 2, y = H(cx, z);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1b1d23 });
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), postMat); post.position.set(cx + s * w / 2, y + 3, z); group.add(post); }
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex(text, color), side: THREE.DoubleSide }));
    ban.position.set(cx, y + 5.2, z); ban.rotation.y = Math.PI; group.add(ban);
  };
  arch(16, 'SALIDA · PISTA ROJA', '#e5233d');
  arch(195, 'SNOWPARK', '#111216');
  arch(RUN - 30, 'META', '#111216');

  const gateGroup = new THREE.Group(); group.add(gateGroup);
  const gates = [];
  const flagRed = new THREE.MeshStandardMaterial({ color: 0xe5233d, side: THREE.DoubleSide, emissive: 0x400008 });
  const flagBlue = new THREE.MeshStandardMaterial({ color: 0x3b6cff, side: THREE.DoubleSide, emissive: 0x081840 });
  const poleW = new THREE.MeshStandardMaterial({ color: 0xffffff });
  let gi = 0;
  for (let z = 50; z < RUN - 60; z += 34, gi++) {
    if (z > 185 && z < 740) continue;
    const gx = centerX(z) + (gi % 2 ? 1 : -1) * pisteW(z) * 0.22;
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6), poleW); pole.position.set(s * 2.4, 0.9, 0); g.add(pole); }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.7), gi % 2 ? flagBlue : flagRed); flag.position.set(0, 1.45, 0); g.add(flag);
    g.position.set(gx, H(gx, z), z); gateGroup.add(g);
    gates.push({ x: gx, z, done: false });
  }

  const TR = 360;
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR * 6), 3));
  const idx = []; for (let i = 0; i < TR - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tGeo.setIndex(idx);
  const trail = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: 0xaab6ca, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  trail.frustumCulled = false; group.add(trail);

  const SP = 320;
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SP * 3), 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.14, map: radialTex(), transparent: true, depthWrite: false, color: 0xffffff }));
  spray.frustumCulled = false;
  spray.userData.p = Array.from({ length: SP }, () => ({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));
  group.add(spray);

  group.visible = false;
  return { group, gates, gateGroup, trail, TR, spray, updateChairs };
}

const SPIN_PTS = { 0: 0, 180: 200, 360: 500, 540: 900, 720: 1400, 900: 2000, 1080: 2800 };

export function createGame(ctx) {
  const { W, camera, S, inL, inR, inJ, store, ui, renderer } = ctx;
  let M = null;
  const R = {
    on: false, mode: 'libre', x: 0, y: 0, z: 0, h: 0, v: 0, vy: 0, roll: 0, hc: 0, pL: 0, pR: 0,
    state: 'ground', spin: 0, spinV: 0, base: 0, air: 0, grab: 0, grabT: 0, charge: 0, jPrev: false, crashT: 0, slideBox: null, slideM: 0,
    time: 0, top: 0, gates: 0, missed: 0, count: 0, done: false, score: 0, combo: 0, comboT: 0,
    cam: new THREE.Vector3(), look: new THREE.Vector3(), camInit: false, nrm: new THREE.Vector3(0, 1, 0),
  };
  const trailPts = [];
  let trailT = 0;
  const q = new THREE.Quaternion(), qr = new THREE.Quaternion(), qs = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), F = new THREE.Vector3(), Nt = new THREE.Vector3();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), qFlat = new THREE.Quaternion().setFromAxisAngle(AX, -Math.PI / 2);
  const studioShadow = { left: W.key.shadow.camera.left, right: W.key.shadow.camera.right, top: W.key.shadow.camera.top, bottom: W.key.shadow.camera.bottom, near: W.key.shadow.camera.near, far: W.key.shadow.camera.far };

  function ensure() { if (!M) { M = buildMountain(W, renderer); W.scene.add(M.group); } }

  function start(mode) {
    ensure();
    Object.assign(R, { on: true, mode, done: false, z: 2, h: 0, v: 0, vy: 0, roll: 0, hc: 0, pL: 0, pR: 0, state: 'ground', spin: 0, spinV: 0, base: 0, air: 0, grab: 0, charge: 0, crashT: 0, slideBox: null,
      time: 0, top: 0, gates: 0, missed: 0, count: 3.2, camInit: false, score: 0, combo: 0, comboT: 0 });
    R.x = centerX(2); R.y = G(R.x, R.z);
    trailPts.length = 0;
    M.gateGroup.visible = mode === 'slalom';
    for (const g of M.gates) g.done = false;
    M.group.visible = true;
    camera.fov = 58; camera.near = 0.15; camera.updateProjectionMatrix();
    Object.assign(W.key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 });
    W.key.shadow.camera.updateProjectionMatrix();
    W.catcher.visible = false;
    ui.start(mode);
  }
  function stop() {
    R.on = false;
    if (M) M.group.visible = false;
    camera.fov = 32; camera.near = 0.05; camera.updateProjectionMatrix();
    Object.assign(W.key.shadow.camera, studioShadow); W.key.shadow.camera.updateProjectionMatrix();
    W.key.position.set(2.2, 4.5, 1.6); W.key.target.position.set(0, 0, 0);
    W.catcher.visible = true;
    ui.stop();
  }
  function normalAt(x, z, out) {
    const e = 0.4;
    return out.set(-(G(x + e, z) - G(x - e, z)) / (2 * e), 1, -(G(x, z + e) - G(x, z - e)) / (2 * e)).normalize();
  }
  function finish() {
    R.done = true;
    const total = R.time + R.missed * 2;
    const key = 'best-' + R.mode, best = store.get(key, 0);
    const isBest = !best || total < best;
    if (isBest) store.set(key, total);
    const bestPts = store.get('best-points', 0);
    if (R.score > bestPts) store.set('best-points', R.score);
    ui.finish({ time: total, top: R.top, gates: R.gates, total: M.gates.length, best: isBest ? total : best, isBest, mode: R.mode, score: R.score, bestPts: Math.max(bestPts, R.score) });
  }
  function burst(n, power) {
    for (const s of M.spray.userData.p) {
      if (n <= 0) break;
      if (s.life > 0) continue;
      n--;
      const a = Math.random() * Math.PI * 2;
      s.x = R.x + Math.cos(a) * 0.4; s.y = R.y + 0.05; s.z = R.z + Math.sin(a) * 0.4;
      s.vx = Math.cos(a) * power * (0.5 + Math.random()); s.vy = 1 + Math.random() * power; s.vz = Math.sin(a) * power * (0.5 + Math.random());
      s.life = 0.5 + Math.random() * 0.6;
    }
  }
  function land() {
    const k = Math.round(R.spin / Math.PI);
    const dev = Math.abs(R.spin - k * Math.PI);
    const deg = Math.abs(k) * 180;
    if (dev > 0.62 && R.air > 0.25) { crash(); return; }
    R.base += k * Math.PI; R.spin = 0; R.spinV = 0;
    burst(26, 2.2);
    if (R.air < 0.35 && deg === 0 && R.grabT < 0.2) return;
    let pts = Math.round(R.air * 120) + (SPIN_PTS[Math.min(deg, 1080)] || 0);
    const grab = R.grabT > 0.25;
    if (grab) pts += 250;
    R.combo = R.comboT > 0 ? R.combo + 1 : 1; R.comboT = 3.5;
    pts = Math.round(pts * (1 + (R.combo - 1) * 0.25));
    R.score += pts;
    const name = [deg ? `${deg}` : '', grab ? 'Indy' : '', !deg && !grab ? (R.air > 0.7 ? 'Big Air' : 'Ollie') : ''].filter(Boolean).join(' ');
    ui.trick(name, pts, R.combo);
  }
  function crash() {
    R.state = 'crash'; R.crashT = 1.6; R.spinV = 0; R.grab = 0; R.combo = 0;
    burst(60, 3.5);
    ui.msg('¡Al suelo!', true);
  }
  const slideName = () => (Math.abs(Math.round(R.spin / (Math.PI / 2))) % 2 ? 'Boardslide' : '50-50');

  function update(dt, t) {
    const dir = Math.sign(S.dir) || 1;
    R.pL = damp(R.pL, inL() ? 1 : 0, 10, dt);
    R.pR = damp(R.pR, inR() ? 1 : 0, 10, dt);
    S.pL = R.pL; S.pR = R.pR;
    const d = R.pL - R.pR;
    const j = inJ();
    if (R.count > 0) { R.count -= dt; ui.countdown(R.count > 0.2 ? Math.ceil(R.count - 0.2) : '¡Ya!'); }
    R.comboT = Math.max(0, R.comboT - dt);
    let hdot = 0;
    const live = R.count <= 0 && !R.done;

    if (R.state === 'crash') {
      R.crashT -= dt;
      R.v = damp(R.v, 0, 3, dt);
      R.x += Math.sin(R.h) * R.v * dt; R.z += Math.cos(R.h) * R.v * dt;
      R.y = G(R.x, R.z);
      if (R.crashT <= 0) { R.state = 'ground'; R.base = 0; R.spin = 0; R.h *= 0.3; R.v = Math.max(R.v, 1.5); }
    } else if (R.state === 'air') {
      R.air += dt; R.time += dt;
      R.vy -= 11 * dt; R.y += R.vy * dt;
      R.x += Math.sin(R.h) * R.v * dt; R.z += Math.cos(R.h) * R.v * dt;
      R.spinV = damp(R.spinV, d * 7.5, 8, dt);
      R.spin += R.spinV * dt;
      R.grab = damp(R.grab, j && R.air > 0.12 ? 1 : 0, 10, dt);
      if (R.grab > 0.6) R.grabT += dt;
      for (const b of BOXES) {
        const top = H(b.x, R.z) + b.top;
        if (R.vy < 0 && R.z > b.z && R.z < b.z + b.len && Math.abs(R.x - b.x) < 0.5 && R.y <= top + 0.08 && R.y > top - 0.45) {
          R.state = 'slide'; R.slideBox = b; R.y = top; R.vy = 0; R.slideM = 0; R.h = 0; R.grab = 0;
          R.spin = Math.round(R.spin / (Math.PI / 2)) * (Math.PI / 2);
          ui.trick(slideName(), 0, 0, true);
          break;
        }
      }
      if (R.state === 'air') {
        const gy = G(R.x, R.z);
        if (R.y <= gy) { R.y = gy; R.state = 'ground'; R.vy = 0; land(); }
      }
    } else if (R.state === 'slide') {
      const b = R.slideBox;
      R.x = damp(R.x, b.x, 12, dt);
      R.v = Math.max(3, R.v - 0.8 * dt);
      R.z += R.v * dt; R.slideM += R.v * dt; R.time += dt;
      R.y = H(b.x, R.z) + b.top;
      let off = false;
      if (j && !R.jPrev) { R.state = 'air'; R.vy = 3.5; R.air = 0.15; R.grabT = 0; off = true; }
      if (R.z > b.z + b.len) { R.state = 'air'; R.vy = 0.5; R.air = 0.2; R.grabT = 0; off = true; }
      if (off) { const pts = Math.round(R.slideM * 60); R.score += pts; ui.trick(slideName(), pts, 0); }
    } else if (live) {
      hdot = d * (1.15 + Math.min(R.v, 14) * 0.03);
      R.h = clamp(R.h + hdot * dt, -1.7, 1.7);
      if (Math.abs(d) < 0.15) R.h -= R.h * 0.35 * dt;
      const grade = baseY(R.z) - baseY(R.z + 1);
      const c = centerX(R.z), w = pisteW(R.z), off = Math.abs(R.x - c) - w / 2;
      let a = 9.8 * Math.sin(Math.atan(grade)) * Math.cos(R.h);
      a -= 0.11 * R.v + 0.007 * R.v * R.v + Math.abs(hdot) * 0.1 * R.v;
      if (off > 0) a -= Math.min(off, 6) * 0.3 * R.v;
      if (R.v < 1.5) a = Math.max(a, 0.8 * Math.cos(R.h));
      const g0 = G(R.x, R.z);
      R.v = clamp(R.v + a * dt, 0, 19);
      R.x += Math.sin(R.h) * R.v * dt; R.z += Math.cos(R.h) * R.v * dt;
      if (off > 0) R.x -= Math.sign(R.x - c) * Math.min(off, 8) * 1.2 * dt;
      R.z = Math.max(R.z, -60);
      const g1 = G(R.x, R.z);
      const vyGround = (g1 - g0) / Math.max(dt, 1e-3);
      if (j) R.charge = Math.min(1, R.charge + dt * 2.2);
      if (!j && R.jPrev) { R.state = 'air'; R.vy = Math.max(vyGround, 0) + 3.2 + R.charge * 2.8; R.air = 0; R.grabT = 0; R.charge = 0; burst(12, 1.2); }
      else if (R.vy > 1.2 && vyGround < R.vy - 6) { R.state = 'air'; R.air = 0; R.grabT = 0; R.y = g0; }
      else { R.vy = vyGround; R.y = g1; }
      if (!j) R.charge = damp(R.charge, 0, 6, dt);
      R.time += dt;
      R.top = Math.max(R.top, R.v);
      if (R.mode === 'slalom') for (const g of M.gates) if (!g.done && R.z >= g.z) {
        g.done = true;
        if (Math.abs(R.x - g.x) < 2.5) { R.gates++; ui.msg('¡Dentro!'); } else { R.missed++; ui.msg('+2 s', true); }
      }
      if (R.z >= RUN - 30) finish();
    } else if (R.done) {
      R.v = damp(R.v, 0, 1.5, dt);
      R.z += Math.cos(R.h) * R.v * dt; R.x += Math.sin(R.h) * R.v * dt; R.y = G(R.x, R.z);
    } else R.y = G(R.x, R.z);
    R.jPrev = j;

    // Orientación sobre el terreno
    if (R.state === 'air') R.nrm.lerp(AY, 1 - Math.exp(-3 * dt)).normalize();
    else if (R.state === 'slide') R.nrm.copy(normalAt(R.slideBox.x, R.z - 3, Nt));
    else R.nrm.copy(normalAt(R.x, R.z, Nt));
    Y.copy(R.nrm);
    F.set(Math.sin(R.h), 0, Math.cos(R.h));
    X.copy(F).multiplyScalar(dir); X.addScaledVector(Y, -X.dot(Y)).normalize();
    Z.crossVectors(X, Y).normalize();
    m4.makeBasis(X, Y, Z); q.setFromRotationMatrix(m4);
    qs.setFromAxisAngle(Y, R.base + R.spin); q.premultiply(qs);
    let rollT = R.state === 'ground' ? clamp(-hdot * dir * (0.1 + R.v * 0.032), -0.75, 0.75) : 0;
    if (R.state === 'crash') rollT = 1.3 * Math.sin(Math.min(1, (1.6 - R.crashT) * 2) * Math.PI * 0.5);
    R.roll = damp(R.roll, rollT, R.state === 'crash' ? 8 : 6, dt);
    qr.setFromAxisAngle(AX, R.roll); q.multiply(qr);
    W.rig.quaternion.copy(q);
    W.rig.position.set(R.x, R.y + 0.012, R.z);
    W.boardGroup.rotation.set(0, 0, 0);

    const gy = G(R.x, R.z), hAbove = Math.max(0, R.y - gy);
    W.shadow.position.set(R.x, gy + 0.03, R.z);
    W.shadow.quaternion.copy(q).multiply(qFlat);
    W.shadow.material.opacity = 0.4 * clamp(1 - hAbove / 4, 0.15, 1);
    W.shadow.scale.setScalar(1 + hAbove * 0.15);
    W.key.target.position.set(R.x, R.y, R.z);
    W.key.position.set(R.x + 12, R.y + 20, R.z + 26);

    // Cámara
    R.hc = damp(R.hc, R.h, 2.4, dt);
    const bx = Math.sin(R.hc), bz = Math.cos(R.hc);
    const cx = R.x - bx * 5.6, cz = R.z - bz * 5.6;
    const cy = Math.max(H(cx, cz) + 1.8, R.y + 2.4 + (R.state === 'air' ? 0.6 : 0));
    if (!R.camInit) { R.cam.set(cx, cy, cz); R.look.set(R.x, R.y + 0.6, R.z); R.camInit = true; }
    R.cam.set(damp(R.cam.x, cx, 7, dt), damp(R.cam.y, cy, 5, dt), damp(R.cam.z, cz, 7, dt));
    R.look.set(damp(R.look.x, R.x + bx * 3, 9, dt), damp(R.look.y, R.y - 0.1, 7, dt), damp(R.look.z, R.z + bz * 3, 9, dt));
    camera.position.copy(R.cam); camera.lookAt(R.look);

    // Huella
    trailT += dt;
    if (R.v > 0.4 && trailT > 0.06 && R.state === 'ground') {
      trailT = 0;
      trailPts.push({ x: R.x, z: R.z, px: Math.cos(R.h), pz: -Math.sin(R.h), w: 0.11 + Math.abs(R.roll) * 0.08 });
      if (trailPts.length > M.TR) trailPts.shift();
    } else if (R.state !== 'ground' && trailPts.length && trailPts[trailPts.length - 1].w > 0) trailPts.push({ x: R.x, z: R.z, px: 0, pz: 0, w: 0 });
    const arr = M.trail.geometry.attributes.position.array, n = trailPts.length;
    for (let i = 0; i < M.TR; i++) {
      const p = trailPts[Math.min(i, n - 1)] || { x: R.x, z: R.z, px: 0, pz: 0, w: 0 };
      const w = i < n ? p.w * Math.min(1, (i + 1) / 20) : 0, yy = G(p.x, p.z) + 0.02;
      arr[i * 6] = p.x + p.px * w; arr[i * 6 + 1] = yy; arr[i * 6 + 2] = p.z + p.pz * w;
      arr[i * 6 + 3] = p.x - p.px * w; arr[i * 6 + 4] = yy; arr[i * 6 + 5] = p.z - p.pz * w;
    }
    M.trail.geometry.attributes.position.needsUpdate = true;

    const sp = M.spray.userData.p, sa = M.spray.geometry.attributes.position.array;
    let e = R.state === 'ground' ? (Math.abs(hdot) * R.v > 2 ? 3 : R.v > 12 ? 1 : 0) : 0;
    for (let i = 0; i < sp.length; i++) {
      const s = sp[i];
      if (s.life <= 0 && e > 0) {
        e--;
        const sgn = R.roll > 0 ? -1 : 1;
        s.x = R.x + (Math.random() - 0.5) * 1.2 * X.x; s.y = R.y + 0.05; s.z = R.z + (Math.random() - 0.5) * 1.2 * X.z;
        s.vx = Z.x * sgn * (1 + Math.random() * 2) - F.x * R.v * 0.3; s.vy = 1.5 + Math.random() * 2; s.vz = Z.z * sgn * (1 + Math.random() * 2) - F.z * R.v * 0.3;
        s.life = 0.6 + Math.random() * 0.5;
      }
      if (s.life > 0) { s.life -= dt; s.vy -= 7 * dt; s.x += (s.vx + F.x * R.v * 0.7) * dt; s.y += s.vy * dt; s.z += (s.vz + F.z * R.v * 0.7) * dt; }
      sa[i * 3] = s.x; sa[i * 3 + 1] = s.life > 0 ? s.y : -9999; sa[i * 3 + 2] = s.z;
    }
    M.spray.geometry.attributes.position.needsUpdate = true;
    M.updateChairs(t);

    ui.hud({ kmh: R.v * 3.6, time: R.time + R.missed * 2, progress: clamp(R.z / (RUN - 30), 0, 1), gates: R.gates, mode: R.mode, score: R.score, charge: R.charge, state: R.state });

    const crashing = R.state === 'crash';
    return {
      crouch: crashing ? 1.0 : 0.52 + Math.min(R.v / 20, 1) * 0.12 + Math.abs(R.roll) * 0.3 + R.charge * 0.45 + (R.state === 'air' ? 0.15 : 0),
      shiftX: d * 0.08, shiftZ: crashing ? 0.25 : R.roll * 0.4,
      lookYaw: dir * 0.95 + hdot * 0.15 - (R.state === 'air' ? R.spinV * 0.06 : 0),
      arms: 0.45 + Math.abs(R.roll) * 0.4 + (R.state === 'air' ? 0.3 : 0), grab: R.grab, flail: crashing ? 0.8 : 0, dir,
      flakeAt: R.look,
    };
  }
  return { start, stop, update, get on() { return R.on; }, debug: R };
}

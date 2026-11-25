// Bajada de montaña (inspirada en Formigal): pista que serpentea, telesilla, pinos, picos del Pirineo.
// Controles: los pedales. Pie izquierdo → giras a la izquierda, pie derecho → a la derecha.
import * as THREE from 'three';
import { radialTex } from './world.js';

export const RUN = 900;                     // metros de pista
export const centerX = (z) => 14 * Math.sin(z / 70) + 7 * Math.sin(z / 27 + 1);
export const pisteW = (z) => 24 + 6 * Math.sin(z / 110);
export const baseY = (z) => -z * 0.27 - 5 * Math.sin(z / 150);
export function H(x, z) {
  const c = centerX(z), w = pisteW(z);
  const d = Math.abs(x - c) - w / 2;
  let y = baseY(z) + 0.14 * Math.sin(x / 5.1) * Math.sin(z / 7.3);
  if (d > 0) y += d * 0.34 + d * d * 0.006 + Math.sin(x * 0.21 + z * 0.13) * Math.min(d, 20) * 0.04;
  return y;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function bannerTex(text, bg) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 160);
  g.fillStyle = '#fff'; g.font = '900 96px "Archivo", "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 86);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 0, 1024, 8); g.fillRect(0, 152, 1024, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildMountain(snowMap) {
  const group = new THREE.Group();
  const r = rnd(42);

  // Terreno
  const LEN = RUN + 260, WID = 280;
  const geo = new THREE.PlaneGeometry(WID, LEN, 140, 520);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, LEN / 2 - 120);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const cWhite = new THREE.Color('#f6f9fd'), cEdge = new THREE.Color('#e3eaf4'), cOff = new THREE.Color('#d6e1ef'), cRock = new THREE.Color('#6f7682'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, H(x, z));
    const d = Math.abs(x - centerX(z)) - pisteW(z) / 2;
    if (d < 0) c.copy(cWhite);
    else if (d < 4) c.copy(cWhite).lerp(cEdge, d / 4);
    else c.copy(cEdge).lerp(cOff, clamp((d - 4) / 20, 0, 1));
    const n = Math.sin(x * 0.11 + z * 0.07) * Math.sin(x * 0.05 - z * 0.09);
    if (d > 26 && n > 0.45) c.lerp(cRock, clamp((n - 0.45) * 3, 0, 0.85));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const map = snowMap.clone(); map.needsUpdate = true; map.repeat.set(WID / 5, LEN / 5);
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness: 0.95 }));
  group.add(terrain);

  // Pinos (instanciados)
  const N = 760;
  const parts = [
    [new THREE.ConeGeometry(1.0, 2.3, 7), 0x1e3a34, 1.5],
    [new THREE.ConeGeometry(0.78, 1.9, 7), 0x24453d, 2.4],
    [new THREE.ConeGeometry(0.46, 1.1, 7), 0xf3f7fc, 3.25],
    [new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6), 0x4a3426, 0.45],
  ];
  const inst = parts.map(([g, col, y]) => { g.translate(0, y, 0); const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, flatShading: true }), N); group.add(m); return m; });
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const z = -80 + r() * (RUN + 200);
    const side = r() < 0.5 ? -1 : 1;
    const d = 3.5 + Math.pow(r(), 1.6) * 90;
    const x = centerX(z) + side * (pisteW(z) / 2 + d);
    const s = 0.8 + r() * 1.1;
    p.set(x, H(x, z) - 0.25, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6); sc.set(s, s * (0.9 + r() * 0.4), s);
    mtx.compose(p, q, sc);
    for (const m of inst) m.setMatrixAt(i, mtx);
  }

  // Jalones de pista (rojos, como las pistas rojas)
  const poles = Math.floor(RUN / 16) * 2;
  const pw = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff }), poles);
  const pr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 6).translate(0, 1.3, 0), new THREE.MeshStandardMaterial({ color: 0xe5233d, emissive: 0x330008 }), poles);
  let k = 0;
  for (let z = 10; z < RUN && k < poles; z += 16) for (const s of [-1, 1]) {
    const x = centerX(z) + s * (pisteW(z) / 2 + 0.6);
    mtx.makeTranslation(x, H(x, z), z); pw.setMatrixAt(k, mtx); pr.setMatrixAt(k, mtx); k++;
  }
  group.add(pw, pr);

  // Telesilla
  const lx = 52, towerMat = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, metalness: 0.6, roughness: 0.4 });
  const tops = [];
  for (let z = -30; z < RUN + 20; z += 46) {
    const y0 = H(lx, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 11, 8), towerMat);
    t.position.set(lx, y0 + 5.5, z); group.add(t);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 0.3), towerMat);
    bar.position.set(lx, y0 + 10.8, z); group.add(bar);
    tops.push(new THREE.Vector3(lx, y0 + 10.6, z));
  }
  const cableMat = new THREE.LineBasicMaterial({ color: 0x2a2d33 });
  for (const s of [-1.9, 1.9]) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tops.map((v) => v.clone().setX(lx + s))), cableMat));
  const chairs = [];
  const chairGeo = new THREE.BoxGeometry(1.3, 0.12, 0.55).translate(0, -1.9, 0);
  const hangGeo = new THREE.BoxGeometry(0.05, 1.9, 0.05).translate(0, -0.95, 0);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0xe5233d, roughness: 0.5 });
  const nCh = 60;
  const seatI = new THREE.InstancedMesh(chairGeo, chairMat, nCh), hangI = new THREE.InstancedMesh(hangGeo, towerMat, nCh);
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

  // Picos del Pirineo alrededor
  const rock = new THREE.MeshStandardMaterial({ color: 0x5d6470, roughness: 1, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.9, flatShading: true });
  const mid = new THREE.Vector3(0, baseY(RUN / 2), RUN / 2);
  const peak = (x, z, rad, hgt, base, cap = 0.42) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, hgt, 6 + Math.floor(r() * 3), 1), rock);
    m.position.set(x, base + hgt / 2, z); m.rotation.y = r() * 6; group.add(m);
    const s = new THREE.Mesh(new THREE.ConeGeometry(rad * cap, hgt * cap, m.geometry.parameters.radialSegments, 1), snow);
    s.position.set(x, base + hgt - (hgt * cap) / 2 + 0.5, z); s.rotation.y = m.rotation.y; group.add(s);
  };
  const ground = (z) => baseY(clamp(z, 0, RUN)) - 80;
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, z = -150 + (i / 26) * (RUN + 350);
    const x = side * (230 + r() * 260);
    peak(x, z, 110 + r() * 140, 180 + r() * 230, ground(z), 0.38 + r() * 0.15);
  }
  for (let i = 0; i < 7; i++) {
    const x = -420 + i * 140 + r() * 60, z = RUN + 380 + r() * 300;
    peak(x, z, 140 + r() * 120, 220 + r() * 200, ground(z), 0.36 + r() * 0.1);
  }
  // Un pico afilado y rocoso al fondo (tipo Foratata)
  peak(70, RUN + 520, 120, 470, baseY(RUN) - 120, 0.22);
  peak(150, RUN + 560, 80, 330, baseY(RUN) - 120, 0.3);

  // Arcos de salida y meta
  const arch = (z, text, color) => {
    const cx = centerX(z), w = pisteW(z) + 2, y = H(cx, z);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1b1d23 });
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), postMat); post.position.set(cx + s * w / 2, y + 3, z); group.add(post); }
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex(text, color), side: THREE.DoubleSide }));
    ban.position.set(cx, y + 5.2, z); ban.rotation.y = Math.PI; group.add(ban);
  };
  arch(16, 'SALIDA · PISTA ROJA', '#e5233d');
  arch(RUN - 30, 'META', '#111216');

  // Pueblo al final de la pista
  const wall = new THREE.MeshStandardMaterial({ color: 0xd6cfc4, roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const z = RUN + 10 + r() * 90, side = r() < 0.5 ? -1 : 1;
    const x = centerX(z) + side * (pisteW(z) / 2 + 14 + r() * 50);
    const w = 8 + r() * 10, h = 6 + r() * 12, dpt = 8 + r() * 8;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), wall); b.position.set(x, H(x, z) + h / 2 - 1, z); group.add(b);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, dpt) * 0.75, 4, 4), roof); rf.position.set(x, H(x, z) + h + 1, z); rf.rotation.y = Math.PI / 4; group.add(rf);
  }

  // Puertas de slalom
  const gateGroup = new THREE.Group(); group.add(gateGroup);
  const gates = [];
  const flagRed = new THREE.MeshStandardMaterial({ color: 0xe5233d, side: THREE.DoubleSide, emissive: 0x400008 });
  const flagBlue = new THREE.MeshStandardMaterial({ color: 0x3b6cff, side: THREE.DoubleSide, emissive: 0x081840 });
  const poleW = new THREE.MeshStandardMaterial({ color: 0xffffff });
  let gi = 0;
  for (let z = 70; z < RUN - 60; z += 34, gi++) {
    const gx = centerX(z) + (gi % 2 ? 1 : -1) * pisteW(z) * 0.22;
    const g = new THREE.Group();
    const mat = gi % 2 ? flagBlue : flagRed;
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6), poleW); pole.position.set(s * 2.4, 0.9, 0); g.add(pole);
    }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.7), mat); flag.position.set(0, 1.45, 0); g.add(flag);
    g.position.set(gx, H(gx, z), z);
    gateGroup.add(g);
    gates.push({ x: gx, z, g, done: false });
  }

  // Huella
  const TR = 360;
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR * 6), 3));
  const idx = []; for (let i = 0; i < TR - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tGeo.setIndex(idx);
  const trail = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: 0xaab6ca, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  trail.frustumCulled = false;
  group.add(trail);

  // Nieve que salta al girar
  const SP = 220;
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SP * 3), 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.16, map: radialTex(), transparent: true, depthWrite: false, color: 0xffffff }));
  spray.frustumCulled = false;
  spray.userData.p = Array.from({ length: SP }, () => ({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));
  group.add(spray);

  group.visible = false;
  return { group, gates, gateGroup, trail, TR, spray, updateChairs };
}

export function createGame(ctx) {
  const { W, camera, S, inL, inR, store, ui } = ctx;
  let M = null;
  const R = { on: false, mode: 'libre', x: 0, z: 0, h: 0, v: 0, roll: 0, hc: 0, pL: 0, pR: 0, time: 0, top: 0, gates: 0, missed: 0, count: 0, done: false, cam: new THREE.Vector3(), camInit: false, look: new THREE.Vector3() };
  const trailPts = [];
  let trailT = 0, msgT = 0;
  const q = new THREE.Quaternion(), qr = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), F = new THREE.Vector3();
  const AX = new THREE.Vector3(1, 0, 0), qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  function ensure() {
    if (M) return;
    M = buildMountain(W.snowMap);
    W.scene.add(M.group);
  }

  function start(mode) {
    ensure();
    R.on = true; R.mode = mode; R.done = false;
    R.z = 2; R.x = centerX(2); R.h = 0; R.v = 0; R.roll = 0; R.hc = 0; R.pL = R.pR = 0;
    R.time = 0; R.top = 0; R.gates = 0; R.missed = 0; R.count = 3.2; R.camInit = false;
    trailPts.length = 0;
    M.gateGroup.visible = mode === 'slalom';
    for (const g of M.gates) g.done = false;
    M.group.visible = true;
    camera.fov = 55; camera.near = 0.15; camera.updateProjectionMatrix();
    ui.start(mode);
  }

  function stop() {
    R.on = false;
    if (M) M.group.visible = false;
    camera.fov = 32; camera.near = 0.05; camera.updateProjectionMatrix();
    ui.stop();
  }

  function normalAt(x, z, out) {
    const e = 0.5;
    return out.set(-(H(x + e, z) - H(x - e, z)) / (2 * e), 1, -(H(x, z + e) - H(x, z - e)) / (2 * e)).normalize();
  }

  function finish() {
    R.done = true;
    const total = R.time + R.missed * 2;
    const key = 'best-' + R.mode;
    const best = store.get(key, 0);
    const isBest = !best || total < best;
    if (isBest) store.set(key, total);
    ui.finish({ time: total, top: R.top, gates: R.gates, missed: R.missed, total: M.gates.length, best: isBest ? total : best, isBest, mode: R.mode });
  }

  function update(dt, t) {
    const dir = Math.sign(S.dir) || 1;
    R.pL = damp(R.pL, inL() ? 1 : 0, 10, dt);
    R.pR = damp(R.pR, inR() ? 1 : 0, 10, dt);
    S.pL = R.pL; S.pR = R.pR;
    const d = R.pL - R.pR;

    if (R.count > 0) {
      R.count -= dt;
      ui.countdown(R.count > 0.2 ? Math.ceil(R.count - 0.2) : '¡Ya!');
    }
    let hdot = 0;
    if (R.count <= 0 && !R.done) {
      hdot = d * (1.15 + Math.min(R.v, 14) * 0.03);
      R.h = clamp(R.h + hdot * dt, -1.7, 1.7);
      if (Math.abs(d) < 0.15) R.h -= R.h * 0.35 * dt; // sin pedal, la tabla vuelve poco a poco hacia abajo
      const grade = baseY(R.z) - baseY(R.z + 1);
      const c = centerX(R.z), w = pisteW(R.z), off = Math.abs(R.x - c) - w / 2;
      let a = 9.8 * Math.sin(Math.atan(grade)) * Math.cos(R.h);
      a -= 0.12 * R.v + 0.008 * R.v * R.v + Math.abs(hdot) * 0.1 * R.v;
      if (off > 0) a -= Math.min(off, 6) * 0.3 * R.v;
      if (R.v < 1.5) a = Math.max(a, 0.8 * Math.cos(R.h));
      R.v = clamp(R.v + a * dt, 0, 18);
      R.x += Math.sin(R.h) * R.v * dt;
      R.z += Math.cos(R.h) * R.v * dt;
      if (off > 0) R.x -= Math.sign(R.x - c) * Math.min(off, 8) * 1.2 * dt;
      R.z = Math.max(R.z, -60);
      R.time += dt;
      R.top = Math.max(R.top, R.v);
      if (R.mode === 'slalom') {
        for (const g of M.gates) {
          if (!g.done && R.z >= g.z) {
            g.done = true;
            if (Math.abs(R.x - g.x) < 2.5) { R.gates++; ui.msg('¡Dentro!'); }
            else { R.missed++; ui.msg('+2 s', true); }
          }
        }
      }
      if (R.z >= RUN - 30) finish();
    } else if (R.done) {
      R.v = damp(R.v, 0, 1.5, dt);
      R.z += Math.cos(R.h) * R.v * dt; R.x += Math.sin(R.h) * R.v * dt;
    }

    // Orientación sobre el terreno
    const y = H(R.x, R.z);
    normalAt(R.x, R.z, Y);
    F.set(Math.sin(R.h), 0, Math.cos(R.h));
    X.copy(F).multiplyScalar(dir);
    X.addScaledVector(Y, -X.dot(Y)).normalize();
    Z.crossVectors(X, Y).normalize();
    m4.makeBasis(X, Y, Z);
    q.setFromRotationMatrix(m4);
    const rollT = clamp(-hdot * dir * (0.1 + R.v * 0.032), -0.75, 0.75);
    R.roll = damp(R.roll, rollT, 6, dt);
    qr.setFromAxisAngle(AX, R.roll);
    q.multiply(qr);
    W.rig.quaternion.copy(q);
    W.rig.position.set(R.x, y + 0.012, R.z);
    W.boardGroup.rotation.set(0, 0, 0);

    W.shadow.position.set(R.x, y + 0.03, R.z);
    W.shadow.quaternion.copy(q).multiply(qFlat);
    W.shadow.material.opacity = 0.55;
    W.shadow.scale.set(1, 1, 1);

    // Cámara de persecución
    R.hc = damp(R.hc, R.h, 2.4, dt);
    const bx = Math.sin(R.hc), bz = Math.cos(R.hc);
    const cx = R.x - bx * 5.4, cz = R.z - bz * 5.4;
    const cy = Math.max(H(cx, cz) + 1.8, y + 2.5);
    if (!R.camInit) { R.cam.set(cx, cy, cz); R.look.set(R.x, y + 0.6, R.z); R.camInit = true; }
    R.cam.set(damp(R.cam.x, cx, 7, dt), damp(R.cam.y, cy, 7, dt), damp(R.cam.z, cz, 7, dt));
    R.look.set(damp(R.look.x, R.x + bx * 3, 9, dt), damp(R.look.y, y + 0.5 - 0.6, 9, dt), damp(R.look.z, R.z + bz * 3, 9, dt));
    camera.position.copy(R.cam);
    camera.lookAt(R.look);

    // Huella
    trailT += dt;
    if (R.v > 0.4 && trailT > 0.06) {
      trailT = 0;
      trailPts.push({ x: R.x, z: R.z, px: Math.cos(R.h), pz: -Math.sin(R.h), w: 0.11 + Math.abs(R.roll) * 0.08 });
      if (trailPts.length > M.TR) trailPts.shift();
    }
    const arr = M.trail.geometry.attributes.position.array;
    const n = trailPts.length;
    for (let i = 0; i < M.TR; i++) {
      const p = trailPts[Math.min(i, n - 1)] || { x: R.x, z: R.z, px: 0, pz: 0, w: 0 };
      const w = i < n ? p.w * Math.min(1, (i + 1) / 20) : 0;
      const yy = H(p.x, p.z) + 0.02;
      arr[i * 6] = p.x + p.px * w; arr[i * 6 + 1] = yy; arr[i * 6 + 2] = p.z + p.pz * w;
      arr[i * 6 + 3] = p.x - p.px * w; arr[i * 6 + 4] = yy; arr[i * 6 + 5] = p.z - p.pz * w;
    }
    M.trail.geometry.attributes.position.needsUpdate = true;

    // Salpicaduras de nieve
    const sp = M.spray.userData.p, sa = M.spray.geometry.attributes.position.array;
    const emit = Math.abs(hdot) * R.v > 2 ? 3 : R.v > 12 ? 1 : 0;
    let e = emit;
    for (let i = 0; i < sp.length; i++) {
      const s = sp[i];
      if (s.life <= 0 && e > 0) {
        e--;
        const side = Z.clone().multiplyScalar(R.roll > 0 ? -1 : 1);
        s.x = R.x + (Math.random() - 0.5) * 1.2 * X.x; s.y = y + 0.05; s.z = R.z + (Math.random() - 0.5) * 1.2 * X.z;
        s.vx = side.x * (1 + Math.random() * 2) - F.x * R.v * 0.3; s.vy = 1.5 + Math.random() * 2; s.vz = side.z * (1 + Math.random() * 2) - F.z * R.v * 0.3;
        s.life = 0.6 + Math.random() * 0.5;
      }
      if (s.life > 0) {
        s.life -= dt; s.vy -= 7 * dt;
        s.x += (s.vx + F.x * R.v * 0.7) * dt; s.y += s.vy * dt; s.z += (s.vz + F.z * R.v * 0.7) * dt;
      }
      sa[i * 3] = s.x; sa[i * 3 + 1] = s.life > 0 ? s.y : -9999; sa[i * 3 + 2] = s.z;
    }
    M.spray.geometry.attributes.position.needsUpdate = true;
    M.updateChairs(t);

    ui.hud({ kmh: R.v * 3.6, time: R.time + R.missed * 2, progress: clamp(R.z / (RUN - 30), 0, 1), gates: R.gates, total: M.gates.length, mode: R.mode });

    return {
      crouch: 0.52 + Math.min(R.v / 20, 1) * 0.15 + Math.abs(R.roll) * 0.35,
      shiftX: d * 0.08,
      shiftZ: R.roll * 0.4,
      lookYaw: dir * 0.95 + hdot * 0.15,
      arms: 0.45 + Math.abs(R.roll) * 0.4,
      flakeAt: R.look,
    };
  }

  return { start, stop, update, get on() { return R.on; } };
}

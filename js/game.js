// La montaña: mundo abierto. Bajas por donde quieras (pistas, bosque, fuera de pista) con tu tabla y solo los pedales.
// Pedales → giras. Mantén SALTAR para cargar y suelta para saltar. En el aire: pedales = giras sobre ti mismo, SALTAR = grab.
import * as THREE from 'three';
import { radialTex } from './world.js';
import { createMountain, PARK, HALF, SUN } from './mountain.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const SPIN_PTS = { 0: 0, 180: 200, 360: 500, 540: 900, 720: 1400, 900: 2000, 1080: 2800 };

function bannerTex(text, bg) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 160);
  g.fillStyle = '#fff'; g.font = '800 84px "Inter Tight", "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- Snowpark sobre la pista azul: kickers y cajones a lo largo de la pista ---------- */
function buildPark(T, group) {
  const azul = T.splines.find((p) => p.id === 'azul');
  const at = (z) => { // punto de la pista azul más cercano a esa z
    let best = azul.pts[0], bd = 1e9;
    for (const p of azul.pts) { const d = Math.abs(p.z - z); if (d < bd) { bd = d; best = p; } }
    const i = azul.pts.indexOf(best), n = azul.pts[Math.min(i + 1, azul.pts.length - 1)], pr = azul.pts[Math.max(i - 1, 0)];
    const dx = n.x - pr.x, dz = n.z - pr.z, l = Math.hypot(dx, dz) || 1;
    return { x: best.x, z: best.z, dx: dx / l, dz: dz / l };
  };
  const kickers = [], boxes = [];
  const span = PARK.z1 - PARK.z0;
  [[0.08, 0, 7, 1.5, 6], [0.38, -5, 8, 1.9, 6.5], [0.7, 4, 9, 2.3, 7]].forEach(([u, off, len, h, w]) => {
    const p = at(PARK.z0 + u * span); kickers.push({ x: p.x - p.dz * off, z: p.z + p.dx * off, dx: p.dx, dz: p.dz, len, h, w });
  });
  [[0.22, 6, 10, 0.55], [0.54, -6, 11, 0.6], [0.88, 0, 12, 0.6]].forEach(([u, off, len, top]) => {
    const p = at(PARK.z0 + u * span); boxes.push({ x: p.x - p.dz * off, z: p.z + p.dx * off, dx: p.dx, dz: p.dz, len, top });
  });
  const local = (o, x, z) => ({ u: (x - o.x) * o.dx + (z - o.z) * o.dz, s: (x - o.x) * o.dz - (z - o.z) * o.dx });
  const kickerH = (x, z) => {
    for (const k of kickers) {
      const { u, s } = local(k, x, z), v = u / k.len;
      if (v < 0 || v > 1) continue;
      const side = clamp((k.w / 2 + 0.8 - Math.abs(s)) / 0.8, 0, 1);
      if (side > 0) return k.h * v * v * sstep(0, 1, side);
    }
    return 0;
  };
  // mallas de los kickers (nieve pisada con labio azul)
  const kMat = new THREE.MeshStandardMaterial({ color: 0xeef4fb, roughness: 0.85 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.5 });
  for (const k of kickers) {
    const NU = 14, NS = 8, pos = [], idx = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NS; j++) {
      const u = (i / NU) * k.len, s = (j / NS - 0.5) * (k.w + 1.6);
      const x = k.x + k.dx * u + k.dz * s, z = k.z + k.dz * u - k.dx * s;
      pos.push(x, T.heightAt(x, z) + kickerH(x, z) + 0.02, z);
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + NS + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, kMat); m.receiveShadow = true; m.castShadow = true; group.add(m);
    const lx = k.x + k.dx * k.len, lz = k.z + k.dz * k.len;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(k.w, 0.08, 0.12), lipMat);
    lip.position.set(lx, T.heightAt(lx, lz) + k.h + 0.03, lz); lip.rotation.y = Math.atan2(k.dx, k.dz); group.add(lip);
  }
  // cajones (siguen el terreno)
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.4, metalness: 0.2 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6 });
  for (const b of boxes) {
    const N = 10, pos = [], idx = [], hw = 0.32;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * b.len, x = b.x + b.dx * u, z = b.z + b.dz * u, y = T.heightAt(x, z) + b.top;
      for (const [s, yy] of [[-hw, y - b.top], [-hw, y], [hw, y], [hw, y - b.top]]) pos.push(x + b.dz * s, yy, z - b.dx * s);
    }
    for (let i = 0; i < N; i++) for (let f = 0; f < 3; f++) { const a = i * 4 + f, c = a + 4; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, boxMat); m.castShadow = true; group.add(m);
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.7, b.top, 0.08), legMat); const ex = b.x + b.dx * b.len, ez = b.z + b.dz * b.len;
    e.position.set(ex, T.heightAt(ex, ez) + b.top / 2, ez); e.rotation.y = Math.atan2(b.dx, b.dz); group.add(e);
  }
  // arco de entrada al snowpark
  const p0 = at(PARK.z0 - 12), arch = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: 0x1b1d23, roughness: 0.5 });
  for (const sg of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 10), post); c.position.set(sg * 16, 3, 0); arch.add(c); }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(32, 5), new THREE.MeshBasicMaterial({ map: bannerTex('SNOWPARK', '#2f6bff'), side: THREE.DoubleSide }));
  banner.position.y = 6.8; arch.add(banner);
  arch.position.set(p0.x, T.heightAt(p0.x, p0.z), p0.z); arch.rotation.y = Math.atan2(p0.dx, p0.dz) + Math.PI;
  group.add(arch);
  return { kickers, boxes, kickerH, local };
}

/* ---------- Minimapa (pistas dibujadas una vez; el punto se mueve) ---------- */
function buildMinimap(canvas, T) {
  if (!canvas) return { draw() {} };
  const S = canvas.width, g = canvas.getContext('2d');
  const base = document.createElement('canvas'); base.width = base.height = S;
  const b = base.getContext('2d');
  const to = (x, z) => [(x + HALF) / (HALF * 2) * S, (z + HALF) / (HALF * 2) * S];
  // relieve
  const img = b.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = -HALF + (i / S) * HALF * 2, z = -HALF + (j / S) * HALF * 2;
    const h = T.heightAt(x, z), hx = T.heightAt(x + 6, z) - h, hz = T.heightAt(x, z + 6) - h;
    const shade = clamp(0.85 - hx * 0.05 + hz * 0.03, 0.5, 1);
    const k = (j * S + i) * 4, v = 205 + 45 * shade;
    img.data[k] = v * 0.93; img.data[k + 1] = v * 0.96; img.data[k + 2] = v; img.data[k + 3] = 235;
  }
  b.putImageData(img, 0, 0);
  for (const p of T.splines) {
    b.strokeStyle = '#' + p.color.toString(16).padStart(6, '0'); b.lineWidth = Math.max(2, p.w / (HALF * 2) * S * 1.4); b.lineCap = 'round';
    b.beginPath(); p.pts.forEach((q, i) => { const [x, y] = to(q.x, q.z); i ? b.lineTo(x, y) : b.moveTo(x, y); }); b.stroke();
  }
  return {
    draw(x, z, h) {
      g.clearRect(0, 0, S, S); g.drawImage(base, 0, 0);
      const [px, py] = to(x, z);
      g.save(); g.translate(px, py); g.rotate(-h);
      g.fillStyle = '#e5233d'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 7); g.lineTo(5, -5); g.lineTo(0, -2); g.lineTo(-5, -5); g.closePath(); g.fill(); g.stroke();
      g.restore();
    },
  };
}

export function createGame(ctx) {
  const { W, camera, S, inL, inR, inJ, store, ui, low, minimap } = ctx;
  const MT = createMountain(W, { low, treeShadow: !low, detail: low ? 0.7 : 1 });
  const T = MT.T;
  const group = new THREE.Group(); W.scene.add(group);
  const park = buildPark(T, group);
  const G = (x, z) => T.heightAt(x, z) + park.kickerH(x, z);
  const map = buildMinimap(minimap, T);

  // árboles en una rejilla para chocar rápido
  const CELL = 12, grid = new Map();
  for (const t of MT.world.trees) { const k = Math.floor(t.x / CELL) + ':' + Math.floor(t.z / CELL); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); }
  function hitTree(x, z) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const L = grid.get((cx + i) + ':' + (cz + j)); if (!L) continue;
      for (const t of L) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz < t.r * t.r) return t; }
    }
    return null;
  }

  // huella y nieve que salta
  const TR = 420;
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR * 6), 3));
  const idx = []; for (let i = 0; i < TR - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tGeo.setIndex(idx);
  const trail = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: 0xb4c4dc, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  trail.frustumCulled = false; group.add(trail);
  const SP = low ? 200 : 360;
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SP * 3), 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.16, map: radialTex(), transparent: true, depthWrite: false, color: 0xffffff }));
  spray.frustumCulled = false; group.add(spray);
  const sprayP = Array.from({ length: SP }, () => ({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));

  // salidas: arriba de cada pista y en el snowpark
  const spawnOf = (id) => {
    if (id === 'park') { const az = T.splines.find((p) => p.id === 'azul'); const p = az.pts.find((q) => q.z > PARK.z0 - 50) || az.pts[0]; return { x: p.x, z: p.z, id: 'azul' }; }
    const sp = T.splines.find((p) => p.id === id) || T.splines[1];
    const p = sp.pts[Math.min(6, sp.pts.length - 1)];
    return { x: p.x, z: p.z, id: sp.id };
  };
  const R = {
    on: false, spawn: 'azul', x: 0, y: 0, z: 0, h: 0, v: 0, vy: 0, roll: 0, hc: 0, pL: 0, pR: 0,
    state: 'ground', spin: 0, spinV: 0, base: 0, air: 0, grab: 0, grabT: 0, charge: 0, jPrev: false, crashT: 0, slideBox: null, slideM: 0,
    time: 0, top: 0, dist: 0, drop: 0, startY: 0, score: 0, combo: 0, comboT: 0, count: 0, where: '', whereT: 0,
    cam: new THREE.Vector3(), look: new THREE.Vector3(), camInit: false, nrm: new THREE.Vector3(0, 1, 0),
  };
  const trailPts = [];
  let trailT = 0;
  const q = new THREE.Quaternion(), qr = new THREE.Quaternion(), qs = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), F = new THREE.Vector3(), Nt = new THREE.Vector3();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), qFlat = new THREE.Quaternion().setFromAxisAngle(AX, -Math.PI / 2);
  Object.assign(W.key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 });
  W.key.shadow.camera.updateProjectionMatrix();

  const grad = (x, z, out) => { const e = 1.2; return out.set((G(x + e, z) - G(x - e, z)) / (2 * e), 0, (G(x, z + e) - G(x, z - e)) / (2 * e)); };
  const _g = new THREE.Vector3();
  function placeAt(id) {
    const s = spawnOf(id);
    R.x = s.x; R.z = s.z; R.y = G(R.x, R.z);
    grad(R.x, R.z, _g); R.h = Math.atan2(-_g.x, -_g.z);   // mirando hacia abajo
    R.v = 0; R.vy = 0; R.state = 'ground'; R.spin = 0; R.spinV = 0; R.base = 0; R.roll = 0; R.hc = R.h; R.camInit = false; R.startY = R.y; R.charge = 0;
    trailPts.length = 0;
  }
  function start(spawn) {
    prevSpawn = null;
    Object.assign(R, { on: true, spawn, time: 0, top: 0, dist: 0, drop: 0, score: 0, combo: 0, comboT: 0, count: 2.2, where: '' });
    placeAt(spawn);
    camera.fov = 58; camera.near = 0.15; camera.far = 3200; camera.updateProjectionMatrix();
    ui.start(spawn);
  }
  function stop() { R.on = false; ui.stop(); }
  function lift() { // telesilla: vuelves arriba al punto de salida elegido
    placeAt(R.spawn); R.count = 1.2;
    ui.msg('Telesilla ⤒');
  }
  function normalAt(x, z, out) { const e = 0.5; return out.set(-(G(x + e, z) - G(x - e, z)) / (2 * e), 1, -(G(x, z + e) - G(x, z - e)) / (2 * e)).normalize(); }
  function burst(n, power) {
    for (const s of sprayP) {
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
    const k = Math.round(R.spin / Math.PI), dev = Math.abs(R.spin - k * Math.PI), deg = Math.abs(k) * 180;
    if (dev > 0.62 && R.air > 0.25) { crash('¡Al suelo!'); return; }
    R.base += k * Math.PI; R.spin = 0; R.spinV = 0;
    burst(26, 2.2);
    if (R.air < 0.35 && deg === 0 && R.grabT < 0.2) return;
    let pts = Math.round(R.air * 120) + (SPIN_PTS[Math.min(deg, 1080)] || 0);
    const grab = R.grabT > 0.25;
    if (grab) pts += 250;
    R.combo = R.comboT > 0 ? R.combo + 1 : 1; R.comboT = 3.5;
    pts = Math.round(pts * (1 + (R.combo - 1) * 0.25));
    R.score += pts;
    const name = [deg ? `${deg}` : '', grab ? 'Indy' : '', !deg && !grab ? (R.air > 0.9 ? 'Big Air' : 'Ollie') : ''].filter(Boolean).join(' ');
    ui.trick(name, pts, R.combo);
  }
  function crash(text) {
    R.state = 'crash'; R.crashT = 1.5; R.spinV = 0; R.grab = 0; R.combo = 0;
    burst(60, 3.5);
    ui.msg(text, true);
  }
  const slideName = () => (Math.abs(Math.round(R.spin / (Math.PI / 2))) % 2 ? 'Boardslide' : '50-50');
  function whereAmI() {
    const { m, id } = T.maskAt(R.x, R.z);
    if (R.z > 690) return 'El pueblo';
    if ([...park.kickers, ...park.boxes].some((o) => Math.hypot(o.x - R.x, o.z - R.z) < 45)) return 'Snowpark';
    if (m > 0.45 && id >= 0) return T.splines[id].name;
    return hitTree(R.x, R.z + 0.01) || nearTrees() ? 'Bosque' : 'Fuera de pista';
  }
  function nearTrees() { const cx = Math.floor(R.x / CELL), cz = Math.floor(R.z / CELL); return (grid.get(cx + ':' + cz) || []).length > 3; }

  function update(dt, t) {
    const dir = Math.sign(S.dir) || 1;
    R.pL = damp(R.pL, inL() ? 1 : 0, 10, dt);
    R.pR = damp(R.pR, inR() ? 1 : 0, 10, dt);
    S.pL = R.pL; S.pR = R.pR;
    const d = R.pL - R.pR;
    const j = inJ();
    if (R.count > 0) { R.count -= dt; if (R.count <= 0) ui.msg('¡A bajar!'); }
    R.comboT = Math.max(0, R.comboT - dt);
    let hdot = 0;
    const live = R.count <= 0;
    grad(R.x, R.z, _g);
    const slope = Math.hypot(_g.x, _g.z), fall = Math.atan2(-_g.x, -_g.z);

    if (R.state === 'crash') {
      R.crashT -= dt;
      R.v = damp(R.v, 0, 3, dt);
      R.x += Math.sin(R.h) * R.v * dt; R.z += Math.cos(R.h) * R.v * dt;
      R.y = G(R.x, R.z);
      if (R.crashT <= 0) { R.state = 'ground'; R.base = 0; R.spin = 0; R.h = fall; R.v = 1.2; }
    } else if (R.state === 'air') {
      R.air += dt; R.time += dt;
      R.vy -= 11 * dt; R.y += R.vy * dt;
      R.x += Math.sin(R.h) * R.v * dt; R.z += Math.cos(R.h) * R.v * dt;
      R.spinV = damp(R.spinV, d * 7.5, 8, dt);
      R.spin += R.spinV * dt;
      R.grab = damp(R.grab, j && R.air > 0.12 ? 1 : 0, 10, dt);
      if (R.grab > 0.6) R.grabT += dt;
      for (const b of park.boxes) {
        const L = park.local(b, R.x, R.z), top = T.heightAt(R.x, R.z) + b.top;
        if (R.vy < 0 && L.u > 0 && L.u < b.len && Math.abs(L.s) < 0.55 && R.y <= top + 0.1 && R.y > top - 0.5) {
          R.state = 'slide'; R.slideBox = b; R.y = top; R.vy = 0; R.slideM = 0; R.h = Math.atan2(b.dx, b.dz); R.grab = 0;
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
      const b = R.slideBox, L = park.local(b, R.x, R.z);
      R.x -= b.dz * L.s * Math.min(1, 12 * dt); R.z += b.dx * L.s * Math.min(1, 12 * dt);
      R.v = Math.max(3, R.v - 0.8 * dt);
      R.x += b.dx * R.v * dt; R.z += b.dz * R.v * dt; R.slideM += R.v * dt; R.time += dt;
      R.y = T.heightAt(R.x, R.z) + b.top;
      let off = false;
      if (j && !R.jPrev) { R.state = 'air'; R.vy = 3.5; R.air = 0.15; R.grabT = 0; off = true; }
      if (park.local(b, R.x, R.z).u > b.len) { R.state = 'air'; R.vy = 0.5; R.air = 0.2; R.grabT = 0; off = true; }
      if (off) { const pts = Math.round(R.slideM * 60); R.score += pts; ui.trick(slideName(), pts, 0); }
    } else if (live) {
      // giro con los pedales (más rápido despacio, más estable deprisa)
      hdot = d * (1.6 - Math.min(R.v, 20) * 0.03);
      R.h = wrap(R.h + hdot * dt);
      // gravedad a lo largo de la dirección de la tabla
      F.set(Math.sin(R.h), 0, Math.cos(R.h));
      const along = -(_g.x * F.x + _g.z * F.z);           // >0 si miras cuesta abajo
      let a = 9.8 * along / Math.sqrt(1 + slope * slope);
      const { m } = T.maskAt(R.x, R.z);
      const powder = 1 - m;                                  // fuera de pista frena un poco más
      a -= 0.25 + 0.06 * R.v * (1 + powder * 0.8) + 0.0045 * R.v * R.v + Math.abs(hdot) * 0.12 * R.v;
      R.v = clamp(R.v + a * dt, 0, 26);
      // casi parado y mirando cuesta arriba: la tabla se pone sola hacia abajo
      if (R.v < 2.5 && Math.abs(d) < 0.1) R.h = wrap(R.h + wrap(fall - R.h) * Math.min(1, 1.4 * dt) * (slope > 0.05 ? 1 : 0));
      const g0 = G(R.x, R.z);
      R.x += Math.sin(R.h) * R.v * dt; R.z += Math.cos(R.h) * R.v * dt;
      // borde del mundo
      const lim = HALF * 0.94;
      if (Math.abs(R.x) > lim || Math.abs(R.z) > lim) { R.x = clamp(R.x, -lim, lim); R.z = clamp(R.z, -lim, lim); R.h = wrap(R.h + Math.PI * 0.6); R.v *= 0.4; ui.msg('Fin de la estación'); }
      const g1 = G(R.x, R.z);
      const vyGround = (g1 - g0) / Math.max(dt, 1e-3);
      if (j) R.charge = Math.min(1, R.charge + dt * 2.2);
      if (!j && R.jPrev) { R.state = 'air'; R.vy = Math.max(vyGround, 0) + 3.2 + R.charge * 2.8; R.air = 0; R.grabT = 0; R.charge = 0; burst(12, 1.2); }
      else if (R.vy > 1.2 && vyGround < R.vy - 6) { R.state = 'air'; R.air = 0; R.grabT = 0; R.y = g0; }
      else { R.vy = vyGround; R.y = g1; }
      if (!j) R.charge = damp(R.charge, 0, 6, dt);
      // árboles
      const tr = R.state === 'ground' && hitTree(R.x, R.z);
      if (tr) {
        const dx = R.x - tr.x, dz = R.z - tr.z, l = Math.hypot(dx, dz) || 1;
        R.x = tr.x + (dx / l) * (tr.r + 0.05); R.z = tr.z + (dz / l) * (tr.r + 0.05);
        if (R.v > 7) crash('¡Árbol!'); else { R.v *= 0.3; R.h = wrap(R.h + Math.sign(wrap(Math.atan2(dx, dz) - R.h)) * 0.6); }
      }
      R.time += dt; R.dist += R.v * dt;
      R.top = Math.max(R.top, R.v);
    } else R.y = G(R.x, R.z);
    R.jPrev = j;
    R.drop = Math.max(R.drop, R.startY - R.y);

    // Orientación sobre el terreno
    if (R.state === 'air') R.nrm.lerp(AY, 1 - Math.exp(-3 * dt)).normalize();
    else if (R.state === 'slide') R.nrm.copy(AY);
    else R.nrm.lerp(normalAt(R.x, R.z, Nt), 1 - Math.exp(-14 * dt)).normalize();
    Y.copy(R.nrm);
    F.set(Math.sin(R.h), 0, Math.cos(R.h));
    X.copy(F).multiplyScalar(dir); X.addScaledVector(Y, -X.dot(Y)).normalize();
    Z.crossVectors(X, Y).normalize();
    m4.makeBasis(X, Y, Z); q.setFromRotationMatrix(m4);
    qs.setFromAxisAngle(Y, R.base + R.spin); q.premultiply(qs);
    let rollT = R.state === 'ground' ? clamp(-hdot * dir * (0.1 + R.v * 0.03), -0.8, 0.8) : 0;
    if (R.state === 'crash') rollT = 1.3 * Math.sin(Math.min(1, (1.5 - R.crashT) * 2) * Math.PI * 0.5);
    R.roll = damp(R.roll, rollT, R.state === 'crash' ? 8 : 6, dt);
    qr.setFromAxisAngle(AX, R.roll); q.multiply(qr);
    W.rig.quaternion.copy(q);
    W.rig.position.set(R.x, R.y + 0.012, R.z);
    W.boardGroup.rotation.set(0, 0, 0);

    const gy = G(R.x, R.z), hAbove = Math.max(0, R.y - gy);
    W.shadow.position.set(R.x, gy + 0.03, R.z);
    W.shadow.quaternion.copy(q).multiply(qFlat);
    W.shadow.material.opacity = 0.35 * clamp(1 - hAbove / 4, 0.15, 1);
    W.shadow.scale.setScalar(1 + hAbove * 0.15);
    MT.sunAt(R.x, R.y, R.z, 60);

    // Cámara de persecución (siempre por encima de la nieve)
    R.hc = R.hc + wrap(R.h - R.hc) * (1 - Math.exp(-2.6 * dt));
    const bx = Math.sin(R.hc), bz = Math.cos(R.hc);
    const back = 5.0 + Math.min(R.v, 22) * 0.08;
    const cx = R.x - bx * back, cz = R.z - bz * back;
    const cy = Math.max(G(cx, cz) + 1.7, R.y + 2.2 + (R.state === 'air' ? 0.6 : 0));
    if (!R.camInit) { R.cam.set(cx, cy, cz); R.look.set(R.x, R.y + 0.6, R.z); R.camInit = true; }
    R.cam.set(damp(R.cam.x, cx, 7, dt), damp(R.cam.y, cy, 5, dt), damp(R.cam.z, cz, 7, dt));
    R.look.set(damp(R.look.x, R.x + bx * 3, 9, dt), damp(R.look.y, R.y - 0.1, 7, dt), damp(R.look.z, R.z + bz * 3, 9, dt));
    camera.position.copy(R.cam); camera.lookAt(R.look);
    MT.update(t, dt, camera);

    // Huella
    trailT += dt;
    if (R.v > 0.4 && trailT > 0.06 && R.state === 'ground') {
      trailT = 0;
      trailPts.push({ x: R.x, z: R.z, px: Math.cos(R.h), pz: -Math.sin(R.h), w: 0.11 + Math.abs(R.roll) * 0.08 });
      if (trailPts.length > TR) trailPts.shift();
    } else if (R.state !== 'ground' && trailPts.length && trailPts[trailPts.length - 1].w > 0) trailPts.push({ x: R.x, z: R.z, px: 0, pz: 0, w: 0 });
    const arr = trail.geometry.attributes.position.array, n = trailPts.length;
    for (let i = 0; i < TR; i++) {
      const p = trailPts[Math.min(i, n - 1)] || { x: R.x, z: R.z, px: 0, pz: 0, w: 0 };
      const w = i < n ? p.w * Math.min(1, (i + 1) / 20) : 0, yy = (p.y ??= G(p.x, p.z) + 0.03);
      arr[i * 6] = p.x + p.px * w; arr[i * 6 + 1] = yy; arr[i * 6 + 2] = p.z + p.pz * w;
      arr[i * 6 + 3] = p.x - p.px * w; arr[i * 6 + 4] = yy; arr[i * 6 + 5] = p.z - p.pz * w;
    }
    trail.geometry.attributes.position.needsUpdate = true;

    const sa = spray.geometry.attributes.position.array;
    let e = R.state === 'ground' ? (Math.abs(hdot) * R.v > 2 ? 3 : R.v > 12 ? 1 : 0) : 0;
    for (let i = 0; i < sprayP.length; i++) {
      const s = sprayP[i];
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
    spray.geometry.attributes.position.needsUpdate = true;

    R.whereT -= dt;
    if (R.whereT <= 0) { R.whereT = 0.4; const w = whereAmI(); if (w !== R.where) { R.where = w; ui.where(w); } }
    map.draw(R.x, R.z, R.h);
    ui.hud({ kmh: R.v * 3.6, time: R.time, drop: R.drop, dist: R.dist, score: R.score, charge: R.charge, state: R.state });

    const crashing = R.state === 'crash';
    return {
      crouch: crashing ? 1.0 : 0.52 + Math.min(R.v / 20, 1) * 0.12 + Math.abs(R.roll) * 0.3 + R.charge * 0.45 + (R.state === 'air' ? 0.15 : 0),
      shiftX: d * 0.08, shiftZ: crashing ? 0.25 : R.roll * 0.4,
      lookYaw: dir * 0.95 + hdot * 0.15 - (R.state === 'air' ? R.spinV * 0.06 : 0),
      arms: 0.45 + Math.abs(R.roll) * 0.4 + (R.state === 'air' ? 0.3 : 0), grab: R.grab, flail: crashing ? 0.8 : 0, dir,
      flakeAt: R.look,
    };
  }
  // menú: tu rider en la salida elegida, con la cámara dando vueltas
  let prevSpawn = null;
  function preview(spawn, t, dt) {
    if (spawn !== prevSpawn) { placeAt(spawn); prevSpawn = spawn; }
    R.count = 99;
    const o = update(dt, t);
    const a = t * 0.22 + 2.2, r = 6.2;
    const cx = R.x + Math.sin(a) * r, cz = R.z + Math.cos(a) * r;
    camera.position.set(cx, Math.max(G(cx, cz) + 1.2, R.y + 2.0), cz);
    camera.lookAt(R.x, R.y + 0.85, R.z);
    MT.update(t, 0, camera);
    return o;
  }
  return { start, stop, update, lift, preview, MT, get on() { return R.on; }, debug: R, SUN };
}

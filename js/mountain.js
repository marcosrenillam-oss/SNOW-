// Mundo compartido (web + juego): una montaña nevada abierta, estilizada y limpia.
// Coordenadas en metros. La cima queda hacia -Z, el pueblo hacia +Z. En el origen hay una explanada plana (zona de prácticas).
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += noise(x * f, y * f) * a; a *= 0.5; f *= 2.03; } return s; }
function ridged(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { const n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1); s += n * n * a; a *= 0.5; f *= 2.05; } return s; }

export const SIZE = 1800, HALF = 900;
// Sol: delante-arriba de la cámara de la clase, así la tabla queda bien iluminada y el sol brilla en las bajadas
export const SUN = new THREE.Vector3(0.6, 0.3, 0.74).normalize();

// Pistas: puntos de control (x, z), ancho y color
export const PISTES = [
  { id: 'verde', name: 'Pista verde · El Bosque', color: 0x2fb36b, w: 34, pts: [[-60, -620], [-180, -480], [-260, -300], [-180, -140], [-60, -40], [0, 0], [40, 120], [-60, 280], [-200, 430], [-140, 600], [-20, 720]] },
  { id: 'azul', name: 'Pista azul · Los Lagos', color: 0x2f6bff, w: 30, pts: [[40, -690], [90, -520], [60, -360], [10, -200], [0, -80], [0, 0], [30, 90], [120, 220], [200, 380], [150, 540], [40, 720]] },
  { id: 'roja', name: 'Pista roja · El Cuello', color: 0xe5233d, w: 24, pts: [[180, -760], [260, -600], [330, -430], [300, -260], [380, -100], [430, 80], [380, 260], [300, 440], [230, 600], [120, 730]] },
  { id: 'negra', name: 'Pista negra · La Pared', color: 0x16181d, w: 20, pts: [[-300, -760], [-380, -580], [-450, -400], [-430, -200], [-500, 0], [-460, 220], [-380, 420], [-280, 620], [-120, 740]] },
];
export const PARK = { z0: 120, z1: 330 };   // tramo de la pista azul con kickers y cajones

function spline(pts, step = 4) {
  const out = [];
  const P = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const c = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const L = c.getLength(), n = Math.ceil(L / step);
  for (let i = 0; i <= n; i++) out.push(c.getPointAt(i / n));
  return { pts: out, length: L, curve: c };
}

export function buildTerrain({ res = 361, seed = 7, terrace = null } = {}) {
  const N = res, cell = SIZE / (N - 1);
  const H = new Float32Array(N * N);
  const mask = new Float32Array(N * N);   // 0..1 cuánto es pista
  const pisteId = new Int8Array(N * N).fill(-1);
  const splines = PISTES.map((p) => ({ ...p, ...spline(p.pts) }));
  // estampar las pistas en la máscara
  splines.forEach((p, pi) => {
    for (const q of p.pts) {
      const r = p.w * 0.5 + 10;
      const i0 = Math.floor((q.x + HALF - r) / cell), i1 = Math.ceil((q.x + HALF + r) / cell);
      const j0 = Math.floor((q.z + HALF - r) / cell), j1 = Math.ceil((q.z + HALF + r) / cell);
      for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) {
        const x = -HALF + i * cell, z = -HALF + j * cell;
        const d = Math.hypot(x - q.x, z - q.z);
        const m = 1 - sstep(p.w * 0.5, p.w * 0.5 + 10, d);
        const k = j * N + i;
        if (m > mask[k]) { mask[k] = m; if (m > 0.5) pisteId[k] = pi; }
      }
    }
  });
  // altura
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -HALF + i * cell, z = -HALF + j * cell, k = j * N + i;
    let h = -0.34 * z;                                                    // ladera principal
    h += 170 * Math.exp(-Math.pow((z + 760) / 230, 2)) * (0.6 + 0.6 * ridged(x / 260 + 3, 1.7));   // cumbres
    h += 130 * (1 - Math.exp(-Math.pow(x / 470, 2)));                    // laderas del valle
    const rough = (ridged(x / 210, z / 210) - 0.35) * 70 + (fbm(x / 60, z / 60) - 0.5) * 10;
    h += rough * (1 - 0.92 * mask[k]);
    h += (fbm(x / 140 + 9, z / 140) - 0.5) * 18 * mask[k];              // la pista ondula suave
    // explanada plana en el origen (zona de prácticas)
    const rp = Math.hypot(x, z);
    const plat = 1 - sstep(55, 140, rp);
    h = h * (1 - plat);
    H[k] = h;
  }
  // suavizado ligero de las pistas
  const tmp = new Float32Array(H);
  for (let pass = 0; pass < 2; pass++) for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const k = j * N + i;
    if (mask[k] < 0.05) continue;
    const avg = (tmp[k - 1] + tmp[k + 1] + tmp[k - N] + tmp[k + N] + tmp[k] * 2) / 6;
    H[k] = tmp[k] + (avg - tmp[k]) * mask[k];
  }
  // mirador: una terraza plana en cualquier punto (la web la usa de plató)
  if (terrace) {
    const [tx, tz, tr = 34] = terrace;
    const fx = (tx + HALF) / cell, fz = (tz + HALF) / cell, hc = H[Math.round(fz) * N + Math.round(fx)];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const d = Math.hypot(-HALF + i * cell - tx, -HALF + j * cell - tz);
      if (d > tr + 90) continue;
      const k = j * N + i, f = 1 - sstep(tr, tr + 90, d);
      H[k] = H[k] + (hc - H[k]) * f;
    }
  }
  const near = (x, z, r) => Math.hypot(x, z) < r || (terrace && Math.hypot(x - terrace[0], z - terrace[1]) < r);
  const heightAt = (x, z) => {
    const fx = clamp((x + HALF) / cell, 0, N - 1.001), fz = clamp((z + HALF) / cell, 0, N - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * N + i;
    return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + N] * (1 - u) + H[k + N + 1] * u) * v;
  };
  const maskAt = (x, z) => {
    const i = clamp(Math.round((x + HALF) / cell), 0, N - 1), j = clamp(Math.round((z + HALF) / cell), 0, N - 1);
    return { m: mask[j * N + i], id: pisteId[j * N + i] };
  };
  return { N, cell, H, mask, pisteId, splines, heightAt, maskAt, near, terrace };
}

/* ---------- Cielo animado (degradado, sol y nubes suaves en shader) ---------- */
export function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN.clone() }, uTop: { value: new THREE.Color('#3f7fd6') }, uHor: { value: new THREE.Color('#eceef1') }, uWarm: { value: new THREE.Color('#ffbf8a') } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; uniform vec3 uSun, uTop, uHor, uWarm; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += n(p) * a; p *= 2.07; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uHor, uTop, smoothstep(0.0, 0.55, y));
        float sd = max(0.0, dot(d, uSun));
        col = mix(col, uWarm, pow(sd, 6.0) * 0.45 * (1.0 - smoothstep(0.0, 0.6, y)));
        col += vec3(1.0, 0.93, 0.82) * pow(sd, 400.0) * 3.0 + vec3(1.0, 0.9, 0.75) * pow(sd, 24.0) * 0.25;
        if (d.y > 0.02) {
          vec2 uv = d.xz / (d.y + 0.25) * 1.4 + vec2(uTime * 0.006, uTime * 0.002);
          float c = smoothstep(0.52, 0.85, fbm(uv));
          vec3 cc = mix(vec3(1.0), uWarm, 0.25 * pow(sd, 3.0));
          col = mix(col, cc, c * 0.75 * smoothstep(0.02, 0.25, d.y));
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24), mat);
  sky.renderOrder = -20; sky.frustumCulled = false;
  return sky;
}

/* ---------- Árboles, rocas, telesillas, pueblo y esquiadores ---------- */
function pineGeo(seed, low = false) {
  const r = rnd(seed); const pos = [], col = [];
  const greens = ['#1f3a33', '#244136', '#2b4a3c'].map((c) => new THREE.Color(c)), snow = new THREE.Color('#f2f6fb'), bark = new THREE.Color('#4a3527');
  const tri = (a, b, c, k) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(k.r, k.g, k.b); };
  const H = 7.5, T = low ? 4 : 6;
  for (let t = 0; t < T; t++) {
    const u = t / (T - 1), y0 = 1.2 + u * (H - 2.2), rad = 2.4 * (1 - u * 0.85) + 0.25, seg = low ? 7 : 9;
    const apex = [0, y0 + 1.6 - u * 0.4, 0];
    const ring = [];
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2 + r() * 0.25, rr = rad * (0.85 + r() * 0.25); ring.push([Math.cos(a) * rr, y0 - 0.25 - r() * 0.35, Math.sin(a) * rr]); }
    for (let i = 0; i < seg; i++) { const A = ring[i], B = ring[(i + 1) % seg]; tri(apex, B, A, greens[(i + t) % 3]); }
    // base del piso (cierra por debajo)
    for (let i = 0; i < seg; i++) { const A = ring[i], B = ring[(i + 1) % seg]; tri([0, y0 - 0.1, 0], A, B, greens[0]); }
  }
  for (let i = 0; i < 5; i++) { const a0 = (i / 5) * Math.PI * 2, a1 = ((i + 1) / 5) * Math.PI * 2; const p0 = [Math.cos(a0) * 0.25, 0, Math.sin(a0) * 0.25], p1 = [Math.cos(a1) * 0.25, 0, Math.sin(a1) * 0.25], q0 = [Math.cos(a0) * 0.15, 1.5, Math.sin(a0) * 0.15], q1 = [Math.cos(a1) * 0.15, 1.5, Math.sin(a1) * 0.15]; tri(p0, q0, p1, bark); tri(p1, q0, q1, bark); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i += 3) { if (pos[i * 3 + 1] > 1.2 && n.getY(i) > 0.55) for (let k = 0; k < 3; k++) { col[(i + k) * 3] = snow.r; col[(i + k) * 3 + 1] = snow.g; col[(i + k) * 3 + 2] = snow.b; } }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function buildMountainWorld(T, { low = false, detail = 1, snowNormal, treeShadow = false, extras = true } = {}) {
  const group = new THREE.Group();
  const { N, cell, H, mask } = T;
  // ---- terreno ----
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N - 1, N - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let k = 0; k < pos.count; k++) pos.setY(k, H[k]);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal, cols = new Float32Array(pos.count * 3);
  const snowA = new THREE.Color('#e7eef7'), snowB = new THREE.Color('#b7c9e2'), piste = new THREE.Color('#fbfcff'), edgeC = new THREE.Color('#c9d6e8'), rock = new THREE.Color('#5b6270'), rockD = new THREE.Color('#3c414b'), c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), ny = nrm.getY(k), m = mask[k];
    // concavidad (oclusión barata): comparar con vecinos
    const i = k % N, j = Math.floor(k / N);
    const nb = (H[Math.max(0, k - 1)] + H[Math.min(H.length - 1, k + 1)] + H[Math.max(0, k - N)] + H[Math.min(H.length - 1, k + N)]) / 4;
    const ao = clamp((nb - H[k]) * 0.06, -0.15, 0.35);
    c.copy(snowA).lerp(snowB, clamp(0.25 + ao + (1 - ny) * 0.8, 0, 1));
    if (m > 0.4) c.lerp(piste, m * 0.85);
    const edge = sstep(0.15, 0.45, m) * (1 - sstep(0.55, 0.9, m));
    if (edge > 0) c.lerp(edgeC, edge * 0.6);
    const steep = sstep(0.72, 0.58, ny) * (1 - m);
    if (steep > 0) c.lerp(noise(x / 30, z / 30) > 0.5 ? rock : rockD, steep * 0.95);
    cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
  if (snowNormal) { const t = snowNormal.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(SIZE / 7, SIZE / 7); terrainMat.normalMap = t; terrainMat.normalScale = new THREE.Vector2(0.55, 0.55); }
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.receiveShadow = true;
  group.add(terrain);

  const r = rnd(31);
  // ---- árboles (bosques fuera de pista, por debajo del límite del bosque) ----
  const treeGeos = [pineGeo(3, low), pineGeo(11, low)];
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const want = Math.round((low ? 1800 : 4200) * detail);
  const trees = [], tm = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  let guard = 0;
  while (trees.length < want && guard++ < want * 20) {
    const x = (r() - 0.5) * SIZE * 0.96, z = (r() - 0.5) * SIZE * 0.96;
    const y = T.heightAt(x, z), mk = T.maskAt(x, z).m;
    if (mk > 0.05 || y > 170 || T.near(x, z, 90)) continue;
    const e = 1.5, gx = (T.heightAt(x + e, z) - T.heightAt(x - e, z)) / (2 * e), gz = (T.heightAt(x, z + e) - T.heightAt(x, z - e)) / (2 * e);
    if (Math.hypot(gx, gz) > 0.75) continue;
    if (fbm(x / 120, z / 120) < 0.43) continue;      // claros entre bosques
    trees.push({ x, y, z, s: 0.7 + r() * 0.8 });
  }
  // por trozos de montaña: cada trozo se descarta solo si no se ve (cámara y sombras)
  const CH = 4, buckets = new Map();
  trees.forEach((t, i) => {
    const key = Math.min(CH - 1, Math.floor((t.x + HALF) / (SIZE / CH))) * CH + Math.min(CH - 1, Math.floor((t.z + HALF) / (SIZE / CH)));
    const k = (key * 2 + (i % 2));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(t); t.r = 1.15 * t.s;
  });
  for (const [k, list] of buckets) {
    const m = new THREE.InstancedMesh(treeGeos[k % 2], treeMat, list.length);
    list.forEach((t, i) => { p3.set(t.x, t.y - 0.3, t.z); q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r() * 6); s3.set(t.s, t.s * (0.85 + r() * 0.3), t.s); tm.compose(p3, q, s3); m.setMatrixAt(i, tm); });
    m.computeBoundingSphere(); m.castShadow = treeShadow; m.receiveShadow = false; group.add(m);
  }

  // ---- rocas en zonas empinadas ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5f6672, roughness: 0.95, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, low ? 160 : 380);
  let rc = 0; guard = 0;
  while (rc < rocks.count && guard++ < 20000) {
    const x = (r() - 0.5) * SIZE * 0.9, z = (r() - 0.5) * SIZE * 0.9;
    if (T.maskAt(x, z).m > 0.05) continue;
    const e = 2, gx = (T.heightAt(x + e, z) - T.heightAt(x - e, z)) / (2 * e), gz = (T.heightAt(x, z + e) - T.heightAt(x, z - e)) / (2 * e);
    if (Math.hypot(gx, gz) < 0.6) continue;
    const s = 1.5 + r() * 5;
    p3.set(x, T.heightAt(x, z) - s * 0.3, z); q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)); s3.set(s, s * (0.5 + r() * 0.5), s * (0.8 + r() * 0.4));
    tm.compose(p3, q, s3); rocks.setMatrixAt(rc++, tm);
  }
  group.add(rocks);

  // ---- jalones de las pistas (color de cada pista) ----
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6).translate(0, 0.8, 0);
  for (const p of extras ? T.splines : []) {
    const n = Math.floor(p.pts.length / 6) * 2;
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5 }), n);
    let pc = 0;
    for (let i = 0; i < p.pts.length - 1 && pc < n; i += 6) {
      const a = p.pts[i], b = p.pts[Math.min(i + 1, p.pts.length - 1)];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      for (const sgn of [-1, 1]) { const x = a.x - (dz / l) * sgn * (p.w * 0.5 + 1), z = a.z + (dx / l) * sgn * (p.w * 0.5 + 1); if (T.near(x, z, 85)) continue; tm.makeTranslation(x, T.heightAt(x, z), z); poles.setMatrixAt(pc++, tm); }
    }
    poles.count = pc; group.add(poles);
  }

  // ---- telesillas (sillas en movimiento) ----
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xb9bfc8, metalness: 0.6, roughness: 0.4 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1b1d23, roughness: 0.6 });
  const lifts = [], towerParts = [];
  const LIFTS = extras ? [[[70, 700], [35, 60]], [[150, 40], [210, -700]], [[-260, 690], [-320, -560]]] : [];
  for (const [[x0, z0], [x1, z1]] of LIFTS) {
    const tops = [], L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 60);
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, y = T.heightAt(x, z);
      towerParts.push(new THREE.CylinderGeometry(0.35, 0.5, 12, 8).translate(x, y + 6, z));
      towerParts.push(new THREE.BoxGeometry(4.6, 0.35, 0.35).rotateY(Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2).translate(x, y + 11.8, z));
      tops.push(new THREE.Vector3(x, y + 11.5, z));
    }
    const dirX = (z1 - z0) / L, dirZ = -(x1 - x0) / L;   // perpendicular al cable
    for (const sgn of [-1, 1]) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tops.map((v) => v.clone().add(new THREE.Vector3(dirX * 2 * sgn, 0, dirZ * 2 * sgn)))), new THREE.LineBasicMaterial({ color: 0x2a2d33 })));
    const nC = Math.floor(L / 22);
    const seat = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.9, 0.7).translate(0, -2.2, 0), chairMat, nC * 2);
    group.add(seat);
    lifts.push({ tops, n: nC, seat, dirX, dirZ });
  }

  if (towerParts.length) group.add(new THREE.Mesh(mergeGeometries(towerParts), towerMat));

  // ---- pueblo (chalets con tejado nevado y ventanas encendidas) ----
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5d3b, roughness: 0.85 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xcfc8be, roughness: 0.9 });
  const roofSnow = new THREE.MeshStandardMaterial({ color: 0xf5f8fc, roughness: 0.9 });
  const win = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb860, emissiveIntensity: 0.9 });
  const vg = { stone: [], wood: [], roof: [], win: [] };
  const _o = new THREE.Object3D();
  const put = (arr, geo, x, y, z, ry, local) => { _o.position.set(x, y, z); _o.rotation.set(0, ry, 0); _o.updateMatrix(); arr.push(geo.applyMatrix4(local).applyMatrix4(_o.matrix)); };
  for (let i = 0; i < (low ? 10 : 18); i++) {
    const x = -260 + r() * 520, z = 700 + r() * 150;
    if (T.maskAt(x, z).m > 0.2) continue;
    const y = T.heightAt(x, z) - 0.5, w = 9 + r() * 8, d = 8 + r() * 6, h = 6 + r() * 6, ry = (r() - 0.5) * 0.6;
    put(vg.stone, new THREE.BoxGeometry(w, h * 0.45, d), x, y, z, ry, new THREE.Matrix4().makeTranslation(0, h * 0.22, 0));
    put(vg.wood, new THREE.BoxGeometry(w, h * 0.55, d), x, y, z, ry, new THREE.Matrix4().makeTranslation(0, h * 0.72, 0));
    put(vg.roof, new THREE.CylinderGeometry(0.01, w * 0.72, 4.5, 4, 1), x, y, z, ry, new THREE.Matrix4().compose(new THREE.Vector3(0, h + 2.1, 0), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 4), new THREE.Vector3(1, 1, d / w)));
    for (let k = 0; k < 3; k++) put(vg.win, new THREE.PlaneGeometry(1.4, 1.2), x, y, z, ry, new THREE.Matrix4().makeTranslation(-w / 3 + k * w / 3, h * 0.7, d / 2 + 0.02));
  }
  for (const [k, m] of [['stone', stone], ['wood', wood], ['roof', roofSnow], ['win', win]]) if (vg[k].length) group.add(new THREE.Mesh(mergeGeometries(vg[k].map((g) => g.toNonIndexed ? g.toNonIndexed() : g)), m));

  // ---- esquiadores que bajan por las pistas (vida en la montaña) ----
  const skierGeo = new THREE.CapsuleGeometry(0.32, 0.9, 4, 8).translate(0, 1.1, 0);
  const jackets = [0xe5233d, 0x2f6bff, 0xffb020, 0x1b1d23, 0x2fb36b, 0xffffff];
  const skiers = [];
  const skierInst = new THREE.InstancedMesh(skierGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), extras ? (low ? 24 : 60) : 0);
  for (let i = 0; i < skierInst.count; i++) {
    const p = T.splines[i % T.splines.length];
    skiers.push({ p, u: r(), speed: (6 + r() * 8) / p.length, off: (r() - 0.5) * p.w * 0.7, ph: r() * 6 });
    skierInst.setColorAt(i, new THREE.Color(jackets[i % jackets.length]));
  }
  if (extras) group.add(skierInst);

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();
  return {
    group, terrain, trees, skiers,
    update(t, dt) {
      for (const L of lifts) {
        for (let i = 0; i < L.n * 2; i++) {
          const up = i < L.n, u = (((i % L.n) / L.n + t * 0.0045 * (up ? 1 : -1)) % 1 + 1) % 1;
          const f = u * (L.tops.length - 1), a = Math.floor(f), b = Math.min(a + 1, L.tops.length - 1);
          _p.copy(L.tops[a]).lerp(L.tops[b], f - a); _p.x += L.dirX * 2 * (up ? 1 : -1); _p.z += L.dirZ * 2 * (up ? 1 : -1);
          _m.makeTranslation(_p.x, _p.y, _p.z); L.seat.setMatrixAt(i, _m);
        }
        L.seat.instanceMatrix.needsUpdate = true;
      }
      for (let i = 0; i < skiers.length; i++) {
        const s = skiers[i];
        s.u = (s.u + s.speed * dt) % 1;
        const idx = Math.floor(s.u * (s.p.pts.length - 1)), a = s.p.pts[idx], b = s.p.pts[Math.min(idx + 1, s.p.pts.length - 1)];
        const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
        const wig = Math.sin(t * 0.9 + s.ph) * s.p.w * 0.3 + s.off;
        const x = a.x - (dz / l) * wig, z = a.z + (dx / l) * wig;
        _p.set(x, T.heightAt(x, z), z);
        _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(dx, dz));
        _m.compose(_p, _q, new THREE.Vector3(1, 1, 1)); skierInst.setMatrixAt(i, _m);
      }
      skierInst.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ---------- Cordillera lejana (cierra el horizonte, se funde con la bruma) ---------- */
export function buildRange() {
  const seg = 220, rows = 6, R0 = 1500, R1 = 2100;
  const pos = [], col = [], idx = [];
  const hz = new THREE.Color('#e4e1e3'), snow = new THREE.Color('#f4f7fb'), rockC = new THREE.Color('#8f9db0');
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const n = ridged(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + 5, 5);
      const peak = 120 + n * 420 + (Math.cos(a - Math.PI) * 0.5 + 0.5) * 160;   // más altas detrás de la cima
      const prof = Math.sin(v * Math.PI);                                          // sube y baja entre R0 y R1
      const y = -40 + peak * Math.pow(prof, 0.8);
      const R = R0 + (R1 - R0) * v;
      pos.push(Math.cos(a) * R, y, Math.sin(a) * R);
      const c = hz.clone().lerp(rockC, 0.35 * (1 - Math.abs(Math.sin(a * 23 + v * 9)))).lerp(snow, THREE.MathUtils.smoothstep(y, 160, 320));
      c.lerp(hz, 0.45);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let r = 0; r < rows; r++) for (let i = 0; i < seg; i++) { const a = r * (seg + 1) + i, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false, depthWrite: false }));
  m.renderOrder = -15; m.frustumCulled = false;
  return m;
}

/* ---------- Todo junto: cielo, cordillera, montaña, luz y bruma ---------- */
export function createMountain(W, { low = false, res, treeShadow = false, detail = 1, terrace = null, extras = true } = {}) {
  const T = buildTerrain({ res: res || (low ? 201 : 321), terrace });
  const sky = buildSky(), range = buildRange();
  const world = buildMountainWorld(T, { low, detail, treeShadow, extras });
  W.scene.add(sky, range, world.group);
  W.scene.background = null;
  W.scene.fog = new THREE.Fog('#e6e2e2', 260, 2300);
  W.hemi.color.set(0xb4cdf2); W.hemi.groundColor.set(0x7d97c0); W.hemi.intensity = 0.6;
  W.key.color.set(0xffdcb0); W.key.intensity = 2.7;
  W.warm.intensity = 0; W.rim.intensity = 0.35; W.fill.intensity = 0.25;
  const setSnowNormal = (tex) => {
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(SIZE / 6, SIZE / 6);
    const m = world.terrain.material; m.normalMap = t; m.normalScale = new THREE.Vector2(0.5, 0.5); m.needsUpdate = true;
  };
  return {
    T, sky, range, world, setSnowNormal,
    // la cámara siempre en el centro del cielo y de la cordillera
    update(t, dt, camera) {
      sky.position.copy(camera.position); range.position.set(camera.position.x, 0, camera.position.z);
      sky.material.uniforms.uTime.value = t;
      world.update(t, dt);
    },
    // luz del sol siguiendo a un punto (para que la sombra quede siempre cerca)
    sunAt(x, y, z, dist = 8) { W.key.position.set(x + SUN.x * dist, y + SUN.y * dist, z + SUN.z * dist); W.key.target.position.set(x, y, z); W.key.target.updateMatrixWorld(); },
  };
}

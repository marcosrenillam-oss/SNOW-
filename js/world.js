// Construcción de todos los objetos 3D: tabla, fijaciones, botas, rider y pista.
import * as THREE from 'three';

export const BOARD = {
  half: 0.8,        // media longitud (la tabla mide 1.6 unidades ≈ 155 cm)
  contact: 0.58,    // donde empieza a levantarse nose / tail
  wWaist: 0.122,    // medio ancho en la cintura
  wTip: 0.148,      // medio ancho en la zona de contacto
  T: 0.022,         // grosor
  stance: 0.27,     // distancia de cada fijación al centro
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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

/* ---------------- Texturas pintadas en canvas ---------------- */

function canvasTex(w, h, draw, renderer) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const DISPLAY = '"Unbounded", "Arial Black", sans-serif';

function drawTop(g, w, h) {
  // Fondo
  const bg = g.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#0c1230'); bg.addColorStop(0.5, '#1a2a63'); bg.addColorStop(1, '#0c1230');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);

  // Rejilla fina
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
  for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

  // Montañas
  g.fillStyle = 'rgba(57,224,255,0.16)';
  g.beginPath(); g.moveTo(0, h);
  const peaks = [[0.08, 0.55], [0.17, 0.25], [0.27, 0.6], [0.36, 0.2], [0.45, 0.5], [0.55, 0.15], [0.66, 0.55], [0.76, 0.3], [0.86, 0.6], [0.95, 0.35], [1, 0.6]];
  for (const [px, py] of peaks) g.lineTo(px * w, py * h);
  g.lineTo(w, h); g.closePath(); g.fill();

  // Rayas diagonales
  const bands = [['#ff5b2e', 0.39, 70], ['#ffb03b', 0.455, 26], ['#39e0ff', 0.5, 46], ['#ffffff', 0.555, 14]];
  for (const [col, cx, bw] of bands) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx * w - 80, h); g.lineTo(cx * w - 80 + bw, h);
    g.lineTo(cx * w + 80 + bw, 0); g.lineTo(cx * w + 80, 0);
    g.closePath(); g.fill();
  }

  // Marca
  g.save();
  g.translate(w * 0.5, h * 0.5);
  g.fillStyle = '#ffffff';
  g.font = `900 ${h * 0.3}px ${DISPLAY}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 20;
  g.fillText('SNOW·PROFE', 0, 0);
  g.restore();

  // Nose / tail
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = `700 ${h * 0.085}px ${DISPLAY}`;
  g.textBaseline = 'middle';
  g.textAlign = 'right'; g.fillText('NOSE ▸', w * 0.965, h * 0.5);
  g.textAlign = 'left'; g.fillText('◂ TAIL', w * 0.035, h * 0.5);

  // Puntitos de los insertos
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (const sx of [0.33, 0.67]) {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) {
      g.beginPath(); g.arc(w * sx + i * 26, h * 0.5 + j * 40, 5, 0, Math.PI * 2); g.fill();
    }
  }
}

function drawBase(g, w, h) {
  const bg = g.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#ff4a1c'); bg.addColorStop(0.5, '#ff7a2e'); bg.addColorStop(1, '#ff4a1c');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // Bandas negras
  g.fillStyle = '#0b0f22';
  g.fillRect(0, h * 0.06, w, h * 0.06);
  g.fillRect(0, h * 0.88, w, h * 0.06);
  // Texto gigante
  g.save();
  g.translate(w / 2, h / 2);
  g.font = `900 ${h * 0.5}px ${DISPLAY}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText('PEDALES', 0, h * 0.02);
  g.restore();
  g.fillStyle = 'rgba(11,15,34,0.8)';
  g.font = `700 ${h * 0.07}px ${DISPLAY}`;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('155 · ALL MOUNTAIN · TWIN', w * 0.06, h * 0.22);
}

function snowTex(renderer) {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#eef4ff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 2.2;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(170,190,225,0.22)' : 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // Surcos de pisapistas
    g.strokeStyle = 'rgba(160,180,220,0.18)'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, renderer);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function radialTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------------- Tabla ---------------- */

function boardGeometry() {
  const N = 180, M = 14;
  const { half, T } = BOARD;
  const pos = [], uv = [], idx = [];
  const groups = [];
  const v = (x, y, z, a, b) => { pos.push(x, y, z); uv.push(a, b); return pos.length / 3 - 1; };

  const xs = [];
  for (let i = 0; i <= N; i++) {
    // Más resolución en las puntas
    const s = -1 + 2 * i / N;
    xs.push(half * Math.sign(s) * Math.pow(Math.abs(s), 0.85));
  }

  // Superficie superior (0) e inferior (1)
  for (const top of [true, false]) {
    const base = pos.length / 3, start = idx.length;
    for (let i = 0; i <= N; i++) {
      const x = xs[i], hw = halfWidth(x), y = lift(x) + (top ? T / 2 : -T / 2);
      for (let j = 0; j <= M; j++) {
        const s = -1 + 2 * j / M;
        const u = (x + half) / (2 * half);
        v(x, y, s * hw, u, top ? (1 - s) / 2 : (s + 1) / 2);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = base + i * (M + 1) + j, b = a + M + 1, c = b + 1, d = a + 1;
      if (top) idx.push(a, d, b, d, c, b); else idx.push(a, b, d, d, b, c);
    }
    groups.push([start, idx.length - start, top ? 0 : 1]);
  }

  // Cantos (2)
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
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.007, 6, false);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  return new THREE.Mesh(geo, mat);
}

/* ---------------- Fijación ---------------- */

function makeBinding(mats) {
  const g = new THREE.Group();
  const parts = {};

  // Disco con marcas
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.008, 40), mats.disc);
  disc.position.y = 0.004;
  g.add(disc);
  parts.disc = disc;

  // Base (baseplate)
  const s = new THREE.Shape();
  const W = 0.05, L = 0.125, r = 0.035;
  s.moveTo(-W + r, -L); s.lineTo(W - r, -L); s.quadraticCurveTo(W, -L, W, -L + r);
  s.lineTo(W, L - r); s.quadraticCurveTo(W, L, W - r, L); s.lineTo(-W + r, L);
  s.quadraticCurveTo(-W, L, -W, L - r); s.lineTo(-W, -L + r); s.quadraticCurveTo(-W, -L, -W + r, -L);
  const plateGeo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
  plateGeo.rotateX(Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, mats.plastic);
  plate.position.y = 0.022;
  g.add(plate);
  parts.plate = plate;

  // Paredes laterales
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.19), mats.plastic);
    wall.position.set(sx * 0.052, 0.045, -0.02);
    g.add(wall);
  }

  // Heelcup
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.055, 24, 1, true, Math.PI / 2, Math.PI), mats.plasticDS);
  cup.position.set(0, 0.048, -0.105);
  g.add(cup);

  // Highback
  const hb = new THREE.Group();
  const hbMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.19, 24, 1, true, Math.PI / 2 + 0.15, Math.PI - 0.3), mats.plasticDS);
  hbMesh.position.y = 0.095;
  hb.add(hbMesh);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0505, 0.0525, 0.035, 24, 1, true, Math.PI / 2 + 0.6, Math.PI - 1.2), mats.accentDS);
  stripe.position.y = 0.15;
  hb.add(stripe);
  hb.position.set(0, 0.06, -0.115);
  hb.rotation.x = -0.22;
  g.add(hb);
  parts.highback = hb;

  // Strap de tobillo
  const ankle = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.014, 8, 28, Math.PI), mats.accent);
  ankle.scale.set(1, 0.95, 1.8);
  ankle.position.set(0, 0.05, -0.035);
  ankle.rotation.x = -0.35;
  g.add(ankle);
  parts.ankle = ankle;

  // Strap de puntera
  const toe = new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.01, 8, 28, Math.PI), mats.accent);
  toe.scale.set(1, 0.55, 1.3);
  toe.position.set(0, 0.034, 0.085);
  toe.rotation.x = 0.4;
  g.add(toe);
  parts.toe = toe;

  // Bota (se muestra en algunos pasos)
  const boot = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, 6, 14), mats.boot);
  sole.rotation.x = Math.PI / 2;
  sole.scale.set(1, 1, 0.72);
  sole.position.set(0, 0.06, 0.005);
  boot.add(sole);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.17, 16), mats.boot);
  shaft.position.set(0, 0.14, -0.07);
  shaft.rotation.x = 0.15;
  boot.add(shaft);
  const lace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.11), mats.bootDark);
  lace.position.set(0, 0.1, 0.035);
  lace.rotation.x = -0.25;
  boot.add(lace);
  g.add(boot);
  parts.boot = boot;

  // Anclajes para etiquetas
  parts.aHighback = new THREE.Object3D(); parts.aHighback.position.set(0, 0.18, -0.12); hb.add(parts.aHighback);
  parts.aAnkle = new THREE.Object3D(); parts.aAnkle.position.set(0.04, 0.1, -0.03); g.add(parts.aAnkle);
  parts.aToe = new THREE.Object3D(); parts.aToe.position.set(0.03, 0.06, 0.09); g.add(parts.aToe);
  parts.aDisc = new THREE.Object3D(); parts.aDisc.position.set(0.058, 0.006, 0.02); g.add(parts.aDisc);
  parts.aAnkleBone = new THREE.Object3D(); parts.aAnkleBone.position.set(0, 0.13, -0.05); g.add(parts.aAnkleBone);

  g.userData.parts = parts;
  return g;
}

/* ---------------- Rider ---------------- */

const UP = new THREE.Vector3(0, 1, 0);

function limb(radius, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, 1, 12), mat);
  m.castShadow = false;
  return m;
}

function place(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}

// IK de dos huesos: devuelve la rodilla / codo
function ik(a, c, l1, l2, hint, out) {
  const ac = new THREE.Vector3().subVectors(c, a);
  let d = ac.length();
  d = Math.min(d, l1 + l2 - 1e-4);
  const dir = ac.clone().normalize();
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const perp = hint.clone().addScaledVector(dir, -hint.dot(dir)).normalize();
  return out.copy(a).addScaledVector(dir, x).addScaledVector(perp, h);
}

function makeRider() {
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff5b2e, roughness: 0.55 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1d2650, roughness: 0.7 });
  const helmet = new THREE.MeshStandardMaterial({ color: 0xf4f6ff, roughness: 0.3, metalness: 0.1 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x14182b, roughness: 0.6 });
  const goggle = new THREE.MeshStandardMaterial({ color: 0x39e0ff, emissive: 0x1499b8, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.6 });

  const g = new THREE.Group();
  const P = {
    thighL: limb(0.062, pants), thighR: limb(0.062, pants),
    shinL: limb(0.055, pants), shinR: limb(0.055, pants),
    upperL: limb(0.045, jacket), upperR: limb(0.045, jacket),
    foreL: limb(0.04, jacket), foreR: limb(0.04, jacket),
  };
  for (const k in P) g.add(P[k]);
  const joint = (r, m) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); g.add(s); return s; };
  P.kneeL = joint(0.062, pants); P.kneeR = joint(0.062, pants);
  P.hipL = joint(0.068, pants); P.hipR = joint(0.068, pants);
  P.elbowL = joint(0.045, jacket); P.elbowR = joint(0.045, jacket);
  P.shL = joint(0.058, jacket); P.shR = joint(0.058, jacket);
  P.handL = joint(0.05, glove); P.handR = joint(0.05, glove);

  P.pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.13, 6, 12), pants);
  P.pelvis.rotation.z = Math.PI / 2;
  g.add(P.pelvis);
  P.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.3, 8, 16), jacket);
  g.add(P.torso);
  P.torso.scale.set(1, 1, 0.75);

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), helmet);
  head.add(skull);
  const gg = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.05, 24, 1, true, -1.1, 2.2), goggle);
  gg.material.side = THREE.DoubleSide;
  gg.position.y = -0.005;
  head.add(gg);
  g.add(head);
  P.head = head;

  // Anclajes para etiquetas
  P.aKnee = new THREE.Object3D(); g.add(P.aKnee);
  P.aHip = new THREE.Object3D(); g.add(P.aHip);
  P.aShoulder = new THREE.Object3D(); g.add(P.aShoulder);
  P.aHead = new THREE.Object3D(); g.add(P.aHead);

  g.userData.P = P;
  return g;
}

const _v = {
  hip: new THREE.Vector3(), hipL: new THREE.Vector3(), hipR: new THREE.Vector3(),
  kL: new THREE.Vector3(), kR: new THREE.Vector3(),
  chest: new THREE.Vector3(), neck: new THREE.Vector3(), shL: new THREE.Vector3(), shR: new THREE.Vector3(),
  eL: new THREE.Vector3(), eR: new THREE.Vector3(), hL: new THREE.Vector3(), hR: new THREE.Vector3(),
  side: new THREE.Vector3(), fwd: new THREE.Vector3(),
};

/**
 * Coloca el rider. footL / footR en espacio local del rig.
 * o = { crouch, shiftX, shiftZ, lookYaw, arms, twist }
 */
export function poseRider(rider, footL, footR, o) {
  const P = rider.userData.P, V = _v;
  const THIGH = 0.43, SHIN = 0.43, UPPER = 0.27, FORE = 0.25;
  const midX = (footL.x + footR.x) / 2, midZ = (footL.z + footR.z) / 2;
  const footY = (footL.y + footR.y) / 2;
  const height = 0.83 - o.crouch * 0.33;
  V.hip.set(midX + o.shiftX, footY + height, midZ - 0.05 - o.crouch * 0.06 + o.shiftZ);

  const tw = o.twist || 0;
  V.side.set(Math.cos(tw), 0, -Math.sin(tw));       // hacia el pie izquierdo (+x)
  V.fwd.set(Math.sin(tw), 0, Math.cos(tw));         // hacia las puntas (+z)

  V.hipL.copy(V.hip).addScaledVector(V.side, 0.095);
  V.hipR.copy(V.hip).addScaledVector(V.side, -0.095);

  const hintL = new THREE.Vector3(0.25, 0, 1).normalize();
  const hintR = new THREE.Vector3(-0.25, 0, 1).normalize();
  ik(V.hipL, footL, THIGH, SHIN, hintL, V.kL);
  ik(V.hipR, footR, THIGH, SHIN, hintR, V.kR);
  place(P.thighL, V.hipL, V.kL); place(P.shinL, V.kL, footL);
  place(P.thighR, V.hipR, V.kR); place(P.shinR, V.kR, footR);
  P.kneeL.position.copy(V.kL); P.kneeR.position.copy(V.kR);
  P.hipL.position.copy(V.hipL); P.hipR.position.copy(V.hipR);
  P.pelvis.position.copy(V.hip).add(new THREE.Vector3(0, 0.03, 0));
  P.pelvis.rotation.set(0, tw, Math.PI / 2);

  // Torso: ligeramente inclinado hacia delante y hacia el canto
  const lean = 0.06 + o.crouch * 0.12;
  V.chest.copy(V.hip).add(new THREE.Vector3(o.shiftX * 0.5, 0.42 - o.crouch * 0.04, lean + o.shiftZ * 0.6));
  const tdir = new THREE.Vector3().subVectors(V.chest, V.hip);
  P.torso.position.copy(V.hip).addScaledVector(tdir, 0.55);
  P.torso.quaternion.setFromUnitVectors(UP, tdir.clone().normalize());
  P.torso.rotateY(tw);

  V.neck.copy(V.chest).add(new THREE.Vector3(0, 0.06, 0));
  P.head.position.copy(V.neck).add(new THREE.Vector3(0, 0.15, 0.01));
  P.head.rotation.set(0, (o.lookYaw || 0), 0);

  V.shL.copy(V.chest).addScaledVector(V.side, 0.19).add(new THREE.Vector3(0, -0.04, 0));
  V.shR.copy(V.chest).addScaledVector(V.side, -0.19).add(new THREE.Vector3(0, -0.04, 0));
  P.shL.position.copy(V.shL); P.shR.position.copy(V.shR);

  const arms = o.arms ?? 0.4;
  V.hL.copy(V.shL).addScaledVector(V.side, 0.14 + arms * 0.16).add(new THREE.Vector3(0, -0.34 + arms * 0.12, 0.12));
  V.hR.copy(V.shR).addScaledVector(V.side, -0.14 - arms * 0.16).add(new THREE.Vector3(0, -0.34 + arms * 0.12, 0.12));
  ik(V.shL, V.hL, UPPER, FORE, new THREE.Vector3(0.3, -0.2, -0.6), V.eL);
  ik(V.shR, V.hR, UPPER, FORE, new THREE.Vector3(-0.3, -0.2, -0.6), V.eR);
  place(P.upperL, V.shL, V.eL); place(P.foreL, V.eL, V.hL);
  place(P.upperR, V.shR, V.eR); place(P.foreR, V.eR, V.hR);
  P.elbowL.position.copy(V.eL); P.elbowR.position.copy(V.eR);
  P.handL.position.copy(V.hL); P.handR.position.copy(V.hR);

  P.aKnee.position.copy(V.kL);
  P.aHip.position.copy(V.hip);
  P.aShoulder.position.copy(V.shR);
  P.aHead.position.copy(P.head.position).add(new THREE.Vector3(0, 0.08, 0));
}

/* ---------------- Mundo ---------------- */

export function buildWorld(renderer) {
  const scene = new THREE.Scene();

  // Cielo (degradado)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#050817') },
      bottom: { value: new THREE.Color('#1a2550') },
      sun: { value: 0 },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float sun; varying vec3 vP;
      void main(){
        float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(bottom, top, smoothstep(0.42, 0.95, h));
        float glow = pow(max(0.0, dot(normalize(vP), normalize(vec3(-0.4, 0.35, 1.0)))), 18.0) * sun;
        c += vec3(1.0, 0.85, 0.6) * glow * 0.6;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog('#1a2550', 14, 60);

  // Luces
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x223055, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 4, -2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x39e0ff, 1.4);
  rim.position.set(-3, 1.5, 3);
  scene.add(rim);
  const warm = new THREE.PointLight(0xff5b2e, 3, 6, 1.6);
  warm.position.set(1.5, -0.6, 1.5);
  scene.add(warm);

  // Materiales
  const topTex = canvasTex(2048, 384, drawTop, renderer);
  const baseTex = canvasTex(2048, 384, drawBase, renderer);
  const mats = {
    top: new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.4, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.35 }),
    base: new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.45, metalness: 0.0, envMapIntensity: 0.5 }),
    edge: new THREE.MeshStandardMaterial({ color: 0xd8dee8, metalness: 1, roughness: 0.22 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x15192c, roughness: 0.45, metalness: 0.1 }),
    plasticDS: new THREE.MeshStandardMaterial({ color: 0x15192c, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardMaterial({ color: 0xff5b2e, roughness: 0.5 }),
    accentDS: new THREE.MeshStandardMaterial({ color: 0xff5b2e, roughness: 0.5, side: THREE.DoubleSide }),
    disc: new THREE.MeshStandardMaterial({ color: 0x39e0ff, roughness: 0.35, metalness: 0.3, emissive: 0x0a3a48 }),
    boot: new THREE.MeshStandardMaterial({ color: 0xe9edf6, roughness: 0.55, transparent: true }),
    bootDark: new THREE.MeshStandardMaterial({ color: 0x2a3150, roughness: 0.6, transparent: true }),
  };

  // Rig: todo lo que se mueve junto (tabla + rider)
  const rig = new THREE.Group();
  rig.rotation.order = 'YXZ';
  scene.add(rig);

  const boardGroup = new THREE.Group();
  boardGroup.rotation.order = 'YXZ';
  rig.add(boardGroup);
  const board = new THREE.Mesh(boardGeometry(), [mats.top, mats.base, mats.edge]);
  boardGroup.add(board);

  const heelEdge = edgeLine(-1, 0x39e0ff);
  const toeEdge = edgeLine(1, 0xff5b2e);
  boardGroup.add(heelEdge, toeEdge);

  const bindL = makeBinding(mats);   // siempre en +x (lado del pie izquierdo)
  const bindR = makeBinding(mats);   // siempre en −x (lado del pie derecho)
  bindL.position.set(BOARD.stance, lift(BOARD.stance) + BOARD.T / 2, 0);
  bindR.position.set(-BOARD.stance, lift(BOARD.stance) + BOARD.T / 2, 0);
  boardGroup.add(bindL, bindR);

  // Brillo de presión bajo cada pie
  const glowTex = radialTex();
  const glowMat = (c) => new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glowL = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glowMat(0x39e0ff));
  const glowR = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glowMat(0xff5b2e));
  for (const [gm, b] of [[glowL, bindL], [glowR, bindR]]) {
    gm.rotation.x = -Math.PI / 2;
    gm.position.set(b.position.x, b.position.y + 0.003, 0);
    boardGroup.add(gm);
  }

  // Anclajes de la tabla para etiquetas
  const anchors = {};
  const addA = (name, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); boardGroup.add(o); anchors[name] = o; };
  addA('nose', 0.74, lift(0.74) + 0.02, 0);
  addA('tail', -0.74, lift(0.74) + 0.02, 0);
  addA('edge', 0.08, 0.0, halfWidth(0.08) + 0.004);
  addA('heelEdge', -0.12, 0.0, -halfWidth(0.12) - 0.004);
  addA('toeEdge', 0.12, 0.0, halfWidth(0.12) + 0.004);
  addA('baseC', 0.0, -BOARD.T, 0.02);
  addA('topC', -0.02, BOARD.T, 0.03);
  addA('rocker', 0.66, lift(0.66) - 0.01, -0.09);
  addA('center', 0, 0, 0);

  // Rider
  const rider = makeRider();
  rig.add(rider);

  // Flecha de dirección (para regular / goofy)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.07); arrowShape.lineTo(0.32, 0.07); arrowShape.lineTo(0.32, 0.15);
  arrowShape.lineTo(0.5, 0); arrowShape.lineTo(0.32, -0.15); arrowShape.lineTo(0.32, -0.07); arrowShape.lineTo(0, -0.07);
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: 0xc6ff3d, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  arrow.rotation.x = -Math.PI / 2;
  rig.add(arrow);

  // Pista
  const slope = new THREE.Group();
  scene.add(slope);
  const snowMap = snowTex(renderer);
  snowMap.repeat.set(16, 24);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: snowMap, roughness: 0.95, transparent: true, opacity: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 18;
  slope.add(ground);

  // Árboles
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1f4a4a, roughness: 0.9, transparent: true, opacity: 0 });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.8, transparent: true, opacity: 0 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9, transparent: true, opacity: 0 });
  const trees = [];
  for (let i = 0; i < 46; i++) {
    const t = new THREE.Group();
    const h = 1.2 + Math.random() * 1.6;
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55 - k * 0.13, h * 0.5, 7), k === 2 ? snowCapMat : treeMat);
      cone.position.y = h * 0.3 + k * h * 0.22;
      t.add(cone);
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), trunkMat);
    trunk.position.y = 0.15;
    t.add(trunk);
    const side = i % 2 ? 1 : -1;
    t.position.set(side * (3.2 + Math.random() * 9), 0, -6 + Math.random() * 46);
    t.scale.setScalar(0.8 + Math.random() * 0.7);
    slope.add(t);
    trees.push(t);
  }

  // Huella en la nieve
  const TRAIL = 220;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 2 * 3), 3));
  const tIdx = [];
  for (let i = 0; i < TRAIL - 1; i++) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  trailGeo.setIndex(tIdx);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.frustumCulled = false;
  trail.position.y = 0.003;
  slope.add(trail);

  // Sombra de contacto
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: radialTex('rgba(10,20,50,0.75)', 'rgba(10,20,50,0)'), transparent: true, depthWrite: false, opacity: 0 }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  // Puertas del slalom
  const gates = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const flagRed = new THREE.MeshStandardMaterial({ color: 0xff3b3b, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x440000 });
  const flagBlue = new THREE.MeshStandardMaterial({ color: 0x2b7bff, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x001444 });
  const flagGeo = new THREE.PlaneGeometry(0.45, 0.32);
  for (let i = 0; i < 6; i++) {
    const gate = new THREE.Group();
    const col = i % 2 ? flagBlue : flagRed;
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), poleMat);
      pole.position.set(s * 0.7, 0.65, 0);
      const flag = new THREE.Mesh(flagGeo, col);
      flag.position.set(s * 0.7 - s * 0.24, 1.08, 0);
      gate.add(pole, flag);
      gate.userData[s > 0 ? 'right' : 'left'] = [pole, flag];
    }
    gate.visible = false;
    slope.add(gate);
    gates.push(gate);
  }

  // Copos de nieve
  const FLAKES = 1400;
  const fpos = new Float32Array(FLAKES * 3);
  const fspd = new Float32Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) {
    fpos[i * 3] = (Math.random() - 0.5) * 18;
    fpos[i * 3 + 1] = Math.random() * 9 - 2;
    fpos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    fspd[i] = 0.25 + Math.random() * 0.5;
  }
  const flakeGeo = new THREE.BufferGeometry();
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({
    size: 0.045, map: radialTex(), transparent: true, depthWrite: false, opacity: 0.85, color: 0xffffff,
  }));
  flakes.userData.speed = fspd;
  scene.add(flakes);

  return {
    scene, sky, skyMat, hemi, key, rim, warm, rig, boardGroup, board, bindL, bindR, glowL, glowR,
    heelEdge, toeEdge, anchors, rider, arrow, slope, ground, groundMat, snowMap, trees,
    treeMats: [treeMat, snowCapMat, trunkMat], trail, trailMat, TRAIL, shadow, gates, flakes, mats,
  };
}

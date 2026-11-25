import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { buildWorld, poseRider, BOARD, THEMES } from './world.js';
import { TRICKS, TIPS } from './content.js';
import { createGame, RUN } from './game.js';
import { initScroll, splitInto, loaderProgress, initBackground, initCursor } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const store = {
  get(k, d) { try { const v = localStorage.getItem('snowprofe:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('snowprofe:' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

/* ---------------- Entorno ---------------- */
const html = document.documentElement;
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
html.classList.toggle('is-ios', isIOS);
html.classList.toggle('is-android', /Android/i.test(ua));
html.classList.toggle('standalone', standalone);
if (standalone) {
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMQ = matchMedia('(max-width: 820px), (orientation: portrait) and (max-width: 1024px)');

/* ---------------- Estado ---------------- */
const S = {
  stance: store.get('stance', 'regular'), dir: 1,
  skin: store.get('skin', 'drake'),
  angF: 15, angB: -6, angFs: 15, angBs: -6,
  edge: 'back', edgeYaw: 0, crouch: 0.55,
  trick: 'ollie', trickClock: 0, trickYawBase: 0, trickYawS: 0,
  pL: 0, pR: 0, look: 0,
  focus: null, focusT: 0, demo: null,
  flip: 0, straps: 0, hbFold: 0, lift: 0,
  sim: { x: 0, v: 0, yaw: 0, roll: 0, pitch: 0, phi: 0, speed: 0 },
};
S.dir = S.stance === 'goofy' ? -1 : 1;

/* ---------------- Render ---------------- */
const canvas = $('#scene');
loaderProgress(0.08);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 3000);

try {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('800 64px "Inter Tight"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
} catch { /* fuente de reserva */ }

loaderProgress(0.3);
const W = await buildWorld(renderer);
loaderProgress(0.85);
W.scene.environment = W.envStudio;
W.boardGroup.add(W.layers);
W.sky.visible = false;
const scroller = initScroll();
const bgfx = initBackground();
const cursorFx = initCursor();
W.setSkin(S.skin);
const P = W.rider.userData.P;
const studio = { top: new THREE.Color('#07080b'), bot: new THREE.Color('#25272f') };
const spin = { on: false, id: null, x: 0, y: 0, t: 0, moved: 0, yaw: 0, pitch: 0, vy: 0, vp: 0, idle: 0 };
const bF = () => (S.dir > 0 ? W.bindL : W.bindR);
const bB = () => (S.dir > 0 ? W.bindR : W.bindL);
const parts = (b) => b.userData.parts;

/* ---------------- Secciones ---------------- */
const sections = $$('.step').map((el, i) => ({
  el, id: el.id, i, title: el.dataset.title, hint: el.dataset.hint, big: el.dataset.big || el.dataset.title, lead: el.dataset.lead || '', top: 0, h: 1,
  dock: el.querySelector('.dock'), infos: el.querySelector('.infos'),
}));
const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
function measure() {
  const y = scrollY;
  for (const s of sections) { const r = s.el.getBoundingClientRect(); s.top = r.top + y; s.h = r.height; }
}

/* ---------------- Poses por paso ---------------- */
const DEF = {
  cam: [0, 0.3, 3.4], look: [0, 0, 0], pos: [0, 0, 0], rot: [0, 0, 0],
  explode: 0, layers: 0, bexp: 0, boots: 0, rider: 0, slope: 0, sim: 0, arrow: 0, edges: 0, glow: 0, crouch: 0.5, trick: 0, mk: 1,
};
const pose = (o) => ({ ...DEF, ...o });
const GROUND = 0.012;
const F = () => S.focus;

const POSES = {
  inicio: (t) => pose({
    cam: [0, 0.12, 3.5], look: [0, 0.02, 0],
    pos: [0, Math.sin(t * 1.1) * 0.05, 0],
    rot: [0.28, 0.75 + Math.sin(t * 0.45) * 0.45, 1.02 + Math.sin(t * 0.7) * 0.05],
  }),
  tabla: (t, p = 0.5) => {
    const f = F(), nx = 0.55 * S.dir;
    const e = f ? 0 : smooth(0.2, 0.42, p) - smooth(0.66, 0.86, p);
    let cam = mix3([0, 1.75, 2.55], [1.7, 1.45, 3.1], e), look = mix3([0, -0.02, 0], [0.05, 0.1, 0], e), ry = -0.3 + Math.sin(t * 0.3) * 0.12 + e * (-0.35 + (p - 0.5) * 0.8), rx = 0;
    if (f === 'nose') { cam = [nx * 1.9, 0.8, 1.35]; look = [nx, 0.03, 0]; ry = 0; }
    if (f === 'tail') { cam = [-nx * 1.9, 0.8, 1.35]; look = [-nx, 0.03, 0]; ry = 0; }
    if (f === 'cantos') { cam = [0.4, 0.22, 1.25]; look = [0.05, 0.0, 0.1]; ry = 0.1; }
    if (f === 'rocker') { cam = [0, 0.1, 2.6]; look = [0, 0.04, 0]; ry = 0; }
    if (f === 'base') { rx = Math.PI; }
    return pose({ cam, look, rot: [rx, ry, 0], pos: [0, Math.sin(t) * 0.02, 0], edges: f === 'cantos' ? 1 : 0.35 * (1 - e), layers: e, mk: 0.6 + e * 0.5 });
  },
  fijaciones: (t, p = 0.5) => {
    const f = F(), x = S.dir * BOARD.stance;
    const e = f ? 0 : smooth(0.18, 0.42, p) - smooth(0.68, 0.88, p);
    let cam = mix3([x + 0.62, 0.55, 0.78], [x + 1.15, 0.85, 1.45], e), look = mix3([x * 0.9, 0.09, 0], [x * 0.95, 0.17, 0], e);
    if (f === 'angulos') { cam = [0, 2.3, -0.75]; look = [0, 0, 0.02]; }
    if (f === 'highback') { cam = [x + 0.7, 0.45, -0.55]; look = [x, 0.14, -0.05]; }
    if (f === 'disco') { cam = [x + 0.55, 0.35, 0.7]; look = [x, 0.06, 0]; }
    return pose({ cam, look, rot: [0, f === 'angulos' ? 0 : -0.12 + (p - 0.5) * 0.5 * e, 0], bexp: e, mk: f === 'angulos' ? 1.25 : 0.6 + e * 0.4 });
  },
  stance: () => pose({ cam: [0, 3.3, -1.3], look: [0, 0, 0.06], boots: 1, arrow: 1, mk: 0.85 }),
  postura: () => {
    const f = F();
    let cam = [3.3, 1.35, 2.2], look = [0, 0.72, 0];
    if (f === 'rodillas') { cam = [2.2, 0.75, 1.7]; look = [0, 0.45, 0]; }
    if (f === 'hombros') { cam = [0.2, 2.0, -2.8]; look = [0, 1.1, 0]; }
    if (f === 'mirada') { cam = [1.6, 1.6, 2.2]; look = [0, 1.35, 0]; }
    if (f === 'cadera') { cam = [2.6, 1.0, 1.4]; look = [0, 0.7, 0]; }
    return pose({ cam, look, pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, crouch: S.crouch, glow: f === 'cadera' ? 1 : 0.4, mk: 1.4 });
  },
  pedales: () => pose({ cam: [S.sim.x * 0.5, 2.7, -4.7], look: [S.sim.x * 0.5, 0.5, 1.0], pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 1, mk: 1.3 }),
  cantos: () => pose({ cam: [3.4, 1.15, -1.7], look: [0, 0.6, 0], pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, edges: 1, mk: 1.4 }),
  hoja: () => pose({ cam: [S.sim.x * 0.55, 2.9, -4.6], look: [S.sim.x * 0.55, 0.35, 1.3], pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 1, mk: 0.9 }),
  giro: () => pose({ cam: [S.sim.x * 0.45, 3.7, -5.0], look: [S.sim.x * 0.45, 0.2, 1.7], pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, edges: 0.7, mk: 0.7 }),
  trucos: () => pose({ cam: [3.5, 1.7, -3.5], look: [0, 0.8, 0], pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, trick: 1, mk: 1.5 }),
  juego: () => pose({ cam: [S.sim.x * 0.5, 2.8, -4.6], look: [S.sim.x * 0.5, 0.3, 2.4], pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 0.8, mk: 1.1 }),
  consejos: (t) => pose({ cam: [0, 0.2, 3.9], look: [0, 0, 0], pos: [0, Math.sin(t) * 0.04, 0], rot: [0.45, t * 0.45, 0.5], mk: 1.2 }),
  final: (t) => pose({ cam: [0, 0.1, 3.3], look: [0, 0, 0], pos: [0, Math.sin(t * 1.3) * 0.06, 0], rot: [0.2, t * 0.8, 1.05] }),
};
function mix3(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
const SIM_MODE = { pedales: 'drill', cantos: 'hold', hoja: 'leaf', giro: 'turn', juego: 'leaf' };

function mixPose(a, b, f) {
  const o = {};
  for (const k in a) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], f)) : lerp(a[k], b[k], f);
  return o;
}
let cur = null;
function dampPose(target, dt, rate) {
  if (!cur) { cur = JSON.parse(JSON.stringify(target)); return; }
  for (const k in target) {
    if (Array.isArray(target[k])) for (let i = 0; i < 3; i++) cur[k][i] = damp(cur[k][i], target[k][i], rate, dt);
    else cur[k] = damp(cur[k], target[k], rate, dt);
  }
}

/* ---------------- Scroll ---------------- */
const SC = { a: 0, b: 0, f: 0, pa: 0, pb: 0, active: 0, focus: 0, progress: 0 };
function readScroll() {
  const vh = innerHeight, mid = scrollY + vh * 0.5;
  let a = 0;
  while (a < sections.length - 1 && mid > sections[a + 1].top + sections[a + 1].h / 2) a++;
  const b = Math.min(a + 1, sections.length - 1);
  const ca = sections[a].top + sections[a].h / 2, cb = sections[b].top + sections[b].h / 2;
  SC.a = a; SC.b = b;
  const prog = (s) => clamp((mid - s.top) / s.h, 0, 1);
  SC.pa = prog(sections[a]); SC.pb = prog(sections[b]);
  SC.f = b === a ? 0 : smooth(0.2, 0.8, clamp((mid - ca) / (cb - ca), 0, 1));
  SC.active = SC.f < 0.5 ? a : b;
  SC.focus = SC.f < 0.12 ? a : SC.f > 0.88 ? b : -1;
  const max = document.documentElement.scrollHeight - vh;
  SC.progress = max > 0 ? scrollY / max : 0;
}

/* ---------------- Navegación ---------------- */
const dotsEl = $('#dots'), listEl = $('#drawer-list');
sections.forEach((s, i) => {
  const d = document.createElement('button');
  d.innerHTML = `<span>${s.title}</span>`; d.setAttribute('aria-label', s.title);
  d.addEventListener('click', () => goTo(s.id));
  dotsEl.appendChild(d);
  const li = document.createElement('li');
  li.style.setProperty('--i', i);
  li.innerHTML = `<button><span class="n">${String(i).padStart(2, '0')}</span><span class="t">${s.title}</span><span class="d">${s.lead ? s.lead.slice(0, 42) : s.hint}</span></button>`;
  li.firstChild.addEventListener('click', () => { closeMenu(); goTo(s.id); });
  listEl.appendChild(li);
});
const dotBtns = $$('button', dotsEl), listBtns = $$('button', listEl);
function goTo(id) { const s = byId[id]; if (!s) return; scroller.scrollTo(s.i === 0 ? 0 : Math.max(0, s.top + s.h * 0.5 - innerHeight * 0.5)); }
$$('[data-goto]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); goTo(b.dataset.goto); }));
const menuBtn = $('#menu-btn');
function openMenu() { document.body.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); $('#drawer').setAttribute('aria-hidden', 'false'); }
function closeMenu() { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); $('#drawer').setAttribute('aria-hidden', 'true'); }
menuBtn.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
$('#drawer-backdrop').addEventListener('click', closeMenu);
$('.drawer-close').addEventListener('click', closeMenu);
$$('[data-open-menu]').forEach((b) => b.addEventListener('click', openMenu));

/* ---------------- HUD, panel y puntos ---------------- */
const hud = $('#hud'), hudDock = $('#hud-dock'), sheetBody = $('#sheet-body');
let hudSection = -1, openNode = null, openHome = null;
const visited = new Set();

function openInfo(secId, infoId) {
  const sec = byId[secId];
  const node = sec?.infos?.querySelector(`[data-info="${infoId}"]`);
  if (!node) return;
  closeSheet(true);
  openNode = node; openHome = sec.infos;
  node.hidden = false;
  sheetBody.appendChild(node);
  $('#sheet-kicker').textContent = `${String(sec.i).padStart(2, '0')} · ${sec.title}`;
  document.body.classList.add('sheet-open');
  $('#sheet').setAttribute('aria-hidden', 'false');
  S.focus = infoId === 'main' ? null : infoId;
  S.focusT = clock;
  visited.add(secId + ':' + infoId);
  onFocusAction(secId, infoId);
}
function closeSheet(keepFocus) {
  if (openNode) { openNode.hidden = true; openHome.appendChild(openNode); openNode = null; }
  document.body.classList.remove('sheet-open');
  $('#sheet').setAttribute('aria-hidden', 'true');
  if (!keepFocus) S.focus = null;
}
$('.sheet-close').addEventListener('click', () => closeSheet());
$('#hud-info').addEventListener('click', () => openInfo(sections[hudSection].id, 'main'));
$('#hud-next').addEventListener('click', () => { const n = sections[Math.min(hudSection + 1, sections.length - 1)]; goTo(n.id); });
canvas.addEventListener('click', () => { if (spin.moved < 8 && document.body.classList.contains('sheet-open')) closeSheet(); });
addEventListener('keydown', (e) => { if (e.code === 'Escape') { if (game.on) quitGame(); else { closeSheet(); closeMenu(); } } });

function setHud(i) {
  if (i === hudSection) return;
  closeSheet();
  if (hudSection >= 0) { const old = sections[hudSection]; if (old.dock) old.el.appendChild(old.dock); }
  hudSection = i;
  const s = sections[i];
  document.body.classList.toggle('hero-mode', s.id === 'inicio');
  hud.classList.add('swap');
  setTimeout(() => {
    $('#hud-num').textContent = String(i).padStart(2, '0');
    $('#hud-kick').textContent = s.id === 'juego' ? 'El reto' : s.id === 'final' ? 'Fin de la clase' : `Paso ${String(i).padStart(2, '0')}`;
    splitInto($('#hud-title'), s.title);
    $('#hud-lead').textContent = s.lead;
    $('#hud-hint').textContent = s.hint;
    hudDock.replaceChildren();
    if (s.dock) hudDock.appendChild(s.dock);
    $('#hud-next').style.visibility = i === sections.length - 1 ? 'hidden' : 'visible';
    hud.classList.remove('swap');
  }, 180);
  $('#menu-count').textContent = `${String(i).padStart(2, '0')}/${String(sections.length - 1).padStart(2, '0')}`;
  $('#top-num').textContent = String(i).padStart(2, '0'); $('#top-title').textContent = s.title;
  bgfx.setWord(s.big);
  dotBtns.forEach((d, k) => d.classList.toggle('on', k === i));
  listBtns.forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); });
}

const pa = (b, k) => () => parts(b())[k];
const HOT = {
  inicio: [{ id: 'mitabla', label: 'Mi tabla', a: () => W.anchors.topC }],
  tabla: [
    { id: 'nose', label: 'Nose', a: () => (S.dir > 0 ? W.anchors.nose : W.anchors.tail) },
    { id: 'tail', label: 'Tail', a: () => (S.dir > 0 ? W.anchors.tail : W.anchors.nose), left: true },
    { id: 'cantos', label: 'Cantos', a: () => W.anchors.edge },
    { id: 'base', label: 'Base', a: () => W.anchors.baseSpot },
    { id: 'rocker', label: 'Rocker', a: () => W.anchors.rocker },
  ],
  fijaciones: [
    { id: 'highback', label: 'Highback', a: pa(bF, 'aHighback'), left: true },
    { id: 'straps', label: 'Straps', a: pa(bF, 'aAnkle') },
    { id: 'disco', label: 'Disco', a: pa(bF, 'aDisc') },
    { id: 'angulos', label: 'Ángulos', a: pa(bB, 'aToe'), left: true },
  ],
  stance: [
    { id: 'test', label: '¿Cuál eres?', a: () => W.anchors.center },
    { id: 'izq', label: 'Pie izq.', a: () => parts(W.bindL).aFoot, left: true },
    { id: 'der', label: 'Pie der.', a: () => parts(W.bindR).aFoot },
    { id: 'nose', label: 'Hacia aquí', a: () => W.arrow.userData.tip },
  ],
  postura: [
    { id: 'mirada', label: 'Mirada', a: () => P.aHead },
    { id: 'hombros', label: 'Hombros', a: () => P.aShoulder, left: true },
    { id: 'cadera', label: 'Cadera', a: () => P.aHip },
    { id: 'rodillas', label: 'Rodillas', a: () => P.aKnee },
  ],
  pedales: [
    { id: 'pieizq', label: 'Pedal izq.', a: () => parts(W.bindL).aFoot, left: true },
    { id: 'pieder', label: 'Pedal der.', a: () => parts(W.bindR).aFoot },
  ],
  cantos: [
    { id: 'talones', label: 'Talones', a: () => W.anchors.heelEdge, left: true },
    { id: 'puntas', label: 'Puntas', a: () => W.anchors.toeEdge },
  ],
  hoja: [
    { id: 'ejercicio', label: 'Cómo', a: () => P.aHead },
    { id: 'huella', label: 'La huella', a: () => W.anchors.center },
  ],
  giro: [
    { id: 'mirada', label: '1 · Mira', a: () => P.aHead },
    { id: 'pedal', label: '2 · Pedal', a: pa(bF, 'aFoot') },
    { id: 'plana', label: '3 · Plana', a: () => W.anchors.center, left: true },
    { id: 'cambio', label: '4 · Canto', a: () => W.anchors.toeEdge },
  ],
  trucos: [{ id: 'pasos', label: 'Cómo se hace', a: () => P.aHead }],
  consejos: TIPS.map((t, i) => ({ id: 'tip' + i, tip: t.e, label: t.t, a: () => W.ring[i], left: Math.cos((i / 8) * Math.PI * 2 + 0.3) < 0 })),
};

// Consejos → panel
$('#tips-infos').insertAdjacentHTML('beforeend', TIPS.map((t, i) => `<div class="info" data-info="tip${i}" hidden><div class="tip-emoji">${t.e}</div><h3>${t.t}</h3><p>${t.d}</p></div>`).join(''));

const hotRoot = $('#hotspots');
const HOTS = [];
for (const secId in HOT) for (const h of HOT[secId]) {
  const el = document.createElement('button');
  el.className = 'hot' + (h.left ? ' left' : '') + (h.tip ? ' tip' : '');
  el.innerHTML = `<i class="dot"></i><span class="lbl">${h.tip ? `<span class="e">${h.tip}</span> ` : ''}<span class="t">${h.label}</span></span>`;
  el.setAttribute('aria-label', h.label);
  el.addEventListener('click', (e) => { e.stopPropagation(); openInfo(secId, h.id); });
  hotRoot.appendChild(el);
  HOTS.push({ ...h, sec: secId, el, on: false });
}
const _p = new THREE.Vector3();
function updateHotspots(vw, vh) {
  const focusId = game.on ? null : SC.focus >= 0 ? sections[SC.focus].id : null;
  for (const H of HOTS) {
    const show = H.sec === focusId && cur.layers < 0.25 && cur.bexp < 0.25;
    if (show !== H.on) { H.on = show; H.el.classList.toggle('on', show); }
    H.el.classList.toggle('active', S.focus === H.id && H.sec === focusId);
    H.el.classList.toggle('visited', visited.has(H.sec + ':' + H.id));
    if (!show) continue;
    H.a().getWorldPosition(_p).project(camera);
    if (_p.z > 1) { H.el.style.opacity = 0; continue; }
    H.el.style.opacity = '';
    const x = clamp((_p.x * 0.5 + 0.5) * vw, 24, vw - 24), y = clamp((-_p.y * 0.5 + 0.5) * vh, 70, vh - 24);
    H.el.style.transform = H.left ? `translate(calc(${x}px - 100%), ${y}px)` : `translate(${x}px, ${y}px)`;
  }
}

function onFocusAction(secId, id) {
  if (secId === 'cantos' && (id === 'talones' || id === 'puntas')) setEdge(id === 'talones' ? 'back' : 'front');
  if (secId === 'pedales' && (id === 'pieizq' || id === 'pieder')) S.demo = { side: id === 'pieizq' ? 'L' : 'R', until: clock + 2.8 };
  if (secId === 'trucos') S.trickClock = 0;
}


/* ---------------- Etiquetas técnicas (vistas despiezadas) ---------------- */
const LA = W.layers.userData.anchors;
const frameAnchor = new THREE.Object3D();
const SPECS = [
  { sec: 'tabla', a: () => LA.top, n: '01', t: 'Top sheet', s: 'El oso · nylon impreso', v: () => cur.layers },
  { sec: 'tabla', a: () => LA.glass1, n: '02', t: 'Fibra de vidrio', s: 'Triaxial · da rigidez', v: () => cur.layers },
  { sec: 'tabla', a: () => LA.core, n: '03', t: 'Núcleo de madera', s: 'Álamo y haya · el alma', v: () => cur.layers },
  { sec: 'tabla', a: () => LA.glass2, n: '04', t: 'Fibra de vidrio', s: 'Biaxial · el flex', v: () => cur.layers },
  { sec: 'tabla', a: () => LA.base, n: '05', t: 'Base sinterizada', s: 'DRAKE · se encera', v: () => cur.layers },
  { sec: 'tabla', a: () => LA.edge, n: '06', t: 'Cantos de acero', s: 'Agarran la nieve', v: () => cur.layers },
  { sec: 'fijaciones', a: () => parts(bF()).aHighback, n: '01', t: 'Highback', s: 'Respaldo · forward lean', v: () => cur.bexp },
  { sec: 'fijaciones', a: () => parts(bF()).aAnkle, n: '02', t: 'Strap de tobillo', s: 'Acolchado · carraca', v: () => cur.bexp },
  { sec: 'fijaciones', a: () => parts(bF()).aToe, n: '03', t: 'Strap de puntera', s: 'Sujeta la punta', v: () => cur.bexp },
  { sec: 'fijaciones', a: () => frameAnchor, n: '04', t: 'Base y heelcup', s: 'Donde apoya la bota', v: () => cur.bexp },
  { sec: 'fijaciones', a: () => parts(bF()).aDisc, n: '05', t: 'Disco', s: '4 tornillos · el ángulo', v: () => cur.bexp },
];
const specRoot = $('#specs');
for (const sp of SPECS) {
  const el = document.createElement('div');
  el.className = 'spec';
  el.innerHTML = `<i></i><span class="ln"></span><span class="tx"><em>${sp.n}</em><b>${sp.t}</b><small>${sp.s}</small></span>`;
  specRoot.appendChild(el); sp.el = el; sp.on = false;
}
function updateSpecs(vw, vh, focusSec) {
  if (!frameAnchor.parent) { parts(bF()).frame.add(frameAnchor); frameAnchor.position.set(0.06, 0.03, 0.1); }
  else if (frameAnchor.parent !== parts(bF()).frame) parts(bF()).frame.add(frameAnchor);
  const sheet = document.body.classList.contains('sheet-open');
  for (const sp of SPECS) {
    const show = !game.on && !sheet && sp.sec === focusSec && sp.v() > 0.55;
    if (show !== sp.on) { sp.on = show; sp.el.classList.toggle('on', show); }
    if (!show) continue;
    sp.a().getWorldPosition(_p).project(camera);
    const x = (_p.x * 0.5 + 0.5) * vw, y = (-_p.y * 0.5 + 0.5) * vh;
    const len = mobile ? 26 : 70;
    sp.el.style.setProperty('--len', len + 'px');
    sp.el.style.transform = `translate(${x}px, ${y}px)`;
  }
}

/* ---------------- Controles ---------------- */
function segGroup(selector, attr, onPick) {
  $$(selector).forEach((btn) => btn.addEventListener('click', () => {
    const val = btn.dataset[attr];
    $$(selector).forEach((b) => b.classList.toggle('on', b.dataset[attr] === val));
    onPick(val, btn);
  }));
}
const angFront = $('#ang-front'), angBack = $('#ang-back');
const fmt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '°';
function setAngles(f, b) {
  S.angF = f; S.angB = b; angFront.value = f; angBack.value = b;
  $('#out-front').textContent = fmt(f); $('#out-back').textContent = fmt(b);
  let t;
  if (f > 0 && b < 0) t = 'Duck (pato): las dos puntas hacia fuera. La más cómoda para empezar y para ir en los dos sentidos.';
  else if (f >= 0 && b >= 0 && (f > 0 || b > 0)) t = 'Adelante: los dos pies hacia el nose. Más control en carving, peor para ir en switch.';
  else if (f === 0 && b === 0) t = 'Plano: pies rectos. Estable, pero las rodillas trabajan más.';
  else t = 'Ojo: el pie delantero mirando hacia atrás fuerza la rodilla. Prueba +15 / −6.';
  $('#angle-tip').textContent = t;
}
angFront.addEventListener('input', () => { setAngles(+angFront.value, S.angB); $$('[data-preset]').forEach((x) => x.classList.remove('on')); });
angBack.addEventListener('input', () => { setAngles(S.angF, +angBack.value); $$('[data-preset]').forEach((x) => x.classList.remove('on')); });
segGroup('[data-preset]', 'preset', (v) => { const [f, b] = v.split(',').map(Number); setAngles(f, b); });

function setStance(st) { S.stance = st; store.set('stance', st); $$('[data-stance]').forEach((b) => b.classList.toggle('on', b.dataset.stance === st)); }
segGroup('[data-stance]', 'stance', setStance);
setStance(S.stance);

function setSkin(sk) {
  const changed = S.skin !== sk;
  S.skin = sk; store.set('skin', sk); W.setSkin(sk);
  const th = THEMES[sk] || THEMES.drake;
  html.dataset.board = sk;
  studio.top.set(th.studio[0]); studio.bot.set(th.studio[1]);
  $('meta[name="theme-color"]').setAttribute('content', th.css.bg);
  $$('[data-skin]').forEach((b) => b.classList.toggle('on', b.dataset.skin === sk));
  if (changed) { spin.vy += 11; spin.idle = 0; } // la tabla da una vuelta al cambiar
}
$$('[data-skin]').forEach((b) => b.addEventListener('click', () => setSkin(b.dataset.skin)));
setSkin(S.skin);

const answers = [];
$$('#quiz .q').forEach((q) => {
  const qi = +q.dataset.q;
  $$('button', q).forEach((b) => b.addEventListener('click', () => {
    $$('button', q).forEach((x) => x.classList.toggle('on', x === b));
    answers[qi] = b.dataset.a;
    if (answers.filter(Boolean).length === 3) {
      let left = (answers[0] === 'L') + (answers[1] === 'L') + (answers[2] === 'R');
      const st = left >= 2 ? 'regular' : 'goofy';
      setStance(st);
      const r = $('#quiz-result'); r.hidden = false;
      r.innerHTML = st === 'regular' ? '<b>Eres regular</b>Pie izquierdo delante. Mira la tabla: ya está ajustada para ti.' : '<b>Eres goofy</b>Pie derecho delante. Mira cómo cambia la tabla: tu nose ahora está a la derecha.';
    }
  }));
});
segGroup('[data-crouch]', 'crouch', (v) => { S.crouch = +v; });
function setEdge(e) { S.edge = e; $$('[data-edge]').forEach((b) => b.classList.toggle('on', b.dataset.edge === e)); }
$$('[data-edge]').forEach((b) => b.addEventListener('click', () => setEdge(b.dataset.edge)));

function showTrick(name) {
  S.trick = name; S.trickClock = 0; S.trickYawBase = 0; S.trickYawS = 0;
  const t = TRICKS[name];
  $('#trick-info').innerHTML = `<div class="trick-info"><h3>${t.name}</h3><span class="lvl">${t.level}</span><p>${t.desc}</p><ol class="steps-list">${t.steps.map((s) => `<li>${s}</li>`).join('')}</ol></div>`;
}
segGroup('[data-trick]', 'trick', (v) => { showTrick(v); if (hudSection === byId.trucos.i) openInfo('trucos', 'pasos'); });
showTrick('ollie');

/* ---------------- Pedales ---------------- */
const input = { L: new Set(), R: new Set(), kL: false, kR: false };
$$('[data-pedal]').forEach((btn, n) => {
  const side = btn.dataset.pedal;
  const down = (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); input[side].add(n + ':' + e.pointerId); btn.classList.add('down'); };
  const up = (e) => { input[side].delete(n + ':' + e.pointerId); if (![...input[side]].some((k) => k.startsWith(n + ':'))) btn.classList.remove('down'); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});
const keyMap = { ArrowLeft: 'kL', KeyA: 'kL', ArrowRight: 'kR', KeyD: 'kR' };
addEventListener('keydown', (e) => { if (keyMap[e.code]) { input[keyMap[e.code]] = true; if (game.on) e.preventDefault(); } });
addEventListener('keyup', (e) => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
addEventListener('blur', () => { input.kL = input.kR = false; input.L.clear(); input.R.clear(); $$('.pedal.down').forEach((b) => b.classList.remove('down')); });
const demoOn = (side) => S.demo && S.demo.side === side && clock < S.demo.until && Math.sin((S.demo.until - clock) * 3) > -0.6;
const jumpKeys = { Space: 1, ArrowUp: 1, KeyW: 1 };
addEventListener('keydown', (e) => { if (jumpKeys[e.code] && game.on) { input.kJ = true; e.preventDefault(); } });
addEventListener('keyup', (e) => { if (jumpKeys[e.code]) input.kJ = false; });
input.J = new Set();
const jb = $('#jump-btn');
jb.addEventListener('pointerdown', (e) => { e.preventDefault(); jb.setPointerCapture?.(e.pointerId); input.J.add(e.pointerId); jb.classList.add('down'); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jb.addEventListener(ev, (e) => { input.J.delete(e.pointerId); if (!input.J.size) jb.classList.remove('down'); });
jb.addEventListener('contextmenu', (e) => e.preventDefault());
const inJ = () => input.kJ || input.J.size > 0;
const inL = () => input.kL || input.L.size > 0 || demoOn('L');
const inR = () => input.kR || input.R.size > 0 || demoOn('R');

/* ---------------- Juego ---------------- */
let gameMode = 'libre';
const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
function showBest() { const b = store.get('best-' + gameMode, 0); $('#best-score').textContent = b ? fmtTime(b) : '—'; }
segGroup('[data-mode]', 'mode', (v) => { gameMode = v; showBest(); });
showBest();
let msgTimer, trickTimer;
const gameUI = {
  start(mode) {
    document.body.classList.add('playing');
    $('#game').hidden = false; $('#game-over').hidden = true;
    $('#g-gates').textContent = mode === 'slalom' ? 'Puertas 0' : 'Pista roja';
    closeSheet();
  },
  stop() { document.body.classList.remove('playing'); $('#game').hidden = true; },
  countdown(v) { const m = $('#game-msg'); m.textContent = v; m.classList.add('on'); m.classList.remove('bad'); clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('on'), 500); },
  msg(t, bad) {
    const m = $('#game-msg'); m.textContent = t; m.classList.add('on'); m.classList.toggle('bad', !!bad);
    clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('on'), 800);
    if (bad) { const f = $('#flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); navigator.vibrate?.(80); }
  },
  trick(name, pts, combo, start) {
    const el = $('#g-trick');
    el.querySelector('b').textContent = name;
    el.querySelector('span').textContent = start ? '' : `+${pts}${combo > 1 ? `  ×${combo} combo` : ''}`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(trickTimer); trickTimer = setTimeout(() => el.classList.remove('on'), start ? 1400 : 1600);
  },
  hud(d) {
    $('#g-score').textContent = d.score;
    jb.style.setProperty('--charge', d.charge.toFixed(3));
    jb.classList.toggle('air', d.state === 'air');
    $('#g-speed').textContent = Math.round(d.kmh);
    $('#g-time').textContent = fmtTime(d.time);
    $('#g-prog').style.transform = `scaleX(${d.progress.toFixed(3)})`;
    if (d.mode === 'slalom') $('#g-gates').textContent = `Puertas ${d.gates}`;
  },
  finish(r) {
    $('#go-title').textContent = r.isBest ? '¡Nuevo récord!' : '¡Bajada completada!';
    $('#go-time').textContent = fmtTime(r.time);
    $('#go-top').textContent = Math.round(r.top * 3.6);
    $('#go-gates-box').hidden = r.mode !== 'slalom';
    $('#go-gates').textContent = `${r.gates}/${r.total}`;
    $('#go-score').textContent = r.score;
    $('#go-best').textContent = (r.isBest ? 'Tu mejor tiempo en esta pista.' : `Tu récord: ${fmtTime(r.best)}`) + ` · Récord de puntos: ${r.bestPts}`;
    setTimeout(() => { $('#game-over').hidden = false; }, 900);
    showBest();
  },
};
const game = createGame({ W, camera, S, inL, inR, inJ, store, ui: gameUI, renderer });
function quitGame() { game.stop(); W.shadow.quaternion.identity(); }
$('#play-btn').addEventListener('click', () => game.start(gameMode));
$('#again-btn').addEventListener('click', () => game.start(gameMode));
$('#quit-btn').addEventListener('click', quitGame);
$('#game-exit').addEventListener('click', quitGame);

/* ---------------- Simulación en la pista de prácticas ---------------- */
function stepSim(dt, mode, t) {
  const sim = S.sim;
  let tL = 0, tR = 0, speed = 0, spring = 0;
  const edgeSign = S.edge === 'back' ? 1 : -1;
  S.edgeYaw = damp(S.edgeYaw, S.edge === 'back' ? 0 : Math.PI, 4, dt);
  if (mode === 'drill') { tL = inL() ? 1 : 0; tR = inR() ? 1 : 0; speed = 0.7; }
  else if (mode === 'leaf') { const s = Math.sin(t * 0.75); tL = clamp(s * 1.8, 0, 1); tR = clamp(-s * 1.8, 0, 1); speed = 0.8; spring = 0.35; }
  else if (mode === 'hold') { tL = tR = 0.35; speed = 0.45; spring = 2; }
  else if (mode === 'turn') speed = 2.0;
  S.pL = damp(S.pL, tL, 9, dt); S.pR = damp(S.pR, tR, 9, dt);
  sim.speed = damp(sim.speed, speed, 3, dt);
  const d = S.pL - S.pR;
  if (mode === 'turn') {
    const A = 1.35, w = 0.8;
    sim.phi += dt * w;
    const x = A * Math.sin(sim.phi), vx = A * w * Math.cos(sim.phi), vz = Math.max(0.6, sim.speed), ax = -A * w * w * Math.sin(sim.phi);
    sim.v = (x - sim.x) / Math.max(dt, 1e-3);
    sim.x = damp(sim.x, x, 10, dt);
    const yawT = S.dir > 0 ? Math.atan2(-vz, vx) : Math.atan2(vz, -vx);
    sim.yaw += wrapAngle(yawT - sim.yaw) * (1 - Math.exp(-8 * dt));
    sim.roll = damp(sim.roll, clamp(ax * Math.sin(sim.yaw) * 0.7, -0.34, 0.34), 6, dt);
    sim.pitch = damp(sim.pitch, 0, 6, dt);
    S.edgeYaw = sim.yaw;
    const front = Math.abs(Math.cos(sim.phi));
    if (S.dir > 0) { S.pL = damp(S.pL, front, 6, dt); S.pR = damp(S.pR, 0.2, 6, dt); } else { S.pR = damp(S.pR, front, 6, dt); S.pL = damp(S.pL, 0.2, 6, dt); }
    const lbl = sim.roll > 0.07 ? 'Front · puntas' : sim.roll < -0.07 ? 'Back · talones' : 'Plana · cambio de canto';
    const el = $('#turn-label');
    if (el.textContent !== lbl) el.textContent = lbl;
    $('#turn-phase span').style.color = sim.roll > 0.07 ? 'var(--red)' : sim.roll < -0.07 ? 'var(--blue)' : '#fff';
  } else {
    sim.v += (d * 2.8 - sim.x * spring * edgeSign) * dt;
    sim.v *= Math.exp(-1.6 * dt);
    sim.x += sim.v * edgeSign * dt;
    if (Math.abs(sim.x) > 1.7) { sim.x = Math.sign(sim.x) * 1.7; sim.v *= -0.2; }
    sim.yaw += wrapAngle(S.edgeYaw - d * 0.3 * edgeSign - sim.yaw) * (1 - Math.exp(-6 * dt));
    sim.roll = damp(sim.roll, -(mode === 'hold' ? 0.3 : 0.13) * edgeSign, 5, dt);
    sim.pitch = damp(sim.pitch, -d * 0.05, 6, dt);
  }
}

function trickState(name, u) {
  const o = { y: 0, pitch: 0, yaw: 0, crouch: 0.5, shifty: 0, shiftX: 0, arms: 0.4 };
  const air = (a, b) => { const s = clamp((u - a) / (b - a), 0, 1); return 4 * s * (1 - s); };
  const pop = (sign) => {
    o.crouch = 0.5 + 0.4 * smooth(0, 0.2, u) - 0.75 * smooth(0.2, 0.27, u) + 0.6 * smooth(0.3, 0.4, u) - 0.15 * smooth(0.45, 0.55, u) + 0.25 * smooth(0.55, 0.6, u) - 0.35 * smooth(0.62, 0.85, u);
    o.pitch = sign * (0.34 * smooth(0.18, 0.26, u) - 0.4 * smooth(0.28, 0.42, u) + 0.06 * smooth(0.48, 0.58, u));
    o.y = air(0.25, 0.6) * 0.5; o.arms = 0.4 + air(0.25, 0.6) * 0.5;
  };
  if (name === 'ollie') pop(1);
  if (name === 'nollie') pop(-1);
  if (name === 'shifty') { pop(1); o.shifty = 0.75 * (smooth(0.3, 0.4, u) - smooth(0.45, 0.56, u)); }
  if (name === 'spin') { pop(1); o.yaw = Math.PI * smooth(0.27, 0.6, u); }
  if (name === 'press') { const k = smooth(0.12, 0.28, u) - smooth(0.62, 0.78, u); o.pitch = -0.22 * k; o.crouch = 0.5 + 0.15 * k; o.shiftX = 0.14 * k; o.arms = 0.4 + 0.3 * k; }
  return o;
}

/* ---------------- Huella (pista de prácticas) ---------------- */
const trailPts = [];
let trailAcc = 0;
function stepTrail(dt, active, speed) {
  for (const p of trailPts) p.z -= speed * dt;
  while (trailPts.length && trailPts[0].z < -8) trailPts.shift();
  trailAcc += dt;
  if (active && trailAcc > 1 / 40) {
    trailAcc = 0;
    const yaw = W.rig.rotation.y, ax = Math.cos(yaw), az = -Math.sin(yaw);
    const last = trailPts[trailPts.length - 1];
    let mx = 0, mz = 1;
    if (last) { mx = W.rig.position.x - last.x; mz = -last.z; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; }
    const px = mz, pz = -mx;
    trailPts.push({ x: W.rig.position.x, z: 0, px, pz, hw: 0.66 * Math.abs(ax * px + az * pz) + 0.07 });
    if (trailPts.length > W.TRAIL) trailPts.shift();
  }
  if (!active && speed < 0.01) trailPts.length = 0;
  const arr = W.trail.geometry.attributes.position.array, n = trailPts.length;
  for (let i = 0; i < W.TRAIL; i++) {
    const p = trailPts[Math.min(i, n - 1)] || { x: 0, z: -100, px: 0, pz: 0, hw: 0 };
    const hw = p.hw * (i < n ? Math.min(1, (i + 1) / 30) : 0);
    arr[i * 6] = p.x + p.px * hw; arr[i * 6 + 1] = 0; arr[i * 6 + 2] = p.z + p.pz * hw;
    arr[i * 6 + 3] = p.x - p.px * hw; arr[i * 6 + 4] = 0; arr[i * 6 + 5] = p.z - p.pz * hw;
  }
  W.trail.geometry.attributes.position.needsUpdate = true;
}

/* ---------------- Bucle ---------------- */
const studioTop = new THREE.Color('#07080b'), studioBot = new THREE.Color('#25272f');
const slopeTop = new THREE.Color('#3576c8'), slopeBot = new THREE.Color('#e9f2fc');
const footL = new THREE.Vector3(), footR = new THREE.Vector3();
let vw = 0, vh = 0, mobile = false, offX = 0, offY = 0, clock = 0, lastT = performance.now();
const statusEl = $('#pedal-status');
const meters = $$('.pedal .meter b').map((b) => ({ b, side: b.closest('.pedal').dataset.pedal }));

/* ---------------- Arrastrar para girar la tabla ---------------- */
canvas.addEventListener('pointerdown', (e) => {
  if (game.on) return;
  Object.assign(spin, { on: true, id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 });
  spin.vy *= 0.3; spin.vp *= 0.3;
  canvas.setPointerCapture?.(e.pointerId);
  document.body.classList.add('dragging'); cursorFx.setDrag(true);
});
canvas.addEventListener('pointermove', (e) => {
  if (!spin.on || e.pointerId !== spin.id) return;
  const now = performance.now(), dts = Math.max(0.008, (now - spin.t) / 1000);
  const dx = e.clientX - spin.x, dy = e.clientY - spin.y;
  spin.x = e.clientX; spin.y = e.clientY; spin.t = now;
  spin.moved += Math.abs(dx) + Math.abs(dy);
  const k = 0.0105;
  spin.yaw += dx * k;
  spin.vy = lerp(spin.vy, (dx * k) / dts, 0.5);
  if (e.pointerType === 'mouse') { spin.pitch = clamp(spin.pitch + dy * 0.008, -1.1, 1.1); spin.vp = lerp(spin.vp, (dy * 0.008) / dts, 0.5); }
  spin.idle = 0;
});
const endSpin = (e) => { if (e.pointerId !== spin.id) return; spin.on = false; document.body.classList.remove('dragging'); cursorFx.setDrag(false); if (spin.moved > 8) html.classList.add('spun'); };
canvas.addEventListener('pointerup', endSpin);
canvas.addEventListener('pointercancel', endSpin);
function stepSpin(dt) {
  if (!spin.on) {
    spin.yaw += spin.vy * dt; spin.pitch = clamp(spin.pitch + spin.vp * dt, -1.1, 1.1);
    spin.vy *= Math.exp(-1.4 * dt); spin.vp *= Math.exp(-3 * dt);
    spin.idle += dt;
    if (spin.idle > 2.6 && Math.abs(spin.vy) < 0.6) {
      const home = Math.round(spin.yaw / (Math.PI * 2)) * Math.PI * 2;
      spin.yaw = damp(spin.yaw, home, 1.8, dt); spin.pitch = damp(spin.pitch, 0, 1.8, dt);
    }
  }
}

function resize() {
  vw = innerWidth; vh = innerHeight; mobile = mobileMQ.matches;
  renderer.setSize(vw, vh, false);
  canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
  camera.aspect = vw / vh; camera.updateProjectionMatrix();
  measure();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
new ResizeObserver(measure).observe($('main'));
resize();

function frame(now) {
  scroller.raf(now);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now; clock += dt;
  const t = clock;
  readScroll();
  $('#progress-bar').style.transform = `scaleX(${SC.progress})`;
  if (!game.on) setHud(SC.active);

  S.dir = damp(S.dir, S.stance === 'goofy' ? -1 : 1, 5, dt);
  S.angFs = damp(S.angFs, S.angF, 8, dt); S.angBs = damp(S.angBs, S.angB, 8, dt);
  const deg = Math.PI / 180, dSign = Math.sign(S.dir) || 1;
  const aF = S.angFs * deg * S.dir, aB = S.angBs * deg * S.dir;
  W.bindL.rotation.y = lerp(aB, aF, (S.dir + 1) / 2);
  W.bindR.rotation.y = lerp(aF, aB, (S.dir + 1) / 2);

  const secId = sections[SC.active].id;
  const focusSec = SC.focus >= 0 ? sections[SC.focus].id : null;
  const rig = W.rig;
  let riderOpt = null, modeId = secId, mode = 'still';
  let tr = { y: 0, pitch: 0, yaw: 0, crouch: 0.5, shifty: 0, shiftX: 0, arms: 0.4 };

  if (!game.on) {
    const A = sections[SC.a], B = sections[SC.b];
    const target = mixPose(POSES[A.id](t, SC.pa), POSES[B.id](t, SC.pb), SC.f);
    dampPose(target, dt, 4.5);
    mode = SIM_MODE[modeId] || 'still';
    stepSim(dt, mode, t);
    if (cur.trick > 0.01) {
      S.trickClock += dt;
      if (S.trickClock > 2.6) { S.trickClock -= 2.6; if (S.trick === 'spin') S.trickYawBase += Math.PI; }
      tr = trickState(S.trick, S.trickClock / 2.6);
      S.trickYawS = S.trickYawBase + tr.yaw;
    }
  } else {
    dampPose(POSES.juego(t), dt, 4.5);
    cur.rider = cur.boots = 1; cur.slope = 0; cur.sim = 0; cur.trick = 0; cur.explode = 0; cur.arrow = 0; cur.edges = 0; cur.glow = 1;
    riderOpt = game.update(dt, t);
    spin.yaw = spin.pitch = spin.vy = spin.vp = 0;
  }
  const sim = S.sim, sw = cur.sim, tw = cur.trick;
  stepSpin(dt);
  const boardOnly = 1 - clamp(cur.rider, 0, 1);

  // Acciones de los puntos en las fijaciones y la tabla
  const inFij = focusSec === 'fijaciones';
  S.lift = damp(S.lift, inFij && S.focus === 'disco' ? 1 : 0, 5, dt);
  S.straps = damp(S.straps, inFij && S.focus === 'straps' ? 1 : 0, 5, dt);
  S.hbFold = inFij && S.focus === 'highback' ? Math.sin((t - S.focusT) * 2.2) * 0.5 + 0.5 : damp(S.hbFold, 0, 5, dt);
  const lx = cur.layers, bx = cur.bexp;
  W.layers.userData.set(lx);
  W.board.visible = lx < 0.03;
  W.heelEdge.visible = W.toeEdge.visible = lx < 0.03;
  if (lx < 0.03) W.layers.visible = false;
  for (const b of [W.bindL, W.bindR]) {
    const p = parts(b), k = b === bF() ? 1 : 0.35;
    b.position.y = BOARD.T / 2 + 0.002 + S.lift * 0.16 * k + lx * 0.6 + bx * 0.03 * k;
    p.disc.position.y = 0.004 - S.lift * 0.12 * k - bx * 0.05 * k;
    for (const sc of p.screws) sc.position.y = 0.006 + bx * 0.09 * k;
    p.frame.position.y = bx * 0.065 * k;
    p.highback.position.set(0, 0.06 + bx * 0.19 * k, -0.06 - bx * 0.1 * k);
    p.highback.rotation.x = -0.22 - S.hbFold * 0.45 * k - bx * 0.25 * k;
    p.ankle.position.set(0, 0.075 + bx * 0.25 * k, -0.045 + bx * 0.02 * k);
    p.toe.position.set(0, 0.035 + bx * 0.16 * k, 0.088 + bx * 0.13 * k);
    p.ankle.rotation.x = -S.straps * 1.6 * k;
    p.toe.rotation.x = S.straps * 1.2 * k + bx * 0.2 * k;
    p.boot.visible = cur.boots > 0.02;
    p.boot.scale.setScalar(Math.max(0.001, cur.boots));
  }
  W.mats.boot.opacity = W.mats.bootDark.opacity = W.mats.bootAccent.opacity = clamp(cur.boots * 1.5, 0, 1);

  if (!game.on) {
    const pitchComp = Math.abs(Math.sin(tr.pitch * tw)) * 0.72;
    rig.position.set(cur.pos[0] + sim.x * sw, cur.pos[1] + (tr.y + pitchComp) * tw, cur.pos[2]);
    rig.rotation.set(cur.rot[0] + sim.roll * sw + spin.pitch * boardOnly, cur.rot[1] + sim.yaw * sw + S.trickYawS * tw + spin.yaw * boardOnly, cur.rot[2] + sim.pitch * sw + tr.pitch * dSign * tw);
    W.boardGroup.rotation.y = tr.shifty * tw;
  }

  // Cantos, brillos, flecha
  const edgeModes = modeId === 'cantos' || modeId === 'hoja' || modeId === 'pedales';
  const pulse = focusSec === 'tabla' && S.focus === 'cantos' ? 0.6 + 0.4 * Math.sin(t * 6) : 1;
  W.heelEdge.material.opacity = cur.edges * (edgeModes ? (S.edge === 'back' ? 1 : 0.12) : 1) * pulse;
  W.toeEdge.material.opacity = cur.edges * (edgeModes ? (S.edge === 'front' ? 1 : 0.12) : 1) * pulse;
  let pl = S.pL, pr = S.pR;
  if (modeId === 'postura') pl = pr = 0.5;
  if (focusSec === 'stance') { pl = S.focus === 'izq' ? 1 : 0; pr = S.focus === 'der' ? 1 : 0; }
  const gl = focusSec === 'stance' ? 1 : cur.glow;
  W.glowL.material.opacity = gl * pl * 0.95; W.glowR.material.opacity = gl * pr * 0.95;
  W.glowL.scale.setScalar(0.7 + pl * 0.6); W.glowR.scale.setScalar(0.7 + pr * 0.6);
  const arrowPulse = focusSec === 'stance' && S.focus === 'nose' ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
  W.arrow.material.opacity = cur.arrow * arrowPulse;
  W.arrow.visible = cur.arrow > 0.01;
  W.arrow.position.set(S.dir * 0.92, 0.03, 0.22);
  W.arrow.scale.set(S.dir, 1, 1);

  // Rider
  rig.updateMatrixWorld(true);
  const rv = cur.rider;
  W.rider.visible = rv > 0.02;
  if (W.rider.visible) {
    W.rider.rotation.z = -tr.pitch * dSign * tw * 0.6;
    W.rider.position.y = (1 - Math.min(1, rv)) * 1.2;
    W.rider.scale.setScalar(Math.max(0.001, Math.min(1, rv * 1.1)));
    W.rider.updateMatrixWorld(true);
    parts(W.bindL).aAnkleBone.getWorldPosition(footL); W.rider.worldToLocal(footL);
    parts(W.bindR).aAnkleBone.getWorldPosition(footR); W.rider.worldToLocal(footR);
    let o;
    if (riderOpt) o = riderOpt;
    else {
      const d = S.pL - S.pR;
      const edgeLean = sw * (mode === 'turn' ? sim.roll * 0.35 : (S.edge === 'back' ? -0.07 : 0.07));
      let lookT = mode === 'turn' ? 0.9 * dSign : mode === 'still' ? 0.85 * dSign : clamp(sim.v * 0.6, -1, 1) * (S.edge === 'back' ? 1 : -1) + 0.3 * dSign;
      if (focusSec === 'postura' && S.focus === 'mirada') lookT = dSign * (0.9 + Math.sin(t * 1.5) * 0.3);
      let crouch = lerp(cur.crouch, tr.crouch, tw);
      if (focusSec === 'postura' && S.focus === 'rodillas') crouch = 0.45 + Math.sin((t - S.focusT) * 3) * 0.25;
      S.look = damp(S.look, lookT, 4, dt);
      o = { crouch, shiftX: d * 0.11 * sw + tr.shiftX * dSign * tw, shiftZ: edgeLean, lookYaw: S.look, arms: lerp(0.4, tr.arms, tw), twist: 0 };
    }
    poseRider(W.rider, footL, footR, o);
  }

  // Pista de prácticas
  const sl = cur.slope;
  W.slope.visible = sl > 0.01 && !game.on;
  W.groundMat.opacity = sl;
  for (const m of W.treeMats) m.opacity = sl;
  W.trailMat.opacity = sl * 0.4;
  const speed = sim.speed * sw;
  W.snowMap.offset.y -= speed * dt * (24 / 60);
  for (const tree of W.trees) { tree.position.z -= speed * dt; if (tree.position.z < -8) tree.position.z += 48; }
  if (!game.on) {
    stepTrail(dt, sw > 0.5 && sl > 0.5, speed);
    W.shadow.material.opacity = sl * 0.85;
    W.shadow.position.set(rig.position.x, 0.004, rig.position.z);
    W.shadow.rotation.set(-Math.PI / 2, 0, rig.rotation.y);
    const sh = 1 - clamp((rig.position.y - GROUND) * 1.2, 0, 0.6);
    W.shadow.scale.set(sh, sh, 1);
  }

  // Cielo y luces
  const day = game.on ? 1 : sl;
  W.bgSphere.material.opacity = day;
  W.bgSphere.visible = day > 0.01;
  W.scene.environment = day > 0.5 ? W.envMountain : W.envStudio;
  document.body.classList.toggle('day', day > 0.6);
  W.catcher.material.opacity = 0.38 * (1 - sl);
  W.scene.fog.color.set('#dde5ee');
  W.scene.fog.near = game.on ? 70 : 300;
  W.scene.fog.far = game.on ? 700 : 600;
  if (!game.on) { W.key.position.set(lerp(2.2, -3.2, day), lerp(4.5, 4.6, day), lerp(1.6, 5.5, day)); W.key.target.position.set(0, 0, 0); }
  W.hemi.intensity = lerp(0.6, 1.25, day);
  W.warm.intensity = lerp(1.6, 0, day);
  W.rim.intensity = lerp(1.4, 0.3, day);
  renderer.toneMappingExposure = lerp(1.0, 0.95, day);

  // Cámara
  if (!game.on) {
    const aspect = vw / vh;
    const zoom = aspect < 1.25 ? 1 + (clamp(1.3 / aspect, 1, 2.9) - 1) * cur.mk : 1;
    const look = cur.look, cp = cur.cam;
    // Con rider: arrastrar hace girar la cámara alrededor
    const orb = spin.yaw * (1 - boardOnly), ca = Math.cos(orb), sa = Math.sin(orb);
    let ox0 = (cp[0] - look[0]) * zoom, oz0 = (cp[2] - look[2]) * zoom;
    const ox1 = ox0 * ca + oz0 * sa, oz1 = -ox0 * sa + oz0 * ca;
    camera.position.set(look[0] + ox1, look[1] + (cp[1] - look[1]) * zoom, look[2] + oz1);
    camera.lookAt(look[0], look[1], look[2]);
    const sheet = document.body.classList.contains('sheet-open');
    const hero = secId === 'inicio';
    let ox = 0, oy = 0;
    if (mobile) oy = vh * (sheet ? 0.27 : hero ? 0.05 : 0.17);
    else { ox = vw * (sheet ? 0.16 : hero ? -0.12 : -0.1); oy = hero ? 0 : -vh * 0.03; }
    offX = damp(offX, ox, 5, dt); offY = damp(offY, oy, 5, dt);
    camera.setViewOffset(vw, vh, offX, offY, vw, vh);
  } else camera.clearViewOffset();
  W.bgSphere.position.copy(camera.position);

  // Copos
  const fp = W.flakes.geometry.attributes.position, fa = fp.array, fs = W.flakes.userData.speed;
  for (let i = 0; i < fs.length; i++) {
    fa[i * 3 + 1] -= fs[i] * dt;
    fa[i * 3] += Math.sin(t * 0.7 + i) * 0.08 * dt;
    fa[i * 3 + 2] -= speed * dt * 0.9;
    if (fa[i * 3 + 1] < -2) fa[i * 3 + 1] += 9;
    if (fa[i * 3 + 2] < -9) fa[i * 3 + 2] += 18;
  }
  fp.needsUpdate = true;
  if (riderOpt) W.flakes.position.set(riderOpt.flakeAt.x, riderOpt.flakeAt.y - 1, riderOpt.flakeAt.z);
  else W.flakes.position.set(cur.look[0], 0, cur.look[2]);

  for (const m of meters) m.b.style.transform = `scaleX(${(m.side === 'L' ? S.pL : S.pR).toFixed(3)})`;
  if (modeId === 'pedales' && !game.on) {
    const d = S.pL - S.pR;
    const txt = d > 0.25 ? '← Pie izquierdo · vas a la izquierda' : d < -0.25 ? 'Pie derecho · vas a la derecha →' : 'Peso repartido · tabla recta';
    if (statusEl.textContent !== txt) statusEl.textContent = txt;
  }

  renderer.render(W.scene, camera);
  updateHotspots(vw, vh);
  updateSpecs(vw, vh, focusSec);
  bgfx.update(SC.progress, SC.active === SC.a ? SC.pa : SC.pb);
  requestAnimationFrame(frame);
}

requestAnimationFrame((now) => { lastT = now; frame(now); loaderProgress(1); setTimeout(() => { $('#loader').classList.add('done'); html.classList.add('ready'); }, 450); });

/* ---------------- Instalar ---------------- */
let deferredPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('#install-btn').hidden = false; });
$('#install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => {});
  deferredPrompt = null; $('#install-btn').hidden = true;
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__snow = { W, S, game, RUN, input };

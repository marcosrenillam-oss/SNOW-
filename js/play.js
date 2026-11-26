// Página del juego: la montaña abierta (separada de la clase).
import * as THREE from 'three';
import { buildWorld, poseRider } from './world.js';
import { createGame } from './game.js';
import { buildBackdrop } from './backdrop.js';
import { loaderProgress } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('snowprofe:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('snowprofe:' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
const html = document.documentElement;
const LOW = matchMedia('(max-width: 820px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const S = { dir: store.get('stance', 'regular') === 'goofy' ? -1 : 1, pL: 0, pR: 0, skin: store.get('skin', 'drake') };

loaderProgress(0.1);
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
const PR_MAX = Math.min(devicePixelRatio, LOW ? 1.5 : 2);
let PR = PR_MAX;
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOW ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(50, 1, 0.15, 3200);

const W = await buildWorld(renderer);
loaderProgress(0.5);
W.scene.environment = W.envStudio;
W.flakes.visible = false; W.catcher.visible = false; W.slope.visible = false; W.layers.visible = false; W.sky.visible = false;
if (LOW) W.key.shadow.mapSize.set(1024, 1024);
const BD = buildBackdrop(W.scene, { low: LOW });
BD.ground.visible = false;
const parts = (b) => b.userData.parts;
for (const b of [W.bindL, W.bindR]) { parts(b).boot.visible = true; parts(b).boot.scale.setScalar(1); }
W.mats.boot.opacity = W.mats.bootDark.opacity = W.mats.bootAccent.opacity = 1;
const deg = Math.PI / 180;
W.bindL.rotation.y = (S.dir > 0 ? 15 : -6) * deg * S.dir;
W.bindR.rotation.y = (S.dir > 0 ? -6 : 15) * deg * S.dir;

function setSkin(sk) {
  S.skin = sk; store.set('skin', sk); W.setSkin(sk); html.dataset.board = sk;
  $$('[data-skin]').forEach((b) => b.classList.toggle('on', b.dataset.skin === sk));
}
$$('[data-skin]').forEach((b) => b.addEventListener('click', () => setSkin(b.dataset.skin)));
setSkin(S.skin);

/* ---------- Entrada ---------- */
const input = { L: new Set(), R: new Set(), J: new Set(), kL: false, kR: false, kJ: false };
$$('[data-pedal]').forEach((btn, n) => {
  const side = btn.dataset.pedal;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); input[side].add(n + ':' + e.pointerId); btn.classList.add('down'); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, (e) => { input[side].delete(n + ':' + e.pointerId); if (![...input[side]].some((k) => k.startsWith(n + ':'))) btn.classList.remove('down'); });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});
const jb = $('#jump-btn');
jb.addEventListener('pointerdown', (e) => { e.preventDefault(); jb.setPointerCapture?.(e.pointerId); input.J.add(e.pointerId); jb.classList.add('down'); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jb.addEventListener(ev, (e) => { input.J.delete(e.pointerId); if (!input.J.size) jb.classList.remove('down'); });
jb.addEventListener('contextmenu', (e) => e.preventDefault());
const keyMap = { ArrowLeft: 'kL', KeyA: 'kL', ArrowRight: 'kR', KeyD: 'kR', Space: 'kJ', ArrowUp: 'kJ', KeyW: 'kJ' };
addEventListener('keydown', (e) => {
  if (keyMap[e.code]) { input[keyMap[e.code]] = true; if (game.on) e.preventDefault(); }
  if (e.code === 'Escape' && game.on) toMenu();
  if (e.code === 'KeyE' && game.on) game.lift();
});
addEventListener('keyup', (e) => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
addEventListener('blur', () => { input.kL = input.kR = input.kJ = false; input.L.clear(); input.R.clear(); input.J.clear(); });
const inL = () => input.kL || input.L.size > 0, inR = () => input.kR || input.R.size > 0, inJ = () => input.kJ || input.J.size > 0;

/* ---------- Interfaz ---------- */
let spawn = store.get('spawn', 'azul'), msgTimer, trickTimer;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function showBest() { $('#best-points').textContent = store.get('best-points', 0); $('#best-drop').textContent = Math.round(store.get('best-drop', 0)); }
function setSpawn(sp) { spawn = sp; store.set('spawn', sp); $$('[data-spawn]').forEach((x) => x.classList.toggle('on', x.dataset.spawn === sp)); }
$$('[data-spawn]').forEach((b) => b.addEventListener('click', () => setSpawn(b.dataset.spawn)));
setSpawn(spawn); showBest();
let last = { score: 0, drop: 0 };
const ui = {
  start() { document.body.classList.add('playing'); $('#game').hidden = false; $('#start').hidden = true; camera.clearViewOffset(); },
  stop() {
    document.body.classList.remove('playing'); $('#game').hidden = true; $('#start').hidden = false;
    if (last.score > store.get('best-points', 0)) store.set('best-points', last.score);
    if (last.drop > store.get('best-drop', 0)) store.set('best-drop', last.drop);
    showBest();
  },
  msg(t, bad) {
    const m = $('#game-msg'); m.textContent = t; m.classList.add('on'); m.classList.toggle('bad', !!bad);
    clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('on'), 900);
    if (bad) { const f = $('#flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); navigator.vibrate?.(80); }
  },
  trick(name, pts, combo, start) {
    const el = $('#g-trick');
    el.querySelector('b').textContent = name;
    el.querySelector('span').textContent = start ? '' : `+${pts}${combo > 1 ? `  ×${combo} combo` : ''}`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(trickTimer); trickTimer = setTimeout(() => el.classList.remove('on'), 1600);
  },
  where(w) { const el = $('#g-where'); el.textContent = w; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
  hud(d) {
    last = { score: d.score, drop: d.drop };
    $('#g-score').textContent = d.score;
    jb.style.setProperty('--charge', d.charge.toFixed(3)); jb.classList.toggle('air', d.state === 'air');
    $('#g-speed').textContent = Math.round(d.kmh); $('#g-time').textContent = fmtTime(d.time);
    $("#g-drop").textContent = `${Math.round(d.drop)} m ↓`;
  },
};
const game = createGame({ W, camera, S, inL, inR, inJ, store, ui, low: LOW, minimap: $('#minimap') });
loaderProgress(0.9);
setTimeout(() => W.loadOutdoor().then(() => game.MT.setSnowNormal(W.snowTextures.snowNm)), 600);
function toMenu() { game.stop(); }
$('#play-btn').addEventListener('click', () => game.start(spawn));
$('#game-exit').addEventListener('click', toMenu);
$('#lift-btn').addEventListener('click', () => game.lift());

/* ---------- Bucle ---------- */
const footL = new THREE.Vector3(), footR = new THREE.Vector3(), center = new THREE.Vector3();
const meters = $$('.pedal .meter b').map((b) => ({ b, side: b.closest('.pedal').dataset.pedal }));
let vw = 0, vh = 0, lastT = performance.now(), clock = 0;
function resize() { vw = innerWidth; vh = innerHeight; renderer.setSize(vw, vh, false); canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px'; camera.aspect = vw / vh; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const perf = { n: 0, t: 0 };
function governor(dt) {
  perf.n++; perf.t += dt;
  if (perf.t < 1.5) return;
  const fps = perf.n / perf.t; perf.n = perf.t = 0;
  if (document.hidden) return;
  let next = PR;
  if (fps < 45 && PR > 0.8) next = Math.max(0.75, PR - 0.25);
  else if (fps > 58 && PR < PR_MAX) next = Math.min(PR_MAX, PR + 0.25);
  if (next !== PR) { PR = next; renderer.setPixelRatio(PR); renderer.setSize(vw, vh, false); }
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  governor((now - lastT) / 1000);
  lastT = now; clock += dt;
  let opt;
  if (game.on) opt = game.update(dt, clock);
  else {
    opt = game.preview(spawn, clock, dt);
    opt.lookYaw = S.dir * 0.8; opt.crouch = 0.5; opt.arms = 0.4;
    // en el ordenador, el rider a la derecha del menú
    if (vw > 820) camera.setViewOffset(vw, vh, -vw * 0.2, 0, vw, vh); else camera.setViewOffset(vw, vh, 0, vh * 0.26, vw, vh);
  }
  center.copy(opt.flakeAt);
  W.rig.updateMatrixWorld(true);
  W.rider.visible = true; W.rider.position.set(0, 0, 0); W.rider.scale.setScalar(1); W.rider.rotation.set(0, 0, 0);
  W.rider.updateMatrixWorld(true);
  parts(W.bindL).aAnkleBone.getWorldPosition(footL); W.rider.worldToLocal(footL);
  parts(W.bindR).aAnkleBone.getWorldPosition(footR); W.rider.worldToLocal(footR);
  poseRider(W.rider, footL, footR, opt);
  BD.update(clock, dt, { studio: 0, center, camera, speedZ: 0, fall: 1 });
  for (const m of meters) m.b.style.transform = `scaleX(${(m.side === 'L' ? S.pL : S.pR).toFixed(3)})`;
  renderer.render(W.scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame((now) => { lastT = now; frame(now); loaderProgress(1); setTimeout(() => $('#loader').classList.add('done'), 400); });
window.__snow = { renderer, W, S, game, input };

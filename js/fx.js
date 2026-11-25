// Efectos de interfaz: scroll suave, cursor de nieve, fondo con crestas, palabra gigante, intro, texto partido.
import Lenis from '../vendor/lenis.mjs';

const fine = matchMedia('(pointer: fine)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Scroll suave ---------- */
export function initScroll() {
  if (!fine || reduce) return { scrollTo: (y) => window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }), raf() {}, stop() {}, start() {} };
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  return {
    scrollTo: (y) => lenis.scrollTo(y, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) }),
    raf: (t) => lenis.raf(t),
    stop: () => lenis.stop(), start: () => lenis.start(),
  };
}

/* ---------- Texto partido en palabras ---------- */
export function splitInto(el, text) {
  el.innerHTML = text.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join('');
}

/* ---------- Intro con contador ---------- */
export function loaderProgress(p) {
  const c = document.getElementById('ld-count'), b = document.getElementById('ld-bar');
  if (c) c.textContent = String(Math.round(p * 100)).padStart(3, '0');
  if (b) b.style.transform = `scaleX(${p})`;
}

/* ---------- Crestas de montaña (fbm) ---------- */
function noise1(x, seed) {
  const s = (n) => { const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return s(i) * (1 - u) + s(i + 1) * u;
}
function ridgePath(seed, base, amp, freq, W = 1600, H = 600) {
  let d = `M0 ${H}`;
  for (let x = 0; x <= W; x += 8) {
    let y = 0, a = 1, f = freq;
    for (let o = 0; o < 5; o++) { y += (1 - Math.abs(noise1(x * f, seed + o) * 2 - 1)) * a; a *= 0.5; f *= 2.1; }
    d += ` L${x} ${(base - y * amp).toFixed(1)}`;
  }
  return d + ` L${W} ${H} Z`;
}
export function initBackground() {
  const groups = [];
  const word = document.getElementById('bg-word');
  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  return {
    update(progress, local) {
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      groups.forEach((g) => { const k = +g.dataset.k; g.setAttribute('transform', `translate(${(-mx * 600 * k).toFixed(1)} ${(progress * 900 * k - my * 200 * k).toFixed(1)})`); });
      word.style.transform = `translate(calc(-50% + ${(-mx * 30).toFixed(1)}px), calc(-50% + ${((0.5 - local) * 160 - my * 20).toFixed(1)}px))`;
    },
    setWord(text) {
      if (word.dataset.t === text) return;
      word.dataset.t = text;
      word.classList.add('swap');
      setTimeout(() => { word.textContent = text; word.classList.remove('swap'); }, 350);
    },
  };
}

/* ---------- Cursor y copos ---------- */
export function initCursor() {
  const cv = document.getElementById('snowfx');
  const g = cv.getContext('2d');
  const cur = document.getElementById('cursor');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio, 2);
  const resize = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);
  const flakes = [];
  let px = -100, py = -100, lx = -100, ly = -100, cx = -100, cy = -100;
  const spawn = (x, y, n, power = 1) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.2 + Math.random() * 1.2) * power;
      flakes.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3 * power, r: 0.6 + Math.random() * 2.1, life: 1, decay: 0.006 + Math.random() * 0.012, w: Math.random() * 6 });
    }
    if (flakes.length > 420) flakes.splice(0, flakes.length - 420);
  };
  if (fine) document.documentElement.classList.add('has-cursor');
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    const d = Math.hypot(px - lx, py - ly);
    if (d > 6) { spawn(px, py, Math.min(4, Math.ceil(d / 14)), 0.8); lx = px; ly = py; }
  }, { passive: true });
  addEventListener('pointerdown', (e) => spawn(e.clientX, e.clientY, fine ? 26 : 14, 2.2), { passive: true });
  document.addEventListener('pointerover', (e) => {
    const h = e.target.closest?.('button, a, input, .hot');
    cur.classList.toggle('hover', !!h);
  });
  let t = 0;
  function frame() {
    t += 1;
    g.clearRect(0, 0, W, H);
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.vy += 0.018; f.vx *= 0.985; f.vy *= 0.985;
      f.x += f.vx + Math.sin((t + f.w * 40) * 0.03) * 0.25; f.y += f.vy + 0.25;
      f.life -= f.decay;
      if (f.life <= 0) { flakes.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, f.life * 1.4) * 0.9;
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      g.fillStyle = '#fff'; g.fill();
    }
    g.globalAlpha = 1;
    cx += (px - cx) * 0.22; cy += (py - cy) * 0.22;
    cur.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { setDrag: (on) => cur.classList.toggle('drag', on) };
}

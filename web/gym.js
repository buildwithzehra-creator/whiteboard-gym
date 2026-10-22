// Whiteboard Gym layer on top of Mochiboard's app.js (website only).
// 1. The interview panel (Maya + Leo) takes Mochi's place in the dock and the chat.
// 2. Folio rulers along the top and left of the board, following pan and zoom.
(() => {
  if (!window.MB || !MB.cloud) return;
  const $ = id => document.getElementById(id);

  // ---------- 1. the interview panel ----------
  const PANEL = [
    { id: 'maya', initial: 'M', name: 'Maya', role: 'Design Manager' },
    { id: 'leo', initial: 'L', name: 'Leo', role: 'Design Engineer' },
  ];
  const faces = () => `<span class="wg-faces" aria-hidden="true">${PANEL.map(p => `<i class="wg-av wg-${p.id}" title="${p.name} · ${p.role}">${p.initial}</i>`).join('')}</span>`;
  const ASK = 'Ask the panel… “who is the primary user?”';

  // dock pill
  const pill = $('mPill');
  if (pill) { pill.insertAdjacentHTML('afterbegin', faces()); const n = $('mName'); if (n) n.textContent = 'Panel'; }
  // chat header
  const head = document.querySelector('#mochi .mc-head');
  if (head) { const b = head.querySelector('b'); if (b) b.outerHTML = `${faces()}<b class="wg-title">Maya &amp; Leo <small>your interview panel</small></b>`; }
  for (const id of ['mInput', 'mcInput']) { const i = $(id); if (i) i.placeholder = ASK; }
  // the little bubble's "mochi" label
  const sm = document.querySelector('#mBubble small'); if (sm) sm.textContent = 'panel';
  // keyboard hints
  document.querySelectorAll('#keys span').forEach(s => { if (/ask Mochi/.test(s.textContent)) s.lastChild.textContent = ' ask the panel'; });
  // tab icon: a small blue board instead of Mochi
  const fav = document.querySelector('link[rel=icon]');
  if (fav) fav.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="20" rx="4" fill="#F4F4F2" stroke="#111" stroke-width="2"/><path d="M9 20l5-6 4 4 5-7" fill="none" stroke="#2F7CF6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');

  // ---------- 2. folio rulers ----------
  const stage = document.querySelector('.stage'), world = document.querySelector('.world');
  if (!stage || !world) return;
  const SIZE = 22;
  const mk = cls => { const c = document.createElement('canvas'); c.className = 'wg-ruler ' + cls; stage.appendChild(c); return c; };
  const top = mk('wg-ruler-top'), left = mk('wg-ruler-left');
  const corner = document.createElement('div'); corner.className = 'wg-ruler-corner'; stage.appendChild(corner);

  const view = () => { const m = new DOMMatrixReadOnly(getComputedStyle(world).transform); return { x: m.e, y: m.f, z: m.a || 1 }; };
  const STEPS = [10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  function draw(c, horizontal, v) {
    const dpr = window.devicePixelRatio || 1, len = horizontal ? stage.clientWidth : stage.clientHeight;
    const w = horizontal ? len : SIZE, h = horizontal ? SIZE : len;
    if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px'; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const step = STEPS.find(s => s * v.z >= 80) || 5000, minor = step / 10 * v.z >= 6 ? step / 10 : step / 5;
    const off = horizontal ? v.x : v.y, start = Math.floor(-off / v.z / minor) * minor, end = (len - off) / v.z;
    g.fillStyle = '#C9C9C4'; g.font = '9px Inter, system-ui, sans-serif'; g.textBaseline = 'top';
    for (let u = start; u <= end; u += minor) {
      const p = Math.round(off + u * v.z) + .5, big = Math.abs(u / step - Math.round(u / step)) < 1e-6, t = big ? 9 : 4;
      if (horizontal) g.fillRect(p, SIZE - t, 1, t); else g.fillRect(SIZE - t, p, t, 1);
      if (big) {
        g.fillStyle = '#6B6B67';
        if (horizontal) g.fillText(String(Math.round(u)), p + 3, 3);
        else { g.save(); g.translate(3, p - 3); g.rotate(-Math.PI / 2); g.fillText(String(Math.round(u)), 0, 0); g.restore(); }
        g.fillStyle = '#C9C9C4';
      }
    }
  }
  let queued = false;
  const redraw = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; const v = view(); draw(top, true, v); draw(left, false, v); }); };
  new MutationObserver(redraw).observe(world, { attributes: true, attributeFilter: ['style'] });
  addEventListener('resize', redraw);
  redraw();
})();

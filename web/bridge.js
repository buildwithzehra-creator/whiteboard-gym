// The bridge between the canvas and wherever it's running.
// Inside the Mac app, calls go to Swift (saving board files, link previews, asking Mochi through Claude Code).
// In a plain browser (for building and demos) it falls back to localStorage and a pretend Mochi.
//
// Whiteboard Gym adds a third mode, "cloud": the website at whiteboardgym.com (or `npm run dev`).
// Boards still live in localStorage for now (Supabase comes on Day 4); thinking goes to our own
// serverless API (/api/ask), which calls Claude with the server's key. Add ?demo to any URL for the
// original offline pretend-Mochi mode.
(() => {
  const native = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mb);
  const waiting = new Map(); let seq = 0;
  // Swift answers with window.__mbReply(id, ok, value)
  window.__mbReply = (id, ok, value) => { const w = waiting.get(id); if (!w) return; waiting.delete(id); ok ? w.res(value) : w.rej(new Error(value)); };
  const call = (op, args = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); window.webkit.messageHandlers.mb.postMessage({ id, op, args }); });

  const LS = 'mochiboard:';
  // Whiteboard Gym: the website thinks through /api unless ?demo is in the address
  const cloud = !native && !/[?&]demo\b/.test(location.search);
  // the web demo: a real website (or ?web) can't reach Claude Code, Mobbin or Higgsfield on the visitor's computer
  const web = !native && !cloud && (!/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname) || /[?&]web\b/.test(location.search));
  if (cloud) document.documentElement.classList.add('cloud');
  // Whiteboard Gym: skip Mochiboard's Mochi tour and greeting (our own onboarding is the spin wheel)
  if (cloud) try { if (!localStorage.getItem(LS + 'onboarded')) localStorage.setItem(LS + 'onboarded', '1'); const st = JSON.parse(localStorage.getItem(LS + 'settings') || '{}'); let ch = false; if (!('greet' in st)) { st.greet = false; ch = true; } if (!('cursor' in st)) { st.cursor = '#2F7CF6'; ch = true; } if (ch) localStorage.setItem(LS + 'settings', JSON.stringify(st)); } catch (e) {}
  const browser = {
    async list() { return JSON.parse(localStorage.getItem(LS + 'index') || '[]'); },
    async load(id) { const s = localStorage.getItem(LS + 'board:' + id); return s ? JSON.parse(s) : null; },
    async save(board) {
      localStorage.setItem(LS + 'board:' + board.id, JSON.stringify(board));
      const idx = JSON.parse(localStorage.getItem(LS + 'index') || '[]').filter(b => b.id !== board.id);
      idx.unshift({ id: board.id, name: board.name, color: board.color, folder: board.folder || null, parent: board.parent || null, updated: Date.now() });
      localStorage.setItem(LS + 'index', JSON.stringify(idx)); return true;
    },
    async folders() { return JSON.parse(localStorage.getItem(LS + 'folders') || '[]'); },
    async saveFolders(folders) { localStorage.setItem(LS + 'folders', JSON.stringify(folders)); return true; },
    async remove(id) { localStorage.removeItem(LS + 'board:' + id); localStorage.setItem(LS + 'index', JSON.stringify(JSON.parse(localStorage.getItem(LS + 'index') || '[]').filter(b => b.id !== id))); return true; },
    web, getURL: 'https://github.com/jessawolfe-ux/mochiboard/releases/latest/download/Mochiboard.zip',
    async connections() { return { claude: false, mobbin: false, higgsfield: false, browser: true, web }; },
    async usage() { return null; }, async resetUsage() { return true; }, async version() { return null; },
    async fetchImage(url) { return url; },
    async openURL(url) { window.open(url, '_blank'); },
    async speechAuth() { return 'ok'; },
    async higgsQuote() { throw new Error('Higgsfield works in the Mac app'); },
    async higgsMake() { throw new Error('Higgsfield works in the Mac app'); },
    async drawFill() { throw new Error('Drawing illustrations works in the Mac app'); },
    async fonts() { return ['DM Sans', 'Caveat', 'Inter', 'Helvetica Neue', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'SF Pro Display', 'Avenir Next', 'Futura', 'Menlo']; },
    async exportRect() { throw new Error('Exporting works in the Mac app'); },
    async transcribe() { throw new Error('Mochi writes out voice memos in the Mac app'); },
    async reveal() { alert('Your boards live in this browser while you try Mochiboard here. In the Mac app this opens their folder.'); },
    async linkPreview(url) { let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {} return { title: host, desc: url, image: '' }; },
    // a pretend Mochi for the browser: she still tidies things up so the canvas can be tried without the app
    async ask(prompt, board) {
      await new Promise(r => setTimeout(r, 900));
      const notes = board.cards.filter(c => c.type === 'note');
      if (/group|sort|organi[sz]e|tidy/i.test(prompt) && notes.length) {
        const cx = Math.min(...board.cards.map(c => c.x)), cy = Math.min(...board.cards.map(c => c.y));
        return JSON.stringify({ say: `I lined up your ${notes.length} notes into one tidy column. (In the Mac app I'd really sort them by theme with Claude.)`,
          titles: [{ text: 'Sorted', x: cx, y: cy - 90 }], move: notes.map((n, i) => ({ id: n.id, x: cx + (i % 3) * 250, y: cy + Math.floor(i / 3) * 170 })) });
      }
      return JSON.stringify({ say: "Here's a little starter set! (This is pretend Mochi in the browser. In the Mac app I think with Claude Code.)",
        add: [{ type: 'note', text: 'What is this for?', color: 'butter' }, { type: 'note', text: 'Who will see it?', color: 'mint' }, { type: 'note', text: 'What does done look like?', color: 'lilac' }] });
    },
  };

  // Whiteboard Gym: the cloud version. Same canvas, thinking goes to our serverless API.
  const api = async (path, body) => {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) { let msg = t; try { msg = JSON.parse(t).error || t; } catch (e) {} throw new Error(msg || ('HTTP ' + r.status)); }
    return t;
  };
  const cloudMB = Object.assign({}, browser, {
    web: false, cloud: true,
    async connections() { return { claude: true, mobbin: false, higgsfield: false, browser: false, web: false, cloud: true }; },
    async reveal() { alert('Your boards live in this browser for now. Signing in to keep them in the cloud is coming soon.'); },
    // the board goes up as JSON (no screenshots): Claude reads exactly what's on it
    ask: (prompt, board) => api('/api/ask', { prompt, board }),
  });

  window.MB = native ? {
    native: true,
    list: () => call('list'), load: id => call('load', { id }), save: board => call('save', { board }), remove: id => call('remove', { id }),
    folders: () => call('folders'), saveFolders: folders => call('saveFolders', { folders }),
    usage: () => call('usage'), resetUsage: () => call('resetUsage'), version: () => call('version'),
    linkPreview: url => call('linkPreview', { url }), ask: (prompt, board, confirmed = false, opts = {}) => call('ask', { prompt, board, confirmed, ...opts }),
    connections: () => call('connections'), fetchImage: url => call('fetchImage', { url }), openURL: url => call('openURL', { url }), reveal: () => call('reveal'), transcribe: audio => call('transcribe', { audio }), speechAuth: () => call('speechAuth'), exportRect: o => call('export', o), fonts: () => call('fonts'), higgsQuote: o => call('higgsQuote', o || {}), updateCheck: () => call('updateCheck'), updateNow: () => call('updateNow'), higgsMake: o => call('higgsMake', o), drawFill: o => call('drawFill', o),
  } : cloud ? Object.assign({ native: false }, cloudMB) : Object.assign({ native: false }, browser);
})();

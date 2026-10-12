/* ==========================================================================
   Ular Tangga Modern — core.js
   Utilitas, penyimpanan lokal (pengaturan, statistik, simpanan permainan),
   dan toast. Wajib dimuat pertama.
   ========================================================================== */

(function () {
  'use strict';

  const UT = (window.UT = window.UT || {});

  /* ----------------------------------------------------------------------
     Utilitas
     ---------------------------------------------------------------------- */

  UT.$ = (sel, root = document) => root.querySelector(sel);
  UT.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  UT.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  UT.randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  UT.clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /** Fisher-Yates; mengembalikan array baru. */
  UT.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = UT.randInt(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  UT.pick = (arr) => arr[UT.randInt(0, arr.length - 1)];

  UT.debounce = (fn, wait = 150) => {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  /** Hormati preferensi sistem untuk gerakan minimal. */
  UT.reducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     Toast: slip kertas di kanan atas
     ---------------------------------------------------------------------- */

  function toastStack() {
    let el = document.getElementById('toast-stack');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-stack';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  UT.toast = (message, type = 'info', ms = 2800) => {
    const stack = toastStack();
    const slip = document.createElement('div');
    slip.className = `toast paper toast--${type}`;
    slip.textContent = String(message);

    while (stack.children.length >= 4) stack.removeChild(stack.firstElementChild);

    stack.appendChild(slip);
    setTimeout(() => {
      slip.classList.add('is-hiding');
      setTimeout(() => slip.remove(), 260);
    }, ms);
  };

  /* ----------------------------------------------------------------------
     Penyimpanan lokal
     ---------------------------------------------------------------------- */

  const KEY = {
    settings: 'ut.settings.v2',
    stats: 'ut.stats.v2',
    save: 'ut.save.v2',
  };

  const SETTINGS_DEFAULT = {
    players: 2,
    mode: 'classic',
    sound: true,
    music: true,
  };

  const STATS_DEFAULT = {
    totalGames: 0,
    lastWinner: '',
    humanWins: 0,
    aiWins: 0,
    longestGame: 0,
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ...fallback };
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return { ...fallback };
      return { ...fallback, ...data };
    } catch (err) {
      console.warn('[UT] localStorage rusak, memakai nilai awal:', key, err);
      return { ...fallback };
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[UT] Gagal menyimpan:', key, err);
      return false;
    }
  }

  /* ---- Pengaturan ------------------------------------------------------ */

  UT.getSettings = () => {
    const raw = read(KEY.settings, SETTINGS_DEFAULT);
    return {
      players: UT.clamp(parseInt(raw.players, 10) || 2, 2, 4),
      mode: raw.mode === 'speed' ? 'speed' : 'classic',
      sound: raw.sound !== false,
      music: raw.music !== false,
    };
  };

  UT.saveSettings = (patch) => {
    const next = { ...UT.getSettings(), ...patch };
    next.players = UT.clamp(parseInt(next.players, 10) || 2, 2, 4);
    next.mode = next.mode === 'speed' ? 'speed' : 'classic';
    next.sound = next.sound !== false;
    next.music = next.music !== false;
    write(KEY.settings, next);
    return next;
  };

  /* ---- Statistik ------------------------------------------------------- */

  UT.getStats = () => {
    const raw = read(KEY.stats, STATS_DEFAULT);
    return {
      totalGames: Math.max(0, parseInt(raw.totalGames, 10) || 0),
      lastWinner: typeof raw.lastWinner === 'string' ? raw.lastWinner : '',
      humanWins: Math.max(0, parseInt(raw.humanWins, 10) || 0),
      aiWins: Math.max(0, parseInt(raw.aiWins, 10) || 0),
      longestGame: Math.max(0, parseInt(raw.longestGame, 10) || 0),
    };
  };

  /**
   * Catat hasil satu permainan.
   * @param {{name: string, isAI: boolean}} winner
   * @param {number} turnCount jumlah giliran yang dipakai
   */
  UT.recordResult = (winner, turnCount = 0) => {
    const s = UT.getStats();
    s.totalGames += 1;
    s.lastWinner = String(winner.name || '');
    if (winner.isAI) s.aiWins += 1;
    else s.humanWins += 1;
    s.longestGame = Math.max(s.longestGame, Math.max(0, parseInt(turnCount, 10) || 0));
    write(KEY.stats, s);
    return s;
  };

  UT.resetStats = () => {
    write(KEY.stats, { ...STATS_DEFAULT });
    return UT.getStats();
  };

  /* ---- Simpanan permainan (lanjut setelah refresh) --------------------- */

  /**
   * Simpan keadaan permainan yang sedang berjalan.
   * @param {object} snapshot
   */
  UT.saveGame = (snapshot) => write(KEY.save, snapshot);

  UT.loadGame = () => {
    try {
      const raw = localStorage.getItem(KEY.save);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.players) || data.players.length < 2) return null;
      return data;
    } catch (err) {
      console.warn('[UT] Simpanan permainan tidak terbaca:', err);
      return null;
    }
  };

  UT.clearGame = () => {
    try {
      localStorage.removeItem(KEY.save);
    } catch (err) {
      console.warn('[UT] Gagal menghapus simpanan:', err);
    }
  };

  UT.hasGame = () => Boolean(UT.loadGame());
})();

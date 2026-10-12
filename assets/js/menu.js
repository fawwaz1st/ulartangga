/* ==========================================================================
   Ular Tangga Modern — menu.js
   Menu: pengaturan, statistik, navigasi, dan tawaran melanjutkan permainan.
   Bergantung pada core.js, icons.js, audio.js.
   ========================================================================== */

(function () {
  'use strict';

  const UT = window.UT;

  const el = {};

  function cache() {
    el.loading = document.getElementById('loading-overlay');
    el.settingsModal = document.getElementById('settings-modal');
    el.rulesModal = document.getElementById('rules-modal');
    el.playerRow = document.getElementById('opt-players');
    el.modeRow = document.getElementById('opt-mode');
    el.soundSwitch = document.getElementById('sw-sound');
    el.musicSwitch = document.getElementById('sw-music');
    el.stGames = document.getElementById('st-games');
    el.stWinner = document.getElementById('st-winner');
    el.stHuman = document.getElementById('st-human');
    el.resumeModal = document.getElementById('resume-modal');
    el.resumeText = document.getElementById('resume-text');
  }

  /* ----------------------------------------------------------------------
     Statistik
     ---------------------------------------------------------------------- */

  function renderStats() {
    const s = UT.getStats();
    el.stGames.textContent = s.totalGames.toLocaleString('id-ID');
    el.stWinner.textContent = s.lastWinner || 'Belum ada';
    el.stHuman.textContent = s.humanWins.toLocaleString('id-ID');
  }

  /* ----------------------------------------------------------------------
     Pengaturan
     ---------------------------------------------------------------------- */

  function renderSettings() {
    const cfg = UT.getSettings();

    UT.$$('.option', el.playerRow).forEach((b) => {
      const on = parseInt(b.dataset.value, 10) === cfg.players;
      b.setAttribute('aria-pressed', String(on));
    });

    UT.$$('.option', el.modeRow).forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === cfg.mode));
    });

    el.soundSwitch.setAttribute('aria-checked', String(cfg.sound));
    el.musicSwitch.setAttribute('aria-checked', String(cfg.music));
  }

  function bindSettings() {
    el.playerRow.addEventListener('click', (e) => {
      const b = e.target.closest('.option');
      if (!b) return;
      UT.saveSettings({ players: parseInt(b.dataset.value, 10) });
      renderSettings();
      UT.Audio.play('press');
    });

    el.modeRow.addEventListener('click', (e) => {
      const b = e.target.closest('.option');
      if (!b) return;
      UT.saveSettings({ mode: b.dataset.value });
      renderSettings();
      UT.Audio.play('press');
    });

    el.soundSwitch.addEventListener('click', () => {
      UT.saveSettings({ sound: !UT.getSettings().sound });
      renderSettings();
      UT.Audio.play('press');
    });

    el.musicSwitch.addEventListener('click', () => {
      UT.saveSettings({ music: !UT.getSettings().music });
      UT.Audio.syncMusic();
      renderSettings();
      UT.Audio.play('press');
    });
  }

  /* ----------------------------------------------------------------------
     Modal
     ---------------------------------------------------------------------- */

  const openModal = (m) => m && m.classList.add('show');
  const closeModal = (m) => m && m.classList.remove('show');

  function bindModals() {
    UT.$$('[data-open-modal]').forEach((b) => {
      b.addEventListener('click', () => {
        UT.Audio.play('press');
        openModal(document.getElementById(b.dataset.openModal));
      });
    });

    UT.$$('[data-close-modal]').forEach((b) => {
      b.addEventListener('click', () => closeModal(document.getElementById(b.dataset.closeModal)));
    });

    UT.$$('.modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UT.$$('.modal.show').forEach(closeModal);
    });
  }

  /* ----------------------------------------------------------------------
     Navigasi
     ---------------------------------------------------------------------- */

  function goToGame() {
    UT.Audio.play('press');
    if (el.loading) el.loading.classList.add('show');
    setTimeout(() => { window.location.href = 'game.html'; }, 600);
  }

  /* ----------------------------------------------------------------------
     Simpanan permainan
     ---------------------------------------------------------------------- */

  function offerResume() {
    const save = UT.loadGame();
    if (!save) return false;

    const who = save.players
      .map((p) => `${p.name} di ${p.pos}`)
      .slice(0, 2)
      .join(', ');
    if (el.resumeText) {
      el.resumeText.textContent = `${save.players.length} pemain, ${who}. Giliran ke-${(save.turns || 0) + 1}.`;
    }
    openModal(el.resumeModal);

    document.getElementById('btn-resume').addEventListener('click', () => {
      goToGame();
    });

    document.getElementById('btn-fresh').addEventListener('click', () => {
      UT.clearGame();
      closeModal(el.resumeModal);
      goToGame();
    });

    return true;
  }

  /* ----------------------------------------------------------------------
     Mulai
     ---------------------------------------------------------------------- */

  function init() {
    cache();
    renderStats();
    renderSettings();
    bindSettings();
    bindModals();

    document.getElementById('btn-start').addEventListener('click', () => {
      if (!offerResume()) goToGame();
    });

    // Segarkan statistik saat kembali lewat cache riwayat.
    window.addEventListener('pageshow', (e) => { if (e.persisted) renderStats(); });

    setTimeout(() => { if (el.loading) el.loading.classList.remove('show'); }, 320);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

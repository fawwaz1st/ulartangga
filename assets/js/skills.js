// Skill System for Ular Tangga Game
// Features: Skill cards, cooldowns, effects, animations

(function() {
  'use strict';

  // Create a single global tooltip for skills to avoid CSS stacking/overflow issues
  let globalSkillTooltip = null;
  function ensureGlobalSkillTooltip() {
    if (!globalSkillTooltip) {
      globalSkillTooltip = document.createElement('div');
      globalSkillTooltip.id = 'skill-tooltip-global';
      globalSkillTooltip.setAttribute('role', 'tooltip');
      // Basic inline styles as fallback; main styles live in CSS
      globalSkillTooltip.style.position = 'fixed';
      globalSkillTooltip.style.opacity = '0';
      globalSkillTooltip.style.visibility = 'hidden';
      globalSkillTooltip.style.pointerEvents = 'none';
      document.body.appendChild(globalSkillTooltip);
    }
    return globalSkillTooltip;
  }

  // Turn end: decrement cooldowns and refresh UI
  function processTurnCooldowns(playerId) {
    if (!playerId || !skillCooldowns[playerId]) return;
    const cds = skillCooldowns[playerId];
    Object.keys(cds).forEach((skillId) => {
      const v = cds[skillId] || 0;
      cds[skillId] = Math.max(0, v - 1);
    });
    updateSkillUI();
  }

  // Map emoji yang kurang didukung ke emoji alternatif (bukan simbol teks)
  const SAFE_ICON_MAP = {
    '🪜': '⬆️',     // ladder -> up arrow emoji
    '🛡': '🛡️',     // force emoji presentation for shield
    '🛡️': '🛡️',
    '⬅': '⬅️',     // force emoji presentation for left arrow
    '⬅️': '⬅️'
  };

  function ensureEmojiPresentation(s) {
    if (!s || typeof s !== 'string') return s;
    // For characters that have text/emoji presentation, force emoji with FE0F
    const needsFE0F = ['⬅', '⬆', '⬇', '➡', '↩', '↪', '⇧', '™', '©', '®'];
    const base = s.replace('\uFE0F', '');
    if (needsFE0F.includes(base) && !s.includes('\uFE0F')) {
      return base + '\uFE0F';
    }
    return s;
  }

  function getSafeIcon(icon, fallback = '🎯') {
    if (!icon || typeof icon !== 'string' || icon.trim() === '') return fallback;
    const candidate = SAFE_ICON_MAP[icon] || SAFE_ICON_MAP[icon.replace('\uFE0F', '')] || icon;
    return ensureEmojiPresentation(candidate) || fallback;
  }

  // Skill definitions
  const SKILLS = {
    DOUBLE_ROLL: {
      id: 'double_roll',
      name: 'Dadu Ganda',
      icon: '🎲',
      description: 'Lempar dadu dua kali lalu pilih hasil terbaik',
      cooldown: 3,
      rarity: 'common',
      effect: 'DICE_MANIPULATION'
    },
    LADDER_BOOST: {
      id: 'ladder_boost',
      name: 'Pacu Tangga',
      icon: '🪜',
      description: 'Tangga berikutnya memberi +3 langkah ekstra',
      cooldown: 4,
      rarity: 'uncommon',
      effect: 'LADDER_ENHANCEMENT'
    },
    SNAKE_IMMUNITY: {
      id: 'snake_immunity',
      name: 'Perisai Ular',
      icon: '🛡️',
      description: 'Kebal terhadap ular berikutnya',
      cooldown: 5,
      rarity: 'rare',
      effect: 'SNAKE_PROTECTION'
    },
    TELEPORT: {
      id: 'teleport',
      name: 'Teleport',
      icon: '✨',
      description: 'Maju ke posisi mana pun antara 10-20 langkah di depan',
      cooldown: 6,
      rarity: 'epic',
      effect: 'POSITION_MANIPULATION'
    },
    SWAP_POSITIONS: {
      id: 'swap_positions',
      name: 'Tukar Posisi',
      icon: '🔄',
      description: 'Tukar posisi dengan lawan mana pun',
      cooldown: 7,
      rarity: 'legendary',
      effect: 'PLAYER_MANIPULATION'
    },
    EXTRA_TURN: {
      id: 'extra_turn',
      name: 'Giliran Tambahan',
      icon: '⏰',
      description: 'Mendapat satu giliran ekstra setelah ini',
      cooldown: 5,
      rarity: 'rare',
      effect: 'TURN_MANIPULATION'
    },
    DICE_BOOST: {
      id: 'dice_boost',
      name: 'Dorongan Dadu',
      icon: '🚀',
      description: 'Tambahkan +2 pada lemparan dadu berikutnya',
      cooldown: 3,
      rarity: 'uncommon',
      effect: 'DICE_ENHANCEMENT'
    },
    BACKWARD_MOVE: {
      id: 'backward_move',
      name: 'Dorong Mundur',
      icon: '⬅️',
      description: 'Geser lawan target mundur 5 langkah',
      cooldown: 4,
      rarity: 'uncommon',
      effect: 'OPPONENT_MANIPULATION'
    },
    SHIELD_BREAK: {
      id: 'shield_break',
      name: 'Hancurkan Perisai',
      icon: '💥',
      description: 'Hapus semua efek aktif dari lawan',
      cooldown: 6,
      rarity: 'epic',
      effect: 'EFFECT_REMOVAL'
    },
    LUCKY_SEVEN: {
      id: 'lucky_seven',
      name: 'Pasti Enam',
      icon: '🍀',
      description: 'Dijamin mendapat angka 6 pada giliran berikutnya',
      cooldown: 4,
      rarity: 'rare',
      effect: 'DICE_CONTROL'
    }
  };

  // Skill rarity colors
  const RARITY_COLORS = {
    common: '#9ca3af',
    uncommon: '#10b981',
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b'
  };

  // Player skill states
  let playerSkills = {};
  let skillCooldowns = {};
  let activeEffects = {};

  // Initialize skills for all players
  function initializeSkills() {
    const players = window.getPlayers ? window.getPlayers() : [];
    playerSkills = {};
    skillCooldowns = {};
    activeEffects = {};

    players.forEach(player => {
      playerSkills[player.id] = generateRandomSkills(player.isAI ? 2 : 3);
      skillCooldowns[player.id] = {};
      activeEffects[player.id] = {};
    });
  }

  // Generate random skills for a player
  function generateRandomSkills(count = 3) {
    const availableSkills = Object.values(SKILLS);
    const selectedSkills = [];
    
    while (selectedSkills.length < count && selectedSkills.length < availableSkills.length) {
      const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      if (!selectedSkills.find(s => s.id === randomSkill.id)) {
        selectedSkills.push({...randomSkill});
      }
    }
    
    return selectedSkills;
  }

  // Use a skill
  function useSkill(playerId, skillId) {
    const skill = Object.values(SKILLS).find(s => s.id === skillId);
    if (!skill) return false;

    // Check cooldown
    const cooldown = skillCooldowns[playerId][skillId] || 0;
    if (cooldown > 0) {
      if (window.AudioSystem) {
        window.AudioSystem.playSFX('error');
      }
      if (window.showNotification) {
        window.showNotification(`Skill masih cooldown ${cooldown} turn!`, 'error');
      }
      return false;
    }

    // Apply skill effect
    const success = applySkillEffect(playerId, skill);
    if (success) {
      // Play skill activation sound
      if (window.AudioSystem) {
        window.AudioSystem.playSFX('skill_activate');
      }
      
      // Set cooldown
      skillCooldowns[playerId][skillId] = skill.cooldown;
      if (window.showNotification) {
        window.showNotification(`${skill.name} diaktifkan!`, 'success');
      }
      updateSkillUI();
      return true;
    }

    return false;
  }

  // Apply skill effects
  function applySkillEffect(playerId, skill) {
    // Hanya satu skill aktif yang diperbolehkan
    if (Object.keys(activeEffects[playerId] || {}).length > 0) {
      showSkillNotification('Hanya satu skill yang bisa aktif dalam satu waktu!', 'warning');
      return false;
    }

    switch (skill.effect) {
      case 'DICE_MANIPULATION':
        activeEffects[playerId] = activeEffects[playerId] || {};
        activeEffects[playerId].double_roll = true;
        showSkillNotification('Dadu Ganda aktif! Lempar dadu dua kali di giliran ini.', 'success');
        return true;

      case 'LADDER_ENHANCEMENT':
        activeEffects[playerId] = activeEffects[playerId] || {};
        activeEffects[playerId].ladder_boost = true;
        showSkillNotification('Pacu Tangga aktif! 3 tangga berikutnya memberi +3 langkah ekstra.', 'success');
        return true;

      case 'SNAKE_PROTECTION':
        activeEffects[playerId] = activeEffects[playerId] || {};
        activeEffects[playerId].snake_immunity = true;
        showSkillNotification('Perisai Ular aktif! Kebal terhadap 2 ular berikutnya.', 'success');
        return true;

      case 'POSITION_MANIPULATION':
        return handleTeleport(playerId);

      case 'PLAYER_MANIPULATION':
        return handlePositionSwap(playerId);

      case 'TURN_MANIPULATION':
        activeEffects[playerId] = activeEffects[playerId] || {};
        activeEffects[playerId].extra_turn = true;
        showSkillNotification('Giliran Tambahan aktif! Dapatkan giliran ekstra setelah giliran ini.', 'success');
        return true;

      case 'DICE_ENHANCEMENT':
        activeEffects[playerId] = activeEffects[playerId] || {};
        activeEffects[playerId].dice_boost = true;
        showSkillNotification('Dadu Emas aktif! Lemparan dadu berikutnya mendapat +2.', 'success');
        return true;

      case 'OPPONENT_MANIPULATION':
        return handleBackwardMove(playerId);

      case 'EFFECT_REMOVAL':
        return handleShieldBreak(playerId);

      case 'DICE_CONTROL':
        activeEffects[playerId] = activeEffects[playerId] || {};
        activeEffects[playerId].lucky_seven = true;
        showSkillNotification('Lucky Seven aktif! Dapatkan angka 6 di lemparan berikutnya.', 'success');
        return true;

      default:
        return false;
    }
  }

  // Handle teleport skill
  function handleTeleport(playerId) {
    const players = window.getPlayers ? window.getPlayers() : [];
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    const currentPos = player.pos;
    const minMove = Math.min(10, 100 - currentPos);
    const maxMove = Math.min(20, 100 - currentPos);
    
    if (minMove <= 0) return false;

    const moveDistance = Math.floor(Math.random() * (maxMove - minMove + 1)) + minMove;
    const newPos = Math.min(currentPos + moveDistance, 100);
    
    if (window.movePlayerTo) {
      window.movePlayerTo(playerId, newPos);
    }
    
    return true;
  }

  // Handle position swap skill
  function handlePositionSwap(playerId) {
    const players = window.getPlayers ? window.getPlayers() : [];
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    // Cek apakah ada lawan yang valid untuk ditukar
    const opponents = players.filter(p => 
      p.id !== playerId && 
      p.pos > 1 && 
      p.pos !== player.pos // Pastikan tidak menukar posisi dengan diri sendiri
    );
    
    if (opponents.length === 0) {
      showSkillNotification('Tidak ada lawan yang bisa ditukar posisinya!', 'warning');
      return false;
    }

    // Pilih lawan terdekat untuk ditukar
    const target = opponents.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.pos - player.pos);
      const currentDiff = Math.abs(current.pos - player.pos);
      return currentDiff < closestDiff ? current : closest;
    });

    // Simpan posisi asli untuk animasi
    const originalPlayerPos = player.pos;
    const originalTargetPos = target.pos;

    // Update posisi
    player.pos = originalTargetPos;
    target.pos = originalPlayerPos;

    // Update posisi di papan dengan animasi
    if (window.positionToken) {
      // Animasikan perpindahan
      window.positionToken(playerId, player.pos, {
        onComplete: () => {
          // Setelah selesai, periksa apakah ada tangga/ular di posisi baru
          if (window.checkCellEffect) {
            window.checkCellEffect(playerId, player.pos);
          }
        }
      });
      
      window.positionToken(target.id, target.pos, {
        onComplete: () => {
          if (window.checkCellEffect) {
            window.checkCellEffect(target.id, target.pos);
          }
        }
      });
    }

    // Notifikasi
    if (window.showNotification) {
      window.showNotification(
        `🔀 ${player.name} menukar posisi dengan ${target.name}!\n` +
        `${player.name} dari posisi ${originalPlayerPos} → ${player.pos}\n` +
        `${target.name} dari posisi ${originalTargetPos} → ${target.pos}`,
        'info'
      );
    }

    // Update UI
    if (window.updateUI) window.updateUI();

    return true;
  }

  // Handle backward move skill
  function handleBackwardMove(playerId) {
    const players = window.getPlayers ? window.getPlayers() : [];
    const opponents = players.filter(p => p.id !== playerId && p.pos > 5);
    if (opponents.length === 0) return false;

    const target = opponents[Math.floor(Math.random() * opponents.length)];
    target.pos = Math.max(1, target.pos - 5);

    if (window.positionToken) {
      window.positionToken(target.id, target.pos);
    }

    if (window.showNotification) {
      window.showNotification(`${target.name} terdorong mundur 5 langkah!`, 'warning');
    }
    if (window.updateUI) window.updateUI();

    return true;
  }

  // Handle shield break skill
  function handleShieldBreak(playerId) {
    const players = window.getPlayers ? window.getPlayers() : [];
    let shieldBroken = false;
    
    players.forEach(p => {
      if (p.id !== playerId && activeEffects[p.id]) {
        // Hapus semua efek aktif lawan
        const effectCount = Object.keys(activeEffects[p.id]).length;
        if (effectCount > 0) {
          activeEffects[p.id] = {};
          shieldBroken = true;
          
          // Beri tahu pemain bahwa perisainya hancur
          if (window.showNotification) {
            window.showNotification(`Perisai ${p.name} telah dihancurkan!`, 'warning');
          }
        }
      }
    });
    
    if (!shieldBroken) {
      showSkillNotification('Tidak ada perisai yang bisa dihancurkan!', 'warning');
      return false;
    }
    
    updateSkillUI();
    return true;
  }

  // Get random skill excluding current player skills
  function getRandomSkillExcluding(currentSkills) {
    const availableSkills = Object.values(SKILLS);
    const currentSkillIds = currentSkills.map(s => s.id);
    const availableNewSkills = availableSkills.filter(s => !currentSkillIds.includes(s.id));
    
    if (availableNewSkills.length === 0) {
      // If all skills are taken, return a random one anyway
      return availableSkills[Math.floor(Math.random() * availableSkills.length)];
    }
    
    return availableNewSkills[Math.floor(Math.random() * availableNewSkills.length)];
  }

  // Check and apply active effects
  function checkActiveEffects(playerId, context) {
    const effects = activeEffects[playerId] || {};

    switch (context) {
      case 'DICE_ROLL':
        if (effects.double_roll) {
          delete activeEffects[playerId].double_roll;
          return { type: 'DOUBLE_ROLL' };
        }
        break;

      case 'LADDER_ENCOUNTER':
        if (effects.ladder_boost) {
          delete activeEffects[playerId].ladder_boost;
          return { type: 'LADDER_BOOST', bonus: 3 };
        }
        break;

      case 'SNAKE_ENCOUNTER':
        if (effects.snake_immunity) {
          delete activeEffects[playerId].snake_immunity;
          return { type: 'SNAKE_IMMUNITY' };
        }
        break;
    }

    return null;
  }

  // Show skill notification
  function showSkillNotification(message, type = 'info') {
    if (window.showNotification) {
      window.showNotification(message, type);
    }
  }

  // Update skill UI
  function updateSkillUI() {
    const currentPlayer = window.getCurrentPlayer ? window.getCurrentPlayer() : null;
    if (!currentPlayer || currentPlayer.isAI) return;

    const skillsContainer = document.getElementById('player-skills');
    if (!skillsContainer) return;

    skillsContainer.innerHTML = '';
    const skills = playerSkills[currentPlayer.id] || [];

    // Ensure tooltip exists
    const tooltipEl = ensureGlobalSkillTooltip();

    skills.forEach(skill => {
      const cooldownRemaining = skillCooldowns[currentPlayer.id][skill.id] || 0;
      const skillElement = document.createElement('div');
      skillElement.className = `skill-icon ${skill.rarity}`;
      
      // Check if skill has active effect
      const hasActiveEffect = activeEffects[currentPlayer.id] && 
        Object.keys(activeEffects[currentPlayer.id]).some(effect => 
          effect.includes(skill.id) || 
          (skill.effect === 'DICE_MANIPULATION' && effect === 'double_roll') ||
          (skill.effect === 'LADDER_ENHANCEMENT' && effect === 'ladder_boost') ||
          (skill.effect === 'SNAKE_PROTECTION' && effect === 'snake_immunity') ||
          (skill.effect === 'TURN_MANIPULATION' && effect === 'extra_turn') ||
          (skill.effect === 'DICE_ENHANCEMENT' && effect === 'dice_boost') ||
          (skill.effect === 'DICE_CONTROL' && effect === 'lucky_seven')
        );
      
      if (cooldownRemaining > 0) {
        skillElement.classList.add('cooldown');
      }
      
      if (hasActiveEffect) {
        skillElement.classList.add('active');
      }
      
      // Ensure skill has valid and cross-platform safe icon
      const skillIcon = getSafeIcon(skill.icon, '🎯');
      
      skillElement.innerHTML = `
        <span class="skill-icon-display">${skillIcon}</span>
        ${cooldownRemaining > 0 ? `<div class="cooldown-timer">${cooldownRemaining}</div>` : ''}
        ${hasActiveEffect ? '<div class="active-indicator">⚡</div>' : ''}
      `;

      // Tooltip helpers for both mouse and touch
      let ignoreClickOnce = false; // cegah tap pertama langsung mengeksekusi skill
      const showTooltip = () => {
        const lines = [
          `<strong>${skill.name || 'Skill tidak dikenal'}</strong>`,
          `${skill.description || 'Tidak ada deskripsi'}`,
          `${hasActiveEffect ? '⚡ <strong>AKTIF</strong>' : ''}`,
          `${cooldownRemaining > 0 ? `⏳ Cooldown: ${cooldownRemaining} giliran` : '✅ Siap digunakan'}`
        ].filter(Boolean);

        tooltipEl.innerHTML = lines.join('<br>');
        tooltipEl.classList.add('show');
        tooltipEl.style.visibility = 'visible';
        tooltipEl.style.opacity = '1';
        // Keep tooltip non-interactive to avoid hover flicker when cursor moves towards tooltip
        tooltipEl.style.pointerEvents = 'none';

        const rect = skillElement.getBoundingClientRect();
        const vw = window.innerWidth;
        const tw = tooltipEl.offsetWidth || 240;
        const th = tooltipEl.offsetHeight || 80;

        let left = rect.left + rect.width / 2 - tw / 2;
        let top = rect.top - th - 10;

        if (left < 10) left = 10;
        if (left + tw > vw - 10) left = vw - tw - 10;
        if (top < 10) top = rect.bottom + 10;

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
      };

      const hideTooltip = () => {
        const el = ensureGlobalSkillTooltip();
        el.classList.remove('show');
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      };

      // Mouse hover handlers
      skillElement.addEventListener('mouseenter', showTooltip);
      skillElement.addEventListener('mouseleave', hideTooltip);

      // Touch handlers to support mobile tanpa flicker dan tanpa eksekusi tak sengaja
      skillElement.addEventListener('touchstart', () => {
        ignoreClickOnce = true; // tap pertama: hanya preview tooltip
        showTooltip();
      }, { passive: true });

      skillElement.addEventListener('touchend', () => {
        // Beri sedikit jeda agar user bisa sempat melihat tooltip pada tap cepat
        setTimeout(hideTooltip, 150);
      }, { passive: true });

      skillElement.addEventListener('touchcancel', hideTooltip);

      if (cooldownRemaining === 0) {
        skillElement.addEventListener('click', (e) => {
          if (ignoreClickOnce) {
            // abaikan click pertama setelah touch, supaya tidak langsung pakai skill
            ignoreClickOnce = false;
            e.preventDefault();
            return;
          }
          useSkill(currentPlayer.id, skill.id);
        });
      }

      skillsContainer.appendChild(skillElement);
    });
  }

  // AI skill usage logic
  function processAISkills(playerId) {
    const aiSkills = playerSkills[playerId] || [];
    const availableSkills = aiSkills.filter(skill => {
      const cooldown = skillCooldowns[playerId][skill.id] || 0;
      return cooldown === 0;
    });

    if (availableSkills.length === 0) return;

    // Simple AI: use random available skill with 30% chance
    if (Math.random() < 0.3) {
      const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      const player = window.getPlayers ? window.getPlayers().find(p => p.id === playerId) : null;
      const playerName = player ? player.name : 'AI';
      
      // Show AI skill activation notification
      if (window.showNotification) {
        window.showNotification(`🤖 ${playerName} mengaktifkan skill: ${randomSkill.name}!`, 'info');
      }
      
      setTimeout(() => useSkill(playerId, randomSkill.id), 1000);
    }
  }

  // Export functions to global scope
  window.initializeSkills = initializeSkills;
  window.usePlayerSkill = (skillId) => {
    const currentPlayer = window.getCurrentPlayer ? window.getCurrentPlayer() : null;
    if (currentPlayer) {
      useSkill(currentPlayer.id, skillId);
    }
  };
  window.updateSkillUI = updateSkillUI;
  window.processTurnCooldowns = processTurnCooldowns;
  window.processAISkills = processAISkills;
  window.checkActiveEffects = checkActiveEffects;
  window.getActiveEffects = function(playerId) {
    return activeEffects[playerId] || {};
  };
  window.updateSkillUI = updateSkillUI;
  window.processAISkills = processAISkills;
  window.getPlayerSkills = (playerId) => playerSkills[playerId] || [];

})();

// Ular Tangga - Rombakan Total (Stabil dan Konsisten dengan index.html)
// Fitur: Papan 10x10, Ular/Tangga SVG, Token pemain, AI dasar, Mode klasik/cepat, Statistik, Modal/UI rapi

(function () {
  'use strict';

  // Konstanta Game
  const BOARD_SIZE = 10;
  const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE; // 100
  
  // Warna untuk Player (manusia) dan AI
  const PLAYER_COLORS = {
    human: ['#ef4444', '#f97316'], // Merah untuk Player 1 (manusia)
    ai: ['#10b981', '#8b4513', '#9333ea', '#1f2937'] // Hijau, Coklat, Ungu, Hitam untuk AI
  };
  
  // Shuffle AI colors on each reload
  function shuffleAIColors() {
    const colors = [...PLAYER_COLORS.ai];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    PLAYER_COLORS.ai = colors;
  }
  
  // Generate random snakes and ladders
  let LADDERS = {};
  let SNAKES = {};
  
  function generateRandomBoard() {
    LADDERS = {};
    SNAKES = {};
    
    // Shuffle AI colors on board generation
    shuffleAIColors();
    
    // Generate 8 ladders
    const ladderPositions = new Set();
    while (ladderPositions.size < 8) {
      const start = Math.floor(Math.random() * 80) + 2; // 2-81
      const end = start + Math.floor(Math.random() * 15) + 5; // +5 to +19
      if (end <= 99 && !ladderPositions.has(start) && !ladderPositions.has(end)) {
        LADDERS[start] = end;
        ladderPositions.add(start);
        ladderPositions.add(end);
      }
    }
    
    // Generate 8 snakes
    const snakePositions = new Set([...ladderPositions]);
    while (Object.keys(SNAKES).length < 8) {
      const start = Math.floor(Math.random() * 80) + 20; // 20-99
      const end = start - Math.floor(Math.random() * 15) - 5; // -5 to -19
      if (end >= 2 && !snakePositions.has(start) && !snakePositions.has(end)) {
        SNAKES[start] = end;
        snakePositions.add(start);
        snakePositions.add(end);
      }
    }
  }

  // State
  let players = [];
  let currentTurn = 0; // index players
  let isGameInProgress = false;
  let isAnimating = false;
  let resizeObserver = null;

  // Pengaturan (dari modal settings)
  const gameSettings = {
    playerCount: 2, // 2..4
    gameMode: 'classic', // 'classic' | 'fast'
  };

  // Elemen DOM (sesuai index.html)
  function backToMenu() {
    // Redirect to menu page
    window.location.href = '../index.html';
  }
  
  // Ekspor agar bisa dipanggil via atribut onclick atau dari fungsi lain
  window.backToMenu = backToMenu;

  const mainMenuScreen = document.getElementById('main-menu');
  const gameScreen = document.getElementById('game-screen');
  const tutorialModal = document.getElementById('tutorial-modal');
  const settingsModal = document.getElementById('settings-modal');
  const winModal = document.getElementById('win-modal');

  const boardElement = document.getElementById('game-board');
  const overlayElement = document.getElementById('overlay-svg');
  const tokensContainer = document.getElementById('tokens-container');

  // Elemen tambahan untuk auto-spacing
  const boardWrapperEl = document.querySelector('.board-wrapper');
  const scoreboardPanelEl = document.querySelector('.scoreboard-panel');
  const gameContentEl = document.querySelector('.game-content');

  const diceElement = document.getElementById('dice');
  const rollButton = document.getElementById('roll-button');

  const currentPlayerCardEl = document.querySelector('.current-player-card'); // Target the card container
  const scoreboardElement = document.getElementById('player-scores'); // Target the list container
  const loadingOverlay = document.getElementById('loading-overlay');

  // ==== Auto spacing antara papan dan scoreboard (mobile first) ====
  function setScoreboardGap(px) {
    const el = scoreboardPanelEl || document.querySelector('.scoreboard-panel');
    if (!el) return;
    const clamped = Math.max(0, Math.min(200, Math.round(px)));
    el.style.setProperty('--scoreboard-gap', `${clamped}px`);
  }

  function measureAndAdjustGap(minGap = 40, maxGap = 120) {
    const boardEl = boardWrapperEl || document.querySelector('.board-wrapper');
    const scoreEl = scoreboardPanelEl || document.querySelector('.scoreboard-panel');
    if (!boardEl || !scoreEl) return;
    // Paksa layout up-to-date
    const boardRect = boardEl.getBoundingClientRect();
    const scoreRect = scoreEl.getBoundingClientRect();
    if (!boardRect.width && !boardRect.height) return;

    // Jarak visual (termasuk margin-top scoreboard)
    const distance = scoreRect.top - boardRect.bottom;
    const cs = window.getComputedStyle(scoreEl);
    const currentMarginTop = parseFloat(cs.marginTop) || 0;

    let desiredMargin = currentMarginTop;
    if (Number.isFinite(distance)) {
      if (distance < minGap) {
        desiredMargin = currentMarginTop + (minGap - distance);
      } else if (distance > maxGap) {
        desiredMargin = Math.max(minGap, currentMarginTop - (distance - maxGap));
      }
    }
    setScoreboardGap(desiredMargin);
  }

  const adjustScoreboardSpacing = debounce(() => {
    // Jalankan 2 frame untuk memastikan style sudah diterapkan
    requestAnimationFrame(() => {
      measureAndAdjustGap(44, 128);
      requestAnimationFrame(() => measureAndAdjustGap(44, 128));
    });
  }, 60);

  // Utilitas
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Debounce helper: kembalikan fungsi yang menunda eksekusi hingga user berhenti berinteraksi
  function debounce(fn, wait = 200) {
    let timeoutId;
    return function debounced(...args) {
      const ctx = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(ctx, args), wait);
    };
  }

  function showNotification(message, type = 'info') {
    // Sanitize message to prevent XSS
    const sanitizedMessage = String(message).replace(/[<>"'&]/g, (match) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = sanitizedMessage;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem;
      border-radius: 16px; color: #fff; font-weight: 600; z-index: 1001;
      background: var(--gradient-primary);
      box-shadow: var(--shadow-xl); backdrop-filter: blur(10px);
      animation: slideInRight .3s ease-out; max-width: 300px;
      border: 1px solid rgba(255,255,255,0.2);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight .3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Statistik Game (localStorage dengan validasi)
  function updateGameStats(winnerName) {
    // Sanitize winner name
    const sanitizedName = String(winnerName).replace(/[<>"'&]/g, (match) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    });
    
    const lastWinner = document.getElementById('last-winner');
    const totalGames = document.getElementById('total-games');
    
    if (lastWinner) lastWinner.textContent = sanitizedName;
    
    try {
      const currentTotal = parseInt(localStorage.getItem('totalGames') || '0', 10);
      const newTotal = Math.max(0, currentTotal) + 1;
      
      // Validate before storing
      if (newTotal <= 999999) { // Prevent overflow
        localStorage.setItem('totalGames', String(newTotal));
        localStorage.setItem('lastWinner', sanitizedName);
        if (totalGames) totalGames.textContent = String(newTotal);
      }
    } catch (error) {
      console.warn('Failed to update game stats:', error);
    }
  }
  
  function loadGameStats() {
    const lastWinner = document.getElementById('last-winner');
    const totalGames = document.getElementById('total-games');
    
    try {
      const storedWinner = localStorage.getItem('lastWinner') || '-';
      const storedGames = localStorage.getItem('totalGames') || '0';
      
      // Validate stored data
      const validatedGames = Math.max(0, parseInt(storedGames, 10) || 0);
      
      if (lastWinner) lastWinner.textContent = storedWinner;
      if (totalGames) totalGames.textContent = String(validatedGames);
    } catch (error) {
      console.warn('Failed to load game stats:', error);
      if (lastWinner) lastWinner.textContent = '-';
      if (totalGames) totalGames.textContent = '0';
    }
  }

  // Layout papan 10x10 (serpentine)
  function buildBoardLayout() {
    const layout = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const base = row * BOARD_SIZE;
      const nums = [];
      for (let col = 1; col <= BOARD_SIZE; col++) nums.push(base + col);
      if (row % 2 === 1) nums.reverse();
      layout.push(nums);
    }
    return layout.reverse();
  }

  function renderBoard() {
    boardElement.innerHTML = '';
    const layout = buildBoardLayout();
    const fragment = document.createDocumentFragment();
    layout.flat().forEach((num) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.cell = String(num);
      if (LADDERS[num]) cell.classList.add('ladder');
      if (SNAKES[num]) cell.classList.add('snake');
      if (num === TOTAL_CELLS) cell.classList.add('win');
      const numEl = document.createElement('span');
      numEl.className = 'cell-number';
      numEl.textContent = String(num);
      cell.appendChild(numEl);
      fragment.appendChild(cell);
    });
    boardElement.appendChild(fragment);
  }

  // SVG Overlay: ular & tangga
  function clearOverlayPathsKeepDefs() {
    const toRemove = Array.from(overlayElement.querySelectorAll('path,line'));
    toRemove.forEach((n) => n.remove());
  }

  function ensureOverlayDefs() {
    if (overlayElement.querySelector('defs')) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const ladderGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    ladderGrad.id = 'ladder-gradient';
    ladderGrad.setAttribute('x1', '0%'); ladderGrad.setAttribute('y1', '0%');
    ladderGrad.setAttribute('x2', '0%'); ladderGrad.setAttribute('y2', '100%');
    const ls1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    ls1.setAttribute('offset', '0%'); ls1.setAttribute('style', 'stop-color:#feca57;stop-opacity:1');
    const ls2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    ls2.setAttribute('offset', '100%'); ls2.setAttribute('style', 'stop-color:#ff9f43;stop-opacity:1');
    ladderGrad.append(ls1, ls2);

    const snakeGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    snakeGrad.id = 'snake-gradient';
    snakeGrad.setAttribute('x1', '0%'); snakeGrad.setAttribute('y1', '0%');
    snakeGrad.setAttribute('x2', '0%'); snakeGrad.setAttribute('y2', '100%');
    const ss1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    ss1.setAttribute('offset', '0%'); ss1.setAttribute('style', 'stop-color:#55efc4;stop-opacity:1');
    const ss2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    ss2.setAttribute('offset', '100%'); ss2.setAttribute('style', 'stop-color:#00b894;stop-opacity:1');
    snakeGrad.append(ss1, ss2);

    defs.append(ladderGrad, snakeGrad);
    overlayElement.appendChild(defs);
  }

  function getCellCenter(cellNumber) {
    const cell = boardElement.querySelector(`[data-cell="${cellNumber}"]`);
    if (!cell) return { x: 0, y: 0 };
    const cellRect = cell.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();
    return {
      x: cellRect.left - boardRect.left + cellRect.width / 2,
      y: cellRect.top - boardRect.top + cellRect.height / 2,
    };
  }

  function drawLadder(start, end) {
    const s = getCellCenter(start);
    const e = getCellCenter(end);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // cubic bezier sedikit melengkung
    const midX = (s.x + e.x) / 2 + (Math.random() - 0.5) * 20;
    const d = `M${s.x} ${s.y} C ${midX} ${s.y}, ${midX} ${e.y}, ${e.x} ${e.y}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'url(#ladder-gradient)');
    path.setAttribute('stroke-width', '6');
    path.setAttribute('stroke-linecap', 'round');
    overlayElement.appendChild(path);

    // Enhanced ladder rungs with better visual
    const rungs = 6;
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1);
      const px = s.x + (e.x - s.x) * t;
      const py = s.y + (e.y - s.y) * t;
      
      // Main rung
      const rung = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      rung.setAttribute('x1', String(px - 15));
      rung.setAttribute('y1', String(py));
      rung.setAttribute('x2', String(px + 15));
      rung.setAttribute('y2', String(py));
      rung.setAttribute('stroke', '#047857');
      rung.setAttribute('stroke-width', '5');
      rung.setAttribute('stroke-linecap', 'round');
      rung.setAttribute('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))');
      overlayElement.appendChild(rung);
    }

    // Add upward arrow at ladder top
    const arrowUp = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrowUp.setAttribute('points', `${e.x-6},${e.y-10} ${e.x+6},${e.y-10} ${e.x},${e.y-18}`);
    arrowUp.setAttribute('fill', '#10b981');
    arrowUp.setAttribute('stroke', '#047857');
    arrowUp.setAttribute('stroke-width', '2');
    arrowUp.setAttribute('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))');
    overlayElement.appendChild(arrowUp);
  }

  function drawSnake(start, end) {
    const s = getCellCenter(start);
    const e = getCellCenter(end);
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const midX = (s.x + e.x) / 2 + (Math.random() - 0.5) * 30;
    const midY = (s.y + e.y) / 2 + (Math.random() - 0.5) * 30;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${s.x} ${s.y} Q ${midX} ${midY} ${e.x} ${e.y}`);
    path.setAttribute('stroke', '#dc2626');
    path.setAttribute('stroke-width', '6');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    // marker-end removed (no defined marker)
    path.setAttribute('opacity', '0.9');
    path.setAttribute('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
    overlayElement.appendChild(path);

    // Add downward arrow at snake tail (end)
    const angle = Math.atan2(dy, dx);
    const arrowSize = 12;
    const x1 = e.x - arrowSize * Math.cos(angle - Math.PI/6);
    const y1 = e.y - arrowSize * Math.sin(angle - Math.PI/6);
    const x2 = e.x - arrowSize * Math.cos(angle + Math.PI/6);
    const y2 = e.y - arrowSize * Math.sin(angle + Math.PI/6);

    const arrowDown = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrowDown.setAttribute('points', `${e.x},${e.y} ${x1},${y1} ${x2},${y2}`);
    arrowDown.setAttribute('fill', '#dc2626');
    arrowDown.setAttribute('stroke', '#7f1d1d');
    arrowDown.setAttribute('stroke-width', '2');
    arrowDown.setAttribute('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.4))');
    overlayElement.appendChild(arrowDown);
  }

  function renderOverlay() {
    ensureOverlayDefs();
    clearOverlayPathsKeepDefs();
    Object.entries(LADDERS).forEach(([s, e]) => drawLadder(Number(s), Number(e)));
    Object.entries(SNAKES).forEach(([s, e]) => drawSnake(Number(s), Number(e)));
  }

// Pemain
function initializePlayers() {
    players = [];
    
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('gameSettings');
    let playerCount = 2; // default
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        playerCount = (settings.playerCount || settings.players || 2);
    }
    
    for (let i = 1; i <= playerCount; i++) {
      const isHuman = i === 1;
      const colorIndex = isHuman ? 0 : (i - 2) % PLAYER_COLORS.ai.length;
      const color = isHuman ? PLAYER_COLORS.human[0] : PLAYER_COLORS.ai[colorIndex];

      players.push({
          id: i,
          name: isHuman ? 'Pemain 1' : `AI ${i - 1}`,
          pos: 1,
          color: color,
          isAI: !isHuman,
          icon: isHuman ? '👤' : '🤖',
          // index AI untuk pemetaan class warna (ai-1, ai-2, ...)
          aiIndex: isHuman ? 0 : (i - 1)
      });
  }
    currentTurn = 0;

    if (window.initializeSkills) {
        window.initializeSkills();
    }
}

function renderPlayers() {
    // Bersihkan token lama HANYA di area papan
    const boardTokenContainer = document.getElementById('tokens-container');
    if (boardTokenContainer) {
        boardTokenContainer.querySelectorAll('.token').forEach((el) => {
            if (el.parentNode) {
                el.remove();
            }
        });
    }

    const container = tokensContainer || boardElement;

    players.forEach((p, index) => {
        const token = document.createElement('div');
        token.id = `token-${p.id}`;
        token.className = p.isAI ? `token ai ai-${p.aiIndex}` : 'token human';

        // Atur style dasar token (tanpa warna agar dikontrol CSS)
        Object.assign(token.style, {
            position: 'absolute',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10',
            transition: 'all 0.3s ease'
        });

        // Buat elemen ikon
        const icon = document.createElement('div');
        icon.className = 'token-icon';
        icon.textContent = p.isAI ? '🤖' : '👤';
        icon.style.fontSize = '16px';
        icon.style.lineHeight = '1';
        token.appendChild(icon);

        // Atur tooltip
        token.setAttribute('title', `${p.name} (${p.isAI ? 'AI' : 'Player'})`);
        
        // Tambahkan class active jika ini pemain saat ini
        if (index === currentTurn) {
            token.classList.add('active');
            token.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.8)';
            token.style.transform = 'scale(1.1)';
        }

        container.appendChild(token);
        positionToken(p.id, p.pos);
    });
    
    updateScoreboard();
}

function positionToken(playerId, position) {
    const token = document.getElementById(`token-${playerId}`);
    // Cari cell berdasarkan data-cell untuk memastikan posisi benar
    const cell = boardElement.querySelector(`[data-cell="${position}"]`);
    if (!token || !cell) return;

    const rect = cell.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();

    // Offset untuk multiple tokens di cell yang sama (smaller spacing)
    const tokensInCell = players.filter(p => p.pos === position).length;
    const tokenIndex = players.filter(p => p.pos === position && p.id <= playerId).length - 1;
    const offsetX = (tokenIndex % 2) * 12;
    const offsetY = Math.floor(tokenIndex / 2) * 12;

    token.style.left = `${rect.left - boardRect.left + offsetX + 6}px`;
    token.style.top = `${rect.top - boardRect.top + offsetY + 6}px`;
}

function updateScoreboard() {
    if (!scoreboardElement) return;
    scoreboardElement.innerHTML = ''; // Clear previous scores
    const currentPlayer = players[currentTurn];

    players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'player-row';
        if (p.id === currentPlayer.id) {
            row.classList.add('active');
        }

        const token = document.createElement('div');
        // gunakan kelas khusus scoreboard agar tidak konflik dengan token papan
        // tambahkan class human/ai serta varian ai-<index> agar style gradient & border sinkron
        token.className = p.isAI ? `sb-token ai ai-${p.aiIndex}` : 'sb-token human';
        // biarkan CSS yang mengatur background (gradient) dan border agar konsisten
        token.innerHTML = `<span class="token-icon">${p.icon}</span>`;

        const info = document.createElement('div');
        info.className = 'player-info';

        const name = document.createElement('div');
        name.className = 'player-name';
        name.textContent = p.name;

        const position = document.createElement('div');
        position.className = 'player-position';
        position.textContent = `Posisi: ${p.pos}`;

        info.appendChild(name);
        info.appendChild(position);

        row.appendChild(token);
        row.appendChild(info);

        scoreboardElement.appendChild(row);
    });
}

function updateUI() {
    const currentPlayer = players[currentTurn];
    if (!currentPlayer) return;

    // Update current player display
    const playerLabel = document.querySelector('.player-label');
    const playerName = document.querySelector('.player-name');
    const tokenIndicator = document.getElementById('current-token');
    
    if (playerLabel) playerLabel.textContent = 'Giliran Sekarang';
    if (playerName) {
        // Pisahkan nama menjadi teks dan angka terakhir bila ada (contoh: "Pemain 1")
        const raw = String(currentPlayer.name || '').trim();
        const parts = raw.split(/\s+/);
        let textPart = raw;
        let numberPart = '';
        if (parts.length >= 2) {
            const last = parts[parts.length - 1];
            if (/^\d+$/.test(last)) {
                numberPart = last;
                textPart = parts.slice(0, -1).join(' ');
            }
        }
        // Sanitize simple (escape < > &)
        const esc = (s) => String(s).replace(/[<&>]/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]));
        const safeText = esc(textPart || raw || 'Pemain');
        const safeNum = esc(numberPart);
        playerName.innerHTML = numberPart
          ? `<span class="player-text">${safeText}</span><span class="player-number">${safeNum}</span>`
          : `<span class="player-text">${safeText}</span>`;
    }
    
    // Update token indicator
    if (tokenIndicator) {
        // Reset styles (hindari inline warna, hanya base layout)
        tokenIndicator.style.animation = '';
        // Set class berbasis tipe pemain + varian ai-<index>
        tokenIndicator.className = currentPlayer.isAI
          ? `token-indicator ai ai-${currentPlayer.aiIndex}`
          : 'token-indicator human';
        tokenIndicator.innerHTML = currentPlayer.isAI
          ? '<span class="token-icon">🤖</span>'
          : '<span class="token-icon">👤</span>';
        // Animasi pulse untuk pemain aktif
        tokenIndicator.style.animation = 'pulse 1.5s infinite';
    }

    // Update token active highlight di papan
    players.forEach((p, idx) => {
        const t = document.getElementById(`token-${p.id}`);
        if (t) {
            t.classList.toggle('active', idx === currentTurn);
            t.style.boxShadow = idx === currentTurn ? '0 0 0 3px rgba(99, 102, 241, 0.8)' : '';
            t.style.transform = idx === currentTurn ? 'scale(1.1)' : 'scale(1)';
        }
    });

    // Kontrol tombol roll berdasarkan status
    if (rollButton) {
        const isAI = !!(players[currentTurn] && players[currentTurn].isAI);
        const disabled = !isGameInProgress || isAnimating || isAI;
        rollButton.disabled = disabled;
        rollButton.classList.toggle('disabled', disabled);
    }

    // Update scoreboard
    updateScoreboard();

    // Update skills UI
    if (window.updateSkillUI) {
        window.updateSkillUI();
    }

    // Sesuaikan jarak setelah UI berubah
    adjustScoreboardSpacing();
}

function updateDiceVisual(number) {
    if (!diceElement) return;

    // Remove all dice classes
    diceElement.className = diceElement.className.replace(/dice-[1-6]/g, '');

    // Add the correct dice class
    diceElement.classList.add(`dice-${number}`);
}

async function animateDice() {
    if (!diceElement) return;
    
    diceElement.classList.add('rolling');
    
    // Animate for 1 second
    for (let i = 0; i < 10; i++) {
        const randomNum = Math.floor(Math.random() * 6) + 1;
        updateDiceVisual(randomNum);
        await sleep(100);
    }
    
    diceElement.classList.remove('rolling');
}

async function movePlayer(playerId, steps) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const startPos = player.pos;
    const targetPos = Math.min(startPos + steps, TOTAL_CELLS);

    // Animate step by step
    for (let pos = startPos + 1; pos <= targetPos; pos++) {
        player.pos = pos;
        positionToken(playerId, pos);
        updateScoreboard();
        await sleep(200);
    }

    // Check for snakes and ladders (apply skill effects)
    let finalPos = player.pos;
    if (LADDERS[player.pos]) {
        const ladderTarget = LADDERS[player.pos];
        let boostApplied = false;
        let boostAmount = 0;
        // Try apply ladder boost
        if (window.checkActiveEffects) {
          const effect = window.checkActiveEffects(playerId, 'LADDER_ENCOUNTER');
          if (effect && effect.type === 'LADDER_BOOST') {
            boostAmount = effect.bonus || 3;
            boostApplied = true;
            if (window.updateSkillUI) window.updateSkillUI();
          }
        }
        finalPos = Math.min(TOTAL_CELLS, ladderTarget + (boostApplied ? boostAmount : 0));
        if (window.AudioSystem) {
          window.AudioSystem.playSFX('ladder_up');
        }
        showNotification(
          boostApplied
            ? `${player.name} naik tangga ke ${ladderTarget} (+${boostAmount} bonus) → ${finalPos}!`
            : `${player.name} naik tangga ke ${finalPos}!`,
          'success'
        );
        player.pos = finalPos;
        positionToken(playerId, finalPos);
        updateScoreboard();
    } else if (SNAKES[player.pos]) {
        const snakeTarget = SNAKES[player.pos];
        let immune = false;
        // Try apply snake immunity
        if (window.checkActiveEffects) {
          const effect = window.checkActiveEffects(playerId, 'SNAKE_ENCOUNTER');
          if (effect && effect.type === 'SNAKE_IMMUNITY') {
            immune = true;
            if (window.updateSkillUI) window.updateSkillUI();
          }
        }
        if (!immune) {
          finalPos = snakeTarget;
          if (window.AudioSystem) {
            window.AudioSystem.playSFX('snake_down');
          }
          showNotification(`${player.name} turun ular ke ${finalPos}!`, 'warning');
          player.pos = finalPos;
          positionToken(playerId, finalPos);
          updateScoreboard();
        } else {
          // Immune: stay on current cell, notify
          if (window.AudioSystem) {
            window.AudioSystem.playSFX('notification');
          }
          showNotification(`${player.name} kebal terhadap ular! Tetap di ${player.pos}.`, 'info');
        }
    } else {
        if (window.AudioSystem) {
          window.AudioSystem.playSFX('move');
        }
    }

    // Check for win condition
    if (player.pos >= TOTAL_CELLS) {
        player.pos = TOTAL_CELLS;
        positionToken(playerId, TOTAL_CELLS);
        updateScoreboard();
        handleWin(player);
    }
}

// Pindah pemain secara instan ke posisi tertentu (untuk skill Teleport dsb)
function movePlayerTo(playerId, targetPos) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const clamped = Math.max(1, Math.min(TOTAL_CELLS, Number(targetPos) || player.pos));

    // Set posisi baru dan update tampilan
    player.pos = clamped;
    positionToken(playerId, clamped);
    updateScoreboard();

    // Proses efek tangga/ular setelah teleport (terapkan efek skill)
    let finalPos = player.pos;
    if (LADDERS[player.pos]) {
        const ladderTarget = LADDERS[player.pos];
        let boostApplied = false;
        let boostAmount = 0;
        if (window.checkActiveEffects) {
          const effect = window.checkActiveEffects(playerId, 'LADDER_ENCOUNTER');
          if (effect && effect.type === 'LADDER_BOOST') {
            boostAmount = effect.bonus || 3;
            boostApplied = true;
            if (window.updateSkillUI) window.updateSkillUI();
          }
        }
        finalPos = Math.min(TOTAL_CELLS, ladderTarget + (boostApplied ? boostAmount : 0));
        if (window.AudioSystem) {
          window.AudioSystem.playSFX('ladder_up');
        }
        showNotification(
          boostApplied
            ? `${player.name} naik tangga ke ${ladderTarget} (+${boostAmount} bonus) → ${finalPos}!`
            : `${player.name} naik tangga ke ${finalPos}!`,
          'success'
        );
        player.pos = finalPos;
        positionToken(playerId, finalPos);
        updateScoreboard();
    } else if (SNAKES[player.pos]) {
        const snakeTarget = SNAKES[player.pos];
        let immune = false;
        if (window.checkActiveEffects) {
          const effect = window.checkActiveEffects(playerId, 'SNAKE_ENCOUNTER');
          if (effect && effect.type === 'SNAKE_IMMUNITY') {
            immune = true;
            if (window.updateSkillUI) window.updateSkillUI();
          }
        }
        if (!immune) {
          finalPos = snakeTarget;
          if (window.AudioSystem) {
            window.AudioSystem.playSFX('snake_down');
          }
          showNotification(`${player.name} turun ular ke ${finalPos}!`, 'warning');
          player.pos = finalPos;
          positionToken(playerId, finalPos);
          updateScoreboard();
        } else {
          if (window.AudioSystem) {
            window.AudioSystem.playSFX('notification');
          }
          showNotification(`${player.name} kebal terhadap ular! Tetap di ${player.pos}.`, 'info');
        }
    } else {
        if (window.AudioSystem) {
          window.AudioSystem.playSFX('move');
        }
        showNotification(`${player.name} teleport ke ${player.pos}!`, 'info');
    }

    // Cek menang
    if (player.pos >= TOTAL_CELLS) {
        player.pos = TOTAL_CELLS;
        positionToken(playerId, TOTAL_CELLS);
        updateScoreboard();
        handleWin(player);
        return;
    }

    // Refresh UI (kartu giliran, scoreboard, skills)
    updateUI();
}

async function rollDiceInternal() {
    if (!isGameInProgress || isAnimating) return;
    
    const currentPlayer = players[currentTurn];
    if (!currentPlayer) return;

    // Lock interaksi saat animasi giliran
    isAnimating = true;
    if (rollButton) {
      rollButton.disabled = true;
      rollButton.classList.add('disabled');
    }

    let threw = false;
    try {
      // Play dice roll sound
      if (window.AudioSystem) {
        window.AudioSystem.playSFX('dice_roll');
      }

      // Generate dice value
      let diceValue = Math.floor(Math.random() * 6) + 1;
      
      // Apply skill effects
      if (window.getActiveEffects) {
        const effects = window.getActiveEffects(currentPlayer.id);
        if (effects.double_roll) {
          diceValue = Math.max(diceValue, Math.floor(Math.random() * 6) + 1);
          delete effects.double_roll;
        }
        if (effects.dice_boost) {
          diceValue = Math.min(6, diceValue + 2);
          delete effects.dice_boost;
        }
        if (effects.lucky_seven) {
          diceValue = 6; // Guaranteed six
          delete effects.lucky_seven;
        }
      }

      // Animate dice roll
      await animateDice();
      
      // Update dice display
      updateDiceVisual(diceValue);

      // Move player
      const steps = diceValue;
      await movePlayer(currentPlayer.id, steps);
      // Jika game berakhir saat bergerak, hentikan
      if (!isGameInProgress) {
        isAnimating = false;
        return;
      }

      // Check for extra turn
      let hasExtraTurn = false;
      if (window.getActiveEffects) {
        const effects = window.getActiveEffects(currentPlayer.id);
        if (effects.extra_turn) {
          hasExtraTurn = true;
          delete effects.extra_turn;
        }
      }

      // Process turn end (cooldowns)
      if (window.processTurnCooldowns) {
        window.processTurnCooldowns(currentPlayer.id);
      }

      // Jika extra turn, pemain yang sama lanjut lagi
      if (hasExtraTurn) {
        updateUI();
        isAnimating = false;
        if (players[currentTurn] && players[currentTurn].isAI) {
          setTimeout(() => {
            if (window.processAISkills) {
              window.processAISkills(players[currentTurn].id);
            }
            setTimeout(() => { if (isGameInProgress) rollDiceInternal(); }, 1500);
          }, 800);
        } else {
          if (rollButton) {
            rollButton.disabled = false;
            rollButton.classList.remove('disabled');
          }
        }
        return;
      }

      // Giliran berikutnya
      setTimeout(() => {
        if (window.AudioSystem) {
          window.AudioSystem.playSFX('turn_change');
        }
        currentTurn = (currentTurn + 1) % players.length;
        updateUI();
        isAnimating = false;

        // AI atau Human
        if (players[currentTurn] && players[currentTurn].isAI) {
          setTimeout(() => {
            if (window.processAISkills) {
              window.processAISkills(players[currentTurn].id);
            }
            setTimeout(() => { if (isGameInProgress) rollDiceInternal(); }, 1500);
          }, 800);
        } else {
          if (rollButton) {
            rollButton.disabled = false;
            rollButton.classList.remove('disabled');
          }
        }
      }, 1000);
    } catch (err) {
      threw = true;
      console.error('rollDiceInternal error:', err);
      showNotification('Terjadi kesalahan saat memproses giliran. Melanjutkan permainan.', 'error');
    } finally {
      if (threw) {
        isAnimating = false;
        if (isGameInProgress) {
          const cp = players[currentTurn];
          if (cp && !cp.isAI && rollButton) {
            rollButton.disabled = false;
            rollButton.classList.remove('disabled');
          }
        }
        updateUI();
      }
    }
}

async function processTurn() {
    if (!isGameInProgress || isAnimating) return;
    const player = players[currentTurn];
    if (!player) return;

    isAnimating = true;
    updateUI();

    const roll = await animateDice(Math.floor(Math.random() * 6) + 1);

    const targetPos = player.pos + roll;
    if (targetPos > TOTAL_CELLS) {
        showNotification(`${player.name} tidak bisa bergerak (melebihi 100)`);
        isAnimating = false;
        // ganti giliran
        currentTurn = (currentTurn + 1) % players.length;
        updateUI();
        checkAITurn();
        return;
    }

    await movePlayer(player.id, roll);

    // cek menang
    if (player.pos === TOTAL_CELLS) {
        handleWin(player);
        return;
    }

    // next turn
    currentTurn = (currentTurn + 1) % players.length;
    isAnimating = false;
    updateUI();
    checkAITurn();
}

function checkAITurn() {
    if (!isGameInProgress || isAnimating) return;

    const currentPlayer = players[currentTurn];
    if (currentPlayer && currentPlayer.isAI) {
        // Process AI skills
        if (window.processAISkills) {
            window.processAISkills(currentPlayer.id);
        }

        setTimeout(() => {
            if (isGameInProgress && !isAnimating) {
                rollDiceInternal();
            }
        }, 1500);
    }
}

// Menang
function handleWin(player) {
    isGameInProgress = false;
    isAnimating = false;
    const winnerText = document.getElementById('winner-text');
    const winnerMessage = document.getElementById('winner-message');
    if (winnerText) winnerText.textContent = `Selamat ${player.name}!`;
    if (winnerMessage) winnerMessage.textContent = `${player.name} memenangkan permainan!`;
    if (winModal) {
      winModal.classList.add('show');
      winModal.style.display = 'flex';
    }
    updateGameStats(player.name);
}

  window.backToMenu = function backToMenu() {
    // Save game stats before leaving
    saveGameStats();
    
    // Redirect to menu page
    window.location.href = 'menu.html';
  };

  window.resetGame = function resetGame() {
    if (!isGameInProgress && players.length === 0) {
      // Jika pemain belum diinisialisasi, inisialisasi terlebih dahulu
      initializePlayers();
    }
    
    // Generate new random board
    generateRandomBoard();
    
    isGameInProgress = false;
    players.forEach((p) => (p.pos = 1));
    renderBoard();
    
    // Reset dice visual
    updateDiceVisual(1);
    
    setTimeout(() => {
      renderOverlay();
      renderPlayers();
      currentTurn = 0;
      isGameInProgress = true;
      isAnimating = false;
      updateUI();
      checkAITurn();
    }, 80);
  };

  window.playAgain = function playAgain() {
    if (winModal) {
      winModal.classList.remove('show');
      winModal.style.display = 'none';
    }
    window.resetGame();
  };

  window.showTutorial = function showTutorial() {
    if (tutorialModal) {
      tutorialModal.classList.add('show');
      tutorialModal.style.display = 'flex';
    }
  };

  window.showSettings = function showSettings() {
    if (settingsModal) {
      settingsModal.classList.add('show');
      settingsModal.style.display = 'flex';
    }
  };

  // Optimized modal handling with animation frame
  const modalAnimations = new Map();
  
  window.closeModal = function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Cancel any ongoing animation
    if (modalAnimations.has(modalId)) {
      cancelAnimationFrame(modalAnimations.get(modalId));
    }
    
    modal.classList.remove('show');
    
    // Use requestAnimationFrame for smoother animation
    const start = performance.now();
    const duration = 250;
    
    function animate(time) {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        modalAnimations.set(modalId, requestAnimationFrame(animate));
      } else {
        modal.style.display = 'none';
        modalAnimations.delete(modalId);
      }
    }
    
    modalAnimations.set(modalId, requestAnimationFrame(animate));
  };

  // Optimized settings handling with debounce
  const saveSettings = debounce(function() {
    const activePlayerBtn = document.querySelector('.player-btn.active');
    const activeModeBtn = document.querySelector('.mode-btn.active');
    
    if (activePlayerBtn) {
      gameSettings.playerCount = parseInt(activePlayerBtn.dataset.players || '2', 10);
    }
    
    if (activeModeBtn) {
      gameSettings.gameMode = activeModeBtn.dataset.mode || 'classic';
    }
    
    window.closeModal('settings-modal');
    showNotification('Pengaturan tersimpan!');
    
    // Save settings to localStorage
    try {
      localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    } catch (e) {
      console.warn('Gagal menyimpan pengaturan:', e);
    }
  }, 200);
  
  window.saveSettings = saveSettings;

  // Export functions to window for skill system
  window.getCurrentPlayer = function() {
    return players[currentTurn];
  };

  window.getPlayers = function() {
    return players;
  };

  // Expose helpers for skills system
  window.positionToken = positionToken;
  window.movePlayerTo = movePlayerTo;
  window.updateUI = updateUI;

  window.showNotification = showNotification;

  // Music toggle functionality
  let isMusicMuted = false;
  window.toggleMusic = function() {
    const musicBtn = document.getElementById('music-toggle');
    const icon = musicBtn.querySelector('i');
    
    if (isMusicMuted) {
      // Unmute
      if (window.AudioSystem) {
        window.AudioSystem.setBGMVolume(0.8);
        window.AudioSystem.startBGM();
      }
      icon.className = 'fas fa-volume-up';
      musicBtn.classList.remove('muted');
      musicBtn.title = 'Mute Music';
      isMusicMuted = false;
    } else {
      // Mute
      if (window.AudioSystem) {
        window.AudioSystem.setBGMVolume(0);
        window.AudioSystem.stopBGM();
      }
      icon.className = 'fas fa-volume-mute';
      musicBtn.classList.add('muted');
      musicBtn.title = 'Unmute Music';
      isMusicMuted = true;
    }
  };

  window.rollDice = function() {
    const p = players[currentTurn];
    if (!isGameInProgress || isAnimating || !p || p.isAI) return;
    
    // Handle dice roll logic
    if (isGameInProgress) {
      rollDiceInternal();
    } else {
      // Wait a moment then start the game
      setTimeout(() => {
        // Hide loading and start game
        if (loadingOverlay) {
          loadingOverlay.classList.remove('show');
        }
        
        // Start the game if not already started
        if (!isGameInProgress) {
          window.startGame();
        }
      }, 300);
    }
    
    // Load stats for main menu if exists
    if (document.getElementById('main-menu-container')) {
      loadGameStats();
    }
  };

  function loadGameSettings() {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      gameSettings.playerCount = (settings.playerCount || settings.players || 2);
      gameSettings.gameMode = (settings.gameMode || settings.mode || 'classic');
    }
  }

  function saveGameStats() {
    // Implementation for saving game stats if needed
  }

  // Ensure closeTutorial helper exists
  window.closeTutorial = function() {
    closeModal('tutorial-modal');
  };

  function fitToScreen() {
    const container = document.querySelector('.container');
    if (!container) return;

    const designWidth = 1920; // The width the UI was designed for
    const designHeight = 1080; // The height the UI was designed for

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const scale = Math.min(screenWidth / designWidth, screenHeight / designHeight);

    container.style.transform = `scale(${scale})`;
    
    // Adjust position to center the content
    const scaledWidth = designWidth * scale;
    const scaledHeight = designHeight * scale;

    container.style.left = `${(screenWidth - scaledWidth) / 2}px`;
    container.style.top = `${(screenHeight - scaledHeight) / 2}px`;
  }

  // Inisialisasi game saat halaman game dimuat
  function initializeGameOnLoad() {
    try { loadGameSettings(); } catch (e) {}
    
    generateRandomBoard();
    initializePlayers();
    updateScoreboard();
    renderBoard();
    updateDiceVisual(1);
    
    setTimeout(() => {
      renderOverlay();
      renderPlayers();
      currentTurn = 0;
      isGameInProgress = true;
      isAnimating = false;
      updateUI();
      checkAITurn();
      
      if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
        loadingOverlay.style.display = 'none';
      }
      if (window.AudioSystem && window.AudioSystem.startBGM) {
        window.AudioSystem.startBGM();
      }
      // Atur jarak awal setelah semua render
      adjustScoreboardSpacing();
    }, 80);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Jalankan hanya di halaman game (elemen papan tersedia)
    if (boardElement) {
      initializeGameOnLoad();
      
      // Redraw overlay dan reposisi token saat resize untuk responsivitas
      window.addEventListener('resize', debounce(() => {
        renderOverlay();
        players.forEach((p) => positionToken(p.id, p.pos));
        adjustScoreboardSpacing();
      }, 150));

      // Observasi perubahan ukuran pada papan/scoreboard
      if ('ResizeObserver' in window) {
        try {
          const br = document.querySelector('.board-wrapper');
          const sc = document.querySelector('.scoreboard-panel');
          if (br || sc) {
            resizeObserver = new ResizeObserver(() => adjustScoreboardSpacing());
            if (br) resizeObserver.observe(br);
            if (sc) resizeObserver.observe(sc);
          }
        } catch (_) {}
      }
    }
  });

})();

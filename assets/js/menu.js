// Menu JavaScript - Ular Tangga

// Game settings
let gameSettings = {
    players: 2,
    mode: 'classic'
};

// Initialize menu when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMenu();
    loadStats();
});

function initializeMenu() {
    // Add event listeners for settings buttons
    setupSettingsButtons();
    
    // Load saved settings
    loadSettings();
    
    // Update stats display
    updateStatsDisplay();
}

async function startGame() {
    // Save current settings to localStorage
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    
    // Show loading screen
    const loadingOverlay = document.getElementById('loading-overlay');
    const pageTransition = document.getElementById('page-transition');
    
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
    
    // Simulate loading process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show page transition
    if (pageTransition) {
        pageTransition.classList.add('show');
    }
    
    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Redirect to game page
    window.location.href = 'game.html';
}

function showTutorial() {
    const modal = document.getElementById('tutorial-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeTutorial() {
    const modal = document.getElementById('tutorial-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function showSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function setupSettingsButtons() {
    // Player count buttons
    const playerButtons = document.querySelectorAll('.player-btn');
    playerButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            playerButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            gameSettings.players = parseInt(this.dataset.players);
        });
    });
    
    // Mode buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            modeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            gameSettings.mode = this.dataset.mode;
        });
    });
}

function saveSettings() {
    // Save settings to localStorage
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    
    // Show success feedback
    showNotification('Pengaturan berhasil disimpan!');
    
    // Close modal
    closeSettings();
}

function loadSettings() {
    const saved = localStorage.getItem('gameSettings');
    if (saved) {
        gameSettings = JSON.parse(saved);
        
        // Update UI to reflect loaded settings
        updateSettingsUI();
    }
}

function updateSettingsUI() {
    // Update player count buttons
    const playerButtons = document.querySelectorAll('.player-btn');
    playerButtons.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.players) === gameSettings.players) {
            btn.classList.add('active');
        }
    });
    
    // Update mode buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === gameSettings.mode) {
            btn.classList.add('active');
        }
    });
}

function loadStats() {
    // Load game statistics from localStorage
    const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
    
    // Update stats display
    const lastWinnerEl = document.getElementById('last-winner');
    const totalGamesEl = document.getElementById('total-games');
    
    if (lastWinnerEl) {
        lastWinnerEl.textContent = stats.lastWinner || '-';
    }
    
    if (totalGamesEl) {
        totalGamesEl.textContent = stats.totalGames || 0;
    }
}

function updateStatsDisplay() {
    // Refresh stats every few seconds
    setInterval(loadStats, 5000);
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--gradient-success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            openModal.classList.remove('show');
        }
    }
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

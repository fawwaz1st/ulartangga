// Audio System for Ular Tangga Game
// Enhanced SFX and BGM

(function() {
  'use strict';

  // Audio context and sources
  let audioContext;
  let bgmGainNode;
  let sfxGainNode;
  let currentBGM = null;

  // Initialize audio system
  function initAudio() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain nodes for volume control
      bgmGainNode = audioContext.createGain();
      sfxGainNode = audioContext.createGain();
      
      bgmGainNode.connect(audioContext.destination);
      sfxGainNode.connect(audioContext.destination);
      
      // Set initial volumes
      bgmGainNode.gain.value = 0.8;
      sfxGainNode.gain.value = 0.7;
      
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  // Generate tone-based sounds
  function playTone(frequency, duration, type = 'sine', volume = 0.5) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(sfxGainNode);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  // Play complex sound effects
  function playComplexSFX(type) {
    if (!audioContext) return;
    
    switch (type) {
      case 'dice_roll':
        // Dice rolling sound - multiple quick tones
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            playTone(200 + Math.random() * 400, 0.1, 'square', 0.3);
          }, i * 50);
        }
        break;
        
      case 'move':
        // Movement sound - ascending tone
        playTone(220, 0.2, 'triangle', 0.4);
        setTimeout(() => playTone(330, 0.15, 'triangle', 0.3), 100);
        break;
        
      case 'ladder_up':
        // Ladder climbing - ascending notes
        const ladderNotes = [262, 294, 330, 370, 415];
        ladderNotes.forEach((freq, i) => {
          setTimeout(() => playTone(freq, 0.3, 'sine', 0.5), i * 100);
        });
        break;
        
      case 'snake_down':
        // Snake slide - descending glissando
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            const freq = 600 - (i * 25);
            playTone(freq, 0.1, 'sawtooth', 0.4);
          }, i * 30);
        }
        break;
        
      case 'skill_activate':
        // Skill activation - magical sound
        playTone(523, 0.2, 'sine', 0.6);
        setTimeout(() => playTone(659, 0.2, 'sine', 0.5), 100);
        setTimeout(() => playTone(784, 0.3, 'sine', 0.4), 200);
        break;
        
      case 'win':
        // Victory fanfare
        const victoryNotes = [523, 659, 784, 1047];
        victoryNotes.forEach((freq, i) => {
          setTimeout(() => playTone(freq, 0.5, 'sine', 0.7), i * 200);
        });
        break;
        
      case 'button_click':
        playTone(800, 0.1, 'square', 0.3);
        break;
        
      case 'notification':
        playTone(440, 0.2, 'sine', 0.5);
        setTimeout(() => playTone(554, 0.2, 'sine', 0.4), 150);
        break;
        
      case 'error':
        playTone(150, 0.3, 'sawtooth', 0.6);
        break;
        
      case 'turn_change':
        playTone(330, 0.15, 'triangle', 0.4);
        setTimeout(() => playTone(440, 0.15, 'triangle', 0.3), 100);
        break;
    }
  }

  // Enhanced background music system with multiple tracks and crossfade
  const BGM_TRACKS = [
    {
      name: 'Peaceful Garden',
      notes: [220, 247, 262, 294, 330, 370, 392, 440],
      tempo: 2500,
      harmony: true,
      waveType: 'sine'
    },
    {
      name: 'Mystic Forest',
      notes: [196, 220, 262, 294, 349, 392, 440, 523],
      tempo: 3000,
      harmony: true,
      waveType: 'triangle'
    },
    {
      name: 'Ocean Breeze',
      notes: [165, 196, 220, 247, 294, 330, 370, 415],
      tempo: 3500,
      harmony: false,
      waveType: 'sine'
    },
    {
      name: 'Mountain Serenity',
      notes: [147, 165, 196, 220, 262, 294, 330, 370],
      tempo: 4000,
      harmony: true,
      waveType: 'triangle'
    },
    {
      name: 'Starlight Dreams',
      notes: [262, 294, 330, 349, 392, 440, 494, 523],
      tempo: 2800,
      harmony: true,
      waveType: 'sine'
    }
  ];

  let currentTrackIndex = 0;
  let trackTimer = null;
  let fadeTimer = null;
  let currentTrackGain = null;

  function startBGM() {
    if (!audioContext || currentBGM) return;
    
    currentBGM = true;
    currentTrackIndex = Math.floor(Math.random() * BGM_TRACKS.length);
    playCurrentTrack();
    
    // Switch tracks every 2-3 minutes with crossfade
    const scheduleNextTrack = () => {
      if (!currentBGM) return;
      
      const switchTime = (120 + Math.random() * 60) * 1000; // 2-3 minutes
      trackTimer = setTimeout(() => {
        if (currentBGM) {
          crossfadeToNextTrack();
          scheduleNextTrack();
        }
      }, switchTime);
    };
    
    scheduleNextTrack();
  }

  function playCurrentTrack() {
    if (!audioContext || !currentBGM) return;
    
    const track = BGM_TRACKS[currentTrackIndex];
    let noteIndex = 0;
    
    // Create dedicated gain node for this track
    currentTrackGain = audioContext.createGain();
    currentTrackGain.connect(bgmGainNode);
    currentTrackGain.gain.value = 1.0;
    
    const playTrackLoop = () => {
      if (!currentBGM) return;
      
      const freq = track.notes[noteIndex % track.notes.length];
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(currentTrackGain);
      
      oscillator.frequency.value = freq;
      oscillator.type = track.waveType;
      
      const duration = 1.5 + Math.random() * 0.5;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
      // Add harmony if enabled
      if (track.harmony) {
        setTimeout(() => {
          if (currentBGM) {
            const harmonyOsc = audioContext.createOscillator();
            const harmonyGain = audioContext.createGain();
            
            harmonyOsc.connect(harmonyGain);
            harmonyGain.connect(currentTrackGain);
            
            harmonyOsc.frequency.value = freq * 1.5;
            harmonyOsc.type = track.waveType;
            
            harmonyGain.gain.setValueAtTime(0, audioContext.currentTime);
            harmonyGain.gain.linearRampToValueAtTime(0.18, audioContext.currentTime + 0.1);
            harmonyGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration * 0.8);
            
            harmonyOsc.start(audioContext.currentTime);
            harmonyOsc.stop(audioContext.currentTime + duration * 0.8);
          }
        }, 300);
      }
      
      noteIndex++;
      setTimeout(playTrackLoop, track.tempo + Math.random() * 500);
    };
    
    playTrackLoop();
  }

  function crossfadeToNextTrack() {
    if (!audioContext || !currentBGM) return;
    
    // Fade out current track
    if (currentTrackGain) {
      currentTrackGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 3);
    }
    
    // Switch to next track after fade
    setTimeout(() => {
      if (currentBGM) {
        currentTrackIndex = (currentTrackIndex + 1) % BGM_TRACKS.length;
        playCurrentTrack();
      }
    }, 3000);
  }

  function stopBGM() {
    currentBGM = false;
    if (trackTimer) {
      clearTimeout(trackTimer);
      trackTimer = null;
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (currentTrackGain) {
      currentTrackGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
    }
  }

  // Volume controls
  function setBGMVolume(volume) {
    if (bgmGainNode) {
      bgmGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  function setSFXVolume(volume) {
    if (sfxGainNode) {
      sfxGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // Export functions to window
  window.AudioSystem = {
    init: initAudio,
    playTone,
    playSFX: playComplexSFX,
    startBGM,
    stopBGM,
    setBGMVolume,
    setSFXVolume
  };

  // Auto-initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize on first user interaction
    const initOnInteraction = () => {
      if (!audioContext) {
        initAudio();
        setTimeout(() => {
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
              startBGM();
            });
          } else {
            startBGM();
          }
        }, 100);
      }
    };

    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('touchstart', initOnInteraction, { once: true });
    document.addEventListener('keydown', initOnInteraction, { once: true });
  });

})();

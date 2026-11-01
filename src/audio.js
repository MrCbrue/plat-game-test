/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Procedural WebAudio Music Sequencer & Sound Effect Synthesizer
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;

      this.masterVolume = 0.8;
      this.musicVolume = 0.55;
      this.sfxVolume = 0.85;
      this.muted = false;

      this.currentTrack = null;
      this.musicTimer = null;
      this.stepIndex = 0;
      this.isPlayingMusic = false;

      // Musical scales (MIDI note numbers)
      this.scales = {
        menu: [48, 51, 55, 58, 60, 63, 67, 70, 72],         // C minor melancholic
        catacombs: [45, 48, 52, 53, 57, 60, 64, 65],        // A phrygian/aeolian dark
        haven: [50, 53, 57, 60, 62, 65, 69, 72, 74],        // D dorian warm sanctuary
        forest: [47, 50, 54, 57, 59, 62, 66, 69, 71],       // B minor mystical
        foundry: [40, 43, 46, 47, 52, 55, 58, 59, 64],      // E diminished industrial
        crystal: [52, 56, 59, 63, 64, 68, 71, 75, 76],      // E major7 / lydian crystalline
        archive: [49, 52, 56, 57, 61, 64, 68, 69, 73],      // C# harmonic minor arcane
        citadel: [46, 49, 53, 54, 58, 61, 65, 66, 70],      // Bb minor dread
        boss: [38, 41, 44, 45, 50, 53, 56, 57, 62, 65],     // D harmonic minor intense
        final_boss: [36, 39, 42, 43, 48, 51, 54, 55, 60, 63]// C hungarian minor epic
      };
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.updateVolumes();
      } catch (e) {
        this.ctx = null;
      }
    }

    updateVolumes() {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.03);
      this.musicGain.gain.setTargetAtTime(this.musicVolume, now, 0.05);
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.03);
    }

    setVolumes({ master, music, sfx, muted }) {
      if (typeof master === 'number') this.masterVolume = master;
      if (typeof music === 'number') this.musicVolume = music;
      if (typeof sfx === 'number') this.sfxVolume = sfx;
      if (typeof muted === 'boolean') this.muted = muted;
      this.updateVolumes();
    }

    midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // Play procedural background soundtrack
    playMusic(trackName) {
      if (this.currentTrack === trackName && this.isPlayingMusic) return;
      this.currentTrack = trackName;
      this.stepIndex = 0;

      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      if (typeof window === 'undefined') return;

      this.isPlayingMusic = true;
      const tempoMap = {
        menu: 260,
        catacombs: 280,
        haven: 240,
        forest: 210,
        foundry: 165,
        crystal: 230,
        archive: 200,
        citadel: 175,
        boss: 135,
        final_boss: 120
      };
      const intervalMs = tempoMap[trackName] || 220;

      this.musicTimer = setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running' || this.muted || this.musicVolume <= 0.01) return;
        this.stepSequencer(this.currentTrack, this.stepIndex++);
      }, intervalMs);
    }

    stopMusic() {
      this.isPlayingMusic = false;
      this.currentTrack = null;
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }

    stepSequencer(track, step) {
      const scale = this.scales[track] || this.scales.menu;
      const now = this.ctx.currentTime;
      const isBoss = track === 'boss' || track === 'final_boss';
      const isIndustrial = track === 'foundry' || track === 'citadel';

      // Bass note on beats 0, 4, 8, 12 (or driving 8ths in boss tracks)
      if (step % (isBoss ? 2 : 4) === 0) {
        const bassIdx = (Math.floor(step / 8) * 2) % 4;
        const bassMidi = scale[bassIdx] - 12;
        this.synthNote({
          freq: this.midiToFreq(bassMidi),
          type: isBoss || isIndustrial ? 'sawtooth' : 'triangle',
          duration: isBoss ? 0.24 : 0.65,
          gain: isBoss ? 0.16 : 0.12,
          attack: 0.02,
          filterFreq: isBoss ? 480 : 320,
          dest: this.musicGain
        });
      }

      // Arpeggio / Melody notes
      const pattern = [0, 2, 4, 3, 5, 4, 2, 1, 3, 5, 7, 6, 4, 3, 2, 0];
      const idx = pattern[step % pattern.length];
      if (step % 2 === 0 || isBoss || track === 'crystal' || track === 'haven') {
        const noteMidi = scale[(idx + Math.floor(step / 16)) % scale.length] + (track === 'crystal' ? 12 : 0);
        this.synthNote({
          freq: this.midiToFreq(noteMidi),
          type: track === 'crystal' || track === 'haven' ? 'sine' : isBoss ? 'square' : 'triangle',
          duration: isBoss ? 0.18 : 0.42,
          gain: isBoss ? 0.08 : 0.07,
          attack: 0.015,
          filterFreq: 1800,
          dest: this.musicGain
        });
      }

      // Atmospheric Pad every 16 steps
      if (step % 16 === 0) {
        const root = scale[0];
        const fifth = scale[4] || root + 7;
        this.synthNote({
          freq: this.midiToFreq(root),
          type: 'sine',
          duration: 2.8,
          gain: 0.07,
          attack: 0.5,
          filterFreq: 900,
          dest: this.musicGain
        });
        this.synthNote({
          freq: this.midiToFreq(fifth),
          type: 'triangle',
          duration: 2.8,
          gain: 0.05,
          attack: 0.6,
          filterFreq: 900,
          dest: this.musicGain
        });
      }

      // Percussion for Boss / Foundry / Citadel tracks
      if ((isBoss || isIndustrial) && step % 2 === 0) {
        if (step % 4 === 0) {
          // Kick drum
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(125, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (isBoss) {
          // Snare / Metallic hi-hat
          this.playNoise({ duration: 0.06, gain: 0.06, filterFreq: 2600, dest: this.musicGain });
        }
      }
    }

    synthNote({ freq, type = 'sine', duration = 0.2, gain = 0.15, attack = 0.01, slideTo = null, filterFreq = 2400, dest = null }) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(gain, now + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(g);
      g.connect(dest || this.sfxGain);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playNoise({ duration = 0.1, gain = 0.15, filterFreq = 1200, dest = null }) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest || this.sfxGain);

      noise.start(now);
      noise.stop(now + duration + 0.01);
    }

    // Named Sound Effects
    playSFX(name, param = 1) {
      this.init();
      if (!this.ctx || this.muted || this.sfxVolume <= 0.01) return;

      switch (name) {
        case 'jump':
          this.synthNote({ freq: 190, slideTo: 420, type: 'sine', duration: 0.13, gain: 0.22 });
          break;
        case 'double_jump':
          this.synthNote({ freq: 310, slideTo: 660, type: 'triangle', duration: 0.16, gain: 0.24 });
          this.synthNote({ freq: 460, slideTo: 880, type: 'sine', duration: 0.18, gain: 0.14 });
          break;
        case 'wall_jump':
          this.synthNote({ freq: 240, slideTo: 510, type: 'triangle', duration: 0.12, gain: 0.22 });
          this.playNoise({ duration: 0.05, gain: 0.1, filterFreq: 1600 });
          break;
        case 'dash':
          this.playNoise({ duration: 0.14, gain: 0.24, filterFreq: 1900 });
          this.synthNote({ freq: 420, slideTo: 130, type: 'sawtooth', duration: 0.14, gain: 0.16, filterFreq: 1100 });
          break;
        case 'grapple':
          this.synthNote({ freq: 520, slideTo: 980, type: 'sawtooth', duration: 0.15, gain: 0.2, filterFreq: 2400 });
          this.synthNote({ freq: 780, slideTo: 1240, type: 'sine', duration: 0.18, gain: 0.15 });
          break;
        case 'slash_1':
          this.playNoise({ duration: 0.08, gain: 0.22, filterFreq: 2200 });
          this.synthNote({ freq: 320, slideTo: 150, type: 'triangle', duration: 0.09, gain: 0.2 });
          break;
        case 'slash_2':
          this.playNoise({ duration: 0.09, gain: 0.24, filterFreq: 2500 });
          this.synthNote({ freq: 390, slideTo: 170, type: 'triangle', duration: 0.1, gain: 0.22 });
          break;
        case 'slash_3':
          this.playNoise({ duration: 0.13, gain: 0.28, filterFreq: 2800 });
          this.synthNote({ freq: 520, slideTo: 180, type: 'sawtooth', duration: 0.15, gain: 0.25, filterFreq: 1800 });
          break;
        case 'hit_enemy':
          this.synthNote({ freq: 160, slideTo: 65, type: 'square', duration: 0.09, gain: 0.25, filterFreq: 900 });
          this.playNoise({ duration: 0.06, gain: 0.18, filterFreq: 1400 });
          break;
        case 'crit_hit':
          this.synthNote({ freq: 580, slideTo: 1120, type: 'triangle', duration: 0.16, gain: 0.28 });
          this.synthNote({ freq: 220, slideTo: 70, type: 'sawtooth', duration: 0.12, gain: 0.25 });
          break;
        case 'parry':
          // Iconic metallic ring!
          this.synthNote({ freq: 880, slideTo: 1320, type: 'triangle', duration: 0.32, gain: 0.34, filterFreq: 4000 });
          this.synthNote({ freq: 1760, slideTo: 1480, type: 'sine', duration: 0.38, gain: 0.26, filterFreq: 4500 });
          this.playNoise({ duration: 0.08, gain: 0.22, filterFreq: 3500 });
          break;
        case 'parry_stance':
          this.synthNote({ freq: 440, slideTo: 560, type: 'sine', duration: 0.08, gain: 0.15 });
          break;
        case 'spell_lance':
          this.synthNote({ freq: 640, slideTo: 240, type: 'sawtooth', duration: 0.24, gain: 0.26, filterFreq: 2200 });
          this.synthNote({ freq: 960, slideTo: 480, type: 'sine', duration: 0.26, gain: 0.2 });
          break;
        case 'spell_nova':
          this.playNoise({ duration: 0.28, gain: 0.3, filterFreq: 1600 });
          this.synthNote({ freq: 280, slideTo: 840, type: 'sawtooth', duration: 0.32, gain: 0.26, filterFreq: 2400 });
          break;
        case 'heal':
          this.synthNote({ freq: 440, slideTo: 660, type: 'sine', duration: 0.25, gain: 0.22 });
          setTimeout(() => this.synthNote({ freq: 660, slideTo: 880, type: 'sine', duration: 0.3, gain: 0.24 }), 90);
          break;
        case 'player_hurt':
          this.synthNote({ freq: 180, slideTo: 55, type: 'sawtooth', duration: 0.24, gain: 0.32, filterFreq: 750 });
          this.playNoise({ duration: 0.15, gain: 0.25, filterFreq: 900 });
          break;
        case 'pickup_shard':
          this.synthNote({ freq: 740 + Math.random() * 140, slideTo: 1180, type: 'sine', duration: 0.11, gain: 0.16 });
          break;
        case 'chest_open':
          [523, 659, 784, 1046].forEach((f, idx) => {
            setTimeout(() => this.synthNote({ freq: f, type: 'triangle', duration: 0.25, gain: 0.22 }), idx * 75);
          });
          break;
        case 'level_up':
        case 'achievement':
          [440, 554, 659, 880].forEach((f, idx) => {
            setTimeout(() => this.synthNote({ freq: f, type: 'triangle', duration: 0.32, gain: 0.24 }), idx * 85);
          });
          break;
        case 'boss_roar':
          this.synthNote({ freq: 115, slideTo: 42, type: 'sawtooth', duration: 0.65, gain: 0.35, filterFreq: 520 });
          this.playNoise({ duration: 0.55, gain: 0.28, filterFreq: 600 });
          break;
        case 'enemy_death':
          this.synthNote({ freq: 210, slideTo: 50, type: 'sawtooth', duration: 0.18, gain: 0.22, filterFreq: 800 });
          this.playNoise({ duration: 0.12, gain: 0.18, filterFreq: 1100 });
          break;
        case 'beacon_rest':
          [392, 493, 587, 784].forEach((f, idx) => {
            setTimeout(() => this.synthNote({ freq: f, type: 'sine', duration: 0.45, gain: 0.2 }), idx * 100);
          });
          break;
        case 'voice_blip':
          this.synthNote({
            freq: (typeof param === 'number' ? param : 360) + (Math.random() * 40 - 20),
            type: 'triangle',
            duration: 0.045,
            gain: 0.09,
            filterFreq: 1500
          });
          break;
        case 'ui_click':
          this.synthNote({ freq: 620, slideTo: 820, type: 'sine', duration: 0.06, gain: 0.15 });
          break;
        case 'ui_hover':
          this.synthNote({ freq: 480, type: 'sine', duration: 0.035, gain: 0.07 });
          break;
        default:
          this.synthNote({ freq: 440, duration: 0.08, gain: 0.12 });
          break;
      }
    }
  }

  Veyra.AudioEngine = AudioEngine;
  Veyra.audio = new AudioEngine();
})();

/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Main Game Engine: Loop, Input (Keyboard + Mouse + Gamepad), Save/Load, Progression & State Machine
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { CONFIG, STORY, MathUtils } = Veyra;
  const T = CONFIG.TILES;

  class InputManager {
    constructor(canvas) {
      this.keysDown = {};
      this.keysJustPressed = {};
      this.prevGamepadButtons = {};
      this.moveX = 0;
      this.moveY = 0;

      // Keybind Mapping
      this.bindings = {
        left: ['KeyA', 'ArrowLeft'],
        right: ['KeyD', 'ArrowRight'],
        up: ['KeyW', 'ArrowUp'],
        down: ['KeyS', 'ArrowDown'],
        jump: ['KeyW', 'Space', 'KeyZ', 'ArrowUp'],
        attack: ['KeyJ', 'Mouse0'],
        parry: ['KeyF', 'KeyV', 'Mouse2'],
        dash: ['KeyK', 'ShiftLeft', 'ShiftRight', 'KeyX'],
        grapple: ['KeyL', 'KeyG'],
        interact: ['KeyE', 'Enter'],
        heal: ['KeyH', 'KeyC'],
        spell1: ['KeyQ', 'Digit1'],
        spell2: ['KeyE', 'Digit2'],
        spell3: ['KeyR', 'Digit3'],
        menu: ['Tab', 'KeyM', 'Escape']
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e) => {
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
            if (document.activeElement && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
              e.preventDefault();
            }
          }
          if (!this.keysDown[e.code]) {
            this.keysJustPressed[e.code] = true;
          }
          this.keysDown[e.code] = true;
          Veyra.audio.init();
        });

        window.addEventListener('keyup', (e) => {
          this.keysDown[e.code] = false;
        });

        if (canvas) {
          canvas.addEventListener('mousedown', (e) => {
            Veyra.audio.init();
            const code = `Mouse${e.button}`;
            this.keysDown[code] = true;
            this.keysJustPressed[code] = true;
          });
          window.addEventListener('mouseup', (e) => {
            this.keysDown[`Mouse${e.button}`] = false;
          });
          canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }
      }
    }

    pollGamepad() {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const gp = pads && pads[0];
      if (!gp) return;

      const btnMap = {
        0: 'Space',      // A -> Jump
        1: 'KeyK',       // B -> Dash
        2: 'KeyJ',       // X -> Attack
        3: 'KeyF',       // Y -> Parry
        4: 'KeyL',       // LB -> Grapple
        5: 'KeyK',       // RB -> Dash
        6: 'KeyQ',       // LT -> Spell 1
        7: 'KeyR',       // RT -> Mend
        8: 'KeyM',       // Select -> Map
        9: 'Escape'      // Start -> Menu
      };

      for (const [idxStr, keyCode] of Object.entries(btnMap)) {
        const idx = Number(idxStr);
        const pressed = Boolean(gp.buttons[idx] && gp.buttons[idx].pressed);
        if (pressed && !this.prevGamepadButtons[idx]) {
          this.keysJustPressed[keyCode] = true;
        }
        if (pressed) this.keysDown[keyCode] = true;
        else if (this.prevGamepadButtons[idx]) this.keysDown[keyCode] = false;
        this.prevGamepadButtons[idx] = pressed;
      }

      // Stick axes
      if (Math.abs(gp.axes[0]) > 0.25) this.gpX = Math.sign(gp.axes[0]);
      else this.gpX = 0;
      if (Math.abs(gp.axes[1]) > 0.25) this.gpY = Math.sign(gp.axes[1]);
      else this.gpY = 0;
    }

    updateAxes() {
      this.pollGamepad();
      let mx = 0;
      let my = 0;
      if (this.isDown('left')) mx -= 1;
      if (this.isDown('right')) mx += 1;
      if (this.isDown('up')) my -= 1;
      if (this.isDown('down')) my += 1;
      if (this.gpX) mx = this.gpX;
      if (this.gpY) my = this.gpY;
      this.moveX = mx;
      this.moveY = my;
    }

    isDown(action) {
      const codes = this.bindings[action] || [];
      return codes.some((c) => Boolean(this.keysDown[c]));
    }

    justPressed(action) {
      const codes = this.bindings[action] || [];
      return codes.some((c) => Boolean(this.keysJustPressed[c]));
    }

    endFrame() {
      this.keysJustPressed = {};
    }
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.mode = 'title'; // 'title' | 'play' | 'editor'
      this.paused = false;

      this.settings = this.loadSettings();
      this.state = this.createDefaultState();
      this.activeSlot = 1;

      this.input = new InputManager(canvas);
      this.particles = new Veyra.ParticleSystem();
      this.renderer = new Veyra.Renderer(canvas);
      this.ui = new Veyra.UIManager(this);
      this.editor = new Veyra.LevelEditor(this);

      this.currentLevel = Veyra.LEVELS.catacombs;
      this.player = new Veyra.Player(160, 500, this);
      this.enemies = [];
      this.projectiles = [];
      this.drops = [];
      this.crumbleTimers = [];
      this.activeBoss = null;
      this.bossFightDamaged = false;
      this.bossRushQueue = [];

      // Camera & Hit-Stop / Screen Shake
      this.camera = { x: 0, y: 0 };
      this.shakeTimer = 0;
      this.shakeMagnitude = 0;
      this.hitStopTimer = 0;
      this.zoneTime = 0;
      this.dpr = 1;

      // Combat Combo Meter
      this.comboHits = 0;
      this.comboTimer = 0;

      this.setupResponsiveScreenAndFullscreen();
      this.bindEditorMouse();
    }

    setupResponsiveScreenAndFullscreen() {
      if (typeof window === 'undefined') return;
      this.resizeViewport();
      window.addEventListener('resize', () => this.resizeViewport());
      if (typeof document !== 'undefined') {
        document.addEventListener('fullscreenchange', () => this.resizeViewport());
      }

      // Auto-fullscreen on any active gameplay input & F11 fullscreen toggle
      window.addEventListener('keydown', (e) => {
        if (e.code === 'F11') {
          e.preventDefault();
          this.toggleFullscreen();
          return;
        }
        if (e.code !== 'Escape' && this.mode === 'play' && !this.paused) {
          this.ensureFullscreenOnActivePlay();
        }
      });

      if (this.canvas) {
        this.canvas.addEventListener('mousedown', () => {
          if (this.mode === 'play' && !this.paused) {
            this.ensureFullscreenOnActivePlay();
          }
        });
      }
    }

    resizeViewport() {
      if (typeof window === 'undefined' || !this.canvas) return;
      const winW = Math.max(320, window.innerWidth || 1280);
      const winH = Math.max(240, window.innerHeight || 720);
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      // Fit to exact screen aspect ratio while preserving 720 logical height so all levels fit vertically
      const aspect = winW / winH;
      CONFIG.VIEWPORT_HEIGHT = 720;
      CONFIG.VIEWPORT_WIDTH = Math.max(960, Math.min(1840, Math.round(720 * aspect)));

      this.dpr = dpr;
      this.canvas.width = Math.round(CONFIG.VIEWPORT_WIDTH * dpr);
      this.canvas.height = Math.round(CONFIG.VIEWPORT_HEIGHT * dpr);

      if (this.renderer && this.renderer.ctx) {
        this.renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    isFullscreen() {
      if (typeof document === 'undefined') return false;
      return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
    }

    requestGameFullscreen() {
      if (typeof document === 'undefined' || this.isFullscreen()) return;
      const elem = document.documentElement;
      const req =
        elem.requestFullscreen ||
        elem.webkitRequestFullscreen ||
        elem.msRequestFullscreen;
      if (req) {
        try {
          const p = req.call(elem);
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (e) {}
      }
    }

    exitGameFullscreen() {
      if (typeof document === 'undefined' || !this.isFullscreen()) return;
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;
      if (exit) {
        try {
          const p = exit.call(document);
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (e) {}
      }
    }

    toggleFullscreen() {
      if (this.isFullscreen()) {
        this.exitGameFullscreen();
      } else {
        this.requestGameFullscreen();
      }
    }

    ensureFullscreenOnActivePlay() {
      if (this.settings.autoFullscreen !== false && this.mode === 'play') {
        this.requestGameFullscreen();
      }
    }

    createDefaultState(difficulty = 'normal') {
      return {
        difficulty,
        currentZone: 'catacombs',
        checkpointZone: 'catacombs',
        checkpointX: 160,
        checkpointY: 680,
        level: 1,
        xp: 0,
        skillPoints: 1,
        hp: 100,
        maxHp: 100,
        mana: 100,
        maxMana: 100,
        shards: 40,
        elixirs: 3,
        maxElixirs: 3,
        maxRelicSlots: 4,
        equippedWeapon: 'duskblade',
        ownedWeapons: ['duskblade'],
        weaponUpgrades: { duskblade: 0 },
        equippedRelics: ['eclipse_crown_shard'],
        ownedRelics: ['eclipse_crown_shard'],
        unlockedSkills: [],
        defeatedBosses: [],
        openedChests: [],
        readTablets: [],
        achievements: [],
        bestiary: {},
        quests: {},
        flags: {},
        alignment: 0,
        parryCount: 0,
        playtime: 0
      };
    }

    loadSettings() {
      const defaults = {
        masterVolume: 0.8,
        musicVolume: 0.55,
        sfxVolume: 0.85,
        screenShake: 85,
        autoFullscreen: true,
        showTimer: false,
        highContrast: false,
        assistInvincible: false
      };
      if (typeof localStorage === 'undefined') return defaults;
      try {
        const raw = localStorage.getItem('veyra_settings_v1');
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
      } catch (e) {
        return defaults;
      }
    }

    saveSettings() {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem('veyra_settings_v1', JSON.stringify(this.settings));
      } catch (e) {}
    }

    // =========================================================================
    // SAVE & LOAD SYSTEM (3 Slots + Completion %)
    // =========================================================================
    getSaveSlotSummary(slot) {
      if (typeof localStorage === 'undefined') return null;
      try {
        const raw = localStorage.getItem(`veyra_save_slot_${slot}`);
        if (!raw) return null;
        const data = JSON.parse(raw);
        const zoneObj = Veyra.LEVELS[data.currentZone] || Veyra.LEVELS.catacombs;
        const completion = this.computeCompletionPct(data);
        return {
          slot,
          zoneName: zoneObj.name,
          level: data.level || 1,
          shards: data.shards || 0,
          bosses: (data.defeatedBosses || []).length,
          playtime: data.playtime || 0,
          completion
        };
      } catch (e) {
        return null;
      }
    }

    computeCompletionPct(s) {
      const bossScore = ((s.defeatedBosses || []).length / 5) * 45;
      const tabletScore = ((s.readTablets || []).length / STORY.LORE_TABLETS.length) * 20;
      const relicScore = ((s.ownedRelics || []).length / CONFIG.RELICS.length) * 15;
      const weaponScore = ((s.ownedWeapons || []).length / CONFIG.WEAPONS.length) * 10;
      const skillScore = ((s.unlockedSkills || []).length / CONFIG.SKILLS.length) * 10;
      return Math.min(100, Math.round(bossScore + tabletScore + relicScore + weaponScore + skillScore));
    }

    saveCurrentSlot() {
      if (typeof localStorage === 'undefined' || this.currentLevel.isBossRush) return;
      try {
        localStorage.setItem(`veyra_save_slot_${this.activeSlot}`, JSON.stringify(this.state));
      } catch (e) {}
    }

    deleteSaveSlot(slot) {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(`veyra_save_slot_${slot}`);
    }

    startNewGame(slot = 1, difficulty = 'normal') {
      this.activeSlot = slot;
      this.state = this.createDefaultState(difficulty);
      this.saveCurrentSlot();
      this.ui.hideTitleScreen();
      this.mode = 'play';
      this.ensureFullscreenOnActivePlay();
      this.loadZone('catacombs');
      this.ui.playCutscene('prologue', () => {
        this.paused = false;
        this.ensureFullscreenOnActivePlay();
      });
    }

    loadGameSlot(slot = 1) {
      this.activeSlot = slot;
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`veyra_save_slot_${slot}`);
        if (raw) {
          this.state = { ...this.createDefaultState(), ...JSON.parse(raw) };
        }
      }
      this.ui.hideTitleScreen();
      this.mode = 'play';
      this.paused = false;
      this.ensureFullscreenOnActivePlay();
      this.loadZone(this.state.currentZone || 'catacombs');
    }

    startBossRush() {
      this.state = this.createDefaultState('normal');
      this.state.level = 10;
      this.state.maxHp = 180;
      this.state.hp = 180;
      this.state.maxMana = 150;
      this.state.mana = 150;
      this.state.ownedWeapons = CONFIG.WEAPONS.map((w) => w.id);
      this.state.equippedWeapon = 'solaris_edge';
      this.state.ownedRelics = CONFIG.RELICS.map((r) => r.id);
      this.state.equippedRelics = ['crimson_fang', 'aegis_crest', 'swiftstride_anklet'];
      this.state.unlockedSkills = CONFIG.SKILLS.map((sk) => sk.id);
      this.bossRushQueue = ['moss_warden', 'clockwork_valkyrie', 'glacial_wyrm', 'inquisitor_thorne', 'archon_malakor'];

      this.ui.hideTitleScreen();
      this.mode = 'play';
      this.paused = false;
      this.ensureFullscreenOnActivePlay();
      this.loadZone('crucible', false);
    }

    returnToTitle() {
      this.mode = 'title';
      this.paused = false;
      Veyra.audio.playMusic('menu');
      this.ui.showTitleScreen();
    }

    // =========================================================================
    // ZONE LOADING & WORLD MANAGEMENT
    // =========================================================================
    loadZone(zoneId, triggerCutscene = true) {
      const level = Veyra.LEVELS[zoneId] || Veyra.LEVELS.catacombs;
      this.currentLevel = level;
      this.state.currentZone = level.id;
      this.zoneTime = 0;

      // Reset Player at Zone Spawn
      this.player.x = level.spawn.x;
      this.player.y = level.spawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.grappleTarget = null;

      this.state.checkpointZone = level.id;
      this.state.checkpointX = level.spawn.x;
      this.state.checkpointY = level.spawn.y;

      // Spawn Zone Enemies
      this.enemies = (level.entities || []).map((eData) => new Veyra.Enemy(eData, this));
      this.projectiles = [];
      this.drops = [];
      this.crumbleTimers = [];
      this.activeBoss = null;

      // Initialize Moving Platforms runtime positions
      if (level.movingPlatforms) {
        for (const mp of level.movingPlatforms) {
          mp.x = mp.x1;
          mp.y = mp.y1;
          mp.t = 0;
          mp.dx = 0;
        }
      }

      // Set Biome Weather & Music
      const biome = CONFIG.BIOMES[level.biome] || CONFIG.BIOMES.catacombs;
      this.particles.clear();
      this.particles.setWeather(biome.weather);
      Veyra.audio.playMusic(biome.musicTrack);

      this.ui.showZoneBanner(level.name, level.subtitle);

      if (zoneId === 'haven') {
        this.unlockAchievement('awaken');
      }

      // Trigger Act Intro Cutscenes on first visit
      const actCutsceneMap = {
        haven: 'act1_intro',
        foundry: 'act2_intro',
        caverns: 'act3_intro',
        archive: 'act4_intro',
        citadel: 'act5_intro'
      };
      const csId = actCutsceneMap[zoneId];
      if (triggerCutscene && csId && !this.state.flags[`seen_${csId}`]) {
        this.state.flags[`seen_${csId}`] = true;
        this.paused = true;
        this.ui.playCutscene(csId, () => {
          this.paused = false;
        });
      }

      this.saveCurrentSlot();
    }

    getTile(col, row) {
      const lvl = this.currentLevel;
      if (!lvl || row < 0 || row >= lvl.rows || col < 0 || col >= lvl.cols) {
        return T.SOLID_STONE;
      }
      return lvl.grid[row][col];
    }

    triggerCrumbleTile(col, row) {
      if (this.crumbleTimers.some((ct) => ct.col === col && ct.row === row)) return;
      this.crumbleTimers.push({ col, row, state: 'shaking', timer: 0.45 });
    }

    // =========================================================================
    // COMBAT HELPERS, XP, SKILLS & ACHIEVEMENTS
    // =========================================================================
    spawnProjectile(projData) {
      this.projectiles.push({
        ...projData,
        maxLife: projData.life || 2.0
      });
    }

    spawnShardDrops(x, y, totalShards) {
      const count = Math.min(8, Math.max(2, Math.floor(totalShards / 5)));
      const perOrb = Math.max(1, Math.round(totalShards / count));
      for (let i = 0; i < count; i++) {
        this.drops.push({
          x,
          y,
          vx: MathUtils.randRange(-140, 140),
          vy: MathUtils.randRange(-260, -90),
          value: perOrb,
          life: 14
        });
      }
    }

    registerComboHit() {
      this.comboHits++;
      this.comboTimer = 3.2;
      if (this.getComboRank() === 'SS') {
        this.unlockAchievement('combo_ss');
      }
    }

    resetCombo() {
      this.comboHits = 0;
      this.comboTimer = 0;
    }

    getComboRank() {
      if (this.comboHits >= 22) return 'SS';
      if (this.comboHits >= 15) return 'S';
      if (this.comboHits >= 10) return 'A';
      if (this.comboHits >= 6) return 'B';
      if (this.comboHits >= 3) return 'C';
      return 'D';
    }

    getXPForNextLevel() {
      return 80 + (this.state.level - 1) * 55;
    }

    gainXP(amount) {
      this.state.xp += amount;
      let needed = this.getXPForNextLevel();
      while (this.state.xp >= needed) {
        this.state.xp -= needed;
        this.state.level++;
        this.state.skillPoints++;
        this.state.maxHp += 10;
        this.state.hp = this.state.maxHp;
        this.state.maxMana += 8;
        this.state.mana = this.state.maxMana;
        Veyra.audio.playSFX('level_up');
        this.particles.spawnFloatingText(this.player.x + 14, this.player.y - 24, `LEVEL UP! (Lv.${this.state.level})`, {
          color: '#facc15',
          size: 22,
          isCrit: true
        });
        this.ui.showToast(`Sentinel Level ${this.state.level}!`, '+10 Max HP, +8 Max Mana & +1 Skill Point!', '✨');
        needed = this.getXPForNextLevel();
      }
    }

    unlockSkill(skillId) {
      const node = CONFIG.SKILLS.find((s) => s.id === skillId);
      if (!node || this.state.unlockedSkills.includes(skillId)) return false;
      if (this.state.skillPoints < node.cost) return false;

      this.state.skillPoints -= node.cost;
      this.state.unlockedSkills.push(skillId);
      Veyra.audio.playSFX('level_up');

      // Immediate stat bonuses for specific skills
      if (skillId === 'weaver_1') {
        this.state.maxMana += 35;
        this.state.mana = this.state.maxMana;
      } else if (skillId === 'wind_1') {
        this.state.maxHp += 30;
        this.state.hp = this.state.maxHp;
      } else if (skillId === 'wind_3') {
        this.state.maxElixirs += 2;
        this.state.elixirs += 2;
      } else if (skillId === 'wind_5') {
        this.state.maxRelicSlots += 2;
      }

      if (this.state.unlockedSkills.length >= 8) {
        this.unlockAchievement('skill_master');
      }
      this.saveCurrentSlot();
      return true;
    }

    unlockAchievement(achId) {
      if (this.state.achievements.includes(achId)) return;
      const ach = CONFIG.ACHIEVEMENTS.find((a) => a.id === achId);
      if (!ach) return;
      this.state.achievements.push(achId);
      Veyra.audio.playSFX('achievement');
      this.ui.showToast(`Achievement Unlocked: ${ach.title}`, ach.desc, ach.icon);
      this.saveCurrentSlot();
    }

    addScreenShake(magnitude, duration) {
      this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
      this.shakeTimer = Math.max(this.shakeTimer, duration);
    }

    // =========================================================================
    // BOSS SPAWN, VICTORY & PLAYER DEATH
    // =========================================================================
    checkBossTrigger() {
      const lvl = this.currentLevel;
      if (!lvl.bossId || this.activeBoss) return;

      if (lvl.isBossRush) {
        if (this.player.x >= lvl.bossTriggerX && this.bossRushQueue.length > 0) {
          const nextBossId = this.bossRushQueue.shift();
          this.spawnBossEncounter(nextBossId);
        }
        return;
      }

      if (this.state.defeatedBosses.includes(lvl.bossId)) return;
      if (this.player.x >= lvl.bossTriggerX) {
        this.spawnBossEncounter(lvl.bossId);
      }
    }

    spawnBossEncounter(bossId) {
      const lvl = this.currentLevel;
      this.bossFightDamaged = false;
      this.activeBoss = new Veyra.Boss(
        bossId,
        lvl.bossSpawn.x,
        lvl.bossSpawn.y,
        lvl.arenaBounds,
        this
      );
      Veyra.audio.playMusic(bossId === 'archon_malakor' ? 'final_boss' : 'boss');
      Veyra.audio.playSFX('boss_roar');

      const diag = STORY.BOSS_DIALOGUES[bossId];
      if (diag && diag.intro && !lvl.isBossRush) {
        this.paused = true;
        this.ui.presentDialogue({
          speaker: diag.intro.speaker,
          role: this.activeBoss.subtitle,
          color: this.activeBoss.color,
          voicePitch: 190,
          text: diag.intro.text,
          choices: [{ label: 'Draw Your Duskblade! [Begin Battle]', action: 'close' }]
        });
      }
    }

    onBossDefeated(boss) {
      this.gainXP(boss.xp);
      this.spawnShardDrops(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.shards);
      this.unlockAchievement(boss.achievement);

      if (!this.bossFightDamaged) {
        this.unlockAchievement('untouchable');
      }
      if (this.zoneTime < 90) {
        this.unlockAchievement('speedrunner');
      }

      if (this.currentLevel.isBossRush) {
        this.player.heal(45);
        this.state.mana = this.state.maxMana;
        if (this.bossRushQueue.length > 0) {
          const nextId = this.bossRushQueue.shift();
          setTimeout(() => {
            if (this.currentLevel.isBossRush) this.spawnBossEncounter(nextId);
          }, 1600);
        } else {
          this.unlockAchievement('boss_rush_clear');
          this.ui.showToast('Crucible Conquered!', 'You defeated all 5 Bosses in Boss Rush Mode!', '🏆');
          Veyra.audio.playMusic('haven');
        }
        return;
      }

      if (!this.state.defeatedBosses.includes(boss.id)) {
        this.state.defeatedBosses.push(boss.id);
      }
      this.saveCurrentSlot();

      const biome = CONFIG.BIOMES[this.currentLevel.biome] || CONFIG.BIOMES.catacombs;
      Veyra.audio.playMusic(biome.musicTrack);

      const diag = STORY.BOSS_DIALOGUES[boss.id];
      if (boss.id === 'archon_malakor') {
        setTimeout(() => {
          this.ui.openEndingChoiceModal();
        }, 1200);
      } else if (diag && diag.defeat) {
        setTimeout(() => {
          this.paused = true;
          this.ui.presentDialogue({
            speaker: diag.defeat.speaker,
            role: 'Eclipse Shard Reclaimed!',
            color: '#facc15',
            voicePitch: 240,
            text: diag.defeat.text,
            choices: [
              {
                label: 'Claim Eclipse Shard & Return to Haven of Dusk',
                effect: () => this.loadZone('haven')
              },
              { label: 'Remain in this Zone', action: 'close' }
            ]
          });
        }, 900);
      }
    }

    onPlayerDeath() {
      this.state.hp = this.state.maxHp;
      this.state.mana = this.state.maxMana;
      this.state.elixirs = this.state.maxElixirs;
      this.player.phoenixUsedSinceRest = false;
      this.activeBoss = null;

      this.ui.showToast('Sentinel Fallen', 'Awakened at the last attuned Astral Beacon.', '🕯️');
      this.loadZone(this.state.checkpointZone || this.state.currentZone, false);
      this.player.x = this.state.checkpointX || this.currentLevel.spawn.x;
      this.player.y = this.state.checkpointY || this.currentLevel.spawn.y;
    }

    // =========================================================================
    // WORLD INTERACTION ([E] Key on NPCs, Beacons, Chests, Tablets, Portals)
    // =========================================================================
    isNearInteractable() {
      const p = this.player;
      const lvl = this.currentLevel;
      if (!p || !lvl) return false;
      if (lvl.npcs && lvl.npcs.some((n) => MathUtils.dist(p.x, p.y, n.x, n.y) < 78)) return true;
      if (lvl.tablets && lvl.tablets.some((t) => MathUtils.dist(p.x, p.y, t.x, t.y) < 72)) return true;
      if (lvl.chests && lvl.chests.some((c) => !this.state.openedChests.includes(c.id) && MathUtils.dist(p.x, p.y, c.x, c.y) < 68)) return true;
      if (lvl.beacons && lvl.beacons.some((b) => MathUtils.dist(p.x, p.y, b.x, b.y) < 75)) return true;
      if (lvl.portals && lvl.portals.some((pt) => MathUtils.dist(p.x, p.y, pt.x, pt.y) < 84)) return true;
      return false;
    }

    handleWorldInteraction() {
      const p = this.player;
      const lvl = this.currentLevel;

      // 1. Check NPCs
      if (lvl.npcs) {
        for (const npc of lvl.npcs) {
          if (MathUtils.dist(p.x, p.y, npc.x, npc.y) < 78) {
            this.ui.openNPCDialogue(npc.id);
            return;
          }
        }
      }

      // 2. Check Ancient Lore Tablets
      if (lvl.tablets) {
        for (const tb of lvl.tablets) {
          if (MathUtils.dist(p.x, p.y, tb.x, tb.y) < 72) {
            this.ui.openLoreTabletModal(tb.id);
            return;
          }
        }
      }

      // 3. Check Treasure Chests
      if (lvl.chests) {
        for (const ch of lvl.chests) {
          if (!this.state.openedChests.includes(ch.id) && MathUtils.dist(p.x, p.y, ch.x, ch.y) < 68) {
            this.state.openedChests.push(ch.id);
            Veyra.audio.playSFX('chest_open');
            const rw = ch.reward || {};
            if (rw.shards) {
              this.state.shards += rw.shards;
              this.particles.spawnFloatingText(ch.x + 18, ch.y - 12, `+${rw.shards} SHARDS`, {
                color: '#38bdf8',
                size: 18
              });
            }
            if (rw.weapon && !this.state.ownedWeapons.includes(rw.weapon)) {
              this.state.ownedWeapons.push(rw.weapon);
              const wObj = CONFIG.WEAPONS.find((w) => w.id === rw.weapon);
              this.ui.showToast('New Weapon Discovered!', wObj ? wObj.name : rw.weapon, '🗡️');
              if (this.state.ownedWeapons.length >= CONFIG.WEAPONS.length) {
                this.unlockAchievement('collector_weapons');
              }
            }
            if (rw.relic && !this.state.ownedRelics.includes(rw.relic)) {
              this.state.ownedRelics.push(rw.relic);
              const rObj = CONFIG.RELICS.find((r) => r.id === rw.relic);
              this.ui.showToast('New Relic Discovered!', rObj ? rObj.name : rw.relic, '📿');
              if (this.state.ownedRelics.length >= 8) {
                this.unlockAchievement('collector_relics');
              }
            }
            if (rw.item === 'elixir_refill') {
              this.state.maxElixirs++;
              this.state.elixirs = this.state.maxElixirs;
              this.ui.showToast('Crimson Flask Expanded!', 'Max Elixirs permanently increased by +1!', '🧪');
            }
            this.saveCurrentSlot();
            return;
          }
        }
      }

      // 4. Check Astral Beacons (Rest & Save)
      if (lvl.beacons) {
        for (const b of lvl.beacons) {
          if (MathUtils.dist(p.x, p.y, b.x, b.y) < 75) {
            this.state.hp = this.state.maxHp;
            this.state.mana = this.state.maxMana;
            this.state.elixirs = this.state.maxElixirs;
            this.player.phoenixUsedSinceRest = false;
            this.state.checkpointZone = lvl.id;
            this.state.checkpointX = b.x;
            this.state.checkpointY = b.y;
            this.saveCurrentSlot();
            Veyra.audio.playSFX('beacon_rest');
            this.particles.spawnBurst(b.x + 20, b.y + 20, {
              count: 32,
              color: '#38bdf8',
              altColor: '#fef08a',
              speedMin: 60,
              speedMax: 240
            });
            this.ui.showToast('Astral Beacon Attuned', 'Health, Mana & Elixirs restored. Game Saved!', '🔥');
            return;
          }
        }
      }

      // 5. Check Zone Portals
      if (lvl.portals) {
        for (const pt of lvl.portals) {
          if (MathUtils.dist(p.x, p.y, pt.x, pt.y) < 84) {
            const unlocked = this.state.defeatedBosses.length >= (pt.reqBossCount || 0);
            if (unlocked) {
              Veyra.audio.playSFX('beacon_rest');
              this.loadZone(pt.targetZone);
            } else {
              this.ui.showToast(
                'Portal Sealed',
                `Reclaim ${pt.reqBossCount} Eclipse Shard(s) to unlock this realm!`,
                '🔒'
              );
            }
            return;
          }
        }
      }
    }

    // =========================================================================
    // MAIN UPDATE & RENDER STEP
    // =========================================================================
    update(dt) {
      this.input.updateAxes();

      if (this.ui.activeCutscene) {
        this.ui.cutsceneTime += dt;
        const artCanvas = this.ui.el('cutscene-canvas');
        if (artCanvas) {
          const slide = this.ui.activeCutscene.slides[this.ui.cutsceneSlideIndex];
          if (slide) this.renderer.renderCutsceneArt(artCanvas, slide.artStyle, this.ui.cutsceneTime);
        }
        this.input.endFrame();
        return;
      }

      if (this.mode === 'editor') {
        this.camera.x += this.input.moveX * 520 * dt;
        this.camera.y += this.input.moveY * 520 * dt;
        this.camera.x = MathUtils.clamp(this.camera.x, 0, Math.max(0, this.currentLevel.cols * 40 - CONFIG.VIEWPORT_WIDTH));
        this.camera.y = MathUtils.clamp(this.camera.y, 0, Math.max(0, this.currentLevel.rows * 40 - CONFIG.VIEWPORT_HEIGHT));
        this.renderer.renderGame(this, dt);
        this.input.endFrame();
        return;
      }

      if (this.mode !== 'play') {
        this.particles.update(dt, this.camera);
        this.renderer.renderGame(this, dt);
        this.input.endFrame();
        return;
      }

      // Toggle Pause / Sanctuary Menu
      if (this.input.justPressed('menu')) {
        const pauseModal = this.ui.el('pause-menu-modal');
        if (pauseModal && !pauseModal.classList.contains('hidden')) {
          this.ui.closePauseMenu();
        } else {
          this.ui.openMenuTab('inventory');
        }
      }

      if (this.paused) {
        this.renderer.renderGame(this, 0);
        this.input.endFrame();
        return;
      }

      // Hit-Stop freeze frames for impactful parries/crits
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
        this.renderer.renderGame(this, 0);
        this.input.endFrame();
        return;
      }

      if (this.shakeTimer > 0) this.shakeTimer -= dt;
      this.state.playtime += dt;
      this.zoneTime += dt;

      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.comboHits = 0;
      }

      // Update Crumbling Blocks
      for (let i = this.crumbleTimers.length - 1; i >= 0; i--) {
        const ct = this.crumbleTimers[i];
        ct.timer -= dt;
        if (ct.state === 'shaking' && ct.timer <= 0) {
          this.currentLevel.grid[ct.row][ct.col] = T.EMPTY;
          ct.state = 'respawning';
          ct.timer = 3.2;
          this.particles.spawnBurst(ct.col * 40 + 20, ct.row * 40 + 20, {
            count: 10,
            color: '#64748b',
            speedMin: 40,
            speedMax: 140
          });
        } else if (ct.state === 'respawning' && ct.timer <= 0) {
          this.currentLevel.grid[ct.row][ct.col] = T.CRUMBLE_BLOCK;
          this.crumbleTimers.splice(i, 1);
        }
      }

      // Update Moving Platforms
      if (this.currentLevel.movingPlatforms) {
        for (const mp of this.currentLevel.movingPlatforms) {
          const prevX = mp.x;
          mp.t += dt * mp.speed;
          const factor = (Math.sin(mp.t) + 1) / 2;
          mp.x = MathUtils.lerp(mp.x1, mp.x2, factor);
          mp.y = MathUtils.lerp(mp.y1, mp.y2, factor);
          mp.dx = mp.x - prevX;
        }
      }

      // Update Player
      this.player.update(dt, this.input, this.currentLevel);

      // World Interact check
      if (this.input.justPressed('interact')) {
        this.handleWorldInteraction();
      }

      // Check Boss Trigger
      this.checkBossTrigger();

      // Update Enemies & Active Boss
      for (const enemy of this.enemies) {
        if (!enemy.dead) enemy.update(dt, this.player);
      }
      if (this.activeBoss && !this.activeBoss.dead) {
        this.activeBoss.update(dt, this.player);
      }

      // Update Projectiles
      const ts = CONFIG.TILE_SIZE;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.life -= dt;

        const c = Math.floor(pr.x / ts);
        const r = Math.floor(pr.y / ts);
        if (pr.life <= 0 || (!pr.pierce && Veyra.isSolidTile(this.getTile(c, r)))) {
          this.projectiles.splice(i, 1);
          continue;
        }

        const pBox = { x: pr.x - pr.w / 2, y: pr.y - pr.h / 2, w: pr.w, h: pr.h };
        if (pr.fromPlayer) {
          const targets = [...this.enemies];
          if (this.activeBoss && !this.activeBoss.dead) targets.push(this.activeBoss);
          for (const e of targets) {
            if (!e.dead && MathUtils.aabbOverlap(pBox, e)) {
              e.takeDamage(pr.damage, Math.sign(pr.vx) || 1, false, true);
              if (!pr.pierce) {
                this.projectiles.splice(i, 1);
                break;
              }
            }
          }
        } else if (MathUtils.aabbOverlap(pBox, this.player)) {
          this.player.takeDamage(pr.damage, pr.x);
          this.projectiles.splice(i, 1);
        }
      }

      // Update Aether Shard Drops
      const magnetRange = this.player.hasRelic('astral_magnet') ? 210 : 85;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.vy = Math.min(600, d.vy + 980 * dt);
        const dist = MathUtils.dist(d.x, d.y, this.player.x + 14, this.player.y + 24);
        if (dist < magnetRange) {
          const ang = MathUtils.angle(d.x, d.y, this.player.x + 14, this.player.y + 24);
          d.vx = Math.cos(ang) * 440;
          d.vy = Math.sin(ang) * 440;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const r = Math.floor((d.y + 6) / ts);
        const c = Math.floor(d.x / ts);
        if (Veyra.isSolidTile(this.getTile(c, r))) {
          d.y = r * ts - 6;
          d.vy = 0;
          d.vx *= 0.8;
        }
        if (dist < 28) {
          this.state.shards += d.value;
          if (this.state.shards >= 1000) this.unlockAchievement('wealthy');
          Veyra.audio.playSFX('pickup_shard');
          this.drops.splice(i, 1);
        }
      }

      // Update Camera with smooth look-ahead
      const targetCamX = this.player.x + this.player.w / 2 - CONFIG.VIEWPORT_WIDTH / 2 + this.player.facing * 75;
      const targetCamY = this.player.y + this.player.h / 2 - CONFIG.VIEWPORT_HEIGHT * 0.56;
      const maxCamX = Math.max(0, this.currentLevel.cols * ts - CONFIG.VIEWPORT_WIDTH);
      const maxCamY = Math.max(0, this.currentLevel.rows * ts - CONFIG.VIEWPORT_HEIGHT);

      this.camera.x = MathUtils.clamp(MathUtils.lerp(this.camera.x, targetCamX, dt * 6.5), 0, maxCamX);
      this.camera.y = MathUtils.clamp(MathUtils.lerp(this.camera.y, targetCamY, dt * 6.5), 0, maxCamY);

      // Update Particles & HUD
      this.particles.update(dt, this.camera);
      this.renderer.renderGame(this, dt);
      this.ui.updateHUD();
      this.input.endFrame();
    }

    bindEditorMouse() {
      if (!this.canvas) return;
      const getCoords = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CONFIG.VIEWPORT_WIDTH / rect.width;
        const scaleY = CONFIG.VIEWPORT_HEIGHT / rect.height;
        return {
          worldX: (e.clientX - rect.left) * scaleX + this.camera.x,
          worldY: (e.clientY - rect.top) * scaleY + this.camera.y
        };
      };

      this.canvas.addEventListener('mousedown', (e) => {
        if (this.mode !== 'editor') return;
        this.editor.isPainting = true;
        const { worldX, worldY } = getCoords(e);
        this.editor.handleCanvasClick(worldX, worldY, e.button === 2);
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.mode !== 'editor' || !this.editor.isPainting) return;
        if (this.editor.selectedTool === 'tile' || this.editor.selectedTool === 'erase') {
          const { worldX, worldY } = getCoords(e);
          this.editor.handleCanvasClick(worldX, worldY, e.buttons === 2);
        }
      });

      window.addEventListener('mouseup', () => {
        this.editor.isPainting = false;
      });
    }

    startLoop() {
      if (typeof window === 'undefined') return;
      this.ui.init();
      let lastTime = performance.now();
      const step = (now) => {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        this.update(dt);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  Veyra.InputManager = InputManager;
  Veyra.Game = Game;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        Veyra.game = new Game(canvas);
        Veyra.game.startLoop();
      }
    });
  }
})();

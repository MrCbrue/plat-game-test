/**
 * Chronicles of Veyra: The Shattered Eclipse
 * UI Manager: HUD, Dialogue System, Cutscene Player, Skill Tree, Inventory, Forge, Shop, Map, Codex & Save Slots
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { CONFIG, STORY, MathUtils } = Veyra;

  class UIManager {
    constructor(game) {
      this.game = game;
      this.activeCutscene = null;
      this.cutsceneSlideIndex = 0;
      this.cutsceneOnComplete = null;
      this.cutsceneTime = 0;

      this.activeDialogue = null;
      this.activeModalTab = 'inventory';
    }

    init() {
      if (typeof document === 'undefined') return;
      this.bindMenuButtons();
      this.renderSaveSlots();
    }

    el(id) {
      return typeof document !== 'undefined' ? document.getElementById(id) : null;
    }

    bindMenuButtons() {
      const onClick = (id, fn) => {
        const elem = this.el(id);
        if (elem) {
          elem.addEventListener('click', () => {
            Veyra.audio.playSFX('ui_click');
            fn();
          });
        }
      };

      onClick('btn-play-campaign', () => this.openSaveSlotsModal());
      onClick('btn-boss-rush', () => this.game.startBossRush());
      onClick('btn-level-editor', () => {
        this.hideTitleScreen();
        this.game.editor.open();
      });
      onClick('btn-replay-prologue', () => {
        this.playCutscene('prologue', () => {});
      });
      onClick('btn-open-achievements', () => this.openMenuTab('achievements'));
      onClick('btn-open-settings', () => this.openMenuTab('settings'));
      onClick('btn-open-credits', () => this.openCreditsModal());

      // Cutscene controls
      onClick('btn-cutscene-next', () => this.nextCutsceneSlide());
      onClick('btn-cutscene-skip', () => this.finishCutscene());

      // Sanctuary / Pause Menu Tabs
      document.querySelectorAll('[data-menu-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          Veyra.audio.playSFX('ui_click');
          this.openMenuTab(btn.getAttribute('data-menu-tab'));
        });
      });

      onClick('btn-resume-game', () => this.closePauseMenu());
      onClick('btn-return-title', () => {
        this.closePauseMenu();
        this.game.returnToTitle();
      });

      // Editor Toolbar bindings
      onClick('btn-editor-playtest', () => this.game.editor.playtest());
      onClick('btn-editor-save', () => {
        this.game.editor.saveCustomLevel();
        this.showToast('Architect Saved', 'Custom level saved to browser storage!', '🧱');
      });
      onClick('btn-editor-export', () => {
        const json = this.game.editor.exportJSON();
        this.promptJSONModal('Export Custom Level JSON', json, null);
      });
      onClick('btn-editor-import', () => {
        this.promptJSONModal('Paste Custom Level JSON', '', (val) => {
          if (this.game.editor.importJSON(val)) {
            this.showToast('Level Imported', 'Custom level loaded into Editor!', '🗺️');
          }
        });
      });
      onClick('btn-editor-exit', () => this.game.editor.closeToMenu());

      const toolSelect = this.el('editor-tool-select');
      if (toolSelect) {
        toolSelect.addEventListener('change', (e) => {
          const val = e.target.value;
          if (val.startsWith('tile:')) {
            this.game.editor.selectedTool = 'tile';
            this.game.editor.selectedTile = Number(val.split(':')[1]);
          } else if (val.startsWith('enemy:')) {
            this.game.editor.selectedTool = 'enemy';
            this.game.editor.selectedEnemy = val.split(':')[1];
          } else {
            this.game.editor.selectedTool = val;
          }
        });
      }

      const biomeSelect = this.el('editor-biome-select');
      if (biomeSelect) {
        biomeSelect.addEventListener('change', (e) => {
          this.game.editor.customData.biome = e.target.value;
          Veyra.LEVELS.custom_level.biome = e.target.value;
        });
      }
    }

    showTitleScreen() {
      const title = this.el('title-screen');
      if (title) title.classList.remove('hidden');
      const hud = this.el('game-hud');
      if (hud) hud.classList.add('hidden');
      this.renderSaveSlots();
    }

    hideTitleScreen() {
      const title = this.el('title-screen');
      if (title) title.classList.add('hidden');
      const hud = this.el('game-hud');
      if (hud) hud.classList.remove('hidden');
    }

    showEditorToolbar(visible) {
      const bar = this.el('editor-toolbar');
      if (bar) bar.classList.toggle('hidden', !visible);
    }

    // Update live HUD every frame
    updateHUD() {
      if (typeof document === 'undefined') return;
      const s = this.game.state;
      const p = this.game.player;
      if (!s || !p) return;

      // Health & Mana Bars
      const hpPct = MathUtils.clamp((s.hp / s.maxHp) * 100, 0, 100);
      const manaPct = MathUtils.clamp((s.mana / s.maxMana) * 100, 0, 100);
      const xpNeed = this.game.getXPForNextLevel();
      const xpPct = MathUtils.clamp((s.xp / xpNeed) * 100, 0, 100);

      const hpFill = this.el('hud-hp-fill');
      const hpText = this.el('hud-hp-text');
      if (hpFill) hpFill.style.width = `${hpPct}%`;
      if (hpText) hpText.textContent = `${Math.max(0, Math.round(s.hp))} / ${s.maxHp}`;

      const manaFill = this.el('hud-mana-fill');
      const manaText = this.el('hud-mana-text');
      if (manaFill) manaFill.style.width = `${manaPct}%`;
      if (manaText) manaText.textContent = `${Math.round(s.mana)} / ${s.maxMana}`;

      const xpFill = this.el('hud-xp-fill');
      if (xpFill) xpFill.style.width = `${xpPct}%`;

      const lvlBadge = this.el('hud-level');
      if (lvlBadge) lvlBadge.textContent = `Lv.${s.level}`;

      const shardsEl = this.el('hud-shards');
      if (shardsEl) shardsEl.textContent = s.shards;

      const elixirEl = this.el('hud-elixirs');
      if (elixirEl) elixirEl.textContent = `${s.elixirs}/${s.maxElixirs}`;

      const spEl = this.el('hud-sp-badge');
      if (spEl) {
        spEl.textContent = s.skillPoints > 0 ? `+${s.skillPoints} SP` : '';
        spEl.classList.toggle('hidden', s.skillPoints <= 0);
      }

      // Combo Rank Indicator
      const comboBox = this.el('hud-combo-box');
      if (comboBox) {
        if (this.game.comboHits > 1 && this.game.comboTimer > 0) {
          comboBox.classList.remove('hidden');
          const rank = this.game.getComboRank();
          this.el('hud-combo-rank').textContent = rank;
          this.el('hud-combo-hits').textContent = `${this.game.comboHits} HITS`;
        } else {
          comboBox.classList.add('hidden');
        }
      }

      // Boss Health Bar
      const bossHud = this.el('hud-boss-bar');
      const boss = this.game.activeBoss;
      if (bossHud) {
        if (boss && !boss.dead) {
          bossHud.classList.remove('hidden');
          this.el('hud-boss-name').textContent = `${boss.name} (PHASE ${boss.phase})`;
          this.el('hud-boss-sub').textContent = boss.subtitle;
          const bPct = MathUtils.clamp((boss.hp / boss.maxHp) * 100, 0, 100);
          this.el('hud-boss-fill').style.width = `${bPct}%`;
        } else {
          bossHud.classList.add('hidden');
        }
      }

      // Speedrun Timer
      const timerEl = this.el('hud-speedrun-timer');
      if (timerEl) {
        if (this.game.settings.showTimer || this.game.currentLevel.isBossRush) {
          timerEl.classList.remove('hidden');
          timerEl.textContent = `⏱️ ${MathUtils.formatTime(s.playtime, true)} | Zone: ${MathUtils.formatTime(this.game.zoneTime, true)}`;
        } else {
          timerEl.classList.add('hidden');
        }
      }
    }

    showZoneBanner(title, subtitle) {
      const banner = this.el('zone-banner');
      if (!banner) return;
      this.el('zone-banner-title').textContent = title;
      this.el('zone-banner-sub').textContent = subtitle;
      banner.classList.remove('hidden');
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => banner.classList.add('hidden'), 3400);
    }

    showToast(title, desc, icon = '🏆') {
      const container = this.el('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'achievement-toast';
      toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
          <div class="toast-title">${title}</div>
          <div class="toast-desc">${desc}</div>
        </div>
      `;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 3600);
    }

    // =========================================================================
    // SAVE SLOTS MODAL
    // =========================================================================
    openSaveSlotsModal() {
      this.renderSaveSlots();
      const modal = this.el('save-slots-modal');
      if (modal) modal.classList.remove('hidden');
    }

    renderSaveSlots() {
      const container = this.el('save-slots-list');
      if (!container) return;
      container.innerHTML = '';

      for (let slot = 1; slot <= 3; slot++) {
        const meta = this.game.getSaveSlotSummary(slot);
        const card = document.createElement('div');
        card.className = 'save-slot-card';
        if (meta) {
          card.innerHTML = `
            <div class="slot-header">
              <strong>SLOT ${slot} — ${meta.zoneName}</strong>
              <span class="slot-pct">${meta.completion}% Complete</span>
            </div>
            <div class="slot-meta">
              Lv.${meta.level} Sentinel | 💎 ${meta.shards} Shards | 👑 ${meta.bosses}/5 Shards | ⏱️ ${MathUtils.formatTime(meta.playtime)}
            </div>
            <div class="slot-actions">
              <button class="btn-gold" data-action="load" data-slot="${slot}">Continue Journey</button>
              <button class="btn-outline" data-action="export" data-slot="${slot}">Export</button>
              <button class="btn-danger" data-action="delete" data-slot="${slot}">Erase</button>
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="slot-header">
              <strong>SLOT ${slot} — Empty Chronicle</strong>
              <span class="slot-pct">New Game</span>
            </div>
            <div class="slot-meta">Begin a new journey across the Fallen Kingdom of Veyra.</div>
            <div class="slot-actions">
              <button class="btn-gold" data-action="new" data-slot="${slot}">Start New Chronicle</button>
              <button class="btn-outline" data-action="import" data-slot="${slot}">Import Save JSON</button>
            </div>
          `;
        }
        container.appendChild(card);
      }

      container.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          Veyra.audio.playSFX('ui_click');
          const act = btn.getAttribute('data-action');
          const slot = Number(btn.getAttribute('data-slot'));
          const diffEl = this.el('difficulty-select');
          const difficulty = diffEl ? diffEl.value : 'normal';

          if (act === 'new') {
            this.el('save-slots-modal').classList.add('hidden');
            this.game.startNewGame(slot, difficulty);
          } else if (act === 'load') {
            this.el('save-slots-modal').classList.add('hidden');
            this.game.loadGameSlot(slot);
          } else if (act === 'delete') {
            this.game.deleteSaveSlot(slot);
            this.renderSaveSlots();
          } else if (act === 'export') {
            const raw = localStorage.getItem(`veyra_save_slot_${slot}`);
            this.promptJSONModal(`Export Save Slot ${slot}`, raw || '{}', null);
          } else if (act === 'import') {
            this.promptJSONModal(`Import Save JSON into Slot ${slot}`, '', (json) => {
              try {
                const parsed = JSON.parse(json);
                if (parsed && parsed.maxHp) {
                  localStorage.setItem(`veyra_save_slot_${slot}`, JSON.stringify(parsed));
                  this.renderSaveSlots();
                }
              } catch (e) {}
            });
          }
        });
      });
    }

    // =========================================================================
    // CINEMATIC CUTSCENE PLAYER
    // =========================================================================
    playCutscene(cutsceneId, onComplete) {
      const cs = STORY.CUTSCENES[cutsceneId];
      if (!cs) {
        if (onComplete) onComplete();
        return;
      }
      this.activeCutscene = cs;
      this.cutsceneSlideIndex = 0;
      this.cutsceneOnComplete = onComplete;
      this.cutsceneTime = 0;

      Veyra.audio.playMusic(cs.music || 'menu');
      const modal = this.el('cutscene-overlay');
      if (modal) {
        modal.classList.remove('hidden');
        this.renderCurrentCutsceneSlide();
      } else if (onComplete) {
        onComplete();
      }
    }

    renderCurrentCutsceneSlide() {
      if (!this.activeCutscene) return;
      const slide = this.activeCutscene.slides[this.cutsceneSlideIndex];
      if (!slide) {
        this.finishCutscene();
        return;
      }
      this.el('cutscene-header').textContent = this.activeCutscene.title;
      this.el('cutscene-speaker').textContent = `${slide.speaker} — ${slide.subtitle}`;
      this.el('cutscene-caption').textContent = slide.caption;
      this.el('cutscene-step').textContent = `Scene ${this.cutsceneSlideIndex + 1} / ${this.activeCutscene.slides.length}`;

      const artCanvas = this.el('cutscene-canvas');
      if (artCanvas && this.game.renderer) {
        this.game.renderer.renderCutsceneArt(artCanvas, slide.artStyle, this.cutsceneTime);
      }
    }

    nextCutsceneSlide() {
      if (!this.activeCutscene) return;
      this.cutsceneSlideIndex++;
      if (this.cutsceneSlideIndex >= this.activeCutscene.slides.length) {
        this.finishCutscene();
      } else {
        this.renderCurrentCutsceneSlide();
      }
    }

    finishCutscene() {
      const cb = this.cutsceneOnComplete;
      this.activeCutscene = null;
      this.cutsceneOnComplete = null;
      const modal = this.el('cutscene-overlay');
      if (modal) modal.classList.add('hidden');
      if (cb) cb();
    }

    // =========================================================================
    // INTERACTIVE NPC & LORE DIALOGUE BOX
    // =========================================================================
    openNPCDialogue(npcId) {
      const npc = STORY.NPCS[npcId];
      if (!npc) return;
      this.game.paused = true;
      const node = npc.getDialogue(this.game.state);
      this.presentDialogue({
        speaker: npc.name,
        role: npc.role,
        color: npc.color,
        voicePitch: npc.voicePitch,
        text: node.text,
        choices: node.choices || [{ label: 'Continue', action: 'close' }]
      });
    }

    openLoreTabletModal(tabletId) {
      const tab = STORY.LORE_TABLETS.find((t) => t.id === tabletId);
      if (!tab) return;
      if (!this.game.state.readTablets.includes(tabletId)) {
        this.game.state.readTablets.push(tabletId);
        this.game.gainXP(35);
        this.showToast('Ancient Lore Deciphered', `${tab.title} (+35 XP)`, '📜');
        if (this.game.state.readTablets.length >= 10) {
          this.game.unlockAchievement('lore_scholar');
        }
      }
      this.game.paused = true;
      this.presentDialogue({
        speaker: tab.title,
        role: `Ancient Monolith — ${tab.zone}`,
        color: '#c084fc',
        voicePitch: 320,
        text: tab.text,
        choices: [
          { label: 'Open Full Lore Codex', action: 'open_codex' },
          { label: 'Step Away', action: 'close' }
        ]
      });
    }

    presentDialogue({ speaker, role, color, voicePitch = 380, text, choices }) {
      const box = this.el('dialogue-overlay');
      if (!box) return;
      box.classList.remove('hidden');
      this.el('dialogue-speaker').textContent = speaker;
      this.el('dialogue-speaker').style.color = color || '#facc15';
      this.el('dialogue-role').textContent = role || '';
      this.el('dialogue-text').textContent = text;
      Veyra.audio.playSFX('voice_blip', voicePitch);

      const choicesEl = this.el('dialogue-choices');
      choicesEl.innerHTML = '';
      (choices || [{ label: 'Continue', action: 'close' }]).forEach((ch) => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-choice-btn';
        btn.textContent = `▸ ${ch.label}`;
        btn.addEventListener('click', () => {
          Veyra.audio.playSFX('ui_click');
          if (ch.effect) {
            ch.effect(this.game.state);
            this.game.saveCurrentSlot();
            this.checkQuestAchievements();
          }
          if (ch.nextText) {
            this.presentDialogue({
              speaker,
              role,
              color,
              voicePitch,
              text: ch.nextText,
              choices: [{ label: 'Farewell', action: 'close' }]
            });
            return;
          }
          this.closeDialogue();
          if (ch.action === 'open_forge' || ch.action === 'open_shop') {
            this.openMenuTab('forge');
          } else if (ch.action === 'open_inventory') {
            this.openMenuTab('inventory');
          } else if (ch.action === 'open_skills') {
            this.openMenuTab('skills');
          } else if (ch.action === 'open_codex') {
            this.openMenuTab('codex');
          } else if (ch.action === 'travel_crucible') {
            this.game.loadZone('crucible');
          }
        });
        choicesEl.appendChild(btn);
      });
    }

    closeDialogue() {
      const box = this.el('dialogue-overlay');
      if (box) box.classList.add('hidden');
      this.game.paused = false;
    }

    checkQuestAchievements() {
      const completedCount = STORY.QUESTS.filter((q) => q.isComplete(this.game.state)).length;
      if (completedCount >= 4) {
        this.game.unlockAchievement('quest_champion');
      }
    }

    // =========================================================================
    // SANCTUARY / PAUSE MENU TABS (Inventory, Skills, Quests/Map, Codex, Forge/Shop, Settings)
    // =========================================================================
    openMenuTab(tabName = 'inventory') {
      this.activeModalTab = tabName;
      this.game.paused = true;
      const modal = this.el('pause-menu-modal');
      if (modal) modal.classList.remove('hidden');

      document.querySelectorAll('[data-menu-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-menu-tab') === tabName);
      });

      this.renderActiveTabContent(tabName);
    }

    closePauseMenu() {
      const modal = this.el('pause-menu-modal');
      if (modal) modal.classList.add('hidden');
      if (this.game.mode === 'play') {
        this.game.paused = false;
        this.game.ensureFullscreenOnActivePlay();
      }
    }

    renderActiveTabContent(tab) {
      const body = this.el('pause-tab-body');
      if (!body) return;
      const s = this.game.state;

      if (tab === 'inventory') {
        const usedSlots = s.equippedRelics.reduce((acc, rId) => {
          const r = CONFIG.RELICS.find((x) => x.id === rId);
          return acc + (r ? r.slots : 0);
        }, 0);

        let html = `
          <div class="tab-grid-two">
            <div class="panel-card">
              <h3>🗡️ Sentinel Weapons</h3>
              <p class="muted-note">Select your active blade. Visit Forgemaster Bram to temper weapons up to +5.</p>
              <div class="item-list">
        `;
        for (const w of CONFIG.WEAPONS) {
          const owned = s.ownedWeapons.includes(w.id);
          const equipped = s.equippedWeapon === w.id;
          const tier = (s.weaponUpgrades && s.weaponUpgrades[w.id]) || 0;
          const dmg = Math.round(w.baseDamage * (1 + tier * 0.18));
          html += `
            <div class="item-row ${equipped ? 'equipped-row' : ''} ${!owned ? 'locked-row' : ''}">
              <div>
                <strong style="color:${w.color}">${w.name} ${tier > 0 ? `+${tier}` : ''}</strong>
                <div class="item-sub">DMG: ${dmg} | SPD: ${w.attackSpeed}x | CRIT: ${Math.round(w.critBonus * 100)}%</div>
                <div class="item-desc">${owned ? w.desc : 'Unclaimed — Discover in chests or forge at Bram.'}</div>
              </div>
              ${
                owned
                  ? `<button class="btn-small ${equipped ? 'btn-gold' : 'btn-outline'}" data-equip-weapon="${w.id}">${
                      equipped ? 'Equipped' : 'Equip'
                    }</button>`
                  : `<span class="badge-locked">Locked</span>`
              }
            </div>
          `;
        }
        html += `
              </div>
            </div>
            <div class="panel-card">
              <h3>📿 Astral Relics (Notches: ${usedSlots} / ${s.maxRelicSlots})</h3>
              <p class="muted-note">Equip passive charms up to your Relic Notch capacity.</p>
              <div class="item-list">
        `;
        for (const r of CONFIG.RELICS) {
          const owned = s.ownedRelics.includes(r.id);
          const equipped = s.equippedRelics.includes(r.id);
          html += `
            <div class="item-row ${equipped ? 'equipped-row' : ''} ${!owned ? 'locked-row' : ''}">
              <div>
                <strong style="color:${r.color}">${r.name}</strong> <span class="notch-dots">${'◆'.repeat(r.slots)}</span>
                <div class="item-desc">${owned ? r.desc : 'Undiscovered Relic — Search Veyra or Sylvi\'s Curio Shop.'}</div>
              </div>
              ${
                owned
                  ? `<button class="btn-small ${equipped ? 'btn-gold' : 'btn-outline'}" data-toggle-relic="${r.id}">${
                      equipped ? 'Unequip' : 'Equip'
                    }</button>`
                  : `<span class="badge-locked">Locked</span>`
              }
            </div>
          `;
        }
        html += `</div></div></div>`;
        body.innerHTML = html;

        body.querySelectorAll('[data-equip-weapon]').forEach((btn) => {
          btn.addEventListener('click', () => {
            s.equippedWeapon = btn.getAttribute('data-equip-weapon');
            Veyra.audio.playSFX('ui_click');
            this.renderActiveTabContent('inventory');
          });
        });
        body.querySelectorAll('[data-toggle-relic]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const rId = btn.getAttribute('data-toggle-relic');
            const relic = CONFIG.RELICS.find((x) => x.id === rId);
            if (!relic) return;
            if (s.equippedRelics.includes(rId)) {
              s.equippedRelics = s.equippedRelics.filter((x) => x !== rId);
              Veyra.audio.playSFX('ui_click');
            } else if (usedSlots + relic.slots <= s.maxRelicSlots) {
              s.equippedRelics.push(rId);
              Veyra.audio.playSFX('equip');
            } else {
              this.showToast('Not Enough Notches', 'Unequip a relic or buy a Celestial Relic Notch from Sylvi!', '⚠️');
            }
            this.renderActiveTabContent('inventory');
          });
        });
      } else if (tab === 'skills') {
        const branches = ['Vanguard', 'Weaver', 'Windrunner'];
        let html = `
          <div class="skills-header">
            <h3>✨ Sentinel Skill Tree — Available Skill Points: <span class="gold-text">${s.skillPoints} SP</span></h3>
            <p class="muted-note">Earn Skill Points by leveling up from combat XP, deciphering Lore Tablets, and completing quests.</p>
          </div>
          <div class="tab-grid-three">
        `;
        for (const bName of branches) {
          html += `<div class="panel-card"><h4>Path of the ${bName}</h4><div class="item-list">`;
          const nodes = CONFIG.SKILLS.filter((sk) => sk.branch === bName);
          for (const node of nodes) {
            const unlocked = s.unlockedSkills.includes(node.id);
            const reqMet = !node.req || s.unlockedSkills.includes(node.req);
            const canBuy = !unlocked && reqMet && s.skillPoints >= node.cost;
            html += `
              <div class="item-row ${unlocked ? 'equipped-row' : ''}">
                <div>
                  <strong>Tier ${node.tier}: ${node.name}</strong> <span class="gold-text">(${node.cost} SP)</span>
                  <div class="item-desc">${node.desc}</div>
                </div>
                ${
                  unlocked
                    ? `<span class="badge-unlocked">Mastered</span>`
                    : `<button class="btn-small ${canBuy ? 'btn-gold' : 'btn-outline'}" ${
                        canBuy ? '' : 'disabled'
                      } data-unlock-skill="${node.id}">Unlock</button>`
                }
              </div>
            `;
          }
          html += `</div></div>`;
        }
        html += `</div>`;
        body.innerHTML = html;

        body.querySelectorAll('[data-unlock-skill]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const skId = btn.getAttribute('data-unlock-skill');
            this.game.unlockSkill(skId);
            this.renderActiveTabContent('skills');
          });
        });
      } else if (tab === 'forge') {
        let html = `
          <div class="tab-grid-two">
            <div class="panel-card">
              <h3>🔨 Forgemaster Bram's Anvil (💎 ${s.shards} Shards)</h3>
              <p class="muted-note">Temper your owned weapons up to +5 (+18% damage per tier) or forge new blades.</p>
              <div class="item-list">
        `;
        for (const w of CONFIG.WEAPONS) {
          const owned = s.ownedWeapons.includes(w.id);
          const tier = (s.weaponUpgrades && s.weaponUpgrades[w.id]) || 0;
          const upgradeCost = 75 + tier * 65;
          html += `
            <div class="item-row">
              <div>
                <strong style="color:${w.color}">${w.name} ${owned ? `(+${tier}/+5)` : '(Unforged)'}</strong>
                <div class="item-desc">${w.desc}</div>
              </div>
              ${
                !owned
                  ? `<button class="btn-small btn-gold" data-forge-buy="${w.id}">Forge (${w.cost} 💎)</button>`
                  : tier < 5
                  ? `<button class="btn-small btn-gold" data-forge-upgrade="${w.id}">Temper +${tier + 1} (${upgradeCost} 💎)</button>`
                  : `<span class="badge-unlocked">MAX +5</span>`
              }
            </div>
          `;
        }
        html += `
              </div>
            </div>
            <div class="panel-card">
              <h3>🔮 Sylvi's Curio & Relic Bazaar (💎 ${s.shards} Shards)</h3>
              <p class="muted-note">Purchase Heart Crystals, Soul Vessels, Elixirs, and rare Relics.</p>
              <div class="item-list">
        `;
        for (const item of CONFIG.SHOP_ITEMS) {
          html += `
            <div class="item-row">
              <div>
                <strong>${item.name}</strong>
                <div class="item-desc">${item.desc}</div>
              </div>
              <button class="btn-small btn-gold" data-shop-item="${item.id}">Buy (${item.cost} 💎)</button>
            </div>
          `;
        }
        for (const r of CONFIG.RELICS) {
          if (r.cost <= 0 || s.ownedRelics.includes(r.id)) continue;
          html += `
            <div class="item-row">
              <div>
                <strong style="color:${r.color}">[Relic] ${r.name}</strong> (${r.slots} Notches)
                <div class="item-desc">${r.desc}</div>
              </div>
              <button class="btn-small btn-outline" data-shop-relic="${r.id}">Buy (${r.cost} 💎)</button>
            </div>
          `;
        }
        html += `</div></div></div>`;
        body.innerHTML = html;

        body.querySelectorAll('[data-forge-buy]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const wId = btn.getAttribute('data-forge-buy');
            const w = CONFIG.WEAPONS.find((x) => x.id === wId);
            if (w && s.shards >= w.cost && !s.ownedWeapons.includes(wId)) {
              s.shards -= w.cost;
              s.ownedWeapons.push(wId);
              s.equippedWeapon = wId;
              Veyra.audio.playSFX('parry');
              if (s.ownedWeapons.length >= CONFIG.WEAPONS.length) {
                this.game.unlockAchievement('collector_weapons');
              }
              this.renderActiveTabContent('forge');
            } else {
              this.showToast('Insufficient Shards', 'Defeat enemies or open chests to gather more Aether Shards.', '💎');
            }
          });
        });

        body.querySelectorAll('[data-forge-upgrade]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const wId = btn.getAttribute('data-forge-upgrade');
            const tier = (s.weaponUpgrades && s.weaponUpgrades[wId]) || 0;
            const cost = 75 + tier * 65;
            if (tier < 5 && s.shards >= cost) {
              s.shards -= cost;
              s.weaponUpgrades[wId] = tier + 1;
              Veyra.audio.playSFX('parry');
              if (s.weaponUpgrades[wId] >= 5) {
                this.game.unlockAchievement('forged_max');
              }
              this.checkQuestAchievements();
              this.renderActiveTabContent('forge');
            } else {
              this.showToast('Insufficient Shards', `Requires ${cost} Aether Shards.`, '💎');
            }
          });
        });

        body.querySelectorAll('[data-shop-item]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-shop-item');
            const item = CONFIG.SHOP_ITEMS.find((x) => x.id === id);
            if (!item || s.shards < item.cost) {
              this.showToast('Insufficient Shards', 'Gather more Aether Shards.', '💎');
              return;
            }
            s.shards -= item.cost;
            Veyra.audio.playSFX('chest_open');
            if (id === 'elixir_refill') {
              s.elixirs = Math.min(s.maxElixirs + 2, s.elixirs + 1);
            } else if (id === 'heart_crystal') {
              s.maxHp += 25;
              s.hp = s.maxHp;
            } else if (id === 'mana_vessel') {
              s.maxMana += 25;
              s.mana = s.maxMana;
            } else if (id === 'relic_notch') {
              s.maxRelicSlots += 1;
            }
            this.renderActiveTabContent('forge');
          });
        });

        body.querySelectorAll('[data-shop-relic]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const rId = btn.getAttribute('data-shop-relic');
            const r = CONFIG.RELICS.find((x) => x.id === rId);
            if (r && s.shards >= r.cost && !s.ownedRelics.includes(rId)) {
              s.shards -= r.cost;
              s.ownedRelics.push(rId);
              Veyra.audio.playSFX('chest_open');
              if (s.ownedRelics.length >= 8) {
                this.game.unlockAchievement('collector_relics');
              }
              this.renderActiveTabContent('forge');
            }
          });
        });
      } else if (tab === 'map') {
        const zones = [
          { id: 'catacombs', name: 'Zone 0: Whispering Catacombs', req: 0 },
          { id: 'haven', name: 'Zone 1: Haven of Dusk (Sanctuary Hub)', req: 0 },
          { id: 'outskirts', name: 'Zone 2: Sunken Outskirts (Act I)', req: 0 },
          { id: 'foundry', name: 'Zone 3: Ironhearth Foundry (Act II)', req: 1 },
          { id: 'caverns', name: 'Zone 4: Crystal Caverns (Act III)', req: 2 },
          { id: 'archive', name: 'Zone 5: Sunken Archive (Act IV)', req: 3 },
          { id: 'citadel', name: 'Zone 6: Obsidian Citadel (Act V)', req: 4 },
          { id: 'crucible', name: 'Zone 7: The Astral Crucible (Boss Rush)', req: 0 }
        ];
        let html = `
          <div class="tab-grid-two">
            <div class="panel-card">
              <h3>🗺️ Astral Fast-Travel Network</h3>
              <p class="muted-note">Warp directly to any unlocked Realm Zone across Veyra.</p>
              <div class="item-list">
        `;
        for (const z of zones) {
          const unlocked = s.defeatedBosses.length >= z.req;
          const isCurrent = s.currentZone === z.id;
          html += `
            <div class="item-row ${isCurrent ? 'equipped-row' : ''}">
              <div>
                <strong>${z.name}</strong>
                <div class="item-sub">${unlocked ? 'Astral Beacon Attuned' : `Requires ${z.req} Eclipse Shard(s)`}</div>
              </div>
              ${
                unlocked
                  ? `<button class="btn-small btn-gold" data-warp-zone="${z.id}">${isCurrent ? 'Reload Zone' : 'Fast Travel'}</button>`
                  : `<span class="badge-locked">Sealed</span>`
              }
            </div>
          `;
        }
        html += `
              </div>
            </div>
            <div class="panel-card">
              <h3>🧭 Chronicle Quest Journal</h3>
              <div class="item-list">
        `;
        for (const q of STORY.QUESTS) {
          const done = q.isComplete(s);
          html += `
            <div class="item-row ${done ? 'equipped-row' : ''}">
              <div>
                <strong>[${q.type}] ${q.title}</strong>
                <div class="item-sub">Giver: ${q.giver} — <span class="gold-text">${q.getProgress(s)}</span></div>
                <div class="item-desc">${q.desc}</div>
              </div>
              <span class="${done ? 'badge-unlocked' : 'badge-locked'}">${done ? 'Complete' : 'Active'}</span>
            </div>
          `;
        }
        html += `</div></div></div>`;
        body.innerHTML = html;

        body.querySelectorAll('[data-warp-zone]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const zId = btn.getAttribute('data-warp-zone');
            this.closePauseMenu();
            this.game.loadZone(zId);
          });
        });
      } else if (tab === 'codex') {
        let html = `
          <div class="tab-grid-two">
            <div class="panel-card">
              <h3>📜 Ancient Lore Tablets (${s.readTablets.length} / ${STORY.LORE_TABLETS.length})</h3>
              <div class="item-list">
        `;
        for (const tabEntry of STORY.LORE_TABLETS) {
          const unlocked = s.readTablets.includes(tabEntry.id);
          html += `
            <div class="item-row">
              <div>
                <strong>${tabEntry.title}</strong> <span class="item-sub">(${tabEntry.zone})</span>
                <div class="item-desc">${unlocked ? tabEntry.text : 'Undeciphered Monolith — Locate this tablet in ' + tabEntry.zone + '.'}</div>
              </div>
            </div>
          `;
        }
        html += `
              </div>
            </div>
            <div class="panel-card">
              <h3>👾 Hunter's Bestiary</h3>
              <div class="item-list">
        `;
        for (const [key, spec] of Object.entries(Veyra.ENEMY_SPECS)) {
          const kills = (s.bestiary && s.bestiary[key]) || 0;
          html += `
            <div class="item-row">
              <div>
                <strong style="color:${spec.color}">${spec.name}</strong>
                <div class="item-sub">HP: ${spec.hp} | ATK: ${spec.dmg} | Bounty: ${spec.shards} Shards</div>
              </div>
              <span class="badge-unlocked">Slain: ${kills}</span>
            </div>
          `;
        }
        html += `</div></div></div>`;
        body.innerHTML = html;
      } else if (tab === 'achievements') {
        let html = `
          <div class="panel-card">
            <h3>🏆 Hall of Achievements (${s.achievements.length} / ${CONFIG.ACHIEVEMENTS.length})</h3>
            <div class="achievements-grid">
        `;
        for (const ach of CONFIG.ACHIEVEMENTS) {
          const unlocked = s.achievements.includes(ach.id);
          html += `
            <div class="ach-card ${unlocked ? 'ach-unlocked' : 'ach-locked'}">
              <div class="ach-icon">${ach.icon}</div>
              <div>
                <strong>${ach.title}</strong>
                <div class="item-desc">${ach.desc}</div>
              </div>
            </div>
          `;
        }
        html += `</div></div>`;
        body.innerHTML = html;
      } else if (tab === 'settings') {
        const cfg = this.game.settings;
        body.innerHTML = `
          <div class="tab-grid-two">
            <div class="panel-card">
              <h3>🔊 Audio & Visual Settings</h3>
              <div class="setting-row">
                <label>Master Volume (${Math.round(cfg.masterVolume * 100)}%)</label>
                <input type="range" id="set-vol-master" min="0" max="100" value="${Math.round(cfg.masterVolume * 100)}"/>
              </div>
              <div class="setting-row">
                <label>Music Volume (${Math.round(cfg.musicVolume * 100)}%)</label>
                <input type="range" id="set-vol-music" min="0" max="100" value="${Math.round(cfg.musicVolume * 100)}"/>
              </div>
              <div class="setting-row">
                <label>SFX Volume (${Math.round(cfg.sfxVolume * 100)}%)</label>
                <input type="range" id="set-vol-sfx" min="0" max="100" value="${Math.round(cfg.sfxVolume * 100)}"/>
              </div>
              <div class="setting-row">
                <label>Screen Shake Intensity (${cfg.screenShake}%)</label>
                <input type="range" id="set-shake" min="0" max="100" value="${cfg.screenShake}"/>
              </div>
              <div class="setting-row">
                <label><input type="checkbox" id="set-autofullscreen" ${cfg.autoFullscreen !== false ? 'checked' : ''}/> Auto-Fullscreen While Actively Playing</label>
              </div>
              <div class="setting-row">
                <label><input type="checkbox" id="set-timer" ${cfg.showTimer ? 'checked' : ''}/> Show Speedrun Timer on HUD</label>
              </div>
              <div class="setting-row">
                <label><input type="checkbox" id="set-contrast" ${cfg.highContrast ? 'checked' : ''}/> High-Contrast Visibility Mode</label>
              </div>
              <div class="setting-row">
                <label><input type="checkbox" id="set-assist" ${cfg.assistInvincible ? 'checked' : ''}/> Assist Mode: Invincibility Toggle</label>
              </div>
              <div class="setting-row">
                <span>Display Mode</span>
                <button class="btn-small btn-gold" id="btn-settings-fullscreen">⛶ Toggle Fullscreen [F11]</button>
              </div>
            </div>
            <div class="panel-card">
              <h3>🎮 Controls Reference (Keyboard + Gamepad)</h3>
              <ul class="controls-list">
                <li><strong>Move Left / Right:</strong> [A / D] or [Left / Right Arrows] or Left Stick</li>
                <li><strong>Jump / Double Jump / Wall Jump:</strong> [W / Space / Z] or Gamepad A</li>
                <li><strong>Drop Through Platform:</strong> [S / Down] + [Jump]</li>
                <li><strong>Melee Sword Combo (3-Hit):</strong> [J] or [Left Mouse Click] or Gamepad X</li>
                <li><strong>Aerial Pogo Bounce:</strong> Hold [S / Down] + [Attack] in mid-air</li>
                <li><strong>Aegis Parry / Deflect:</strong> [F] or [Right Mouse Click] or Gamepad Y</li>
                <li><strong>Shadow Dash (Phase):</strong> [K / Shift / X] or Gamepad B / RB</li>
                <li><strong>Astral Grapple Hook:</strong> [L / G] or Gamepad LB / LT</li>
                <li><strong>Cast Arcane Spells:</strong> [Q / 1] Lance, [E / 2] Nova, [R / 3] Mend</li>
                <li><strong>Drink Crimson Elixir:</strong> [H / C]</li>
                <li><strong>Interact (NPC / Shrine / Chest / Portal):</strong> [E / Up Arrow]</li>
                <li><strong>Sanctuary Menu / Map / Inventory:</strong> [Tab / M / Esc]</li>
              </ul>
            </div>
          </div>
        `;

        const bindRange = (id, cb) => {
          const el = this.el(id);
          if (el) el.addEventListener('input', (e) => cb(Number(e.target.value)));
        };
        bindRange('set-vol-master', (v) => {
          cfg.masterVolume = v / 100;
          Veyra.audio.setVolumes({ master: cfg.masterVolume });
          this.game.saveSettings();
        });
        bindRange('set-vol-music', (v) => {
          cfg.musicVolume = v / 100;
          Veyra.audio.setVolumes({ music: cfg.musicVolume });
          this.game.saveSettings();
        });
        bindRange('set-vol-sfx', (v) => {
          cfg.sfxVolume = v / 100;
          Veyra.audio.setVolumes({ sfx: cfg.sfxVolume });
          this.game.saveSettings();
        });
        bindRange('set-shake', (v) => {
          cfg.screenShake = v;
          this.game.saveSettings();
        });

        const bindCheck = (id, key) => {
          const el = this.el(id);
          if (el) {
            el.addEventListener('change', (e) => {
              cfg[key] = e.target.checked;
              this.game.saveSettings();
            });
          }
        };
        bindCheck('set-autofullscreen', 'autoFullscreen');
        bindCheck('set-timer', 'showTimer');
        bindCheck('set-contrast', 'highContrast');
        bindCheck('set-assist', 'assistInvincible');
        const fsBtn = this.el('btn-settings-fullscreen');
        if (fsBtn) {
          fsBtn.addEventListener('click', () => this.game.toggleFullscreen());
        }
      }
    }

    // Ending Selection Modal after defeating Final Boss Archon Malakor!
    openEndingChoiceModal() {
      const s = this.game.state;
      const trueUnlocked = s.flags.lyraDecodedTruth || s.readTablets.length >= 6 || s.alignment >= 2;
      this.game.paused = true;

      const choices = [
        {
          label: '[Ending A: The Reforged Dawn] Reforge the Solaris Crown upon the Altar and restore the sun cycle.',
          effect: () => {
            this.game.unlockAchievement('ending_dawn');
            this.playCutscene('ending_dawn', () => this.openCreditsModal());
          }
        },
        {
          label: '[Ending B: Sovereign of the Eclipse] Absorb the Five Shards into your Duskblade and rule in eternal twilight.',
          effect: () => {
            this.game.unlockAchievement('ending_twilight');
            this.playCutscene('ending_twilight', () => this.openCreditsModal());
          }
        }
      ];

      if (trueUnlocked) {
        choices.unshift({
          label: '🌟 [TRUE ENDING: The Eternal Equilibrium] Channel the Lore Tablets\' harmonic convergence with Malakor & Lyra to dissolve Nyxara forever!',
          effect: () => {
            this.game.unlockAchievement('ending_true');
            this.playCutscene('ending_true', () => this.openCreditsModal());
          }
        });
      }

      this.presentDialogue({
        speaker: 'The Shattered Crown of Veyra',
        role: 'Altar of the Bleeding Sun — Final Decision',
        color: '#facc15',
        voicePitch: 440,
        text: 'Archon Malakor kneels before the Obsidian Altar as the five Eclipse Shards hover in resonant harmony. The fate of Veyra rests upon your blade, Sentinel Kaelen. Which destiny will you forge?',
        choices
      });
    }

    openCreditsModal() {
      const modal = this.el('credits-modal');
      if (modal) modal.classList.remove('hidden');
    }

    promptJSONModal(title, initialValue, onSubmit) {
      const modal = this.el('json-modal');
      if (!modal) return;
      modal.classList.remove('hidden');
      this.el('json-modal-title').textContent = title;
      const area = this.el('json-modal-textarea');
      area.value = initialValue || '';
      const submitBtn = this.el('btn-json-submit');
      submitBtn.style.display = onSubmit ? 'inline-block' : 'none';
      submitBtn.onclick = () => {
        if (onSubmit) onSubmit(area.value);
        modal.classList.add('hidden');
      };
    }
  }

  Veyra.UIManager = UIManager;
})();

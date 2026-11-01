/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Player Controller, Physics & Tile Collision, Enemies, Projectiles & World Pickups
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { CONFIG, MathUtils } = Veyra;
  const P = CONFIG.PHYSICS;
  const T = CONFIG.TILES;

  // Check if a tile ID is solid from all directions
  function isSolidTile(tileId, isShadowDashing = false) {
    if (tileId === T.SHADOW_GATE) return !isShadowDashing;
    return (
      tileId === T.SOLID_STONE ||
      tileId === T.MOSS_STONE ||
      tileId === T.CRUMBLE_BLOCK ||
      tileId === T.ICE_FLOOR ||
      tileId === T.CONVEYOR_LEFT ||
      tileId === T.CONVEYOR_RIGHT ||
      tileId === T.BREAKABLE_WALL ||
      tileId === T.ORNATE_BRICK ||
      tileId === T.CRYSTAL_BLOCK ||
      tileId === T.IRON_GIRDER ||
      tileId === T.OBSIDIAN_TILE
    );
  }

  // ===========================================================================
  // PLAYER SENTINEL CLASS (KAELEN)
  // ===========================================================================
  class Player {
    constructor(x, y, game) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.w = 28;
      this.h = 48;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;

      // Grounding & Traversal states
      this.onGround = false;
      this.onWall = 0; // -1 left wall, 1 right wall
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.jumpsRemaining = 1;
      this.dropThroughTimer = 0;
      this.standingTile = T.EMPTY;

      // Shadow Dash
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.dashDir = 1;

      // Astral Grapple
      this.grappleTarget = null;
      this.grappleCooldown = 0;

      // Combat & Combo
      this.attackTimer = 0;
      this.attackCooldown = 0;
      this.comboStep = 0;
      this.comboResetTimer = 0;
      this.attackDir = 'forward'; // 'forward' | 'up' | 'down'
      this.pogoStreak = 0;

      // Parry
      this.parryTimer = 0;
      this.parryCooldown = 0;
      this.guaranteedCrit = false;

      // Spells & Buffs
      this.spellCooldowns = { eclipse_lance: 0, solaris_nova: 0, chrono_mend: 0 };
      this.arcaneBladeTimer = 0;
      this.shieldTimer = 0;
      this.regenAccum = 0;

      // Damage & Invulnerability
      this.invulnTimer = 0;
      this.hurtFlashTimer = 0;
      this.phoenixUsedSinceRest = false;

      // Visual animation timers
      this.animTimer = 0;
      this.scarfPoints = Array.from({ length: 6 }, () => ({ x, y }));
    }

    get hasRelic() {
      return (id) => this.game.state.equippedRelics.includes(id);
    }

    get hasSkill() {
      return (id) => this.game.state.unlockedSkills.includes(id);
    }

    get currentWeapon() {
      const wId = this.game.state.equippedWeapon || 'duskblade';
      return CONFIG.WEAPONS.find((w) => w.id === wId) || CONFIG.WEAPONS[0];
    }

    get maxJumps() {
      // Base Double Jump (1 air jump) + 1 extra if Wings of the Sovereign unlocked
      return this.hasSkill('wind_5') ? 2 : 1;
    }

    getWeaponDamage() {
      const w = this.currentWeapon;
      const tier = (this.game.state.weaponUpgrades && this.game.state.weaponUpgrades[w.id]) || 0;
      let dmg = w.baseDamage * (1 + tier * 0.18);
      if (this.hasSkill('vanguard_1')) dmg *= 1.15;
      if (this.hasRelic('glass_sigil')) dmg *= 1.35;
      if (this.hasRelic('eclipse_crown_shard')) dmg *= 1.12;
      if (this.arcaneBladeTimer > 0) dmg *= 1.25;
      return Math.round(dmg);
    }

    update(dt, input, level) {
      this.animTimer += dt;

      // Cooldown ticks
      if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
      if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
      if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.grappleCooldown > 0) this.grappleCooldown -= dt;
      if (this.attackTimer > 0) this.attackTimer -= dt;
      if (this.attackCooldown > 0) this.attackCooldown -= dt;
      if (this.comboResetTimer > 0) {
        this.comboResetTimer -= dt;
        if (this.comboResetTimer <= 0) this.comboStep = 0;
      }
      if (this.parryTimer > 0) this.parryTimer -= dt;
      if (this.parryCooldown > 0) this.parryCooldown -= dt;
      if (this.invulnTimer > 0) this.invulnTimer -= dt;
      if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;
      if (this.arcaneBladeTimer > 0) this.arcaneBladeTimer -= dt;
      if (this.shieldTimer > 0) this.shieldTimer -= dt;

      for (const k of Object.keys(this.spellCooldowns)) {
        if (this.spellCooldowns[k] > 0) this.spellCooldowns[k] -= dt;
      }

      // Passive Relic Regeneration (Automaton Core)
      if (this.hasRelic('clockwork_heart')) {
        this.regenAccum += dt;
        this.game.state.mana = Math.min(this.game.state.maxMana, this.game.state.mana + 2 * dt);
        if (this.regenAccum >= 2.5) {
          this.regenAccum = 0;
          if (this.game.state.hp < this.game.state.maxHp) {
            this.game.state.hp = Math.min(this.game.state.maxHp, this.game.state.hp + 1);
          }
        }
      }

      // Handle Grapple Hook state
      if (this.grappleTarget) {
        const gx = this.grappleTarget.x - this.w / 2;
        const gy = this.grappleTarget.y - this.h / 2;
        const dist = MathUtils.dist(this.x, this.y, gx, gy);
        const spd = P.GRAPPLE_SPEED * (this.hasSkill('wind_4') ? 1.3 : 1.0);
        if (dist < 28 || input.justPressed('jump')) {
          this.grappleTarget = null;
          this.vy = -440;
          this.jumpsRemaining = this.maxJumps;
          if (this.hasSkill('wind_4')) this.invulnTimer = Math.max(this.invulnTimer, 0.35);
        } else {
          const ang = MathUtils.angle(this.x, this.y, gx, gy);
          this.vx = Math.cos(ang) * spd;
          this.vy = Math.sin(ang) * spd;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.updateScarf(dt);
          return;
        }
      }

      // Trigger Grapple
      if (input.justPressed('grapple') && this.grappleCooldown <= 0) {
        const nearest = this.findNearestGrapple(level);
        if (nearest) {
          this.grappleTarget = nearest;
          this.grappleCooldown = 0.35;
          this.dashTimer = 0;
          Veyra.audio.playSFX('grapple');
          this.game.particles.spawnBurst(nearest.x, nearest.y, {
            count: 14,
            color: '#38bdf8',
            speedMin: 50,
            speedMax: 180
          });
          return;
        }
      }

      // Trigger Shadow Dash
      const dashCD = P.DASH_COOLDOWN * (this.hasRelic('swiftstride_anklet') ? 0.8 : 1.0);
      if (input.justPressed('dash') && this.dashCooldown <= 0 && this.dashTimer <= 0) {
        const dur = P.DASH_DURATION * (this.hasSkill('wind_2') ? 1.2 : 1.0);
        this.dashTimer = dur;
        this.dashCooldown = dashCD;
        this.dashDir = input.moveX !== 0 ? Math.sign(input.moveX) : this.facing;
        this.facing = this.dashDir;
        this.invulnTimer = Math.max(this.invulnTimer, dur + 0.05);
        this.vy = 0;
        Veyra.audio.playSFX('dash');
        this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
          count: 16,
          color: '#38bdf8',
          altColor: '#a855f7',
          speedMin: 80,
          speedMax: 240
        });
      }

      // Active Shadow Dash movement
      if (this.dashTimer > 0) {
        this.dashTimer -= dt;
        this.vx = this.dashDir * P.DASH_SPEED;
        this.vy = 0;
        this.game.particles.spawnAfterimage({
          x: this.x,
          y: this.y,
          w: this.w,
          h: this.h,
          facing: this.facing,
          color: this.hasSkill('wind_2') ? '#a855f7' : '#38bdf8'
        });

        // Phase Cloak skill damages enemies dashed through
        if (this.hasSkill('wind_2')) {
          this.checkDashDamage();
        }

        this.moveAndCollide(dt, level);
        this.updateScarf(dt);
        return;
      }

      // Horizontal Movement
      const moveSpeedMult = (this.hasRelic('swiftstride_anklet') ? 1.15 : 1.0) * (this.hasRelic('eclipse_crown_shard') ? 1.12 : 1.0);
      const maxSpeed = P.MOVE_SPEED * moveSpeedMult;
      const isIce = this.onGround && this.standingTile === T.ICE_FLOOR && !this.hasRelic('frostguard_ward');

      if (input.moveX !== 0) {
        this.facing = Math.sign(input.moveX);
        const accel = this.onGround ? (isIce ? 650 : P.GROUND_ACCEL) : P.AIR_ACCEL;
        this.vx = MathUtils.approach(this.vx, input.moveX * maxSpeed, accel * dt);
      } else {
        const decel = this.onGround ? (isIce ? 260 : P.GROUND_DECEL) : P.AIR_DECEL;
        this.vx = MathUtils.approach(this.vx, 0, decel * dt);
      }

      // Conveyor belt push
      if (this.onGround) {
        if (this.standingTile === T.CONVEYOR_LEFT) this.vx -= 130 * dt * 10;
        if (this.standingTile === T.CONVEYOR_RIGHT) this.vx += 130 * dt * 10;
      }

      // Jump Input Buffer
      if (input.justPressed('jump')) {
        if (input.moveY > 0.5 && this.onGround && this.standingTile === T.PLATFORM_ONEWAY) {
          this.dropThroughTimer = 0.22;
          this.onGround = false;
          this.y += 4;
        } else {
          this.jumpBufferTimer = P.JUMP_BUFFER_TIME;
        }
      }

      // Execute Ground / Coyote Jump, Wall Jump, or Air Double Jump
      if (this.jumpBufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          this.vy = P.JUMP_VELOCITY;
          this.onGround = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          Veyra.audio.playSFX('jump');
          this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h, {
            count: 8,
            color: '#cbd5e1',
            speedMin: 30,
            speedMax: 110,
            gravity: 200
          });
        } else if (this.onWall !== 0 && !this.onGround) {
          // Wall Jump!
          this.vx = -this.onWall * P.WALL_JUMP_X;
          this.vy = P.WALL_JUMP_Y;
          this.facing = -this.onWall;
          this.jumpBufferTimer = 0;
          this.jumpsRemaining = Math.max(1, this.jumpsRemaining);
          Veyra.audio.playSFX('wall_jump');
          this.game.particles.spawnBurst(
            this.onWall > 0 ? this.x + this.w : this.x,
            this.y + this.h / 2,
            { count: 10, color: '#e2e8f0', speedMin: 50, speedMax: 160 }
          );
        } else if (this.jumpsRemaining > 0) {
          // Double / Triple Jump!
          this.jumpsRemaining--;
          this.vy = P.DOUBLE_JUMP_VELOCITY;
          this.jumpBufferTimer = 0;
          Veyra.audio.playSFX('double_jump');
          this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h, {
            count: 14,
            color: '#38bdf8',
            altColor: '#fef08a',
            speedMin: 60,
            speedMax: 180,
            gravity: 100
          });
        }
      }

      // Variable Jump Height (release jump early to cut upward velocity)
      if (!input.isDown('jump') && this.vy < -180) {
        this.vy *= P.JUMP_CUT_MULTIPLIER;
      }

      // Gravity & Wall Slide
      this.vy = Math.min(P.MAX_FALL_SPEED, this.vy + P.GRAVITY * dt);
      if (this.onWall !== 0 && !this.onGround && this.vy > P.WALL_SLIDE_SPEED && input.moveX === this.onWall) {
        this.vy = P.WALL_SLIDE_SPEED;
        if (Math.random() < 0.35) {
          this.game.particles.spawnBurst(
            this.onWall > 0 ? this.x + this.w : this.x,
            this.y + this.h * 0.7,
            { count: 1, color: '#94a3b8', speedMin: 10, speedMax: 40, lifeMax: 0.25 }
          );
        }
      }

      // Parry Input
      if (input.justPressed('parry') && this.parryCooldown <= 0) {
        const win = P.PARRY_WINDOW * (this.hasRelic('aegis_crest') ? 1.35 : 1.0);
        this.parryTimer = win;
        this.parryCooldown = P.PARRY_COOLDOWN;
        Veyra.audio.playSFX('parry_stance');
      }

      // Melee Attack Input
      if (input.justPressed('attack') && this.attackCooldown <= 0) {
        this.performAttack(input);
      }

      // Spell Inputs (avoid casting Spell 2 on E if standing at an interactable)
      if (input.justPressed('spell1')) this.castSpell('eclipse_lance');
      if (input.justPressed('spell2') && !this.game.isNearInteractable()) this.castSpell('solaris_nova');
      if (input.justPressed('spell3')) this.castSpell('chrono_mend');

      // Quick Heal Potion (Crimson Elixir)
      if (input.justPressed('heal')) {
        this.useElixir();
      }

      // Apply Physics & Resolve Tile Collisions
      this.moveAndCollide(dt, level);
      this.updateScarf(dt);
    }

    findNearestGrapple(level) {
      if (!level.grapples || !level.grapples.length) return null;
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      let best = null;
      let bestDist = P.GRAPPLE_RANGE;
      for (const g of level.grapples) {
        const d = MathUtils.dist(cx, cy, g.x, g.y);
        if (d < bestDist && d > 32) {
          bestDist = d;
          best = g;
        }
      }
      return best;
    }

    performAttack(input) {
      const w = this.currentWeapon;
      this.comboStep = (this.comboStep % 3) + 1;
      this.comboResetTimer = 0.65;
      this.attackTimer = 0.16;
      this.attackCooldown = 0.23 / w.attackSpeed;

      const isUp = input.moveY < -0.5;
      const isDown = !this.onGround && input.moveY > 0.5;
      this.attackDir = isUp ? 'up' : isDown ? 'down' : 'forward';

      Veyra.audio.playSFX(`slash_${this.comboStep}`);

      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      this.game.particles.spawnSlashArc({
        x: cx + (isUp || isDown ? 0 : this.facing * 20),
        y: cy + (isUp ? -18 : isDown ? 18 : 0),
        dir: this.facing,
        comboStep: this.comboStep,
        isUp,
        isDown,
        radius: w.range,
        color: w.color,
        glow: w.glow
      });

      // Crescent Wave Skill: 3rd combo hit fires an energy wave
      if (this.comboStep === 3 && (this.hasSkill('vanguard_4') || w.id === 'solaris_edge')) {
        this.game.spawnProjectile({
          x: cx + this.facing * 26,
          y: cy - 6,
          vx: this.facing * 620,
          vy: 0,
          w: 28,
          h: 34,
          damage: Math.round(this.getWeaponDamage() * 0.85),
          color: w.color,
          fromPlayer: true,
          pierce: true,
          life: 0.75
        });
      }

      // Compute Attack Hitbox
      const range = w.range;
      let hitbox;
      if (isUp) {
        hitbox = { x: cx - range * 0.7, y: this.y - range, w: range * 1.4, h: range };
      } else if (isDown) {
        hitbox = { x: cx - range * 0.7, y: this.y + this.h - 8, w: range * 1.4, h: range };
      } else {
        hitbox = {
          x: this.facing > 0 ? cx - 6 : cx - range + 6,
          y: this.y - 10,
          w: range,
          h: this.h + 20
        };
      }

      // Check Pogo Bounce on Spikes when attacking downward
      let pogoTriggered = false;
      if (isDown) {
        const ts = CONFIG.TILE_SIZE;
        const cStart = Math.floor(hitbox.x / ts);
        const cEnd = Math.floor((hitbox.x + hitbox.w) / ts);
        const rStart = Math.floor(hitbox.y / ts);
        const rEnd = Math.floor((hitbox.y + hitbox.h) / ts);
        for (let r = rStart; r <= rEnd; r++) {
          for (let c = cStart; c <= cEnd; c++) {
            const tile = this.game.getTile(c, r);
            if (tile === T.SPIKES_UP) {
              pogoTriggered = true;
            }
          }
        }
      }

      // Check Enemy & Boss Hits
      let baseDmg = this.getWeaponDamage();
      if (this.comboStep === 3) baseDmg = Math.round(baseDmg * 1.3);
      if (isDown && this.hasRelic('pogo_plume')) baseDmg = Math.round(baseDmg * 1.4);

      const targets = [...this.game.enemies];
      if (this.game.activeBoss && !this.game.activeBoss.dead) {
        targets.push(this.game.activeBoss);
      }

      for (const enemy of targets) {
        if (enemy.dead) continue;
        if (MathUtils.aabbOverlap(hitbox, enemy)) {
          let critChance = w.critBonus + (this.hasSkill('vanguard_2') ? 0.12 : 0);
          const isCrit = this.guaranteedCrit || Math.random() < critChance;
          this.guaranteedCrit = false;

          let finalDmg = baseDmg;
          if (isCrit) {
            finalDmg = Math.round(finalDmg * (this.hasSkill('vanguard_2') ? 1.75 : 1.5));
          }
          if (this.hasSkill('vanguard_5') && enemy.hp / enemy.maxHp < 0.4) {
            finalDmg = Math.round(finalDmg * 1.3);
          }

          const hitSuccess = enemy.takeDamage(finalDmg, this.facing, isCrit, false);
          if (hitSuccess) {
            if (isDown) pogoTriggered = true;
            // Gain Soul Mana
            let manaGain = w.id === 'voidweaver_scythe' ? 10 : 7;
            if (this.hasSkill('weaver_2')) manaGain *= 1.35;
            if (this.hasRelic('soul_conduit')) manaGain *= 1.4;
            this.game.state.mana = Math.min(this.game.state.maxMana, this.game.state.mana + manaGain);

            // Crimson Fang boss combo heal
            if (this.comboStep === 3 && enemy.isBoss && this.hasRelic('crimson_fang')) {
              this.heal(4);
            }
          }
        }
      }

      // Reflect enemy projectiles with sword slash if Aegis Crest equipped
      for (const proj of this.game.projectiles) {
        if (!proj.fromPlayer && MathUtils.aabbOverlap(hitbox, proj)) {
          proj.fromPlayer = true;
          proj.vx = -proj.vx * 1.4;
          proj.vy = -proj.vy * 1.4;
          proj.color = '#38bdf8';
          Veyra.audio.playSFX('parry');
        }
      }

      if (pogoTriggered) {
        this.vy = P.POGO_BOUNCE_Y;
        this.pogoStreak++;
        if (this.pogoStreak >= 5) {
          this.game.unlockAchievement('pogo_knight');
        }
        if (this.hasRelic('pogo_plume')) {
          this.jumpsRemaining = this.maxJumps;
          this.dashCooldown = 0;
        }
        Veyra.audio.playSFX('parry');
        this.game.particles.spawnBurst(cx, this.y + this.h, {
          count: 10,
          color: '#fef08a',
          speedMin: 60,
          speedMax: 180
        });
      }
    }

    checkDashDamage() {
      const targets = [...this.game.enemies];
      if (this.game.activeBoss && !this.game.activeBoss.dead) targets.push(this.game.activeBoss);
      for (const enemy of targets) {
        if (!enemy.dead && !enemy.dashHitCooldown && MathUtils.aabbOverlap(this, enemy)) {
          enemy.dashHitCooldown = 0.25;
          enemy.takeDamage(Math.round(this.getWeaponDamage() * 0.55), this.facing, false, true);
        }
      }
    }

    castSpell(spellId) {
      const spell = CONFIG.SPELLS.find((s) => s.id === spellId);
      if (!spell || this.spellCooldowns[spellId] > 0) return;

      const costMult = this.hasRelic('soul_conduit') ? 0.8 : 1.0;
      const manaCost = Math.round(spell.manaCost * costMult);
      if (this.game.state.mana < manaCost) {
        this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 10, 'LOW MANA', {
          color: '#94a3b8',
          size: 14
        });
        return;
      }

      this.game.state.mana -= manaCost;
      this.spellCooldowns[spellId] = spell.cooldown;
      if (this.hasSkill('weaver_5')) {
        this.arcaneBladeTimer = 5.0;
      }

      const spellMult = this.hasSkill('weaver_3') ? 1.28 : 1.0;
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;

      if (spellId === 'eclipse_lance') {
        Veyra.audio.playSFX('spell_lance');
        this.game.spawnProjectile({
          x: cx + this.facing * 20,
          y: cy - 10,
          vx: this.facing * 820,
          vy: 0,
          w: 48,
          h: 18,
          damage: Math.round(this.getWeaponDamage() * spell.damageMult * spellMult),
          color: '#38bdf8',
          fromPlayer: true,
          pierce: true,
          life: 1.1
        });
        this.game.addScreenShake(4, 0.12);
      } else if (spellId === 'solaris_nova') {
        Veyra.audio.playSFX('spell_nova');
        this.game.addScreenShake(8, 0.22);
        const radius = 155;
        this.game.particles.spawnBurst(cx, cy, {
          count: 36,
          color: '#f59e0b',
          altColor: '#fef08a',
          speedMin: 120,
          speedMax: 380,
          sizeMin: 4,
          sizeMax: 9,
          gravity: 50
        });
        // Clear enemy projectiles & damage nearby foes
        this.game.projectiles = this.game.projectiles.filter((p) => {
          if (!p.fromPlayer && MathUtils.dist(cx, cy, p.x, p.y) < radius) return false;
          return true;
        });
        const targets = [...this.game.enemies];
        if (this.game.activeBoss && !this.game.activeBoss.dead) targets.push(this.game.activeBoss);
        const dmg = Math.round(this.getWeaponDamage() * spell.damageMult * spellMult);
        for (const e of targets) {
          if (!e.dead && MathUtils.dist(cx, cy, e.x + e.w / 2, e.y + e.h / 2) < radius) {
            e.takeDamage(dmg, Math.sign(e.x - this.x) || 1, true, true);
            e.stunTimer = Math.max(e.stunTimer || 0, 0.65);
          }
        }
      } else if (spellId === 'chrono_mend') {
        let healAmt = spell.healAmount + (this.hasSkill('weaver_4') ? 20 : 0);
        this.heal(healAmt);
        if (this.hasSkill('weaver_4')) {
          this.shieldTimer = 4.0;
        }
        // Slow nearby enemies
        for (const e of this.game.enemies) {
          if (!e.dead && MathUtils.dist(cx, cy, e.x, e.y) < 220) {
            e.slowTimer = 3.5;
          }
        }
      }
    }

    useElixir() {
      const s = this.game.state;
      if (s.elixirs <= 0) {
        this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 10, 'NO ELIXIRS', {
          color: '#f87171',
          size: 14
        });
        return;
      }
      if (s.hp >= s.maxHp) return;
      s.elixirs--;
      const healAmt = Math.round(55 * (this.hasSkill('wind_3') ? 1.25 : 1.0));
      this.heal(healAmt);
    }

    heal(amount) {
      const s = this.game.state;
      const actual = Math.min(s.maxHp - s.hp, amount);
      s.hp = Math.min(s.maxHp, s.hp + amount);
      Veyra.audio.playSFX('heal');
      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: 16,
        color: '#34d399',
        altColor: '#a7f3d0',
        speedMin: 40,
        speedMax: 160,
        gravity: -120
      });
      if (actual > 0) {
        this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 12, `+${actual} HP`, {
          color: '#34d399',
          size: 18
        });
      }
    }

    takeDamage(rawAmount, sourceX = null) {
      if (this.game.settings.assistInvincible) return false;
      if (this.invulnTimer > 0 || this.dashTimer > 0) return false;

      // Check Active Parry!
      if (this.parryTimer > 0) {
        this.parryTimer = 0;
        this.parryCooldown = 0.15;
        this.invulnTimer = 0.65;
        this.game.hitStopTimer = 0.11;
        this.game.state.parryCount = (this.game.state.parryCount || 0) + 1;
        if (this.game.state.parryCount >= 10) {
          this.game.unlockAchievement('parry_master');
        }
        if (this.hasSkill('vanguard_3')) {
          this.game.state.mana = Math.min(this.game.state.maxMana, this.game.state.mana + 20);
          this.guaranteedCrit = true;
        }
        Veyra.audio.playSFX('parry');
        this.game.addScreenShake(7, 0.18);
        this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 18, 'PARRY!', {
          color: '#fef08a',
          size: 22,
          isCrit: true
        });
        this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
          count: 24,
          color: '#fef08a',
          altColor: '#38bdf8',
          speedMin: 100,
          speedMax: 320
        });

        // Aegis Crest shockwave damages nearby foes on parry
        const shockRadius = this.hasRelic('aegis_crest') ? 160 : 95;
        const shockDmg = Math.round(this.getWeaponDamage() * (this.hasRelic('aegis_crest') ? 1.8 : 1.0));
        const targets = [...this.game.enemies];
        if (this.game.activeBoss && !this.game.activeBoss.dead) targets.push(this.game.activeBoss);
        for (const e of targets) {
          if (!e.dead && MathUtils.dist(this.x, this.y, e.x, e.y) < shockRadius) {
            e.takeDamage(shockDmg, this.facing, true, true);
            e.stunTimer = 0.9;
          }
        }
        return false;
      }

      // Apply damage modifiers
      let dmg = rawAmount;
      if (this.game.state.difficulty === 'story') dmg *= 0.6;
      if (this.game.state.difficulty === 'heroic') dmg *= 1.35;
      if (this.hasRelic('guardian_carapace')) dmg *= 0.8;
      if (this.hasRelic('glass_sigil')) dmg *= 1.15;
      if (this.shieldTimer > 0) dmg *= 0.5;
      dmg = Math.max(1, Math.round(dmg));

      this.game.state.hp -= dmg;
      this.game.bossFightDamaged = true;
      this.game.resetCombo();

      const invulnMult = this.hasRelic('guardian_carapace') ? 1.35 : 1.0;
      this.invulnTimer = P.INVULN_DURATION * invulnMult;
      this.hurtFlashTimer = 0.25;
      this.vy = -280;
      if (sourceX !== null) {
        this.vx = (this.x < sourceX ? -1 : 1) * 260;
      }

      Veyra.audio.playSFX('player_hurt');
      this.game.addScreenShake(8, 0.24);
      this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 10, `-${dmg}`, {
        color: '#ef4444',
        size: 20
      });
      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: 16,
        color: '#ef4444',
        speedMin: 70,
        speedMax: 240
      });

      // Check Phoenix Ember Revival Relic
      if (this.game.state.hp <= 0) {
        if (this.hasRelic('phoenix_ember') && !this.phoenixUsedSinceRest) {
          this.phoenixUsedSinceRest = true;
          this.game.state.hp = Math.round(this.game.state.maxHp * 0.5);
          this.invulnTimer = 2.0;
          Veyra.audio.playSFX('spell_nova');
          this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 30, 'PHOENIX REBIRTH!', {
            color: '#f59e0b',
            size: 22,
            isCrit: true
          });
          this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
            count: 40,
            color: '#f59e0b',
            altColor: '#fef08a',
            speedMin: 120,
            speedMax: 380
          });
          return true;
        }
        this.game.onPlayerDeath();
      }
      return true;
    }

    moveAndCollide(dt, level) {
      const ts = CONFIG.TILE_SIZE;
      const isShadow = this.dashTimer > 0;

      // 1. Horizontal Step
      this.x += this.vx * dt;
      this.onWall = 0;

      // Lock inside Boss Arena when boss is active
      if (this.game.activeBoss && !this.game.activeBoss.dead && level.arenaBounds) {
        if (this.x < level.arenaBounds.left) {
          this.x = level.arenaBounds.left;
          this.vx = 0;
        }
        if (this.x + this.w > level.arenaBounds.right) {
          this.x = level.arenaBounds.right - this.w;
          this.vx = 0;
        }
      }

      let leftCol = Math.floor(this.x / ts);
      let rightCol = Math.floor((this.x + this.w - 0.01) / ts);
      let topRow = Math.floor((this.y + 4) / ts);
      let bottomRow = Math.floor((this.y + this.h - 4) / ts);

      for (let r = topRow; r <= bottomRow; r++) {
        for (let c = leftCol; c <= rightCol; c++) {
          const tile = this.game.getTile(c, r);
          if (isSolidTile(tile, isShadow)) {
            if (this.vx > 0) {
              this.x = c * ts - this.w;
              this.vx = 0;
              this.onWall = 1;
            } else if (this.vx < 0) {
              this.x = (c + 1) * ts;
              this.vx = 0;
              this.onWall = -1;
            }
          }
        }
      }

      // 2. Vertical Step
      const prevBottom = this.y + this.h;
      this.y += this.vy * dt;
      const wasGrounded = this.onGround;
      this.onGround = false;
      this.standingTile = T.EMPTY;

      leftCol = Math.floor((this.x + 3) / ts);
      rightCol = Math.floor((this.x + this.w - 3) / ts);
      topRow = Math.floor(this.y / ts);
      bottomRow = Math.floor((this.y + this.h) / ts);

      for (let r = topRow; r <= bottomRow; r++) {
        for (let c = leftCol; c <= rightCol; c++) {
          const tile = this.game.getTile(c, r);

          // Bounce Pad Tile!
          if (tile === T.BOUNCE_PAD && this.vy >= 0) {
            this.y = r * ts - this.h;
            this.vy = -820;
            this.jumpsRemaining = this.maxJumps;
            Veyra.audio.playSFX('double_jump');
            this.game.particles.spawnBurst(c * ts + 20, r * ts, {
              count: 14,
              color: '#34d399',
              speedMin: 70,
              speedMax: 220
            });
            return;
          }

          // Hazard Tiles (Spikes & Lava/Acid)
          if (tile === T.SPIKES_UP || tile === T.SPIKES_DOWN || tile === T.LAVA_ACID) {
            this.takeDamage(20, c * ts + 20);
            this.vy = -520;
            this.jumpsRemaining = this.maxJumps;
            return;
          }

          // One-Way Platform Tile
          if (
            tile === T.PLATFORM_ONEWAY &&
            this.vy >= 0 &&
            this.dropThroughTimer <= 0 &&
            prevBottom <= r * ts + 10
          ) {
            this.y = r * ts - this.h;
            this.vy = 0;
            this.onGround = true;
            this.standingTile = tile;
          } else if (isSolidTile(tile, isShadow)) {
            if (this.vy >= 0) {
              this.y = r * ts - this.h;
              this.vy = 0;
              this.onGround = true;
              this.standingTile = tile;
              if (tile === T.CRUMBLE_BLOCK) {
                this.game.triggerCrumbleTile(c, r);
              }
            } else if (this.vy < 0) {
              this.y = (r + 1) * ts;
              this.vy = 0;
            }
          }
        }
      }

      // Moving Platform collision
      if (level.movingPlatforms && this.vy >= 0 && this.dropThroughTimer <= 0) {
        for (const mp of level.movingPlatforms) {
          if (
            this.x + this.w > mp.x &&
            this.x < mp.x + mp.w &&
            prevBottom <= mp.y + 12 &&
            this.y + this.h >= mp.y
          ) {
            this.y = mp.y - this.h;
            this.x += mp.dx || 0;
            this.vy = 0;
            this.onGround = true;
          }
        }
      }

      if (this.onGround) {
        this.coyoteTimer = P.COYOTE_TIME;
        this.jumpsRemaining = this.maxJumps;
        this.pogoStreak = 0;
      } else if (wasGrounded && this.vy >= 0) {
        this.coyoteTimer = P.COYOTE_TIME;
      }
    }

    updateScarf(dt) {
      const headX = this.x + (this.facing > 0 ? 8 : 20);
      const headY = this.y + 14;
      this.scarfPoints[0].x = headX;
      this.scarfPoints[0].y = headY;
      for (let i = 1; i < this.scarfPoints.length; i++) {
        const prev = this.scarfPoints[i - 1];
        const curr = this.scarfPoints[i];
        const targetX = prev.x - this.facing * 7;
        const targetY = prev.y + Math.sin(this.animTimer * 8 + i) * 2.5 + 1.5;
        curr.x = MathUtils.lerp(curr.x, targetX, Math.min(1, dt * 18));
        curr.y = MathUtils.lerp(curr.y, targetY, Math.min(1, dt * 18));
      }
    }
  }

  // ===========================================================================
  // ENEMY CLASSES (9 Distinct Enemy Archetypes)
  // ===========================================================================
  const ENEMY_SPECS = {
    crawler: { name: 'Hollow Crawler', hp: 42, dmg: 14, speed: 105, w: 34, h: 28, xp: 18, shards: 9, color: '#38bdf8' },
    stalker: { name: 'Dusk Stalker', hp: 85, dmg: 20, speed: 120, w: 32, h: 48, xp: 34, shards: 16, color: '#94a3b8', shielded: true },
    spitter: { name: 'Blight Spore-Bulb', hp: 58, dmg: 16, speed: 40, w: 36, h: 40, xp: 26, shards: 13, color: '#34d399', ranged: true },
    drone: { name: 'Clockwork Drone', hp: 62, dmg: 18, speed: 145, w: 34, h: 34, xp: 30, shards: 15, color: '#fb923c', flying: true, ranged: true },
    welder: { name: 'Ironhearth Welder', hp: 115, dmg: 24, speed: 95, w: 40, h: 50, xp: 45, shards: 22, color: '#f97316' },
    wraith: { name: 'Frost Wraith', hp: 82, dmg: 22, speed: 130, w: 32, h: 46, xp: 42, shards: 20, color: '#67e8f9', flying: true, ranged: true },
    golem: { name: 'Crystal Golem', hp: 165, dmg: 28, speed: 75, w: 48, h: 58, xp: 60, shards: 30, color: '#60a5fa' },
    weaver: { name: 'Void Weaver', hp: 105, dmg: 25, speed: 115, w: 34, h: 48, xp: 52, shards: 25, color: '#c084fc', ranged: true },
    assassin: { name: 'Crimson Assassin', hp: 98, dmg: 26, speed: 210, w: 30, h: 46, xp: 55, shards: 28, color: '#f43f5e' }
  };

  class Enemy {
    constructor(data, game) {
      this.game = game;
      this.type = data.type || 'crawler';
      const spec = ENEMY_SPECS[this.type] || ENEMY_SPECS.crawler;
      this.name = spec.name;
      this.maxHp = spec.hp;
      this.hp = spec.hp;
      this.damage = spec.dmg;
      this.speed = spec.speed;
      this.w = spec.w;
      this.h = spec.h;
      this.xp = spec.xp;
      this.shards = spec.shards;
      this.color = spec.color;
      this.shielded = Boolean(spec.shielded);
      this.ranged = Boolean(spec.ranged);
      this.flying = Boolean(spec.flying);

      this.spawnX = data.x;
      this.spawnY = data.y;
      this.x = data.x;
      this.y = data.y;
      this.vx = 0;
      this.vy = 0;
      this.patrolDist = data.patrolDist || 140;
      this.facing = 1;
      this.dead = false;

      this.attackCooldown = 1.0 + Math.random();
      this.hurtTimer = 0;
      this.stunTimer = 0;
      this.slowTimer = 0;
      this.dashHitCooldown = 0;
      this.animTimer = Math.random() * 10;
    }

    update(dt, player) {
      if (this.dead) return;
      this.animTimer += dt;
      if (this.hurtTimer > 0) this.hurtTimer -= dt;
      if (this.dashHitCooldown > 0) this.dashHitCooldown -= dt;
      if (this.stunTimer > 0) {
        this.stunTimer -= dt;
        return;
      }

      const speedMult = this.slowTimer > 0 ? 0.45 : 1.0;
      if (this.slowTimer > 0) this.slowTimer -= dt;

      const distToPlayer = MathUtils.dist(this.x + this.w / 2, this.y + this.h / 2, player.x + player.w / 2, player.y + player.h / 2);
      const aggro = distToPlayer < 360;

      if (aggro) {
        this.facing = player.x < this.x ? -1 : 1;

        if (this.ranged && distToPlayer > 140) {
          this.attackCooldown -= dt * speedMult;
          if (this.attackCooldown <= 0) {
            this.attackCooldown = 1.9;
            const ang = MathUtils.angle(this.x + this.w / 2, this.y + this.h / 2, player.x + player.w / 2, player.y + player.h / 2);
            this.game.spawnProjectile({
              x: this.x + this.w / 2,
              y: this.y + this.h / 2,
              vx: Math.cos(ang) * 320,
              vy: Math.sin(ang) * 320,
              w: 14,
              h: 14,
              damage: this.damage,
              color: this.color,
              fromPlayer: false,
              life: 2.5
            });
          }
        }

        // Move toward player or hover
        if (!this.ranged || distToPlayer > 220) {
          this.vx = this.facing * this.speed * speedMult;
        } else {
          this.vx = 0;
        }
      } else {
        // Patrol around spawnX
        if (this.x > this.spawnX + this.patrolDist) this.facing = -1;
        if (this.x < this.spawnX - this.patrolDist) this.facing = 1;
        this.vx = this.facing * this.speed * 0.65 * speedMult;
      }

      if (this.flying) {
        this.x += this.vx * dt;
        this.y = this.spawnY + Math.sin(this.animTimer * 3) * 18;
      } else {
        this.vy = Math.min(P.MAX_FALL_SPEED, this.vy + P.GRAVITY * dt);
        this.x += this.vx * dt;
        // Simple ground & wall check for patrolling enemies
        const ts = CONFIG.TILE_SIZE;
        const nextCol = Math.floor((this.x + (this.facing > 0 ? this.w + 4 : -4)) / ts);
        const midRow = Math.floor((this.y + this.h / 2) / ts);
        const floorRow = Math.floor((this.y + this.h + 4) / ts);
        if (isSolidTile(this.game.getTile(nextCol, midRow)) || !isSolidTile(this.game.getTile(nextCol, floorRow))) {
          this.facing = -this.facing;
          this.vx = 0;
        }

        this.y += this.vy * dt;
        const bRow = Math.floor((this.y + this.h) / ts);
        const cMid = Math.floor((this.x + this.w / 2) / ts);
        if (isSolidTile(this.game.getTile(cMid, bRow)) || this.game.getTile(cMid, bRow) === T.PLATFORM_ONEWAY) {
          this.y = bRow * ts - this.h;
          this.vy = 0;
        }
      }

      // Contact Damage to Player
      if (MathUtils.aabbOverlap(this, player)) {
        player.takeDamage(this.damage, this.x + this.w / 2);
      }
    }

    takeDamage(amount, hitDir, isCrit = false, ignoreShield = false) {
      if (this.dead) return false;

      // Shielded Dusk Stalker blocks frontal melee unless parried/spell/backstab/pogo
      if (this.shielded && !ignoreShield && hitDir === -this.facing && this.stunTimer <= 0 && this.game.player.attackDir === 'forward') {
        Veyra.audio.playSFX('parry');
        this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 10, 'BLOCKED!', {
          color: '#94a3b8',
          size: 15
        });
        return false;
      }

      this.hp -= amount;
      this.hurtTimer = 0.16;
      this.x += hitDir * 8;
      this.game.registerComboHit();

      Veyra.audio.playSFX(isCrit ? 'crit_hit' : 'hit_enemy');
      this.game.particles.spawnFloatingText(
        this.x + this.w / 2,
        this.y - 8,
        isCrit ? `${amount}!` : amount,
        { color: isCrit ? '#facc15' : '#ffffff', size: isCrit ? 21 : 17, isCrit }
      );
      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: isCrit ? 16 : 9,
        color: this.color,
        altColor: isCrit ? '#fef08a' : '#ffffff',
        speedMin: 60,
        speedMax: 220
      });

      if (this.hp <= 0) {
        this.die();
      }
      return true;
    }

    die() {
      this.dead = true;
      Veyra.audio.playSFX('enemy_death');
      this.game.unlockAchievement('first_blood');

      // Record in Bestiary
      const b = this.game.state.bestiary;
      b[this.type] = (b[this.type] || 0) + 1;

      // Crimson Fang Relic Heal on Kill
      if (this.game.player.hasRelic('crimson_fang')) {
        this.game.player.heal(4);
      }

      // Grant XP & Spawn Aether Shard pickups
      this.game.gainXP(this.xp);
      const shardMult = this.game.player.hasRelic('astral_magnet') ? 1.25 : 1.0;
      const totalShards = Math.round(this.shards * shardMult);
      this.game.spawnShardDrops(this.x + this.w / 2, this.y + this.h / 2, totalShards);

      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: 24,
        color: this.color,
        altColor: '#fef08a',
        speedMin: 80,
        speedMax: 290
      });
    }
  }

  Veyra.isSolidTile = isSolidTile;
  Veyra.Player = Player;
  Veyra.Enemy = Enemy;
  Veyra.ENEMY_SPECS = ENEMY_SPECS;
})();

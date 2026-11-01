/**
 * Chronicles of Veyra: The Shattered Eclipse
 * 5 Multi-Phase Boss Encounters with Custom Attack State Machines & Arena Mechanics
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { MathUtils } = Veyra;

  const BOSS_SPECS = {
    moss_warden: {
      id: 'moss_warden',
      name: 'SYLVANUS, THE MOSSBOUND WARDEN',
      subtitle: 'Guardian of the First Eclipse Shard',
      maxHp: 460,
      w: 64,
      h: 76,
      color: '#10b981',
      accent: '#fef08a',
      xp: 180,
      shards: 150,
      achievement: 'boss_1'
    },
    clockwork_valkyrie: {
      id: 'clockwork_valkyrie',
      name: 'SERAPH-IX, THE CLOCKWORK VALKYRIE',
      subtitle: 'Guardian of the Second Eclipse Shard',
      maxHp: 620,
      w: 52,
      h: 68,
      color: '#fb923c',
      accent: '#38bdf8',
      xp: 260,
      shards: 220,
      achievement: 'boss_2'
    },
    glacial_wyrm: {
      id: 'glacial_wyrm',
      name: 'VAELEN, THE GLACIAL WYRM',
      subtitle: 'Guardian of the Third Eclipse Shard',
      maxHp: 780,
      w: 74,
      h: 82,
      color: '#38bdf8',
      accent: '#e0f2fe',
      xp: 340,
      shards: 300,
      achievement: 'boss_3'
    },
    inquisitor_thorne: {
      id: 'inquisitor_thorne',
      name: 'INQUISITOR THORNE, THE MIRROR BLADE',
      subtitle: 'Guardian of the Fourth Eclipse Shard',
      maxHp: 920,
      w: 38,
      h: 56,
      color: '#c084fc',
      accent: '#f43f5e',
      xp: 450,
      shards: 400,
      achievement: 'boss_4'
    },
    archon_malakor: {
      id: 'archon_malakor',
      name: 'ARCHON MALAKOR, SOVEREIGN OF THE ECLIPSE',
      subtitle: 'Bearer of the Fifth Shard & Vessel of Nyxara',
      maxHp: 1350,
      w: 54,
      h: 72,
      color: '#f43f5e',
      accent: '#facc15',
      xp: 800,
      shards: 600,
      achievement: 'boss_5'
    }
  };

  class Boss {
    constructor(bossId, x, y, arenaBounds, game) {
      this.game = game;
      this.id = bossId;
      const spec = BOSS_SPECS[bossId] || BOSS_SPECS.moss_warden;
      this.name = spec.name;
      this.subtitle = spec.subtitle;
      this.maxHp = spec.maxHp;
      this.hp = spec.maxHp;
      this.w = spec.w;
      this.h = spec.h;
      this.color = spec.color;
      this.accent = spec.accent;
      this.xp = spec.xp;
      this.shards = spec.shards;
      this.achievement = spec.achievement;
      this.isBoss = true;

      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.facing = -1;
      this.arena = arenaBounds || { left: x - 500, right: x + 300, floorY: y + this.h };

      this.phase = 1;
      this.maxPhases = bossId === 'archon_malakor' ? 3 : 2;
      this.state = 'idle';
      this.stateTimer = 1.4;
      this.attackIndex = 0;
      this.counterStance = false;

      this.hurtTimer = 0;
      this.stunTimer = 0;
      this.dashHitCooldown = 0;
      this.animTimer = 0;
      this.dead = false;
      this.hazards = []; // Telegraph zones / ground spikes / lasers
    }

    update(dt, player) {
      if (this.dead) return;
      this.animTimer += dt;
      if (this.hurtTimer > 0) this.hurtTimer -= dt;
      if (this.dashHitCooldown > 0) this.dashHitCooldown -= dt;

      // Update boss arena hazards (root pillars, lasers, meteors)
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const hz = this.hazards[i];
        hz.timer -= dt;
        if (hz.timer <= 0 && !hz.active) {
          hz.active = true;
          hz.timer = hz.activeDuration || 0.35;
          Veyra.audio.playSFX('spell_nova');
          this.game.addScreenShake(5, 0.14);
          this.game.particles.spawnBurst(hz.x + hz.w / 2, hz.y + hz.h / 2, {
            count: 14,
            color: hz.color,
            speedMin: 80,
            speedMax: 240
          });
        } else if (hz.timer <= 0 && hz.active) {
          this.hazards.splice(i, 1);
          continue;
        }

        if (hz.active && MathUtils.aabbOverlap(hz, player)) {
          player.takeDamage(hz.damage || 22, hz.x + hz.w / 2);
        }
      }

      if (this.stunTimer > 0) {
        this.stunTimer -= dt;
        this.counterStance = false;
        return;
      }

      // Check Phase Transitions
      const hpRatio = this.hp / this.maxHp;
      if (this.phase === 1 && hpRatio <= 0.55) {
        this.enterPhase(2);
      } else if (this.maxPhases === 3 && this.phase === 2 && hpRatio <= 0.25) {
        this.enterPhase(3);
      }

      // Run Boss-Specific Behavior
      const speedMult = this.phase === 3 ? 1.45 : this.phase === 2 ? 1.22 : 1.0;
      this.stateTimer -= dt * speedMult;

      switch (this.id) {
        case 'moss_warden':
          this.updateMossWarden(dt, player, speedMult);
          break;
        case 'clockwork_valkyrie':
          this.updateValkyrie(dt, player, speedMult);
          break;
        case 'glacial_wyrm':
          this.updateGlacialWyrm(dt, player, speedMult);
          break;
        case 'inquisitor_thorne':
          this.updateThorne(dt, player, speedMult);
          break;
        case 'archon_malakor':
          this.updateMalakor(dt, player, speedMult);
          break;
      }

      // Keep within Arena Bounds
      this.x = MathUtils.clamp(this.x, this.arena.left + 16, this.arena.right - this.w - 16);
      if (this.y + this.h > this.arena.floorY) {
        this.y = this.arena.floorY - this.h;
        this.vy = 0;
      }

      // Contact damage to player
      if (MathUtils.aabbOverlap(this, player)) {
        player.takeDamage(this.phase >= 2 ? 24 : 18, this.x + this.w / 2);
      }
    }

    enterPhase(newPhase) {
      this.phase = newPhase;
      this.state = 'roar';
      this.stateTimer = 1.1;
      this.vx = 0;
      Veyra.audio.playSFX('boss_roar');
      this.game.addScreenShake(12, 0.45);
      this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 24, `PHASE ${newPhase}!`, {
        color: '#facc15',
        size: 24,
        isCrit: true
      });
      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: 42,
        color: this.color,
        altColor: this.accent,
        speedMin: 120,
        speedMax: 380
      });
    }

    // 1. SYLVANUS, THE MOSSBOUND WARDEN
    updateMossWarden(dt, player, speedMult) {
      this.vy += 1200 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.stateTimer <= 0) {
        this.facing = player.x < this.x ? -1 : 1;
        this.attackIndex = (this.attackIndex + 1) % 3;

        if (this.attackIndex === 0) {
          // Leaping Crush + Ground Shockwaves
          this.state = 'leap';
          this.stateTimer = 1.4;
          this.vx = this.facing * 310;
          this.vy = -640;
          Veyra.audio.playSFX('jump');
        } else if (this.attackIndex === 1) {
          // Root Eruption Pillars across floor
          this.state = 'roots';
          this.stateTimer = 1.6;
          this.vx = 0;
          const count = this.phase >= 2 ? 5 : 3;
          for (let i = 0; i < count; i++) {
            const rx = this.arena.left + 80 + i * ((this.arena.right - this.arena.left - 160) / Math.max(1, count - 1));
            this.hazards.push({
              x: rx - 22,
              y: this.arena.floorY - 130,
              w: 44,
              h: 130,
              timer: 0.65,
              activeDuration: 0.45,
              active: false,
              damage: 22,
              color: '#10b981'
            });
          }
        } else {
          // Spore Barrage
          this.state = 'spores';
          this.stateTimer = 1.3;
          this.vx = 0;
          const shots = this.phase >= 2 ? 5 : 3;
          for (let i = 0; i < shots; i++) {
            const ang = -Math.PI * 0.8 + (i / (shots - 1)) * (Math.PI * 0.6);
            this.game.spawnProjectile({
              x: this.x + this.w / 2,
              y: this.y + 20,
              vx: Math.cos(ang) * 320,
              vy: Math.sin(ang) * 320,
              w: 18,
              h: 18,
              damage: 18,
              color: '#34d399',
              fromPlayer: false,
              life: 3.0
            });
          }
        }
      }
    }

    // 2. SERAPH-IX, THE CLOCKWORK VALKYRIE
    updateValkyrie(dt, player, speedMult) {
      const targetY = this.arena.floorY - this.h - 110 + Math.sin(this.animTimer * 3.5) * 35;
      this.y = MathUtils.lerp(this.y, targetY, dt * 4);
      this.x += this.vx * dt;

      if (this.stateTimer <= 0) {
        this.facing = player.x < this.x ? -1 : 1;
        this.attackIndex = (this.attackIndex + 1) % 3;

        if (this.attackIndex === 0) {
          // High-Speed Blade Dash across arena
          this.state = 'dash';
          this.stateTimer = 1.25;
          this.y = this.arena.floorY - this.h - 12;
          this.vx = this.facing * 520 * speedMult;
          Veyra.audio.playSFX('dash');
        } else if (this.attackIndex === 1) {
          // Homing Plasma Fan
          this.state = 'plasma';
          this.stateTimer = 1.4;
          this.vx = 0;
          const baseAng = MathUtils.angle(this.x + this.w / 2, this.y + this.h / 2, player.x + player.w / 2, player.y + player.h / 2);
          for (let i = -2; i <= 2; i++) {
            const a = baseAng + i * 0.22;
            this.game.spawnProjectile({
              x: this.x + this.w / 2,
              y: this.y + this.h / 2,
              vx: Math.cos(a) * 390,
              vy: Math.sin(a) * 390,
              w: 16,
              h: 16,
              damage: 20,
              color: '#fb923c',
              fromPlayer: false,
              life: 2.5
            });
          }
        } else {
          // Vertical Orbital Laser Beams
          this.state = 'lasers';
          this.stateTimer = 1.5;
          this.vx = 0;
          for (let i = 0; i < 4; i++) {
            const lx = player.x + (i - 1.5) * 140;
            this.hazards.push({
              x: MathUtils.clamp(lx, this.arena.left + 30, this.arena.right - 60),
              y: this.arena.floorY - 380,
              w: 36,
              h: 380,
              timer: 0.6,
              activeDuration: 0.4,
              active: false,
              damage: 24,
              color: '#38bdf8'
            });
          }
        }
      }
    }

    // 3. VAELEN, THE GLACIAL WYRM
    updateGlacialWyrm(dt, player, speedMult) {
      this.x += this.vx * dt;
      this.y = MathUtils.lerp(this.y, this.arena.floorY - this.h - Math.abs(Math.sin(this.animTimer * 2)) * 45, dt * 4);

      if (this.stateTimer <= 0) {
        this.facing = player.x < this.x ? -1 : 1;
        this.attackIndex = (this.attackIndex + 1) % 3;

        if (this.attackIndex === 0) {
          // Icicle Ceiling Rain
          this.state = 'icicles';
          this.stateTimer = 1.5;
          this.vx = 0;
          for (let i = 0; i < 6; i++) {
            const ix = this.arena.left + 60 + i * 130 + (Math.random() * 40 - 20);
            this.game.spawnProjectile({
              x: ix,
              y: this.arena.floorY - 360,
              vx: 0,
              vy: 380 * speedMult,
              w: 16,
              h: 32,
              damage: 22,
              color: '#67e8f9',
              fromPlayer: false,
              life: 2.0
            });
          }
        } else if (this.attackIndex === 1) {
          // Sweeping Ground Frost Wave
          this.state = 'frost_beam';
          this.stateTimer = 1.4;
          this.vx = 0;
          this.hazards.push({
            x: this.arena.left + 20,
            y: this.arena.floorY - 56,
            w: this.arena.right - this.arena.left - 40,
            h: 56,
            timer: 0.75,
            activeDuration: 0.5,
            active: false,
            damage: 26,
            color: '#38bdf8'
          });
        } else {
          // Glacial Wyrm Charge
          this.state = 'charge';
          this.stateTimer = 1.3;
          this.vx = this.facing * 460 * speedMult;
          Veyra.audio.playSFX('boss_roar');
        }
      }
    }

    // 4. INQUISITOR THORNE, THE MIRROR BLADE
    updateThorne(dt, player, speedMult) {
      this.vy += 1400 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.stateTimer <= 0) {
        this.facing = player.x < this.x ? -1 : 1;
        this.counterStance = false;
        this.attackIndex = (this.attackIndex + 1) % 4;

        if (this.attackIndex === 0) {
          // Shadow Teleport behind player + Lunge
          this.state = 'teleport_slash';
          this.stateTimer = 1.15;
          this.x = MathUtils.clamp(player.x - player.facing * 90, this.arena.left + 30, this.arena.right - 70);
          this.facing = player.x < this.x ? -1 : 1;
          this.vx = this.facing * 440 * speedMult;
          Veyra.audio.playSFX('dash');
        } else if (this.attackIndex === 1) {
          // Mirror Counter Stance (Glows purple! Attacking him triggers a riposte unless parried/spell!)
          this.state = 'counter';
          this.counterStance = true;
          this.stateTimer = 1.1;
          this.vx = 0;
          Veyra.audio.playSFX('parry_stance');
        } else if (this.attackIndex === 2) {
          // Crescent Blade Waves
          this.state = 'waves';
          this.stateTimer = 1.3;
          this.vx = -this.facing * 180;
          for (let i = 0; i < (this.phase >= 2 ? 3 : 2); i++) {
            setTimeout(() => {
              if (this.dead) return;
              this.game.spawnProjectile({
                x: this.x + this.w / 2,
                y: this.y + 18,
                vx: this.facing * 480,
                vy: (i - 1) * 65,
                w: 24,
                h: 36,
                damage: 24,
                color: '#c084fc',
                fromPlayer: false,
                life: 2.0
              });
            }, i * 180);
          }
        } else {
          // Aerial Dive Kick + Pillars
          this.state = 'dive';
          this.stateTimer = 1.25;
          this.vy = -580;
          this.vx = this.facing * 320;
        }
      }
    }

    // 5. ARCHON MALAKOR, SOVEREIGN OF THE ECLIPSE (3-Phase Final Boss!)
    updateMalakor(dt, player, speedMult) {
      this.vy += 1200 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.stateTimer <= 0) {
        this.facing = player.x < this.x ? -1 : 1;
        this.attackIndex = (this.attackIndex + 1) % 4;

        if (this.attackIndex === 0) {
          // Sovereign Cleave Dash + Trail Hazards
          this.state = 'sovereign_cleave';
          this.stateTimer = 1.2;
          this.vx = this.facing * 540 * speedMult;
          Veyra.audio.playSFX('slash_3');
        } else if (this.attackIndex === 1) {
          // Eclipse Meteor Shower
          this.state = 'meteors';
          this.stateTimer = 1.45;
          this.vx = 0;
          const count = this.phase === 3 ? 7 : 5;
          for (let i = 0; i < count; i++) {
            const mx = this.arena.left + 50 + i * ((this.arena.right - this.arena.left - 100) / (count - 1));
            this.hazards.push({
              x: mx - 24,
              y: this.arena.floorY - 380,
              w: 48,
              h: 380,
              timer: 0.62,
              activeDuration: 0.4,
              active: false,
              damage: 28,
              color: this.phase === 3 ? '#f43f5e' : '#facc15'
            });
          }
        } else if (this.attackIndex === 2) {
          // Radial Void Orb Burst
          this.state = 'void_orbs';
          this.stateTimer = 1.35;
          this.vx = 0;
          this.vy = -480;
          const orbs = this.phase === 3 ? 10 : 6;
          for (let i = 0; i < orbs; i++) {
            const ang = (i / orbs) * Math.PI * 2;
            this.game.spawnProjectile({
              x: this.x + this.w / 2,
              y: this.y + this.h / 2,
              vx: Math.cos(ang) * 360,
              vy: Math.sin(ang) * 360,
              w: 18,
              h: 18,
              damage: 25,
              color: '#f43f5e',
              fromPlayer: false,
              life: 2.6
            });
          }
        } else {
          // Teleport Judgment Slam on Player's X
          this.state = 'judgment';
          this.stateTimer = 1.3;
          this.x = MathUtils.clamp(player.x, this.arena.left + 40, this.arena.right - 80);
          this.y = this.arena.floorY - 260;
          this.vx = 0;
          this.vy = 720;
          this.hazards.push({
            x: this.x - 90,
            y: this.arena.floorY - 48,
            w: 230,
            h: 48,
            timer: 0.45,
            activeDuration: 0.35,
            active: false,
            damage: 30,
            color: '#facc15'
          });
        }
      }
    }

    takeDamage(amount, hitDir, isCrit = false, ignoreCounter = false) {
      if (this.dead) return false;

      // Inquisitor Thorne's Mirror Counter-Stance
      if (this.counterStance && !ignoreCounter) {
        this.counterStance = false;
        Veyra.audio.playSFX('parry');
        this.game.player.takeDamage(24, this.x + this.w / 2);
        this.game.particles.spawnFloatingText(this.x + this.w / 2, this.y - 20, 'COUNTER RIPOSTE!', {
          color: '#c084fc',
          size: 20,
          isCrit: true
        });
        return false;
      }

      this.hp -= amount;
      this.hurtTimer = 0.14;
      this.game.registerComboHit();

      Veyra.audio.playSFX(isCrit ? 'crit_hit' : 'hit_enemy');
      this.game.particles.spawnFloatingText(
        this.x + this.w / 2,
        this.y - 14,
        isCrit ? `${amount}!` : amount,
        { color: isCrit ? '#facc15' : '#ffffff', size: isCrit ? 22 : 18, isCrit }
      );
      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: isCrit ? 18 : 10,
        color: this.color,
        altColor: this.accent,
        speedMin: 80,
        speedMax: 260
      });

      if (this.hp <= 0) {
        this.die();
      }
      return true;
    }

    die() {
      this.dead = true;
      this.hazards = [];
      Veyra.audio.playSFX('boss_roar');
      this.game.addScreenShake(16, 0.7);

      this.game.particles.spawnBurst(this.x + this.w / 2, this.y + this.h / 2, {
        count: 65,
        color: this.color,
        altColor: this.accent,
        speedMin: 100,
        speedMax: 440,
        sizeMin: 4,
        sizeMax: 10,
        lifeMax: 1.2
      });

      this.game.onBossDefeated(this);
    }
  }

  Veyra.BOSS_SPECS = BOSS_SPECS;
  Veyra.Boss = Boss;
})();

/**
 * Chronicles of Veyra: The Shattered Eclipse
 * 2D Canvas Renderer: Multi-Layer Parallax, Procedural Sprites, Lighting, Cutscene Art & Portraits
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { CONFIG, MathUtils } = Veyra;
  const T = CONFIG.TILES;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.time = 0;
    }

    renderGame(game, dt) {
      if (!this.ctx) return;
      this.time += dt;
      const ctx = this.ctx;
      const W = CONFIG.VIEWPORT_WIDTH;
      const H = CONFIG.VIEWPORT_HEIGHT;
      const dpr = game.dpr || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cam = game.camera;
      const level = game.currentLevel;
      const biome = CONFIG.BIOMES[level.biome] || CONFIG.BIOMES.catacombs;

      ctx.save();

      // Apply Screen Shake offset
      if (game.shakeTimer > 0 && game.settings.screenShake > 0) {
        const mag = game.shakeMagnitude * (game.settings.screenShake / 100);
        const sx = (Math.random() - 0.5) * 2 * mag;
        const sy = (Math.random() - 0.5) * 2 * mag;
        ctx.translate(sx, sy);
      }

      // 1. Sky & Parallax Background
      this.renderParallaxBackground(ctx, W, H, cam, biome);

      // 2. Level Tiles & Moving Platforms
      this.renderTiles(ctx, W, H, cam, level, biome, game);

      // 3. World Objects (Portals, Beacons, Tablets, Chests, Signs, Grapples)
      this.renderWorldObjects(ctx, cam, level, game);

      // 4. NPCs
      this.renderNPCs(ctx, cam, level, game);

      // 5. Pickups & Projectiles
      this.renderPickupsAndProjectiles(ctx, cam, game);

      // 6. Enemies & Active Boss
      for (const enemy of game.enemies) {
        if (!enemy.dead) this.renderEnemy(ctx, cam, enemy);
      }
      if (game.activeBoss && !game.activeBoss.dead) {
        this.renderBoss(ctx, cam, game.activeBoss);
      }

      // 7. Player Sentinel (Kaelen)
      this.renderPlayer(ctx, cam, game.player);

      // 8. World Particles, Slash Trails & Floating Combat Numbers
      game.particles.renderWorld(ctx, cam);

      // 9. Atmospheric Point Lighting & Weather
      this.renderLightingAndAtmosphere(ctx, W, H, cam, level, biome, game);
      game.particles.renderWeather(ctx);

      // 10. Boss Arena Boundary Barriers (when boss fight active)
      if (game.activeBoss && !game.activeBoss.dead && level.arenaBounds) {
        this.renderArenaBarriers(ctx, cam, level.arenaBounds);
      }

      ctx.restore();
    }

    renderParallaxBackground(ctx, W, H, cam, biome) {
      // Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, biome.skyTop);
      skyGrad.addColorStop(1, biome.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Shattered Eclipse Sun / Moon in the upper sky
      const sunX = W * 0.75 - (cam.x * 0.04) % 400;
      const sunY = 145;
      ctx.save();
      const coronaGrad = ctx.createRadialGradient(sunX, sunY, 32, sunX, sunY, 130);
      coronaGrad.addColorStop(0, biome.tileAccent);
      coronaGrad.addColorStop(0.4, biome.fogColor);
      coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
      ctx.fill();

      // Eclipse Ring & Dark Core
      ctx.strokeStyle = biome.tileAccent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#05060d';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 41, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Parallax Layer 1: Distant Mountain / Spire Silhouettes (scrolls at 0.15x)
      ctx.fillStyle = 'rgba(8, 11, 22, 0.55)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 80; x += 80) {
        const worldX = x + cam.x * 0.15;
        const peakH = 220 + Math.sin(worldX * 0.004) * 90 + Math.cos(worldX * 0.011) * 45;
        ctx.lineTo(x, H - peakH);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // Parallax Layer 2: Midground Gothic Arches / Pillars / Gears (scrolls at 0.35x)
      ctx.fillStyle = 'rgba(12, 16, 30, 0.68)';
      const pillarSpacing = 220;
      const offset2 = -((cam.x * 0.35) % pillarSpacing);
      for (let x = offset2 - pillarSpacing; x < W + pillarSpacing; x += pillarSpacing) {
        ctx.fillRect(x, 120, 34, H - 120);
        // Archway top
        ctx.beginPath();
        ctx.arc(x + 17, 150, 65, Math.PI, 0);
        ctx.lineWidth = 10;
        ctx.strokeStyle = 'rgba(15, 20, 38, 0.65)';
        ctx.stroke();
      }
    }

    renderTiles(ctx, W, H, cam, level, biome, game) {
      const ts = CONFIG.TILE_SIZE;
      const startCol = Math.max(0, Math.floor(cam.x / ts) - 1);
      const endCol = Math.min(level.cols - 1, Math.ceil((cam.x + W) / ts) + 1);
      const startRow = Math.max(0, Math.floor(cam.y / ts) - 1);
      const endRow = Math.min(level.rows - 1, Math.ceil((cam.y + H) / ts) + 1);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const tile = game.getTile(c, r);
          if (tile === T.EMPTY) continue;

          const tx = Math.floor(c * ts - cam.x);
          const ty = Math.floor(r * ts - cam.y);

          switch (tile) {
            case T.PLATFORM_ONEWAY:
              ctx.fillStyle = biome.tileSecondary;
              ctx.fillRect(tx, ty, ts, 10);
              ctx.fillStyle = biome.tileAccent;
              ctx.fillRect(tx + 2, ty, ts - 4, 3);
              break;

            case T.SPIKES_UP:
              ctx.fillStyle = '#94a3b8';
              for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(tx + i * 10, ty + ts);
                ctx.lineTo(tx + i * 10 + 5, ty + 12);
                ctx.lineTo(tx + (i + 1) * 10, ty + ts);
                ctx.fill();
              }
              ctx.fillStyle = '#ef4444';
              for (let i = 0; i < 4; i++) {
                ctx.fillRect(tx + i * 10 + 4, ty + 12, 2, 5);
              }
              break;

            case T.SPIKES_DOWN:
              ctx.fillStyle = '#94a3b8';
              for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(tx + i * 10, ty);
                ctx.lineTo(tx + i * 10 + 5, ty + ts - 12);
                ctx.lineTo(tx + (i + 1) * 10, ty);
                ctx.fill();
              }
              break;

            case T.LAVA_ACID: {
              const isAcid = level.biome === 'outskirts';
              ctx.fillStyle = isAcid ? '#059669' : '#ea580c';
              ctx.fillRect(tx, ty + 8, ts, ts - 8);
              ctx.fillStyle = isAcid ? '#34d399' : '#facc15';
              const waveY = Math.sin(this.time * 5 + c) * 3;
              ctx.fillRect(tx, ty + 6 + waveY, ts, 5);
              break;
            }

            case T.BOUNCE_PAD:
              ctx.fillStyle = '#065f46';
              ctx.fillRect(tx + 6, ty + 16, ts - 12, ts - 16);
              ctx.fillStyle = '#34d399';
              ctx.beginPath();
              ctx.ellipse(tx + ts / 2, ty + 16, ts / 2, 10, 0, Math.PI, 0);
              ctx.fill();
              break;

            case T.CRUMBLE_BLOCK:
              ctx.fillStyle = '#475569';
              ctx.fillRect(tx + 1, ty + 1, ts - 2, ts - 2);
              ctx.strokeStyle = '#94a3b8';
              ctx.strokeRect(tx + 4, ty + 4, ts - 8, ts - 8);
              break;

            case T.ICE_FLOOR:
              ctx.fillStyle = '#0284c7';
              ctx.fillRect(tx, ty, ts, ts);
              ctx.fillStyle = '#bae6fd';
              ctx.fillRect(tx, ty, ts, 6);
              break;

            case T.CONVEYOR_LEFT:
            case T.CONVEYOR_RIGHT: {
              ctx.fillStyle = '#334155';
              ctx.fillRect(tx, ty, ts, ts);
              ctx.fillStyle = '#fb923c';
              const dir = tile === T.CONVEYOR_RIGHT ? 1 : -1;
              const shift = ((this.time * 40 * dir) % 20 + 20) % 20;
              ctx.fillRect(tx + shift, ty + 3, 6, 4);
              ctx.fillRect(tx + ((shift + 10) % 20), ty + 3, 6, 4);
              break;
            }

            case T.SHADOW_GATE:
              ctx.save();
              ctx.globalAlpha = 0.65 + 0.25 * Math.sin(this.time * 8 + r);
              ctx.fillStyle = '#7e22ce';
              ctx.fillRect(tx + 10, ty, ts - 20, ts);
              ctx.fillStyle = '#e9d5ff';
              ctx.fillRect(tx + 17, ty, 6, ts);
              ctx.restore();
              break;

            default:
              // Solid terrain block with top edge highlight if exposed above
              ctx.fillStyle = biome.tilePrimary;
              ctx.fillRect(tx, ty, ts, ts);
              ctx.strokeStyle = biome.tileSecondary;
              ctx.lineWidth = 1;
              ctx.strokeRect(tx + 0.5, ty + 0.5, ts - 1, ts - 1);
              if (game.getTile(c, r - 1) === T.EMPTY) {
                ctx.fillStyle = biome.tileAccent;
                ctx.fillRect(tx, ty, ts, 3);
              }
              break;
          }
        }
      }

      // Render Moving Platforms
      if (level.movingPlatforms) {
        for (const mp of level.movingPlatforms) {
          const mx = mp.x - cam.x;
          const my = mp.y - cam.y;
          ctx.fillStyle = biome.tileSecondary;
          ctx.fillRect(mx, my, mp.w, mp.h);
          ctx.fillStyle = biome.tileAccent;
          ctx.fillRect(mx, my, mp.w, 4);
        }
      }
    }

    renderWorldObjects(ctx, cam, level, game) {
      const player = game.player;

      // 1. Tutorial / Lore Signs
      if (level.signs) {
        for (const s of level.signs) {
          const sx = s.x - cam.x;
          const sy = s.y - cam.y;
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 14, sy + 18, 6, 24);
          ctx.fillStyle = '#92400e';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.fillRect(sx, sy, 34, 20);
          ctx.strokeRect(sx, sy, 34, 20);

          if (MathUtils.dist(player.x, player.y, s.x, s.y) < 120) {
            this.drawWorldTooltip(ctx, sx + 17, sy - 18, s.text, '#fef08a');
          }
        }
      }

      // 2. Grapple Anchors
      if (level.grapples) {
        for (const g of level.grapples) {
          const gx = g.x - cam.x;
          const gy = g.y - cam.y;
          const pulse = 1 + Math.sin(this.time * 6) * 0.18;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(gx, gy, 12 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(gx, gy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Astral Beacons (Save & Rest Shrines)
      if (level.beacons) {
        for (const b of level.beacons) {
          const bx = b.x - cam.x;
          const by = b.y - cam.y;
          // Pedestal
          ctx.fillStyle = '#334155';
          ctx.fillRect(bx + 4, by + 42, 32, 14);
          // Floating Crystal Obelisk
          const bob = Math.sin(this.time * 4) * 4;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(bx + 20, by + bob);
          ctx.lineTo(bx + 32, by + 22 + bob);
          ctx.lineTo(bx + 20, by + 38 + bob);
          ctx.lineTo(bx + 8, by + 22 + bob);
          ctx.closePath();
          ctx.fill();

          if (MathUtils.dist(player.x, player.y, b.x, b.y) < 75) {
            this.drawWorldTooltip(ctx, bx + 20, by - 14, `[E] Rest & Save at ${b.name}`, '#38bdf8');
          }
        }
      }

      // 4. Treasure Chests
      if (level.chests) {
        for (const ch of level.chests) {
          const cx = ch.x - cam.x;
          const cy = ch.y - cam.y;
          const opened = game.state.openedChests.includes(ch.id);
          ctx.fillStyle = opened ? '#475569' : '#b45309';
          ctx.fillRect(cx, cy + 8, 36, 26);
          ctx.strokeStyle = opened ? '#94a3b8' : '#facc15';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cy + 8, 36, 26);
          if (!opened && MathUtils.dist(player.x, player.y, ch.x, ch.y) < 68) {
            this.drawWorldTooltip(ctx, cx + 18, cy - 10, '[E] Open Ancient Chest', '#facc15');
          }
        }
      }

      // 5. Ancient Lore Tablets
      if (level.tablets) {
        for (const tb of level.tablets) {
          const tx = tb.x - cam.x;
          const ty = tb.y - cam.y;
          const isRead = game.state.readTablets.includes(tb.id);
          ctx.fillStyle = '#1e1b4b';
          ctx.beginPath();
          ctx.roundRect(tx + 4, ty, 28, 52, [14, 14, 2, 2]);
          ctx.fill();
          ctx.strokeStyle = isRead ? '#64748b' : '#c084fc';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Glowing Runes on Tablet
          ctx.fillStyle = isRead ? '#94a3b8' : '#e879f9';
          ctx.fillRect(tx + 11, ty + 14, 14, 3);
          ctx.fillRect(tx + 11, ty + 22, 14, 3);
          ctx.fillRect(tx + 11, ty + 30, 10, 3);

          if (MathUtils.dist(player.x, player.y, tb.x, tb.y) < 72) {
            this.drawWorldTooltip(ctx, tx + 18, ty - 12, '[E] Decipher Lore Tablet', '#e879f9');
          }
        }
      }

      // 6. Zone Portals
      if (level.portals) {
        for (const pt of level.portals) {
          const px = pt.x - cam.x;
          const py = pt.y - cam.y;
          const unlocked = (game.state.defeatedBosses || []).length >= (pt.reqBossCount || 0);

          ctx.save();
          ctx.translate(px + pt.w / 2, py + pt.h / 2);
          ctx.strokeStyle = unlocked ? '#f59e0b' : '#475569';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.w / 2, pt.h / 2, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.globalAlpha = 0.55 + 0.25 * Math.sin(this.time * 5);
          ctx.fillStyle = unlocked ? '#38bdf8' : '#1e293b';
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.w / 2 - 6, pt.h / 2 - 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (MathUtils.dist(player.x, player.y, pt.x, pt.y) < 84) {
            const msg = unlocked
              ? `[E] ${pt.label}`
              : `Locked: Reclaim ${pt.reqBossCount} Eclipse Shard(s) first`;
            this.drawWorldTooltip(ctx, px + pt.w / 2, py - 14, msg, unlocked ? '#facc15' : '#f87171');
          }
        }
      }
    }

    renderNPCs(ctx, cam, level, game) {
      if (!level.npcs) return;
      const player = game.player;
      for (const npcPlacement of level.npcs) {
        const npcDef = Veyra.STORY.NPCS[npcPlacement.id];
        if (!npcDef) continue;

        const nx = npcPlacement.x - cam.x;
        const ny = npcPlacement.y - cam.y;
        const bob = Math.sin(this.time * 3 + nx) * 2;

        // Cloak & Body
        ctx.fillStyle = npcDef.cloakColor;
        ctx.beginPath();
        ctx.roundRect(nx + 4, ny + 16, 24, 38, 6);
        ctx.fill();

        // Head / Hood
        ctx.fillStyle = npcDef.color;
        ctx.beginPath();
        ctx.arc(nx + 16, ny + 12 + bob, 10, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(nx + 13, ny + 10 + bob, 3, 3);
        ctx.fillRect(nx + 19, ny + 10 + bob, 3, 3);

        // Nameplate above NPC
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = npcDef.accentColor;
        ctx.fillText(npcDef.name, nx + 16, ny - 6);

        if (MathUtils.dist(player.x, player.y, npcPlacement.x, npcPlacement.y) < 78) {
          this.drawWorldTooltip(ctx, nx + 16, ny - 24, `[E] Speak with ${npcDef.name}`, '#fef08a');
        }
      }
    }

    renderPickupsAndProjectiles(ctx, cam, game) {
      // Aether Shard Drops
      for (const drop of game.drops) {
        const dx = drop.x - cam.x;
        const dy = drop.y - cam.y;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(this.time * 4 + drop.x);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      }

      // Projectiles
      for (const p of game.projectiles) {
        const px = p.x - cam.x;
        const py = p.y - cam.y;
        ctx.fillStyle = p.color || '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(px - p.w / 2, py - p.h / 2, p.w, p.h, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, Math.min(p.w, p.h) * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    renderEnemy(ctx, cam, e) {
      const ex = e.x - cam.x;
      const ey = e.y - cam.y;
      if (ex < -80 || ex > CONFIG.VIEWPORT_WIDTH + 80) return;

      ctx.save();
      ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : e.color;
      ctx.beginPath();
      ctx.roundRect(ex, ey, e.w, e.h, 8);
      ctx.fill();

      // Glowing Eyes
      const eyeX = e.facing > 0 ? ex + e.w - 10 : ex + 4;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(eyeX, ey + 10, 6, 4);

      // Shield visual for Dusk Stalker
      if (e.shielded) {
        const shX = e.facing > 0 ? ex + e.w - 2 : ex - 6;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(shX, ey + 6, 8, e.h - 10);
      }

      // Health bar if damaged
      if (e.hp < e.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(ex - 4, ey - 10, e.w + 8, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ex - 4, ey - 10, (e.w + 8) * Math.max(0, e.hp / e.maxHp), 5);
      }
      ctx.restore();
    }

    renderBoss(ctx, cam, boss) {
      // Render Boss Arena Hazards & Telegraphs first
      for (const hz of boss.hazards) {
        const hx = hz.x - cam.x;
        const hy = hz.y - cam.y;
        ctx.save();
        if (!hz.active) {
          // Warning Telegraph Zone
          ctx.fillStyle = hz.color;
          ctx.globalAlpha = 0.22 + 0.15 * Math.sin(this.time * 22);
          ctx.fillRect(hx, hy, hz.w, hz.h);
          ctx.strokeStyle = hz.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(hx, hy, hz.w, hz.h);
        } else {
          // Active Eruption / Beam
          ctx.fillStyle = hz.color;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(hx, hy, hz.w, hz.h);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hx + hz.w * 0.25, hy, hz.w * 0.5, hz.h);
        }
        ctx.restore();
      }

      const bx = boss.x - cam.x;
      const by = boss.y - cam.y;
      ctx.save();

      // Phase Aura or Counter Stance Ring
      if (boss.counterStance || boss.phase >= 2) {
        ctx.strokeStyle = boss.counterStance ? '#e879f9' : boss.accent;
        ctx.lineWidth = boss.counterStance ? 4 : 2;
        ctx.beginPath();
        ctx.arc(bx + boss.w / 2, by + boss.h / 2, Math.max(boss.w, boss.h) * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Boss Body
      ctx.fillStyle = boss.hurtTimer > 0 ? '#ffffff' : boss.color;
      ctx.beginPath();
      ctx.roundRect(bx, by, boss.w, boss.h, 12);
      ctx.fill();

      // Crown / Horns
      ctx.fillStyle = boss.accent;
      ctx.beginPath();
      ctx.moveTo(bx + 8, by);
      ctx.lineTo(bx + 18, by - 16);
      ctx.lineTo(bx + boss.w / 2, by - 6);
      ctx.lineTo(bx + boss.w - 18, by - 16);
      ctx.lineTo(bx + boss.w - 8, by);
      ctx.fill();

      // Boss Eyes
      const eyeOffset = boss.facing > 0 ? boss.w - 18 : 6;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + eyeOffset, by + 16, 10, 6);

      ctx.restore();
    }

    renderPlayer(ctx, cam, player) {
      const px = player.x - cam.x;
      const py = player.y - cam.y;

      ctx.save();

      // Grapple Beam Tether if grappling
      if (player.grappleTarget) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + player.w / 2, py + player.h / 2);
        ctx.lineTo(player.grappleTarget.x - cam.x, player.grappleTarget.y - cam.y);
        ctx.stroke();
      }

      // Flowing Sentinel Scarf
      ctx.strokeStyle = player.arcaneBladeTimer > 0 ? '#c084fc' : '#f43f5e';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < player.scarfPoints.length; i++) {
        const pt = player.scarfPoints[i];
        if (i === 0) ctx.moveTo(pt.x - cam.x, pt.y - cam.y);
        else ctx.lineTo(pt.x - cam.x, pt.y - cam.y);
      }
      ctx.stroke();

      // Invulnerability blink
      if (player.invulnTimer > 0 && Math.floor(this.time * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      // Sentinel Armor Body
      ctx.fillStyle = player.hurtFlashTimer > 0 ? '#ef4444' : '#1e293b';
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 14, player.w - 4, player.h - 14, 6);
      ctx.fill();

      // Sentinel Helm & Glowing Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px + player.w / 2, py + 12, 11, 0, Math.PI * 2);
      ctx.fill();

      const eyeX = player.facing > 0 ? px + 16 : px + 5;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(eyeX, py + 10, 7, 4);

      // Equipped Duskblade on back / hand
      const weapon = player.currentWeapon;
      ctx.strokeStyle = weapon.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px + player.w / 2, py + 24);
      ctx.lineTo(px + player.w / 2 - player.facing * 18, py + 6);
      ctx.stroke();

      // Parry Aegis Shield Dome
      if (player.parryTimer > 0) {
        ctx.strokeStyle = '#fef08a';
        ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + player.w / 2, py + player.h / 2, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Radiant Mend Shield Aura
      if (player.shieldTimer > 0) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + player.w / 2, py + player.h / 2, 30, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    renderLightingAndAtmosphere(ctx, W, H, cam, level, biome, game) {
      if (game.settings.highContrast) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Player aura glow
      const px = game.player.x + game.player.w / 2 - cam.x;
      const py = game.player.y + game.player.h / 2 - cam.y;
      const pGrad = ctx.createRadialGradient(px, py, 8, px, py, 140);
      pGrad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
      pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, 140, 0, Math.PI * 2);
      ctx.fill();

      // Level point lights
      if (level.lights) {
        for (const l of level.lights) {
          const lx = l.x - cam.x;
          const ly = l.y - cam.y;
          if (lx < -l.radius || lx > W + l.radius || ly < -l.radius || ly > H + l.radius) continue;
          const flicker = l.isTorch ? 1 + Math.sin(this.time * 12 + l.x) * 0.08 : 1;
          const r = l.radius * flicker;
          const grad = ctx.createRadialGradient(lx, ly, 4, lx, ly, r);
          grad.addColorStop(0, l.color + '28');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(lx, ly, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    renderArenaBarriers(ctx, cam, bounds) {
      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.fillRect(bounds.left - cam.x - 6, 0, 8, CONFIG.VIEWPORT_HEIGHT);
      ctx.fillRect(bounds.right - cam.x - 2, 0, 8, CONFIG.VIEWPORT_HEIGHT);
      ctx.restore();
    }

    drawWorldTooltip(ctx, x, y, text, borderColor = '#38bdf8') {
      ctx.save();
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      const padX = 10;
      const w = ctx.measureText(text).width + padX * 2;
      const h = 26;
      const rx = MathUtils.clamp(x - w / 2, 10, CONFIG.VIEWPORT_WIDTH - w - 10);
      const ry = Math.max(12, y - h);

      ctx.fillStyle = 'rgba(7, 10, 22, 0.9)';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, ry, w, h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, rx + w / 2, ry + h / 2);
      ctx.restore();
    }

    // Procedural Cutscene Illustration Canvas Renderer
    renderCutsceneArt(canvas, artStyle, time = 0) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const palettes = {
        eclipse_crown: ['#090a1a', '#1e1b4b', '#facc15'],
        shattering: ['#1a0612', '#4c0519', '#f43f5e'],
        corruption: ['#051814', '#064e3b', '#34d399'],
        awakening: ['#070b19', '#1e293b', '#38bdf8'],
        haven_town: ['#120c1f', '#311b47', '#f59e0b'],
        outskirts_roots: ['#041a14', '#065f46', '#10b981'],
        foundry_gears: ['#1c0a04', '#431407', '#fb923c'],
        valkyrie_silhouette: ['#180808', '#450a0a', '#38bdf8'],
        crystal_cavern: ['#061329', '#1e3a8a', '#67e8f9'],
        wyrm_shadow: ['#040d21', '#172554', '#38bdf8'],
        astral_archive: ['#120629', '#3b0764', '#c084fc'],
        inquisitor_duel: ['#17072b', '#4c1d95', '#f43f5e'],
        eclipse_throne: ['#0a0308', '#3b071e', '#f43f5e'],
        reforged_crown: ['#1e1b4b', '#78350f', '#fef08a'],
        haven_sunrise: ['#1e293b', '#b45309', '#fde047'],
        twilight_throne: ['#05050a', '#31102f', '#e11d48'],
        true_harmony: ['#09152b', '#1e3a8a', '#67e8f9']
      };
      const [bgTop, bgBot, accent] = palettes[artStyle] || palettes.eclipse_crown;

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, bgTop);
      grad.addColorStop(1, bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Central Celestial / Eclipse Emblem
      const cx = W / 2;
      const cy = H * 0.44;
      const pulse = 1 + Math.sin(time * 2.5) * 0.06;

      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 58 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#05060e';
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.fill();

      // Radiant rays / shards
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + time * 0.3;
        const r1 = 68;
        const r2 = 96 + Math.sin(time * 3 + i) * 10;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        ctx.stroke();
      }

      // Foreground silhouette hills & sentinel figure
      ctx.fillStyle = '#04050c';
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H - 45);
      ctx.lineTo(W * 0.35, H - 70);
      ctx.lineTo(W * 0.65, H - 55);
      ctx.lineTo(W, H - 80);
      ctx.lineTo(W, H);
      ctx.fill();
    }
  }

  Veyra.Renderer = Renderer;
})();

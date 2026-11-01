/**
 * Chronicles of Veyra: The Shattered Eclipse
 * High-Performance Particle Engine, Slash Trails, Afterimages, Combat Text & Biome Weather
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { MathUtils } = Veyra;

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.floatingTexts = [];
      this.slashArcs = [];
      this.afterimages = [];
      this.weatherParticles = [];
      this.currentWeather = 'embers';
      this.initWeather(90);
    }

    initWeather(count = 90) {
      const W = (Veyra.CONFIG && Veyra.CONFIG.VIEWPORT_WIDTH) || 1280;
      const H = (Veyra.CONFIG && Veyra.CONFIG.VIEWPORT_HEIGHT) || 720;
      this.weatherParticles = [];
      for (let i = 0; i < count; i++) {
        this.weatherParticles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 1.5 + Math.random() * 3,
          speedX: (Math.random() - 0.5) * 30,
          speedY: -15 - Math.random() * 30,
          alpha: 0.25 + Math.random() * 0.65,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    setWeather(type) {
      this.currentWeather = type || 'embers';
    }

    clear() {
      this.particles = [];
      this.floatingTexts = [];
      this.slashArcs = [];
      this.afterimages = [];
    }

    spawnBurst(x, y, {
      count = 12,
      color = '#38bdf8',
      altColor = null,
      speedMin = 60,
      speedMax = 260,
      angleMin = 0,
      angleMax = Math.PI * 2,
      sizeMin = 2,
      sizeMax = 6,
      lifeMin = 0.25,
      lifeMax = 0.65,
      gravity = 420,
      glow = true,
      shape = 'circle'
    } = {}) {
      for (let i = 0; i < count; i++) {
        const ang = MathUtils.randRange(angleMin, angleMax);
        const spd = MathUtils.randRange(speedMin, speedMax);
        const life = MathUtils.randRange(lifeMin, lifeMax);
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: MathUtils.randRange(sizeMin, sizeMax),
          color: altColor && Math.random() > 0.5 ? altColor : color,
          life,
          maxLife: life,
          gravity,
          glow,
          shape,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 10
        });
      }
    }

    spawnSlashArc({ x, y, dir = 1, comboStep = 1, isUp = false, isDown = false, radius = 64, color = '#38bdf8', glow = '#bae6fd' }) {
      this.slashArcs.push({
        x,
        y,
        dir,
        comboStep,
        isUp,
        isDown,
        radius,
        color,
        glow,
        life: 0.16,
        maxLife: 0.16
      });
    }

    spawnAfterimage({ x, y, w, h, facing, color = '#38bdf8', pose = 'dash' }) {
      this.afterimages.push({
        x,
        y,
        w,
        h,
        facing,
        color,
        pose,
        life: 0.24,
        maxLife: 0.24
      });
    }

    spawnFloatingText(x, y, text, { color = '#ffffff', size = 18, isCrit = false, vy = -75, life = 0.9 } = {}) {
      this.floatingTexts.push({
        x: x + (Math.random() - 0.5) * 18,
        y,
        text: String(text),
        color,
        size: isCrit ? size + 5 : size,
        isCrit,
        vx: (Math.random() - 0.5) * 28,
        vy,
        life,
        maxLife: life
      });
    }

    update(dt, camera) {
      // Update world particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.rot += p.vRot * dt;
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update slash arcs
      for (let i = this.slashArcs.length - 1; i >= 0; i--) {
        const s = this.slashArcs[i];
        s.life -= dt;
        if (s.life <= 0) this.slashArcs.splice(i, 1);
      }

      // Update dash afterimages
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        const a = this.afterimages[i];
        a.life -= dt;
        if (a.life <= 0) this.afterimages.splice(i, 1);
      }

      // Update floating combat text
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.x += ft.vx * dt;
        ft.y += ft.vy * dt;
        ft.vy *= 0.94;
        ft.life -= dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }

      // Update screen-space weather particles
      const wType = this.currentWeather;
      for (const wp of this.weatherParticles) {
        wp.phase += dt * 2.2;
        if (wType === 'snow') {
          wp.x += (Math.sin(wp.phase) * 25 - 35) * dt;
          wp.y += (55 + wp.size * 14) * dt;
        } else if (wType === 'ash' || wType === 'eclipse_ash') {
          wp.x += (Math.cos(wp.phase) * 35 + 20) * dt;
          wp.y += (28 + wp.size * 8) * dt;
        } else if (wType === 'spores' || wType === 'fireflies' || wType === 'starlight') {
          wp.x += Math.cos(wp.phase) * 22 * dt;
          wp.y += Math.sin(wp.phase * 0.8) * 18 * dt;
        } else {
          // embers rising
          wp.x += Math.sin(wp.phase) * 24 * dt;
          wp.y -= (25 + wp.size * 10) * dt;
        }

        const W = (Veyra.CONFIG && Veyra.CONFIG.VIEWPORT_WIDTH) || 1280;
        const H = (Veyra.CONFIG && Veyra.CONFIG.VIEWPORT_HEIGHT) || 720;
        if (wp.x < 0) wp.x += W;
        if (wp.x > W) wp.x -= W;
        if (wp.y < 0) wp.y += H;
        if (wp.y > H) wp.y -= H;
      }
    }

    renderWorld(ctx, camera) {
      const W = (Veyra.CONFIG && Veyra.CONFIG.VIEWPORT_WIDTH) || 1280;
      const H = (Veyra.CONFIG && Veyra.CONFIG.VIEWPORT_HEIGHT) || 720;
      ctx.save();

      // Render Dash Afterimages
      for (const a of this.afterimages) {
        const alpha = (a.life / a.maxLife) * 0.45;
        ctx.fillStyle = a.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.roundRect(a.x - camera.x, a.y - camera.y, a.w, a.h, 8);
        ctx.fill();
      }

      // Render Sword Slash Arcs
      for (const s of this.slashArcs) {
        const progress = 1 - s.life / s.maxLife;
        const alpha = Math.max(0, 1 - progress * 0.9);
        const sx = s.x - camera.x;
        const sy = s.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);
        if (s.isUp) {
          ctx.rotate(-Math.PI / 2);
        } else if (s.isDown) {
          ctx.rotate(Math.PI / 2);
        } else if (s.dir < 0) {
          ctx.scale(-1, 1);
        }

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = s.glow;
        ctx.lineWidth = s.comboStep === 3 ? 16 : 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startA = s.comboStep === 2 ? 0.95 : -1.05;
        const endA = s.comboStep === 2 ? -1.05 : 1.05;
        ctx.arc(0, 0, s.radius, startA, endA, s.comboStep === 2);
        ctx.stroke();

        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.comboStep === 3 ? 8 : 5;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius + 4, startA, endA, s.comboStep === 2);
        ctx.stroke();
        ctx.restore();
      }

      // Render World Particles
      for (const p of this.particles) {
        const px = p.x - camera.x;
        const py = p.y - camera.y;
        if (px < -40 || px > W + 40 || py < -40 || py > H + 40) continue;

        const alpha = MathUtils.clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'square' || p.shape === 'shard') {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(px, py, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render Floating Combat Text
      for (const ft of this.floatingTexts) {
        const fx = ft.x - camera.x;
        const fy = ft.y - camera.y;
        const alpha = MathUtils.clamp(ft.life / ft.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${ft.size}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(ft.text, fx, fy);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, fx, fy);
      }

      ctx.restore();
    }

    renderWeather(ctx) {
      ctx.save();
      const wType = this.currentWeather;
      const colorMap = {
        embers: '#38bdf8',
        fireflies: '#facc15',
        spores: '#34d399',
        ash: '#fb923c',
        snow: '#e0f2fe',
        starlight: '#d8b4fe',
        eclipse_ash: '#f43f5e'
      };
      const color = colorMap[wType] || '#38bdf8';

      for (const wp of this.weatherParticles) {
        const pulse = 0.55 + 0.45 * Math.sin(wp.phase * 2);
        ctx.globalAlpha = wp.alpha * pulse;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  Veyra.ParticleSystem = ParticleSystem;
})();

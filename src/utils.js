/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Core Utilities, Math Helpers, PRNG, Collision & Event Bus
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});

  // Seeded PRNG (Mulberry32) for deterministic procedural details
  function createRNG(seed = 1337) {
    let s = seed >>> 0;
    return function () {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const MathUtils = {
    clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    },
    lerp(a, b, t) {
      return a + (b - a) * MathUtils.clamp(t, 0, 1);
    },
     approach(current, target, delta) {
      if (current < target) return Math.min(current + delta, target);
      if (current > target) return Math.max(current - delta, target);
      return target;
    },
    dist(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.hypot(dx, dy);
    },
    angle(x1, y1, x2, y2) {
      return Math.atan2(y2 - y1, x2 - x1);
    },
    randRange(min, max) {
      return min + Math.random() * (max - min);
    },
    randInt(min, max) {
      return Math.floor(min + Math.random() * (max - min + 1));
    },
    choose(arr) {
      if (!arr || !arr.length) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    },
    easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    },
    easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    easeOutBack(t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    // Axis-Aligned Bounding Box overlap check
    aabbOverlap(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    },
    // Point inside rectangle
    pointInRect(px, py, r) {
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    },
    // Format seconds to MM:SS.ms
    formatTime(seconds, includeMs = false) {
      const totalSec = Math.max(0, seconds || 0);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = Math.floor(totalSec % 60);
      const ms = Math.floor((totalSec - Math.floor(totalSec)) * 100);
      const mm = String(mins).padStart(2, '0');
      const ss = String(secs).padStart(2, '0');
      const base = hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
      return includeMs ? `${base}.${String(ms).padStart(2, '0')}` : base;
    }
  };

  // Lightweight pub/sub Event Bus for decoupled gameplay events
  class EventBus {
    constructor() {
      this.listeners = {};
    }
    on(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return () => this.off(event, fn);
    }
    off(event, fn) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
    }
    emit(event, payload) {
      if (!this.listeners[event]) return;
      for (const fn of this.listeners[event]) {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[EventBus:${event}]`, err);
        }
      }
    }
  }

  Veyra.createRNG = createRNG;
  Veyra.MathUtils = MathUtils;
  Veyra.EventBus = EventBus;
  Veyra.events = new EventBus();
})();

/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Built-In Level Editor with Tile & Entity Brush, Biome Selector, Playtest & JSON Import/Export
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { CONFIG } = Veyra;
  const T = CONFIG.TILES;

  class LevelEditor {
    constructor(game) {
      this.game = game;
      this.active = false;
      this.selectedTool = 'tile'; // 'tile' | 'enemy' | 'grapple' | 'chest' | 'beacon' | 'spawn' | 'erase'
      this.selectedTile = T.SOLID_STONE;
      this.selectedEnemy = 'crawler';
      this.biome = 'catacombs';
      this.levelName = 'Custom Sanctum';
      this.isPainting = false;
      this.camSpeed = 520;

      this.customData = this.loadSavedCustomLevel() || this.createBlankLevel();
    }

    createBlankLevel() {
      const cols = 64;
      const rows = 20;
      const b = new Veyra.MapBuilder(cols, rows, T.SOLID_STONE);
      b.addBeacon(6, 17, 'custom_beacon_1', 'Architect Shrine');
      b.addPortal(58, 17, 'haven', 840, 600, 'Complete Custom Level');
      return {
        id: 'custom_level',
        name: 'Custom Sanctum',
        subtitle: 'Created in the Veyra World Architect',
        biome: 'catacombs',
        cols,
        rows,
        spawn: { x: 160, y: 15 * 40 },
        grid: b.grid,
        entities: b.entities,
        npcs: b.npcs,
        beacons: b.beacons,
        chests: b.chests,
        tablets: b.tablets,
        portals: b.portals,
        grapples: b.grapples,
        movingPlatforms: b.movingPlatforms,
        lights: b.lights,
        signs: b.signs
      };
    }

    loadSavedCustomLevel() {
      if (typeof localStorage === 'undefined') return null;
      try {
        const raw = localStorage.getItem('veyra_custom_level_v1');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    saveCustomLevel() {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem('veyra_custom_level_v1', JSON.stringify(this.customData));
      } catch (e) {}
    }

    open() {
      this.active = true;
      this.game.mode = 'editor';
      Veyra.LEVELS.custom_level = JSON.parse(JSON.stringify(this.customData));
      this.game.loadZone('custom_level', false);
      this.game.ui.showEditorToolbar(true);
    }

    closeToMenu() {
      this.active = false;
      this.game.ui.showEditorToolbar(false);
      this.game.returnToTitle();
    }

    playtest() {
      this.saveCustomLevel();
      this.active = false;
      this.game.ui.showEditorToolbar(false);
      Veyra.LEVELS.custom_level = JSON.parse(JSON.stringify(this.customData));
      this.game.mode = 'play';
      this.game.paused = false;
      this.game.ensureFullscreenOnActivePlay();
      this.game.loadZone('custom_level', false);
      this.game.unlockAchievement('architect');
    }

    handleCanvasClick(worldX, worldY, rightClick = false) {
      if (!this.active) return;
      const ts = CONFIG.TILE_SIZE;
      const col = Math.floor(worldX / ts);
      const row = Math.floor(worldY / ts);
      const d = this.customData;

      if (col < 1 || col >= d.cols - 1 || row < 1 || row >= d.rows - 1) return;

      if (rightClick || this.selectedTool === 'erase') {
        d.grid[row][col] = T.EMPTY;
        d.entities = d.entities.filter((e) => Math.hypot(e.x - col * ts, e.y - (row * ts - 48)) > 36);
        d.grapples = d.grapples.filter((g) => Math.hypot(g.x - (col * ts + 20), g.y - (row * ts + 20)) > 36);
      } else if (this.selectedTool === 'tile') {
        d.grid[row][col] = this.selectedTile;
      } else if (this.selectedTool === 'enemy') {
        d.entities.push({ type: this.selectedEnemy, x: col * ts, y: row * ts - 48, patrolDist: 120 });
      } else if (this.selectedTool === 'grapple') {
        d.grapples.push({ x: col * ts + 20, y: row * ts + 20 });
      } else if (this.selectedTool === 'chest') {
        d.chests.push({
          id: `custom_chest_${Date.now()}`,
          x: col * ts,
          y: row * ts - 34,
          reward: { shards: 100 }
        });
      } else if (this.selectedTool === 'spawn') {
        d.spawn = { x: col * ts, y: (row - 1) * ts };
      }

      // Sync live preview level
      Veyra.LEVELS.custom_level = JSON.parse(JSON.stringify(this.customData));
      this.game.currentLevel = Veyra.LEVELS.custom_level;
    }

    exportJSON() {
      this.saveCustomLevel();
      return JSON.stringify(this.customData, null, 2);
    }

    importJSON(jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && Array.isArray(parsed.grid) && parsed.cols && parsed.rows) {
          this.customData = parsed;
          this.saveCustomLevel();
          Veyra.LEVELS.custom_level = JSON.parse(JSON.stringify(this.customData));
          this.game.loadZone('custom_level', false);
          return true;
        }
      } catch (e) {}
      return false;
    }
  }

  Veyra.LevelEditor = LevelEditor;
})();

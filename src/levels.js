/**
 * Chronicles of Veyra: The Shattered Eclipse
 * World Zones, Level Builder, Tilemaps, Secrets, Pickups & Interconnected Portals
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});
  const { CONFIG } = Veyra;
  const T = CONFIG.TILES;

  // Helper to construct a grid and paint rectangles/platforms cleanly
  class MapBuilder {
    constructor(cols, rows, defaultFloorTile = T.SOLID_STONE) {
      this.cols = cols;
      this.rows = rows;
      this.defaultTile = defaultFloorTile;
      this.grid = Array.from({ length: rows }, () => new Array(cols).fill(T.EMPTY));
      this.entities = [];
      this.npcs = [];
      this.beacons = [];
      this.chests = [];
      this.tablets = [];
      this.portals = [];
      this.grapples = [];
      this.movingPlatforms = [];
      this.lights = [];
      this. signs = [];

      // Solid outer border with floor and ceiling
      this.fillRect(0, 0, cols, 2, defaultFloorTile);
      this.fillRect(0, rows - 3, cols, 3, defaultFloorTile);
      this.fillRect(0, 0, 2, rows, defaultFloorTile);
      this.fillRect(cols - 2, 0, 2, rows, defaultFloorTile);
    }

    fillRect(x, y, w, h, tileId) {
      for (let r = Math.max(0, y); r < Math.min(this.rows, y + h); r++) {
        for (let c = Math.max(0, x); c < Math.min(this.cols, x + w); c++) {
          this.grid[r][c] = tileId;
        }
      }
    }

    platform(x, y, w, tileId = T.PLATFORM_ONEWAY) {
      this.fillRect(x, y, w, 1, tileId);
    }

    pit(x, w, hazardTile = T.SPIKES_UP) {
      this.fillRect(x, this.rows - 3, w, 2, T.EMPTY);
      if (hazardTile !== T.EMPTY) {
        this.fillRect(x, this.rows - 2, w, 1, hazardTile);
      }
    }

    addBeacon(col, row, id, name) {
      const ts = CONFIG.TILE_SIZE;
      this.beacons.push({ id, name, x: col * ts, y: row * ts - 56 });
      this.lights.push({ x: col * ts + 20, y: row * ts - 35, radius: 150, color: '#38bdf8' });
    }

    addNPC(col, row, npcId) {
      const ts = CONFIG.TILE_SIZE;
      this.npcs.push({ id: npcId, x: col * ts, y: row * ts - 54 });
      this.lights.push({ x: col * ts + 16, y: row * ts - 30, radius: 120, color: '#facc15' });
    }

    addChest(col, row, id, reward) {
      const ts = CONFIG.TILE_SIZE;
      this.chests.push({ id, x: col * ts, y: row * ts - 34, reward });
    }

    addTablet(col, row, tabletId) {
      const ts = CONFIG.TILE_SIZE;
      this.tablets.push({ id: tabletId, x: col * ts, y: row * ts - 52 });
      this.lights.push({ x: col * ts + 16, y: row * ts - 30, radius: 110, color: '#a855f7' });
    }

    addPortal(col, row, targetZone, targetSpawnX, targetSpawnY, label, reqBossCount = 0) {
      const ts = CONFIG.TILE_SIZE;
      this.portals.push({
        x: col * ts,
        y: row * ts - 76,
        w: 52,
        h: 76,
        targetZone,
        targetSpawnX,
        targetSpawnY,
        label,
        reqBossCount
      });
      this.lights.push({ x: col * ts + 26, y: row * ts - 40, radius: 145, color: '#f59e0b' });
    }

    addGrapple(col, row) {
      const ts = CONFIG.TILE_SIZE;
      this.grapples.push({ x: col * ts + 20, y: row * ts + 20 });
      this.lights.push({ x: col * ts + 20, y: row * ts + 20, radius: 85, color: '#38bdf8' });
    }

    addEnemy(col, row, type, patrolDist = 140) {
      const ts = CONFIG.TILE_SIZE;
      this.entities.push({ type, x: col * ts, y: row * ts - 48, patrolDist });
    }

    addMovingPlatform(col1, row1, col2, row2, wTiles = 3, speed = 1.4) {
      const ts = CONFIG.TILE_SIZE;
      this.movingPlatforms.push({
        x1: col1 * ts,
        y1: row1 * ts,
        x2: col2 * ts,
        y2: row2 * ts,
        w: wTiles * ts,
        h: 18,
        speed
      });
    }

    addSign(col, row, text) {
      const ts = CONFIG.TILE_SIZE;
      this.signs.push({ x: col * ts, y: row * ts - 42, text });
    }

    addTorch(col, row, color = '#fb923c', radius = 140) {
      const ts = CONFIG.TILE_SIZE;
      this.lights.push({ x: col * ts + 20, y: row * ts + 20, radius, color, isTorch: true });
    }
  }

  // Build all 8 World Zones
  function buildAllLevels() {
    const levels = {};

    // =========================================================================
    // ZONE 0: WHISPERING CATACOMBS (Prologue & Movement/Combat Tutorial)
    // =========================================================================
    {
      const b = new MapBuilder(95, 22, T.SOLID_STONE);
      const floorY = 19;

      // Starting chamber decor & tutorial signs
      b.addTorch(5, 16, '#38bdf8', 160);
      b.addSign(6, floorY, 'MOVE: [A/D] or Arrows | JUMP: [W/Space/Z] (Tap in air for Double Jump!)');
      b.addTablet(10, floorY, 'tablet_1');

      // Step stones & First Pit
      b.fillRect(15, 17, 4, 2, T.SOLID_STONE);
      b.pit(19, 5, T.SPIKES_UP);
      b.platform(20, 15, 3, T.PLATFORM_ONEWAY);

      // Wall Jump Chimney & Upper Secret Chest
      b.fillRect(27, 10, 2, 9, T.SOLID_STONE);
      b.fillRect(33, 8, 2, 7, T.SOLID_STONE);
      b.platform(29, 14, 4, T.PLATFORM_ONEWAY);
      b.platform(24, 9, 5, T.ORNATE_BRICK);
      b.addChest(25, 9, 'catacombs_chest_1', { shards: 65, item: 'elixir_refill' });
      b.addSign(26, floorY, 'WALL JUMP: Slide against walls & press [JUMP] | ATTACK: [J] or Left-Click');

      // Combat intro
      b.addEnemy(38, floorY, 'crawler', 120);
      b.addEnemy(45, floorY, 'crawler', 140);
      b.addSign(42, floorY, 'PARRY: Press [F] right before an enemy strikes | POGO: Hold [S/Down] + [Attack] in mid-air!');

      // Shadow Gate & Dash Tutorial
      b.fillRect(51, 13, 1, 6, T.SHADOW_GATE);
      b.fillRect(50, 12, 3, 1, T.SOLID_STONE);
      b.addSign(49, floorY, 'SHADOW DASH: Press [K] or [Shift] to phase through Shadow Barriers & enemy attacks!');

      // Chasm with Astral Grapple Anchor & Pogo Spikes
      b.pit(56, 14, T.SPIKES_UP);
      b.addGrapple(60, 11);
      b.addGrapple(66, 11);
      b.platform(62, 15, 2, T.PLATFORM_ONEWAY);
      b.addSign(54, floorY, 'ASTRAL GRAPPLE: Press [L] or [G] near glowing Cyan Anchors to swing across chasms!');

      // Second Lore Tablet & Guardian Knight before exit
      b.addBeacon(73, floorY, 'beacon_catacombs', 'Catacombs Awakening Shrine');
      b.addEnemy(79, floorY, 'stalker', 110);
      b.addTablet(84, floorY, 'tablet_2');
      b.addChest(87, floorY, 'catacombs_chest_2', { shards: 80, relic: 'astral_magnet' });

      // Portal to Zone 1: Haven of Dusk
      b.addPortal(90, floorY, 'haven', 160, 620, 'Ascend to Haven of Dusk [Press E / W]');

      levels.catacombs = {
        id: 'catacombs',
        name: 'Whispering Catacombs',
        subtitle: 'Prologue — Tomb of the Fallen Sentinel',
        biome: 'catacombs',
        spawn: { x: 160, y: (floorY - 2) * 40 },
        bossId: null,
        ...b
      };
    }

    // =========================================================================
    // ZONE 1: HAVEN OF DUSK (Interactive NPC Hub Town, Forge, Shop, Lore, Portals)
    // =========================================================================
    {
      const b = new MapBuilder(72, 20, T.ORNATE_BRICK);
      const floorY = 17;

      // Cathedral platforms & lanterns
      for (let c = 6; c < 66; c += 8) {
        b.addTorch(c, 13, '#f59e0b', 180);
      }
      b.platform(12, 13, 10, T.PLATFORM_ONEWAY);
      b.platform(28, 12, 14, T.PLATFORM_ONEWAY);
      b.platform(48, 13, 10, T.PLATFORM_ONEWAY);
      b.platform(31, 8, 8, T.PLATFORM_ONEWAY);

      // Rooftop Secret Stash in Haven
      b.addGrapple(26, 8);
      b.addGrapple(43, 8);
      b.addChest(34, 8, 'haven_rooftop_chest', { shards: 100 });
      b.addTablet(16, 13, 'tablet_3');

      // Central Astral Beacon
      b.addBeacon(22, floorY, 'beacon_haven', 'Haven Cathedral Hearth');

      // Town NPCs
      b.addNPC(18, floorY, 'lyra');    // Elder Lyra (Main Story & Codex)
      b.addNPC(28, floorY, 'bram');    // Forgemaster Bram (Weapon Forge)
      b.addNPC(36, floorY, 'sylvi');   // Sylvi the Merchant (Relics & Upgrades)
      b.addNPC(44, floorY, 'vesper');  // Vesper the Masked Crow (Combat Tips & Boss Rush)

      b.addSign(14, floorY, 'Interact with NPCs, Shrines, Chests & Portals using [E] or [Up Arrow]. Open Map/Menu with [M / Tab].');

      // World Zone Portals on the Eastern Gate promenade
      b.addPortal(52, floorY, 'outskirts', 140, 680, 'Act I: Sunken Outskirts', 0);
      b.addPortal(56, floorY, 'foundry', 140, 680, 'Act II: Ironhearth Foundry', 1);
      b.addPortal(60, floorY, 'caverns', 140, 680, 'Act III: Crystal Caverns', 2);
      b.addPortal(64, floorY, 'archive', 140, 680, 'Act IV: Sunken Archive', 3);
      b.addPortal(68, floorY, 'citadel', 140, 680, 'Act V: Obsidian Citadel', 4);

      // Upper balcony portal to Zone 7: Astral Crucible (Boss Rush Arena) and Zone 0
      b.addPortal(13, 13, 'catacombs', 2800, 620, 'Return to Catacombs', 0);
      b.addPortal(52, 13, 'crucible', 200, 600, 'Astral Crucible (Boss Rush)', 0);

      levels.haven = {
        id: 'haven',
        name: 'Haven of Dusk',
        subtitle: 'Sanctuary of the Last Remnant',
        biome: 'haven',
        spawn: { x: 840, y: (floorY - 2) * 40 },
        bossId: null,
        ...b
      };
    }

    // =========================================================================
    // ZONE 2: SUNKEN OUTSKIRTS & ROOT SANCTUM (Act I + Boss: Mossbound Warden)
    // =========================================================================
    {
      const b = new MapBuilder(125, 22, T.MOSS_STONE);
      const floorY = 19;

      b.addPortal(4, floorY, 'haven', 2040, 600, 'Return to Haven of Dusk');
      b.addBeacon(8, floorY, 'beacon_outskirts_1', 'Outskirts Bramble Gate');

      // Forest ruins, bounce pads, acid pools & enemies
      b.addEnemy(15, floorY, 'crawler', 150);
      b.addEnemy(21, floorY, 'spitter', 60);

      b.pit(24, 9, T.LAVA_ACID);
      b.platform(25, 16, 3, T.PLATFORM_ONEWAY);
      b.platform(29, 14, 3, T.PLATFORM_ONEWAY);
      b.addGrapple(28, 9);

      // Upper canopy path with Lore Tablet IV & Relic Chest
      b.platform(33, 11, 8, T.PLATFORM_ONEWAY);
      b.addTablet(36, 11, 'tablet_4');
      b.addEnemy(37, floorY, 'stalker', 140);
      b.addEnemy(43, floorY, 'spitter', 80);

      // Bounce Mushroom section & Crumbling Bridge
      b.fillRect(46, floorY - 1, 2, 1, T.BOUNCE_PAD);
      b.platform(49, 11, 7, T.PLATFORM_ONEWAY);
      b.addChest(53, 11, 'outskirts_chest_1', { shards: 110, relic: 'swiftstride_anklet' });

      b.pit(50, 12, T.LAVA_ACID);
      b.fillRect(52, 16, 3, 1, T.CRUMBLE_BLOCK);
      b.fillRect(57, 16, 3, 1, T.CRUMBLE_BLOCK);

      // Mid-level ruins & Shadow Gate shortcut
      b.addEnemy(65, floorY, 'stalker', 130);
      b.addEnemy(71, floorY, 'crawler', 160);
      b.fillRect(75, 13, 1, 6, T.SHADOW_GATE);
      b.fillRect(74, 12, 3, 1, T.MOSS_STONE);
      b.addTablet(79, floorY, 'tablet_5');

      // Chasm with moving platform & grapple
      b.pit(82, 11, T.SPIKES_UP);
      b.addMovingPlatform(83, 16, 89, 16, 3, 1.5);
      b.addGrapple(87, 10);
      b.addChest(87, 7, 'outskirts_chest_2', { shards: 130, weapon: 'ironhearth_cleaver' });
      b.platform(85, 7, 5, T.PLATFORM_ONEWAY);

      // Pre-Boss Shrine
      b.addBeacon(96, floorY, 'beacon_outskirts_boss', 'Sanctum Root Shrine');
      b.addSign(99, floorY, 'DANGER AHEAD: Sylvanus, The Mossbound Warden. Watch his root telegraphs and jump over shockwaves!');

      // Boss Arena (Cols 102 to 122)
      b.platform(105, 14, 4, T.PLATFORM_ONEWAY);
      b.platform(115, 14, 4, T.PLATFORM_ONEWAY);
      b.addPortal(121, floorY, 'haven', 2200, 600, 'Return to Haven (or Proceed)');

      levels.outskirts = {
        id: 'outskirts',
        name: 'Sunken Outskirts & Root Sanctum',
        subtitle: 'Act I — Domain of the Mossbound Warden',
        biome: 'outskirts',
        spawn: { x: 240, y: (floorY - 2) * 40 },
        bossId: 'moss_warden',
        bossTriggerX: 103 * 40,
        bossSpawn: { x: 114 * 40, y: (floorY - 3) * 40 },
        arenaBounds: { left: 102 * 40, right: 122 * 40, floorY: floorY * 40 },
        ...b
      };
    }

    // =========================================================================
    // ZONE 3: IRONHEARTH CLOCKWORK FOUNDRY (Act II + Boss: Clockwork Valkyrie)
    // =========================================================================
    {
      const b = new MapBuilder(128, 22, T.IRON_GIRDER);
      const floorY = 19;

      b.addPortal(4, floorY, 'haven', 2240, 600, 'Return to Haven of Dusk');
      b.addBeacon(8, floorY, 'beacon_foundry_1', 'Foundry Smelting Lift');

      // Conveyor belts & molten vats
      b.fillRect(13, floorY, 8, 1, T.CONVEYOR_RIGHT);
      b.addEnemy(17, floorY, 'drone', 160);
      b.addEnemy(22, floorY, 'welder', 110);

      b.pit(25, 10, T.LAVA_ACID);
      b.fillRect(27, 15, 6, 1, T.CONVEYOR_LEFT);
      b.addGrapple(30, 9);
      b.platform(28, 9, 5, T.PLATFORM_ONEWAY);
      b.addTablet(30, 9, 'tablet_6');

      // Unit-09 "Cog" NPC Alcove (Side Quest & Moral Choice!)
      b.addNPC(39, floorY, 'cog');
      b.addSign(37, floorY, 'Unit-09 "Cog": Speak with the awakened automaton to decide the fate of the Foundry Collective.');

      // Industrial Gauntlet
      b.addEnemy(46, floorY, 'welder', 130);
      b.addEnemy(52, 13, 'drone', 180);
      b.platform(48, 14, 7, T.PLATFORM_ONEWAY);
      b.fillRect(56, floorY - 1, 2, 1, T.BOUNCE_PAD);
      b.platform(59, 10, 8, T.PLATFORM_ONEWAY);
      b.addChest(63, 10, 'foundry_chest_1', { shards: 165, relic: 'aegis_crest' });

      // Lava chasm with moving girder platforms
      b.pit(60, 18, T.LAVA_ACID);
      b.addMovingPlatform(61, 16, 67, 16, 3, 1.8);
      b.addMovingPlatform(70, 14, 76, 14, 3, 1.8);
      b.addGrapple(69, 9);

      // Second section: Shadow Gates & Heavy Welders
      b.fillRect(81, 13, 1, 6, T.SHADOW_GATE);
      b.fillRect(80, 12, 3, 1, T.IRON_GIRDER);
      b.addEnemy(85, floorY, 'welder', 140);
      b.addEnemy(90, 13, 'drone', 160);
      b.addTablet(93, floorY, 'tablet_7');
      b.addChest(96, floorY, 'foundry_chest_2', { shards: 190, relic: 'crimson_fang' });

      // Pre-Boss Shrine
      b.addBeacon(99, floorY, 'beacon_foundry_boss', 'Furnace Core Conduit');
      b.addSign(101, floorY, 'WARNING: Seraph-IX, The Clockwork Valkyrie. Parry her plasma orbs and use platforms to dodge floor sweeps!');

      // Boss Arena (Cols 104 to 125)
      b.platform(107, 14, 4, T.PLATFORM_ONEWAY);
      b.platform(113, 11, 4, T.PLATFORM_ONEWAY);
      b.platform(119, 14, 4, T.PLATFORM_ONEWAY);
      b.addPortal(124, floorY, 'haven', 2400, 600, 'Return to Haven of Dusk');

      levels.foundry = {
        id: 'foundry',
        name: 'Ironhearth Clockwork Foundry',
        subtitle: 'Act II — Furnace of the Valkyrie',
        biome: 'foundry',
        spawn: { x: 240, y: (floorY - 2) * 40 },
        bossId: 'clockwork_valkyrie',
        bossTriggerX: 105 * 40,
        bossSpawn: { x: 116 * 40, y: (floorY - 5) * 40 },
        arenaBounds: { left: 104 * 40, right: 125 * 40, floorY: floorY * 40 },
        ...b
      };
    }

    // =========================================================================
    // ZONE 4: CRYSTAL CAVERNS OF ECHOING FROST (Act III + Boss: Glacial Wyrm)
    // =========================================================================
    {
      const b = new MapBuilder(128, 22, T.CRYSTAL_BLOCK);
      const floorY = 19;

      b.addPortal(4, floorY, 'haven', 2400, 600, 'Return to Haven of Dusk');
      b.addBeacon(8, floorY, 'beacon_caverns_1', 'Glacial Threshold Shrine');

      // Icy floors & Frost Wraiths
      b.fillRect(12, floorY, 14, 1, T.ICE_FLOOR);
      b.addEnemy(16, floorY, 'wraith', 150);
      b.addEnemy(23, floorY, 'golem', 110);

      // Scholar Mirabel NPC Camp
      b.addNPC(29, floorY, 'mirabel');
      b.addTablet(32, floorY, 'tablet_8');

      // Frozen Chasm with Grapple Anchors & Bounce Crystal
      b.pit(35, 14, T.SPIKES_UP);
      b.addGrapple(38, 11);
      b.addGrapple(44, 10);
      b.platform(40, 15, 3, T.PLATFORM_ONEWAY);
      b.platform(45, 8, 6, T.PLATFORM_ONEWAY);
      b.addChest(48, 8, 'caverns_chest_1', { shards: 220, weapon: 'frostbite_rapier' });

      // Crystal Golem & Ice Bridge
      b.fillRect(51, floorY, 16, 1, T.ICE_FLOOR);
      b.addEnemy(55, floorY, 'golem', 130);
      b.addEnemy(62, floorY, 'wraith', 160);
      b.platform(56, 13, 8, T.PLATFORM_ONEWAY);
      b.addChest(60, 13, 'caverns_chest_2', { shards: 180, relic: 'frostguard_ward' });

      // Crumbling Ice & Spike Ceiling Tunnel
      b.pit(69, 12, T.SPIKES_UP);
      b.fillRect(71, 15, 3, 1, T.CRUMBLE_BLOCK);
      b.fillRect(76, 14, 3, 1, T.CRUMBLE_BLOCK);
      b.fillRect(70, 8, 10, 1, T.SPIKES_DOWN);

      b.addEnemy(85, floorY, 'golem', 120);
      b.addEnemy(91, floorY, 'wraith', 140);
      b.addTablet(95, floorY, 'tablet_9');

      // Pre-Boss Shrine
      b.addBeacon(99, floorY, 'beacon_caverns_boss', 'Star-Drake Sanctum');
      b.addSign(101, floorY, 'DANGER: Vaelen, The Glacial Wyrm. Use grapple anchors or elevated platforms when he unleashes his frost beam!');

      // Boss Arena (Cols 104 to 125)
      b.fillRect(108, floorY, 12, 1, T.ICE_FLOOR);
      b.platform(107, 14, 4, T.PLATFORM_ONEWAY);
      b.platform(119, 14, 4, T.PLATFORM_ONEWAY);
      b.addGrapple(114, 8);
      b.addPortal(124, floorY, 'haven', 2560, 600, 'Return to Haven of Dusk');

      levels.caverns = {
        id: 'caverns',
        name: 'Crystal Caverns of Echoing Frost',
        subtitle: 'Act III — Lair of the Glacial Wyrm',
        biome: 'caverns',
        spawn: { x: 240, y: (floorY - 2) * 40 },
        bossId: 'glacial_wyrm',
        bossTriggerX: 105 * 40,
        bossSpawn: { x: 116 * 40, y: (floorY - 4) * 40 },
        arenaBounds: { left: 104 * 40, right: 125 * 40, floorY: floorY * 40 },
        ...b
      };
    }

    // =========================================================================
    // ZONE 5: THE SUNKEN ARCHIVE & ASTRAL SPIRE (Act IV + Boss: Inquisitor Thorne)
    // =========================================================================
    {
      const b = new MapBuilder(130, 22, T.ORNATE_BRICK);
      const floorY = 19;

      b.addPortal(4, floorY, 'haven', 2560, 600, 'Return to Haven of Dusk');
      b.addBeacon(8, floorY, 'beacon_archive_1', 'Archive Grand Rotunda');

      // Lore Tablet X right near the Archive entrance
      b.addTablet(12, floorY, 'tablet_10');
      b.addEnemy(18, floorY, 'weaver', 140);
      b.addEnemy(24, floorY, 'assassin', 170);

      // Multi-tiered library stacks
      b.platform(16, 14, 7, T.PLATFORM_ONEWAY);
      b.platform(25, 11, 8, T.PLATFORM_ONEWAY);
      b.addChest(29, 11, 'archive_chest_1', { shards: 260, weapon: 'voidweaver_scythe' });

      // Void Chasm with Shadow Gates & Moving Platforms
      b.pit(34, 14, T.SPIKES_UP);
      b.addMovingPlatform(35, 15, 41, 15, 3, 1.9);
      b.fillRect(42, 9, 1, 7, T.SHADOW_GATE);
      b.addGrapple(45, 9);

      // Lore Tablet XI (Malakor's Journal!)
      b.addTablet(51, floorY, 'tablet_11');
      b.addEnemy(56, floorY, 'assassin', 180);
      b.addEnemy(62, 13, 'weaver', 150);
      b.platform(58, 13, 8, T.PLATFORM_ONEWAY);

      // Bounce pad & Upper Vault with Relic
      b.fillRect(68, floorY - 1, 2, 1, T.BOUNCE_PAD);
      b.platform(71, 9, 8, T.PLATFORM_ONEWAY);
      b.addChest(75, 9, 'archive_chest_2', { shards: 240, relic: 'pogo_plume' });

      b.pit(72, 12, T.LAVA_ACID);
      b.addGrapple(76, 12);
      b.addGrapple(81, 12);

      // Final Archive Corridor & Lore Tablet XII
      b.addEnemy(87, floorY, 'assassin', 170);
      b.addEnemy(93, floorY, 'weaver', 140);
      b.addTablet(96, floorY, 'tablet_12');

      // Pre-Boss Shrine
      b.addBeacon(100, floorY, 'beacon_archive_boss', 'Astral Observatory Steps');
      b.addSign(102, floorY, 'DUEL AHEAD: Inquisitor Thorne, The Mirror Blade. Do not strike his purple Counter-Stance—Parry his lunge instead!');

      // Boss Arena (Cols 105 to 126)
      b.platform(109, 14, 4, T.PLATFORM_ONEWAY);
      b.platform(119, 14, 4, T.PLATFORM_ONEWAY);
      b.addPortal(125, floorY, 'haven', 2720, 600, 'Return to Haven (Speak to Elder Lyra!)');

      levels.archive = {
        id: 'archive',
        name: 'The Sunken Archive & Astral Spire',
        subtitle: 'Act IV — Vault of the Forbidden Truth',
        biome: 'archive',
        spawn: { x: 240, y: (floorY - 2) * 40 },
        bossId: 'inquisitor_thorne',
        bossTriggerX: 106 * 40,
        bossSpawn: { x: 117 * 40, y: (floorY - 2) * 40 },
        arenaBounds: { left: 105 * 40, right: 126 * 40, floorY: floorY * 40 },
        ...b
      };
    }

    // =========================================================================
    // ZONE 6: THE OBSIDIAN CITADEL & ECLIPSE THRONE (Act V + Final Boss: Malakor)
    // =========================================================================
    {
      const b = new MapBuilder(135, 22, T.OBSIDIAN_TILE);
      const floorY = 19;

      b.addPortal(4, floorY, 'haven', 2720, 600, 'Return to Haven of Dusk');
      b.addBeacon(8, floorY, 'beacon_citadel_1', 'Citadel Blood-Gate');

      // Lore Tablet XIII & Sovereign Gauntlet
      b.addTablet(12, floorY, 'tablet_13');
      b.addEnemy(18, floorY, 'assassin', 180);
      b.addEnemy(24, floorY, 'golem', 140);

      // Gauntlet Chasm 1: Conveyors + Grapple + Shadow Gate
      b.pit(28, 16, T.LAVA_ACID);
      b.fillRect(30, 15, 5, 1, T.CONVEYOR_LEFT);
      b.addGrapple(36, 9);
      b.fillRect(39, 8, 1, 8, T.SHADOW_GATE);
      b.platform(40, 14, 4, T.PLATFORM_ONEWAY);

      // Treasury of the First Dawn (Solaris Edge & Phoenix Ember!)
      b.fillRect(46, floorY - 1, 2, 1, T.BOUNCE_PAD);
      b.platform(49, 9, 10, T.PLATFORM_ONEWAY);
      b.addChest(52, 9, 'citadel_chest_1', { shards: 350, weapon: 'solaris_edge' });
      b.addChest(56, 9, 'citadel_chest_2', { shards: 250, relic: 'phoenix_ember' });

      b.addEnemy(52, floorY, 'weaver', 160);
      b.addEnemy(59, floorY, 'stalker', 150);
      b.addEnemy(66, floorY, 'assassin', 180);

      // Gauntlet Chasm 2: Crumble blocks + Moving Platforms + Grapple
      b.pit(70, 18, T.SPIKES_UP);
      b.fillRect(72, 16, 3, 1, T.CRUMBLE_BLOCK);
      b.addMovingPlatform(76, 15, 82, 15, 3, 2.1);
      b.addGrapple(85, 10);

      b.addEnemy(91, floorY, 'golem', 140);
      b.addEnemy(96, floorY, 'weaver', 150);

      // Final Lore Tablet XIV & Throne Room Beacon
      b.addTablet(100, floorY, 'tablet_14');
      b.addBeacon(103, floorY, 'beacon_citadel_throne', 'Altar of the Bleeding Sun');
      b.addSign(105, floorY, 'THE ECLIPSE THRONE: Archon Malakor awaits. Prepare your Relics, Skills, and Elixirs!');

      // Final Boss Arena (Cols 108 to 132)
      b.platform(112, 14, 4, T.PLATFORM_ONEWAY);
      b.platform(119, 11, 4, T.PLATFORM_ONEWAY);
      b.platform(126, 14, 4, T.PLATFORM_ONEWAY);
      b.addGrapple(115, 8);
      b.addGrapple(125, 8);

      levels.citadel = {
        id: 'citadel',
        name: 'The Obsidian Citadel & Eclipse Throne',
        subtitle: 'Act V — Seat of the Shattered Crown',
        biome: 'citadel',
        spawn: { x: 240, y: (floorY - 2) * 40 },
        bossId: 'archon_malakor',
        bossTriggerX: 109 * 40,
        bossSpawn: { x: 122 * 40, y: (floorY - 3) * 40 },
        arenaBounds: { left: 108 * 40, right: 132 * 40, floorY: floorY * 40 },
        ...b
      };
    }

    // =========================================================================
    // ZONE 7: THE ASTRAL CRUCIBLE (Boss Rush / Trial of Blades Arena Mode)
    // =========================================================================
    {
      const b = new MapBuilder(46, 20, T.ORNATE_BRICK);
      const floorY = 17;

      b.addPortal(4, floorY, 'haven', 2080, 440, 'Return to Haven of Dusk');
      b.addBeacon(8, floorY, 'beacon_crucible', 'Crucible Champion Shrine');
      b.addSign(11, floorY, 'THE ASTRAL CRUCIBLE: Step into the Colosseum (Right) to challenge all 5 Bosses in Boss Rush Mode!');

      // Grand Colosseum Arena (Cols 15 to 42)
      b.platform(19, 12, 4, T.PLATFORM_ONEWAY);
      b.platform(27, 9, 4, T.PLATFORM_ONEWAY);
      b.platform(35, 12, 4, T.PLATFORM_ONEWAY);
      b.addGrapple(23, 6);
      b.addGrapple(33, 6);

      levels.crucible = {
        id: 'crucible',
        name: 'The Astral Crucible',
        subtitle: 'Trial of Blades — Boss Rush Colosseum',
        biome: 'archive',
        spawn: { x: 240, y: (floorY - 2) * 40 },
        isBossRush: true,
        bossId: 'moss_warden',
        bossTriggerX: 16 * 40,
        bossSpawn: { x: 32 * 40, y: (floorY - 3) * 40 },
        arenaBounds: { left: 15 * 40, right: 42 * 40, floorY: floorY * 40 },
        ...b
      };
    }

    return levels;
  }

  Veyra.MapBuilder = MapBuilder;
  Veyra.LEVELS = buildAllLevels();
  Veyra.rebuildLevels = () => {
    Veyra.LEVELS = buildAllLevels();
    return Veyra.LEVELS;
  };
})();

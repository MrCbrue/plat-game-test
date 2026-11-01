/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Game Configuration, Constants, Weapons, Relics, Skills, Spells & Achievements
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});

  const CONFIG = {
    TITLE: 'CHRONICLES OF VEYRA',
    SUBTITLE: 'THE SHATTERED ECLIPSE',
    VERSION: '1.0.0',
    VIEWPORT_WIDTH: 1280,
    VIEWPORT_HEIGHT: 720,
    TILE_SIZE: 40,

    // Physics & Movement Tuning (60Hz normalized)
    PHYSICS: {
      GRAVITY: 1580,
      MAX_FALL_SPEED: 880,
      MOVE_SPEED: 310,
      GROUND_ACCEL: 2600,
      GROUND_DECEL: 2900,
      AIR_ACCEL: 1900,
      AIR_DECEL: 1200,
      JUMP_VELOCITY: -590,
      DOUBLE_JUMP_VELOCITY: -535,
      JUMP_CUT_MULTIPLIER: 0.46,
      COYOTE_TIME: 0.115,      // 115ms grace period after leaving ledge
      JUMP_BUFFER_TIME: 0.13,  // 130ms jump input buffer before landing
      WALL_SLIDE_SPEED: 145,
      WALL_JUMP_X: 390,
      WALL_JUMP_Y: -555,
      DASH_SPEED: 760,
      DASH_DURATION: 0.16,
      DASH_COOLDOWN: 0.58,
      GRAPPLE_SPEED: 920,
      GRAPPLE_RANGE: 380,
      PARRY_WINDOW: 0.22,
      PARRY_COOLDOWN: 0.65,
      POGO_BOUNCE_Y: -520,
      INVULN_DURATION: 0.85
    },

    // Tile IDs for Level Grid & Level Editor
    TILES: {
      EMPTY: 0,
      SOLID_STONE: 1,
      MOSS_STONE: 2,
      PLATFORM_ONEWAY: 3,
      SPIKES_UP: 4,
      SPIKES_DOWN: 5,
      LAVA_ACID: 6,
      CRUMBLE_BLOCK: 7,
      BOUNCE_PAD: 8,
      ICE_FLOOR: 9,
      CONVEYOR_LEFT: 10,
      CONVEYOR_RIGHT: 11,
      SHADOW_GATE: 12,     // Passable only while Shadow Dashing
      BREAKABLE_WALL: 13,  // Breakable by heavy/spell attack
      LADDER_VINE: 14,
      ORNATE_BRICK: 15,
      CRYSTAL_BLOCK: 16,
      IRON_GIRDER: 17,
      OBSIDIAN_TILE: 18
    },

    // Biome Visual Palettes
    BIOMES: {
      catacombs: {
        id: 'catacombs',
        name: 'Whispering Catacombs',
        skyTop: '#060711',
        skyBottom: '#13182e',
        fogColor: 'rgba(56, 189, 248, 0.07)',
        tilePrimary: '#1e293b',
        tileSecondary: '#334155',
        tileAccent: '#38bdf8',
        ambientLight: 0.72,
        weather: 'embers',
        musicTrack: 'catacombs'
      },
      haven: {
        id: 'haven',
        name: 'Haven of Dusk',
        skyTop: '#0c0a1d',
        skyBottom: '#271c3a',
        fogColor: 'rgba(245, 158, 11, 0.08)',
        tilePrimary: '#292524',
        tileSecondary: '#44403c',
        tileAccent: '#f59e0b',
        ambientLight: 0.9,
        weather: 'fireflies',
        musicTrack: 'haven'
      },
      outskirts: {
        id: 'outskirts',
        name: 'Sunken Outskirts & Root Sanctum',
        skyTop: '#051414',
        skyBottom: '#0f2e2a',
        fogColor: 'rgba(52, 211, 153, 0.08)',
        tilePrimary: '#142f29',
        tileSecondary: '#1f493f',
        tileAccent: '#34d399',
        ambientLight: 0.8,
        weather: 'spores',
        musicTrack: 'forest'
      },
      foundry: {
        id: 'foundry',
        name: 'Ironhearth Clockwork Foundry',
        skyTop: '#160906',
        skyBottom: '#33140b',
        fogColor: 'rgba(251, 146, 60, 0.09)',
        tilePrimary: '#2b1810',
        tileSecondary: '#4a2a1d',
        tileAccent: '#fb923c',
        ambientLight: 0.82,
        weather: 'ash',
        musicTrack: 'foundry'
      },
      caverns: {
        id: 'caverns',
        name: 'Crystal Caverns of Echoing Frost',
        skyTop: '#061024',
        skyBottom: '#0f284e',
        fogColor: 'rgba(125, 211, 252, 0.1)',
        tilePrimary: '#172554',
        tileSecondary: '#1e3a8a',
        tileAccent: '#67e8f9',
        ambientLight: 0.85,
        weather: 'snow',
        musicTrack: 'crystal'
      },
      archive: {
        id: 'archive',
        name: 'Sunken Archive & Astral Spire',
        skyTop: '#110726',
        skyBottom: '#2c1254',
        fogColor: 'rgba(192, 132, 252, 0.09)',
        tilePrimary: '#241242',
        tileSecondary: '#3b1d6b',
        tileAccent: '#c084fc',
        ambientLight: 0.82,
        weather: 'starlight',
        musicTrack: 'archive'
      },
      citadel: {
        id: 'citadel',
        name: 'Obsidian Citadel & Eclipse Throne',
        skyTop: '#09030a',
        skyBottom: '#290717',
        fogColor: 'rgba(244, 63, 94, 0.1)',
        tilePrimary: '#1c0b19',
        tileSecondary: '#38132e',
        tileAccent: '#f43f5e',
        ambientLight: 0.78,
        weather: 'eclipse_ash',
        musicTrack: 'citadel'
      }
    },

    // 5 Unlockable & Upgradable Weapons
    WEAPONS: [
      {
        id: 'duskblade',
        name: 'Tarnished Duskblade',
        baseDamage: 16,
        attackSpeed: 1.0,
        range: 64,
        critBonus: 0.05,
        color: '#38bdf8',
        glow: '#bae6fd',
        cost: 0,
        unlockedByDefault: true,
        desc: 'Standard-issue sentinel broadsword infused with faint twilight resonance. Balanced speed and reach.'
      },
      {
        id: 'ironhearth_cleaver',
        name: 'Ironhearth Greatsword',
        baseDamage: 26,
        attackSpeed: 0.84,
        range: 78,
        critBonus: 0.08,
        color: '#fb923c',
        glow: '#fed7aa',
        cost: 180,
        unlockedByDefault: false,
        desc: 'Forged in the molten conduits of Ironhearth. Heavy searing arcs deal massive stagger and cleave armor.'
      },
      {
        id: 'frostbite_rapier',
        name: 'Vaelen Frost-Needle',
        baseDamage: 19,
        attackSpeed: 1.28,
        range: 70,
        critBonus: 0.16,
        color: '#67e8f9',
        glow: '#cffafe',
        cost: 280,
        unlockedByDefault: false,
        desc: 'Crystalline dueling blade from the Echoing Frost. Lightning-fast strikes with high critical precision.'
      },
      {
        id: 'voidweaver_scythe',
        name: 'Astral Crescent Blade',
        baseDamage: 29,
        attackSpeed: 1.06,
        range: 84,
        critBonus: 0.14,
        color: '#c084fc',
        glow: '#f3e8ff',
        cost: 420,
        unlockedByDefault: false,
        desc: 'Curved archive relic that harvests extra Soul Mana on every strike and cuts through dimensional rifts.'
      },
      {
        id: 'solaris_edge',
        name: 'Reforged Solaris Edge',
        baseDamage: 40,
        attackSpeed: 1.18,
        range: 88,
        critBonus: 0.22,
        color: '#facc15',
        glow: '#fef9c3',
        cost: 650,
        unlockedByDefault: false,
        desc: 'The legendary blade of the First Dawn. Blazing golden arcs unleash radiant shockwaves at full combo.'
      }
    ],

    // 12 Equippable Relics (Charms) with Slot/Notch system
    RELICS: [
      {
        id: 'crimson_fang',
        name: 'Crimson Leech Fang',
        slots: 2,
        cost: 120,
        color: '#ef4444',
        desc: 'Restores 4 HP every time you defeat an enemy or land a 3-hit combo finisher on a boss.'
      },
      {
        id: 'swiftstride_anklet',
        name: 'Windrunner Anklet',
        slots: 1,
        cost: 90,
        color: '#34d399',
        desc: 'Increases movement speed by 15% and reduces Shadow Dash cooldown by 20%.'
      },
      {
        id: 'astral_magnet',
        name: 'Lodestone of Greed',
        slots: 1,
        cost: 75,
        color: '#facc15',
        desc: 'Pulls nearby Aether Shards and Soul Orbs toward you and increases shard drops by 25%.'
      },
      {
        id: 'aegis_crest',
        name: 'Parry Master Crest',
        slots: 2,
        cost: 150,
        color: '#38bdf8',
        desc: 'Widens the Parry window by 35% and causes successful parries to unleash a damaging shockwave.'
      },
      {
        id: 'soul_conduit',
        name: 'Echoing Soulstone',
        slots: 2,
        cost: 160,
        color: '#a855f7',
        desc: 'Increases Soul Mana gained per sword strike by 40% and reduces spell mana costs by 20%.'
      },
      {
        id: 'guardian_carapace',
        name: 'Mossbound Carapace',
        slots: 2,
        cost: 140,
        color: '#10b981',
        desc: 'Reduces all incoming damage by 20% and grants longer invulnerability frames after taking a hit.'
      },
      {
        id: 'glass_sigil',
        name: 'Executioner Sigil',
        slots: 3,
        cost: 240,
        color: '#f43f5e',
        desc: 'Increases all sword and spell damage by 35%, but increases damage taken by 15%.'
      },
      {
        id: 'clockwork_heart',
        name: 'Automaton Core',
        slots: 2,
        cost: 200,
        color: '#fb923c',
        desc: 'Slowly regenerates 1 HP every 2.5 seconds and passively generates 2 Mana per second.'
      },
      {
        id: 'frostguard_ward',
        name: 'Glacial Mirror Ward',
        slots: 1,
        cost: 110,
        color: '#67e8f9',
        desc: 'Grants full traction on icy surfaces and chills enemies that strike you in melee.'
      },
      {
        id: 'pogo_plume',
        name: 'Sky-Dancer Plume',
        slots: 1,
        cost: 95,
        color: '#e879f9',
        desc: 'Downward air pogo slashes deal +40% damage and reset both your Double Jump and Shadow Dash.'
      },
      {
        id: 'phoenix_ember',
        name: 'Ember of the Undying',
        slots: 3,
        cost: 300,
        color: '#f59e0b',
        desc: 'Once per Astral Beacon rest, fatal damage instead triggers a fiery explosion and heals 50% HP.'
      },
      {
        id: 'eclipse_crown_shard',
        name: 'Resonant Crown Fragment',
        slots: 2,
        cost: 0,
        color: '#fef08a',
        desc: 'Ancient royal relic. Reveals hidden secrets with a chime and boosts all attributes by 12%.'
      }
    ],

    // 3 Castable Arcane Spells
    SPELLS: [
      {
        id: 'eclipse_lance',
        name: 'Eclipse Lance',
        manaCost: 25,
        damageMult: 2.2,
        cooldown: 0.45,
        color: '#38bdf8',
        keyHint: 'Q / 1',
        desc: 'Hurls a piercing spear of compressed twilight that damages all enemies in a line and breaks barriers.'
      },
      {
        id: 'solaris_nova',
        name: 'Solaris Nova',
        manaCost: 35,
        damageMult: 2.7,
        cooldown: 0.8,
        color: '#f59e0b',
        keyHint: 'E / 2',
        desc: 'Detonates a radiant 360-degree burst around Kaelen, obliterating enemy projectiles and stunning foes.'
      },
      {
        id: 'chrono_mend',
        name: 'Astral Mend & Chrono Field',
        manaCost: 40,
        healAmount: 38,
        cooldown: 1.2,
        color: '#34d399',
        keyHint: 'R / 3',
        desc: 'Weaves temporal light to immediately restore 38 HP and briefly slow nearby enemies.'
      }
    ],

    // 15-Node Skill Tree across 3 Branches
    SKILLS: [
      // Branch 1: Vanguard (Combat)
      {
        id: 'vanguard_1',
        branch: 'Vanguard',
        tier: 1,
        name: 'Keen Edge I',
        cost: 1,
        req: null,
        desc: '+15% base melee weapon damage.'
      },
      {
        id: 'vanguard_2',
        branch: 'Vanguard',
        tier: 2,
        name: 'Lethal Precision',
        cost: 1,
        req: 'vanguard_1',
        desc: '+12% critical strike chance and +25% critical strike damage.'
      },
      {
        id: 'vanguard_3',
        branch: 'Vanguard',
        tier: 3,
        name: 'Riposte Mastery',
        cost: 2,
        req: 'vanguard_2',
        desc: 'Parrying an attack restores 20 Mana and guarantees your next strike is a Critical Hit.'
      },
      {
        id: 'vanguard_4',
        branch: 'Vanguard',
        tier: 4,
        name: 'Crescent Wave',
        cost: 2,
        req: 'vanguard_3',
        desc: 'The 3rd hit of your sword combo launches a ranged energy wave forward.'
      },
      {
        id: 'vanguard_5',
        branch: 'Vanguard',
        tier: 5,
        name: 'Duskblade Executioner',
        cost: 3,
        req: 'vanguard_4',
        desc: 'Deal +30% damage to enemies below 40% HP and bosses in Phase 2+.'
      },

      // Branch 2: Weaver (Arcane & Soul)
      {
        id: 'weaver_1',
        branch: 'Weaver',
        tier: 1,
        name: 'Deep Vessel',
        cost: 1,
        req: null,
        desc: 'Increases Maximum Soul Mana by +35.'
      },
      {
        id: 'weaver_2',
        branch: 'Weaver',
        tier: 2,
        name: 'Soul Siphon',
        cost: 1,
        req: 'weaver_1',
        desc: 'Melee strikes generate +35% more Soul Mana.'
      },
      {
        id: 'weaver_3',
        branch: 'Weaver',
        tier: 3,
        name: 'Arcane Amplification',
        cost: 2,
        req: 'weaver_2',
        desc: 'Eclipse Lance and Solaris Nova deal +28% spell damage.'
      },
      {
        id: 'weaver_4',
        branch: 'Weaver',
        tier: 4,
        name: 'Radiant Mend',
        cost: 2,
        req: 'weaver_3',
        desc: 'Astral Mend heals an extra +20 HP and grants a brief damage shield.'
      },
      {
        id: 'weaver_5',
        branch: 'Weaver',
        tier: 5,
        name: 'Archon Convergence',
        cost: 3,
        req: 'weaver_4',
        desc: 'Casting any spell empowers your blade with bonus arcane lightning for 5 seconds.'
      },

      // Branch 3: Windrunner (Mobility & Survival)
      {
        id: 'wind_1',
        branch: 'Windrunner',
        tier: 1,
        name: 'Sentinel Vitality',
        cost: 1,
        req: null,
        desc: 'Increases Maximum HP by +30 and refills health immediately.'
      },
      {
        id: 'wind_2',
        branch: 'Windrunner',
        tier: 2,
        name: 'Phase Cloak',
        cost: 1,
        req: 'wind_1',
        desc: 'Shadow Dash travels 20% farther and damages enemies you dash through.'
      },
      {
        id: 'wind_3',
        branch: 'Windrunner',
        tier: 3,
        name: 'Alchemist Pouch',
        cost: 2,
        req: 'wind_2',
        desc: 'Increases max Crimson Elixirs carried by +2 and boosts potion healing by 25%.'
      },
      {
        id: 'wind_4',
        branch: 'Windrunner',
        tier: 4,
        name: 'Grapple Overdrive',
        cost: 2,
        req: 'wind_3',
        desc: 'Astral Grapple pulls you 30% faster and grants brief invulnerability on arrival.'
      },
      {
        id: 'wind_5',
        branch: 'Windrunner',
        tier: 5,
        name: 'Wings of the Sovereign',
        cost: 3,
        req: 'wind_4',
        desc: 'Unlocks a 3rd mid-air jump (Triple Jump) and +2 Relic Slot capacity.'
      }
    ],

    // Shop Consumables & Upgrades
    SHOP_ITEMS: [
      {
        id: 'elixir_refill',
        name: 'Crimson Elixir Flask',
        cost: 45,
        type: 'consumable',
        desc: 'Adds +1 Crimson Elixir charge to your belt (Press H or C to drink and heal 55 HP).'
      },
      {
        id: 'heart_crystal',
        name: 'Solaris Heart Crystal',
        cost: 160,
        type: 'perm_hp',
        maxPurchases: 5,
        desc: 'Permanently increases your Maximum HP by +25 and fully restores health.'
      },
      {
        id: 'mana_vessel',
        name: 'Astral Soul Vessel',
        cost: 140,
        type: 'perm_mana',
        maxPurchases: 5,
        desc: 'Permanently increases your Maximum Mana by +25 and refills mana.'
      },
      {
        id: 'relic_notch',
        name: 'Celestial Relic Notch',
        cost: 190,
        type: 'perm_notch',
        maxPurchases: 4,
        desc: 'Permanently adds +1 Relic Slot so you can equip more charms simultaneously.'
      }
    ],

    // 24 Unlockable Achievements
    ACHIEVEMENTS: [
      { id: 'awaken', title: 'Awakened Sentinel', desc: 'Complete the Whispering Catacombs prologue.', icon: '⚔️' },
      { id: 'first_blood', title: 'First Blood', desc: 'Defeat your first corrupted enemy in Veyra.', icon: '🩸' },
      { id: 'parry_master', title: 'Aegis Deflection', desc: 'Successfully parry 10 enemy attacks or projectiles.', icon: '🛡️' },
      { id: 'pogo_knight', title: 'Sky-Dancer', desc: 'Bounce 5 times using downward pogo strikes without touching the ground.', icon: '🦅' },
      { id: 'boss_1', title: 'Root-Breaker', desc: 'Defeat Sylvanus, The Mossbound Warden in the Sunken Outskirts.', icon: '🌿' },
      { id: 'boss_2', title: 'Decommissioned', desc: 'Defeat Seraph-IX, The Clockwork Valkyrie in Ironhearth Foundry.', icon: '⚙️' },
      { id: 'boss_3', title: 'Dragon Slayer', desc: 'Defeat Vaelen, The Glacial Wyrm in the Crystal Caverns.', icon: '❄️' },
      { id: 'boss_4', title: 'Shadow Shattered', desc: 'Defeat Inquisitor Thorne in the Sunken Archive.', icon: '🔮' },
      { id: 'boss_5', title: 'Sovereign of Dawn', desc: 'Defeat Archon Malakor at the Eclipse Throne.', icon: '👑' },
      { id: 'forged_max', title: 'Masterwork Blade', desc: 'Upgrade any weapon to Tier +5 at Forgemaster Bram.', icon: '🔨' },
      { id: 'collector_weapons', title: 'Arsenal of Veyra', desc: 'Acquire all 5 weapons in the game.', icon: '🗡️' },
      { id: 'collector_relics', title: 'Relic Hunter', desc: 'Discover or purchase at least 8 Relics.', icon: '📿' },
      { id: 'lore_scholar', title: 'Chronicler of the Fall', desc: 'Read 10 Ancient Lore Tablets across Veyra.', icon: '📜' },
      { id: 'quest_champion', title: 'Hero of Haven', desc: 'Complete 4 NPC quests for the survivors of Veyra.', icon: '🌟' },
      { id: 'skill_master', title: 'Ascendant Sentinel', desc: 'Unlock 8 nodes in the Sentinel Skill Tree.', icon: '✨' },
      { id: 'combo_ss', title: 'Relentless Flurry', desc: 'Reach SS Combo Rank during combat.', icon: '🔥' },
      { id: 'wealthy', title: 'Hoard of the Crown', desc: 'Hold 1,000 Aether Shards at once.', icon: '💎' },
      { id: 'untouchable', title: 'Untouchable Duelist', desc: 'Defeat any Boss while taking 0 damage.', icon: '👁️' },
      { id: 'boss_rush_clear', title: 'Champion of the Crucible', desc: 'Conquer the Astral Crucible Boss Rush mode.', icon: '🏆' },
      { id: 'architect', title: 'World Architect', desc: 'Create and playtest a custom level in the Level Editor.', icon: '🧱' },
      { id: 'ending_dawn', title: 'The Reforged Dawn', desc: 'Witness the Order Ending and restore the sun.', icon: '☀️' },
      { id: 'ending_twilight', title: 'Lord of the Eclipse', desc: 'Claim the Shattered Crown for yourself in the Twilight Ending.', icon: '🌑' },
      { id: 'ending_true', title: 'Eternal Equilibrium', desc: 'Unlock the True Ending by uncovering the ancient truth of Veyra.', icon: '🌌' },
      { id: 'speedrunner', title: 'Blitz Sentinel', desc: 'Clear any zone in under 90 seconds.', icon: '⏱️' }
    ]
  };

  Veyra.CONFIG = CONFIG;
})();

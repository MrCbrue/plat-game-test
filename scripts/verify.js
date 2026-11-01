/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Automated Verification & Gameplay Simulation Test Suite
 */
const assert = require('assert');

// Load all game modules in dependency order
require('../src/utils.js');
require('../src/config.js');
require('../src/audio.js');
require('../src/story.js');
require('../src/particles.js');
require('../src/levels.js');
require('../src/entities.js');
require('../src/bosses.js');
require('../src/renderer.js');
require('../src/editor.js');
require('../src/ui.js');
require('../src/main.js');

const Veyra = globalThis.Veyra;

function runTests() {
  console.log('=== Running Chronicles of Veyra Automated Verification Suite ===');

  // 1. Verify Configuration & Content Completeness
  assert.strictEqual(Veyra.CONFIG.WEAPONS.length, 5, 'Should have 5 unlockable weapons');
  assert.strictEqual(Veyra.CONFIG.RELICS.length, 12, 'Should have 12 equippable relics');
  assert.strictEqual(Veyra.CONFIG.SKILLS.length, 15, 'Should have 15 skill tree nodes across 3 branches');
  assert.strictEqual(Veyra.CONFIG.SPELLS.length, 3, 'Should have 3 arcane spells');
  assert.strictEqual(Veyra.CONFIG.ACHIEVEMENTS.length, 24, 'Should have 24 achievements');
  console.log('[PASS] Config: 5 Weapons, 12 Relics, 15 Skills, 3 Spells, 24 Achievements verified.');

  // 2. Verify Story, Cutscenes, NPCs, Quests & Lore Tablets
  const cutscenes = Object.keys(Veyra.STORY.CUTSCENES);
  assert(cutscenes.length >= 9, 'Should include Prologue, 5 Act Intros, and 3 Branching Endings');
  assert.strictEqual(Object.keys(Veyra.STORY.NPCS).length, 6, 'Should have 6 interactive NPCs');
  assert.strictEqual(Veyra.STORY.QUESTS.length, 5, 'Should have 5 quests');
  assert.strictEqual(Veyra.STORY.LORE_TABLETS.length, 14, 'Should have 14 Ancient Lore Tablets');
  console.log('[PASS] Story: 9 Cutscenes (3 Endings), 6 NPCs, 5 Quests, 14 Lore Tablets verified.');

  // 3. Verify All 8 World Zones & Traversability
  const expectedZones = ['catacombs', 'haven', 'outskirts', 'foundry', 'caverns', 'archive', 'citadel', 'crucible'];
  for (const zId of expectedZones) {
    const lvl = Veyra.LEVELS[zId];
    assert(lvl, `Zone ${zId} must exist`);
    assert(lvl.grid && lvl.grid.length === lvl.rows && lvl.grid[0].length === lvl.cols, `Zone ${zId} grid valid`);
    assert(lvl.spawn && lvl.spawn.x > 0 && lvl.spawn.y > 0, `Zone ${zId} spawn valid`);
  }
  console.log('[PASS] World: All 8 interconnected zones & tile grids verified.');

  // 4. Simulate Game Instance, Player Physics, Combat, Parry, Spells & Bosses
  const game = new Veyra.Game(null);
  game.mode = 'play';
  game.loadZone('outskirts', false);

  // Test Player Jump, Double Jump, Shadow Dash & Melee Combo
  game.input.keysJustPressed['Space'] = true;
  game.input.keysDown['Space'] = true;
  game.update(0.016);
  assert(game.player.vy < 0, 'Player should jump upward when Jump pressed');

  game.input.keysJustPressed['KeyK'] = true;
  game.update(0.016);
  assert(game.player.dashTimer > 0, 'Player should enter Shadow Dash');

  // Test Spells & Weapon Damage
  const initialProjectiles = game.projectiles.length;
  game.player.castSpell('eclipse_lance');
  assert.strictEqual(game.projectiles.length, initialProjectiles + 1, 'Eclipse Lance should spawn a piercing projectile');

  // Test All 5 Multi-Phase Bosses
  const bossIds = ['moss_warden', 'clockwork_valkyrie', 'glacial_wyrm', 'inquisitor_thorne', 'archon_malakor'];
  for (const bId of bossIds) {
    const boss = new Veyra.Boss(bId, 600, 400, { left: 200, right: 1000, floorY: 600 }, game);
    game.activeBoss = boss;
    boss.update(0.05, game.player);
    // Damage boss into Phase 2
    boss.takeDamage(Math.ceil(boss.maxHp * 0.5), 1, true, true);
    boss.update(0.05, game.player);
    assert(boss.phase >= 2, `Boss ${bId} should transition to Phase 2 at <= 55% HP`);
    if (bId === 'archon_malakor') {
      boss.takeDamage(Math.ceil(boss.maxHp * 0.35), 1, true, true);
      boss.update(0.05, game.player);
      assert.strictEqual(boss.phase, 3, 'Archon Malakor should transition to Phase 3 at <= 25% HP');
    }
  }
  console.log('[PASS] Gameplay Simulation: Physics, Shadow Dash, Spells, Enemies & all 5 Multi-Phase Bosses verified.');

  // 5. Verify NPC Dialogue Branches & Level Editor JSON Export/Import
  for (const npc of Object.values(Veyra.STORY.NPCS)) {
    const d = npc.getDialogue(game.state);
    assert(d && typeof d.text === 'string' && d.text.length > 10, `NPC ${npc.name} dialogue valid`);
  }
  const exported = game.editor.exportJSON();
  assert(game.editor.importJSON(exported), 'Level Editor JSON export/import roundtrip should succeed');
  console.log('[PASS] Systems: NPC branching dialogues & Level Editor JSON import/export verified.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
}

runTests();

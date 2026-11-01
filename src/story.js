/**
 * Chronicles of Veyra: The Shattered Eclipse
 * Extensive Story Script: 5 Acts, Cutscenes, NPCs, Branching Choices, Quests, 14 Lore Tablets & 3 Endings
 */
(function () {
  const Veyra = (globalThis.Veyra = globalThis.Veyra || {});

  const STORY = {
    // Cinematic Multi-Slide Cutscenes
    CUTSCENES: {
      prologue: {
        id: 'prologue',
        title: 'PROLOGUE: THE NIGHT THE SUN WEPT',
        music: 'menu',
        slides: [
          {
            artStyle: 'eclipse_crown',
            caption: 'For a thousand cycles, the Kingdom of Veyra flourished beneath the golden radiance of the Solaris Crown—an ancient celestial relic said to have been forged by the First Dawn.',
            speaker: 'Chronicler Lyra',
            subtitle: 'Archive of the Seventh Age'
          },
          {
            artStyle: 'shattering',
            caption: 'Then came the Night of the Weeping Sun. Archon Malakor, Grand Commander of the Duskblade Sentinels and mentor to the realm\'s finest knights, ascended the Obsidian Spire and shattered the Solaris Crown into five Eclipse Shards.',
            speaker: 'Chronicler Lyra',
            subtitle: 'The Betrayal at the Spire'
          },
          {
            artStyle: 'corruption',
            caption: 'Eternal twilight swallowed Veyra. The royal guardians twisted into hollow monstrosities, the Clockwork Foundry went feral, and the Frost Wyrms of the deep caverns awoke in madness.',
            speaker: 'Chronicler Lyra',
            subtitle: 'The Blight of Twilight'
          },
          {
            artStyle: 'awakening',
            caption: 'Cast into the Whispering Catacombs after your final duel with Malakor, your shattered body slumbered for three winters... until a single spark of the Crown called your soul back to the blade. Rise, Kaelen. The Eclipse awaits.',
            speaker: 'Resonant Voice',
            subtitle: 'Whispering Catacombs — Present Day'
          }
        ]
      },

      act1_intro: {
        id: 'act1_intro',
        title: 'ACT I: HAVEN OF THE LAST EMBER',
        music: 'haven',
        slides: [
          {
            artStyle: 'haven_town',
            caption: 'Emerging from the subterranean tombs, Kaelen discovers Haven of Dusk—a lantern-lit refuge built inside a collapsed cathedral where the last uncorrupted survivors of Veyra gather.',
            speaker: 'Narrator',
            subtitle: 'Haven of Dusk'
          },
          {
            artStyle: 'outskirts_roots',
            caption: 'Beyond Haven\'s gates lie the Sunken Outskirts, where Sylvanus, the Mossbound Warden, holds the first Eclipse Shard within a stranglehold of blighted roots.',
            speaker: 'Elder Lyra',
            subtitle: 'Keeper of the Remnant'
          }
        ]
      },

      act2_intro: {
        id: 'act2_intro',
        title: 'ACT II: THE CLOCKWORK FOUNDRY',
        music: 'foundry',
        slides: [
          {
            artStyle: 'foundry_gears',
            caption: 'With the Root Shard reclaimed, the great lift to Ironhearth Foundry groans to life. Rivers of molten aether power a legion of sentient automatons now enslaved by Malakor\'s directive.',
            speaker: 'Narrator',
            subtitle: 'Ironhearth Clockwork Foundry'
          },
          {
            artStyle: 'valkyrie_silhouette',
            caption: 'At the furnace core stands Seraph-IX, the Clockwork Valkyrie—programed to incinerate any intruder who dares approach the Second Eclipse Shard.',
            speaker: 'Unit-09 "Cog"',
            subtitle: 'Awakened Automaton Rebel'
          }
        ]
      },

      act3_intro: {
        id: 'act3_intro',
        title: 'ACT III: THE ECHOING FROST',
        music: 'crystal',
        slides: [
          {
            artStyle: 'crystal_cavern',
            caption: 'Past the Foundry\'s exhaust peaks plunge the Crystal Caverns of Echoing Frost. Here, frozen starlight refracts through colossal prisms that preserve memories of the First Age.',
            speaker: 'Mirabel the Archivist',
            subtitle: 'Exiled Royal Scholar'
          },
          {
            artStyle: 'wyrm_shadow',
            caption: 'Beware the subterranean gale: Vaelen, the Glacial Wyrm, coils around the Third Shard, freezing time and bone alike.',
            speaker: 'Vesper the Masked Crow',
            subtitle: 'Fellow Survivor'
          }
        ]
      },

      act4_intro: {
        id: 'act4_intro',
        title: 'ACT IV: THE SUNKEN ARCHIVE',
        music: 'archive',
        slides: [
          {
            artStyle: 'astral_archive',
            caption: 'Deep within the Sunken Archive, forbidden tablets reveal a shocking truth: the Solaris Crown was never a blessing. It was a gilded cage built to imprison Nyxara, the Primordial Void.',
            speaker: 'Elder Lyra',
            subtitle: 'The Forbidden Truth'
          },
          {
            artStyle: 'inquisitor_duel',
            caption: 'When the cage began to crack, Archon Malakor shattered the Crown intentionally to scatter Nyxara\'s essence into five vessels—bearing the curse himself. Blocking the Spire stands Inquisitor Thorne, your former brother-in-arms.',
            speaker: 'Inquisitor Thorne',
            subtitle: 'Grand Duelist of the Spire'
          }
        ]
      },

      act5_intro: {
        id: 'act5_intro',
        title: 'ACT V: THE OBSIDIAN CITADEL',
        music: 'citadel',
        slides: [
          {
            artStyle: 'eclipse_throne',
            caption: 'Four Shards resonate upon your belt. Before you towers the Obsidian Citadel, suspended beneath a bleeding black sun. Archon Malakor waits upon the Eclipse Throne, his humanity nearly consumed by the Void he holds at bay.',
            speaker: 'Narrator',
            subtitle: 'The Final Ascent'
          }
        ]
      },

      // 3 Branching Endings!
      ending_dawn: {
        id: 'ending_dawn',
        title: 'ENDING A: THE REFORGED DAWN',
        music: 'haven',
        slides: [
          {
            artStyle: 'reforged_crown',
            caption: 'As Archon Malakor falls, Kaelen unites the five Eclipse Shards upon the Obsidian Altar. Golden fire erupts across the firmament, banishing the eternal twilight and sealing the abyss once more.',
            speaker: 'Epilogue',
            subtitle: 'The Sun Returns to Veyra'
          },
          {
            artStyle: 'haven_sunrise',
            caption: 'In Haven of Dusk, Forgemaster Bram, Sylvi, and Elder Lyra step into warm sunlight for the first time in three years. Though the ancient cycle will one day test Veyra again, the Duskblade Sentinel stands watch over a reborn dawn.',
            speaker: 'Chronicler Lyra',
            subtitle: 'FIN — Order Restored'
          }
        ]
      },

      ending_twilight: {
        id: 'ending_twilight',
        title: 'ENDING B: SOVEREIGN OF THE ECLIPSE',
        music: 'citadel',
        slides: [
          {
            artStyle: 'twilight_throne',
            caption: 'Having harvested the Astral Cores and embraced ruthless power throughout your journey, Kaelen refuses to reforge the gilded cage. Instead, you draw all five Eclipse Shards directly into your Duskblade.',
            speaker: 'Epilogue',
            subtitle: 'The New Archon'
          },
          {
            artStyle: 'eclipse_crown',
            caption: 'Neither sun nor void shall rule Veyra—only the immortal blade of its new Sovereign. From the Obsidian Throne, Kaelen commands an empire of eternal, unyielding twilight.',
            speaker: 'Sovereign Kaelen',
            subtitle: 'FIN — Path of Conquest'
          }
        ]
      },

      ending_true: {
        id: 'ending_true',
        title: 'TRUE ENDING: THE ETERNAL EQUILIBRIUM',
        music: 'crystal',
        slides: [
          {
            artStyle: 'true_harmony',
            caption: 'Armed with the wisdom of the Ancient Lore Tablets and the compassion shown to every soul in Veyra, Kaelen stays the final blow against Archon Malakor and channels the Astral Convergence.',
            speaker: 'Epilogue',
            subtitle: 'Breaking the Primordial Curse'
          },
          {
            artStyle: 'shattering',
            caption: 'Together, mentor and apprentice sever Nyxara\'s parasitic bond without imprisoning the world in false light or endless dark. Day and night return in natural harmony—starlight and sunrise weaving a truly free age.',
            speaker: 'Archon Malakor & Elder Lyra',
            subtitle: 'TRUE FIN — Chronicles of Veyra Complete'
          }
        ]
      }
    },

    // Detailed NPC Definitions & Interactive Dialogue Trees
    NPCS: {
      lyra: {
        id: 'lyra',
        name: 'Elder Lyra',
        role: 'Chronicler of the Remnant',
        voicePitch: 420,
        color: '#38bdf8',
        cloakColor: '#1e3a8a',
        accentColor: '#fef08a',
        getDialogue(state) {
          const bosses = state.defeatedBosses || [];
          const tablets = (state.readTablets || []).length;

          if (!state.flags.metLyra) {
            return {
              text: 'By the First Star... Kaelen! We thought you perished when Archon Malakor cast you from the Spire three winters ago. Look around you—Haven of Dusk is all that remains of free Veyra. The Solaris Crown was shattered into five Eclipse Shards, and each corrupts the realm\'s guardians.',
              choices: [
                {
                  label: 'I will reclaim the Shards and protect the survivors.',
                  effect: (s) => {
                    s.flags.metLyra = true;
                    s.alignment = (s.alignment || 0) + 1;
                    s.shards = (s.shards || 0) + 50;
                    Veyra.events.emit('quest_updated', 'Take these 50 Aether Shards for supplies.');
                  },
                  nextText: 'Your compassion has not faded, Sentinel. Take these 50 Aether Shards to prepare at Bram\'s Forge. Head east into the Sunken Outskirts—Sylvanus, the Mossbound Warden, holds the First Shard.'
                },
                {
                  label: 'Malakor will pay in blood. Tell me where to strike first.',
                  effect: (s) => {
                    s.flags.metLyra = true;
                    s.alignment = (s.alignment || 0) - 1;
                    s.shards = (s.shards || 0) + 50;
                  },
                  nextText: 'Vengeance is a sharp blade, Kaelen, though it cuts both hands. Take these 50 Aether Shards. Your path begins east in the Sunken Outskirts, where the Mossbound Warden guards the First Shard.'
                }
              ]
            };
          }

          if (tablets >= 6 && !state.flags.lyraDecodedTruth) {
            return {
              text: `You have deciphered ${tablets} Ancient Lore Tablets! Wait... let me read these rubbings together. Gods above! The Solaris Crown wasn't a divine gift—it was a seal containing Nyxara, an ancient Void entity! Malakor shattered the Crown to stop Nyxara from breaking free all at once!`,
              choices: [
                {
                  label: 'Then we must save Malakor and sever the Void for good!',
                  effect: (s) => {
                    s.flags.lyraDecodedTruth = true;
                    s.alignment = (s.alignment || 0) + 2;
                    s.skillPoints = (s.skillPoints || 0) + 2;
                  },
                  nextText: 'Yes! With this forbidden synthesis, when you face Malakor on the Eclipse Throne, you can awaken the True Equilibrium! Take +2 Skill Points of ancient insight, Kaelen!'
                }
              ]
            };
          }

          if (bosses.length === 0) {
            return {
              text: 'Venture into the Sunken Outskirts to the east, Kaelen. Remember: you can Parry enemy attacks with [F / Shift], Dash through shadows with [K / X], and strike downward in mid-air to Pogo-bounce off foes and spikes!',
              choices: [
                { label: 'View Lore Codex & Advice', action: 'open_codex' },
                { label: 'I am ready.', action: 'close' }
              ]
            };
          } else if (bosses.length === 1) {
            return {
              text: 'You reclaimed the Root Shard from Sylvanus! The great lift to the Ironhearth Clockwork Foundry (Zone 3) is now active. Watch out for Unit-09 and the Clockwork Valkyrie Seraph-IX.',
              choices: [
                { label: 'Open Lore Codex', action: 'open_codex' },
                { label: 'Onward to Ironhearth.', action: 'close' }
              ]
            };
          } else if (bosses.length === 2) {
            return {
              text: 'Two Eclipse Shards recovered! Deep beyond the Foundry lie the Crystal Caverns of Echoing Frost (Zone 4). My former apprentice Mirabel was researching the Glacial Wyrm there.',
              choices: [
                { label: 'Open Lore Codex', action: 'open_codex' },
                { label: 'I will find Mirabel.', action: 'close' }
              ]
            };
          } else if (bosses.length === 3) {
            return {
              text: 'Three Shards resonate in harmony. The Sunken Archive (Zone 5) is now unsealed. Uncover the Lore Tablets within its halls before facing Inquisitor Thorne!',
              choices: [
                { label: 'Open Lore Codex', action: 'open_codex' },
                { label: 'To the Sunken Archive.', action: 'close' }
              ]
            };
          } else {
            return {
              text: 'The Obsidian Citadel (Zone 6) stands open. Archon Malakor awaits upon the Eclipse Throne. Whatever happens above the clouds, Kaelen... thank you for giving Veyra hope.',
              choices: [
                { label: 'Open Lore Codex', action: 'open_codex' },
                { label: 'For the Dawn.', action: 'close' }
              ]
            };
          }
        }
      },

      bram: {
        id: 'bram',
        name: 'Forgemaster Bram',
        role: 'Master Blacksmith of Ironhearth',
        voicePitch: 210,
        color: '#fb923c',
        cloakColor: '#7c2d12',
        accentColor: '#fdba74',
        getDialogue(state) {
          return {
            text: 'Hah! Still breathing, Duskblade? My anvil never cools, even in eternal night! Bring me Aether Shards and I\'ll temper your blades up to Tier +5 or forge new legendary steel for your arsenal!',
            choices: [
              { label: 'Open Weapon Forge & Upgrades', action: 'open_forge' },
              {
                label: state.flags.bramGift ? 'How is the forge holding up?' : 'Do you have any spare whetstones for the road?',
                effect: (s) => {
                  if (!s.flags.bramGift) {
                    s.flags.bramGift = true;
                    s.weaponUpgrades.duskblade = Math.max(1, s.weaponUpgrades.duskblade || 0);
                  }
                },
                nextText: 'Hah! On the house, kid—I\'ve honed the edge of your Tarnished Duskblade to +1! Now get out there and test that steel on some monsters!'
              },
              { label: 'Farewell, Bram.', action: 'close' }
            ]
          };
        }
      },

      sylvi: {
        id: 'sylvi',
        name: 'Sylvi the Wayfarer',
        role: 'Curio & Relic Merchant',
        voicePitch: 490,
        color: '#c084fc',
        cloakColor: '#4c1d95',
        accentColor: '#f5d0fe',
        getDialogue(state) {
          return {
            text: 'Psst! Over here, Sentinel! While everyone else hides behind Haven\'s walls, I scavenge the ruins for enchanted Relics, Heart Crystals, and Astral Vessels. Care to browse my curios?',
            choices: [
              { label: 'Browse Curio & Relic Shop', action: 'open_shop' },
              { label: 'Manage Equipped Relics', action: 'open_inventory' },
              { label: 'See you around, Sylvi.', action: 'close' }
            ]
          };
        }
      },

      cog: {
        id: 'cog',
        name: 'Unit-09 "Cog"',
        role: 'Awakened Automaton Engineer',
        voicePitch: 560,
        color: '#34d399',
        cloakColor: '#065f46',
        accentColor: '#fef08a',
        getDialogue(state) {
          if (!state.flags.cogChoiceMade) {
            return {
              text: 'BZZT—Sentinel Kaelen detected! My sibling automatons in Ironhearth Foundry are trapped under Archon Malakor\'s override signal. Will you recalibrate the Foundry Beacon to free their minds, or harvest their Astral Cores for raw weapon power?',
              choices: [
                {
                  label: '[Mercy] Free the Automatons — Every soul deserves liberty.',
                  effect: (s) => {
                    s.flags.cogChoiceMade = 'mercy';
                    s.alignment = (s.alignment || 0) + 2;
                    if (!s.ownedRelics.includes('clockwork_heart')) s.ownedRelics.push('clockwork_heart');
                    s.quests.foundry_souls = 'completed';
                  },
                  nextText: 'GRATITUDE OVERFLOW! You have liberated the Collective! Please accept my spare [Automaton Core] Relic—it will passively mend your wounds and generate Mana forever!'
                },
                {
                  label: '[Power] Harvest the Astral Cores — I need strength to slay Malakor.',
                  effect: (s) => {
                    s.flags.cogChoiceMade = 'power';
                    s.alignment = (s.alignment || 0) - 2;
                    s.shards = (s.shards || 0) + 250;
                    s.skillPoints = (s.skillPoints || 0) + 1;
                    s.quests.foundry_souls = 'completed';
                  },
                  nextText: 'BZZT... Directive accepted with sorrow. Their harvested cores yield +250 Aether Shards and +1 Skill Point. May our sacrifice not be in vain...'
                }
              ]
            };
          }
          return {
            text: state.flags.cogChoiceMade === 'mercy'
              ? 'BZZT! The liberated Automatons are reinforcing Haven\'s defenses! Your Astral Grapple and Shadow Dash systems are running at 100% efficiency!'
              : 'BZZT... Systems nominal, Sentinel. The Foundry furnaces burn quietly now.',
            choices: [
              { label: 'Open Sentinel Skill Tree', action: 'open_skills' },
              { label: 'Stay safe, Cog.', action: 'close' }
            ]
          };
        }
      },

      mirabel: {
        id: 'mirabel',
        name: 'Mirabel the Archivist',
        role: 'Scholar of the Echoing Frost',
        voicePitch: 460,
        color: '#67e8f9',
        cloakColor: '#155e75',
        accentColor: '#cffafe',
        getDialogue(state) {
          const tablets = (state.readTablets || []).length;
          if (!state.flags.mirabelReward && tablets >= 3) {
            return {
              text: `Marvelous! You've already recorded ${tablets} Ancient Lore Tablets in your Codex! Here—take this [Echoing Soulstone] Relic and +120 Aether Shards for preserving Veyra's true history!`,
              choices: [
                {
                  label: 'Thank you, Mirabel. What did your research uncover?',
                  effect: (s) => {
                    s.flags.mirabelReward = true;
                    s.shards = (s.shards || 0) + 120;
                    if (!s.ownedRelics.includes('soul_conduit')) s.ownedRelics.push('soul_conduit');
                    s.quests.scholar_tablets = 'completed';
                  },
                  nextText: 'The inscriptions prove that Archon Malakor loved this kingdom more than life itself. If you collect at least 6 Lore Tablets and speak with Elder Lyra before the final battle, you may find a way to save both Veyra and your mentor!'
                }
              ]
            };
          }
          return {
            text: `Greetings, Sentinel! I study the crystal resonance in these caverns. You have discovered ${tablets} of the 14 Ancient Lore Tablets so far. Bring me word once you've read at least 3 Tablets!`,
            choices: [
              { label: 'Inspect Lore Codex', action: 'open_codex' },
              { label: 'I will keep searching.', action: 'close' }
            ]
          };
        }
      },

      vesper: {
        id: 'vesper',
        name: 'Vesper the Masked Crow',
        role: 'Wandering Blade & Arena Master',
        voicePitch: 300,
        color: '#f43f5e',
        cloakColor: '#881337',
        accentColor: '#fda4af',
        getDialogue(state) {
          return {
            text: 'Heh. Fancy meeting the legendary Kaelen out in the dark. Keep your guard sharp—if you time your Parry [F / Shift] right before an enemy blow lands, you\'ll stagger them wide open. Want to test your blade in the Astral Crucible Boss Rush?',
            choices: [
              { label: 'Enter the Astral Crucible (Zone 7 Arena)', action: 'travel_crucible' },
              {
                label: state.flags.vesperSpar ? 'Any combat tips?' : 'Share your duelist technique.',
                effect: (s) => {
                  if (!s.flags.vesperSpar) {
                    s.flags.vesperSpar = true;
                    s.skillPoints = (s.skillPoints || 0) + 1;
                  }
                },
                nextText: 'Watch a boss\'s telegraph glow before they strike. Downward air slashes (Down + Attack in mid-air) let you bounce endlessly over ground sweeps! Take +1 Skill Point for having the spine to ask.'
              },
              { label: 'Until next time, Vesper.', action: 'close' }
            ]
          };
        }
      }
    },

    // Quests List
    QUESTS: [
      {
        id: 'main_eclipse',
        title: 'The Five Shards of the Eclipse',
        giver: 'Elder Lyra',
        type: 'Main Story',
        desc: 'Defeat the five corrupted Guardians across Veyra to reclaim the shattered Eclipse Shards and confront Archon Malakor at the Obsidian Citadel.',
        getProgress(state) {
          const count = (state.defeatedBosses || []).length;
          return `${Math.min(5, count)} / 5 Eclipse Shards Reclaimed`;
        },
        isComplete(state) {
          return (state.defeatedBosses || []).length >= 5;
        }
      },
      {
        id: 'foundry_souls',
        title: 'Gears of Conscience',
        giver: 'Unit-09 "Cog"',
        type: 'Side Quest',
        desc: 'Speak with Unit-09 "Cog" in the Ironhearth Foundry and decide the fate of the sentient Automaton Collective.',
        getProgress(state) {
          return state.flags.cogChoiceMade ? `Completed (${state.flags.cogChoiceMade.toUpperCase()})` : 'Find Unit-09 in Ironhearth Foundry';
        },
        isComplete(state) {
          return Boolean(state.flags.cogChoiceMade);
        }
      },
      {
        id: 'scholar_tablets',
        title: 'Echoes of the First Dawn',
        giver: 'Mirabel the Archivist',
        type: 'Side Quest',
        desc: 'Decipher at least 3 Ancient Lore Tablets hidden across Veyra and report your findings to Mirabel.',
        getProgress(state) {
          const c = (state.readTablets || []).length;
          return `${Math.min(3, c)} / 3 Lore Tablets Deciphered`;
        },
        isComplete(state) {
          return Boolean(state.flags.mirabelReward);
        }
      },
      {
        id: 'true_history',
        title: 'The Forbidden Truth of Nyxara',
        giver: 'Elder Lyra',
        type: 'True Ending Path',
        desc: 'Discover at least 6 Ancient Lore Tablets and speak with Elder Lyra in Haven of Dusk to unlock the True Equilibrium Ending.',
        getProgress(state) {
          const c = (state.readTablets || []).length;
          return state.flags.lyraDecodedTruth ? 'Truth Awakened' : `${Math.min(6, c)} / 6 Tablets & Speak to Lyra`;
        },
        isComplete(state) {
          return Boolean(state.flags.lyraDecodedTruth);
        }
      },
      {
        id: 'master_smith',
        title: 'Steel of the Ancients',
        giver: 'Forgemaster Bram',
        type: 'Side Quest',
        desc: 'Upgrade any weapon to Tier +3 or higher at Bram\'s Forge using Aether Shards.',
        getProgress(state) {
          const maxTier = Math.max(0, ...Object.values(state.weaponUpgrades || { duskblade: 0 }));
          return `Highest Weapon Tier: +${maxTier} / +3`;
        },
        isComplete(state) {
          const maxTier = Math.max(0, ...Object.values(state.weaponUpgrades || { duskblade: 0 }));
          return maxTier >= 3;
        }
      }
    ],

    // 14 Ancient Lore Tablets scattered across the world
    LORE_TABLETS: [
      {
        id: 'tablet_1',
        zone: 'Whispering Catacombs',
        title: 'I. Oath of the Duskblade',
        text: '"We who bear the Duskblade swear neither to fear the dark nor worship the blinding sun. When the realm falters, our steel shall be the bridge between twilight and dawn."'
      },
      {
        id: 'tablet_2',
        zone: 'Whispering Catacombs',
        title: 'II. The Fall of Sentinel Kaelen',
        text: '"Here fell Sentinel Kaelen, favored apprentice of Archon Malakor. Though Kaelen\'s blade was swift, Malakor wept as he struck the flat of his sword against Kaelen\'s helm, whispering: \'Live, my child, until the Shards can be borne.\'"'
      },
      {
        id: 'tablet_3',
        zone: 'Haven of Dusk',
        title: 'III. Chronicle of the Sanctuary',
        text: '"When the sky cracked into obsidian shards, Elder Lyra led three hundred survivors into the sunken nave of Saint Solaris Cathedral. Only forty reached the lanterns alive."'
      },
      {
        id: 'tablet_4',
        zone: 'Sunken Outskirts',
        title: 'IV. Sylvanus the First Warden',
        text: '"Before the corruption, Sylvanus tended the Royal Arboretum for six centuries. When the First Shard fell into the canopy, he swallowed it whole to keep it from poisoning the river—sacrificing his mind to the thorns."'
      },
      {
        id: 'tablet_5',
        zone: 'Sunken Outskirts',
        title: 'V. The Nature of Aether Shards',
        text: '"Crystallized fragments of twilight resonance. In the hands of a master smith, they bind starlight to iron; in the hands of a Weaver, they awaken dormant memories of the blood."'
      },
      {
        id: 'tablet_6',
        zone: 'Ironhearth Foundry',
        title: 'VI. Awakening of the Ninth Series',
        text: '"Chief Artificer Vane noted a miracle in the ninth batch of steam-automata: when exposed to pure Soul Mana, they began composing music and mourning fallen comrades."'
      },
      {
        id: 'tablet_7',
        zone: 'Ironhearth Foundry',
        title: 'VII. Directive of Seraph-IX',
        text: '"OVERRIDE LOG 994 — Archon Malakor personally sealed the Second Shard inside Seraph-IX\'s core. \'Guard this piece of the cage with your wings of iron, Valkyrie. Let none take it who lack the strength to defeat me.\'"'
      },
      {
        id: 'tablet_8',
        zone: 'Crystal Caverns',
        title: 'VIII. Song of the Glacial Wyrm',
        text: '"Vaelen is the last of the Star-Drakes who swam the firmament before the sun was forged. In the cold dark of the caverns, he dreams of a sky where stars are no longer drowned out by artificial gold."'
      },
      {
        id: 'tablet_9',
        zone: 'Crystal Caverns',
        title: 'IX. The First Seal',
        text: '"Scholar Mirabel\'s Note: The runes inside the ice predate the Kingdom of Veyra by ten millennia. They do not praise the Solaris Crown as a creator—they warn of it as a warden\'s lock!"'
      },
      {
        id: 'tablet_10',
        zone: 'Sunken Archive',
        title: 'X. The Secret of Nyxara',
        text: '"FORBIDDEN ARCHIVE RECORD: Beneath the golden plating of the Solaris Crown writhes Nyxara, the Hungering Void. For a thousand years she fed upon the prayers of Veyra, growing strong enough to burst the intact Crown."'
      },
      {
        id: 'tablet_11',
        zone: 'Sunken Archive',
        title: 'XI. Malakor\'s Burden',
        text: '"Archon Malakor\'s Private Journal: \'If Nyxara breaks the intact Crown, all life in Veyra will be erased in an instant. By shattering the Crown into five Shards, I divide her consciousness into five weakened fragments—and bind the fifth inside my own heart.\'"'
      },
      {
        id: 'tablet_12',
        zone: 'Sunken Archive',
        title: 'XII. Inquisitor Thorne\'s Vigil',
        text: '"Thorne knelt before the Archon and swore: \'I will guard the Archive steps, Lord Malakor. When Kaelen returns, I shall test their blade with my life—for only a Sentinel who surpasses us both can sever Nyxara forever.\'"'
      },
      {
        id: 'tablet_13',
        zone: 'Obsidian Citadel',
        title: 'XIII. The Ritual of Equilibrium',
        text: '"To reforge the Crown merely delays the Void; to claim its dark power invites tyranny. Only by striking the five resonant Shards in harmonic convergence can Nyxara be dissolved into harmless starlight."'
      },
      {
        id: 'tablet_14',
        zone: 'Obsidian Citadel',
        title: 'XIV. Final Words of the Mentor',
        text: '"To Kaelen, my proudest pupil: If you read this stone before my throne, forgive an old knight his cruel theater. Raise your Duskblade high. Free us both."'
      }
    ],

    // Dramatic Pre-Boss & Post-Boss Dialogues
    BOSS_DIALOGUES: {
      moss_warden: {
        intro: {
          speaker: 'Sylvanus, The Mossbound Warden',
          text: 'GRRAAAH! Turn back, little blade... The Shard burns within my roots... I cannot hold the thorns back any longer!'
        },
        defeat: {
          speaker: 'Sylvanus (Fading)',
          text: 'The fever... recedes... Thank you, Sentinel. Take the First Shard... and restore the green boughs of Veyra...'
        }
      },
      clockwork_valkyrie: {
        intro: {
          speaker: 'Seraph-IX, The Clockwork Valkyrie',
          text: 'TARGET IDENTIFIED: SENTINEL KAELEN. ARCHON DIRECTIVE ALPHA ENGAGED. PROVE YOUR COMBAT SUPERIORITY OR BE INCINERATED.'
        },
        defeat: {
          speaker: 'Seraph-IX',
          text: 'COMBAT EVALUATION: EXCEEDED PARAMETERS... TRANSFERRING SECOND ECLIPSE SHARD... FLY FREE, DUSKBLADE...'
        }
      },
      glacial_wyrm: {
        intro: {
          speaker: 'Vaelen, The Glacial Wyrm',
          text: 'Mortal of fleeting ember! Do you dare wake a child of the elder stars from his crystalline slumber?! Feel the bite of eternity!'
        },
        defeat: {
          speaker: 'Vaelen, The Glacial Wyrm',
          text: 'Magnificent... Your spirit burns brighter than the false sun of old. Take the Third Shard, Star-Walker!'
        }
      },
      inquisitor_thorne: {
        intro: {
          speaker: 'Inquisitor Thorne, The Mirror Blade',
          text: 'At last you stand before me, Kaelen. Show me whether three years in the dark dulled your edge—or forged the savior Archon Malakor prayed for! En garde!'
        },
        defeat: {
          speaker: 'Inquisitor Thorne',
          text: 'Hah... flawless form, my old friend. Take the Fourth Shard. Climb the Citadel... and release our mentor from his torment.'
        }
      },
      archon_malakor: {
        intro: {
          speaker: 'Archon Malakor, Sovereign of the Eclipse',
          text: 'Kaelen... You survived the catacombs, conquered the guardians, and climbed to the bleeding sky. Draw your Duskblade! Before the Void inside me devours what remains of my soul—strike me down!'
        },
        defeat: {
          speaker: 'Archon Malakor',
          text: 'The darkness... lifts from my eyes... At last, the apprentice surpasses the master. The five Eclipse Shards are yours, Kaelen. Choose the fate of Veyra!'
        }
      }
    }
  };

  Veyra.STORY = STORY;
})();

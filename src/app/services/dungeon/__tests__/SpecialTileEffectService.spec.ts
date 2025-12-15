import { SpecialTileEffectService, handleSpecialTile } from '../SpecialTileEffectService'
import { GameState } from '@models/GameState'
import { Position, TileData } from '@models/Dungeon'
import { createTestCharacter, createTestGameState as createTestGameStateHelper } from '@testing/test-factories'

// Test helper
function createTestGameState(position?: Position): GameState {
  return {
    dungeon: {
      currentLevel: 1,
      position: position || { x: 0, y: 0, facing: 'NORTH' },
      lightActive: false,
      lightRadius: 3,
      lightSpellType: undefined,
      lightDurationRemaining: undefined,
      inDarknessZone: false,
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: [],
      unlockedDoors: new Set(),
      openDoors: new Set()
    }
  } as GameState
}

describe('SpecialTileEffectService', () => {
  describe('teleporter', () => {
    it('teleports party to destination', () => {
      const tile: TileData = {
        x: 1,
        y: 0,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['teleporter'],
        destination: { x: 5, y: 5 }
      }

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 1, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      }

      const prevPos = { x: 0, y: 0, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      expect(result.newState.dungeon!.position.x).toBe(5)
      expect(result.newState.dungeon!.position.y).toBe(5)
      expect(result.newState.dungeon!.teleportCount).toBe(1)
    })

    it('prevents infinite teleport loops after 3 consecutive', () => {
      const tile: TileData = {
        x: 1,
        y: 0,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['teleporter'],
        destination: { x: 5, y: 5 }
      }

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 1, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 3,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      }

      const prevPos = { x: 0, y: 0, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      // Should NOT teleport
      expect(result.newState.dungeon!.position.x).toBe(1)
      expect(result.newState.dungeon!.position.y).toBe(0)
      expect(result.newState.dungeon!.teleportCount).toBe(3)
    })

    it('resets teleport count on non-teleporter tile', () => {
      const tile: TileData = {
        x: 1,
        y: 0,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
      }

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 1, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 2,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      }

      const prevPos = { x: 0, y: 0, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      expect(result.newState.dungeon!.teleportCount).toBe(0)
    })
  })

  describe('spinner', () => {
    it('randomizes party facing direction', () => {
      const tile: TileData = {
        x: 5,
        y: 5,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['spinner']
      }

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      }

      const prevPos = { x: 5, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      // Facing should be one of the four directions
      expect(['NORTH', 'SOUTH', 'EAST', 'WEST']).toContain(result.newState.dungeon!.position.facing)
    })

    it('can change facing to different direction', () => {
      const tile: TileData = {
        x: 5,
        y: 5,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['spinner']
      }

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      }

      // Run spinner 10 times, at least one should change facing
      const prevPos = { x: 5, y: 4, facing: 'NORTH' as const }
      let facingChanged = false
      for (let i = 0; i < 10; i++) {
        const result = handleSpecialTile(state, tile, prevPos)
        if (result.newState.dungeon!.position.facing !== 'NORTH') {
          facingChanged = true
          break
        }
      }

      expect(facingChanged).toBe(true)
    })
  })

  describe('chute', () => {
    it('causes party to fall 1-3 levels', () => {
      const tile = { types: ['chute'] } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // Should fall 1-3 levels
      expect(result.newState.dungeon!.currentLevel).toBeGreaterThanOrEqual(6);
      expect(result.newState.dungeon!.currentLevel).toBeLessThanOrEqual(8);
    });

    it('deals 1d6 damage per level fallen to all party members', () => {
      const tile = { types: ['chute'] } as TileData;

      const character1 = createTestCharacter({ id: 'char1', hp: 50, maxHp: 50 });
      const character2 = createTestCharacter({ id: 'char2', hp: 50, maxHp: 50 });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1', 'char2'],
          formation: { front: ['char1'], back: ['char2'] },
          gold: 0,
        },
        roster: new Map([
          ['char1', character1],
          ['char2', character2],
        ]),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      const char1After = result.newState.roster.get('char1')!;
      const char2After = result.newState.roster.get('char2')!;

      // Both characters should take damage
      expect(char1After.hp).toBeLessThan(50);
      expect(char2After.hp).toBeLessThan(50);

      // Damage should be reasonable (1-18 for 1-3 levels × 1-6 damage)
      expect(char1After.hp).toBeGreaterThanOrEqual(50 - 18);
      expect(char2After.hp).toBeGreaterThanOrEqual(50 - 18);
    });

    it('does not fall below level 10 (bottom)', () => {
      const tile = { types: ['chute'] } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 9,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState.dungeon!.currentLevel).toBeLessThanOrEqual(10);
    });
  });

  describe('pit', () => {
    it('deals 1d6 damage to characters who fail AGI check', () => {
      const tile = { types: ['pit'] } as TileData;

      const lowAgiChar = createTestCharacter({
        id: 'char1',
        hp: 50,
        maxHp: 50,
        agility: 3, // Very low AGI, should fail
      });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0,
        },
        roster: new Map([['char1', lowAgiChar]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      // Run multiple times to ensure damage occurs
      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      let damageOccurred = false;
      for (let i = 0; i < 10; i++) {
        const result = handleSpecialTile(state, tile, prevPos);
        const charAfter = result.newState.roster.get('char1')!;
        if (charAfter.hp < 50) {
          damageOccurred = true;
          // Damage should be 1-6
          expect(charAfter.hp).toBeGreaterThanOrEqual(50 - 6);
          expect(charAfter.hp).toBeLessThan(50);
          break;
        }
      }
      expect(damageOccurred).toBe(true);
    });

    it('high AGI characters can avoid pit damage', () => {
      const tile = { types: ['pit'] } as TileData;

      const highAgiChar = createTestCharacter({
        id: 'char1',
        hp: 50,
        maxHp: 50,
        agility: 18, // Max AGI, should usually succeed
      });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0,
        },
        roster: new Map([['char1', highAgiChar]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      // Run multiple times to ensure avoidance occurs
      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      let avoidanceOccurred = false;
      for (let i = 0; i < 10; i++) {
        const result = handleSpecialTile(state, tile, prevPos);
        const charAfter = result.newState.roster.get('char1')!;
        if (charAfter.hp === 50) {
          avoidanceOccurred = true;
          break;
        }
      }
      expect(avoidanceOccurred).toBe(true);
    });

    it('does not change current level', () => {
      const tile = { types: ['pit'] } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState.dungeon!.currentLevel).toBe(5);
    });

    it('uses custom pitDamage when specified (1d8)', () => {
      const tile = { types: ['pit'], pitDamage: '1d8' } as TileData;

      const lowAgiChar = createTestCharacter({
        id: 'char1',
        hp: 50,
        maxHp: 50,
        agility: 3, // Guaranteed fail
      });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0,
        },
        roster: new Map([['char1', lowAgiChar]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      let damageOccurred = false;
      for (let i = 0; i < 10; i++) {
        const result = handleSpecialTile(state, tile, prevPos);
        const charAfter = result.newState.roster.get('char1')!;
        if (charAfter.hp < 50) {
          damageOccurred = true;
          // Damage should be 1-8 (1d8)
          expect(charAfter.hp).toBeGreaterThanOrEqual(50 - 8);
          expect(charAfter.hp).toBeLessThan(50);
          break;
        }
      }
      expect(damageOccurred).toBe(true);
    });

    it('defaults to 1d6 when pitDamage not specified', () => {
      const tile = { types: ['pit'] } as TileData;  // No pitDamage

      const lowAgiChar = createTestCharacter({
        id: 'char1',
        hp: 50,
        maxHp: 50,
        agility: 3,
      });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0,
        },
        roster: new Map([['char1', lowAgiChar]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      let damageOccurred = false;
      for (let i = 0; i < 10; i++) {
        const result = handleSpecialTile(state, tile, prevPos);
        const charAfter = result.newState.roster.get('char1')!;
        if (charAfter.hp < 50) {
          damageOccurred = true;
          // Default damage should be 1-6 (1d6)
          expect(charAfter.hp).toBeGreaterThanOrEqual(50 - 6);
          break;
        }
      }
      expect(damageOccurred).toBe(true);
    });

    it('includes tile.message in messages array when pit has message', () => {
      const tile = {
        types: ['pit'],
        message: 'The floor gives way beneath you!'
      } as TileData;

      const lowAgiChar = createTestCharacter({
        id: 'char1',
        hp: 50,
        maxHp: 50,
        agility: 3,
      });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0,
        },
        roster: new Map([['char1', lowAgiChar]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 3,
          inDarknessZone: false,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          latumapicActive: false,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const };
      const result = handleSpecialTile(state, tile, prevPos);

      // Message should be in the messages array
      expect(result.messages).toContain('The floor gives way beneath you!');
    });

    it('returns empty messages array when pit has no message', () => {
      const tile = { types: ['pit'] } as TileData;

      const lowAgiChar = createTestCharacter({
        id: 'char1',
        hp: 50,
        maxHp: 50,
        agility: 3,
      });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0,
        },
        roster: new Map([['char1', lowAgiChar]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 3,
          inDarknessZone: false,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          latumapicActive: false,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const };
      const result = handleSpecialTile(state, tile, prevPos);

      // No message configured, messages should be empty
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('darkness', () => {
    it('extinguishes light and sets inDarknessZone when entering darkness tile', () => {
      const tile = { types: ['darkness'] } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: true,
          lightRadius: 3,
          lightSpellType: 'MILWA',
          lightDurationRemaining: 20,
          inDarknessZone: false,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set()
        },
      };

      const prevPos = { x: 5, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // Darkness zones extinguish active light spells (original Wizardry behavior)
      expect(result.newState.dungeon!.lightActive).toBe(false);
      expect(result.newState.dungeon!.inDarknessZone).toBe(true);
      expect(result.newState.dungeon!.lightSpellType).toBeUndefined();
      expect(result.newState.dungeon!.lightDurationRemaining).toBeUndefined();
      expect(result.newState.dungeon!.lightRadius).toBe(1); // Minimum visibility in darkness
    });

    it('handles darkness_zone_start the same as darkness', () => {
      const tile = { types: ['darkness_zone_start'] } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          ...createTestGameState().dungeon!,
          lightActive: true,
          lightSpellType: 'LOMILWA',
          lightDurationRemaining: 32000,
        },
      };

      const prevPos = { x: 0, y: 0, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState.dungeon!.lightActive).toBe(false);
      expect(result.newState.dungeon!.inDarknessZone).toBe(true);
    });
  });

  describe('stairs', () => {
    it('stairs_down auto-descends to next level', () => {
      const tile = { types: ['stairs_down'] } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState.dungeon!.currentLevel).toBe(2);
    });

    it('stairs_up auto-ascends to previous level', () => {
      const tile = { types: ['stairs_up'] } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 3,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState.dungeon!.currentLevel).toBe(2);
    });

    it('stairs_up on level 1 does nothing', () => {
      const tile = { types: ['stairs_up'] } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 9, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState.dungeon!.currentLevel).toBe(1);
    });
  });

  describe('elevator', () => {
    it('returns state unchanged (UI handles level selection)', () => {
      const tile = {
        types: ['elevator'],
        elevatorDestinations: [1, 2, 3, 4]
      } as TileData;

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 8, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 10, y: 7, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // Elevator UI handled by MazeComponent
      expect(result.newState).toEqual(state);
    });
  });

  describe('anti_magic', () => {
    it('sets anti-magic flag for current tile', () => {
      const tile = { types: ['anti_magic'] } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: true,
          lightRadius: 3,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 5, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // Anti-magic doesn't modify state directly - MazeComponent checks tile type
      expect(result.newState).toEqual(state);
    });
  });

  describe('message', () => {
    it('returns state unchanged (message handled by UI)', () => {
      const tile = {
        types: ['message'],
        message: 'AREA OUT OF BOUNDS! Cloaked in eternal darkness'
      } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 5, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // Message display handled by MazeComponent, state unchanged
      expect(result.newState).toEqual(state);
    });
  });

  describe('searchable', () => {
    it('does not auto-trigger search (requires I key)', () => {
      const tile = {
        types: ['searchable'],
        searchContent: { itemId: 'bronze_key' }
      } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 13, y: 3, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const prevPos = { x: 13, y: 2, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // State unchanged - requires explicit inspect action
      expect(result.newState).toEqual(state);
    });
  });

  describe('fixed_encounter', () => {
    it('returns state unchanged if encounter not yet defeated', () => {
      const tile = {
        types: ['fixed_encounter'],
        encounterId: 'murphy_ghost'
      } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 13, y: 5, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
        },
      };

      const prevPos = { x: 13, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      // MazeComponent will check and trigger combat
      expect(result.newState).toEqual(state);
    });

    it('returns state unchanged if encounter already defeated', () => {
      const tile = {
        types: ['fixed_encounter'],
        encounterId: 'murphy_ghost'
      } as TileData;

      const state: GameState = {
        ...createTestGameState(),
        dungeon: {
          currentLevel: 1,
          position: { x: 13, y: 5, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: ['murphy_ghost'],
        },
      };

      const prevPos = { x: 13, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos);

      expect(result.newState).toEqual(state);
    });
  });

  describe('conditional tiles with entryMessage', () => {
    it('includes tile.message as entryMessage when condition fails', () => {
      const tile: TileData = {
        x: 8,
        y: 7,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['room'],
        message: 'As you enter, smoke fills the room.',
        condition: {
          type: 'has_item',
          itemId: 'bronze_key'
        },
        onConditionFail: {
          message: 'You feel compelled to leave!',
          action: 'retreat'
        }
      }

      // Party has no bronze_key
      const char = createTestCharacter({ id: 'hero-1', inventory: [] })
      const state: GameState = {
        ...createTestGameState(),
        roster: new Map([['hero-1', char]]),
        party: {
          members: ['hero-1'],
          formation: { front: ['hero-1'], back: [] },
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          position: { x: 8, y: 7, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
        },
      }

      const prevPos = { x: 8, y: 6, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      expect(result.conditionResult).toBeDefined()
      expect(result.conditionResult!.status).toBe('fail')
      expect(result.conditionResult!.entryMessage).toBe('As you enter, smoke fills the room.')
      expect(result.conditionResult!.message).toBe('You feel compelled to leave!')
    })

    it('includes tile.message as entryMessage when condition succeeds', () => {
      const tile: TileData = {
        x: 8,
        y: 7,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['fixed_encounter'],
        message: 'As you enter, smoke fills the room.',
        condition: {
          type: 'has_item',
          itemId: 'bronze_key'
        },
        onConditionFail: {
          message: 'You feel compelled to leave!',
          action: 'retreat'
        },
        encounterId: 'bronze_golem'
      }

      // Party HAS the bronze_key
      const bronzeKey = {
        id: 'bronze_key',
        name: 'Bronze Key',
        type: 'MISC' as any,
        slot: 'NONE' as any,
        price: 0,
        cursed: false,
        identified: true,
        equipped: false
      }
      const char = createTestCharacter({ id: 'hero-1', inventory: [bronzeKey] })
      const state: GameState = {
        ...createTestGameState(),
        roster: new Map([['hero-1', char]]),
        party: {
          members: ['hero-1'],
          formation: { front: ['hero-1'], back: [] },
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          position: { x: 8, y: 7, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
        },
      }

      const prevPos = { x: 8, y: 6, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      expect(result.conditionResult).toBeDefined()
      expect(result.conditionResult!.status).toBe('success')
      expect(result.conditionResult!.entryMessage).toBe('As you enter, smoke fills the room.')
      expect(result.conditionResult!.encounterId).toBe('bronze_golem')
    })

    it('does not include entryMessage when tile has no message', () => {
      const tile: TileData = {
        x: 8,
        y: 7,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['room'],
        // No message property
        condition: {
          type: 'has_item',
          itemId: 'bronze_key'
        },
        onConditionFail: {
          message: 'You feel compelled to leave!',
          action: 'retreat'
        }
      }

      const char = createTestCharacter({ id: 'hero-1', inventory: [] })
      const state: GameState = {
        ...createTestGameState(),
        roster: new Map([['hero-1', char]]),
        party: {
          members: ['hero-1'],
          formation: { front: ['hero-1'], back: [] },
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          position: { x: 8, y: 7, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
        },
      }

      const prevPos = { x: 8, y: 6, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      expect(result.conditionResult).toBeDefined()
      expect(result.conditionResult!.entryMessage).toBeUndefined()
    })
  });

  describe('conditional tile completion tracking', () => {
    it('skips condition check for already completed tiles', () => {
      const tile: TileData = {
        x: 8,
        y: 7,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['room'],
        message: 'A mysterious room.',
        condition: {
          type: 'has_item',
          itemId: 'silver_key'
        },
        onConditionFail: {
          message: 'You cannot enter!',
          action: 'retreat'
        }
      }

      // Party has NO silver_key but tile is already completed
      const char = createTestCharacter({ id: 'hero-1', inventory: [] })
      const state: GameState = {
        ...createTestGameState(),
        roster: new Map([['hero-1', char]]),
        party: {
          members: ['hero-1'],
          formation: { front: ['hero-1'], back: [] },
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          position: { x: 8, y: 7, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          completedConditionTiles: new Set(['1_8_7']),  // Already completed
          visitedTiles: new Set(),
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
          latumapicActive: false,
          expeditionAcBuff: 0,
          activeExpeditionSpells: []
        },
      }

      const prevPos = { x: 8, y: 6, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      // Should return already_completed, NOT fail (even though party lacks item)
      expect(result.conditionResult).toBeDefined()
      expect(result.conditionResult!.status).toBe('already_completed')
    })

    it('consumes item and marks tile complete on condition success', () => {
      const tile: TileData = {
        x: 4,
        y: 12,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['room'],
        message: 'A pool awaits an offering.',
        condition: {
          type: 'has_item',
          itemId: 'statuette_frog'
        },
        onConditionFail: {
          message: 'You are rejected!',
          action: 'retreat'
        }
      }

      // Party HAS the statuette_frog
      const statuetteFrog = {
        id: 'statuette_frog',
        name: 'Statuette of Frog',
        type: 'MISC' as any,
        slot: 'NONE' as any,
        price: 0,
        cursed: false,
        identified: true,
        equipped: false
      }
      const char = createTestCharacter({ id: 'hero-1', inventory: [statuetteFrog] })
      const state: GameState = {
        ...createTestGameState(),
        roster: new Map([['hero-1', char]]),
        party: {
          members: ['hero-1'],
          formation: { front: ['hero-1'], back: [] },
          gold: 0
        },
        dungeon: {
          currentLevel: 2,
          position: { x: 4, y: 12, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          completedConditionTiles: new Set(),  // Empty - tile not yet completed
          visitedTiles: new Set(),
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
          latumapicActive: false,
          expeditionAcBuff: 0,
          activeExpeditionSpells: []
        },
      }

      const prevPos = { x: 4, y: 11, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      // Condition should succeed
      expect(result.conditionResult).toBeDefined()
      expect(result.conditionResult!.status).toBe('success')
      expect(result.conditionResult!.entryMessage).toBe('A pool awaits an offering.')

      // Item should be consumed from inventory
      const updatedChar = result.newState.roster.get('hero-1')!
      expect(updatedChar.inventory).toHaveLength(0)

      // Tile should be marked as completed
      expect(result.newState.dungeon!.completedConditionTiles.has('2_4_12')).toBe(true)
    })

    it('does not consume item for non-has_item conditions', () => {
      const tile: TileData = {
        x: 5,
        y: 5,
        walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
        types: ['room'],
        condition: {
          type: 'has_spell',  // Not has_item
          spellId: 'malor'
        },
        onConditionFail: {
          message: 'You need the spell!',
          action: 'retreat'
        }
      }

      const char = createTestCharacter({ id: 'hero-1', inventory: [] })
      const state: GameState = {
        ...createTestGameState(),
        roster: new Map([['hero-1', char]]),
        party: {
          members: ['hero-1'],
          formation: { front: ['hero-1'], back: [] },
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          completedConditionTiles: new Set(),
          visitedTiles: new Set(),
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
          latumapicActive: false,
          expeditionAcBuff: 0,
          activeExpeditionSpells: []
        },
      }

      const prevPos = { x: 5, y: 4, facing: 'NORTH' as const }
      const result = handleSpecialTile(state, tile, prevPos)

      // has_spell currently returns true (not implemented)
      expect(result.conditionResult).toBeDefined()
      expect(result.conditionResult!.status).toBe('success')

      // Tile should still be marked as completed
      expect(result.newState.dungeon!.completedConditionTiles.has('1_5_5')).toBe(true)
    })
  });

  describe('SpecialTileEffectService static methods', () => {
    it('exposes handleSpecialTile as static method', () => {
      const tile = { types: [] } as TileData
      const state = createTestGameState()
      const prevPos = { x: 0, y: 0, facing: 'NORTH' as const }

      const result = SpecialTileEffectService.handleSpecialTile(state, tile, prevPos)
      expect(result.newState).toBeDefined()
    })
  })
})

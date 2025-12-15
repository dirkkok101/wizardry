import { DungeonLevelService, enterDungeon, enterLevel, handleStairsTransition } from '../DungeonLevelService'
import { GameState } from '@models/GameState'
import { createTestCharacter, createTestGameState as createTestGameStateHelper } from '@testing/test-factories'

describe('DungeonLevelService', () => {
  describe('enterDungeon', () => {
    it('initializes dungeon state with default position {x: 0, y: 0, facing: NORTH} on first entry', () => {
      const state = createTestGameStateHelper()

      const result = enterDungeon(state, 1)

      expect(result.dungeon!.position).toEqual({ x: 0, y: 0, facing: 'NORTH' })
    })

    it('preserves position when re-entering the same dungeon level', () => {
      const existingState: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 10, facing: 'EAST' },
          lightRadius: 3,
          lightActive: true,
          teleportCount: 0,
          visitedTiles: new Set(['5,10']),
          defeatedEncounters: [],
          unlockedDoors: new Set<string>(),
          openDoors: new Set<string>()
        }
      }

      const result = enterDungeon(existingState, 1)

      // Position should be preserved
      expect(result.dungeon!.position).toEqual({ x: 5, y: 10, facing: 'EAST' })
      // Visited tiles should be preserved
      expect(result.dungeon!.visitedTiles.has('5,10')).toBe(true)
      // Other dungeon state should be preserved
      expect(result.dungeon!.lightActive).toBe(true)
      expect(result.dungeon!.lightRadius).toBe(3)
    })

    it('resets position when entering a different dungeon level', () => {
      const existingState: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 10, facing: 'EAST' },
          lightRadius: 3,
          lightActive: true,
          teleportCount: 0,
          visitedTiles: new Set(['5,10']),
          defeatedEncounters: [],
          unlockedDoors: new Set<string>(),
          openDoors: new Set<string>()
        }
      }

      const result = enterDungeon(existingState, 2)

      // Position should reset for new level
      expect(result.dungeon!.position).toEqual({ x: 0, y: 0, facing: 'NORTH' })
      expect(result.dungeon!.currentLevel).toBe(2)
      // Visited tiles should be reset for new level
      expect(result.dungeon!.visitedTiles.size).toBe(0)
    })

    it('starts in darkness with default view distance on first entry', () => {
      // Use state without existing dungeon to test first entry behavior
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: null
      }

      const result = enterDungeon(state, 1)

      // Party starts in darkness (must cast MILWA to see)
      expect(result.dungeon!.lightRadius).toBe(3)  // Default view distance
      expect(result.dungeon!.lightActive).toBe(false)  // No light spell active
      expect(result.dungeon!.lightSpellType).toBeUndefined()
      expect(result.dungeon!.lightDurationRemaining).toBeUndefined()
      expect(result.dungeon!.inDarknessZone).toBe(false)
    })

    it('initializes all tracking sets as empty on first entry', () => {
      // Use state without existing dungeon to test first entry behavior
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: null
      }

      const result = enterDungeon(state, 1)

      expect(result.dungeon!.visitedTiles).toEqual(new Set())
      expect(result.dungeon!.defeatedEncounters).toEqual([])
      expect(result.dungeon!.unlockedDoors).toEqual(new Set())
    })

    it('sets correct dungeon level', () => {
      const state = createTestGameStateHelper()

      const result = enterDungeon(state, 5)

      expect(result.dungeon!.currentLevel).toBe(5)
    })

    it('preserves other game state properties (roster, party, settings)', () => {
      const character = createTestCharacter({ id: 'char1' })
      const state: GameState = {
        ...createTestGameStateHelper(),
        roster: new Map([['char1', character]]),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 1000
        },
        settings: {
          soundEnabled: true,
          musicEnabled: false,
          textSpeed: 'NORMAL'
        }
      }

      const result = enterDungeon(state, 1)

      expect(result.roster).toEqual(state.roster)
      expect(result.party).toEqual(state.party)
      expect(result.settings).toEqual(state.settings)
    })

    it('preserves expedition-wide state when re-entering dungeon at different level', () => {
      // Setup: existing dungeon state at level 2 with completed condition tile
      // This simulates: player was on level 2, used silver_key at (8,12), then returned to castle
      const existingState: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 2,  // Player was on level 2
          position: { x: 8, y: 12, facing: 'NORTH' },
          lightRadius: 3,
          lightActive: true,
          teleportCount: 0,
          visitedTiles: new Set(['8,12']),
          defeatedEncounters: ['murphy_ghost'],  // Expedition-wide
          unlockedDoors: new Set(['2_5_3']),     // Expedition-wide (uses level_y_x format)
          openDoors: new Set(['2_5_3']),
          lootedTiles: new Set(['2_4_5']),       // Expedition-wide (uses level_x_y format)
          completedConditionTiles: new Set(['2_8_12']),  // Expedition-wide (uses level_x_y format)
          consumedConditionItems: new Set(['silver_key']),  // Expedition-wide
          inDarknessZone: false,
          latumapicActive: true,                 // Expedition-wide
          expeditionAcBuff: -2,                  // Expedition-wide
          activeExpeditionSpells: ['MAPORFIC'], // Expedition-wide
        }
      }

      // Act: enter dungeon at level 1 (simulating return from castle)
      const result = enterDungeon(existingState, 1)

      // Assert: position and per-level state reset
      expect(result.dungeon!.currentLevel).toBe(1)
      expect(result.dungeon!.position).toEqual({ x: 0, y: 0, facing: 'NORTH' })
      expect(result.dungeon!.visitedTiles.size).toBe(0)  // Per-level, resets

      // Assert: expedition-wide state preserved (these use level_x_y or are truly global)
      expect(result.dungeon!.completedConditionTiles.has('2_8_12')).toBe(true)
      expect(result.dungeon!.consumedConditionItems.has('silver_key')).toBe(true)
      expect(result.dungeon!.defeatedEncounters).toContain('murphy_ghost')
      expect(result.dungeon!.lootedTiles.has('2_4_5')).toBe(true)
      expect(result.dungeon!.unlockedDoors.has('2_5_3')).toBe(true)
      expect(result.dungeon!.latumapicActive).toBe(true)
      expect(result.dungeon!.expeditionAcBuff).toBe(-2)
      expect(result.dungeon!.activeExpeditionSpells).toContain('MAPORFIC')
    })
  })

  describe('enterLevel', () => {
    it('changes to new level and sets position based on entry type', () => {
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

      const result = enterLevel(state, 2, 'STAIRS_DOWN');

      expect(result.dungeon!.currentLevel).toBe(2);
      // Position should be set to stairs_up tile on new level (implementation detail)
    });

    it('maintains facing direction when changing levels', () => {
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 3,
          position: { x: 10, y: 10, facing: 'WEST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const result = enterLevel(state, 2, 'STAIRS_UP');

      expect(result.dungeon!.position.facing).toBe('WEST');
    });
  });

  describe('handleStairsTransition', () => {
    it('transitions to castle when destination type is castle', () => {
      const destination = { type: 'castle' as const };
      const state = createTestGameStateHelper();

      const result = handleStairsTransition(state, destination);

      // Should return undefined dungeon (indicates castle/town)
      expect(result.dungeon).toBeUndefined();
    });

    it('transitions to next level when destination has level number', () => {
      const destination = {
        level: 2,
        x: 10,
        y: 5
      };
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: true,
          lightRadius: 3,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set()
        }
      };

      const result = handleStairsTransition(state, destination);

      expect(result.dungeon!.currentLevel).toBe(2);
      expect(result.dungeon!.position.x).toBe(10);
      expect(result.dungeon!.position.y).toBe(5);
      expect(result.dungeon!.position.facing).toBe('NORTH'); // Uses current facing
    });

    it('uses current facing when destination facing not specified', () => {
      const destination = { level: 3, x: 5, y: 5 };
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 2,
          position: { x: 0, y: 0, facing: 'EAST' },
          lightActive: true,
          lightRadius: 3,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set()
        }
      };

      const result = handleStairsTransition(state, destination);

      expect(result.dungeon!.currentLevel).toBe(3);
      expect(result.dungeon!.position.facing).toBe('EAST');
    });

    it('returns unchanged state when destination is undefined', () => {
      const state = createTestGameStateHelper();

      const result = handleStairsTransition(state, undefined);

      expect(result).toEqual(state); // State unchanged
    });

    it('returns unchanged state when destination is invalid', () => {
      const invalidDestination = {} as any;
      const state = createTestGameStateHelper();

      const result = handleStairsTransition(state, invalidDestination);

      expect(result).toEqual(state); // State unchanged
    });
  });

  describe('DungeonLevelService static methods', () => {
    it('exposes enterDungeon as static method', () => {
      const state = createTestGameStateHelper()
      const result = DungeonLevelService.enterDungeon(state, 1)
      expect(result.dungeon!.currentLevel).toBe(1)
    })

    it('exposes enterLevel as static method', () => {
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      }
      const result = DungeonLevelService.enterLevel(state, 2, 'STAIRS_DOWN')
      expect(result.dungeon!.currentLevel).toBe(2)
    })
  })
})

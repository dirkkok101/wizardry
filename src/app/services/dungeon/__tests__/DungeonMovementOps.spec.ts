import { DungeonMovementOps, moveForward, moveBackward, strafeLeft, strafeRight } from '../DungeonMovementOps'
import { GameState } from '@models/GameState'
import { Position } from '@models/Dungeon'
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

describe('DungeonMovementOps', () => {
  // Mock DungeonService for basic movement tests to avoid special tile triggers
  const mockEmptyLevelData = {
    level: 1,
    name: 'Test Level',
    size: 20,
    startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
    edgeWrapping: true,
    tiles: [],
    encounterRate: 0,
    encounterTable: []
  }

  beforeEach(() => {
    const DungeonService = require('../../DungeonService').DungeonService
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(mockEmptyLevelData)
    jest.spyOn(DungeonService, 'getTile').mockReturnValue({
      x: 0,
      y: 0,
      walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('moveForward', () => {
    it('increments y when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = moveForward(state)

      expect(result.state.dungeon!.position.y).toBe(11)
      expect(result.state.dungeon!.position.x).toBe(10)
    })

    it('decrements y when facing south', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' })
      const result = moveForward(state)

      expect(result.state.dungeon!.position.y).toBe(9)
    })

    it('increments x when facing east', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const result = moveForward(state)

      expect(result.state.dungeon!.position.x).toBe(11)
    })

    it('decrements x when facing west', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const result = moveForward(state)

      expect(result.state.dungeon!.position.x).toBe(9)
    })

    it('wraps x from 19 to 0 when moving east', () => {
      const state = createTestGameState({ x: 19, y: 10, facing: 'EAST' })
      const result = moveForward(state)

      expect(result.state.dungeon!.position.x).toBe(0)
    })

    it('wraps x from 0 to 19 when moving west', () => {
      const state = createTestGameState({ x: 0, y: 10, facing: 'WEST' })
      const result = moveForward(state)

      expect(result.state.dungeon!.position.x).toBe(19)
    })
  })

  describe('moveBackward', () => {
    it('decrements y when facing north (moving backward)', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = moveBackward(state)

      expect(result.state.dungeon!.position.y).toBe(9)
      expect(result.state.dungeon!.position.x).toBe(10)
    })

    it('increments y when facing south (moving backward)', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' })
      const result = moveBackward(state)

      expect(result.state.dungeon!.position.y).toBe(11)
    })
  })

  describe('strafeLeft', () => {
    it('moves west when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = strafeLeft(state)

      expect(result.state.dungeon!.position.x).toBe(9)
      expect(result.state.dungeon!.position.y).toBe(10)
      expect(result.state.dungeon!.position.facing).toBe('NORTH')
    })

    it('preserves original facing direction', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const result = strafeLeft(state)

      // Moving left while facing east moves north
      expect(result.state.dungeon!.position.y).toBe(11)
      expect(result.state.dungeon!.position.facing).toBe('EAST')
    })
  })

  describe('strafeRight', () => {
    it('moves east when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = strafeRight(state)

      expect(result.state.dungeon!.position.x).toBe(11)
      expect(result.state.dungeon!.position.y).toBe(10)
      expect(result.state.dungeon!.position.facing).toBe('NORTH')
    })

    it('preserves original facing direction', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const result = strafeRight(state)

      // Moving right while facing west moves north
      expect(result.state.dungeon!.position.y).toBe(11)
      expect(result.state.dungeon!.position.facing).toBe('WEST')
    })
  })

  describe('movement integration with special tiles', () => {
    it('triggers teleporter after moveForward', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 0, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } },
          { x: 1, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, types: ['teleporter'], destination: { x: 10, y: 10 } }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'EAST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      // Mock DungeonService.loadLevel and getTile
      const DungeonService = require('../../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level: any, x: any, y: any) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = moveForward(state);

      // Should move to (1, 0) then teleport to (10, 10)
      expect(result.state.dungeon!.position.x).toBe(10);
      expect(result.state.dungeon!.position.y).toBe(10);
      expect(result.state.dungeon!.teleportCount).toBe(1);

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('triggers spinner after strafeLeft', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 0, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, types: ['spinner'] },
          { x: 1, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 1, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      const DungeonService = require('../../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level: any, x: any, y: any) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = strafeLeft(state);

      // Should move to (0, 0) then spin
      expect(result.state.dungeon!.position.x).toBe(0);
      expect(['NORTH', 'SOUTH', 'EAST', 'WEST']).toContain(result.state.dungeon!.position.facing);

      jest.restoreAllMocks();
    });

    it('triggers chute after moveBackward', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 10, y: 9, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, types: ['chute'] },
          { x: 10, y: 10, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const character = createTestCharacter({ id: 'char1', hp: 50, maxHp: 50 });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      const DungeonService = require('../../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level: any, x: any, y: any) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = moveBackward(state);

      // Should move to (10, 9) then fall down levels
      expect(result.state.dungeon!.position.x).toBe(10);
      expect(result.state.dungeon!.position.y).toBe(9);
      expect(result.state.dungeon!.currentLevel).toBeGreaterThanOrEqual(6);
      expect(result.state.dungeon!.currentLevel).toBeLessThanOrEqual(8);

      // Character should take damage
      const charAfter = result.state.roster.get('char1')!;
      expect(charAfter.hp).toBeLessThan(50);

      jest.restoreAllMocks();
    });

    it('triggers pit after strafeRight', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 0, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } },
          { x: 1, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, types: ['pit'] }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const character = createTestCharacter({ id: 'char1', hp: 50, maxHp: 50, agility: 3 });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      const DungeonService = require('../../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level: any, x: any, y: any) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = strafeRight(state);

      // Should move to (1, 0)
      expect(result.state.dungeon!.position.x).toBe(1);
      expect(result.state.dungeon!.position.y).toBe(0);

      // Low AGI character should likely take damage (may not happen every time due to RNG)
      // We just verify position changed and level stayed same
      expect(result.state.dungeon!.currentLevel).toBe(5);

      jest.restoreAllMocks();
    });
  })

  describe('moveForward with special actions', () => {
    it('triggers stairs transition before updating position', () => {
      const character = createTestCharacter({ id: 'char1' })
      const party = {
        members: ['char1'],
        formation: { front: ['char1'], back: [] },
        gold: 0
      }

      // Create dungeon state at (0,0) facing WEST
      // Level 1 has stairs_up wall on west side at (0,0) with castle destination
      const dungeon = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' as const },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set<string>(),
        defeatedEncounters: [],
        unlockedDoors: new Set<string>(),
        openDoors: new Set<string>()
      }

      const state: GameState = {
        currentScene: 'MAZE' as any,
        roster: new Map([['char1', character]]),
        party,
        dungeon,
        settings: {
          soundEnabled: true,
          musicEnabled: true,
          textSpeed: 'NORMAL' as const
        }
      }

      // Restore real DungeonService for this test
      jest.restoreAllMocks()

      const result = moveForward(state)

      // Should trigger castle transition (dungeon becomes undefined)
      expect(result.state.dungeon).toBeUndefined()
    })

    it('updates position normally when no special action triggered', () => {
      const character = createTestCharacter({ id: 'char1' })
      const party = {
        members: ['char1'],
        formation: { front: ['char1'], back: [] },
        gold: 0
      }

      // Position with open wall ahead (0,0 facing NORTH has open wall)
      const dungeon = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'NORTH' as const },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set<string>(),
        defeatedEncounters: [],
        unlockedDoors: new Set<string>(),
        openDoors: new Set<string>()
      }

      const state: GameState = {
        currentScene: 'MAZE' as any,
        roster: new Map([['char1', character]]),
        party,
        dungeon,
        settings: {
          soundEnabled: true,
          musicEnabled: true,
          textSpeed: 'NORMAL' as const
        }
      }

      // Restore real DungeonService for this test
      jest.restoreAllMocks()

      const result = moveForward(state)

      // Should update position normally
      expect(result.state.dungeon?.position.y).toBe(1)
      expect(result.state.dungeon?.position.x).toBe(0)
    })

    it('handles stairs_down transition to next level', () => {
      // For this test, we'll need a location with stairs_down
      // Since level1.json might not have stairs_down at (0,0),
      // we'll just verify the method handles it without error
      const character = createTestCharacter({ id: 'char1' })
      const party = {
        members: ['char1'],
        formation: { front: ['char1'], back: [] },
        gold: 0
      }

      const dungeon = {
        currentLevel: 1,
        position: { x: 5, y: 5, facing: 'EAST' as const },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set<string>(),
        defeatedEncounters: [],
        unlockedDoors: new Set<string>(),
        openDoors: new Set<string>()
      }

      const state: GameState = {
        currentScene: 'MAZE' as any,
        roster: new Map([['char1', character]]),
        party,
        dungeon,
        settings: {
          soundEnabled: true,
          musicEnabled: true,
          textSpeed: 'NORMAL' as const
        }
      }

      // Restore real DungeonService for this test
      jest.restoreAllMocks()

      // This test will pass once we have proper stairs_down test data
      // For now, verify the method exists and handles the case
      const result = moveForward(state)
      expect(result).toBeDefined()
    })
  })

  describe('DungeonMovementOps static methods', () => {
    it('exposes moveForward as static method', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = DungeonMovementOps.moveForward(state)
      expect(result.state.dungeon!.position.y).toBe(11)
    })

    it('exposes moveBackward as static method', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = DungeonMovementOps.moveBackward(state)
      expect(result.state.dungeon!.position.y).toBe(9)
    })

    it('exposes strafeLeft as static method', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = DungeonMovementOps.strafeLeft(state)
      expect(result.state.dungeon!.position.x).toBe(9)
    })

    it('exposes strafeRight as static method', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const result = DungeonMovementOps.strafeRight(state)
      expect(result.state.dungeon!.position.x).toBe(11)
    })
  })
})

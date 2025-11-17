import { describe, it, expect, beforeEach } from '@jest/globals';
import { DungeonService } from '../DungeonService';
import { NavigationService } from '../NavigationService';
import { GameState } from '../../types/GameState';
import { DungeonState, LevelData, TileData } from '../../types/Dungeon';
import { SceneType } from '../../types/SceneType';
import { createTestCharacter, createTestGameState } from '../../test-helpers/test-factories';

/**
 * Integration tests for stairs wall system.
 *
 * Tests the complete flow from movement validation through rendering,
 * verifying that stairs walls work correctly across all services.
 *
 * This test suite validates:
 * 1. End-to-end stairs_up transitions (level → castle)
 * 2. End-to-end stairs_down transitions (level → level)
 * 3. Map validation for stairs walls
 * 4. Edge cases (rotation, normal movement, validation errors)
 */
describe('Stairs Wall Integration', () => {
  let testCharacter: any;
  let baseState: GameState;

  beforeEach(() => {
    // Create test character
    testCharacter = createTestCharacter({
      id: 'char1',
      name: 'Test Hero',
      hp: 20,
      maxHp: 20
    });

    // Create base game state
    baseState = {
      ...createTestGameState(),
      currentScene: SceneType.MAZE,
      roster: new Map([['char1', testCharacter]]),
      party: {
        members: ['char1'],
        formation: { front: ['char1'], back: [] },
        gold: 100
      }
    };
  });

  describe('End-to-end stairs_up flow', () => {
    it('completes full stairs_up transition from level 1 to castle', () => {
      // Arrange: Player at (0,0) facing WEST in level 1
      // This is the actual stairs_up location in level1.json
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Act 1: Check movement validation
      const validation = DungeonService.canMove(level, { x: 0, y: 0, facing: 'WEST' }, 'FORWARD');

      // Assert 1: Movement should be allowed with special action
      expect(validation.allowed).toBe(true);
      expect(validation.triggersSpecialAction).toBe('stairs');
      expect(validation.destination).toEqual({ type: 'castle' });

      // Act 2: Execute movement through NavigationService
      const resultState = NavigationService.moveForward(state);

      // Assert 2: Should transition to castle (dungeon becomes undefined)
      expect(resultState.dungeon).toBeUndefined();
    });

    it('preserves all game state during stairs_up transition', () => {
      // Arrange
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(['1-0-1', '1-1-1']),
        defeatedEncounters: ['encounter1'],
        unlockedDoors: new Set(['1-2-3']),
        openDoors: new Set(['1-4-5'])
      };
      const state: GameState = {
        ...baseState,
        dungeon,
        party: { ...baseState.party, gold: 500 }
      };

      // Act
      const resultState = NavigationService.moveForward(state);

      // Assert: All non-dungeon state should be preserved
      expect(resultState.roster).toEqual(state.roster);
      expect(resultState.party.gold).toBe(500);
      expect(resultState.party.members).toEqual(['char1']);
      expect(resultState.settings).toEqual(state.settings);
    });
  });

  describe('End-to-end stairs_down flow', () => {
    it('completes full stairs_down transition from level 1 to level 2', () => {
      // Arrange: Find stairs_down in level 1
      // Based on grep results, stairs_down is at (0, 10) in level1.json
      const level = DungeonService.loadLevel(1);
      const stairsTile = DungeonService.getTile(level, 0, 10);

      // Verify the tile has stairs_down
      expect(stairsTile.type).toBe('stairs_down');
      expect(stairsTile.destination).toBeDefined();
      expect(stairsTile.destination?.level).toBe(2);

      // Start at (1, 10) facing WEST, then move forward to step onto stairs at (0, 10)
      // Tile (0, 10) has east: "open" and tile (1, 10) has west: "open"
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 1, y: 10, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Act: Move forward (WEST) should move to (0, 10) and trigger tile-based stairs transition
      const resultState = NavigationService.moveForward(state);

      // Assert: Should transition to level 2 via handleSpecialTile
      // Note: Tile-based stairs_down uses enterLevel(), which finds stairs_up on target level
      // This differs from wall-based stairs which use explicit destination coordinates
      expect(resultState.dungeon).toBeDefined();
      expect(resultState.dungeon!.currentLevel).toBe(2);
      // Position will be at stairs_up tile on level 2 (found by enterLevel)
      expect(resultState.dungeon!.position).toBeDefined();
    });

    it('handles wall-based stairs_down transition to specified coordinates', () => {
      // Create a test scenario with stairs_down wall
      const testLevel: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: true,
        encounterRate: 0.1,
        encounterTable: 'test_table',
        tiles: [
          {
            x: 5,
            y: 5,
            walls: {
              north: 'stairs_down',
              south: 'wall',
              east: 'wall',
              west: 'wall'
            },
            destination: {
              level: 3,
              x: 10,
              y: 15
            }
          }
        ]
      };

      // Mock DungeonService to return our test level
      const originalLoadLevel = DungeonService.loadLevel;
      const originalGetTile = DungeonService.getTile;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(testLevel);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return testLevel.tiles.find(t => t.x === x && t.y === y) || {
          x, y,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        };
      });

      try {
        const dungeon: DungeonState = {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: true,
          lightRadius: 3,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set()
        };
        const state: GameState = { ...baseState, dungeon };

        // Act 1: Validate movement
        const validation = DungeonService.canMove(testLevel, { x: 5, y: 5, facing: 'NORTH' }, 'FORWARD');

        // Assert 1: Should trigger stairs action
        expect(validation.allowed).toBe(true);
        expect(validation.triggersSpecialAction).toBe('stairs');
        expect(validation.destination?.level).toBe(3);
        expect(validation.destination?.x).toBe(10);
        expect(validation.destination?.y).toBe(15);

        // Act 2: Execute transition
        const resultState = NavigationService.moveForward(state);

        // Assert 2: Should transition to level 3 at specified coordinates
        expect(resultState.dungeon!.currentLevel).toBe(3);
        expect(resultState.dungeon!.position.x).toBe(10);
        expect(resultState.dungeon!.position.y).toBe(15);
        expect(resultState.dungeon!.position.facing).toBe('NORTH'); // Preserves facing
      } finally {
        // Restore original methods
        jest.restoreAllMocks();
      }
    });
  });

  describe('Map validation integration', () => {
    it('validates level 1 map data successfully', () => {
      const level = DungeonService.loadLevel(1);
      const errors = DungeonService.validateStairsWalls(level);

      // Level 1 should have no validation errors
      expect(errors).toEqual([]);
    });

    it('validates level 2 map data successfully', () => {
      const level = DungeonService.loadLevel(2);
      const errors = DungeonService.validateStairsWalls(level);

      // Level 2 should have no validation errors
      expect(errors).toEqual([]);
    });

    it('detects stairs walls without destinations', () => {
      // Create test level with invalid stairs wall
      const testLevel: LevelData = {
        level: 999,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: true,
        encounterRate: 0.1,
        encounterTable: 'test_table',
        tiles: [
          {
            x: 0,
            y: 0,
            walls: {
              north: 'open',
              south: 'open',
              east: 'open',
              west: 'stairs_up'  // Missing destination!
            }
          }
        ]
      };

      const errors = DungeonService.validateStairsWalls(testLevel);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('(0, 0)');
      expect(errors[0]).toContain('no destination');
    });

    it('allows stairs tiles (tile type) without triggering validation errors', () => {
      // Test that tile-based stairs (type: 'stairs_down') don't need wall validation
      const testLevel: LevelData = {
        level: 999,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: true,
        encounterRate: 0.1,
        encounterTable: 'test_table',
        tiles: [
          {
            x: 0,
            y: 10,
            walls: {
              north: 'wall',
              south: 'wall',
              east: 'open',
              west: 'wall'
            },
            type: 'stairs_down',
            destination: { level: 2, x: 0, y: 10 }
          }
        ]
      };

      const errors = DungeonService.validateStairsWalls(testLevel);

      // Should pass validation (tile-based stairs don't need wall validation)
      expect(errors).toEqual([]);
    });
  });

  describe('Non-stairs movement still works', () => {
    it('allows normal forward movement when no stairs present', () => {
      // Test that normal movement isn't broken by stairs logic
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'NORTH' },  // Facing NORTH, not WEST
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      const result = NavigationService.moveForward(state);

      // Should move to (0, 1) - normal movement
      expect(result.dungeon?.position.y).toBe(1);
      expect(result.dungeon?.position.x).toBe(0);
      expect(result.dungeon?.currentLevel).toBe(1);
    });

    it('allows strafe movement without triggering stairs', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Strafe left (should move south)
      const result = NavigationService.strafeLeft(state);

      // Should move without triggering stairs
      expect(result.dungeon).toBeDefined();
      expect(result.dungeon!.currentLevel).toBe(1);
      expect(result.dungeon!.position.facing).toBe('WEST'); // Facing unchanged
    });

    it('allows backward movement without triggering stairs', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 1, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Move backward
      const result = NavigationService.moveBackward(state);

      // Should move without triggering stairs
      expect(result.dungeon).toBeDefined();
      expect(result.dungeon!.currentLevel).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('allows rotation while on stairs tile', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      const result = NavigationService.turnLeft(state);

      // Should rotate to SOUTH without triggering stairs
      expect(result.dungeon?.position.facing).toBe('SOUTH');
      expect(result.dungeon).toBeDefined();  // Still in dungeon
      expect(result.dungeon!.currentLevel).toBe(1);
    });

    it('allows right rotation on stairs tile', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      const result = NavigationService.turnRight(state);

      // Should rotate to NORTH without triggering stairs
      expect(result.dungeon?.position.facing).toBe('NORTH');
      expect(result.dungeon).toBeDefined();
      expect(result.dungeon!.currentLevel).toBe(1);
    });

    it('triggers stairs only when moving forward through stairs wall', () => {
      // Verify stairs only trigger on forward movement, not on other actions
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Test rotation doesn't trigger
      let result = NavigationService.turnLeft(state);
      expect(result.dungeon).toBeDefined();

      // Test forward movement DOES trigger
      result = NavigationService.moveForward(state);
      expect(result.dungeon).toBeUndefined(); // Castle transition
    });

    it('handles moving to stairs tile then stepping on it', () => {
      // Test the full flow: move to a tile, then step onto stairs from there
      const level = DungeonService.loadLevel(1);
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 1, facing: 'SOUTH' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Move south to (0,0)
      const result = NavigationService.moveForward(state);

      // Should be at (0,0) now, facing south
      expect(result.dungeon?.position.x).toBe(0);
      expect(result.dungeon?.position.y).toBe(0);
      expect(result.dungeon?.position.facing).toBe('SOUTH');
      expect(result.dungeon?.currentLevel).toBe(1);
    });

    it('validates stairs wall with missing destination coordinates', () => {
      const testLevel: LevelData = {
        level: 999,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: true,
        encounterRate: 0.1,
        encounterTable: 'test_table',
        tiles: [
          {
            x: 5,
            y: 5,
            walls: {
              north: 'stairs_down',
              south: 'wall',
              east: 'wall',
              west: 'wall'
            },
            destination: { level: 2 }  // Missing x, y coordinates
          }
        ]
      };

      // Validation should pass (coordinates are optional)
      const errors = DungeonService.validateStairsWalls(testLevel);
      expect(errors).toEqual([]);

      // Test that transition uses default coordinates (0, 0)
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(testLevel);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return testLevel.tiles.find(t => t.x === x && t.y === y) || {
          x, y,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        };
      });

      try {
        const dungeon: DungeonState = {
          currentLevel: 1,
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: true,
          lightRadius: 3,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set()
        };
        const state: GameState = { ...baseState, dungeon };

        const result = NavigationService.moveForward(state);

        // Should use default coordinates (0, 0)
        expect(result.dungeon!.currentLevel).toBe(2);
        expect(result.dungeon!.position.x).toBe(0);
        expect(result.dungeon!.position.y).toBe(0);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  describe('Cross-service integration', () => {
    it('chains DungeonService.canMove → NavigationService.moveForward → handleStairsTransition', () => {
      // Full integration test of the complete flow
      const level = DungeonService.loadLevel(1);
      const position = { x: 0, y: 0, facing: 'WEST' };

      // Step 1: DungeonService validates movement
      const validation = DungeonService.canMove(level, position, 'FORWARD');
      expect(validation.allowed).toBe(true);
      expect(validation.triggersSpecialAction).toBe('stairs');

      // Step 2: Create game state
      const dungeon: DungeonState = {
        currentLevel: 1,
        position,
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      };
      const state: GameState = { ...baseState, dungeon };

      // Step 3: NavigationService executes movement
      const result = NavigationService.moveForward(state);

      // Step 4: Verify handleStairsTransition was called and worked
      expect(result.dungeon).toBeUndefined(); // Castle transition completed
    });

    it('verifies immutable state updates throughout stairs transition', () => {
      const dungeon: DungeonState = {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        visitedTiles: new Set(['1-0-1']),
        defeatedEncounters: ['enc1'],
        unlockedDoors: new Set(['door1']),
        openDoors: new Set(['door2'])
      };
      const originalState: GameState = {
        ...baseState,
        dungeon: { ...dungeon }
      };
      const state: GameState = { ...originalState };

      // Execute transition
      const result = NavigationService.moveForward(state);

      // Verify original state wasn't mutated
      expect(state.dungeon).toBeDefined();
      expect(state.dungeon!.currentLevel).toBe(1);
      expect(state.dungeon!.position.x).toBe(0);
      expect(state.dungeon!.position.y).toBe(0);

      // Verify new state is different
      expect(result).not.toBe(state);
      expect(result.dungeon).toBeUndefined();
    });
  });
});

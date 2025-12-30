import { describe, it, expect, beforeEach } from '@jest/globals';
import { DungeonService } from '../DungeonService';
import { DungeonMovementOps, DungeonRotationService } from '../dungeon';
import { GameState } from '@models/GameState';
import { DungeonState, LevelData, TileData } from '@models/Dungeon';
import { SceneType } from '@models/SceneType';
import { createTestCharacter, createTestGameState } from '@testing/test-factories';

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

  function createTestDungeon(overrides: Partial<DungeonState> = {}): DungeonState {
    return {
      currentLevel: 1,
      position: { x: 0, y: 0, facing: 'NORTH' },
      lightActive: false,
      lightRadius: 3,
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: [],
      unlockedDoors: new Set(),
      openDoors: new Set(),
      inDarknessZone: false,
      lootedTiles: new Set(),
      completedConditionTiles: new Set(),
      consumedConditionItems: new Set(),
      latumapicActive: false,
      expeditionAcBuff: 0,
      activeExpeditionSpells: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    testCharacter = createTestCharacter({
      id: 'char1',
      name: 'Test Hero',
      hp: 20,
      maxHp: 20,
    });

    baseState = {
      ...createTestGameState(),
      currentScene: SceneType.MAZE,
      roster: new Map([['char1', testCharacter]]),
      party: {
        members: ['char1'],
        formation: { frontRow: ['char1'], backRow: [] },
        light: false,
        gold: 100,
      },
    };
  });

  describe('End-to-end stairs_up flow', () => {
    it('completes full stairs_up transition from level 1 to castle', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      // Act 1: Check movement validation
      const validation = DungeonService.canMove(level, { x: 0, y: 0, facing: 'WEST' }, 'FORWARD');

      // Assert 1: Movement should be allowed with special action
      expect(validation.allowed).toBe(true);
      expect(validation.triggersSpecialAction).toBe('stairs');
      expect(validation.destination).toEqual({ type: 'castle' });

      // Act 2: Execute movement through NavigationService
      const resultState = DungeonMovementOps.moveForward(state);

      // Assert 2: Should transition to castle (dungeon becomes undefined)
      expect(resultState.state.dungeon).toBeUndefined();
    });

    it('preserves all game state during stairs_up transition', () => {
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        visitedTiles: new Set(['1-0-1', '1-1-1']),
        defeatedEncounters: ['encounter1'],
        unlockedDoors: new Set(['1-2-3']),
        openDoors: new Set(['1-4-5']),
      });
      const state: GameState = {
        ...baseState,
        dungeon,
        party: { ...baseState.party, gold: 500 },
      };

      // Act
      const resultState = DungeonMovementOps.moveForward(state);

      // Assert: All non-dungeon state should be preserved
      expect(resultState.state.roster).toEqual(state.roster);
      expect(resultState.state.party.gold).toBe(500);
      expect(resultState.state.party.members).toEqual(['char1']);
      expect(resultState.state.settings).toEqual(state.settings);
    });
  });

  describe('End-to-end stairs_down flow', () => {
    it('completes full stairs_down transition from level 1 to level 2', () => {
      const level = DungeonService.loadLevel(1);
      const stairsTile = DungeonService.getTile(level, 0, 10);

      // Stairs are wall types, not tile types
      expect(stairsTile.walls?.west).toBe('stairs_down');
      expect(stairsTile.destination).toBeDefined();
      expect(stairsTile.destination?.level).toBe(2);

      // Start at (0, 10) facing WEST to walk through stairs_down wall
      const dungeon = createTestDungeon({
        position: { x: 0, y: 10, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      // Act: Move forward (WEST) through stairs_down wall triggers level transition
      const resultState = DungeonMovementOps.moveForward(state);

      expect(resultState.state.dungeon).toBeDefined();
      expect(resultState.state.dungeon!.currentLevel).toBe(2);
      expect(resultState.state.dungeon!.position).toBeDefined();
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
              west: 'wall',
            },
            destination: {
              level: 3,
              x: 10,
              y: 15,
            },
          },
        ],
      };

      // Mock DungeonService to return our test level
      const originalLoadLevel = DungeonService.loadLevel;
      const originalGetTile = DungeonService.getTile;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(testLevel);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return (
          testLevel.tiles.find((t) => t.x === x && t.y === y) || {
            x,
            y,
            walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          }
        );
      });

      try {
        const dungeon = createTestDungeon({
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: true,
        });
        const state: GameState = { ...baseState, dungeon };

        const validation = DungeonService.canMove(
          testLevel,
          { x: 5, y: 5, facing: 'NORTH' },
          'FORWARD',
        );

        // Assert 1: Should trigger stairs action
        expect(validation.allowed).toBe(true);
        expect(validation.triggersSpecialAction).toBe('stairs');
        expect(validation.destination?.level).toBe(3);
        expect(validation.destination?.x).toBe(10);
        expect(validation.destination?.y).toBe(15);

        // Act 2: Execute transition
        const resultState = DungeonMovementOps.moveForward(state);

        // Assert 2: Should transition to level 3 at specified coordinates
        expect(resultState.state.dungeon!.currentLevel).toBe(3);
        expect(resultState.state.dungeon!.position.x).toBe(10);
        expect(resultState.state.dungeon!.position.y).toBe(15);
        expect(resultState.state.dungeon!.position.facing).toBe('NORTH'); // Preserves facing
      } finally {
        // Restore original methods
        jest.restoreAllMocks();
      }
    });
  });

  describe('Non-stairs movement still works', () => {
    it('allows normal forward movement when no stairs present', () => {
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'NORTH' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      const result = DungeonMovementOps.moveForward(state);

      expect(result.state.dungeon?.position.y).toBe(1);
      expect(result.state.dungeon?.position.x).toBe(0);
      expect(result.state.dungeon?.currentLevel).toBe(1);
    });

    it('allows strafe movement without triggering stairs', () => {
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      const result = DungeonMovementOps.strafeLeft(state);

      expect(result.state.dungeon).toBeDefined();
      expect(result.state.dungeon!.currentLevel).toBe(1);
      expect(result.state.dungeon!.position.facing).toBe('WEST');
    });

    it('allows backward movement without triggering stairs', () => {
      const dungeon = createTestDungeon({
        position: { x: 0, y: 1, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      const result = DungeonMovementOps.moveBackward(state);

      expect(result.state.dungeon).toBeDefined();
      expect(result.state.dungeon!.currentLevel).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('allows rotation while on stairs tile', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      const result = DungeonRotationService.turnLeft(state);

      // Should rotate to SOUTH without triggering stairs
      expect(result.dungeon?.position.facing).toBe('SOUTH');
      expect(result.dungeon).toBeDefined(); // Still in dungeon
      expect(result.dungeon!.currentLevel).toBe(1);
    });

    it('allows right rotation on stairs tile', () => {
      const level = DungeonService.loadLevel(1);
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      const result = DungeonRotationService.turnRight(state);

      // Should rotate to NORTH without triggering stairs
      expect(result.dungeon?.position.facing).toBe('NORTH');
      expect(result.dungeon).toBeDefined();
      expect(result.dungeon!.currentLevel).toBe(1);
    });

    it('triggers stairs only when moving forward through stairs wall', () => {
      // Verify stairs only trigger on forward movement, not on other actions
      const level = DungeonService.loadLevel(1);
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      // Test rotation doesn't trigger
      let turnResult = DungeonRotationService.turnLeft(state);
      expect(turnResult.dungeon).toBeDefined();

      // Test forward movement DOES trigger
      const moveResult = DungeonMovementOps.moveForward(state);
      expect(moveResult.state.dungeon).toBeUndefined(); // Castle transition
    });

    it('handles moving to stairs tile then stepping on it', () => {
      // Test the full flow: move to a tile, then step onto stairs from there
      const level = DungeonService.loadLevel(1);
      const dungeon = createTestDungeon({
        position: { x: 0, y: 1, facing: 'SOUTH' },
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      // Move south to (0,0)
      const result = DungeonMovementOps.moveForward(state);

      // Should be at (0,0) now, facing south
      expect(result.state.dungeon?.position.x).toBe(0);
      expect(result.state.dungeon?.position.y).toBe(0);
      expect(result.state.dungeon?.position.facing).toBe('SOUTH');
      expect(result.state.dungeon?.currentLevel).toBe(1);
    });

    it('handles stairs transition with missing destination coordinates', () => {
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
              west: 'wall',
            },
            destination: { level: 2 }, // Missing x, y coordinates
          },
        ],
      };

      // Test that transition uses default coordinates (0, 0) when not specified
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(testLevel);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return (
          testLevel.tiles.find((t) => t.x === x && t.y === y) || {
            x,
            y,
            walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          }
        );
      });

      try {
        const dungeon = createTestDungeon({
          position: { x: 5, y: 5, facing: 'NORTH' },
          lightActive: true,
        });
        const state: GameState = { ...baseState, dungeon };

        const result = DungeonMovementOps.moveForward(state);

        // Should use default coordinates (0, 0)
        expect(result.state.dungeon!.currentLevel).toBe(2);
        expect(result.state.dungeon!.position.x).toBe(0);
        expect(result.state.dungeon!.position.y).toBe(0);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  describe('Cross-service integration', () => {
    it('chains DungeonService.canMove → DungeonMovementOps.moveForward → handleStairsTransition', () => {
      // Full integration test of the complete flow
      const level = DungeonService.loadLevel(1);
      const position = { x: 0, y: 0, facing: 'WEST' as const };

      // Step 1: DungeonService validates movement
      const validation = DungeonService.canMove(level, position, 'FORWARD');
      expect(validation.allowed).toBe(true);
      expect(validation.triggersSpecialAction).toBe('stairs');

      // Step 2: Create game state
      const dungeon = createTestDungeon({
        position,
        lightActive: true,
      });
      const state: GameState = { ...baseState, dungeon };

      // Step 3: NavigationService executes movement
      const result = DungeonMovementOps.moveForward(state);

      // Step 4: Verify handleStairsTransition was called and worked
      expect(result.state.dungeon).toBeUndefined(); // Castle transition completed
    });

    it('verifies immutable state updates throughout stairs transition', () => {
      const dungeon = createTestDungeon({
        position: { x: 0, y: 0, facing: 'WEST' },
        lightActive: true,
        visitedTiles: new Set(['1-0-1']),
        defeatedEncounters: ['enc1'],
        unlockedDoors: new Set(['door1']),
        openDoors: new Set(['door2']),
      });
      const originalState: GameState = {
        ...baseState,
        dungeon: { ...dungeon },
      };
      const state: GameState = { ...originalState };

      // Execute transition
      const result = DungeonMovementOps.moveForward(state);

      // Verify original state wasn't mutated
      expect(state.dungeon).toBeDefined();
      expect(state.dungeon!.currentLevel).toBe(1);
      expect(state.dungeon!.position.x).toBe(0);
      expect(state.dungeon!.position.y).toBe(0);

      // Verify new state is different
      expect(result.state).not.toBe(state);
      expect(result.state.dungeon).toBeUndefined();
    });
  });
});

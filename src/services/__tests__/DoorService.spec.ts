import { DoorService } from '../DoorService';
import { LevelData, Position } from '../../types/Dungeon';
import { createTestCharacter, createTestGameState } from '../../test-helpers/test-factories';
import { GameState } from '../../types/GameState';

describe('DoorService', () => {
  describe('canKickDoor', () => {
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'north' },
      edgeWrapping: false,
      tiles: [
        { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, type: 'door', locked: true },
        { x: 2, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 0, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 2, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
      ],
      encounterRate: 0.1,
      encounterTable: 'level_1',
    };

    it('returns true when facing a locked door', () => {
      const position: Position = { x: 0, y: 0, facing: 'EAST' };
      const result = DoorService.canKickDoor(level, position);
      expect(result).toBe(true);
    });

    it('returns false when not facing a door', () => {
      const position: Position = { x: 0, y: 0, facing: 'SOUTH' };
      const result = DoorService.canKickDoor(level, position);
      expect(result).toBe(false);
    });

    it('returns false when facing an unlocked door', () => {
      const levelUnlocked: LevelData = {
        ...level,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
          { x: 1, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, type: 'door', locked: false },
          { x: 2, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
          { x: 0, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
          { x: 1, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
          { x: 2, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        ],
      };
      const position: Position = { x: 0, y: 0, facing: 'EAST' };
      const result = DoorService.canKickDoor(levelUnlocked, position);
      expect(result).toBe(false);
    });
  });

  describe('kickDoor', () => {
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'north' },
      edgeWrapping: false,
      tiles: [
        { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, type: 'door', locked: true },
        { x: 2, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 0, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 2, y: 1, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
      ],
      encounterRate: 0.1,
      encounterTable: 'level_1',
    };

    it('unlocks door on successful kick (high STR)', () => {
      const character = createTestCharacter({ id: 'char1', strength: 18 });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'EAST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          visitedTiles: new Set(),
        },
      };

      // Run multiple times to ensure success occurs (STR 18 = 92% success)
      let successOccurred = false;
      for (let i = 0; i < 20; i++) {
        const result = DoorService.kickDoor(state, 'char1');

        // Check if door is unlocked in dungeon state
        // (Door state should be stored in dungeon.unlockedDoors set)
        // Door is at x=1, y=0 (position 0,0 facing EAST)
        // Door key format: "level_y_x" = "1_0_1"
        if (result.dungeon.unlockedDoors?.has('1_0_1')) {
          successOccurred = true;
          break;
        }
      }
      expect(successOccurred).toBe(true);
    });

    it('deals 1d3 damage on failed kick', () => {
      const character = createTestCharacter({
        id: 'char1',
        strength: 3, // Min STR = 32% success
        hp: 50,
        maxHp: 50
      });

      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'EAST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          visitedTiles: new Set(),
        },
      };

      // Run multiple times to ensure failure occurs
      let damageOccurred = false;
      for (let i = 0; i < 20; i++) {
        const result = DoorService.kickDoor(state, 'char1');
        const charAfter = result.roster.get('char1')!;

        if (charAfter.hp < 50) {
          damageOccurred = true;
          // Damage should be 1-3
          expect(charAfter.hp).toBeGreaterThanOrEqual(50 - 3);
          expect(charAfter.hp).toBeLessThan(50);
          break;
        }
      }
      expect(damageOccurred).toBe(true);
    });

    it('has 12.5% encounter chance on successful kick', () => {
      const character = createTestCharacter({ id: 'char1', strength: 18 });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'EAST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          visitedTiles: new Set(),
        },
      };

      // Run 100 times and count encounters (expect ~12-13)
      let encounterCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = DoorService.kickDoor(state, 'char1');

        // Check if encounter flag set
        if (result.encounterTriggered === true) {
          encounterCount++;
        }
      }

      // Should be around 12-13 out of 100 (allow 5-20 range for variance)
      expect(encounterCount).toBeGreaterThanOrEqual(5);
      expect(encounterCount).toBeLessThanOrEqual(20);
    });
  });
});

import { DoorService } from '../DoorService';
import { Level, Position } from '../../types/Dungeon';

describe('DoorService', () => {
  describe('canKickDoor', () => {
    const level: Level = {
      id: 1,
      width: 20,
      height: 20,
      tiles: [
        [{ type: 'floor' }, { type: 'door', locked: true }, { type: 'floor' }],
        [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
      ],
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
      const levelUnlocked: Level = {
        ...level,
        tiles: [
          [{ type: 'floor' }, { type: 'door', locked: false }, { type: 'floor' }],
          [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
        ],
      };
      const position: Position = { x: 0, y: 0, facing: 'EAST' };
      const result = DoorService.canKickDoor(levelUnlocked, position);
      expect(result).toBe(false);
    });
  });
});

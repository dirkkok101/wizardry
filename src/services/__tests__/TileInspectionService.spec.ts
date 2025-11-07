import { TileInspectionService } from '../TileInspectionService';
import { Level, Position } from '../../types/Dungeon';

describe('TileInspectionService', () => {
  describe('hasSearchableContent', () => {
    const level: Level = {
      id: 1,
      width: 20,
      height: 20,
      tiles: [
        [
          { type: 'floor' },
          { type: 'searchable', searchContent: { itemId: 'bronze_key' } },
        ],
      ],
    };

    it('returns true for searchable tile with content', () => {
      const position: Position = { x: 1, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.hasSearchableContent(level, position);
      expect(result).toBe(true);
    });

    it('returns false for non-searchable tile', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.hasSearchableContent(level, position);
      expect(result).toBe(false);
    });
  });

  describe('inspectTile', () => {
    it('returns item from searchable tile', () => {
      const level: Level = {
        id: 1,
        width: 20,
        height: 20,
        tiles: [
          [
            { type: 'searchable', searchContent: { itemId: 'bronze_key', message: 'You found a bronze key!' } },
          ],
        ],
      };
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.inspectTile(level, position);

      expect(result.found).toBe(true);
      expect(result.itemId).toBe('bronze_key');
      expect(result.message).toBe('You found a bronze key!');
    });

    it('returns empty result for non-searchable tile', () => {
      const level: Level = {
        id: 1,
        width: 20,
        height: 20,
        tiles: [[{ type: 'floor' }]],
      };
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.inspectTile(level, position);

      expect(result.found).toBe(false);
      expect(result.itemId).toBeUndefined();
    });
  });
});

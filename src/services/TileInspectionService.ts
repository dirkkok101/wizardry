import { Level, Position } from '../types/Dungeon';

export interface InspectionResult {
  found: boolean;
  itemId?: string;
  message?: string;
}

export class TileInspectionService {
  /**
   * Check if current tile has searchable content
   */
  static hasSearchableContent(level: Level, position: Position): boolean {
    const tile = level.tiles[position.y][position.x];
    return tile.type === 'searchable' && !!tile.searchContent;
  }

  /**
   * Inspect current tile and return search results
   * Returns item ID and message if found
   */
  static inspectTile(level: Level, position: Position): InspectionResult {
    const tile = level.tiles[position.y][position.x];

    if (tile.type !== 'searchable' || !tile.searchContent) {
      return { found: false };
    }

    const { itemId, message } = tile.searchContent;

    return {
      found: true,
      itemId,
      message: message || `You found ${itemId}!`,
    };
  }
}

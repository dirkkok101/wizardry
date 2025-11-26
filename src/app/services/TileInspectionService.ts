import { LevelData, Position } from '@types/Dungeon';
import { GameState } from '@types/GameState';
import { DungeonService } from './DungeonService';

export interface InspectionResult {
  found: boolean;
  itemId?: string;
  message?: string;
  state?: GameState;
}

export class TileInspectionService {
  /**
   * Check if current tile has searchable content
   */
  static hasSearchableContent(level: LevelData, position: Position): boolean {
    const tile = DungeonService.getTile(level, position.x, position.y);
    return tile.type === 'searchable' && !!tile.item;
  }

  /**
   * Inspect current tile and return search results
   * Returns item ID and message if found
   */
  static inspectTile(level: LevelData, position: Position): InspectionResult {
    const tile = DungeonService.getTile(level, position.x, position.y);

    if (tile.type !== 'searchable' || !tile.item) {
      return { found: false };
    }

    const itemId = tile.item;
    const message = tile.message || `You found ${itemId}!`;

    return {
      found: true,
      itemId,
      message,
    };
  }

  /**
   * Inspect tile with game state integration
   * Adds item to first party member inventory and clears tile content
   */
  static inspectTileWithState(state: GameState, level: LevelData): InspectionResult {
    if (!state.dungeon) {
      return { found: false, state };
    }

    const position = state.dungeon.position;
    const tile = DungeonService.getTile(level, position.x, position.y);

    if (tile.type !== 'searchable' || !tile.item) {
      return { found: false, state };
    }

    const itemId = tile.item;
    const message = tile.message || `You found ${itemId}!`;

    // Add item to first party member's inventory
    const firstMemberId = state.party.members[0];
    const character = state.roster.get(firstMemberId)!;

    const newRoster = new Map(state.roster);
    newRoster.set(firstMemberId, {
      ...character,
      inventory: [...character.inventory, { itemId, equipped: false }],
    });

    // Clear tile content (one-time search)
    // Find the tile in the 1D array and mutate it
    const tileIndex = level.tiles.findIndex(t => t.x === position.x && t.y === position.y);
    if (tileIndex !== -1) {
      level.tiles[tileIndex] = { ...tile, item: undefined };
    }

    const newState: GameState = {
      ...state,
      roster: newRoster,
    };

    return {
      found: true,
      itemId,
      message,
      state: newState,
    };
  }
}

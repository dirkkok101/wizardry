import { Level, Position } from '../types/Dungeon';
import { GameState } from '../types/GameState';

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

  /**
   * Inspect tile with game state integration
   * Adds item to first party member inventory and clears tile content
   */
  static inspectTileWithState(state: GameState, level: Level): InspectionResult {
    const position = state.dungeon.position;
    const tile = level.tiles[position.y][position.x];

    if (tile.type !== 'searchable' || !tile.searchContent) {
      return { found: false, state };
    }

    const { itemId, message } = tile.searchContent;

    // Add item to first party member's inventory
    const firstMemberId = state.party.members[0];
    const character = state.roster.get(firstMemberId)!;

    const newRoster = new Map(state.roster);
    newRoster.set(firstMemberId, {
      ...character,
      inventory: [...character.inventory, { itemId, equipped: false }],
    });

    // Clear tile content (one-time search)
    // Mutate the level tile directly to ensure subsequent inspections see cleared state
    level.tiles[position.y][position.x] = { ...tile, searchContent: undefined };

    const newState: GameState = {
      ...state,
      roster: newRoster,
    };

    return {
      found: true,
      itemId,
      message: message || `You found ${itemId}!`,
      state: newState,
    };
  }
}

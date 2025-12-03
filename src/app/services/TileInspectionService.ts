import { DungeonState, LevelData, Position } from '@models/Dungeon';
import { GameState } from '@models/GameState';
import { Item } from '@models/Item';
import { DungeonService } from './DungeonService';
import { ItemDataLoader } from './ItemDataLoader';

export interface InspectionResult {
  found: boolean;
  itemId?: string;
  message?: string;
  state?: GameState;
}

/**
 * Generate unique key for looted tile tracking
 */
function getLootedTileKey(level: number, x: number, y: number): string {
  return `${level}_${x}_${y}`;
}

export class TileInspectionService {
  /**
   * Check if current tile has searchable content that hasn't been looted yet
   *
   * @param level - The level data
   * @param position - Current position
   * @param dungeonState - Optional dungeon state to check lootedTiles
   */
  static hasSearchableContent(
    level: LevelData,
    position: Position,
    dungeonState?: DungeonState
  ): boolean {
    const tile = DungeonService.getTile(level, position.x, position.y);

    // Must be searchable with an item defined
    if (!tile.types?.includes('searchable') || !tile.item) {
      return false;
    }

    // If dungeon state provided, check if already looted
    if (dungeonState) {
      const key = getLootedTileKey(level.level, position.x, position.y);
      if (dungeonState.lootedTiles.has(key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Inspect current tile and return search results
   * Returns item ID and message if found
   */
  static inspectTile(level: LevelData, position: Position): InspectionResult {
    const tile = DungeonService.getTile(level, position.x, position.y);

    if (!tile.types?.includes('searchable') || !tile.item) {
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
   * Adds item to first party member inventory and marks tile as looted
   *
   * Flow:
   * 1. Check if tile is searchable with an item
   * 2. Check if tile has already been looted (via lootedTiles)
   * 3. Look up item data, add to inventory, mark tile as looted
   */
  static inspectTileWithState(state: GameState, level: LevelData): InspectionResult {
    if (!state.dungeon) {
      return { found: false, state };
    }

    const position = state.dungeon.position;
    const tile = DungeonService.getTile(level, position.x, position.y);

    // Check if tile is searchable with an item
    if (!tile.types?.includes('searchable') || !tile.item) {
      return { found: false, state };
    }

    // Check if already looted
    const lootKey = getLootedTileKey(level.level, position.x, position.y);
    if (state.dungeon.lootedTiles.has(lootKey)) {
      return {
        found: false,
        state,
        message: 'You have already searched here.'
      };
    }

    const itemId = tile.item;

    // Look up the full Item from ItemDataLoader
    const baseItem = ItemDataLoader.getItem(itemId);
    if (!baseItem) {
      // Item not found in database
      return { found: false, state, message: 'Item data not found' };
    }

    // Create item instance (found items start unidentified and unequipped)
    const itemInstance: Item = {
      ...baseItem,
      identified: false,
      equipped: false
    };

    // Add item to first party member's inventory
    const firstMemberId = state.party.members[0];
    const character = state.roster.get(firstMemberId)!;

    const newRoster = new Map(state.roster);
    newRoster.set(firstMemberId, {
      ...character,
      inventory: [...character.inventory, itemInstance],
    });

    // Mark tile as looted (persisted in dungeon state)
    const newLootedTiles = new Set(state.dungeon.lootedTiles);
    newLootedTiles.add(lootKey);

    const newState: GameState = {
      ...state,
      roster: newRoster,
      dungeon: {
        ...state.dungeon,
        lootedTiles: newLootedTiles
      }
    };

    // Use item's display name in message, or show tile message if defined
    const itemName = baseItem.name || itemId;
    const message = tile.message
      ? `${tile.message} You found a ${itemName}!`
      : `You found a ${itemName}!`;

    return {
      found: true,
      itemId,
      message,
      state: newState,
    };
  }
}

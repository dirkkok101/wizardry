import { GameState } from '../types/GameState';
import { LevelData, Position } from '../types/Dungeon';
import { NavigationService } from './NavigationService';
import { DungeonService } from './DungeonService';

export class DoorService {
  /**
   * Check if party can kick a door from current position
   */
  static canKickDoor(level: LevelData, position: Position): boolean {
    // Get tile in front of party
    const delta = NavigationService.getFacingDelta(position.facing);
    const targetX = position.x + delta.x;
    const targetY = position.y + delta.y;

    // Check bounds
    if (targetX < 0 || targetX >= level.size.width || targetY < 0 || targetY >= level.size.height) {
      return false;
    }

    const tile = DungeonService.getTile(level, targetX, targetY);

    // Must be a locked door
    return tile.type === 'door' && tile.locked === true;
  }

  /**
   * Attempt to kick down a locked door
   * Success: (STR × 4%) + 20% (range 32-92%)
   * Success: Unlock door + 12.5% encounter chance
   * Failure: 1d3 damage to kicker
   */
  static kickDoor(
    state: GameState,
    characterId: string
  ): GameState {
    const character = state.roster.get(characterId);
    if (!character) {
      return state;
    }

    const level = DungeonService.loadLevel(state.dungeon.currentLevel);
    const position = state.dungeon.position;

    // Get door location
    const delta = NavigationService.getFacingDelta(position.facing);
    const doorX = position.x + delta.x;
    const doorY = position.y + delta.y;

    // Calculate success chance: (STR × 4%) + 20%
    const successChance = (character.strength * 4) + 20;
    const roll = Math.random() * 100;

    if (roll < successChance) {
      // Success - unlock door
      const doorKey = `${state.dungeon.currentLevel}_${doorY}_${doorX}`;
      const newUnlockedDoors = new Set(state.dungeon.unlockedDoors);
      newUnlockedDoors.add(doorKey);

      // 12.5% encounter chance
      const encounterRoll = Math.random() * 100;
      const encounterTriggered = encounterRoll < 12.5;

      return {
        ...state,
        dungeon: {
          ...state.dungeon,
          unlockedDoors: newUnlockedDoors,
        },
        encounterTriggered,
      };
    } else {
      // Failure - deal 1d3 damage to kicker
      const damage = Math.floor(Math.random() * 3) + 1;
      const newRoster = new Map(state.roster);
      newRoster.set(characterId, {
        ...character,
        hp: Math.max(0, character.hp - damage),
      });

      return {
        ...state,
        roster: newRoster,
      };
    }
  }
}

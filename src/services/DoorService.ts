import { GameState } from '../types/GameState';
import { Level, Position, Tile } from '../types/Dungeon';
import { Character } from '../types/Character';
import { NavigationService } from './NavigationService';

export class DoorService {
  /**
   * Check if party can kick a door from current position
   */
  static canKickDoor(level: Level, position: Position): boolean {
    // Get tile in front of party
    const delta = NavigationService.getFacingDelta(position.facing);
    const targetX = position.x + delta.x;
    const targetY = position.y + delta.y;

    // Check bounds
    if (targetX < 0 || targetX >= level.width || targetY < 0 || targetY >= level.height) {
      return false;
    }

    const tile = level.tiles[targetY][targetX];

    // Must be a locked door
    return tile.type === 'door' && tile.locked === true;
  }

  /**
   * Attempt to kick down a locked door
   * @returns Updated game state with door state and possible damage/encounter
   */
  static kickDoor(
    state: GameState,
    characterId: string
  ): GameState {
    // TODO: Implementation in Phase 5C
    return state;
  }
}

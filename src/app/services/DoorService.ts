import { GameState } from '@types/GameState';
import { LevelData, Position } from '@types/Dungeon';
import { DungeonMovementService } from './DungeonMovementService';
import { DungeonService } from './DungeonService';
import { RandomService } from './RandomService';

export class DoorService {
  /**
   * Check if party can open a door from current position
   * Works with wall-based doors (modern approach)
   */
  static canOpenDoor(level: LevelData, position: Position): boolean {
    const currentTile = DungeonService.getTile(level, position.x, position.y);

    // Check the wall in the direction we're facing
    const wallType = currentTile.walls[position.facing.toLowerCase() as 'north' | 'south' | 'east' | 'west'];

    // Can open if there's a door or locked_door wall
    return wallType === 'door' || wallType === 'locked_door';
  }

  /**
   * Check if party can kick a door from current position (legacy tile-based)
   */
  static canKickDoor(level: LevelData, position: Position): boolean {
    // Get tile in front of party
    const delta = DungeonMovementService.getFacingDelta(position.facing);
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
   * Open a door at current position
   * Adds BOTH sides of the door to openDoors set (current tile and adjacent tile)
   */
  static openDoor(state: GameState): GameState {
    if (!state.dungeon) {
      return state;
    }

    const { currentLevel, position } = state.dungeon;
    const newOpenDoors = new Set(state.dungeon.openDoors);

    // Add current tile door
    const currentDoorKey = `${currentLevel}_${position.y}_${position.x}`;
    newOpenDoors.add(currentDoorKey);

    // Calculate adjacent tile position based on facing direction
    const delta = DungeonMovementService.getFacingDelta(position.facing);
    const adjX = position.x + delta.x;
    const adjY = position.y + delta.y;

    // Add adjacent tile door (the other side of the same wall)
    const adjacentDoorKey = `${currentLevel}_${adjY}_${adjX}`;
    newOpenDoors.add(adjacentDoorKey);

    console.log('[DoorService] Opening door at:', {
      position,
      currentDoorKey,
      adjacentDoorKey,
      openDoorsSize: newOpenDoors.size
    });

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        openDoors: newOpenDoors,
      },
    };
  }

  /**
   * Attempt to kick down a locked door (legacy tile-based)
   * Success: (STR × 4%) + 20% (range 32-92%)
   * Success: Unlock door + 12.5% encounter chance
   * Failure: 1d3 damage to kicker
   */
  static kickDoor(
    state: GameState,
    characterId: string
  ): GameState {
    const character = state.roster.get(characterId);
    if (!character || !state.dungeon) {
      return state;
    }

    const level = DungeonService.loadLevel(state.dungeon.currentLevel);
    const position = state.dungeon.position;

    // Get door location
    const delta = DungeonMovementService.getFacingDelta(position.facing);
    const doorX = position.x + delta.x;
    const doorY = position.y + delta.y;

    // Calculate success chance: (STR × 4%) + 20%
    const successChance = (character.strength * 4) + 20;
    const success = RandomService.chance(successChance);

    if (success) {
      // Success - unlock door
      const doorKey = `${state.dungeon.currentLevel}_${doorY}_${doorX}`;
      const newUnlockedDoors = new Set(state.dungeon.unlockedDoors);
      newUnlockedDoors.add(doorKey);

      // 12.5% encounter chance
      const encounterTriggered = RandomService.chance(12.5);

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
      const damage = RandomService.rollDie(3);
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

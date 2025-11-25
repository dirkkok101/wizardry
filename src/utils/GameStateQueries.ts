import { GameState } from '../types/GameState';
import { Character } from '../types/Character';
import { CharacterStatus } from '../types/CharacterStatus';

/**
 * GameStateQueries - Pure utility functions for querying game state
 *
 * These helper functions eliminate duplicate computed signal logic across scenes.
 * All functions are pure and return new arrays (no mutations).
 */
export const GameStateQueries = {
  /**
   * Get all party members as Character objects
   * Used by: Castle Menu, Temple, Camp, Inn, and most scenes displaying party
   * @param state - Current game state
   * @returns Array of Character objects for current party members
   */
  partyCharacters(state: GameState): Character[] {
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  },

  /**
   * Get characters available to join party (not currently in party)
   * Optionally filter by status
   * Used by: Tavern (OK status only)
   * @param state - Current game state
   * @param status - Optional status filter (e.g., CharacterStatus.OK)
   * @returns Array of Character objects not in the current party
   */
  availableCharacters(state: GameState, status?: CharacterStatus): Character[] {
    const available = Array.from(state.roster.values())
      .filter(char => !state.party.members.includes(char.id));

    if (status !== undefined) {
      return available.filter(char => char.status === status);
    }
    return available;
  },

  /**
   * Get party members that need healing/resurrection (not OK status)
   * Used by: Temple
   * @param state - Current game state
   * @returns Array of party members with status other than OK
   */
  afflictedCharacters(state: GameState): Character[] {
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .filter(char => char.status !== CharacterStatus.OK);
  },

  /**
   * Get party members with specific status
   * Used by: Temple (filtering by POISONED, PARALYZED, DEAD, ASHES)
   * @param state - Current game state
   * @param status - The status to filter by
   * @returns Array of party members matching the specified status
   */
  partyCharactersWithStatus(state: GameState, status: CharacterStatus): Character[] {
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .filter(char => char.status === status);
  },

  /**
   * Get all characters from roster (for stables/inn individual rest)
   * Used by: Inn
   * @param state - Current game state
   * @returns Array of all characters in the roster
   */
  allCharacters(state: GameState): Character[] {
    return Array.from(state.roster.values());
  },

  /**
   * Get front row characters
   * Used by: Tavern, Camp (formation display)
   * @param state - Current game state
   * @returns Array of characters in the front row of the party formation
   */
  frontRowCharacters(state: GameState): Character[] {
    return state.party.formation.frontRow
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  },

  /**
   * Get back row characters
   * Used by: Tavern, Camp (formation display)
   * @param state - Current game state
   * @returns Array of characters in the back row of the party formation
   */
  backRowCharacters(state: GameState): Character[] {
    return state.party.formation.backRow
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  },

  /**
   * Check if party can enter maze (all members OK or INJURED)
   * Used by: Camp
   * @param state - Current game state
   * @returns true if party has members and all are OK or INJURED status
   */
  canPartyEnterMaze(state: GameState): boolean {
    const party = state.party;
    if (party.members.length === 0) return false;

    return party.members.every(memberId => {
      const char = state.roster.get(memberId);
      return char?.status === CharacterStatus.OK ||
             char?.status === CharacterStatus.INJURED;
    });
  },

  /**
   * Check if party has any members
   * Used by: Castle Menu (maze button enablement)
   * @param state - Current game state
   * @returns true if party has at least one member
   */
  hasPartyMembers(state: GameState): boolean {
    return state.party.members.length > 0;
  },

  /**
   * Get a single character by ID
   * Used by: Multiple scenes for selected character
   * @param state - Current game state
   * @param characterId - The ID of the character to find
   * @returns The Character object if found, undefined otherwise
   */
  getCharacter(state: GameState, characterId: string): Character | undefined {
    return state.roster.get(characterId);
  },

  /**
   * Get party gold
   * Used by: Multiple scenes
   * @param state - Current game state
   * @returns Current gold amount held by the party
   */
  partyGold(state: GameState): number {
    return state.party.gold;
  },

  /**
   * Check if character can move up in party order
   * @param state - Current game state
   * @param characterId - The ID of the character to check
   * @returns true if character is in party and not already first
   */
  canMoveUp(state: GameState, characterId: string): boolean {
    const index = state.party.members.indexOf(characterId);
    return index > 0;
  },

  /**
   * Check if character can move down in party order
   * @param state - Current game state
   * @param characterId - The ID of the character to check
   * @returns true if character is in party and not already last
   */
  canMoveDown(state: GameState, characterId: string): boolean {
    const index = state.party.members.indexOf(characterId);
    return index >= 0 && index < state.party.members.length - 1;
  }
};

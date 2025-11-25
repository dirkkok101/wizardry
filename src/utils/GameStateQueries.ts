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
   */
  allCharacters(state: GameState): Character[] {
    return Array.from(state.roster.values());
  },

  /**
   * Get front row characters
   * Used by: Tavern, Camp (formation display)
   */
  frontRowCharacters(state: GameState): Character[] {
    return state.party.formation.frontRow
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  },

  /**
   * Get back row characters
   * Used by: Tavern, Camp (formation display)
   */
  backRowCharacters(state: GameState): Character[] {
    return state.party.formation.backRow
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  },

  /**
   * Check if party can enter maze (all members OK or INJURED)
   * Used by: Camp
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
   */
  hasPartyMembers(state: GameState): boolean {
    return state.party.members.length > 0;
  },

  /**
   * Get a single character by ID
   * Used by: Multiple scenes for selected character
   */
  getCharacter(state: GameState, characterId: string): Character | undefined {
    return state.roster.get(characterId);
  },

  /**
   * Get party gold
   * Used by: Multiple scenes
   */
  partyGold(state: GameState): number {
    return state.party.gold;
  },

  /**
   * Check if character can move up in party order
   */
  canMoveUp(state: GameState, characterId: string): boolean {
    const index = state.party.members.indexOf(characterId);
    return index > 0;
  },

  /**
   * Check if character can move down in party order
   */
  canMoveDown(state: GameState, characterId: string): boolean {
    const index = state.party.members.indexOf(characterId);
    return index >= 0 && index < state.party.members.length - 1;
  }
};

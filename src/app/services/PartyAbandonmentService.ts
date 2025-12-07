import { GameState, Body } from '@models/GameState';
import { CharacterStatus } from '@models/CharacterStatus';
import { SceneType } from '@models/SceneType';

/**
 * Service for handling party abandonment in the dungeon.
 *
 * When a party is abandoned (either voluntarily or via escape hatch):
 * - All living party members are marked as DEAD
 * - Bodies are left at current dungeon position with their share of gold
 * - Party is cleared (members = [])
 * - Dungeon/combat state is cleared
 * - Player returns to castle with empty party
 *
 * This is the "total party kill" scenario, allowing stuck players to recover.
 */
export class PartyAbandonmentService {
  /**
   * Abandon party in maze - kills all members and leaves bodies.
   *
   * @param state - Current game state (must have dungeon state)
   * @returns New game state with party abandoned
   */
  static abandonParty(state: GameState): GameState {
    const bodies = new Map<string, Body>(state.bodies || []);
    const roster = new Map(state.roster);

    // Count living party members for gold split
    const livingMembers = state.party.members.filter(charId => {
      const char = roster.get(charId);
      return char && char.status === CharacterStatus.OK;
    });

    // Calculate gold per body (floor to handle odd amounts)
    const goldPerBody = livingMembers.length > 0
      ? Math.floor(state.party.gold / livingMembers.length)
      : 0;

    // Kill each living party member and create body
    for (const charId of state.party.members) {
      const char = roster.get(charId);
      if (char && char.status === CharacterStatus.OK) {
        // Mark as dead with 0 HP
        roster.set(charId, {
          ...char,
          status: CharacterStatus.DEAD,
          hp: 0
        });

        // Leave body at current dungeon position
        if (state.dungeon) {
          bodies.set(charId, {
            characterId: charId,
            level: state.dungeon.currentLevel,
            x: state.dungeon.position.x,
            y: state.dungeon.position.y,
            gold: goldPerBody
          });
        }
      }
    }

    return {
      ...state,
      roster,
      bodies,
      party: {
        ...state.party,
        members: [],
        formation: { frontRow: [], backRow: [] },
        gold: 0
      },
      dungeon: undefined,
      combat: undefined,
      currentScene: SceneType.CASTLE_MENU
    };
  }
}

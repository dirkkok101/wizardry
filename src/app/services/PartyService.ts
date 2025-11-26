import { Party, GameState } from '@models/GameState'
import { Character } from '@models/Character'
import { Alignment } from '@models/Alignment'
import { CharacterStatus } from '@models/CharacterStatus'
import { isDefined } from '@utils/type-guards'

interface ValidationResult {
  allowed: boolean
  reason?: string
}

interface DivvyGoldResult {
  success: boolean
  error?: string
  updatedParty?: Party
  updatedRoster?: Map<string, Character>
}

const MAX_PARTY_SIZE = 6

export class PartyService {
  /**
   * Validate if character can be added to party
   * Checks: party size, alignment conflicts, character status, duplicates, body location
   */
  static canAddCharacterToParty(
    party: Party,
    character: Character,
    allCharacters: Map<string, Character>,
    bodiesInDungeon?: Map<string, unknown>
  ): ValidationResult {
    // Check if already in party
    if (party.members.includes(character.id)) {
      return { allowed: false, reason: 'Character already in party' }
    }

    // Check party size
    if (party.members.length >= MAX_PARTY_SIZE) {
      return { allowed: false, reason: `Party is full (maximum ${MAX_PARTY_SIZE} members)` }
    }

    // Check character status
    // Dead/Ashes characters CAN join if their body is in town (not in dungeon)
    // This allows bringing them to the Temple for resurrection
    const isDeadOrAshes = character.status === CharacterStatus.DEAD ||
                          character.status === CharacterStatus.ASHES
    const bodyIsInDungeon = bodiesInDungeon?.has(character.id) ?? false

    if (isDeadOrAshes && bodyIsInDungeon) {
      return { allowed: false, reason: `${character.name}'s body must be recovered from the dungeon first` }
    }

    // Characters with other non-OK statuses (LOST, PARALYZED, STONED, POISONED, ASLEEP) cannot join
    // LOST characters are permanently dead
    // Status effects like paralysis/stone/poison/asleep need to be cured first
    if (character.status !== CharacterStatus.OK && !isDeadOrAshes) {
      return { allowed: false, reason: `${character.name} is not available (status: ${character.status})` }
    }

    // Check alignment conflicts (Good vs Evil)
    const partyCharacters = party.members
      .map(id => allCharacters.get(id))
      .filter(isDefined)

    const hasGood = partyCharacters.some(c => c.alignment === Alignment.GOOD)
    const hasEvil = partyCharacters.some(c => c.alignment === Alignment.EVIL)

    if (hasGood && character.alignment === Alignment.EVIL) {
      return { allowed: false, reason: 'Good and Evil cannot party together' }
    }

    if (hasEvil && character.alignment === Alignment.GOOD) {
      return { allowed: false, reason: 'Good and Evil cannot party together' }
    }

    return { allowed: true }
  }

  /**
   * NOTE: divvyGold function removed in party gold migration.
   * In the new architecture, gold remains at party level and is not distributed to individual characters.
   * All town services (shop, temple, inn) now deduct from party.gold directly.
   */
}

// Gold Management Functions

export function getPartyGold(state: GameState): number {
  return state.party.gold;
}

export function addPartyGold(state: GameState, amount: number): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      gold: state.party.gold + amount
    }
  };
}

export function removePartyGold(state: GameState, amount: number): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      gold: Math.max(0, state.party.gold - amount)
    }
  };
}

export function hasEnoughGold(state: GameState, amount: number): boolean {
  return state.party.gold >= amount;
}

// Formation Movement Functions

export function moveCharacterUp(state: GameState, characterId: string): GameState {
  const currentIndex = state.party.members.indexOf(characterId);
  if (currentIndex <= 0) {
    return state; // Already at top or not found
  }

  const newMembers = [...state.party.members];
  // Swap with previous
  [newMembers[currentIndex - 1], newMembers[currentIndex]] =
    [newMembers[currentIndex], newMembers[currentIndex - 1]];

  return updateFormationFromMembers(state, newMembers);
}

export function moveCharacterDown(state: GameState, characterId: string): GameState {
  const currentIndex = state.party.members.indexOf(characterId);
  if (currentIndex === -1 || currentIndex >= state.party.members.length - 1) {
    return state; // Not found or already at bottom
  }

  const newMembers = [...state.party.members];
  // Swap with next
  [newMembers[currentIndex], newMembers[currentIndex + 1]] =
    [newMembers[currentIndex + 1], newMembers[currentIndex]];

  return updateFormationFromMembers(state, newMembers);
}

// Helper function to recalculate formation from members array
function updateFormationFromMembers(state: GameState, members: string[]): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      members,
      formation: {
        frontRow: members.slice(0, 3),
        backRow: members.slice(3, 6)
      }
    }
  };
}

import { Party } from '../types/GameState'
import { Character } from '../types/Character'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'

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
   * Checks: party size, alignment conflicts, character status, duplicates
   */
  static canAddCharacterToParty(
    party: Party,
    character: Character,
    allCharacters: Map<string, Character>
  ): ValidationResult {
    // Check if already in party
    if (party.members.includes(character.id)) {
      return { allowed: false, reason: 'Character already in party' }
    }

    // Check party size
    if (party.members.length >= MAX_PARTY_SIZE) {
      return { allowed: false, reason: `Party is full (maximum ${MAX_PARTY_SIZE} members)` }
    }

    // Check character status (only OK characters can join)
    if (character.status !== CharacterStatus.OK) {
      return { allowed: false, reason: `${character.name} is not available (status: ${character.status})` }
    }

    // Check alignment conflicts (Good vs Evil)
    const partyCharacters = party.members
      .map(id => allCharacters.get(id))
      .filter((c): c is Character => c !== undefined)

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
   * Distribute party's pooled gold equally among all members
   * Remainder distributed to first N members
   */
  static divvyGold(
    party: Party,
    roster: Map<string, Character>
  ): DivvyGoldResult {
    // Validate party has members
    if (party.members.length === 0) {
      return { success: false, error: 'No party members to distribute gold to' }
    }

    // Validate party has gold
    if (!party.gold || party.gold === 0) {
      return { success: false, error: 'No gold to distribute' }
    }

    const totalGold = party.gold
    const partySize = party.members.length
    const sharePerMember = Math.floor(totalGold / partySize)
    const remainder = totalGold % partySize

    // Create new roster with updated gold
    const updatedRoster = new Map(roster)
    party.members.forEach((memberId, index) => {
      const character = updatedRoster.get(memberId)
      if (character) {
        const bonusGold = index < remainder ? 1 : 0
        updatedRoster.set(memberId, {
          ...character,
          gold: (character.gold || 0) + sharePerMember + bonusGold
        })
      }
    })

    // Create new party with zero gold
    const updatedParty: Party = {
      ...party,
      gold: 0
    }

    return {
      success: true,
      updatedParty,
      updatedRoster
    }
  }
}

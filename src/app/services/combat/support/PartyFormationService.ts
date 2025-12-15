/**
 * Party Formation Service
 *
 * Handles party formation management during combat:
 * - Repositioning after casualties (dead/stoned/paralyzed to back)
 * - Front row advancement when casualties occur
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'

// Re-export for convenience
export { PartyFormationService }

/**
 * Party formation structure
 */
export interface PartyFormation {
  frontRow: string[]
  backRow: string[]
}

/**
 * Result of party repositioning
 */
export interface RepositionResult {
  newFormation: PartyFormation
  messages: string[]
  changedPositions: boolean
}

/**
 * Party Formation Service
 *
 * Manages party formation during combat.
 */
class PartyFormationService {
  /**
   * Check if a character is incapacitated (should be in back row)
   */
  static isIncapacitated(char: Character): boolean {
    return (
      char.hp <= 0 ||
      char.status === CharacterStatus.DEAD ||
      char.status === CharacterStatus.STONED ||
      char.status === CharacterStatus.PARALYZED
    )
  }

  /**
   * Reposition party after casualties
   *
   * Moves dead/stoned/paralyzed characters to the back,
   * and advances living characters to fill front row gaps.
   *
   * @param party - Party characters
   * @param characterUpdates - Updated character states from this round
   * @param formation - Current party formation
   * @returns New formation, messages, and whether positions changed
   */
  static repositionPartyAfterCasualties(
    party: Character[],
    characterUpdates: Map<string, Character>,
    formation: PartyFormation
  ): RepositionResult {
    // Get current state for each character
    const getCurrentState = (char: Character): Character => {
      return characterUpdates.get(char.id) || char
    }

    // Create lookup map for party by ID
    const partyById = new Map(party.map(c => [c.id, c]))

    // Get all members in order (front row first, then back row)
    const allMembers = [...formation.frontRow, ...formation.backRow]

    // Separate into capable and incapacitated
    const capable: string[] = []
    const incapacitated: string[] = []

    for (const memberId of allMembers) {
      const char = partyById.get(memberId)
      if (!char) continue

      const current = getCurrentState(char)
      if (this.isIncapacitated(current)) {
        incapacitated.push(memberId)
      } else {
        capable.push(memberId)
      }
    }

    // New formation: capable characters first (up to 3 in front), incapacitated at back
    const newFrontRow = capable.slice(0, 3)
    const newBackRow = [...capable.slice(3), ...incapacitated]

    // Check if formation actually changed
    const frontRowChanged =
      formation.frontRow.length !== newFrontRow.length ||
      !formation.frontRow.every((id, i) => id === newFrontRow[i])
    const backRowChanged =
      formation.backRow.length !== newBackRow.length ||
      !formation.backRow.every((id, i) => id === newBackRow[i])

    const changedPositions = frontRowChanged || backRowChanged

    // Generate messages for characters who advanced to front
    const messages: string[] = []
    if (changedPositions) {
      const originalBackRowSet = new Set(formation.backRow)
      for (const memberId of newFrontRow) {
        if (originalBackRowSet.has(memberId)) {
          const char = partyById.get(memberId)
          if (char) {
            messages.push(`${char.name} moves to the front line!`)
          }
        }
      }
    }

    return {
      newFormation: {
        frontRow: newFrontRow,
        backRow: newBackRow,
      },
      messages,
      changedPositions,
    }
  }

  /**
   * Get current back row from party and front row
   */
  static getBackRow(party: Character[], frontRow: string[]): string[] {
    return party.map(c => c.id).filter(id => !frontRow.includes(id))
  }
}

// Standalone function exports
export const isIncapacitated = PartyFormationService.isIncapacitated
export const repositionPartyAfterCasualties =
  PartyFormationService.repositionPartyAfterCasualties.bind(PartyFormationService)
export const getBackRow = PartyFormationService.getBackRow

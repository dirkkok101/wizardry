/**
 * Tests for party repositioning during combat
 *
 * Original Wizardry 1 behavior (verified via StrategyWiki):
 * - Dead characters are automatically moved to the back of the formation
 * - Living back-row characters advance to fill front-row gaps
 * - This happens at the end of each combat round
 *
 * Statuses triggering repositioning: DEAD, STONED, PARALYZED
 * ASLEEP is excluded (wakes from damage, too transient)
 */

import { CombatService } from '../CombatService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'
import { Character } from '@models/Character'

describe('CombatService', () => {
  describe('repositionPartyAfterCasualties', () => {
    // Helper to create a party with specific positions and statuses
    function createPartySetup(configs: Array<{ name: string; status: CharacterStatus; hp: number }>) {
      const party: Character[] = configs.map((cfg, i) =>
        createTestCharacter({
          id: `char-${i}`,
          name: cfg.name,
          status: cfg.status,
          hp: cfg.hp,
          maxHp: 20
        })
      )

      const members = party.map(c => c.id)
      const formation = {
        frontRow: members.slice(0, 3),
        backRow: members.slice(3, 6)
      }

      return { party, members, formation }
    }

    it('advances back-row character when front-row character dies', () => {
      // Setup: Front row has a dead character, back row has a living character
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      // Dead character (Fighter1) should be moved to back
      // First living back-row character (Mage1) should advance to front
      expect(result.changedPositions).toBe(true)
      expect(result.newFormation.frontRow).toContain('char-3') // Mage1 advanced
      expect(result.newFormation.backRow).toContain('char-0') // Fighter1 moved to back
      expect(result.messages.length).toBeGreaterThan(0)
    })

    it('advances back-row character when front-row character is STONED', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.STONED, hp: 20 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(true)
      expect(result.newFormation.frontRow).toContain('char-3') // Mage1 advanced
      expect(result.newFormation.backRow).toContain('char-0') // Stoned Fighter1 moved to back
    })

    it('advances back-row character when front-row character is PARALYZED', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.PARALYZED, hp: 20 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(true)
      expect(result.newFormation.frontRow).toContain('char-3') // Mage1 advanced
      expect(result.newFormation.backRow).toContain('char-0') // Paralyzed Fighter1 moved to back
    })

    it('does NOT reposition ASLEEP characters (transient status)', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.ASLEEP, hp: 20 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      // ASLEEP should NOT trigger repositioning
      expect(result.changedPositions).toBe(false)
      expect(result.newFormation.frontRow).toEqual(formation.frontRow)
      expect(result.newFormation.backRow).toEqual(formation.backRow)
    })

    it('handles multiple front-row casualties', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter2', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(true)
      // Two back-row characters should advance
      expect(result.newFormation.frontRow).toContain('char-3') // Mage1
      expect(result.newFormation.frontRow).toContain('char-4') // Mage2
      // Two dead characters should be in back
      expect(result.newFormation.backRow).toContain('char-0')
      expect(result.newFormation.backRow).toContain('char-1')
    })

    it('handles all front-row incapacitated with capable back-row', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter2', status: CharacterStatus.STONED, hp: 10 },
        { name: 'Fighter3', status: CharacterStatus.PARALYZED, hp: 10 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(true)
      // All three back-row should now be front
      expect(result.newFormation.frontRow).toEqual(['char-3', 'char-4', 'char-5'])
      // All three incapacitated should be back
      expect(result.newFormation.backRow).toEqual(['char-0', 'char-1', 'char-2'])
    })

    it('returns unchanged formation when no repositioning needed', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(false)
      expect(result.newFormation).toEqual(formation)
      expect(result.messages).toHaveLength(0)
    })

    it('handles empty back row (no one to advance)', () => {
      // Only 3 characters, all in front row
      const party = [
        createTestCharacter({ id: 'char-0', name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 }),
        createTestCharacter({ id: 'char-1', name: 'Fighter2', status: CharacterStatus.OK, hp: 20 }),
        createTestCharacter({ id: 'char-2', name: 'Fighter3', status: CharacterStatus.OK, hp: 20 })
      ]

      const formation = {
        frontRow: ['char-0', 'char-1', 'char-2'],
        backRow: [] as string[]
      }

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      // Dead should move to back, but no one to advance
      expect(result.changedPositions).toBe(true)
      expect(result.newFormation.frontRow).toEqual(['char-1', 'char-2'])
      expect(result.newFormation.backRow).toEqual(['char-0'])
    })

    it('uses damagedCharacters map to get current HP/status', () => {
      // Original party has all OK status
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      // But damagedCharacters shows Fighter1 died this round
      const damagedCharacters = new Map<string, Character>([
        ['char-0', { ...party[0], hp: 0, status: CharacterStatus.DEAD }]
      ])

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(true)
      expect(result.newFormation.backRow).toContain('char-0')
    })

    it('handles mixed statuses correctly', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.PARALYZED, hp: 10 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.STONED, hp: 12 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.changedPositions).toBe(true)
      // Living capable should be in front
      // Incapacitated should be in back
      const frontRowSet = new Set(result.newFormation.frontRow)
      const backRowSet = new Set(result.newFormation.backRow)

      // char-1 (OK), char-3 (OK), char-5 (OK) should be in front
      expect(frontRowSet.has('char-1')).toBe(true)
      expect(frontRowSet.has('char-3')).toBe(true)
      expect(frontRowSet.has('char-5')).toBe(true)

      // char-0 (DEAD), char-2 (PARALYZED), char-4 (STONED) should be in back
      expect(backRowSet.has('char-0')).toBe(true)
      expect(backRowSet.has('char-2')).toBe(true)
      expect(backRowSet.has('char-4')).toBe(true)
    })

    it('generates appropriate messages when characters advance', () => {
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter2', status: CharacterStatus.OK, hp: 20 },
        { name: 'Fighter3', status: CharacterStatus.OK, hp: 20 },
        { name: 'Mage1', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.OK, hp: 15 },
        { name: 'Mage3', status: CharacterStatus.OK, hp: 15 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.messages.some(m => m.includes('Mage1'))).toBe(true)
      expect(result.messages.some(m => m.toLowerCase().includes('front'))).toBe(true)
    })

    it('handles all party members incapacitated (no repositioning possible)', () => {
      // All party members are dead/stoned/paralyzed - no one to advance
      const { party, formation } = createPartySetup([
        { name: 'Fighter1', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter2', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Fighter3', status: CharacterStatus.STONED, hp: 10 },
        { name: 'Mage1', status: CharacterStatus.PARALYZED, hp: 15 },
        { name: 'Mage2', status: CharacterStatus.DEAD, hp: 0 },
        { name: 'Mage3', status: CharacterStatus.DEAD, hp: 0 }
      ])

      const damagedCharacters = new Map<string, Character>()

      const result = CombatService.repositionPartyAfterCasualties(
        party,
        damagedCharacters,
        formation
      )

      // Formation changes but all characters are incapacitated (moved to back)
      expect(result.changedPositions).toBe(true)
      expect(result.newFormation.frontRow).toHaveLength(0)
      expect(result.newFormation.backRow).toHaveLength(6)
      // No messages since no one is advancing to front (all incapacitated)
      expect(result.messages).toHaveLength(0)
    })
  })
})

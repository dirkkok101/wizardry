import { PartyService } from '../PartyService'
import { createTestCharacter, createEmptyParty, createPartyWithMembers } from '../../test-helpers/test-factories'
import { Alignment } from '../../types/Alignment'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('PartyService', () => {
  describe('canAddCharacterToParty', () => {
    it('allows adding character to empty party', () => {
      const party = createEmptyParty()
      const character = createTestCharacter({ alignment: Alignment.GOOD })
      const allCharacters = new Map([[character.id, character]])

      const result = PartyService.canAddCharacterToParty(party, character, allCharacters)

      expect(result.allowed).toBe(true)
    })

    it('prevents adding Evil character to party with Good members', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      const party = createPartyWithMembers([goodChar.id])
      const allCharacters = new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]])

      const result = PartyService.canAddCharacterToParty(party, evilChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Good and Evil cannot party together')
    })

    it('prevents adding Good character to party with Evil members', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      const party = createPartyWithMembers([evilChar.id])
      const allCharacters = new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]])

      const result = PartyService.canAddCharacterToParty(party, goodChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Good and Evil cannot party together')
    })

    it('allows adding Neutral character to party with Good members', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const neutralChar = createTestCharacter({
        id: 'neutral-1',
        alignment: Alignment.NEUTRAL
      })
      const party = createPartyWithMembers([goodChar.id])
      const allCharacters = new Map([[goodChar.id, goodChar], [neutralChar.id, neutralChar]])

      const result = PartyService.canAddCharacterToParty(party, neutralChar, allCharacters)

      expect(result.allowed).toBe(true)
    })

    it('allows adding Neutral character to party with Evil members', () => {
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      const neutralChar = createTestCharacter({
        id: 'neutral-1',
        alignment: Alignment.NEUTRAL
      })
      const party = createPartyWithMembers([evilChar.id])
      const allCharacters = new Map([[evilChar.id, evilChar], [neutralChar.id, neutralChar]])

      const result = PartyService.canAddCharacterToParty(party, neutralChar, allCharacters)

      expect(result.allowed).toBe(true)
    })

    it('prevents adding character when party is full (6 members)', () => {
      const characters = Array.from({ length: 6 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      )
      const newChar = createTestCharacter({ id: 'char-7', alignment: Alignment.NEUTRAL })
      const party = createPartyWithMembers(characters.map(c => c.id))
      const allCharacters = new Map([
        ...characters.map(c => [c.id, c] as const),
        [newChar.id, newChar]
      ])

      const result = PartyService.canAddCharacterToParty(party, newChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Party is full (maximum 6 members)')
    })

    it('prevents adding character with DEAD status', () => {
      const party = createEmptyParty()
      const deadChar = createTestCharacter({
        status: CharacterStatus.DEAD
      })
      const allCharacters = new Map([[deadChar.id, deadChar]])

      const result = PartyService.canAddCharacterToParty(party, deadChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not available')
    })

    it('prevents adding character already in party', () => {
      const character = createTestCharacter({ id: 'char-1' })
      const party = createPartyWithMembers([character.id])
      const allCharacters = new Map([[character.id, character]])

      const result = PartyService.canAddCharacterToParty(party, character, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Character already in party')
    })
  })

  describe('divvyGold', () => {
    it('distributes gold equally among party members', () => {
      const char1 = createTestCharacter({ id: 'char-1', gold: 10 })
      const char2 = createTestCharacter({ id: 'char-2', gold: 20 })
      const char3 = createTestCharacter({ id: 'char-3', gold: 5 })
      const party = createPartyWithMembers([char1.id, char2.id, char3.id])
      party.gold = 99 // Party pool
      const roster = new Map([
        [char1.id, char1],
        [char2.id, char2],
        [char3.id, char3]
      ])

      const result = PartyService.divvyGold(party, roster)

      // 99 / 3 = 33 per member, 0 remainder
      expect(result.updatedRoster!.get('char-1')!.gold).toBe(43) // 10 + 33
      expect(result.updatedRoster!.get('char-2')!.gold).toBe(53) // 20 + 33
      expect(result.updatedRoster!.get('char-3')!.gold).toBe(38) // 5 + 33
      expect(result.updatedParty!.gold).toBe(0)
    })

    it('distributes remainder gold to first members', () => {
      const char1 = createTestCharacter({ id: 'char-1', gold: 0 })
      const char2 = createTestCharacter({ id: 'char-2', gold: 0 })
      const char3 = createTestCharacter({ id: 'char-3', gold: 0 })
      const party = createPartyWithMembers([char1.id, char2.id, char3.id])
      party.gold = 100 // Party pool
      const roster = new Map([
        [char1.id, char1],
        [char2.id, char2],
        [char3.id, char3]
      ])

      const result = PartyService.divvyGold(party, roster)

      // 100 / 3 = 33 per member, remainder 1 goes to first member
      expect(result.updatedRoster!.get('char-1')!.gold).toBe(34) // 0 + 33 + 1 (remainder)
      expect(result.updatedRoster!.get('char-2')!.gold).toBe(33) // 0 + 33
      expect(result.updatedRoster!.get('char-3')!.gold).toBe(33) // 0 + 33
      expect(result.updatedParty!.gold).toBe(0)
    })

    it('returns error when party has no members', () => {
      const party = createEmptyParty()
      party.gold = 100
      const roster = new Map()

      const result = PartyService.divvyGold(party, roster)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No party members to distribute gold to')
    })

    it('returns error when party has no gold', () => {
      const char1 = createTestCharacter({ id: 'char-1' })
      const party = createPartyWithMembers([char1.id])
      party.gold = 0
      const roster = new Map([[char1.id, char1]])

      const result = PartyService.divvyGold(party, roster)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No gold to distribute')
    })

    it('handles large remainder distribution (5 members, 14 gold)', () => {
      const characters = Array.from({ length: 5 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, gold: 0 })
      )
      const party = createPartyWithMembers(characters.map(c => c.id))
      party.gold = 14
      const roster = new Map(characters.map(c => [c.id, c]))

      const result = PartyService.divvyGold(party, roster)

      // 14 / 5 = 2 per member, remainder 4 goes to first 4 members
      expect(result.updatedRoster!.get('char-0')!.gold).toBe(3) // 0 + 2 + 1
      expect(result.updatedRoster!.get('char-1')!.gold).toBe(3) // 0 + 2 + 1
      expect(result.updatedRoster!.get('char-2')!.gold).toBe(3) // 0 + 2 + 1
      expect(result.updatedRoster!.get('char-3')!.gold).toBe(3) // 0 + 2 + 1
      expect(result.updatedRoster!.get('char-4')!.gold).toBe(2) // 0 + 2
      expect(result.updatedParty!.gold).toBe(0)
    })
  })
})

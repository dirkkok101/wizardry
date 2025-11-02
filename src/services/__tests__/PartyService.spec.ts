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
})

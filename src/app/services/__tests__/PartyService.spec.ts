import { PartyService } from '../PartyService'
import { createTestCharacter, createEmptyParty, createPartyWithMembers } from '@testing/test-factories'
import { Alignment } from '@models/Alignment'
import { CharacterStatus } from '@models/CharacterStatus'

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

    describe('dead character handling', () => {
      it('allows adding DEAD character when body is in town (not in dungeon)', () => {
        const party = createEmptyParty()
        const deadChar = createTestCharacter({
          name: 'Fallen Hero',
          status: CharacterStatus.DEAD
        })
        const allCharacters = new Map([[deadChar.id, deadChar]])
        const bodiesInDungeon = new Map() // empty = no bodies in dungeon

        const result = PartyService.canAddCharacterToParty(party, deadChar, allCharacters, bodiesInDungeon)

        expect(result.allowed).toBe(true)
      })

      it('allows adding DEAD character when bodiesInDungeon is undefined (defaults to empty)', () => {
        const party = createEmptyParty()
        const deadChar = createTestCharacter({
          name: 'Fallen Hero',
          status: CharacterStatus.DEAD
        })
        const allCharacters = new Map([[deadChar.id, deadChar]])

        // bodiesInDungeon not passed = undefined
        const result = PartyService.canAddCharacterToParty(party, deadChar, allCharacters)

        expect(result.allowed).toBe(true)
      })

      it('prevents adding DEAD character when body is still in dungeon', () => {
        const party = createEmptyParty()
        const deadChar = createTestCharacter({
          name: 'Fallen Hero',
          status: CharacterStatus.DEAD
        })
        const allCharacters = new Map([[deadChar.id, deadChar]])
        const bodiesInDungeon = new Map([[deadChar.id, { characterId: deadChar.id, level: 3, x: 5, y: 10 }]])

        const result = PartyService.canAddCharacterToParty(party, deadChar, allCharacters, bodiesInDungeon)

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe("Fallen Hero's body must be recovered from the dungeon first")
      })

      it('allows adding ASHES character when body is in town', () => {
        const party = createEmptyParty()
        const ashesChar = createTestCharacter({
          name: 'Ashen One',
          status: CharacterStatus.ASHES
        })
        const allCharacters = new Map([[ashesChar.id, ashesChar]])
        const bodiesInDungeon = new Map()

        const result = PartyService.canAddCharacterToParty(party, ashesChar, allCharacters, bodiesInDungeon)

        expect(result.allowed).toBe(true)
      })

      it('prevents adding ASHES character when body is still in dungeon', () => {
        const party = createEmptyParty()
        const ashesChar = createTestCharacter({
          name: 'Ashen One',
          status: CharacterStatus.ASHES
        })
        const allCharacters = new Map([[ashesChar.id, ashesChar]])
        const bodiesInDungeon = new Map([[ashesChar.id, { characterId: ashesChar.id, level: 5, x: 2, y: 8 }]])

        const result = PartyService.canAddCharacterToParty(party, ashesChar, allCharacters, bodiesInDungeon)

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe("Ashen One's body must be recovered from the dungeon first")
      })

      it('prevents adding LOST character (permanently dead)', () => {
        const party = createEmptyParty()
        const lostChar = createTestCharacter({
          name: 'Forever Gone',
          status: CharacterStatus.LOST
        })
        const allCharacters = new Map([[lostChar.id, lostChar]])

        const result = PartyService.canAddCharacterToParty(party, lostChar, allCharacters)

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('Forever Gone is not available (status: LOST)')
      })

      it('prevents adding PARALYZED character', () => {
        const party = createEmptyParty()
        const paralyzedChar = createTestCharacter({
          name: 'Frozen Still',
          status: CharacterStatus.PARALYZED
        })
        const allCharacters = new Map([[paralyzedChar.id, paralyzedChar]])

        const result = PartyService.canAddCharacterToParty(party, paralyzedChar, allCharacters)

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('Frozen Still is not available (status: PARALYZED)')
      })
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

  // NOTE: divvyGold tests removed - function obsolete in party gold migration
  // Gold now stays at party level and is not distributed to individual characters
})

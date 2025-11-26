import { GameStateQueries } from '../GameStateQueries'
import { createTestCharacter, createTestGameState, createPartyWithMembers } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'
import { Body } from '@models/GameState'

describe('GameStateQueries', () => {
  describe('tavernAvailableCharacters', () => {
    it('returns OK characters not in party', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Hero', status: CharacterStatus.OK })
      const char2 = createTestCharacter({ id: 'char-2', name: 'Mage', status: CharacterStatus.OK })
      const state = createTestGameState({
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: createPartyWithMembers([char1.id])
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('char-2')
    })

    it('includes DEAD characters whose bodies are in town (not in dungeon)', () => {
      const okChar = createTestCharacter({ id: 'char-1', name: 'Hero', status: CharacterStatus.OK })
      const deadChar = createTestCharacter({ id: 'char-2', name: 'Fallen', status: CharacterStatus.DEAD })
      const state = createTestGameState({
        roster: new Map([
          [okChar.id, okChar],
          [deadChar.id, deadChar]
        ]),
        bodies: new Map() // no bodies in dungeon
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(2)
      expect(available.find(c => c.id === 'char-2')).toBeDefined()
    })

    it('excludes DEAD characters whose bodies are in dungeon', () => {
      const okChar = createTestCharacter({ id: 'char-1', name: 'Hero', status: CharacterStatus.OK })
      const deadChar = createTestCharacter({ id: 'char-2', name: 'Fallen', status: CharacterStatus.DEAD })
      const body: Body = { characterId: deadChar.id, level: 3, x: 5, y: 10 }
      const state = createTestGameState({
        roster: new Map([
          [okChar.id, okChar],
          [deadChar.id, deadChar]
        ]),
        bodies: new Map([[deadChar.id, body]])
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('char-1')
    })

    it('includes ASHES characters whose bodies are in town', () => {
      const ashesChar = createTestCharacter({ id: 'char-1', name: 'Ashen', status: CharacterStatus.ASHES })
      const state = createTestGameState({
        roster: new Map([[ashesChar.id, ashesChar]]),
        bodies: new Map()
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('char-1')
    })

    it('excludes ASHES characters whose bodies are in dungeon', () => {
      const ashesChar = createTestCharacter({ id: 'char-1', name: 'Ashen', status: CharacterStatus.ASHES })
      const body: Body = { characterId: ashesChar.id, level: 5, x: 2, y: 8 }
      const state = createTestGameState({
        roster: new Map([[ashesChar.id, ashesChar]]),
        bodies: new Map([[ashesChar.id, body]])
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(0)
    })

    it('excludes LOST characters (permanently dead)', () => {
      const lostChar = createTestCharacter({ id: 'char-1', name: 'Gone', status: CharacterStatus.LOST })
      const state = createTestGameState({
        roster: new Map([[lostChar.id, lostChar]])
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(0)
    })

    it('excludes characters with status effects (PARALYZED, STONED, POISONED, ASLEEP)', () => {
      const paralyzed = createTestCharacter({ id: 'char-1', status: CharacterStatus.PARALYZED })
      const stoned = createTestCharacter({ id: 'char-2', status: CharacterStatus.STONED })
      const poisoned = createTestCharacter({ id: 'char-3', status: CharacterStatus.POISONED })
      const asleep = createTestCharacter({ id: 'char-4', status: CharacterStatus.ASLEEP })
      const state = createTestGameState({
        roster: new Map([
          [paralyzed.id, paralyzed],
          [stoned.id, stoned],
          [poisoned.id, poisoned],
          [asleep.id, asleep]
        ])
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(0)
    })

    it('handles undefined bodies map (defaults to empty)', () => {
      const deadChar = createTestCharacter({ id: 'char-1', name: 'Fallen', status: CharacterStatus.DEAD })
      const state = createTestGameState({
        roster: new Map([[deadChar.id, deadChar]]),
        bodies: undefined
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      // Dead character should be available since bodies is undefined (no bodies in dungeon)
      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('char-1')
    })

    it('excludes characters already in party', () => {
      const inParty = createTestCharacter({ id: 'char-1', name: 'InParty', status: CharacterStatus.OK })
      const notInParty = createTestCharacter({ id: 'char-2', name: 'NotInParty', status: CharacterStatus.OK })
      const state = createTestGameState({
        roster: new Map([
          [inParty.id, inParty],
          [notInParty.id, notInParty]
        ]),
        party: createPartyWithMembers([inParty.id])
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('char-2')
    })

    it('allows dead party member removed at tavern to be re-added (body in town)', () => {
      // Scenario: Player returned from dungeon with dead character,
      // removed them at tavern, now wants to add them back to go to temple
      const deadChar = createTestCharacter({
        id: 'char-1',
        name: 'Fallen Hero',
        status: CharacterStatus.DEAD
      })
      const state = createTestGameState({
        roster: new Map([[deadChar.id, deadChar]]),
        // Not in party (was removed)
        party: createPartyWithMembers([]),
        // Body is NOT in dungeon (they brought it back to town)
        bodies: new Map()
      })

      const available = GameStateQueries.tavernAvailableCharacters(state)

      expect(available).toHaveLength(1)
      expect(available[0].name).toBe('Fallen Hero')
    })
  })
})

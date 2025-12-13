import { CharacterQueries, INCAPACITATING_STATUSES, DEATH_STATUSES } from '../CharacterQueries'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'

describe('CharacterQueries', () => {
  const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
    id: 'test-char-1',
    name: 'Test Fighter',
    race: 'human',
    class: 'fighter',
    alignment: 'good',
    level: 1,
    xp: 0,
    xpToLevel: 1000,
    hp: 10,
    maxHp: 10,
    ac: 10,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality: 12,
    agility: 12,
    luck: 10,
    status: CharacterStatus.OK,
    gold: 100,
    age: 20,
    ageWeeks: 0,
    inventory: [],
    spellbook: { mage: [], priest: [] },
    spellPoints: {
      mage: { current: [0, 0, 0, 0, 0, 0, 0], max: [0, 0, 0, 0, 0, 0, 0] },
      priest: { current: [0, 0, 0, 0, 0, 0, 0], max: [0, 0, 0, 0, 0, 0, 0] }
    },
    inParty: false,
    identifiedItems: new Set(),
    location: 'castle',
    ...overrides
  })

  describe('canAct', () => {
    it('returns true for OK status with positive HP', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK, hp: 10 })
      expect(CharacterQueries.canAct(char)).toBe(true)
    })

    it('returns true for POISONED status (can still act)', () => {
      const char = createTestCharacter({ status: CharacterStatus.POISONED, hp: 10 })
      expect(CharacterQueries.canAct(char)).toBe(true)
    })

    it('returns false for DEAD status', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD, hp: 0 })
      expect(CharacterQueries.canAct(char)).toBe(false)
    })

    it('returns false for PARALYZED status', () => {
      const char = createTestCharacter({ status: CharacterStatus.PARALYZED, hp: 10 })
      expect(CharacterQueries.canAct(char)).toBe(false)
    })

    it('returns false for ASLEEP status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASLEEP, hp: 10 })
      expect(CharacterQueries.canAct(char)).toBe(false)
    })

    it('returns false for 0 HP even with OK status', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK, hp: 0 })
      expect(CharacterQueries.canAct(char)).toBe(false)
    })
  })

  describe('isIncapacitated', () => {
    it('returns false for OK status', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK, hp: 10 })
      expect(CharacterQueries.isIncapacitated(char)).toBe(false)
    })

    it('returns true for all incapacitating statuses', () => {
      for (const status of INCAPACITATING_STATUSES) {
        const char = createTestCharacter({ status, hp: 10 })
        expect(CharacterQueries.isIncapacitated(char)).toBe(true)
      }
    })
  })

  describe('isDead', () => {
    it('returns true for DEAD status', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD })
      expect(CharacterQueries.isDead(char)).toBe(true)
    })

    it('returns true for ASHES status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASHES })
      expect(CharacterQueries.isDead(char)).toBe(true)
    })

    it('returns true for LOST status', () => {
      const char = createTestCharacter({ status: CharacterStatus.LOST })
      expect(CharacterQueries.isDead(char)).toBe(true)
    })

    it('returns false for OK status', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK })
      expect(CharacterQueries.isDead(char)).toBe(false)
    })
  })

  describe('isAlive', () => {
    it('returns true for OK status with positive HP', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK, hp: 10 })
      expect(CharacterQueries.isAlive(char)).toBe(true)
    })

    it('returns false for DEAD status', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD, hp: 0 })
      expect(CharacterQueries.isAlive(char)).toBe(false)
    })

    it('returns false for 0 HP', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK, hp: 0 })
      expect(CharacterQueries.isAlive(char)).toBe(false)
    })
  })

  describe('canBeHealed', () => {
    it('returns true for alive character below max HP', () => {
      const char = createTestCharacter({ hp: 5, maxHp: 10, status: CharacterStatus.OK })
      expect(CharacterQueries.canBeHealed(char)).toBe(true)
    })

    it('returns false for character at full HP', () => {
      const char = createTestCharacter({ hp: 10, maxHp: 10, status: CharacterStatus.OK })
      expect(CharacterQueries.canBeHealed(char)).toBe(false)
    })

    it('returns false for dead character', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 10, status: CharacterStatus.DEAD })
      expect(CharacterQueries.canBeHealed(char)).toBe(false)
    })
  })

  describe('needsResurrection', () => {
    it('returns true for DEAD status', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD })
      expect(CharacterQueries.needsResurrection(char)).toBe(true)
    })

    it('returns true for ASHES status', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASHES })
      expect(CharacterQueries.needsResurrection(char)).toBe(true)
    })

    it('returns false for OK status', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK })
      expect(CharacterQueries.needsResurrection(char)).toBe(false)
    })

    it('returns false for LOST status', () => {
      const char = createTestCharacter({ status: CharacterStatus.LOST })
      expect(CharacterQueries.needsResurrection(char)).toBe(false)
    })
  })

  describe('getAliveMembers', () => {
    it('returns only alive members', () => {
      const party = [
        createTestCharacter({ id: '1', hp: 10, status: CharacterStatus.OK }),
        createTestCharacter({ id: '2', hp: 0, status: CharacterStatus.DEAD }),
        createTestCharacter({ id: '3', hp: 5, status: CharacterStatus.POISONED })
      ]

      const alive = CharacterQueries.getAliveMembers(party)

      expect(alive.length).toBe(2)
      expect(alive.map(c => c.id)).toEqual(['1', '3'])
    })
  })

  describe('getActiveMembers', () => {
    it('returns only members who can act', () => {
      const party = [
        createTestCharacter({ id: '1', hp: 10, status: CharacterStatus.OK }),
        createTestCharacter({ id: '2', hp: 10, status: CharacterStatus.PARALYZED }),
        createTestCharacter({ id: '3', hp: 10, status: CharacterStatus.POISONED })
      ]

      const active = CharacterQueries.getActiveMembers(party)

      expect(active.length).toBe(2)
      expect(active.map(c => c.id)).toEqual(['1', '3'])
    })
  })

  describe('isPartyWiped', () => {
    it('returns true when all members are dead', () => {
      const party = [
        createTestCharacter({ id: '1', hp: 0, status: CharacterStatus.DEAD }),
        createTestCharacter({ id: '2', hp: 0, status: CharacterStatus.ASHES })
      ]

      expect(CharacterQueries.isPartyWiped(party)).toBe(true)
    })

    it('returns false when at least one member is alive', () => {
      const party = [
        createTestCharacter({ id: '1', hp: 0, status: CharacterStatus.DEAD }),
        createTestCharacter({ id: '2', hp: 1, status: CharacterStatus.OK })
      ]

      expect(CharacterQueries.isPartyWiped(party)).toBe(false)
    })
  })

  describe('getHpPercent', () => {
    it('returns 100 for full HP', () => {
      const char = createTestCharacter({ hp: 10, maxHp: 10 })
      expect(CharacterQueries.getHpPercent(char)).toBe(100)
    })

    it('returns 50 for half HP', () => {
      const char = createTestCharacter({ hp: 5, maxHp: 10 })
      expect(CharacterQueries.getHpPercent(char)).toBe(50)
    })

    it('returns 0 for zero HP', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 10 })
      expect(CharacterQueries.getHpPercent(char)).toBe(0)
    })

    it('returns 0 for zero maxHp', () => {
      const char = createTestCharacter({ hp: 10, maxHp: 0 })
      expect(CharacterQueries.getHpPercent(char)).toBe(0)
    })
  })

  describe('getHpStatus', () => {
    it('returns healthy for > 50% HP', () => {
      const char = createTestCharacter({ hp: 6, maxHp: 10 })
      expect(CharacterQueries.getHpStatus(char)).toBe('healthy')
    })

    it('returns warning for 25-50% HP', () => {
      const char = createTestCharacter({ hp: 4, maxHp: 10 })
      expect(CharacterQueries.getHpStatus(char)).toBe('warning')
    })

    it('returns critical for < 25% HP', () => {
      const char = createTestCharacter({ hp: 2, maxHp: 10 })
      expect(CharacterQueries.getHpStatus(char)).toBe('critical')
    })
  })

  describe('hasInventorySpace', () => {
    it('returns true when inventory has space', () => {
      const char = createTestCharacter({ inventory: [] })
      expect(CharacterQueries.hasInventorySpace(char)).toBe(true)
    })

    it('returns false when inventory is full', () => {
      const fullInventory = Array(8).fill({ id: 'item', name: 'Item' })
      const char = createTestCharacter({ inventory: fullInventory })
      expect(CharacterQueries.hasInventorySpace(char)).toBe(false)
    })
  })

  describe('getAvailableInventorySlots', () => {
    it('returns 8 for empty inventory', () => {
      const char = createTestCharacter({ inventory: [] })
      expect(CharacterQueries.getAvailableInventorySlots(char)).toBe(8)
    })

    it('returns 0 for full inventory', () => {
      const fullInventory = Array(8).fill({ id: 'item', name: 'Item' })
      const char = createTestCharacter({ inventory: fullInventory })
      expect(CharacterQueries.getAvailableInventorySlots(char)).toBe(0)
    })

    it('returns correct count for partial inventory', () => {
      const partialInventory = Array(3).fill({ id: 'item', name: 'Item' })
      const char = createTestCharacter({ inventory: partialInventory })
      expect(CharacterQueries.getAvailableInventorySlots(char)).toBe(5)
    })
  })

  describe('isInFrontRow', () => {
    it('returns true when character is in front row', () => {
      const char = createTestCharacter({ id: 'char-1' })
      const frontRow = ['char-1', 'char-2']

      expect(CharacterQueries.isInFrontRow(char, frontRow)).toBe(true)
    })

    it('returns false when character is not in front row', () => {
      const char = createTestCharacter({ id: 'char-3' })
      const frontRow = ['char-1', 'char-2']

      expect(CharacterQueries.isInFrontRow(char, frontRow)).toBe(false)
    })
  })

  describe('status constant arrays', () => {
    it('INCAPACITATING_STATUSES includes expected statuses', () => {
      expect(INCAPACITATING_STATUSES).toContain(CharacterStatus.DEAD)
      expect(INCAPACITATING_STATUSES).toContain(CharacterStatus.PARALYZED)
      expect(INCAPACITATING_STATUSES).toContain(CharacterStatus.ASLEEP)
    })

    it('DEATH_STATUSES includes expected statuses', () => {
      expect(DEATH_STATUSES).toContain(CharacterStatus.DEAD)
      expect(DEATH_STATUSES).toContain(CharacterStatus.ASHES)
      expect(DEATH_STATUSES).toContain(CharacterStatus.LOST)
    })

    it('DEATH_STATUSES does not include non-death statuses', () => {
      expect(DEATH_STATUSES).not.toContain(CharacterStatus.OK)
      expect(DEATH_STATUSES).not.toContain(CharacterStatus.POISONED)
      expect(DEATH_STATUSES).not.toContain(CharacterStatus.PARALYZED)
    })
  })
})

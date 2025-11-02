import { TempleService } from '../TempleService'
import { ServiceType } from '../../types/ServiceType'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'
import { CharacterStatus } from '../../types/CharacterStatus'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'

describe('TempleService', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    level: 5,
    hp: 20,
    maxHp: 25,
    status: CharacterStatus.OK,
    strength: 10,
    intelligence: 15,
    piety: 12,
    vitality: 15,
    agility: 10,
    luck: 10,
    experience: 10000,
    ac: 5,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  describe('calculateTithe', () => {
    it('calculates cure poison tithe (10 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_POISON)
      expect(tithe).toBe(50) // 10 × 5
    })

    it('calculates cure paralysis tithe (20 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_PARALYSIS)
      expect(tithe).toBe(100) // 20 × 5
    })

    it('calculates resurrection tithe (250 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.RESURRECT)
      expect(tithe).toBe(1250) // 250 × 5
    })

    it('calculates restoration tithe (500 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.RESTORE)
      expect(tithe).toBe(2500) // 500 × 5
    })

    it('scales tithe with character level', () => {
      const highLevelChar = { ...mockCharacter, level: 10 }
      const tithe = TempleService.calculateTithe(highLevelChar, ServiceType.RESURRECT)
      expect(tithe).toBe(2500) // 250 × 10
    })
  })
})

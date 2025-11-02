import { Character } from '../Character'
import { Race } from '../Race'
import { CharacterClass } from '../CharacterClass'
import { Alignment } from '../Alignment'
import { CharacterStatus } from '../CharacterStatus'

describe('Character Type', () => {
  it('can create a minimal fighter character', () => {
    const fighter: Character = {
      id: 'test-1',
      name: 'Corak',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      strength: 15,
      intelligence: 10,
      piety: 8,
      vitality: 14,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 10,
      maxHp: 10,
      ac: 10,
      status: CharacterStatus.OK,
      vim: { current: 14, max: 14 },
      knownSpells: [],
      inventory: []
    }

    expect(fighter.name).toBe('Corak')
    expect(fighter.spellPoints).toBeUndefined()
    expect(fighter.vim.current).toBe(14)
    expect(fighter.age).toBe(15)
  })

  it('can create a mage with spell points', () => {
    const mage: Character = {
      id: 'test-2',
      name: 'Gandalf',
      race: Race.HUMAN,
      class: CharacterClass.MAGE,
      alignment: Alignment.GOOD,
      strength: 8,
      intelligence: 17,
      piety: 10,
      vitality: 6,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 4,
      maxHp: 4,
      ac: 10,
      status: CharacterStatus.OK,
      vim: { current: 6, max: 6 },
      spellPoints: {
        mage: {
          level1: { current: 2, max: 2 },
          level2: { current: 0, max: 0 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      },
      knownSpells: [],
      inventory: []
    }

    expect(mage.spellPoints?.mage?.level1.max).toBe(2)
  })

  it('can equip all 5 equipment slots', () => {
    const character: Character = {
      id: 'test-4',
      name: 'Knight',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 10,
      maxHp: 10,
      ac: 5,
      status: CharacterStatus.OK,
      vim: { current: 14, max: 14 },
      knownSpells: [],
      inventory: [],
      equippedWeapon: 'long-sword',
      equippedArmor: 'plate-mail',
      equippedShield: 'large-shield',
      equippedHelmet: 'helm',
      equippedGauntlets: 'copper-gloves'
    }

    expect(character.equippedWeapon).toBe('long-sword')
    expect(character.equippedShield).toBe('large-shield')
    expect(character.equippedHelmet).toBe('helm')
    expect(character.equippedGauntlets).toBe('copper-gloves')
  })

  it('does NOT have password field', () => {
    const character: any = {
      id: 'test',
      name: 'Test'
      // ... other fields
    }

    expect(character.password).toBeUndefined()
  })

  it('does NOT have character-level gold field', () => {
    const character: any = {
      id: 'test',
      name: 'Test'
      // ... other fields
    }

    expect(character.gold).toBeUndefined()
  })
})

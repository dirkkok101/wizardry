import { CharacterListItemComponent } from '../character-list-item.component'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { createTestCharacter } from '@testing/test-factories'

describe('CharacterListItemComponent', () => {
  let component: CharacterListItemComponent

  beforeEach(() => {
    component = new CharacterListItemComponent()
    component.character = createTestCharacter()
  })

  describe('getClassAbbr', () => {
    it('returns FIG for FIGHTER', () => {
      expect(component.getClassAbbr(CharacterClass.FIGHTER)).toBe('FIG')
    })

    it('returns MAG for MAGE', () => {
      expect(component.getClassAbbr(CharacterClass.MAGE)).toBe('MAG')
    })

    it('returns PRI for PRIEST', () => {
      expect(component.getClassAbbr(CharacterClass.PRIEST)).toBe('PRI')
    })

    it('returns THI for THIEF', () => {
      expect(component.getClassAbbr(CharacterClass.THIEF)).toBe('THI')
    })

    it('returns BIS for BISHOP', () => {
      expect(component.getClassAbbr(CharacterClass.BISHOP)).toBe('BIS')
    })

    it('returns SAM for SAMURAI', () => {
      expect(component.getClassAbbr(CharacterClass.SAMURAI)).toBe('SAM')
    })

    it('returns LOR for LORD', () => {
      expect(component.getClassAbbr(CharacterClass.LORD)).toBe('LOR')
    })

    it('returns NIN for NINJA', () => {
      expect(component.getClassAbbr(CharacterClass.NINJA)).toBe('NIN')
    })

    it('handles unknown class with substring fallback', () => {
      expect(component.getClassAbbr('UNKNOWN' as CharacterClass)).toBe('UNK')
    })
  })

  describe('itemClass', () => {
    it('returns cols-4 when no extra columns shown', () => {
      component.showAlignment = false
      component.showStatus = false
      expect(component.itemClass).toBe('list-item cols-4')
    })

    it('returns cols-5 when only showAlignment is true', () => {
      component.showAlignment = true
      component.showStatus = false
      expect(component.itemClass).toBe('list-item cols-5')
    })

    it('returns cols-5 when only showStatus is true', () => {
      component.showAlignment = false
      component.showStatus = true
      expect(component.itemClass).toBe('list-item cols-5')
    })

    it('returns cols-6 when both showAlignment and showStatus are true', () => {
      component.showAlignment = true
      component.showStatus = true
      expect(component.itemClass).toBe('list-item cols-6')
    })
  })

  describe('default input values', () => {
    it('showAlignment defaults to false', () => {
      const freshComponent = new CharacterListItemComponent()
      expect(freshComponent.showAlignment).toBe(false)
    })

    it('showStatus defaults to false', () => {
      const freshComponent = new CharacterListItemComponent()
      expect(freshComponent.showStatus).toBe(false)
    })

    it('status defaults to undefined', () => {
      const freshComponent = new CharacterListItemComponent()
      expect(freshComponent.status).toBeUndefined()
    })
  })

  describe('status input', () => {
    it('accepts CharacterStatus values', () => {
      component.status = CharacterStatus.OK
      expect(component.status).toBe(CharacterStatus.OK)

      component.status = CharacterStatus.DEAD
      expect(component.status).toBe(CharacterStatus.DEAD)

      component.status = CharacterStatus.POISONED
      expect(component.status).toBe(CharacterStatus.POISONED)
    })
  })
})

import { CharacterPanelComponent } from '../character-panel.component'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { createTestCharacter } from '@testing/test-factories'
import { Character } from '@models/Character'
import { Item } from '@models/Item'

describe('CharacterPanelComponent', () => {
  let component: CharacterPanelComponent

  beforeEach(() => {
    component = new CharacterPanelComponent()
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

  describe('getStatusCode', () => {
    it('returns OK for OK status', () => {
      expect(component.getStatusCode(CharacterStatus.OK)).toBe('OK')
    })

    it('returns DED for DEAD status', () => {
      expect(component.getStatusCode(CharacterStatus.DEAD)).toBe('DED')
    })

    it('returns PSN for POISONED status', () => {
      expect(component.getStatusCode(CharacterStatus.POISONED)).toBe('PSN')
    })

    it('returns PAR for PARALYZED status', () => {
      expect(component.getStatusCode(CharacterStatus.PARALYZED)).toBe('PAR')
    })

    it('returns STN for STONED status', () => {
      expect(component.getStatusCode(CharacterStatus.STONED)).toBe('STN')
    })

    it('returns ASH for ASHES status', () => {
      expect(component.getStatusCode(CharacterStatus.ASHES)).toBe('ASH')
    })

    it('returns LST for LOST status', () => {
      expect(component.getStatusCode(CharacterStatus.LOST)).toBe('LST')
    })

    it('returns SLP for ASLEEP status', () => {
      expect(component.getStatusCode(CharacterStatus.ASLEEP)).toBe('SLP')
    })

    it('returns UNK for unknown status', () => {
      expect(component.getStatusCode('UNKNOWN' as CharacterStatus)).toBe('UNK')
    })
  })

  describe('getStatusColor', () => {
    it('returns green for OK', () => {
      expect(component.getStatusColor(CharacterStatus.OK)).toBe('var(--crt-green)')
    })

    it('returns red for DEAD', () => {
      expect(component.getStatusColor(CharacterStatus.DEAD)).toBe('#ef4444')
    })

    it('returns purple for POISONED', () => {
      expect(component.getStatusColor(CharacterStatus.POISONED)).toBe('#a855f7')
    })

    it('returns default green for unknown status', () => {
      expect(component.getStatusColor('UNKNOWN' as CharacterStatus)).toBe('var(--crt-green)')
    })
  })

  describe('getHPColor', () => {
    it('returns green when HP > 50%', () => {
      const char = createTestCharacter({ hp: 8, maxHp: 10 })
      expect(component.getHPColor(char)).toBe('var(--crt-green)')
    })

    it('returns green when HP exactly 51%', () => {
      const char = createTestCharacter({ hp: 51, maxHp: 100 })
      expect(component.getHPColor(char)).toBe('var(--crt-green)')
    })

    it('returns yellow when HP between 25% and 50%', () => {
      const char = createTestCharacter({ hp: 4, maxHp: 10 })
      expect(component.getHPColor(char)).toBe('#eab308')
    })

    it('returns yellow when HP exactly 50%', () => {
      const char = createTestCharacter({ hp: 5, maxHp: 10 })
      expect(component.getHPColor(char)).toBe('#eab308')
    })

    it('returns red when HP < 25%', () => {
      const char = createTestCharacter({ hp: 2, maxHp: 10 })
      expect(component.getHPColor(char)).toBe('#ef4444')
    })

    it('returns red when HP exactly 25%', () => {
      const char = createTestCharacter({ hp: 25, maxHp: 100 })
      // At exactly 25%, condition is NOT > 0.25, so returns red
      expect(component.getHPColor(char)).toBe('#ef4444')
    })

    it('returns red when HP is 0', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 10 })
      expect(component.getHPColor(char)).toBe('#ef4444')
    })
  })

  describe('formatHP', () => {
    it('formats HP as current/max HP', () => {
      const char = createTestCharacter({ hp: 7, maxHp: 10 })
      expect(component.formatHP(char)).toBe('7/10 HP')
    })

    it('handles zero HP', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 10 })
      expect(component.formatHP(char)).toBe('0/10 HP')
    })
  })

  describe('getHPPercentage', () => {
    it('returns percentage of current/max HP', () => {
      const char = createTestCharacter({ hp: 7, maxHp: 10 })
      expect(component.getHPPercentage(char)).toBe(70)
    })

    it('returns 0 when maxHp is 0', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 0 })
      expect(component.getHPPercentage(char)).toBe(0)
    })

    it('returns 100 when at full HP', () => {
      const char = createTestCharacter({ hp: 10, maxHp: 10 })
      expect(component.getHPPercentage(char)).toBe(100)
    })

    it('clamps to 100 when HP exceeds max', () => {
      const char = createTestCharacter({ hp: 15, maxHp: 10 })
      expect(component.getHPPercentage(char)).toBe(100)
    })

    it('clamps to 0 when HP is negative', () => {
      const char = createTestCharacter({ hp: -5, maxHp: 10 })
      expect(component.getHPPercentage(char)).toBe(0)
    })
  })

  describe('getEquippedWeapon', () => {
    it('returns weapon name when equipped', () => {
      const weapon: Partial<Item> = { name: 'Long Sword' }
      const char = createTestCharacter({ equippedWeapon: weapon as Item })
      expect(component.getEquippedWeapon(char)).toBe('Long Sword')
    })

    it('returns "Unarmed" when no weapon equipped', () => {
      const char = createTestCharacter({ equippedWeapon: undefined })
      expect(component.getEquippedWeapon(char)).toBe('Unarmed')
    })
  })

  describe('getSpellPointsDisplay', () => {
    it('returns null for character without spellPoints', () => {
      const char = createTestCharacter({ spellPoints: undefined })
      expect(component.getSpellPointsDisplay(char)).toBeNull()
    })

    it('returns null when all spell points are 0', () => {
      const char = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 0, max: 0 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.getSpellPointsDisplay(char)).toBeNull()
    })

    it('returns mage points format for mage', () => {
      const char = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 1, max: 1 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.getSpellPointsDisplay(char)).toBe('3/2/1')
    })

    it('returns priest points format for priest', () => {
      const char = createTestCharacter({
        spellPoints: {
          priest: {
            level1: { current: 4, max: 4 },
            level2: { current: 3, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.getSpellPointsDisplay(char)).toBe('4/3')
    })

    it('returns combined format for bishop with both mage and priest', () => {
      const char = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 2, max: 2 },
            level2: { current: 1, max: 1 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          },
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.getSpellPointsDisplay(char)).toBe('M:2/1 P:3/2')
    })
  })

  describe('isCaster', () => {
    it('returns true when character has spell points', () => {
      const char = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.isCaster(char)).toBe(true)
    })

    it('returns false when character has no spell points', () => {
      const char = createTestCharacter({ spellPoints: undefined })
      expect(component.isCaster(char)).toBe(false)
    })

    it('returns false when all spell points are 0', () => {
      const char = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 0, max: 0 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.isCaster(char)).toBe(false)
    })
  })

  describe('isIncapacitated', () => {
    it('returns true for DEAD', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD })
      expect(component.isIncapacitated(char)).toBe(true)
    })

    it('returns true for ASHES', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASHES })
      expect(component.isIncapacitated(char)).toBe(true)
    })

    it('returns true for LOST', () => {
      const char = createTestCharacter({ status: CharacterStatus.LOST })
      expect(component.isIncapacitated(char)).toBe(true)
    })

    it('returns false for OK', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK })
      expect(component.isIncapacitated(char)).toBe(false)
    })

    it('returns false for POISONED', () => {
      const char = createTestCharacter({ status: CharacterStatus.POISONED })
      expect(component.isIncapacitated(char)).toBe(false)
    })

    it('returns false for PARALYZED', () => {
      const char = createTestCharacter({ status: CharacterStatus.PARALYZED })
      expect(component.isIncapacitated(char)).toBe(false)
    })
  })

  describe('getActionsForCharacter', () => {
    it('returns static actions array when actions is an array', () => {
      const actions = [{ type: 'inspect' }, { type: 'cast-spell' }]
      component.actions = actions
      const char = createTestCharacter()
      expect(component.getActionsForCharacter(char)).toBe(actions)
    })

    it('returns function result when actions is a function', () => {
      const inspectOnly = [{ type: 'inspect' }]
      const withCast = [{ type: 'inspect' }, { type: 'cast-spell' }]

      component.actions = (char: Character) => {
        return char.class === CharacterClass.MAGE ? withCast : inspectOnly
      }

      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER })
      const mage = createTestCharacter({ class: CharacterClass.MAGE })

      expect(component.getActionsForCharacter(fighter)).toEqual(inspectOnly)
      expect(component.getActionsForCharacter(mage)).toEqual(withCast)
    })
  })

  describe('getVisibleActions', () => {
    it('filters to only inspect and cast-spell actions', () => {
      component.actions = [
        { type: 'inspect' },
        { type: 'cast-spell' },
        { type: 'moveUp' },
        { type: 'moveDown' }
      ]
      const char = createTestCharacter()
      const visible = component.getVisibleActions(char)

      expect(visible).toHaveLength(2)
      expect(visible.map(a => a.type)).toEqual(['inspect', 'cast-spell'])
    })

    it('returns empty array when no visible actions', () => {
      component.actions = [{ type: 'moveUp' }, { type: 'moveDown' }]
      const char = createTestCharacter()
      expect(component.getVisibleActions(char)).toHaveLength(0)
    })
  })

  describe('getActionLabel', () => {
    it('returns Inspect for inspect', () => {
      expect(component.getActionLabel('inspect')).toBe('Inspect')
    })

    it('returns Cast for cast-spell', () => {
      expect(component.getActionLabel('cast-spell')).toBe('Cast')
    })

    it('returns action type for unknown', () => {
      expect(component.getActionLabel('custom-action')).toBe('custom-action')
    })
  })

  describe('onActionClick', () => {
    it('emits event with characterId and actionType', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit')
      const char = createTestCharacter({ id: 'test-char-123' })

      component.onActionClick(char, 'inspect')

      expect(emitSpy).toHaveBeenCalledWith({
        characterId: 'test-char-123',
        actionType: 'inspect'
      })
    })
  })
})

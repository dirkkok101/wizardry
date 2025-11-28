import { ComponentFixture, TestBed } from '@angular/core/testing'
import {
  CharacterDetailCardComponent,
  InspectionMode
} from '../character-detail-card.component'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { LevelUpService, MAX_LEVEL } from '@services/LevelUpService'
import { CharacterAction } from '@models/CharacterCardTypes'

describe('CharacterDetailCardComponent', () => {
  let component: CharacterDetailCardComponent
  let fixture: ComponentFixture<CharacterDetailCardComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterDetailCardComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(CharacterDetailCardComponent)
    component = fixture.componentInstance
  })

  it('creates component', () => {
    component.character = createTestCharacter()
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  describe('character info display', () => {
    it('displays race, class, and level', () => {
      component.character = createTestCharacter({
        race: 'HUMAN' as any,
        class: CharacterClass.MAGE,
        level: 5
      })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('HUMAN')
      expect(compiled.textContent).toContain('MAGE')
      expect(compiled.textContent).toContain('LVL 5')
    })

    it('displays alignment', () => {
      component.character = createTestCharacter({ alignment: 'GOOD' as any })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('GOOD')
    })

    it('displays attributes', () => {
      component.character = createTestCharacter({
        strength: 15,
        intelligence: 18,
        piety: 12,
        vitality: 14,
        agility: 16,
        luck: 10
      })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      // Stats are displayed in separate label/value elements
      expect(compiled.textContent).toContain('STR')
      expect(compiled.textContent).toContain('15')
      expect(compiled.textContent).toContain('INT')
      expect(compiled.textContent).toContain('18')
      expect(compiled.textContent).toContain('PIE')
      expect(compiled.textContent).toContain('12')
      expect(compiled.textContent).toContain('VIT')
      expect(compiled.textContent).toContain('14')
      expect(compiled.textContent).toContain('AGI')
      expect(compiled.textContent).toContain('16')
      expect(compiled.textContent).toContain('LUK')
      expect(compiled.textContent).toContain('10')
    })

    it('displays combat stats', () => {
      component.character = createTestCharacter({
        hp: 25,
        maxHp: 30,
        ac: 5,
        experience: 12500
      })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      // Combat stats displayed in separate label/value elements
      expect(compiled.textContent).toContain('HP')
      expect(compiled.textContent).toContain('25/30')
      expect(compiled.textContent).toContain('AC')
      expect(compiled.textContent).toContain('5')
      expect(compiled.textContent).toContain('XP')
      expect(compiled.textContent).toContain('12,500')
    })
  })

  describe('XP progress', () => {
    it('shows XP progress when showXpProgress is true and not max level', () => {
      component.character = createTestCharacter({ level: 5, experience: 5000 })
      component.showXpProgress = true
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.xp-bar')).toBeTruthy()
      expect(compiled.textContent).toContain('to lvl')
    })

    it('hides XP progress when showXpProgress is false', () => {
      component.character = createTestCharacter({ level: 5, experience: 5000 })
      component.showXpProgress = false
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.xp-bar')).toBeFalsy()
    })

    it('shows max level message at MAX_LEVEL', () => {
      component.character = createTestCharacter({ level: MAX_LEVEL, experience: 999999 })
      component.showXpProgress = true
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('Max Level')
    })
  })

  describe('spell points display', () => {
    it('shows spell points for casters', () => {
      component.character = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 5 },
            level2: { current: 2, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('app-spell-points-display')).toBeTruthy()
    })

    it('hides spell points for non-casters', () => {
      component.character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        spellPoints: undefined
      })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('app-spell-points-display')).toBeFalsy()
    })
  })

  describe('isSpellcaster', () => {
    it('returns true for Mage', () => {
      component.character = createTestCharacter({ class: CharacterClass.MAGE })
      expect(component.isSpellcaster).toBe(true)
    })

    it('returns true for Priest', () => {
      component.character = createTestCharacter({ class: CharacterClass.PRIEST })
      expect(component.isSpellcaster).toBe(true)
    })

    it('returns true for Bishop', () => {
      component.character = createTestCharacter({ class: CharacterClass.BISHOP })
      expect(component.isSpellcaster).toBe(true)
    })

    it('returns false for Fighter', () => {
      component.character = createTestCharacter({ class: CharacterClass.FIGHTER })
      expect(component.isSpellcaster).toBe(false)
    })

    it('returns false for Thief', () => {
      component.character = createTestCharacter({ class: CharacterClass.THIEF })
      expect(component.isSpellcaster).toBe(false)
    })
  })

  describe('canStillLevel', () => {
    it('returns true when below MAX_LEVEL', () => {
      component.character = createTestCharacter({ level: 5 })
      expect(component.canStillLevel).toBe(true)
    })

    it('returns false at MAX_LEVEL', () => {
      component.character = createTestCharacter({ level: MAX_LEVEL })
      expect(component.canStillLevel).toBe(false)
    })
  })

  describe('XP calculations', () => {
    it('calculates next level XP requirement', () => {
      component.character = createTestCharacter({
        level: 2,
        class: CharacterClass.FIGHTER
      })

      const nextLevelXP = component.nextLevelXP
      expect(nextLevelXP).toBeGreaterThan(0)
    })

    it('calculates XP remaining to next level', () => {
      component.character = createTestCharacter({
        level: 2,
        experience: 1000,
        class: CharacterClass.FIGHTER
      })

      const xpToNext = component.xpToNextLevel
      expect(xpToNext).toBe(component.nextLevelXP - 1000)
    })

    it('returns 0 when XP exceeds next level requirement', () => {
      component.character = createTestCharacter({
        level: 1,
        experience: 999999,
        class: CharacterClass.FIGHTER
      })

      expect(component.xpToNextLevel).toBe(0)
    })
  })

  describe('actions', () => {
    it('shows actions when provided', () => {
      const actions: CharacterAction[] = [
        { type: 'read-spells', label: 'Spells' },
        { type: 'cast-spell', label: 'Cast' }
      ]

      component.character = createTestCharacter()
      component.actions = actions
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('app-character-actions')).toBeTruthy()
    })

    it('hides actions section when no actions provided', () => {
      component.character = createTestCharacter()
      component.actions = []
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('app-character-actions')).toBeFalsy()
    })

    it('emits actionClick when action is clicked', () => {
      const actions: CharacterAction[] = [{ type: 'read-spells', label: 'Spells' }]
      component.character = createTestCharacter({ id: 'char-123' })
      component.actions = actions

      jest.spyOn(component.actionClick, 'emit')

      const event = { actionType: 'read-spells', characterId: 'char-123' }
      component.handleActionClick(event as any)

      expect(component.actionClick.emit).toHaveBeenCalledWith(event)
    })
  })

  describe('inspectionMode input', () => {
    it('defaults to TAVERN mode', () => {
      component.character = createTestCharacter()
      expect(component.inspectionMode).toBe('TAVERN')
    })

    it('accepts TRAINING_GROUNDS mode', () => {
      component.character = createTestCharacter()
      component.inspectionMode = 'TRAINING_GROUNDS'
      expect(component.inspectionMode).toBe('TRAINING_GROUNDS')
    })

    it('accepts CAMP mode', () => {
      component.character = createTestCharacter()
      component.inspectionMode = 'CAMP'
      expect(component.inspectionMode).toBe('CAMP')
    })
  })

  describe('formatNumber', () => {
    it('formats large numbers with commas', () => {
      component.character = createTestCharacter()
      expect(component.formatNumber(1234567)).toBe('1,234,567')
    })

    it('handles small numbers', () => {
      component.character = createTestCharacter()
      expect(component.formatNumber(42)).toBe('42')
    })
  })

  describe('hasActions', () => {
    it('returns true when actions array is not empty', () => {
      component.character = createTestCharacter()
      component.actions = [{ type: 'read-spells', label: 'Spells' }]
      expect(component.hasActions).toBe(true)
    })

    it('returns false when actions array is empty', () => {
      component.character = createTestCharacter()
      component.actions = []
      expect(component.hasActions).toBe(false)
    })
  })

  describe('hasSpellPoints', () => {
    it('returns true when character has mage spell points', () => {
      component.character = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 5 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.hasSpellPoints).toBe(true)
    })

    it('returns true when character has priest spell points', () => {
      component.character = createTestCharacter({
        spellPoints: {
          priest: {
            level1: { current: 4, max: 4 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      expect(component.hasSpellPoints).toBe(true)
    })

    it('returns false when character has no spell points', () => {
      component.character = createTestCharacter({ spellPoints: undefined })
      expect(component.hasSpellPoints).toBe(false)
    })

    it('returns false when spell points exist but are empty', () => {
      component.character = createTestCharacter({ spellPoints: {} })
      expect(component.hasSpellPoints).toBe(false)
    })
  })
})

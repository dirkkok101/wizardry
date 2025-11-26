import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SpellPointsDisplayComponent } from '../spell-points-display.component'
import { CharacterSpellPoints } from '@models/SpellPoints'

describe('SpellPointsDisplayComponent', () => {
  let component: SpellPointsDisplayComponent
  let fixture: ComponentFixture<SpellPointsDisplayComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpellPointsDisplayComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(SpellPointsDisplayComponent)
    component = fixture.componentInstance
  })

  it('creates component', () => {
    expect(component).toBeTruthy()
  })

  describe('visibility', () => {
    it('shows nothing when spellPoints is undefined', () => {
      component.spellPoints = undefined
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-points-display')).toBeFalsy()
    })

    it('shows nothing when no mage or priest pools exist', () => {
      component.spellPoints = {}
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-points-display')).toBeFalsy()
    })

    it('shows mage pool when mage spells exist', () => {
      component.spellPoints = {
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
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-pool.mage')).toBeTruthy()
      expect(compiled.querySelector('.pool-label').textContent).toContain('MAGE')
    })

    it('shows priest pool when priest spells exist', () => {
      component.spellPoints = {
        priest: {
          level1: { current: 4, max: 4 },
          level2: { current: 2, max: 2 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      }
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-pool.priest')).toBeTruthy()
      expect(compiled.querySelector('.pool-label').textContent).toContain('PRIEST')
    })

    it('shows both pools for hybrid casters', () => {
      component.spellPoints = {
        mage: {
          level1: { current: 2, max: 3 },
          level2: { current: 0, max: 0 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        },
        priest: {
          level1: { current: 3, max: 4 },
          level2: { current: 0, max: 0 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      }
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-pool.mage')).toBeTruthy()
      expect(compiled.querySelector('.spell-pool.priest')).toBeTruthy()
    })
  })

  describe('displayLevels', () => {
    it('returns array of 7 levels', () => {
      const pool = {
        level1: { current: 3, max: 5 },
        level2: { current: 2, max: 3 },
        level3: { current: 1, max: 2 },
        level4: { current: 0, max: 1 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }

      const result = component.displayLevels(pool)

      expect(result.length).toBe(7)
      expect(result[0]).toEqual({ level: 1, current: 3, max: 5 })
      expect(result[1]).toEqual({ level: 2, current: 2, max: 3 })
      expect(result[6]).toEqual({ level: 7, current: 0, max: 0 })
    })

    it('handles missing level data gracefully', () => {
      const pool = {
        level1: { current: 3, max: 5 }
      } as any

      const result = component.displayLevels(pool)

      expect(result.length).toBe(7)
      expect(result[0]).toEqual({ level: 1, current: 3, max: 5 })
      expect(result[1]).toEqual({ level: 2, current: 0, max: 0 })
    })
  })

  describe('depleted styling', () => {
    it('marks depleted levels with depleted class', () => {
      component.spellPoints = {
        mage: {
          level1: { current: 0, max: 5 },
          level2: { current: 2, max: 3 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      }
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const levels = compiled.querySelectorAll('.level')
      expect(levels[0].classList.contains('depleted')).toBe(true)
      expect(levels[1].classList.contains('depleted')).toBe(false)
    })
  })

  describe('showEmptyLevels option', () => {
    it('hides zero max levels by default', () => {
      component.spellPoints = {
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
      component.showEmptyLevels = false
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const visibleLevels = compiled.querySelectorAll('.level:not(.hidden)')
      expect(visibleLevels.length).toBe(1)
    })

    it('shows all levels when showEmptyLevels is true', () => {
      component.spellPoints = {
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
      component.showEmptyLevels = true
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const allLevels = compiled.querySelectorAll('.level')
      const hiddenLevels = compiled.querySelectorAll('.level.hidden')
      expect(allLevels.length).toBe(7)
      expect(hiddenLevels.length).toBe(0)
    })
  })
})

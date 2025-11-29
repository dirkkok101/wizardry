import { ComponentFixture, TestBed } from '@angular/core/testing'
import {
  CharacterCreationStatsCardComponent,
  PartialCharacter,
  AllocationConfig,
  StatKey
} from '../character-creation-stats-card.component'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { CharacterClass } from '@models/CharacterClass'

describe('CharacterCreationStatsCardComponent', () => {
  let component: CharacterCreationStatsCardComponent
  let fixture: ComponentFixture<CharacterCreationStatsCardComponent>

  // Helper to create allocation config
  const createAllocationConfig = (overrides?: Partial<AllocationConfig>): AllocationConfig => ({
    bonusPoints: 5,
    baseStats: { str: 10, int: 10, pie: 10, vit: 10, agi: 10, luc: 10 },
    allocatedStats: {
      strength: 0,
      intelligence: 0,
      piety: 0,
      vitality: 0,
      agility: 0,
      luck: 0,
      bonusPoints: 5
    },
    maxStat: 18,
    ...overrides
  })

  // Helper to create partial character
  const createPartialCharacter = (overrides?: Partial<PartialCharacter>): PartialCharacter => ({
    race: Race.HUMAN,
    alignment: Alignment.GOOD,
    class: CharacterClass.FIGHTER,
    strength: 12,
    intelligence: 11,
    piety: 10,
    vitality: 13,
    agility: 14,
    luck: 9,
    ...overrides
  })

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCreationStatsCardComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(CharacterCreationStatsCardComponent)
    component = fixture.componentInstance
  })

  it('creates component', () => {
    expect(component).toBeTruthy()
  })

  describe('progressive reveal', () => {
    it('shows race when partialCharacter has race', () => {
      component.partialCharacter = { race: Race.HUMAN }
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('Race:')
      expect(compiled.textContent).toContain('HUMAN')
    })

    it('shows alignment when partialCharacter has alignment', () => {
      component.partialCharacter = { race: Race.ELF, alignment: Alignment.GOOD }
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('Alignment:')
      expect(compiled.textContent).toContain('GOOD')
    })

    it('shows class when partialCharacter has class', () => {
      component.partialCharacter = {
        race: Race.DWARF,
        alignment: Alignment.NEUTRAL,
        class: CharacterClass.FIGHTER
      }
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('Class:')
      expect(compiled.textContent).toContain('FIGHTER')
    })

    it('does not show stats section without allocation config', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = undefined
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.stats-section')).toBeFalsy()
    })

    it('shows stats section when allocation config is provided', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = createAllocationConfig()
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.stats-section')).toBeTruthy()
    })
  })

  describe('hasStats', () => {
    it('returns false without allocation config', () => {
      component.allocationConfig = undefined
      expect(component.hasStats).toBe(false)
    })

    it('returns true with allocation config', () => {
      component.allocationConfig = createAllocationConfig()
      expect(component.hasStats).toBe(true)
    })
  })

  describe('getStatValue', () => {
    it('returns partial character stat value', () => {
      component.partialCharacter = createPartialCharacter({ strength: 15 })
      expect(component.getStatValue('strength')).toBe(15)
    })

    it('returns undefined for missing stat', () => {
      component.partialCharacter = { race: Race.HUMAN }
      expect(component.getStatValue('strength')).toBeUndefined()
    })
  })

  describe('getBaseStat', () => {
    it('returns 0 without allocation config', () => {
      component.allocationConfig = undefined
      expect(component.getBaseStat('strength')).toBe(0)
    })

    it('returns base stat from allocation config', () => {
      component.allocationConfig = createAllocationConfig({
        baseStats: { str: 12, int: 10, pie: 10, vit: 10, agi: 10, luc: 10 }
      })
      expect(component.getBaseStat('strength')).toBe(12)
    })
  })

  describe('getAllocated', () => {
    it('returns 0 without allocation config', () => {
      component.allocationConfig = undefined
      expect(component.getAllocated('strength')).toBe(0)
    })

    it('returns allocated points from config', () => {
      component.allocationConfig = createAllocationConfig({
        allocatedStats: {
          strength: 3,
          intelligence: 0,
          piety: 0,
          vitality: 2,
          agility: 0,
          luck: 0,
          bonusPoints: 0
        }
      })
      expect(component.getAllocated('strength')).toBe(3)
      expect(component.getAllocated('vitality')).toBe(2)
    })
  })

  describe('canIncrement', () => {
    it('returns false without allocation config', () => {
      component.allocationConfig = undefined
      expect(component.canIncrement('strength')).toBe(false)
    })

    it('returns false when no bonus points remaining', () => {
      component.allocationConfig = createAllocationConfig({ bonusPoints: 0 })
      expect(component.canIncrement('strength')).toBe(false)
    })

    it('returns false when stat is at max', () => {
      component.allocationConfig = createAllocationConfig({
        bonusPoints: 5,
        baseStats: { str: 15, int: 10, pie: 10, vit: 10, agi: 10, luc: 10 },
        allocatedStats: {
          strength: 3, // 15 + 3 = 18 (max)
          intelligence: 0,
          piety: 0,
          vitality: 0,
          agility: 0,
          luck: 0,
          bonusPoints: 5
        }
      })
      expect(component.canIncrement('strength')).toBe(false)
    })

    it('returns true when bonus points available and stat below max', () => {
      component.allocationConfig = createAllocationConfig({ bonusPoints: 5 })
      expect(component.canIncrement('strength')).toBe(true)
    })
  })

  describe('canDecrement', () => {
    it('returns false without allocation config', () => {
      component.allocationConfig = undefined
      expect(component.canDecrement('strength')).toBe(false)
    })

    it('returns false when no points allocated to stat', () => {
      component.allocationConfig = createAllocationConfig()
      expect(component.canDecrement('strength')).toBe(false)
    })

    it('returns true when points have been allocated', () => {
      component.allocationConfig = createAllocationConfig({
        allocatedStats: {
          strength: 2,
          intelligence: 0,
          piety: 0,
          vitality: 0,
          agility: 0,
          luck: 0,
          bonusPoints: 3
        }
      })
      expect(component.canDecrement('strength')).toBe(true)
    })
  })

  describe('incrementStat', () => {
    it('emits allocate event with delta +1', () => {
      component.allocationConfig = createAllocationConfig({ bonusPoints: 5 })
      jest.spyOn(component.allocate, 'emit')

      component.incrementStat('strength')

      expect(component.allocate.emit).toHaveBeenCalledWith({ stat: 'strength', delta: 1 })
    })

    it('does not emit when cannot increment', () => {
      component.allocationConfig = createAllocationConfig({ bonusPoints: 0 })
      jest.spyOn(component.allocate, 'emit')

      component.incrementStat('strength')

      expect(component.allocate.emit).not.toHaveBeenCalled()
    })
  })

  describe('decrementStat', () => {
    it('emits allocate event with delta -1', () => {
      component.allocationConfig = createAllocationConfig({
        allocatedStats: {
          strength: 2,
          intelligence: 0,
          piety: 0,
          vitality: 0,
          agility: 0,
          luck: 0,
          bonusPoints: 3
        }
      })
      jest.spyOn(component.allocate, 'emit')

      component.decrementStat('strength')

      expect(component.allocate.emit).toHaveBeenCalledWith({ stat: 'strength', delta: -1 })
    })

    it('does not emit when cannot decrement', () => {
      component.allocationConfig = createAllocationConfig()
      jest.spyOn(component.allocate, 'emit')

      component.decrementStat('strength')

      expect(component.allocate.emit).not.toHaveBeenCalled()
    })
  })

  describe('getStatModifier', () => {
    beforeEach(() => {
      component.partialCharacter = createPartialCharacter()
    })

    it('returns "--" for undefined stat value', () => {
      component.partialCharacter = { race: Race.HUMAN }
      expect(component.getStatModifier('strength')).toBe('--')
    })

    it('calculates strength modifier correctly', () => {
      component.partialCharacter = createPartialCharacter({ strength: 14 })
      expect(component.getStatModifier('strength')).toBe('+2 dmg')

      component.partialCharacter = createPartialCharacter({ strength: 8 })
      expect(component.getStatModifier('strength')).toBe('-1 dmg')
    })

    it('calculates intelligence modifier correctly', () => {
      component.partialCharacter = createPartialCharacter({ intelligence: 16 })
      expect(component.getStatModifier('intelligence')).toBe('+3 learn')

      component.partialCharacter = createPartialCharacter({ intelligence: 8 })
      expect(component.getStatModifier('intelligence')).toBe('-1 learn')
    })

    it('calculates piety modifier correctly', () => {
      component.partialCharacter = createPartialCharacter({ piety: 14 })
      expect(component.getStatModifier('piety')).toBe('+2 learn')

      component.partialCharacter = createPartialCharacter({ piety: 6 })
      expect(component.getStatModifier('piety')).toBe('-2 learn')
    })

    it('calculates agility modifier correctly', () => {
      component.partialCharacter = createPartialCharacter({ agility: 14 })
      expect(component.getStatModifier('agility')).toBe('+2 AC')
    })

    it('calculates luck effect correctly', () => {
      component.partialCharacter = createPartialCharacter({ luck: 14 })
      expect(component.getStatModifier('luck')).toBe('+8% flee')
    })
  })

  describe('template rendering', () => {
    it('shows allocation instructions', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = createAllocationConfig()
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('Use +/- to allocate your bonus points')
    })

    it('shows bonus points remaining', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = createAllocationConfig({ bonusPoints: 7 })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.textContent).toContain('Points Remaining')
      expect(compiled.textContent).toContain('7')
    })

    it('shows +/- buttons for each stat', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = createAllocationConfig()
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const incrementButtons = compiled.querySelectorAll('.btn-increment')
      const decrementButtons = compiled.querySelectorAll('.btn-decrement')

      expect(incrementButtons.length).toBe(6)
      expect(decrementButtons.length).toBe(6)
    })

    it('disables decrement buttons when no points allocated', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = createAllocationConfig()
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const decrementButtons = compiled.querySelectorAll('.btn-decrement')

      decrementButtons.forEach((btn: HTMLButtonElement) => {
        expect(btn.disabled).toBe(true)
      })
    })

    it('disables increment buttons when no bonus points remaining', () => {
      component.partialCharacter = createPartialCharacter()
      component.allocationConfig = createAllocationConfig({ bonusPoints: 0 })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const incrementButtons = compiled.querySelectorAll('.btn-increment')

      incrementButtons.forEach((btn: HTMLButtonElement) => {
        expect(btn.disabled).toBe(true)
      })
    })
  })
})

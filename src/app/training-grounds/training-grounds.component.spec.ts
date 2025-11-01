import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TrainingGroundsComponent, WizardStep } from './training-grounds.component'
import { GameStateService } from '../../services/GameStateService'
import { CharacterCreationService, BaseStats } from '../../services/CharacterCreationService'
import { SceneType } from '../../types/SceneType'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'
import { CharacterClass } from '../../types/CharacterClass'

describe('TrainingGroundsComponent', () => {
  let component: TrainingGroundsComponent
  let fixture: ComponentFixture<TrainingGroundsComponent>
  let gameState: GameStateService
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent]
    })

    fixture = TestBed.createComponent(TrainingGroundsComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)

    jest.spyOn(router, 'navigate')
  })

  describe('initialization', () => {
    it('updates scene to TRAINING_GROUNDS on init', () => {
      component.ngOnInit()
      expect(gameState.currentScene()).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('starts wizard at RACE step', () => {
      component.ngOnInit()
      expect(component.currentStep()).toBe('RACE')
    })

    it('initializes wizard state with null values', () => {
      component.ngOnInit()

      expect(component.wizardState().selectedRace).toBeNull()
      expect(component.wizardState().selectedAlignment).toBeNull()
      expect(component.wizardState().rolledStats).toBeNull()
      expect(component.wizardState().selectedClass).toBeNull()
      expect(component.wizardState().name).toBe('')
      expect(component.wizardState().password).toBe('')
    })
  })

  describe('wizard navigation', () => {
    it('advances to ALIGNMENT step after race selection', () => {
      component.selectRace(Race.HUMAN)

      expect(component.currentStep()).toBe('ALIGNMENT')
    })

    it('advances to STATS step after alignment selection', () => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)

      expect(component.currentStep()).toBe('STATS')
    })

    it('allows going back to previous step', () => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)

      component.previousStep()

      expect(component.currentStep()).toBe('ALIGNMENT')
    })

    it('cannot go back from RACE step', () => {
      component.previousStep()

      expect(component.currentStep()).toBe('RACE')
    })
  })

  describe('wizard state persistence', () => {
    it('preserves race when going back and forth', () => {
      component.selectRace(Race.ELF)
      component.selectAlignment(Alignment.GOOD)
      component.previousStep()

      expect(component.wizardState().selectedRace).toBe(Race.ELF)
    })

    it('preserves stats after reroll', () => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
      component.rollStats()

      const firstRoll = component.wizardState().rolledStats

      component.rollStats() // Reroll

      const secondRoll = component.wizardState().rolledStats

      expect(firstRoll).not.toEqual(secondRoll)
      expect(secondRoll).toBeDefined()
    })
  })

  describe('race selection', () => {
    it('displays 5 race options', () => {
      component.ngOnInit()
      fixture.detectChanges()

      const raceOptions = component.getRaceOptions()

      expect(raceOptions.length).toBe(5)
      expect(raceOptions).toContain(Race.HUMAN)
      expect(raceOptions).toContain(Race.ELF)
      expect(raceOptions).toContain(Race.DWARF)
      expect(raceOptions).toContain(Race.GNOME)
      expect(raceOptions).toContain(Race.HOBBIT)
    })

    it('shows race modifiers for each race', () => {
      const modifiers = component.getRaceModifiers(Race.ELF)

      expect(modifiers.strength).toBe(-1)
      expect(modifiers.intelligence).toBe(1)
      expect(modifiers.vitality).toBe(-2)
      expect(modifiers.agility).toBe(1)
    })

    it('selects race and updates wizard state', () => {
      component.selectRace(Race.DWARF)

      expect(component.wizardState().selectedRace).toBe(Race.DWARF)
      expect(component.currentStep()).toBe('ALIGNMENT')
    })
  })

  describe('alignment selection', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN) // Advance to ALIGNMENT step
    })

    it('displays 3 alignment options', () => {
      const alignments = component.getAlignmentOptions()

      expect(alignments.length).toBe(3)
      expect(alignments).toContain(Alignment.GOOD)
      expect(alignments).toContain(Alignment.NEUTRAL)
      expect(alignments).toContain(Alignment.EVIL)
    })

    it('selects alignment and advances to STATS step', () => {
      component.selectAlignment(Alignment.GOOD)

      expect(component.wizardState().selectedAlignment).toBe(Alignment.GOOD)
      expect(component.currentStep()).toBe('STATS')
    })

    it('shows alignment description', () => {
      const desc = component.getAlignmentDescription(Alignment.NEUTRAL)

      expect(desc.toLowerCase()).toContain('balanced')
    })
  })

  describe('stat rolling', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('rolls stats when entering STATS step', () => {
      component.rollStats()

      const stats = component.wizardState().rolledStats

      expect(stats).toBeDefined()
      expect(stats!.strength).toBeGreaterThanOrEqual(3)
      expect(stats!.strength).toBeLessThanOrEqual(18)
    })

    it('generates bonus points (7-29 range)', () => {
      component.rollStats()

      const stats = component.wizardState().rolledStats

      expect(stats!.bonusPoints).toBeGreaterThanOrEqual(7)
      expect(stats!.bonusPoints).toBeLessThanOrEqual(29)
    })

    it('applies race modifiers to rolled stats', () => {
      // Select Elf (STR -1, INT +1, VIT -2, AGI +1)
      component.currentStep.set('RACE')
      component.selectRace(Race.ELF)
      component.selectAlignment(Alignment.GOOD)

      // Mock the random roll to get predictable values
      jest.spyOn(CharacterCreationService, 'rollStats').mockReturnValue({
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 10
      })

      component.rollStats()

      const stats = component.wizardState().rolledStats

      expect(stats!.strength).toBe(9) // 10 - 1 (Elf modifier)
      expect(stats!.intelligence).toBe(11) // 10 + 1
      expect(stats!.vitality).toBe(8) // 10 - 2
      expect(stats!.agility).toBe(11) // 10 + 1
    })

    it('allows rerolling stats', () => {
      component.rollStats()
      const firstRoll = component.wizardState().rolledStats

      component.rollStats() // Reroll

      const secondRoll = component.wizardState().rolledStats

      expect(secondRoll).toBeDefined()
      // Rolls should be different (with very high probability)
      const isDifferent =
        firstRoll!.strength !== secondRoll!.strength ||
        firstRoll!.intelligence !== secondRoll!.intelligence ||
        firstRoll!.bonusPoints !== secondRoll!.bonusPoints

      expect(isDifferent).toBe(true)
    })

    it('advances to BONUS_POINTS step when stats accepted', () => {
      component.rollStats()
      component.acceptStats()

      expect(component.currentStep()).toBe('BONUS_POINTS')
    })

    it('shows error when trying to accept without rolling', () => {
      component.acceptStats()

      expect(component.errorMessage()).toContain('Roll stats')
    })
  })

  describe('bonus point allocation', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
      component.rollStats()
      component.acceptStats()
    })

    it('displays available bonus points', () => {
      const points = component.getAvailableBonusPoints()

      expect(points).toBeGreaterThanOrEqual(7)
      expect(points).toBeLessThanOrEqual(29)
    })

    it('allocates bonus points to a stat', () => {
      const initialStats = component.wizardState().rolledStats!
      const initialStr = initialStats.strength
      const initialBonus = initialStats.bonusPoints

      component.allocateBonusPoint('strength', 1)

      const updatedStats = component.wizardState().rolledStats!

      expect(updatedStats.strength).toBe(initialStr + 1)
      expect(updatedStats.bonusPoints).toBe(initialBonus - 1)
    })

    it('prevents allocating more points than available', () => {
      const stats = component.wizardState().rolledStats!
      const availablePoints = stats.bonusPoints

      component.allocateBonusPoint('strength', availablePoints + 1)

      expect(component.errorMessage()).toContain('Not enough bonus points')
    })

    it('allows allocating all bonus points', () => {
      const stats = component.wizardState().rolledStats!
      const allPoints = stats.bonusPoints

      component.allocateBonusPoint('strength', allPoints)

      const updated = component.wizardState().rolledStats!

      expect(updated.bonusPoints).toBe(0)
      expect(updated.strength).toBe(stats.strength + allPoints)
    })

    it('advances to CLASS step when bonus points allocated', () => {
      component.finishBonusAllocation()

      expect(component.currentStep()).toBe('CLASS')
    })

    it('updates eligible classes in real-time as points allocated', () => {
      // Start with low stats but select GOOD alignment for Samurai
      component.wizardState.update(state => ({
        ...state,
        selectedAlignment: Alignment.GOOD,
        rolledStats: {
          strength: 10,
          intelligence: 10,
          piety: 10,
          vitality: 10,
          agility: 10,
          luck: 10,
          bonusPoints: 10
        }
      }))

      const eligibleBefore = component.getEligibleClasses()

      // Allocate points to make character eligible for Samurai
      // Samurai needs: STR 15+, IQ 11+, PIE 10+, VIT 14+, AGI 10+ and GOOD/NEUTRAL alignment
      component.allocateBonusPoint('strength', 5) // 10 + 5 = 15
      component.allocateBonusPoint('intelligence', 1) // 10 + 1 = 11
      component.allocateBonusPoint('vitality', 4) // 10 + 4 = 14

      const eligibleAfter = component.getEligibleClasses()

      expect(eligibleAfter).toContain(CharacterClass.SAMURAI)
      expect(eligibleBefore).not.toContain(CharacterClass.SAMURAI)
    })
  })
})

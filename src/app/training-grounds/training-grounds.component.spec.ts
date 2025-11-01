import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TrainingGroundsComponent, WizardStep } from './training-grounds.component'
import { GameStateService } from '../../services/GameStateService'
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
})

// src/app/__tests__/integration/character-creation.integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TrainingGroundsComponent } from '../../training-grounds/training-grounds.component'
import { GameStateService } from '../../../services/GameStateService'
import { Race } from '../../../types/Race'
import { Alignment } from '../../../types/Alignment'
import { CharacterClass } from '../../../types/CharacterClass'
import { CharacterStatus } from '../../../types/CharacterStatus'

describe('Integration: Character Creation Flow', () => {
  let component: TrainingGroundsComponent
  let fixture: ComponentFixture<TrainingGroundsComponent>
  let gameState: GameStateService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: jest.fn()
          }
        }
      ]
    })

    fixture = TestBed.createComponent(TrainingGroundsComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)

    component.ngOnInit()
  })

  it('completes full character creation wizard and adds to roster', () => {
    const initialRosterSize = gameState.state().roster.size

    // Step 1: Select race
    expect(component.currentStep()).toBe('RACE')
    component.selectRace(Race.HUMAN)

    expect(component.wizardState().selectedRace).toBe(Race.HUMAN)
    expect(component.currentStep()).toBe('ALIGNMENT')

    // Step 2: Select alignment
    component.selectAlignment(Alignment.GOOD)

    expect(component.wizardState().selectedAlignment).toBe(Alignment.GOOD)
    expect(component.currentStep()).toBe('STATS')

    // Step 3: Roll stats
    component.rollStats()

    expect(component.wizardState().rolledStats).toBeDefined()
    expect(component.wizardState().rolledStats!.bonusPoints).toBeGreaterThanOrEqual(7)

    // Step 4: Accept stats (advance to bonus allocation)
    component.acceptStats()

    expect(component.currentStep()).toBe('BONUS_POINTS')

    // Step 5: Allocate bonus points
    const bonusPoints = component.getAvailableBonusPoints()
    if (bonusPoints > 0) {
      component.allocateBonusPoint('strength', Math.min(bonusPoints, 5))
    }

    component.finishBonusAllocation()

    expect(component.currentStep()).toBe('CLASS')

    // Step 6: Select class
    const eligibleClasses = component.getEligibleClasses()
    expect(eligibleClasses.length).toBeGreaterThan(0)

    component.selectClass(eligibleClasses[0])

    expect(component.currentStep()).toBe('NAME_PASSWORD')

    // Step 7: Enter name and password
    component.setName('Gandalf')
    component.setPassword('wizard')

    component.finishNamePassword()

    expect(component.currentStep()).toBe('CONFIRM')

    // Step 8: Confirm character creation
    component.confirmCharacterCreation()

    // Verify character added to roster
    const finalRosterSize = gameState.state().roster.size
    expect(finalRosterSize).toBe(initialRosterSize + 1)

    // Verify character properties
    const roster = gameState.state().roster
    const gandalf = Array.from(roster.values()).find(c => c.name === 'Gandalf')

    expect(gandalf).toBeDefined()
    expect(gandalf!.race).toBe(Race.HUMAN)
    expect(gandalf!.alignment).toBe(Alignment.GOOD)
    expect(gandalf!.level).toBe(1)
    expect(gandalf!.status).toBe(CharacterStatus.OK)
    expect(gandalf!.class).toBe(eligibleClasses[0])

    // Verify wizard reset for next character
    expect(component.wizardState().selectedRace).toBeNull()
    expect(component.currentStep()).toBe('RACE')

    // Verify success message shown
    expect(component.successMessage()).toContain('Gandalf')
    expect(component.successMessage()).toContain('created successfully')
  })

  it('persists characters across wizard resets', () => {
    // Create first character
    component.selectRace(Race.ELF)
    component.selectAlignment(Alignment.GOOD)
    component.rollStats()
    component.acceptStats()
    if (component.getAvailableBonusPoints() > 0) {
      component.allocateBonusPoint('intelligence', Math.min(component.getAvailableBonusPoints(), 3))
    }
    component.finishBonusAllocation()
    const eligibleClasses1 = component.getEligibleClasses()
    component.selectClass(eligibleClasses1[0])
    component.setName('Legolas')
    component.setPassword('elf123') // Password must be 4-8 characters
    component.finishNamePassword()
    component.confirmCharacterCreation()

    // Verify first character created and wizard reset
    const rosterAfterFirst = gameState.state().roster
    const legolas = Array.from(rosterAfterFirst.values()).find(c => c.name === 'Legolas')

    expect(legolas).toBeDefined()
    expect(legolas!.race).toBe(Race.ELF)
    expect(component.currentStep()).toBe('RACE') // Wizard should reset

    // Create second character
    component.selectRace(Race.DWARF)
    component.selectAlignment(Alignment.NEUTRAL)
    component.rollStats()
    component.acceptStats()
    if (component.getAvailableBonusPoints() > 0) {
      component.allocateBonusPoint('vitality', Math.min(component.getAvailableBonusPoints(), 3))
    }
    component.finishBonusAllocation()
    const eligibleClasses2 = component.getEligibleClasses()
    component.selectClass(eligibleClasses2[0])
    component.setName('Gimli')
    component.setPassword('dwarf123') // Password must be 4-8 characters
    component.finishNamePassword()
    component.confirmCharacterCreation()

    // Verify both characters in roster
    const finalRoster = gameState.state().roster
    const finalLegolas = Array.from(finalRoster.values()).find(c => c.name === 'Legolas')
    const gimli = Array.from(finalRoster.values()).find(c => c.name === 'Gimli')

    expect(finalLegolas).toBeDefined()
    expect(gimli).toBeDefined()
    expect(finalLegolas!.race).toBe(Race.ELF)
    expect(gimli!.race).toBe(Race.DWARF)
    expect(finalRoster.size).toBe(2)
  })
})

// src/app/scenes/combat/combat.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatComponent } from './combat'
import { GameStateService } from '../../../services/GameStateService'
import { SceneType } from '../../../types/SceneType'
import { createTestGameStateWithCombat, createTestCharacter } from '../../../test-helpers/test-factories'
import { Router } from '@angular/router'

describe('CombatComponent', () => {
  let component: CombatComponent
  let fixture: ComponentFixture<CombatComponent>
  let gameState: GameStateService
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CombatComponent]
    })

    fixture = TestBed.createComponent(CombatComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)

    jest.spyOn(router, 'navigate')

    // Setup combat state
    const char1 = createTestCharacter({ id: 'c1', name: 'Fighter', hp: 20 })
    const char2 = createTestCharacter({ id: 'c2', name: 'Mage', hp: 10 })

    gameState.updateState(() => createTestGameStateWithCombat({
      roster: new Map([
        ['c1', char1],
        ['c2', char2]
      ]),
      party: {
        members: ['c1', 'c2'],
        formation: { frontRow: ['c1'], backRow: ['c2'] },
        position: { x: 0, y: 0, facing: 'north', level: 1 },
        gold: 100
      }
    }))

    component.ngOnInit()
    fixture.detectChanges()
  })

  it('sets scene to COMBAT on init', () => {
    expect(gameState.currentScene()).toBe(SceneType.COMBAT)
  })

  it('computes party characters from roster', () => {
    const chars = component.partyCharacters()
    expect(chars).toHaveLength(2)
    expect(chars[0].name).toBe('Fighter')
    expect(chars[1].name).toBe('Mage')
  })

  it('computes monsters from combat state', () => {
    const monsters = component.monsters()
    expect(monsters.length).toBeGreaterThan(0)
  })

  it('computes combat state from game state', () => {
    const combat = component.combatState()
    expect(combat).toBeDefined()
    expect(combat?.roundNumber).toBe(1)
  })

  it('initializes with no actions selected', () => {
    const actions = component.selectedActions()
    expect(actions.size).toBe(0)
  })
})

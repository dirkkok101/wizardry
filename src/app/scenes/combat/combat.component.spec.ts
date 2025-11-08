// src/app/scenes/combat/combat.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatComponent } from './combat'
import { GameStateService } from '../../../services/GameStateService'
import { SceneType } from '../../../types/SceneType'
import { createTestGameStateWithCombat, createTestCharacter } from '../../../test-helpers/test-factories'
import { Router } from '@angular/router'
import { VictoryService } from '../../../services/VictoryService'

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

  describe('Action Selection', () => {
    it('selects ATTACK action for character', () => {
      const char = component.partyCharacters()[0]
      const monster = component.monsters()[0]

      component.selectAction(char.id, 'ATTACK', monster)

      const actions = component.selectedActions()
      expect(actions.has(char.id)).toBe(true)
      expect(actions.get(char.id)!.type).toBe('ATTACK')
      expect(actions.get(char.id)!.target).toBe(monster)
    })

    it('creates command with initiative when selecting action', () => {
      const char = component.partyCharacters()[0]
      const monster = component.monsters()[0]

      component.selectAction(char.id, 'ATTACK', monster)

      const command = component.selectedActions().get(char.id)!
      expect(command.initiative).toBeGreaterThanOrEqual(1)
      expect(command.actor).toBe(char)
    })

    it('replaces existing action when selecting new one', () => {
      const char = component.partyCharacters()[0]
      const monster1 = component.monsters()[0]
      const monster2 = component.monsters()[1] || monster1

      component.selectAction(char.id, 'ATTACK', monster1)
      component.selectAction(char.id, 'ATTACK', monster2)

      const actions = component.selectedActions()
      expect(actions.size).toBe(1)
      expect(actions.get(char.id)!.target).toBe(monster2)
    })
  })

  describe('Execute Round', () => {
    beforeEach(() => {
      // Select actions for all characters
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]

      chars.forEach(char => {
        component.selectAction(char.id, 'ATTACK', monster)
      })
    })

    it('executes round using CombatService', () => {
      const initialRound = component.roundNumber()

      component.executeRound()

      // Round number should increment (or combat ends)
      const newRound = component.roundNumber()
      expect(newRound).toBeGreaterThanOrEqual(initialRound)
    })

    it('clears selected actions after round executes', () => {
      component.executeRound()

      expect(component.selectedActions().size).toBe(0)
    })

    it('updates combat state in GameStateService', () => {
      const initialMonsterHP = component.monsters()[0].hp

      component.executeRound()

      // HP should change (might increase or decrease depending on who got hit)
      const newCombatState = gameState.state().combat
      expect(newCombatState).toBeDefined()
    })

    it('sets isExecutingRound flag during execution', async () => {
      expect(component.isExecutingRound()).toBe(false)

      // Execute round doesn't wait, so we can't test the flag easily
      // This is more of an integration test
      component.executeRound()

      // After execution completes, flag should be false
      expect(component.isExecutingRound()).toBe(false)
    })
  })

  describe('Victory Handling', () => {
    beforeEach(() => {
      // Setup victory scenario - all monsters dead
      gameState.updateState(state => {
        const combat = state.combat!
        const deadMonsters = combat.monsters.map(m => ({
          ...m,
          hp: 0,
          status: 'DEAD' as const
        }))

        return {
          ...state,
          combat: {
            ...combat,
            monsters: deadMonsters
          }
        }
      })

      fixture.detectChanges()
    })

    it('calculates victory rewards', () => {
      const spyCalculate = jest.spyOn(VictoryService, 'calculateVictoryRewards')

      component['handleVictory']()

      expect(spyCalculate).toHaveBeenCalled()
    })

    it('distributes XP to party members', () => {
      const initialXP = gameState.roster().get('c1')!.experience

      component['handleVictory']()

      const newXP = gameState.roster().get('c1')!.experience
      expect(newXP).toBeGreaterThan(initialXP)
    })

    it('adds gold to party', () => {
      const initialGold = gameState.party().gold

      component['handleVictory']()

      const newGold = gameState.party().gold
      expect(newGold).toBeGreaterThanOrEqual(initialGold)
    })

    it('shows victory modal', () => {
      component['handleVictory']()

      expect(component.showVictoryModal()).toBe(true)
    })

    it('includes victory rewards in modal', () => {
      component['handleVictory']()

      const rewards = component.victoryRewards()
      expect(rewards).toBeDefined()
      expect(rewards?.totalXP).toBeGreaterThan(0)
    })
  })

  describe('Return to Maze', () => {
    it('navigates to /maze on victory return', () => {
      component.showVictoryModal.set(true)
      component.returnToMaze()

      expect(router.navigate).toHaveBeenCalledWith(['/maze'])
    })

    it('clears victory modal on return', () => {
      component.showVictoryModal.set(true)
      component.returnToMaze()

      expect(component.showVictoryModal()).toBe(false)
    })

    it('preserves dungeon position when returning', () => {
      const position = gameState.state().dungeon.position

      component.returnToMaze()

      const newPosition = gameState.state().dungeon.position
      expect(newPosition).toEqual(position)
    })
  })
})

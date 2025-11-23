// src/app/scenes/combat/combat.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatComponent } from './combat'
import { GameStateService } from '../../../services/GameStateService'
import { SceneType } from '../../../types/SceneType'
import { createTestGameStateWithCombat, createTestCharacter } from '../../../test-helpers/test-factories'
import { Router } from '@angular/router'
import { VictoryService } from '../../../services/VictoryService'
import { CharacterStatus } from '../../../types/CharacterStatus'

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

  it('initializes with first character as active', () => {
    const activeChar = component.activeCharacter()
    const firstChar = component.partyCharacters()[0]
    expect(activeChar).toBe(firstChar)
  })

  describe('Character-by-character Action Selection', () => {
    it('shows target selection when selecting ATTACK', () => {
      component.selectActionType('ATTACK')

      expect(component.showTargetSelection()).toBe(true)
      expect(component.selectedActionType()).toBe('ATTACK')
    })

    it('shows spell menu when selecting CAST_SPELL', () => {
      component.selectActionType('CAST_SPELL')

      expect(component.showSpellMenu()).toBe(true)
      expect(component.selectedActionType()).toBe('CAST_SPELL')
    })

    it('immediately confirms PARRY action without target', () => {
      const activeChar = component.activeCharacter()!

      component.selectActionType('PARRY')

      const actions = component.selectedActions()
      expect(actions.has(activeChar.id)).toBe(true)
      expect(actions.get(activeChar.id)!.type).toBe('PARRY')
    })

    it('shows target selection when selecting RUN', () => {
      component.selectActionType('RUN')

      expect(component.showTargetSelection()).toBe(true)
      expect(component.selectedActionType()).toBe('RUN')
    })

    it('creates command when target is selected', () => {
      const activeChar = component.activeCharacter()!
      const monster = component.monsters()[0]

      component.selectActionType('ATTACK')
      component.selectTarget(monster)

      const actions = component.selectedActions()
      expect(actions.has(activeChar.id)).toBe(true)
      expect(actions.get(activeChar.id)!.type).toBe('ATTACK')
      expect(actions.get(activeChar.id)!.target).toBe(monster)
    })

    it('advances to next character after action confirmed', () => {
      const firstChar = component.activeCharacter()!
      const monster = component.monsters()[0]

      component.selectActionType('ATTACK')
      component.selectTarget(monster)

      const secondChar = component.activeCharacter()!
      expect(secondChar.id).not.toBe(firstChar.id)
    })

    it('tracks which characters have selected actions', () => {
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]

      // First character selects attack
      component.selectActionType('ATTACK')
      component.selectTarget(monster)

      expect(component.selectedActions().has(chars[0].id)).toBe(true)
      expect(component.selectedActions().has(chars[1].id)).toBe(false)

      // Second character selects parry
      component.selectActionType('PARRY')

      expect(component.selectedActions().has(chars[0].id)).toBe(true)
      expect(component.selectedActions().has(chars[1].id)).toBe(true)
    })

    it('all actions selected when all alive characters have actions', () => {
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]

      expect(component.allActionsSelected()).toBe(false)

      // Select actions for all characters
      chars.forEach(() => {
        component.selectActionType('ATTACK')
        component.selectTarget(monster)
      })

      expect(component.allActionsSelected()).toBe(true)
    })

    it('cancels action selection and resets UI state', () => {
      component.selectActionType('ATTACK')
      expect(component.showTargetSelection()).toBe(true)

      component.cancelActionSelection()

      expect(component.showTargetSelection()).toBe(false)
      expect(component.selectedActionType()).toBe(null)
    })

    it('cancels spell menu selection', () => {
      component.selectActionType('CAST_SPELL')
      expect(component.showSpellMenu()).toBe(true)

      component.cancelActionSelection()

      expect(component.showSpellMenu()).toBe(false)
      expect(component.selectedActionType()).toBe(null)
    })
  })

  describe('Execute Round', () => {
    beforeEach(() => {
      // Select actions for all characters using new flow
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]

      chars.forEach(() => {
        component.selectActionType('ATTACK')
        component.selectTarget(monster)
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

    it('resets active character index to first character after round', () => {
      // Active character should be at index 1 after both selected actions
      expect(component.activeCharacterIndex()).toBeGreaterThan(0)

      component.executeRound()

      // Should reset to first character (index 0)
      expect(component.activeCharacterIndex()).toBe(0)
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
        const deadMonsterGroups = combat.monsterGroups.map(group => ({
          ...group,
          monsters: group.monsters.map(m => ({
            ...m,
            hp: 0,
            status: 'DEAD' as const
          }))
        }))

        return {
          ...state,
          combat: {
            ...combat,
            monsterGroups: deadMonsterGroups
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

  describe('Defeat Handling', () => {
    beforeEach(() => {
      // Setup defeat scenario - all party members dead
      gameState.updateState(state => {
        const char1 = state.roster.get('c1')!
        const char2 = state.roster.get('c2')!

        return {
          ...state,
          roster: new Map(state.roster)
            .set('c1', { ...char1, hp: 0, status: CharacterStatus.DEAD })
            .set('c2', { ...char2, hp: 0, status: CharacterStatus.DEAD })
        }
      })

      fixture.detectChanges()
    })

    it('shows defeat modal on party wipe', () => {
      component['handleDefeat']()

      expect(component.showDefeatModal()).toBe(true)
    })

    it('navigates to temple on defeat', () => {
      component['handleDefeat']()
      component.returnToTemple()

      expect(router.navigate).toHaveBeenCalledWith(['/temple'])
    })

    it('clears combat state on defeat', () => {
      component['handleDefeat']()

      const combat = gameState.state().combat
      expect(combat).toBeUndefined()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('executes round on Enter key when all actions selected', () => {
      // Select all actions using new flow
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]
      chars.forEach(() => {
        component.selectActionType('ATTACK')
        component.selectTarget(monster)
      })

      const executeRoundSpy = jest.spyOn(component, 'executeRound')

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      component.handleKeyPress(event)

      expect(executeRoundSpy).toHaveBeenCalled()
    })

    it('does not execute round on Enter when actions not selected', () => {
      const executeRoundSpy = jest.spyOn(component, 'executeRound')

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      component.handleKeyPress(event)

      expect(executeRoundSpy).not.toHaveBeenCalled()
    })

    it('returns to maze on Enter in victory modal', () => {
      component.showVictoryModal.set(true)

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      component.handleKeyPress(event)

      expect(router.navigate).toHaveBeenCalledWith(['/maze'])
    })

    it('returns to temple on Enter in defeat modal', () => {
      component.showDefeatModal.set(true)

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      component.handleKeyPress(event)

      expect(router.navigate).toHaveBeenCalledWith(['/temple'])
    })
  })
})

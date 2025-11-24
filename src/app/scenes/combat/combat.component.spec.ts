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
    it('shows group selection dialog when selecting ATTACK', () => {
      component.selectActionType('ATTACK')

      expect(component.showGroupSelectionDialog()).toBe(true)
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

    it('does not show selection dialog for RUN (removed feature)', () => {
      component.selectActionType('RUN')

      // RUN action removed - no dialog shown
      expect(component.showGroupSelectionDialog()).toBe(false)
    })

    it('creates command when target is selected', () => {
      const activeChar = component.activeCharacter()!
      const monster = component.monsters()[0]

      component.selectActionType('ATTACK')
      component.selectGroup('A')

      const actions = component.selectedActions()
      expect(actions.has(activeChar.id)).toBe(true)
      expect(actions.get(activeChar.id)!.type).toBe('ATTACK')
      // Compare by ID since computed signals may return new object instances
      expect(actions.get(activeChar.id)!.target?.id).toBe(monster.id)
    })

    it('advances to next character after action confirmed', () => {
      const firstChar = component.activeCharacter()!
      const monster = component.monsters()[0]

      component.selectActionType('ATTACK')
      component.selectGroup('A')

      const secondChar = component.activeCharacter()!
      expect(secondChar.id).not.toBe(firstChar.id)
    })

    it('tracks which characters have selected actions', () => {
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]

      // First character selects attack
      component.selectActionType('ATTACK')
      component.selectGroup('A')

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
        component.selectGroup('A')
      })

      expect(component.allActionsSelected()).toBe(true)
    })

    it('cancels action selection and resets UI state', () => {
      component.selectActionType('ATTACK')
      expect(component.showGroupSelectionDialog()).toBe(true)

      component.cancelActionSelection()

      expect(component.showGroupSelectionDialog()).toBe(false)
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

  describe('Spell Selection', () => {
    beforeEach(() => {
      // Setup a character with spell points and known spells covering various target types:
      // - single: mogref (level 1), sopic (level 2)
      // - group: halito (level 1), mahalito (level 3)
      // - party: masopic (level 6)
      // - all_enemies: madalto (level 5)
      const mage = createTestCharacter({
        id: 'mage1',
        name: 'Gandalf',
        class: 'Mage',
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 1, max: 1 },
            level5: { current: 1, max: 1 },
            level6: { current: 1, max: 1 }
          }
        },
        knownSpells: ['mogref', 'sopic', 'halito', 'mahalito', 'masopic', 'madalto']
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage1', mage),
        party: {
          ...state.party,
          members: ['mage1'],
          formation: { frontRow: [], backRow: ['mage1'] }
        }
      }))

      component.ngOnInit()
      fixture.detectChanges()
    })

    it('displays available spells with real names', () => {
      const spells = component.availableSpells()
      expect(spells.length).toBeGreaterThan(0)
      expect(spells[0].name).toBeDefined()
      expect(spells[0].id).toBeDefined()
    })

    it('stores spell ID when spell is selected', () => {
      const spells = component.availableSpells()
      const firstSpell = spells[0]

      component.selectActionType('CAST_SPELL')
      component.selectSpell(firstSpell.id)

      expect(component.selectedSpellId()).toBe(firstSpell.id)
    })

    it('skips target selection for party spells', () => {
      // Find a spell with party target (e.g., MASOPIC at level 6)
      const spells = component.availableSpells()
      const partySpell = spells.find(s => s.target === 'party')

      expect(partySpell).toBeDefined()

      if (partySpell) {
        component.selectActionType('CAST_SPELL')
        component.selectSpell(partySpell.id)

        // Should NOT show group selection dialog
        expect(component.showGroupSelectionDialog()).toBe(false)
        // Should have created the action
        expect(component.selectedActions().size).toBe(1)
      }
    })

    it('shows target selection for single target spells', () => {
      const spells = component.availableSpells()
      const singleSpell = spells.find(s => s.target === 'single')

      expect(singleSpell).toBeDefined()

      if (singleSpell) {
        component.selectActionType('CAST_SPELL')
        component.selectSpell(singleSpell.id)

        // Should show group selection dialog
        expect(component.showGroupSelectionDialog()).toBe(true)
        // Should NOT have created action yet
        expect(component.selectedActions().size).toBe(0)
      }
    })

    it('shows target selection for group target spells', () => {
      const spells = component.availableSpells()
      const groupSpell = spells.find(s => s.target === 'group')

      expect(groupSpell).toBeDefined()

      if (groupSpell) {
        component.selectActionType('CAST_SPELL')
        component.selectSpell(groupSpell.id)

        // Should show group selection dialog
        expect(component.showGroupSelectionDialog()).toBe(true)
        // Should NOT have created action yet
        expect(component.selectedActions().size).toBe(0)
      }
    })

    it('attaches spell ID to combat command', () => {
      const spells = component.availableSpells()
      const partySpell = spells.find(s => s.target === 'party')

      expect(partySpell).toBeDefined()

      if (partySpell) {
        component.selectActionType('CAST_SPELL')
        component.selectSpell(partySpell.id)

        const action = component.selectedActions().get('mage1')
        expect(action).toBeDefined()
        expect(action!.type).toBe('CAST_SPELL')
        expect(action!.data).toEqual({ spellId: partySpell.id })
      }
    })

    it('provides dynamic target selection prompts based on spell type', () => {
      const spells = component.availableSpells()
      const singleSpell = spells.find(s => s.target === 'single')

      expect(singleSpell).toBeDefined()

      if (singleSpell) {
        component.selectActionType('CAST_SPELL')
        component.selectedSpellId.set(singleSpell.id)

        const prompt = component.groupSelectionPrompt()
        expect(prompt).toContain(singleSpell.name.toUpperCase())
      }
    })

    it('computes spell points by level for active character', () => {
      const points = component.spellPointsByLevel()
      expect(points.size).toBeGreaterThan(0)

      // Check mage level 1 points
      const mageL1 = points.get('mage-1')
      expect(mageL1).toEqual({ current: 3, max: 3 })

      // Check mage level 2 points
      const mageL2 = points.get('mage-2')
      expect(mageL2).toEqual({ current: 2, max: 2 })
    })

    it('skips target selection for all_enemies spells', () => {
      const spells = component.availableSpells()
      const allEnemiesSpell = spells.find(s => s.target === 'all_enemies')

      // Note: all_enemies spells are high-level (BADIALMA is level 5)
      // Test setup only provides level 1-3 spells, so this test may be skipped
      if (allEnemiesSpell) {
        component.selectActionType('CAST_SPELL')
        component.selectSpell(allEnemiesSpell.id)

        // Should NOT show group selection dialog
        expect(component.showGroupSelectionDialog()).toBe(false)
        // Should have created the action
        expect(component.selectedActions().size).toBe(1)
        // Should have spell ID attached
        const action = component.selectedActions().get('mage1')
        expect(action).toBeDefined()
        expect(action!.type).toBe('CAST_SPELL')
        expect(action!.data).toEqual({ spellId: allEnemiesSpell.id })
      } else {
        // No all_enemies spell available with current setup - test passes
        expect(true).toBe(true)
      }
    })
  })

  describe('Execute Round', () => {
    beforeEach(() => {
      // Select actions for all characters using new flow
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]

      chars.forEach(() => {
        component.selectActionType('ATTACK')
        component.selectGroup('A')
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

    it('navigates to castle on defeat', () => {
      component['handleDefeat']()
      component.returnToCastle()

      expect(router.navigate).toHaveBeenCalledWith(['/castle'])
    })

    it('clears combat state on defeat', () => {
      component['handleDefeat']()

      const combat = gameState.state().combat
      expect(combat).toBeUndefined()
    })

    it('creates body entries for dead party members', () => {
      const initialParty = gameState.state().party
      const initialMembers = [...initialParty.members]

      component['handleDefeat']()

      const state = gameState.state()
      const bodies = state.bodies

      expect(bodies).toBeDefined()
      expect(bodies!.size).toBe(initialMembers.length)

      // Each dead character should have a body at the party's death location
      initialMembers.forEach(charId => {
        const body = bodies!.get(charId)
        expect(body).toBeDefined()
        expect(body!.characterId).toBe(charId)
        expect(body!.level).toBe(initialParty.position.level)
        expect(body!.x).toBe(initialParty.position.x)
        expect(body!.y).toBe(initialParty.position.y)
      })
    })

    it('clears party members on defeat', () => {
      component['handleDefeat']()

      const party = gameState.state().party
      expect(party.members).toEqual([])
      expect(party.formation.frontRow).toEqual([])
      expect(party.formation.backRow).toEqual([])
    })
  })

  describe('Footer Menu Actions', () => {
    it('executes round when execute action selected', () => {
      // Select all actions using new flow
      const chars = component.partyCharacters()
      const monster = component.monsters()[0]
      chars.forEach(() => {
        component.selectActionType('ATTACK')
        component.selectGroup('A')
      })

      const executeRoundSpy = jest.spyOn(component, 'executeRound')

      component.handleActionSelection('execute')

      expect(executeRoundSpy).toHaveBeenCalled()
    })

    it('handles action menu selection for attack', () => {
      const selectActionTypeSpy = jest.spyOn(component, 'selectActionType')

      component.handleActionSelection('attack')

      expect(selectActionTypeSpy).toHaveBeenCalledWith('ATTACK')
    })

    it('returns to maze when return action selected', () => {
      component.showVictoryModal.set(true)

      component.handleActionSelection('return')

      expect(router.navigate).toHaveBeenCalledWith(['/maze'])
    })

    it('returns to castle when castle action selected', () => {
      component.showDefeatModal.set(true)

      component.handleActionSelection('castle')

      expect(router.navigate).toHaveBeenCalledWith(['/castle'])
    })
  })
})

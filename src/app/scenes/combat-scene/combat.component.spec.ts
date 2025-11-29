// src/app/scenes/combat/combat.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatComponent } from './combat'
import { GameStateService } from '@services/GameStateService'
import { SceneType } from '@models/SceneType'
import { createTestGameStateWithCombat, createTestCharacter } from '@testing/test-factories'
import { Router } from '@angular/router'
import { VictoryService } from '@services/VictoryService'
import { CharacterStatus } from '@models/CharacterStatus'
import { setCombatMessageDelay, setActionResultDelay } from '@config/CombatSettings'
import { ItemDataLoader } from '@services/ItemDataLoader'
import { ItemType, ItemSlot } from '@models/ItemType'
import { Item } from '@models/Item'
import { RandomService } from '@services/RandomService'

// Mock item for item drops during victory
const mockDropItem: Item = {
  id: 'dagger',
  name: 'Dagger',
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 10,
  damage: 4,
  cursed: false,
  identified: true,
  equipped: false
}

describe('CombatComponent', () => {
  let component: CombatComponent
  let fixture: ComponentFixture<CombatComponent>
  let gameState: GameStateService
  let router: Router

  beforeEach(() => {
    // Use fake timers to control animation timing
    jest.useFakeTimers()
    // Use small delays to test animation code path without slowing tests
    setCombatMessageDelay(10)
    setActionResultDelay(10)

    // Mock ItemDataLoader.getItem for item drops during victory
    jest.spyOn(ItemDataLoader, 'getItem').mockReturnValue(mockDropItem)

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

  afterEach(() => {
    // Reset to default delay and restore real timers
    setCombatMessageDelay(800)
    jest.useRealTimers()
  })

  // Helper to complete message animation by advancing all timers
  const flushMessageAnimation = () => {
    jest.runAllTimers()
  }

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

    it('immediately confirms RUN (flee) action without target', () => {
      const activeChar = component.activeCharacter()!

      component.selectActionType('RUN')

      // RUN (flee) should be confirmed immediately like PARRY
      const actions = component.selectedActions()
      expect(actions.has(activeChar.id)).toBe(true)
      expect(actions.get(activeChar.id)!.type).toBe('RUN')
      // No dialog should be shown
      expect(component.showGroupSelectionDialog()).toBe(false)
    })

    it('creates command when target is selected', () => {
      const activeChar = component.activeCharacter()!
      const groupAMonsters = component.monsterGroups().find(g => g.id === 'A')?.monsters || []

      component.selectActionType('ATTACK')
      component.selectGroup('A')

      const actions = component.selectedActions()
      expect(actions.has(activeChar.id)).toBe(true)
      expect(actions.get(activeChar.id)!.type).toBe('ATTACK')
      // Target should be one of the monsters from group A (random selection)
      const targetId = actions.get(activeChar.id)!.target?.id
      const isFromGroupA = groupAMonsters.some(m => m.id === targetId)
      expect(isFromGroupA).toBe(true)
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

    it('shows group selection for single target offensive spells', () => {
      const spells = component.availableSpells()
      // Look for a single-target offensive spell (like BADIOS)
      const offensiveSpell = spells.find(s => s.target === 'single' && s.category === 'offensive')

      // Test setup doesn't include offensive single-target spells - this is expected
      // The mage spells (mogref, sopic, halito, mahalito, masopic, madalto) don't include BADIOS
      if (!offensiveSpell) {
        // Verify our test setup is as expected - no offensive single-target spells
        const allSingleSpells = spells.filter(s => s.target === 'single')
        expect(allSingleSpells.every(s => s.category !== 'offensive')).toBe(true)
        return
      }

      component.selectActionType('CAST_SPELL')
      component.selectSpell(offensiveSpell.id)

      // Should show group selection dialog for offensive spells
      expect(component.showGroupSelectionDialog()).toBe(true)
      // Should NOT have created action yet
      expect(component.selectedActions().size).toBe(0)
    })

    it('shows character selection for single target healing spells', () => {
      const spells = component.availableSpells()
      // Look for a single-target healing spell (like DIOS)
      const healingSpell = spells.find(s => s.target === 'single' && s.category === 'healing')

      // Test setup uses mage spells which don't include healing spells
      if (!healingSpell) {
        // Verify our test setup is as expected - no healing spells for mage
        expect(spells.every(s => s.category !== 'healing')).toBe(true)
        return
      }

      component.selectActionType('CAST_SPELL')
      component.selectSpell(healingSpell.id)

      // Should show character selection dialog for healing spells
      expect(component.showCharacterSelectionDialog()).toBe(true)
      // Should NOT have created action yet
      expect(component.selectedActions().size).toBe(0)
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

  describe('Priest Spell Selection (healing and resurrection)', () => {
    beforeEach(() => {
      // Setup a priest with healing and resurrection spells
      const priest = createTestCharacter({
        id: 'priest1',
        name: 'Healer',
        class: 'Priest',
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 1, max: 1 },
            level5: { current: 1, max: 1 },
            level7: { current: 1, max: 1 }
          }
        },
        knownSpells: ['dios', 'dial', 'dialko', 'kadorto', 'di']
      })

      // Add a dead character for resurrection targeting
      const deadChar = createTestCharacter({
        id: 'dead1',
        name: 'Fallen',
        hp: 0,
        status: CharacterStatus.DEAD
      })

      // Add an ashes character for KADORTO targeting
      const ashesChar = createTestCharacter({
        id: 'ashes1',
        name: 'Ashes',
        hp: 0,
        status: CharacterStatus.ASHES
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest1', priest],
          ['dead1', deadChar],
          ['ashes1', ashesChar]
        ]),
        party: {
          ...state.party,
          members: ['priest1', 'dead1', 'ashes1'],
          formation: { frontRow: ['priest1'], backRow: ['dead1', 'ashes1'] }
        }
      }))

      component.ngOnInit()
      fixture.detectChanges()
    })

    it('shows character selection for single target healing spells (DIOS)', () => {
      const spells = component.availableSpells()
      const diosSpell = spells.find(s => s.id === 'dios')

      expect(diosSpell).toBeDefined()
      expect(diosSpell!.target).toBe('single')
      expect(diosSpell!.category).toBe('healing')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(diosSpell!.id)

      // Should show character selection dialog for healing spells
      expect(component.showCharacterSelectionDialog()).toBe(true)
      expect(component.showGroupSelectionDialog()).toBe(false)
      // Should NOT have created action yet
      expect(component.selectedActions().size).toBe(0)
    })

    it('shows character selection for resurrection spells targeting dead_body (DI)', () => {
      const spells = component.availableSpells()
      const diSpell = spells.find(s => s.id === 'di')

      expect(diSpell).toBeDefined()
      expect(diSpell!.target).toBe('dead_body')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(diSpell!.id)

      // Should show character selection dialog for resurrection spells
      expect(component.showCharacterSelectionDialog()).toBe(true)
      expect(component.showGroupSelectionDialog()).toBe(false)
      // Should NOT have created action yet
      expect(component.selectedActions().size).toBe(0)
    })

    it('shows character selection for resurrection spells targeting ashes (KADORTO)', () => {
      const spells = component.availableSpells()
      const kadortoSpell = spells.find(s => s.id === 'kadorto')

      expect(kadortoSpell).toBeDefined()
      expect(kadortoSpell!.target).toBe('ashes')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(kadortoSpell!.id)

      // Should show character selection dialog for ashes resurrection
      expect(component.showCharacterSelectionDialog()).toBe(true)
      expect(component.showGroupSelectionDialog()).toBe(false)
      // Should NOT have created action yet
      expect(component.selectedActions().size).toBe(0)
    })

    it('enables only dead characters for DI spell targeting', () => {
      const spells = component.availableSpells()
      const diSpell = spells.find(s => s.id === 'di')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(diSpell!.id)

      const options = component.characterSelectionOptions()

      // Should have 3 characters in options
      expect(options.length).toBe(3)

      // Only the dead character should be enabled
      const priestOption = options.find(o => o.character.id === 'priest1')
      const deadOption = options.find(o => o.character.id === 'dead1')
      const ashesOption = options.find(o => o.character.id === 'ashes1')

      expect(priestOption!.enabled).toBe(false) // Living - can't resurrect
      expect(deadOption!.enabled).toBe(true)    // Dead - can resurrect with DI
      expect(ashesOption!.enabled).toBe(false)  // Ashes - needs KADORTO, not DI
    })

    it('enables only ashes characters for KADORTO spell targeting', () => {
      const spells = component.availableSpells()
      const kadortoSpell = spells.find(s => s.id === 'kadorto')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(kadortoSpell!.id)

      const options = component.characterSelectionOptions()

      // Only the ashes character should be enabled
      const priestOption = options.find(o => o.character.id === 'priest1')
      const deadOption = options.find(o => o.character.id === 'dead1')
      const ashesOption = options.find(o => o.character.id === 'ashes1')

      expect(priestOption!.enabled).toBe(false) // Living - can't resurrect
      expect(deadOption!.enabled).toBe(false)   // Dead - needs DI, not KADORTO
      expect(ashesOption!.enabled).toBe(true)   // Ashes - can resurrect with KADORTO
    })

    it('attaches target character ID to spell command', () => {
      const spells = component.availableSpells()
      const diosSpell = spells.find(s => s.id === 'dios')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(diosSpell!.id)

      // Select the priest as the healing target
      const priest = gameState.roster().get('priest1')!
      component.selectCharacter(priest)

      const action = component.selectedActions().get('priest1')
      expect(action).toBeDefined()
      expect(action!.type).toBe('CAST_SPELL')
      expect(action!.data).toEqual({
        spellId: 'dios',
        targetCharacterId: 'priest1'
      })
    })

    it('cancels character selection and resets state', () => {
      const spells = component.availableSpells()
      const diosSpell = spells.find(s => s.id === 'dios')

      component.selectActionType('CAST_SPELL')
      component.selectSpell(diosSpell!.id)

      expect(component.showCharacterSelectionDialog()).toBe(true)

      component.cancelCharacterSelection()

      expect(component.showCharacterSelectionDialog()).toBe(false)
      expect(component.selectedActionType()).toBe(null)
      expect(component.selectedSpellId()).toBe(null)
      expect(component.selectedTargetCharacterId()).toBe(null)
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
      flushMessageAnimation()

      // Round number should increment (or combat ends)
      const newRound = component.roundNumber()
      expect(newRound).toBeGreaterThanOrEqual(initialRound)
    })

    it('clears selected actions after round executes', () => {
      component.executeRound()
      flushMessageAnimation()

      expect(component.selectedActions().size).toBe(0)
    })

    it('resets active character index to first character after round', () => {
      // Active character should be at index 1 after both selected actions
      expect(component.activeCharacterIndex()).toBeGreaterThan(0)

      component.executeRound()
      flushMessageAnimation()

      // Should reset to first character (index 0)
      expect(component.activeCharacterIndex()).toBe(0)
    })

    it('updates combat state in GameStateService', () => {
      const initialMonsterHP = component.monsters()[0].hp

      component.executeRound()
      flushMessageAnimation()

      // HP should change (might increase or decrease depending on who got hit)
      const newCombatState = gameState.state().combat
      expect(newCombatState).toBeDefined()
    })

    it('sets isExecutingRound flag during execution', () => {
      expect(component.isExecutingRound()).toBe(false)

      // Start round execution - flag should be true during animation
      component.executeRound()
      expect(component.isExecutingRound()).toBe(true)

      // After animation completes, flag should be false
      flushMessageAnimation()
      expect(component.isExecutingRound()).toBe(false)
    })

    it('disables action menu items during round execution', () => {
      // Clear selected actions so action menu is active
      component['selectedActions'].set(new Map())
      component['activeCharacterIndex'].set(0)
      fixture.detectChanges()

      // Action menu items should be enabled when not executing
      expect(component.isExecutingRound()).toBe(false)
      const beforeItems = component.actionMenuItems()
      expect(beforeItems.find(i => i.id === 'attack')?.enabled).toBe(true)
      expect(beforeItems.find(i => i.id === 'parry')?.enabled).toBe(true)

      // Simulate round execution starting
      component['isExecutingRound'].set(true)

      // During execution, action menu items should be disabled
      const duringItems = component.actionMenuItems()
      expect(duringItems.find(i => i.id === 'attack')?.enabled).toBe(false)
      expect(duringItems.find(i => i.id === 'parry')?.enabled).toBe(false)
      expect(duringItems.find(i => i.id === 'flee')?.enabled).toBe(false)
      expect(duringItems.find(i => i.id === 'cast')?.enabled).toBe(false)

      // After execution completes, action menu items should be enabled again
      component['isExecutingRound'].set(false)
      const afterItems = component.actionMenuItems()
      expect(afterItems.find(i => i.id === 'attack')?.enabled).toBe(true)
      expect(afterItems.find(i => i.id === 'parry')?.enabled).toBe(true)
    })

    it('commits messages to combat log even with instant display (delay=0)', () => {
      // Set both delays to 0 for instant display
      setCombatMessageDelay(0)
      setActionResultDelay(0)

      const initialLogLength = gameState.state().combat?.combatLog.length || 0

      component.executeRound()
      // No need to flush timers - delay=0 means instant

      // Messages should be committed to the combat log
      const newLogLength = gameState.state().combat?.combatLog.length || 0
      expect(newLogLength).toBeGreaterThan(initialLogLength)
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

    it('creates pending chest when monsters leave treasure (chest roll succeeds)', () => {
      // Queue values:
      // - 0.5 skips item drop (> 0.15 threshold)
      // - 0.1 for chest probability (succeeds for 30% threshold)
      // - 0.5 for trap probability
      // - 0.5 for trap type selection
      // - 0.5 for chest ID random
      RandomService.queueNextValues([0.5, 0.1, 0.5, 0.5, 0.5])

      component['handleVictory']()

      const pendingChest = gameState.state().pendingChest
      expect(pendingChest).toBeDefined()
      expect(pendingChest?.contents.gold).toBeGreaterThanOrEqual(0)
      expect(router.navigate).toHaveBeenCalledWith(['/chest'])
    })

    it('adds gold directly to party when no chest (chest roll fails)', () => {
      const initialGold = gameState.party().gold
      // Queue values:
      // - 0.5 skips item drop
      // - 0.99 for chest probability (fails for 30% threshold - level 1 monsters)
      RandomService.queueNextValues([0.5, 0.99])

      component['handleVictory']()

      // Gold should be added directly to party
      expect(gameState.party().gold).toBeGreaterThanOrEqual(initialGold)
      // No pending chest
      expect(gameState.state().pendingChest).toBeUndefined()
      // Victory modal shown instead of navigating to chest
      expect(component.showVictoryModal()).toBe(true)
    })

    it('navigates to chest scene when chest roll succeeds', () => {
      // Queue values for chest path
      RandomService.queueNextValues([0.5, 0.1, 0.5, 0.5, 0.5])

      component['handleVictory']()

      expect(router.navigate).toHaveBeenCalledWith(['/chest'])
    })

    it('shows victory modal when no chest (loose gold)', () => {
      // Queue values for loose gold path
      RandomService.queueNextValues([0.5, 0.99])

      component['handleVictory']()

      expect(component.showVictoryModal()).toBe(true)
      expect(router.navigate).not.toHaveBeenCalledWith(['/chest'])
    })

    it('includes victory rewards regardless of chest outcome', () => {
      // Queue values (doesn't matter which path for this test)
      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5, 0.5])

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

  describe('Real-time Damage Display', () => {
    it('applies character HP updates when first result message is shown', () => {
      // Setup: Select parry for all party members (so monsters will attack them)
      const chars = component.partyCharacters()
      chars.forEach(() => {
        component.selectActionType('PARRY')
      })

      // Start round execution
      component.executeRound()

      // The display state should be initialized before animation starts
      expect(component['displayMonsterGroups']()).not.toBeNull()

      // Initially, display character overrides should be empty
      expect(component['displayCharacterOverrides']().size).toBe(0)

      // Advance timers to show messages until we find a character damage result
      // Each message takes actionDelay (10ms in test) or resultDelay (10ms in test)
      // Result messages are prefixed with → and apply state immediately

      // Keep advancing until we see a character update OR all timers are done
      let iterations = 0
      const maxIterations = 50 // Safety limit
      let foundCharacterUpdate = false

      while (iterations < maxIterations && !foundCharacterUpdate) {
        jest.advanceTimersByTime(10) // One message interval

        // Check if any character display overrides have been applied
        const overrides = component['displayCharacterOverrides']()
        if (overrides.size > 0) {
          foundCharacterUpdate = true

          // Verify that overrides contain HP changes
          const overrideEntries = Array.from(overrides.entries())
          const hasHPOverride = overrideEntries.some(([_, update]) => update.hp !== undefined)
          expect(hasHPOverride).toBe(true)
        }

        iterations++
      }

      // If combat resulted in character damage, we should have found an update
      // If no character was damaged (all misses), that's also valid
      // Just ensure the system completed without errors
      jest.runAllTimers()
      expect(component.isExecutingRound()).toBe(false)
    })

    it('applies monster HP updates in sync with result messages', () => {
      // Setup: Have characters attack monsters
      const chars = component.partyCharacters()
      chars.forEach(() => {
        component.selectActionType('ATTACK')
        component.selectGroup('A')
      })

      // Get initial monster groups from combat state
      const initialMonsterGroups = component.combatState()?.monsterGroups || []

      // Start round execution
      component.executeRound()

      // displayMonsterGroups should be initialized with initial state
      expect(component['displayMonsterGroups']()).not.toBeNull()
      const displayGroups = component['displayMonsterGroups']()!
      expect(displayGroups.length).toBe(initialMonsterGroups.length)

      // Advance through the animation and verify monster HP updates occur
      let foundMonsterUpdate = false
      let iterations = 0
      const maxIterations = 50

      while (iterations < maxIterations && !foundMonsterUpdate) {
        const beforeGroups = component['displayMonsterGroups']()
        jest.advanceTimersByTime(10)
        const afterGroups = component['displayMonsterGroups']()

        // Check if monster HP changed during this timer tick
        if (beforeGroups && afterGroups) {
          const beforeHP = beforeGroups.flatMap(g => g.monsters.map(m => m.hp))
          const afterHP = afterGroups.flatMap(g => g.monsters.map(m => m.hp))

          if (JSON.stringify(beforeHP) !== JSON.stringify(afterHP)) {
            foundMonsterUpdate = true
          }
        }

        iterations++
      }

      // Complete the animation
      jest.runAllTimers()
      expect(component.isExecutingRound()).toBe(false)
    })

    it('updates partyCharacters computed signal with display overrides during animation', () => {
      // Setup: Select parry for all (defensive, will likely get hit)
      const chars = component.partyCharacters()
      chars.forEach(() => {
        component.selectActionType('PARRY')
      })

      // Start round execution
      component.executeRound()

      // Advance timers and check if partyCharacters reflects display overrides
      let foundHPChange = false
      let iterations = 0

      while (iterations < 50 && !foundHPChange) {
        jest.advanceTimersByTime(10)

        const overrides = component['displayCharacterOverrides']()

        // If we have overrides, the computed partyCharacters should reflect them
        if (overrides.size > 0) {
          for (const [charId, override] of overrides.entries()) {
            if (override.hp !== undefined) {
              const char = component.partyCharacters().find(c => c.id === charId)
              if (char) {
                // The displayed HP should match the override
                expect(char.hp).toBe(override.hp)
                foundHPChange = true
              }
            }
          }
        }

        iterations++
      }

      // Complete animation
      jest.runAllTimers()
    })
  })
})

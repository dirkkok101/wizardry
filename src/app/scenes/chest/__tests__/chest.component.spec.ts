import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ChestComponent } from '../chest.component'
import { GameStateService } from '@services/GameStateService'
import { SceneNavigationService } from '@services/SceneNavigationService'
import { MessageService } from '@services/MessageService'
import { RandomService } from '@services/RandomService'
import { TrapService } from '@services/TrapService'
import { SceneType } from '@models/SceneType'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { TrapId } from '@models/Trap'
import { Chest, RewardTier } from '@models/Chest'
import { createTestCharacter } from '@testing/test-factories'

describe('ChestComponent', () => {
  let component: ChestComponent
  let fixture: ComponentFixture<ChestComponent>
  let gameState: GameStateService
  let navigationService: SceneNavigationService
  let messageService: MessageService

  const mockThief: Character = {
    ...createTestCharacter({
      id: 'thief-1',
      name: 'Sneaky',
      class: CharacterClass.THIEF,
      agility: 16,
      level: 5
    })
  }

  const mockFighter: Character = {
    ...createTestCharacter({
      id: 'fighter-1',
      name: 'Tank',
      class: CharacterClass.FIGHTER,
      agility: 10,
      level: 5
    })
  }

  const mockPriest: Character = {
    ...createTestCharacter({
      id: 'priest-1',
      name: 'Healer',
      class: CharacterClass.PRIEST,
      agility: 12,
      level: 3,
      knownSpells: ['calfo'],
      spellPoints: {
        priest: {
          level1: { current: 3, max: 3 },
          level2: { current: 2, max: 2 }
        }
      }
    })
  }

  // Standard test chest - trapped with POISON NEEDLE
  const testChest: Chest = {
    id: 'test-chest-1',
    trapped: true,
    trapId: 'POISON_NEEDLE',
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 3 as RewardTier,
    contents: {
      gold: 250,
      items: []
    },
    sourcePosition: { x: 5, y: 5, facing: 'NORTH' },
    mazeLevel: 1,
    source: 'combat_victory'
  }

  beforeEach(() => {
    // Reset random service before each test
    RandomService.resetSeed()

    TestBed.configureTestingModule({
      imports: [ChestComponent]
    })

    fixture = TestBed.createComponent(ChestComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    navigationService = TestBed.inject(SceneNavigationService)
    messageService = TestBed.inject(MessageService)

    jest.spyOn(navigationService, 'navigateTo').mockImplementation(() => Promise.resolve(true))

    // Setup party with characters
    gameState.updateState(state => ({
      ...state,
      roster: new Map([
        ['thief-1', mockThief],
        ['fighter-1', mockFighter],
        ['priest-1', mockPriest]
      ]),
      party: {
        ...state.party,
        members: ['thief-1', 'fighter-1', 'priest-1'],
        gold: 500
      },
      dungeon: {
        currentLevel: 1,
        position: { x: 5, y: 5, facing: 'NORTH' },
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        visitedTiles: new Set(),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set()
      },
      // Provide a predictable test chest
      pendingChest: { ...testChest }
    }))
  })

  describe('initialization', () => {
    it('updates scene to CHEST on init', () => {
      component.ngOnInit()
      expect(gameState.currentScene()).toBe(SceneType.CHEST)
    })

    it('starts in CHARACTER_SELECT mode', () => {
      component.ngOnInit()
      expect(component.mode()).toBe('CHARACTER_SELECT')
    })

    it('generates a chest on initialization', () => {
      component.ngOnInit()
      expect(component.chest()).not.toBeNull()
    })

    it('shows available characters for selection', () => {
      component.ngOnInit()
      const available = component.availableCharacters()
      expect(available.length).toBe(3)
    })
  })

  describe('character selection', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('selects character by index', () => {
      component.selectCharacter(0) // Select thief
      expect(component.selectedOpener()?.id).toBe('thief-1')
    })

    it('transitions to ACTION_SELECT mode after selection', () => {
      component.selectCharacter(0)
      expect(component.mode()).toBe('ACTION_SELECT')
    })

    it('does not select invalid index', () => {
      component.selectCharacter(10)
      expect(component.selectedOpener()).toBeNull()
    })
  })

  describe('recommended handler', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('recommends thief for trap handling', () => {
      const recommended = component.recommendedHandler()
      expect(recommended?.character.class).toBe(CharacterClass.THIEF)
    })

    it('provides inspect and disarm chances', () => {
      const recommended = component.recommendedHandler()
      expect(recommended?.inspectChance).toBeGreaterThan(50) // Thief with AGI 16 = 96% capped to 95%
      expect(recommended?.disarmChance).toBeGreaterThan(0)
    })
  })

  describe('footer menu items', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('shows hint in CHARACTER_SELECT mode', () => {
      const items = component.footerMenuItems()
      expect(items.length).toBe(1)
      expect(items[0].label).toContain('Select character')
    })

    it('shows action menu in ACTION_SELECT mode', () => {
      component.selectCharacter(0)
      const items = component.footerMenuItems()

      expect(items.some(i => i.id === 'open')).toBe(true)
      expect(items.some(i => i.id === 'inspect')).toBe(true)
      expect(items.some(i => i.id === 'leave')).toBe(true)
    })

    it('shows CALFO option when priest is available', () => {
      component.selectCharacter(0)
      const items = component.footerMenuItems()
      expect(items.some(i => i.id === 'calfo')).toBe(true)
    })

    it('shows disarm option when trap is identified', () => {
      component.selectCharacter(0)

      // Set chest to have identified trap
      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'POISON_NEEDLE',
        trapIdentified: true
      } : c)

      const items = component.footerMenuItems()
      expect(items.some(i => i.id === 'disarm')).toBe(true)
    })
  })

  describe('inspect action', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.selectCharacter(0) // Select thief
    })

    it('identifies trap on successful inspection', () => {
      // Queue success roll for inspection (< 95% = success)
      RandomService.queueNextValues([0.5, 0.3]) // inspection success, no critical fail

      component.handleFooterAction('inspect')

      // Trap should be identified
      expect(component.chest()?.trapIdentified).toBe(true)
    })

    it('transitions to TRAP_DISPLAY with scrambled letters on success', () => {
      RandomService.queueNextValues([0.5, 0.3])

      // Set a specific trap type
      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'POISON_NEEDLE'
      } : c)

      component.handleFooterAction('inspect')

      // Should transition to TRAP_DISPLAY with scrambled state
      expect(component.mode()).toBe('TRAP_DISPLAY')
      expect(component.scrambledTrapState()).not.toBeNull()
      expect(component.scrambledTrapState()?.actualTrapId).toBe('POISON_NEEDLE')
      expect(component.lastActionMessage()).toContain('detects something')
    })
  })

  describe('CALFO action', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.selectCharacter(0)
    })

    it('transitions to CASTER_SELECT when multiple casters available', () => {
      // Add another priest
      const priest2 = createTestCharacter({
        id: 'priest-2',
        name: 'Helper',
        class: CharacterClass.PRIEST,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level2: { current: 1, max: 1 }
          }
        }
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('priest-2', priest2),
        party: {
          ...state.party,
          members: [...state.party.members, 'priest-2']
        }
      }))

      component.handleFooterAction('calfo')
      expect(component.mode()).toBe('CASTER_SELECT')
    })

    it('auto-casts when only one caster available', () => {
      RandomService.queueNextValues([0.5]) // Success roll

      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'GAS_BOMB'
      } : c)

      component.handleFooterAction('calfo')

      // Should not be in CASTER_SELECT since only one caster
      expect(component.mode()).not.toBe('CASTER_SELECT')
      expect(component.chest()?.trapIdentified).toBe(true)
    })

    it('consumes spell point on cast', () => {
      RandomService.queueNextValues([0.5])

      const initialSP = gameState.state().roster.get('priest-1')?.spellPoints?.priest?.level2?.current

      component.handleFooterAction('calfo')

      const finalSP = gameState.state().roster.get('priest-1')?.spellPoints?.priest?.level2?.current
      expect(finalSP).toBe((initialSP || 0) - 1)
    })
  })

  describe('disarm action', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.selectCharacter(0) // Select thief

      // Set identified trap
      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'POISON_NEEDLE',
        trapIdentified: true
      } : c)
    })

    it('transitions to TRAP_NAME_INPUT mode', () => {
      component.handleFooterAction('disarm')
      expect(component.mode()).toBe('TRAP_NAME_INPUT')
    })

    it('accepts correct trap name', () => {
      RandomService.queueNextValues([0.5]) // Success roll for disarm

      component.handleFooterAction('disarm')
      component.trapNameInput.set('POISON NEEDLE')

      // Submit trap name via footer menu action (ENTER is handled by menu, not keyboard handler)
      component.handleFooterAction('submit-disarm')

      expect(component.chest()?.trapDisarmed).toBe(true)
    })

    it('stays in TRAP_NAME_INPUT mode after failed disarm without trigger', () => {
      // Queue: fail disarm (0.99 > any reasonable chance), pass AGI save (0.01 < AGI)
      RandomService.queueNextValues([0.99, 0.01])

      component.handleFooterAction('disarm')
      component.trapNameInput.set('POISON NEEDLE')

      // Submit trap name via footer menu action (ENTER is handled by menu, not keyboard handler)
      component.handleFooterAction('submit-disarm')

      // Should stay in TRAP_NAME_INPUT for retry
      expect(component.mode()).toBe('TRAP_NAME_INPUT')
      expect(component.trapNameInput()).toBe('')  // Input cleared for retry
      expect(component.lastActionMessage()).toContain('could not disarm')
      expect(component.chest()?.trapDisarmed).toBe(false)  // Trap still armed
    })
  })

  describe('open action', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.selectCharacter(0)
    })

    it('distributes treasure when chest is not trapped', () => {
      component.chest.update(c => c ? {
        ...c,
        trapped: false,
        contents: { gold: 100, items: [] }
      } : c)

      component.handleFooterAction('open')

      expect(component.mode()).toBe('RESULT_DISPLAY')
      expect(component.lastActionMessage()).toContain('100 gold')
    })

    it('triggers trap when opening trapped chest', () => {
      // Queue damage roll for trap effect
      RandomService.queueNextValues([0.5])

      // Verify initial chest state and update it
      const initialChest = component.chest()
      expect(initialChest).not.toBeNull()

      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'POISON_NEEDLE',
        trapDisarmed: false,
        contents: { gold: 50, items: [] }  // Simplify contents
      } : c)

      // Verify update took effect
      expect(component.chest()?.trapped).toBe(true)
      expect(component.chest()?.trapId).toBe('POISON_NEEDLE')

      component.handleFooterAction('open')

      // After trap triggers, damage is applied, then treasure is distributed
      // The message will contain both trap effect AND treasure result
      // POISON_NEEDLE deals 1d6 damage and applies poison status
      const message = component.lastActionMessage()
      expect(message.length).toBeGreaterThan(0)

      // After trap, treasure is still distributed (original Wizardry behavior)
      // Final message shows treasure results
      expect(message.toLowerCase()).toContain('gold')
    })

    it('shows inventory warning when items may be lost', () => {
      // Need to re-initialize with full inventory character
      const fullInventoryThief = {
        ...mockThief,
        inventory: Array(8).fill({
          id: 'item-placeholder',
          name: 'Item',
          type: 'MISC',
          slot: 'NONE',
          price: 10,
          cursed: false,
          identified: true,
          equipped: false
        })
      }

      // Update roster before selecting character
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('thief-1', fullInventoryThief)
      }))

      // Re-select character to get updated state
      component.selectCharacter(0)

      component.chest.update(c => c ? {
        ...c,
        trapped: false,
        contents: {
          gold: 100,
          items: [{
            id: 'treasure-1',
            name: 'Treasure Item',
            type: 'MISC',
            slot: 'NONE',
            price: 100,
            cursed: false,
            identified: false,
            equipped: false
          }]
        }
      } : c)

      // Queue random to select thief (index 0) as item recipient
      RandomService.queueNextValues([0.0])

      component.handleFooterAction('open')

      expect(component.mode()).toBe('INVENTORY_WARNING')
    })
  })

  describe('leave action', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.selectCharacter(0)
    })

    it('navigates to maze immediately when leaving (no confirmation)', () => {
      component.handleFooterAction('leave')
      expect(navigationService.navigateTo).toHaveBeenCalledWith('maze')
    })
  })

  describe('keyboard handling', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('selects character with number key in CHARACTER_SELECT mode', () => {
      const event = new KeyboardEvent('keydown', { key: '1' })
      component.handleKeyboard(event)

      expect(component.selectedOpener()).not.toBeNull()
      expect(component.mode()).toBe('ACTION_SELECT')
    })

    it('handles ESC key to leave immediately (no confirmation)', () => {
      component.selectCharacter(0)

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      component.handleKeyboard(event)

      // ESC calls handleCancel which calls handleLeave, navigating directly
      expect(navigationService.navigateTo).toHaveBeenCalledWith('maze')
    })

    it('handles action shortcuts in ACTION_SELECT mode', () => {
      component.selectCharacter(0)

      const event = new KeyboardEvent('keydown', { key: 'I' })
      component.handleKeyboard(event)

      // Should trigger inspect
      expect(component.lastActionMessage()).not.toBe('')
    })

    it('handles trap name input', () => {
      component.selectCharacter(0)
      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'GAS_BOMB',
        trapIdentified: true
      } : c)

      component.handleFooterAction('disarm')

      // Type trap name
      'GAS BOMB'.split('').forEach(char => {
        const event = new KeyboardEvent('keydown', { key: char })
        component.handleKeyboard(event)
      })

      expect(component.trapNameInput()).toBe('GAS BOMB')
    })

    it('handles backspace in TRAP_NAME_INPUT mode', () => {
      component.selectCharacter(0)
      component.mode.set('TRAP_NAME_INPUT')
      component.trapNameInput.set('GAS')

      const event = new KeyboardEvent('keydown', { key: 'Backspace' })
      component.handleKeyboard(event)

      expect(component.trapNameInput()).toBe('GA')
    })
  })

  describe('trap status display', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.selectCharacter(0)
    })

    it('shows unknown status for unidentified trap', () => {
      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapIdentified: false
      } : c)

      expect(component.getTrapStatusText()).toContain('Unknown')
    })

    it('shows trap detected without revealing trap type', () => {
      component.chest.update(c => c ? {
        ...c,
        trapped: true,
        trapId: 'EXPLODING_BOX',
        trapIdentified: true
      } : c)

      // Should NOT reveal trap name - player must guess from scrambled letters
      expect(component.getTrapStatusText()).toBe('Trap detected!')
      expect(component.getTrapStatusText()).not.toContain('EXPLODING')
    })

    it('shows safe message when trap is disarmed', () => {
      component.chest.update(c => c ? {
        ...c,
        trapDisarmed: true
      } : c)

      expect(component.getTrapStatusText()).toContain('safe')
    })
  })

  describe('calfo eligible casters', () => {
    it('returns casters who can cast CALFO', () => {
      component.ngOnInit()

      const casters = component.calfoEligibleCasters()
      expect(casters.length).toBe(1)
      expect(casters[0].name).toBe('Healer')
    })

    it('excludes casters without spell points', () => {
      // Remove priest's spell points
      const nospPriest = {
        ...mockPriest,
        spellPoints: {
          priest: {
            level1: { current: 1, max: 1 },
            level2: { current: 0, max: 0 }
          }
        }
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('priest-1', nospPriest)
      }))

      component.ngOnInit()

      const casters = component.calfoEligibleCasters()
      expect(casters.length).toBe(0)
    })
  })

  describe('triggerTrap', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('sets lastActionMessage when trap triggers', () => {
      const opener = component.availableCharacters()[0]
      component.selectedOpener.set(opener)
      component.chest.set({
        id: 'test-chest',
        trapped: true,
        trapId: 'POISON_NEEDLE',
        trapIdentified: false,
        trapDisarmed: false,
        rewardTier: 1 as any,
        contents: { gold: 50, items: [] },
        sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
        mazeLevel: 1,
        source: 'combat_victory'
      })

      component['triggerTrap'](component.chest()!, opener)

      expect(component.lastActionMessage()).toBeDefined()
      expect(component.lastActionMessage().length).toBeGreaterThan(0)
    })
  })

  describe('distributeTreasure', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('sets lastActionMessage after distribution', () => {
      // Setup opener and chest
      const opener = component.availableCharacters()[0]
      component.selectedOpener.set(opener)
      component.chest.set({
        id: 'test-chest',
        trapped: false,
        trapId: null,
        trapIdentified: true,
        trapDisarmed: false,
        rewardTier: 1 as any,
        contents: { gold: 100, items: [] },
        sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
        mazeLevel: 1,
        source: 'combat_victory'
      })

      component['distributeTreasure'](component.chest()!, opener)

      expect(component.lastActionMessage()).toBeDefined()
      expect(component.lastActionMessage()).toContain('100 gold')
      expect(component.mode()).toBe('RESULT_DISPLAY')
    })
  })

  describe('handleLeave', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('navigates to maze and clears pendingChest when leaving', () => {
      // Setup a pending chest
      gameState.updateState(s => ({
        ...s,
        pendingChest: {
          id: 'test-chest',
          trapped: false,
          trapId: null,
          trapIdentified: false,
          trapDisarmed: false,
          rewardTier: 1 as any,
          contents: { gold: 50, items: [] },
          sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
          mazeLevel: 1,
          source: 'combat_victory'
        }
      }))
      component.mode.set('ACTION_SELECT')

      component['handleLeave']()

      expect(navigationService.navigateTo).toHaveBeenCalledWith('maze')
      expect(gameState.state().pendingChest).toBeUndefined()
    })
  })

  describe('handleContinue', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('navigates to maze from RESULT_DISPLAY and clears pendingChest', () => {
      // Setup a pending chest
      gameState.updateState(s => ({
        ...s,
        pendingChest: {
          id: 'test',
          trapped: false,
          trapId: null,
          trapIdentified: true,
          trapDisarmed: false,
          rewardTier: 1 as any,
          contents: { gold: 50, items: [] },
          sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
          mazeLevel: 1,
          source: 'combat_victory'
        }
      }))
      component.mode.set('RESULT_DISPLAY')

      component['handleContinue']()

      expect(navigationService.navigateTo).toHaveBeenCalledWith('maze')
      expect(gameState.state().pendingChest).toBeUndefined()
    })

    it('returns to ACTION_SELECT from TRAP_DISPLAY', () => {
      component.mode.set('TRAP_DISPLAY')

      component['handleContinue']()

      expect(component.mode()).toBe('ACTION_SELECT')
      expect(navigationService.navigateTo).not.toHaveBeenCalled()
    })
  })
})

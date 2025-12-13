import { TestBed } from '@angular/core/testing'
import { MazeStateMachine, MazePhase, LetterboxType } from '../MazeStateMachine'
import { CharacterStatus } from '@models/CharacterStatus'
import { Character } from '@models/Character'
import { Chest, RewardTier } from '@models/Chest'

describe('MazeStateMachine', () => {
  let stateMachine: MazeStateMachine

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MazeStateMachine]
    })
    stateMachine = TestBed.inject(MazeStateMachine)
  })

  const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
    id: 'test-char-1',
    name: 'Test Fighter',
    race: 'human',
    class: 'fighter',
    alignment: 'good',
    level: 1,
    xp: 0,
    xpToLevel: 1000,
    hp: 10,
    maxHp: 10,
    ac: 10,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality: 12,
    agility: 12,
    luck: 10,
    status: CharacterStatus.OK,
    gold: 100,
    age: 20,
    ageWeeks: 0,
    inventory: [],
    spellbook: { mage: [], priest: [] },
    spellPoints: {
      mage: { current: [0, 0, 0, 0, 0, 0, 0], max: [0, 0, 0, 0, 0, 0, 0] },
      priest: { current: [0, 0, 0, 0, 0, 0, 0], max: [0, 0, 0, 0, 0, 0, 0] }
    },
    inParty: false,
    identifiedItems: new Set(),
    location: 'castle',
    ...overrides
  })

  const createTestChest = (overrides: Partial<Chest> = {}): Chest => ({
    id: 'test-chest-1',
    trapped: true,
    trapId: 'poison_needle',
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 12 as RewardTier,
    contents: {
      gold: 100,
      items: []
    },
    sourcePosition: { x: 5, y: 5, facing: 'NORTH' },
    mazeLevel: 1,
    source: 'combat_victory',
    ...overrides
  })

  describe('initial state', () => {
    it('starts in exploration phase', () => {
      const state = stateMachine.state()
      expect(state.type).toBe('exploration')
    })

    it('has elevator dialog hidden by default', () => {
      expect(stateMachine.showElevatorDialog()).toBe(false)
    })

    it('reports isExploring as true', () => {
      expect(stateMachine.isExploring()).toBe(true)
    })

    it('reports isInCombat as false', () => {
      expect(stateMachine.isInCombat()).toBe(false)
    })
  })

  describe('exploration transitions', () => {
    it('shows elevator dialog with destinations', () => {
      const destinations = [
        { type: 'level' as const, level: 2 },
        { type: 'level' as const, level: 3 }
      ]

      stateMachine.showElevator(destinations)

      const state = stateMachine.state()
      expect(state.type).toBe('exploration')
      if (state.type === 'exploration') {
        expect(state.showElevatorDialog).toBe(true)
        expect(state.elevatorDestinations).toEqual(destinations)
      }
    })

    it('dismisses elevator dialog', () => {
      stateMachine.showElevator([{ type: 'level', level: 2 }])
      stateMachine.dismissElevator()

      expect(stateMachine.showElevatorDialog()).toBe(false)
    })

    it('resets to exploration', () => {
      stateMachine.showElevator([{ type: 'level', level: 2 }])
      stateMachine.toExploration()

      const state = stateMachine.state()
      expect(state.type).toBe('exploration')
      if (state.type === 'exploration') {
        expect(state.showElevatorDialog).toBe(false)
      }
    })
  })

  describe('tile message transitions', () => {
    it('shows tile message with default options', () => {
      stateMachine.showTileMessage('Welcome to the dungeon')

      const state = stateMachine.state()
      expect(state.type).toBe('tile_message')
      if (state.type === 'tile_message') {
        expect(state.message).toBe('Welcome to the dungeon')
        expect(state.style).toBe('letterbox')
        expect(state.autoDismiss).toBe(false)
      }
    })

    it('shows tile message with custom options', () => {
      const item = { name: 'Key', icon: '🔑' }
      stateMachine.showTileMessage('You found a key!', 'letterbox', {
        autoDismiss: true,
        autoDismissDelay: 3000,
        item
      })

      const state = stateMachine.state()
      expect(state.type).toBe('tile_message')
      if (state.type === 'tile_message') {
        expect(state.autoDismiss).toBe(true)
        expect(state.autoDismissDelay).toBe(3000)
        expect(state.item).toEqual(item)
      }
    })

    it('dismisses tile message and returns pending encounter', () => {
      const pendingEncounter = { monsterId: 'goblin', count: 3 }
      stateMachine.showTileMessage('Danger ahead!', 'letterbox', {
        pendingEncounter: pendingEncounter as any
      })

      const result = stateMachine.dismissTileMessage()

      expect(result.pendingEncounter).toEqual(pendingEncounter)
      expect(stateMachine.isExploring()).toBe(true)
    })

    it('executes callback on dismiss', () => {
      const callback = jest.fn()
      stateMachine.showTileMessage('Press to continue', 'letterbox', {
        onDismiss: callback
      })

      const result = stateMachine.dismissTileMessage()

      expect(result.callback).toBe(callback)
    })

    it('returns null values when dismissing non-message state', () => {
      const result = stateMachine.dismissTileMessage()

      expect(result.pendingEncounter).toBeNull()
      expect(result.callback).toBeNull()
    })
  })

  describe('combat transitions', () => {
    it('starts combat with default letterbox', () => {
      stateMachine.startCombat(true, 1)

      const state = stateMachine.state()
      expect(state.type).toBe('combat')
      if (state.type === 'combat') {
        expect(state.subPhase).toBe('letterbox_intro')
        expect(state.letterboxType).toBe('encounter')
        expect(state.canFlee).toBe(true)
        expect(state.dungeonLevel).toBe(1)
      }
    })

    it('starts combat with ambush letterbox', () => {
      stateMachine.startCombat(false, 3, 'ambush')

      const state = stateMachine.state()
      if (state.type === 'combat') {
        expect(state.letterboxType).toBe('ambush')
        expect(state.canFlee).toBe(false)
      }
    })

    it('completes combat intro and transitions to action selection', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.completeCombatIntro()

      const state = stateMachine.state()
      if (state.type === 'combat') {
        expect(state.subPhase).toBe('action_select')
        expect(state.letterboxType).toBeNull()
      }
    })

    it('sets combat action for character', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.completeCombatIntro()

      const command = {
        id: 'cmd-1',
        actor: createTestCharacter(),
        type: 'ATTACK' as const,
        initiative: 10
      }
      stateMachine.setCombatAction('char-1', command)

      expect(stateMachine.combatSelectedActions().get('char-1')).toEqual(command)
    })

    it('starts and cancels targeting mode', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.completeCombatIntro()

      stateMachine.startTargeting('char-1')

      expect(stateMachine.isTargetingMode()).toBe(true)
      expect(stateMachine.getTargetingCharacterId()).toBe('char-1')

      stateMachine.cancelTargeting()

      expect(stateMachine.isTargetingMode()).toBe(false)
      expect(stateMachine.getTargetingCharacterId()).toBeNull()
    })

    it('resets all combat actions', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.completeCombatIntro()

      const command = {
        id: 'cmd-1',
        actor: createTestCharacter(),
        type: 'ATTACK' as const,
        initiative: 10
      }
      stateMachine.setCombatAction('char-1', command)
      stateMachine.resetCombatActions()

      expect(stateMachine.combatSelectedActions().size).toBe(0)
    })

    it('starts round execution with cinematic arena', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.completeCombatIntro()

      const events = [{ type: 'action' as const, messages: ['Test attack'] }]
      stateMachine.startRoundExecution(events, null)

      const state = stateMachine.state()
      if (state.type === 'combat') {
        expect(state.subPhase).toBe('executing')
        expect(state.showCinematicArena).toBe(true)
        expect(state.arenaEvents).toEqual(events)
      }
    })

    it('completes round execution', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.completeCombatIntro()
      stateMachine.startRoundExecution([], null)
      stateMachine.completeRoundExecution()

      const state = stateMachine.state()
      if (state.type === 'combat') {
        expect(state.subPhase).toBe('action_select')
        expect(state.showCinematicArena).toBe(false)
        expect(state.selectedActions.size).toBe(0)
      }
    })

    it('shows victory overlay with rewards', () => {
      stateMachine.startCombat(true, 1)
      const rewards = { xpPerCharacter: 100, gold: 500, items: [] }
      stateMachine.showVictory(rewards)

      expect(stateMachine.showVictoryOverlay()).toBe(true)
      const state = stateMachine.state()
      if (state.type === 'combat') {
        expect(state.victoryRewards).toEqual(rewards)
      }
    })

    it('shows defeat overlay', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.showDefeat()

      expect(stateMachine.showDefeatOverlay()).toBe(true)
    })

    it('ends combat and returns to exploration', () => {
      stateMachine.startCombat(true, 1)
      stateMachine.endCombat()

      expect(stateMachine.isExploring()).toBe(true)
      expect(stateMachine.isInCombat()).toBe(false)
    })
  })

  describe('chest transitions', () => {
    it('starts chest interaction', () => {
      const chest = createTestChest()
      stateMachine.startChestInteraction(chest)

      const state = stateMachine.state()
      expect(state.type).toBe('chest')
      if (state.type === 'chest') {
        expect(state.subPhase).toBe('discovered')
        expect(state.letterboxType).toBe('found')
        expect(state.chest).toEqual(chest)
      }
    })

    it('dismisses chest letterbox', () => {
      stateMachine.startChestInteraction(createTestChest())
      stateMachine.dismissChestLetterbox()

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.subPhase).toBe('handler_select')
        expect(state.letterboxType).toBeNull()
      }
    })

    it('selects chest handler', () => {
      const character = createTestCharacter()
      stateMachine.startChestInteraction(createTestChest())
      stateMachine.dismissChestLetterbox()
      stateMachine.selectChestHandler(character)

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.subPhase).toBe('action_select')
        expect(state.selectedHandler).toEqual(character)
      }
    })

    it('shows trap inspection result', () => {
      stateMachine.startChestInteraction(createTestChest())

      const scrambled = {
        originalName: 'poison_needle',
        scrambledName: 'POINOS NEEDLE',
        revealedPositions: [0, 2, 4]
      }
      stateMachine.showTrapInspection(scrambled as any, true)

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.subPhase).toBe('trap_inspect')
        expect(state.scrambledTrapState).toEqual(scrambled)
        expect(state.trapIdentified).toBe(true)
      }
    })

    it('updates trap input', () => {
      stateMachine.startChestInteraction(createTestChest())
      stateMachine.updateTrapInput('POIS')

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.trapInput).toBe('POIS')
      }
    })

    it('shows trap triggered', () => {
      stateMachine.startChestInteraction(createTestChest())

      const trapInfo = {
        trapTriggered: true,
        trapId: 'poison_needle' as const,
        trapMessage: 'A poison needle pricks you!',
        damageDealt: new Map([['char-1', 5]]),
        statusEffects: new Map([['char-1', CharacterStatus.POISONED]])
      }
      stateMachine.showTrapTriggered(trapInfo, 'Poison Needle')

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.subPhase).toBe('trap_triggered')
        expect(state.letterboxType).toBe('trap_triggered')
        expect(state.pendingTrapInfo).toEqual(trapInfo)
        expect(state.trapLetterboxName).toBe('Poison Needle')
        expect(state.hitCharacterIds).toContain('char-1')
      }
    })

    it('opens chest and shows contents', () => {
      stateMachine.startChestInteraction(createTestChest())

      const summary = {
        gold: 100,
        items: [],
        recipientName: 'Test Fighter'
      }
      stateMachine.openChest(summary)

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.subPhase).toBe('contents_reveal')
        expect(state.chestSprite).toBe('open')
        expect(state.summary).toEqual(summary)
      }
    })

    it('shows inventory warning', () => {
      stateMachine.startChestInteraction(createTestChest())
      stateMachine.showInventoryWarning('Inventory full! 2 items will be lost.')

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.inventoryWarning).toBe('Inventory full! 2 items will be lost.')
      }
    })

    it('updates chest state', () => {
      stateMachine.startChestInteraction(createTestChest())
      stateMachine.updateChest({ trapDisarmed: true })

      const state = stateMachine.state()
      if (state.type === 'chest') {
        expect(state.chest.trapDisarmed).toBe(true)
      }
    })

    it('ends chest interaction', () => {
      stateMachine.startChestInteraction(createTestChest())
      stateMachine.endChestInteraction()

      expect(stateMachine.isExploring()).toBe(true)
      expect(stateMachine.showChestOverlay()).toBe(false)
    })
  })

  describe('spell casting transitions', () => {
    it('opens spell dialog', () => {
      const caster = createTestCharacter({ class: 'mage' })
      stateMachine.openSpellDialog(caster, 'dungeon')

      const state = stateMachine.state()
      expect(state.type).toBe('spell_casting')
      if (state.type === 'spell_casting') {
        expect(state.showSpellDialog).toBe(true)
        expect(state.selectedCaster).toEqual(caster)
        expect(state.context).toBe('dungeon')
      }
    })

    it('selects spell and shows target dialog', () => {
      const caster = createTestCharacter({ class: 'priest' })
      stateMachine.openSpellDialog(caster, 'dungeon')

      const spell = { id: 'dios', name: 'DIOS' } as any
      const targets = [
        { id: 'char-1', name: 'Fighter', enabled: true },
        { id: 'char-2', name: 'Thief', enabled: true }
      ]
      stateMachine.selectSpell(spell, targets)

      const state = stateMachine.state()
      if (state.type === 'spell_casting') {
        expect(state.showSpellDialog).toBe(false)
        expect(state.showTargetDialog).toBe(true)
        expect(state.selectedSpell).toEqual(spell)
        expect(state.targetOptions).toEqual(targets)
      }
    })

    it('cancels spell casting', () => {
      const caster = createTestCharacter({ class: 'mage' })
      stateMachine.openSpellDialog(caster, 'dungeon')
      stateMachine.cancelSpellCasting()

      expect(stateMachine.isExploring()).toBe(true)
    })

    it('completes spell casting', () => {
      const caster = createTestCharacter({ class: 'mage' })
      stateMachine.openSpellDialog(caster, 'dungeon')
      stateMachine.completeSpellCasting()

      expect(stateMachine.isExploring()).toBe(true)
    })
  })

  describe('condition fail transitions', () => {
    it('shows condition fail state', () => {
      const result = {
        status: 'fail' as const,
        message: 'You cannot pass without the key!',
        failAction: 'retreat' as const
      }
      const previousPosition = { x: 5, y: 5, facing: 'NORTH' as const }

      stateMachine.showConditionFail(result, previousPosition)

      const state = stateMachine.state()
      expect(state.type).toBe('condition_fail')
      if (state.type === 'condition_fail') {
        expect(state.conditionResult).toEqual(result)
        expect(state.previousPosition).toEqual(previousPosition)
      }
    })

    it('completes condition fail handling', () => {
      const result = { status: 'fail' as const, message: 'Blocked!' }
      stateMachine.showConditionFail(result, { x: 0, y: 0, facing: 'NORTH' })
      stateMachine.completeConditionFail()

      expect(stateMachine.isExploring()).toBe(true)
    })
  })

  describe('validation methods', () => {
    it('allows combat from exploration', () => {
      expect(stateMachine.canStartCombat()).toBe(true)
    })

    it('allows combat from tile message', () => {
      stateMachine.showTileMessage('Test')
      expect(stateMachine.canStartCombat()).toBe(true)
    })

    it('disallows combat from chest interaction', () => {
      stateMachine.startChestInteraction(createTestChest())
      expect(stateMachine.canStartCombat()).toBe(false)
    })

    it('allows chest from exploration', () => {
      expect(stateMachine.canStartChestInteraction()).toBe(true)
    })

    it('allows chest from combat (victory chest)', () => {
      stateMachine.startCombat(true, 1)
      expect(stateMachine.canStartChestInteraction()).toBe(true)
    })
  })

  describe('computed values', () => {
    it('combatSubPhase returns null when not in combat', () => {
      expect(stateMachine.combatSubPhase()).toBeNull()
    })

    it('combatSubPhase returns phase when in combat', () => {
      stateMachine.startCombat(true, 1)
      expect(stateMachine.combatSubPhase()).toBe('letterbox_intro')
    })

    it('chestSubPhase returns null when not in chest interaction', () => {
      expect(stateMachine.chestSubPhase()).toBeNull()
    })

    it('chestSubPhase returns phase when in chest interaction', () => {
      stateMachine.startChestInteraction(createTestChest())
      expect(stateMachine.chestSubPhase()).toBe('discovered')
    })
  })
})

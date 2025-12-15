import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, ActivatedRoute } from '@angular/router'
import { of } from 'rxjs'
import { SpellCastingComponent } from './spell-casting.component'
import { GameStateService } from '@services/GameStateService'
import { SpellDataLoader } from '@services/SpellDataLoader'
import { RandomService } from '@services/RandomService'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { createTestCharacter } from '@testing/test-factories'
import { loadSpellsForTests } from '@testing/test-data-loader'

describe('SpellCastingComponent', () => {
  let component: SpellCastingComponent
  let fixture: ComponentFixture<SpellCastingComponent>
  let gameState: GameStateService
  let router: Router

  // Priest with DIOS spell (healing, single target)
  const createPriestWithSpells = (): Character => createTestCharacter({
    id: 'priest-1',
    name: 'Healer',
    race: Race.HUMAN,
    class: CharacterClass.PRIEST,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    hp: 20,
    maxHp: 25,
    level: 3,
    knownSpells: ['dios', 'dial', 'madi'],
    spellPoints: {
      priest: {
        level1: { current: 3, max: 5 },
        level2: { current: 2, max: 3 },
        level3: { current: 0, max: 0 },
        level4: { current: 1, max: 1 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
    }
  })

  // Injured fighter for healing tests
  const createInjuredFighter = (): Character => createTestCharacter({
    id: 'fighter-1',
    name: 'Fighter',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    hp: 5,
    maxHp: 30,
    level: 3
  })

  const mockActivatedRoute = {
    queryParams: of({
      characterId: 'priest-1',
      returnTo: 'maze'
    })
  }

  beforeEach(async () => {
    // Ensure spell data is loaded
    await loadSpellsForTests()

    TestBed.configureTestingModule({
      imports: [SpellCastingComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: mockActivatedRoute
        }
      ]
    })

    fixture = TestBed.createComponent(SpellCastingComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)

    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true))

    // Setup party with priest and injured fighter
    const priest = createPriestWithSpells()
    const fighter = createInjuredFighter()

    gameState.updateState(state => ({
      ...state,
      roster: new Map([
        [priest.id, priest],
        [fighter.id, fighter]
      ]),
      party: {
        ...state.party,
        members: [priest.id, fighter.id],
        gold: 500
      }
    }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initialization', () => {
    it('creates component', () => {
      expect(component).toBeTruthy()
    })

    it('loads character ID from query params', () => {
      fixture.detectChanges()
      expect(component.characterId()).toBe('priest-1')
    })

    it('loads caster from game state', () => {
      fixture.detectChanges()
      expect(component.caster()).toBeTruthy()
      expect(component.caster()?.name).toBe('Healer')
    })

    it('starts in selecting-spell phase', () => {
      expect(component.phase()).toBe('selecting-spell')
    })
  })

  describe('spell selection', () => {
    it('transitions to selecting-target for single-target spells', () => {
      fixture.detectChanges()
      const diosSpell = SpellDataLoader.getSpell('dios')!

      component.onSpellSelected(diosSpell)

      expect(component.phase()).toBe('selecting-target')
      expect(component.selectedSpell()).toBe(diosSpell)
    })

    it('shows "no valid targets" when no valid targets exist', () => {
      // Create a resurrection spell context (dead_ally target)
      // DI is a level 5 priest spell that targets dead allies
      const priestWithDi = createTestCharacter({
        id: 'priest-di',
        name: 'DiPriest',
        class: CharacterClass.PRIEST,
        knownSpells: ['di'],
        spellPoints: {
          priest: {
            level1: { current: 0, max: 0 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 1, max: 1 },  // DI is level 5
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      // All characters are alive, no valid targets for DI
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('priest-di', priestWithDi),
        party: {
          ...state.party,
          members: ['priest-di', 'fighter-1']
        }
      }))

      // Update query params mock
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        imports: [SpellCastingComponent],
        providers: [{
          provide: ActivatedRoute,
          useValue: { queryParams: of({ characterId: 'priest-di', returnTo: 'maze' }) }
        }]
      })

      const newFixture = TestBed.createComponent(SpellCastingComponent)
      const newComponent = newFixture.componentInstance
      const newGameState = TestBed.inject(GameStateService)

      newGameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest-di', priestWithDi],
          ['fighter-1', createInjuredFighter()]
        ]),
        party: { ...state.party, members: ['priest-di', 'fighter-1'] }
      }))

      newFixture.detectChanges()

      // Get DI spell (target: dead_ally - requires dead characters)
      const diSpell = SpellDataLoader.getSpell('di')!
      expect(diSpell.target).toBe('dead_ally')

      newComponent.onSpellSelected(diSpell)

      expect(newComponent.phase()).toBe('showing-result')
      expect(newComponent.castResult()).toBe('No valid targets available.')
    })
  })

  describe('target selection', () => {
    it('builds target options based on spell target type', () => {
      fixture.detectChanges()
      const diosSpell = SpellDataLoader.getSpell('dios')!

      component.onSpellSelected(diosSpell)

      const targets = component.targetOptions()
      expect(targets.length).toBe(2) // Both priest and fighter are valid targets
    })

    it('filters dead characters for resurrection spells (dead_ally target)', () => {
      // Add a dead character
      const deadChar = createTestCharacter({
        id: 'dead-1',
        name: 'DeadGuy',
        status: CharacterStatus.DEAD
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('dead-1', deadChar),
        party: { ...state.party, members: ['priest-1', 'fighter-1', 'dead-1'] }
      }))

      fixture.detectChanges()

      // Get DI spell (target: dead_ally)
      const diSpell = SpellDataLoader.getSpell('di')!
      expect(diSpell.target).toBe('dead_ally')
      component.onSpellSelected(diSpell)

      const targets = component.targetOptions()
      expect(targets.length).toBe(1)
      expect(targets[0].character.id).toBe('dead-1')
    })
  })

  describe('spell execution', () => {
    beforeEach(() => {
      // Queue a predictable dice roll for healing (1d8 = 5)
      RandomService.queueNextValues([0.5])
    })

    it('heals target and deducts spell point', () => {
      fixture.detectChanges()

      const diosSpell = SpellDataLoader.getSpell('dios')!
      component.onSpellSelected(diosSpell)

      // Select fighter as target
      const fighter = gameState.state().roster.get('fighter-1')!
      component.onTargetSelected(fighter)

      // Check state updates
      const updatedState = gameState.state()
      const updatedFighter = updatedState.roster.get('fighter-1')!
      const updatedPriest = updatedState.roster.get('priest-1')!

      // Fighter should be healed (was 5, now 5 + rolled amount)
      expect(updatedFighter.hp).toBeGreaterThan(5)
      expect(updatedFighter.hp).toBeLessThanOrEqual(updatedFighter.maxHp)

      // Priest should have 1 less spell point at level 1
      expect(updatedPriest.spellPoints?.priest?.level1.current).toBe(2)
    })

    it('shows result message after casting', () => {
      fixture.detectChanges()

      const diosSpell = SpellDataLoader.getSpell('dios')!
      component.onSpellSelected(diosSpell)

      const fighter = gameState.state().roster.get('fighter-1')!
      component.onTargetSelected(fighter)

      expect(component.phase()).toBe('showing-result')
      expect(component.castResult()).toContain('Healer casts DIOS')
      expect(component.castResult()).toContain('healed')
    })
  })

  describe('navigation', () => {
    it('returns to maze when cancelled from spell selection', () => {
      fixture.detectChanges()
      component.returnToPrevious()

      expect(router.navigate).toHaveBeenCalledWith(['/maze'])
    })

    it('returns to spell selection when cancelled from target selection', () => {
      fixture.detectChanges()

      const diosSpell = SpellDataLoader.getSpell('dios')!
      component.onSpellSelected(diosSpell)
      expect(component.phase()).toBe('selecting-target')

      component.cancelTargetSelection()

      expect(component.phase()).toBe('selecting-spell')
      expect(component.selectedSpell()).toBeNull()
    })

    it('ESC key returns to maze from spell selection', () => {
      fixture.detectChanges()
      component.handleEscape()

      expect(router.navigate).toHaveBeenCalledWith(['/maze'])
    })

    it('ESC key returns to spell selection from target selection', () => {
      fixture.detectChanges()

      const diosSpell = SpellDataLoader.getSpell('dios')!
      component.onSpellSelected(diosSpell)

      component.handleEscape()

      expect(component.phase()).toBe('selecting-spell')
    })
  })

  describe('targetPrompt', () => {
    it('returns "HEAL WHO?" for healing spells', () => {
      fixture.detectChanges()

      const diosSpell = SpellDataLoader.getSpell('dios')!
      component.onSpellSelected(diosSpell)

      expect(component.targetPrompt()).toBe('HEAL WHO?')
    })

    it('returns "SELECT TARGET" by default', () => {
      expect(component.targetPrompt()).toBe('SELECT TARGET')
    })
  })

  describe('additional spell types', () => {
    it('applies full heal with MADI spell', () => {
      // Setup priest with MADI (level 6 spell) and injured target
      const priestWithMadi = createTestCharacter({
        id: 'priest-madi',
        name: 'MadiPriest',
        class: CharacterClass.PRIEST,
        status: CharacterStatus.OK,
        hp: 30,
        maxHp: 30,
        knownSpells: ['madi'],
        spellPoints: {
          priest: {
            level1: { current: 0, max: 0 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 1, max: 1 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const injuredFighter = createTestCharacter({
        id: 'injured-1',
        name: 'Injured',
        status: CharacterStatus.POISONED,  // Has status condition
        hp: 5,
        maxHp: 40
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest-madi', priestWithMadi],
          ['injured-1', injuredFighter]
        ]),
        party: { ...state.party, members: ['priest-madi', 'injured-1'] }
      }))

      // Create new component with updated characterId
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        imports: [SpellCastingComponent],
        providers: [{
          provide: ActivatedRoute,
          useValue: { queryParams: of({ characterId: 'priest-madi', returnTo: 'maze' }) }
        }]
      })

      const newFixture = TestBed.createComponent(SpellCastingComponent)
      const newComponent = newFixture.componentInstance
      const newGameState = TestBed.inject(GameStateService)
      const newRouter = TestBed.inject(Router)
      jest.spyOn(newRouter, 'navigate').mockImplementation(() => Promise.resolve(true))

      newGameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest-madi', priestWithMadi],
          ['injured-1', injuredFighter]
        ]),
        party: { ...state.party, members: ['priest-madi', 'injured-1'] }
      }))

      newFixture.detectChanges()

      // Get MADI spell
      const madiSpell = SpellDataLoader.getSpell('madi')!
      expect(madiSpell.healing?.type).toBe('full')

      newComponent.onSpellSelected(madiSpell)
      newComponent.onTargetSelected(injuredFighter)

      expect(newComponent.phase()).toBe('showing-result')
      expect(newComponent.castResult()).toContain('MADI')
    })

    it('applies status cure with LATUMOFIS spell', () => {
      // Setup priest with LATUMOFIS (level 4 spell)
      const priestWithLatumofis = createTestCharacter({
        id: 'priest-lat',
        name: 'CurePriest',
        class: CharacterClass.PRIEST,
        status: CharacterStatus.OK,
        hp: 25,
        maxHp: 25,
        knownSpells: ['latumofis'],
        spellPoints: {
          priest: {
            level1: { current: 0, max: 0 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 1, max: 1 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const poisonedFighter = createTestCharacter({
        id: 'poisoned-1',
        name: 'Poisoned',
        status: CharacterStatus.POISONED,
        hp: 15,
        maxHp: 30
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest-lat', priestWithLatumofis],
          ['poisoned-1', poisonedFighter]
        ]),
        party: { ...state.party, members: ['priest-lat', 'poisoned-1'] }
      }))

      // Create new component
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        imports: [SpellCastingComponent],
        providers: [{
          provide: ActivatedRoute,
          useValue: { queryParams: of({ characterId: 'priest-lat', returnTo: 'maze' }) }
        }]
      })

      const newFixture = TestBed.createComponent(SpellCastingComponent)
      const newComponent = newFixture.componentInstance
      const newGameState = TestBed.inject(GameStateService)
      const newRouter = TestBed.inject(Router)
      jest.spyOn(newRouter, 'navigate').mockImplementation(() => Promise.resolve(true))

      newGameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest-lat', priestWithLatumofis],
          ['poisoned-1', poisonedFighter]
        ]),
        party: { ...state.party, members: ['priest-lat', 'poisoned-1'] }
      }))

      newFixture.detectChanges()

      const latumofisSpell = SpellDataLoader.getSpell('latumofis')!
      expect(latumofisSpell.statusCure).toBe('poison')

      newComponent.onSpellSelected(latumofisSpell)
      newComponent.onTargetSelected(poisonedFighter)

      expect(newComponent.phase()).toBe('showing-result')
      expect(newComponent.castResult()).toContain('LATUMOFIS')
    })

    it('executes resurrection spell on dead character', () => {
      // Queue high roll for success (Vitality 15 × 4 = 60% success rate)
      RandomService.queueNextValues([0.3])  // 30% < 60% = success

      const priestWithDi = createTestCharacter({
        id: 'priest-di',
        name: 'DiPriest',
        class: CharacterClass.PRIEST,
        status: CharacterStatus.OK,
        hp: 25,
        maxHp: 25,
        knownSpells: ['di'],
        spellPoints: {
          priest: {
            level1: { current: 0, max: 0 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 1, max: 1 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const deadFighter = createTestCharacter({
        id: 'dead-fighter',
        name: 'DeadFighter',
        status: CharacterStatus.DEAD,
        hp: 0,
        maxHp: 30,
        vitality: 15
      })

      // Setup state
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        imports: [SpellCastingComponent],
        providers: [{
          provide: ActivatedRoute,
          useValue: { queryParams: of({ characterId: 'priest-di', returnTo: 'maze' }) }
        }]
      })

      const newFixture = TestBed.createComponent(SpellCastingComponent)
      const newComponent = newFixture.componentInstance
      const newGameState = TestBed.inject(GameStateService)
      const newRouter = TestBed.inject(Router)
      jest.spyOn(newRouter, 'navigate').mockImplementation(() => Promise.resolve(true))

      newGameState.updateState(state => ({
        ...state,
        roster: new Map([
          ['priest-di', priestWithDi],
          ['dead-fighter', deadFighter]
        ]),
        party: { ...state.party, members: ['priest-di', 'dead-fighter'] }
      }))

      newFixture.detectChanges()

      const diSpell = SpellDataLoader.getSpell('di')!
      expect(diSpell.resurrection).toBeTruthy()

      newComponent.onSpellSelected(diSpell)
      newComponent.onTargetSelected(deadFighter)

      expect(newComponent.phase()).toBe('showing-result')
      expect(newComponent.castResult()).toContain('DI')
    })

    it('shows utility spell message for DUMAPIC', () => {
      // Setup mage with DUMAPIC (level 1 mage spell)
      const mageWithDumapic = createTestCharacter({
        id: 'mage-1',
        name: 'Navigator',
        class: CharacterClass.MAGE,
        status: CharacterStatus.OK,
        hp: 10,
        maxHp: 10,
        knownSpells: ['dumapic'],
        spellPoints: {
          mage: {
            level1: { current: 2, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      // Setup state with dungeon position
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        imports: [SpellCastingComponent],
        providers: [{
          provide: ActivatedRoute,
          useValue: { queryParams: of({ characterId: 'mage-1', returnTo: 'maze' }) }
        }]
      })

      const newFixture = TestBed.createComponent(SpellCastingComponent)
      const newComponent = newFixture.componentInstance
      const newGameState = TestBed.inject(GameStateService)
      const newRouter = TestBed.inject(Router)
      jest.spyOn(newRouter, 'navigate').mockImplementation(() => Promise.resolve(true))

      newGameState.updateState(state => ({
        ...state,
        roster: new Map([['mage-1', mageWithDumapic]]),
        party: { ...state.party, members: ['mage-1'] },
        dungeon: {
          currentLevel: 1,
          position: { x: 5, y: 10 },
          facing: 'north' as const,
          lightRemaining: 100,
          hasElevator: false,
          discoveredTiles: new Set(),
          encounteredOnTile: false,
          chestOnTile: undefined
        }
      }))

      newFixture.detectChanges()

      const dumapicSpell = SpellDataLoader.getSpell('dumapic')!
      expect(dumapicSpell.utility).toBe('show_coordinates')
      expect(dumapicSpell.target).toBe('party')

      // Party target = immediate cast (no target selection)
      newComponent.onSpellSelected(dumapicSpell)

      expect(newComponent.phase()).toBe('showing-result')
      expect(newComponent.castResult()).toContain('DUMAPIC')
      expect(newComponent.castResult()).toContain('5')
      expect(newComponent.castResult()).toContain('10')
    })
  })

  describe('error handling', () => {
    it('shows error message when caster not found during spell execution', () => {
      fixture.detectChanges()

      // Get DIOS spell and start target selection
      const diosSpell = SpellDataLoader.getSpell('dios')!
      component.onSpellSelected(diosSpell)
      expect(component.phase()).toBe('selecting-target')

      // Get reference to target before clearing caster
      const fighter = gameState.state().roster.get('fighter-1')!

      // Now clear only the caster from roster (keep target)
      gameState.updateState(state => {
        const newRoster = new Map(state.roster)
        newRoster.delete('priest-1')  // Remove caster
        return { ...state, roster: newRoster }
      })

      // Try to execute spell - should fail because caster is gone
      component.onTargetSelected(fighter)

      // Should show error and transition to result phase
      expect(component.phase()).toBe('showing-result')
      expect(component.castResult()).toContain('failed')
    })

    it('shows no valid targets message when roster is empty', () => {
      fixture.detectChanges()

      // Get spell reference before clearing roster
      const diosSpell = SpellDataLoader.getSpell('dios')!

      // Clear the entire roster
      gameState.updateState(state => ({
        ...state,
        roster: new Map()
      }))

      fixture.detectChanges()

      // Selecting a single-target spell with no valid targets shows error
      component.onSpellSelected(diosSpell)

      expect(component.phase()).toBe('showing-result')
      expect(component.castResult()).toBe('No valid targets available.')
    })
  })
})

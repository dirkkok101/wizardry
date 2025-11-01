# Task 12: Training Grounds Character Creation Wizard - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete multi-step character creation wizard in Training Grounds component with race selection, stat rolling, bonus point allocation, class selection, and character finalization

**Architecture:** Signal-based wizard state machine with 7 steps, real-time class eligibility calculation, immutable state updates, comprehensive UI flows with keyboard navigation

**Tech Stack:** Angular 20, TypeScript 5.5+, Jest, Signals API, standalone components, TDD methodology

**Prerequisites:** Task 11.5 complete (CharacterService with class eligibility and character creation)

**Estimated Duration:** 3-4 days | **Target:** 40 new tests

---

## Part 1: Wizard State Management

### Step 1: Write failing tests for wizard state

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

Replace existing tests with comprehensive wizard tests:

```typescript
// src/app/training-grounds/training-grounds.component.spec.ts
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
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (wizard methods not implemented)

### Step 3: Implement wizard state management

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
// src/app/training-grounds/training-grounds.component.ts
import { Component, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../services/GameStateService'
import { CharacterCreationService, RolledStats } from '../../services/CharacterCreationService'
import { CharacterService } from '../../services/CharacterService'
import { MenuComponent, MenuItem } from '../../components/menu/menu.component'
import { SceneType } from '../../types/SceneType'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'
import { CharacterClass } from '../../types/CharacterClass'

export type WizardStep =
  | 'RACE'
  | 'ALIGNMENT'
  | 'STATS'
  | 'BONUS_POINTS'
  | 'CLASS'
  | 'NAME_PASSWORD'
  | 'CONFIRM'

export interface WizardState {
  selectedRace: Race | null
  selectedAlignment: Alignment | null
  rolledStats: RolledStats | null
  selectedClass: CharacterClass | null
  name: string
  password: string
}

/**
 * Training Grounds Component
 *
 * Character creation wizard with 7 steps:
 * 1. Race selection (Human, Elf, Dwarf, Gnome, Hobbit)
 * 2. Alignment selection (Good, Neutral, Evil)
 * 3. Stat rolling (3d6 per attribute + bonus points)
 * 4. Bonus point allocation
 * 5. Class selection (based on stat requirements)
 * 6. Name and password entry
 * 7. Confirmation
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  // Wizard state
  readonly currentStep = signal<WizardStep>('RACE')
  readonly wizardState = signal<WizardState>({
    selectedRace: null,
    selectedAlignment: null,
    rolledStats: null,
    selectedClass: null,
    name: '',
    password: ''
  })

  // Error and success messages
  readonly errorMessage = signal<string | null>(null)
  readonly successMessage = signal<string | null>(null)

  // Step sequence for navigation
  private readonly stepSequence: WizardStep[] = [
    'RACE',
    'ALIGNMENT',
    'STATS',
    'BONUS_POINTS',
    'CLASS',
    'NAME_PASSWORD',
    'CONFIRM'
  ]

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }))
  }

  /**
   * Select race and advance to alignment step
   */
  selectRace(race: Race): void {
    this.wizardState.update(state => ({
      ...state,
      selectedRace: race
    }))
    this.nextStep()
  }

  /**
   * Select alignment and advance to stats step
   */
  selectAlignment(alignment: Alignment): void {
    this.wizardState.update(state => ({
      ...state,
      selectedAlignment: alignment
    }))
    this.nextStep()
  }

  /**
   * Roll stats (or reroll)
   */
  rollStats(): void {
    const baseStats = CharacterCreationService.rollStats()
    const race = this.wizardState().selectedRace

    if (!race) {
      this.errorMessage.set('Race not selected')
      return
    }

    // Apply race modifiers
    const modifiedStats = CharacterCreationService.applyRaceModifiers(
      baseStats,
      race
    )

    this.wizardState.update(state => ({
      ...state,
      rolledStats: {
        ...modifiedStats,
        bonusPoints: baseStats.bonusPoints
      }
    }))
  }

  /**
   * Advance to next step in wizard
   */
  private nextStep(): void {
    const currentIndex = this.stepSequence.indexOf(this.currentStep())
    if (currentIndex < this.stepSequence.length - 1) {
      this.currentStep.set(this.stepSequence[currentIndex + 1])
    }
  }

  /**
   * Go back to previous step in wizard
   */
  previousStep(): void {
    const currentIndex = this.stepSequence.indexOf(this.currentStep())
    if (currentIndex > 0) {
      this.currentStep.set(this.stepSequence[currentIndex - 1])
    }
  }

  /**
   * Return to castle menu
   */
  returnToCastle(): void {
    this.router.navigate(['/castle-menu'])
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS (all wizard state tests passing)

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement wizard state management

- 7-step wizard flow (race → alignment → stats → bonus → class → name → confirm)
- Wizard state with selected race, alignment, stats, class, name, password
- Navigation between steps (next/previous)
- Stat rolling with race modifier application
- State persistence across step transitions
- 10 tests passing

Part of Phase 5: Training Grounds implementation"
```

---

## Part 2: Race Selection UI

### Step 1: Write failing tests for race selection UI

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

Add to existing test file:

```typescript
  describe('race selection', () => {
    it('displays 5 race options', () => {
      component.ngOnInit()
      fixture.detectChanges()

      const raceOptions = component.getRaceOptions()

      expect(raceOptions.length).toBe(5)
      expect(raceOptions).toContain(Race.HUMAN)
      expect(raceOptions).toContain(Race.ELF)
      expect(raceOptions).toContain(Race.DWARF)
      expect(raceOptions).toContain(Race.GNOME)
      expect(raceOptions).toContain(Race.HOBBIT)
    })

    it('shows race modifiers for each race', () => {
      const modifiers = component.getRaceModifiers(Race.ELF)

      expect(modifiers.strength).toBe(-1)
      expect(modifiers.intelligence).toBe(1)
      expect(modifiers.vitality).toBe(-1)
      expect(modifiers.agility).toBe(1)
    })

    it('selects race and updates wizard state', () => {
      component.selectRace(Race.DWARF)

      expect(component.wizardState().selectedRace).toBe(Race.DWARF)
      expect(component.currentStep()).toBe('ALIGNMENT')
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (getRaceOptions/getRaceModifiers not implemented)

### Step 3: Implement race selection methods

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

Add imports:

```typescript
import { RACE_MODIFIERS, RaceModifiers } from '../../types/Race'
```

Add to TrainingGroundsComponent:

```typescript
  /**
   * Get all available race options
   */
  getRaceOptions(): Race[] {
    return [Race.HUMAN, Race.ELF, Race.DWARF, Race.GNOME, Race.HOBBIT]
  }

  /**
   * Get stat modifiers for a race
   */
  getRaceModifiers(race: Race): RaceModifiers {
    return RACE_MODIFIERS[race]
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS (all race selection tests passing)

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement race selection UI logic

- Display 5 race options (Human, Elf, Dwarf, Gnome, Hobbit)
- Show race stat modifiers
- Race selection updates wizard state and advances step
- 3 tests passing (13 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 3: Alignment Selection UI

### Step 1: Write failing tests for alignment selection

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

```typescript
  describe('alignment selection', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN) // Advance to ALIGNMENT step
    })

    it('displays 3 alignment options', () => {
      const alignments = component.getAlignmentOptions()

      expect(alignments.length).toBe(3)
      expect(alignments).toContain(Alignment.GOOD)
      expect(alignments).toContain(Alignment.NEUTRAL)
      expect(alignments).toContain(Alignment.EVIL)
    })

    it('selects alignment and advances to STATS step', () => {
      component.selectAlignment(Alignment.GOOD)

      expect(component.wizardState().selectedAlignment).toBe(Alignment.GOOD)
      expect(component.currentStep()).toBe('STATS')
    })

    it('shows alignment description', () => {
      const desc = component.getAlignmentDescription(Alignment.NEUTRAL)

      expect(desc).toContain('balanced')
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (methods not implemented)

### Step 3: Implement alignment selection methods

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
  /**
   * Get all available alignment options
   */
  getAlignmentOptions(): Alignment[] {
    return [Alignment.GOOD, Alignment.NEUTRAL, Alignment.EVIL]
  }

  /**
   * Get description for an alignment
   */
  getAlignmentDescription(alignment: Alignment): string {
    const descriptions: Record<Alignment, string> = {
      [Alignment.GOOD]: 'Virtuous and righteous characters who aid others',
      [Alignment.NEUTRAL]: 'Balanced characters who follow their own path',
      [Alignment.EVIL]: 'Self-serving characters who pursue power'
    }
    return descriptions[alignment]
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement alignment selection UI logic

- Display 3 alignment options (Good, Neutral, Evil)
- Show alignment descriptions
- Alignment selection advances to stats step
- 3 tests passing (16 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 4: Stat Rolling UI

### Step 1: Write failing tests for stat rolling

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

```typescript
  describe('stat rolling', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
    })

    it('rolls stats when entering STATS step', () => {
      component.rollStats()

      const stats = component.wizardState().rolledStats

      expect(stats).toBeDefined()
      expect(stats!.strength).toBeGreaterThanOrEqual(3)
      expect(stats!.strength).toBeLessThanOrEqual(18)
    })

    it('generates bonus points (7-29 range)', () => {
      component.rollStats()

      const stats = component.wizardState().rolledStats

      expect(stats!.bonusPoints).toBeGreaterThanOrEqual(7)
      expect(stats!.bonusPoints).toBeLessThanOrEqual(29)
    })

    it('applies race modifiers to rolled stats', () => {
      // Select Elf (STR -1, INT +1, VIT -1, AGI +1)
      component.currentStep.set('RACE')
      component.selectRace(Race.ELF)
      component.selectAlignment(Alignment.GOOD)

      // Mock the random roll to get predictable values
      jest.spyOn(CharacterCreationService, 'rollStats').mockReturnValue({
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 10
      })

      component.rollStats()

      const stats = component.wizardState().rolledStats

      expect(stats!.strength).toBe(9) // 10 - 1 (Elf modifier)
      expect(stats!.intelligence).toBe(11) // 10 + 1
      expect(stats!.vitality).toBe(9) // 10 - 1
      expect(stats!.agility).toBe(11) // 10 + 1
    })

    it('allows rerolling stats', () => {
      component.rollStats()
      const firstRoll = component.wizardState().rolledStats

      component.rollStats() // Reroll

      const secondRoll = component.wizardState().rolledStats

      expect(secondRoll).toBeDefined()
      // Rolls should be different (with very high probability)
      const isDifferent =
        firstRoll!.strength !== secondRoll!.strength ||
        firstRoll!.intelligence !== secondRoll!.intelligence ||
        firstRoll!.bonusPoints !== secondRoll!.bonusPoints

      expect(isDifferent).toBe(true)
    })

    it('advances to BONUS_POINTS step when stats accepted', () => {
      component.rollStats()
      component.acceptStats()

      expect(component.currentStep()).toBe('BONUS_POINTS')
    })

    it('shows error when trying to accept without rolling', () => {
      component.acceptStats()

      expect(component.errorMessage()).toContain('Roll stats')
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (acceptStats not implemented)

### Step 3: Implement stat acceptance method

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
  /**
   * Accept rolled stats and advance to bonus point allocation
   */
  acceptStats(): void {
    if (!this.wizardState().rolledStats) {
      this.errorMessage.set('Roll stats first')
      return
    }

    this.errorMessage.set(null)
    this.nextStep()
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement stat rolling UI logic

- Roll 3d6 for each attribute
- Generate bonus points (7-29, weighted distribution)
- Apply race modifiers to rolled stats
- Allow rerolling stats multiple times
- Accept stats and advance to bonus point allocation
- 6 tests passing (22 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 5: Bonus Point Allocation UI

### Step 1: Write failing tests for bonus point allocation

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

```typescript
import { BaseStats } from '../../services/CharacterCreationService'

  describe('bonus point allocation', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
      component.rollStats()
      component.acceptStats()
    })

    it('displays available bonus points', () => {
      const points = component.getAvailableBonusPoints()

      expect(points).toBeGreaterThanOrEqual(7)
      expect(points).toBeLessThanOrEqual(29)
    })

    it('allocates bonus points to a stat', () => {
      const initialStats = component.wizardState().rolledStats!
      const initialStr = initialStats.strength
      const initialBonus = initialStats.bonusPoints

      component.allocateBonusPoint('strength', 1)

      const updatedStats = component.wizardState().rolledStats!

      expect(updatedStats.strength).toBe(initialStr + 1)
      expect(updatedStats.bonusPoints).toBe(initialBonus - 1)
    })

    it('prevents allocating more points than available', () => {
      const stats = component.wizardState().rolledStats!
      const availablePoints = stats.bonusPoints

      component.allocateBonusPoint('strength', availablePoints + 1)

      expect(component.errorMessage()).toContain('Not enough bonus points')
    })

    it('allows allocating all bonus points', () => {
      const stats = component.wizardState().rolledStats!
      const allPoints = stats.bonusPoints

      component.allocateBonusPoint('strength', allPoints)

      const updated = component.wizardState().rolledStats!

      expect(updated.bonusPoints).toBe(0)
      expect(updated.strength).toBe(stats.strength + allPoints)
    })

    it('advances to CLASS step when bonus points allocated', () => {
      component.finishBonusAllocation()

      expect(component.currentStep()).toBe('CLASS')
    })

    it('updates eligible classes in real-time as points allocated', () => {
      // Start with low stats
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 10,
          intelligence: 10,
          piety: 10,
          vitality: 10,
          agility: 10,
          luck: 10,
          bonusPoints: 10
        }
      }))

      const eligibleBefore = component.getEligibleClasses()

      // Allocate points to make character eligible for Samurai
      // Samurai needs: STR 15+, IQ 11+, PIE 10+, VIT 14+, AGI 10+
      component.allocateBonusPoint('strength', 5) // 10 + 5 = 15
      component.allocateBonusPoint('intelligence', 1) // 10 + 1 = 11
      component.allocateBonusPoint('vitality', 4) // 10 + 4 = 14

      const eligibleAfter = component.getEligibleClasses()

      expect(eligibleAfter).toContain(CharacterClass.SAMURAI)
      expect(eligibleBefore).not.toContain(CharacterClass.SAMURAI)
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (methods not implemented)

### Step 3: Implement bonus point allocation methods

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
  /**
   * Get available bonus points
   */
  getAvailableBonusPoints(): number {
    return this.wizardState().rolledStats?.bonusPoints ?? 0
  }

  /**
   * Allocate bonus points to a specific stat
   */
  allocateBonusPoint(stat: keyof BaseStats, points: number): void {
    const currentStats = this.wizardState().rolledStats

    if (!currentStats) {
      this.errorMessage.set('No stats rolled')
      return
    }

    try {
      const updatedStats = CharacterCreationService.allocateBonusPoints(
        currentStats,
        stat,
        points
      )

      this.wizardState.update(state => ({
        ...state,
        rolledStats: updatedStats
      }))

      this.errorMessage.set(null)
    } catch (error) {
      this.errorMessage.set((error as Error).message)
    }
  }

  /**
   * Get eligible classes based on current stats (with bonus allocation)
   */
  getEligibleClasses(): CharacterClass[] {
    const stats = this.wizardState().rolledStats

    if (!stats) {
      return []
    }

    return CharacterService.getEligibleClasses(stats)
  }

  /**
   * Finish bonus point allocation and advance to class selection
   */
  finishBonusAllocation(): void {
    this.nextStep()
  }
```

Add import:

```typescript
import { BaseStats } from '../../services/CharacterCreationService'
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement bonus point allocation UI logic

- Display available bonus points
- Allocate points to specific stats
- Prevent over-allocation (validation)
- Update eligible classes in real-time
- Advance to class selection step
- 6 tests passing (28 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 6: Class Selection UI

### Step 1: Write failing tests for class selection

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

```typescript
  describe('class selection', () => {
    beforeEach(() => {
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)

      // Set high stats to make all classes eligible
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 17,
          intelligence: 17,
          piety: 17,
          vitality: 17,
          agility: 17,
          luck: 17,
          bonusPoints: 0
        }
      }))

      component.acceptStats()
      component.finishBonusAllocation()
    })

    it('displays eligible classes as enabled', () => {
      const eligible = component.getEligibleClasses()

      // With all stats at 17, all classes should be eligible
      expect(eligible.length).toBe(8)
      expect(eligible).toContain(CharacterClass.NINJA)
    })

    it('displays ineligible classes as disabled', () => {
      // Lower stats to make some classes ineligible
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 10,
          intelligence: 10,
          piety: 10,
          vitality: 10,
          agility: 10,
          luck: 10,
          bonusPoints: 0
        }
      }))

      const eligible = component.getEligibleClasses()

      expect(eligible).not.toContain(CharacterClass.SAMURAI)
      expect(eligible).not.toContain(CharacterClass.LORD)
      expect(eligible).not.toContain(CharacterClass.NINJA)
    })

    it('shows reason why class is ineligible', () => {
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 10,
          intelligence: 10,
          piety: 10,
          vitality: 10,
          agility: 10,
          luck: 10,
          bonusPoints: 0
        }
      }))

      const reason = component.getIneligibilityReason(CharacterClass.SAMURAI)

      expect(reason).toContain('STR 15')
    })

    it('selects class and advances to NAME_PASSWORD step', () => {
      component.selectClass(CharacterClass.FIGHTER)

      expect(component.wizardState().selectedClass).toBe(CharacterClass.FIGHTER)
      expect(component.currentStep()).toBe('NAME_PASSWORD')
    })

    it('prevents selecting ineligible class', () => {
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 8,
          intelligence: 8,
          piety: 8,
          vitality: 8,
          agility: 8,
          luck: 8,
          bonusPoints: 0
        }
      }))

      component.selectClass(CharacterClass.FIGHTER)

      expect(component.errorMessage()).toContain('not eligible')
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (methods not implemented)

### Step 3: Implement class selection methods

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
  /**
   * Get reason why a class is ineligible
   */
  getIneligibilityReason(characterClass: CharacterClass): string {
    const stats = this.wizardState().rolledStats

    if (!stats) {
      return 'No stats rolled'
    }

    const requirements: Record<CharacterClass, string> = {
      [CharacterClass.FIGHTER]: 'STR 11+',
      [CharacterClass.MAGE]: 'IQ 11+',
      [CharacterClass.PRIEST]: 'PIE 11+',
      [CharacterClass.THIEF]: 'AGI 11+',
      [CharacterClass.BISHOP]: 'IQ 12+, PIE 12+',
      [CharacterClass.SAMURAI]: 'STR 15+, IQ 11+, PIE 10+, VIT 14+, AGI 10+',
      [CharacterClass.LORD]: 'STR 15+, IQ 12+, PIE 12+, VIT 15+, AGI 14+, LUK 15+',
      [CharacterClass.NINJA]: 'ALL stats 17+'
    }

    return `Requires: ${requirements[characterClass]}`
  }

  /**
   * Select character class and advance to name/password step
   */
  selectClass(characterClass: CharacterClass): void {
    const eligible = this.getEligibleClasses()

    if (!eligible.includes(characterClass)) {
      this.errorMessage.set(
        `Character is not eligible for ${characterClass}`
      )
      return
    }

    this.wizardState.update(state => ({
      ...state,
      selectedClass: characterClass
    }))

    this.errorMessage.set(null)
    this.nextStep()
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement class selection UI logic

- Display eligible classes (enabled)
- Display ineligible classes (disabled with reason)
- Show class requirement descriptions
- Validate class eligibility before selection
- Advance to name/password step
- 5 tests passing (33 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 7: Name and Password Input UI

### Step 1: Write failing tests for name/password input

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

```typescript
  describe('name and password input', () => {
    beforeEach(() => {
      // Complete wizard up to NAME_PASSWORD step
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 15,
          intelligence: 12,
          piety: 12,
          vitality: 14,
          agility: 11,
          luck: 10,
          bonusPoints: 0
        }
      }))
      component.acceptStats()
      component.finishBonusAllocation()
      component.selectClass(CharacterClass.FIGHTER)
    })

    it('validates name (1-15 chars)', () => {
      component.setName('Gandalf')

      expect(component.wizardState().name).toBe('Gandalf')
      expect(component.errorMessage()).toBeNull()
    })

    it('rejects name > 15 characters', () => {
      component.setName('ThisNameIsTooLongForWizardry')

      expect(component.errorMessage()).toContain('15 characters')
    })

    it('rejects empty name', () => {
      component.setName('')
      component.finishNamePassword()

      expect(component.errorMessage()).toContain('required')
    })

    it('validates password (4-8 chars)', () => {
      component.setPassword('wizard')

      expect(component.wizardState().password).toBe('wizard')
      expect(component.errorMessage()).toBeNull()
    })

    it('rejects password < 4 characters', () => {
      component.setPassword('abc')

      expect(component.errorMessage()).toContain('4-8 characters')
    })

    it('advances to CONFIRM step when valid name and password', () => {
      component.setName('Gandalf')
      component.setPassword('wizard')
      component.finishNamePassword()

      expect(component.currentStep()).toBe('CONFIRM')
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (methods not implemented)

### Step 3: Implement name/password input methods

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
  /**
   * Set character name with validation
   */
  setName(name: string): void {
    const validation = CharacterService.validateCharacterName(name)

    if (!validation.valid) {
      this.errorMessage.set(validation.error!)
      return
    }

    this.wizardState.update(state => ({
      ...state,
      name
    }))

    this.errorMessage.set(null)
  }

  /**
   * Set character password with validation
   */
  setPassword(password: string): void {
    const validation = CharacterService.validatePassword(password)

    if (!validation.valid) {
      this.errorMessage.set(validation.error!)
      return
    }

    this.wizardState.update(state => ({
      ...state,
      password
    }))

    this.errorMessage.set(null)
  }

  /**
   * Finish name/password entry and advance to confirmation
   */
  finishNamePassword(): void {
    const { name, password } = this.wizardState()

    // Validate both are set
    const nameValidation = CharacterService.validateCharacterName(name)
    const passwordValidation = CharacterService.validatePassword(password)

    if (!nameValidation.valid) {
      this.errorMessage.set(nameValidation.error!)
      return
    }

    if (!passwordValidation.valid) {
      this.errorMessage.set(passwordValidation.error!)
      return
    }

    this.errorMessage.set(null)
    this.nextStep()
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement name/password input UI logic

- Set character name with validation (1-15 chars)
- Set password with validation (4-8 chars)
- Real-time validation feedback
- Advance to confirmation step
- 6 tests passing (39 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 8: Character Creation Completion

### Step 1: Write failing tests for character creation

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.spec.ts`

```typescript
  describe('character creation completion', () => {
    beforeEach(() => {
      // Complete full wizard
      component.selectRace(Race.HUMAN)
      component.selectAlignment(Alignment.GOOD)
      component.wizardState.update(state => ({
        ...state,
        rolledStats: {
          strength: 15,
          intelligence: 12,
          piety: 12,
          vitality: 14,
          agility: 11,
          luck: 10,
          bonusPoints: 0
        }
      }))
      component.acceptStats()
      component.finishBonusAllocation()
      component.selectClass(CharacterClass.FIGHTER)
      component.setName('Gandalf')
      component.setPassword('wizard')
      component.finishNamePassword()
    })

    it('creates character from wizard state', () => {
      const initialRosterSize = gameState.state().roster.size

      component.confirmCharacterCreation()

      const finalRosterSize = gameState.state().roster.size

      expect(finalRosterSize).toBe(initialRosterSize + 1)
    })

    it('adds character to game state roster', () => {
      component.confirmCharacterCreation()

      const roster = gameState.state().roster
      const character = Array.from(roster.values()).find(c => c.name === 'Gandalf')

      expect(character).toBeDefined()
      expect(character!.class).toBe(CharacterClass.FIGHTER)
      expect(character!.race).toBe(Race.HUMAN)
      expect(character!.alignment).toBe(Alignment.GOOD)
    })

    it('resets wizard state after creation', () => {
      component.confirmCharacterCreation()

      expect(component.wizardState().selectedRace).toBeNull()
      expect(component.wizardState().name).toBe('')
      expect(component.currentStep()).toBe('RACE')
    })

    it('shows success message after creation', () => {
      component.confirmCharacterCreation()

      expect(component.successMessage()).toContain('created successfully')
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: FAIL (confirmCharacterCreation not implemented)

### Step 3: Implement character creation method

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

```typescript
  /**
   * Confirm character creation and add to roster
   */
  confirmCharacterCreation(): void {
    const { selectedRace, selectedAlignment, rolledStats, selectedClass, name, password } =
      this.wizardState()

    // Validate all required fields
    if (
      !selectedRace ||
      !selectedAlignment ||
      !rolledStats ||
      !selectedClass ||
      !name ||
      !password
    ) {
      this.errorMessage.set('Wizard not complete')
      return
    }

    // Create character
    const character = CharacterService.createCharacter({
      name,
      password,
      race: selectedRace,
      alignment: selectedAlignment,
      stats: rolledStats,
      selectedClass
    })

    // Add to game state roster
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(character.id, character)
    }))

    // Show success message
    this.successMessage.set(`${character.name} created successfully!`)

    // Reset wizard
    this.resetWizard()
  }

  /**
   * Reset wizard state to start over
   */
  private resetWizard(): void {
    this.wizardState.set({
      selectedRace: null,
      selectedAlignment: null,
      rolledStats: null,
      selectedClass: null,
      name: '',
      password: ''
    })

    this.currentStep.set('RACE')
    this.errorMessage.set(null)
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS (all 43 tests passing)

### Step 5: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement character creation completion

- Create character from wizard state
- Add character to game state roster
- Reset wizard after creation for new character
- Show success message
- 4 tests passing (43 total)

Part of Phase 5: Training Grounds implementation"
```

---

## Part 9: Update HTML Template

### Step 1: Update template with all wizard steps

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.html`

```html
<!-- src/app/training-grounds/training-grounds.component.html -->
<div class="training-grounds">
  <header>
    <h1>TRAINING GROUNDS</h1>
  </header>

  <main>
    <!-- Success/Error Messages -->
    @if (successMessage()) {
      <div class="success-message">{{ successMessage() }}</div>
    }
    @if (errorMessage()) {
      <div class="error-message">{{ errorMessage() }}</div>
    }

    <!-- Race Selection -->
    @if (currentStep() === 'RACE') {
      <div class="wizard-step">
        <h2>SELECT RACE</h2>
        <div class="race-options">
          @for (race of getRaceOptions(); track race) {
            <button class="race-option" (click)="selectRace(race)">
              <div class="race-name">{{ race }}</div>
              <div class="race-modifiers">
                @if (getRaceModifiers(race).strength !== 0) {
                  <span>STR {{ getRaceModifiers(race).strength > 0 ? '+' : '' }}{{ getRaceModifiers(race).strength }}</span>
                }
                @if (getRaceModifiers(race).intelligence !== 0) {
                  <span>IQ {{ getRaceModifiers(race).intelligence > 0 ? '+' : '' }}{{ getRaceModifiers(race).intelligence }}</span>
                }
                @if (getRaceModifiers(race).piety !== 0) {
                  <span>PIE {{ getRaceModifiers(race).piety > 0 ? '+' : '' }}{{ getRaceModifiers(race).piety }}</span>
                }
                @if (getRaceModifiers(race).vitality !== 0) {
                  <span>VIT {{ getRaceModifiers(race).vitality > 0 ? '+' : '' }}{{ getRaceModifiers(race).vitality }}</span>
                }
                @if (getRaceModifiers(race).agility !== 0) {
                  <span>AGI {{ getRaceModifiers(race).agility > 0 ? '+' : '' }}{{ getRaceModifiers(race).agility }}</span>
                }
                @if (getRaceModifiers(race).luck !== 0) {
                  <span>LUK {{ getRaceModifiers(race).luck > 0 ? '+' : '' }}{{ getRaceModifiers(race).luck }}</span>
                }
              </div>
            </button>
          }
        </div>
        <button class="cancel-btn" (click)="returnToCastle()">(ESC) Back to Castle</button>
      </div>
    }

    <!-- Alignment Selection -->
    @if (currentStep() === 'ALIGNMENT') {
      <div class="wizard-step">
        <h2>SELECT ALIGNMENT</h2>
        <div class="alignment-options">
          @for (alignment of getAlignmentOptions(); track alignment) {
            <button class="alignment-option" (click)="selectAlignment(alignment)">
              <div class="alignment-name">{{ alignment }}</div>
              <div class="alignment-desc">{{ getAlignmentDescription(alignment) }}</div>
            </button>
          }
        </div>
        <button class="back-btn" (click)="previousStep()">(ESC) Back</button>
      </div>
    }

    <!-- Stat Rolling -->
    @if (currentStep() === 'STATS') {
      <div class="wizard-step">
        <h2>ROLL ATTRIBUTES</h2>

        @if (wizardState().rolledStats; as stats) {
          <div class="stats-display">
            <div class="stat-row">
              <span class="stat-label">Strength:</span>
              <span class="stat-value">{{ stats.strength }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Intelligence:</span>
              <span class="stat-value">{{ stats.intelligence }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Piety:</span>
              <span class="stat-value">{{ stats.piety }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Vitality:</span>
              <span class="stat-value">{{ stats.vitality }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Agility:</span>
              <span class="stat-value">{{ stats.agility }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Luck:</span>
              <span class="stat-value">{{ stats.luck }}</span>
            </div>
            <div class="stat-row bonus">
              <span class="stat-label">Bonus Points:</span>
              <span class="stat-value">{{ stats.bonusPoints }}</span>
            </div>
          </div>

          <div class="actions">
            <button class="primary-btn" (click)="acceptStats()">(ENTER) Accept Stats</button>
            <button class="secondary-btn" (click)="rollStats()">(R) Reroll</button>
          </div>
        } @else {
          <button class="primary-btn" (click)="rollStats()">(R) Roll Stats</button>
        }

        <button class="back-btn" (click)="previousStep()">(ESC) Back</button>
      </div>
    }

    <!-- Bonus Point Allocation -->
    @if (currentStep() === 'BONUS_POINTS') {
      <div class="wizard-step">
        <h2>ALLOCATE BONUS POINTS</h2>
        <p class="bonus-info">Bonus Points Available: {{ getAvailableBonusPoints() }}</p>

        @if (wizardState().rolledStats; as stats) {
          <div class="stat-allocation">
            <div class="stat-row">
              <span class="stat-label">Strength:</span>
              <span class="stat-value">{{ stats.strength }}</span>
              <button (click)="allocateBonusPoint('strength', 1)" [disabled]="getAvailableBonusPoints() === 0">+1</button>
            </div>
            <div class="stat-row">
              <span class="stat-label">Intelligence:</span>
              <span class="stat-value">{{ stats.intelligence }}</span>
              <button (click)="allocateBonusPoint('intelligence', 1)" [disabled]="getAvailableBonusPoints() === 0">+1</button>
            </div>
            <div class="stat-row">
              <span class="stat-label">Piety:</span>
              <span class="stat-value">{{ stats.piety }}</span>
              <button (click)="allocateBonusPoint('piety', 1)" [disabled]="getAvailableBonusPoints() === 0">+1</button>
            </div>
            <div class="stat-row">
              <span class="stat-label">Vitality:</span>
              <span class="stat-value">{{ stats.vitality }}</span>
              <button (click)="allocateBonusPoint('vitality', 1)" [disabled]="getAvailableBonusPoints() === 0">+1</button>
            </div>
            <div class="stat-row">
              <span class="stat-label">Agility:</span>
              <span class="stat-value">{{ stats.agility }}</span>
              <button (click)="allocateBonusPoint('agility', 1)" [disabled]="getAvailableBonusPoints() === 0">+1</button>
            </div>
            <div class="stat-row">
              <span class="stat-label">Luck:</span>
              <span class="stat-value">{{ stats.luck }}</span>
              <button (click)="allocateBonusPoint('luck', 1)" [disabled]="getAvailableBonusPoints() === 0">+1</button>
            </div>
          </div>

          <div class="eligible-classes">
            <h3>Eligible Classes:</h3>
            <ul>
              @for (cls of getEligibleClasses(); track cls) {
                <li>{{ cls }}</li>
              }
            </ul>
          </div>
        }

        <button class="primary-btn" (click)="finishBonusAllocation()">(ENTER) Continue</button>
        <button class="back-btn" (click)="previousStep()">(ESC) Back</button>
      </div>
    }

    <!-- Class Selection -->
    @if (currentStep() === 'CLASS') {
      <div class="wizard-step">
        <h2>SELECT CLASS</h2>

        <div class="class-options">
          @for (cls of [CharacterClass.FIGHTER, CharacterClass.MAGE, CharacterClass.PRIEST, CharacterClass.THIEF, CharacterClass.BISHOP, CharacterClass.SAMURAI, CharacterClass.LORD, CharacterClass.NINJA]; track cls) {
            @if (getEligibleClasses().includes(cls)) {
              <button class="class-option enabled" (click)="selectClass(cls)">
                <div class="class-name">{{ cls }}</div>
              </button>
            } @else {
              <button class="class-option disabled" disabled>
                <div class="class-name">{{ cls }}</div>
                <div class="class-requirement">{{ getIneligibilityReason(cls) }}</div>
              </button>
            }
          }
        </div>

        <button class="back-btn" (click)="previousStep()">(ESC) Back</button>
      </div>
    }

    <!-- Name and Password -->
    @if (currentStep() === 'NAME_PASSWORD') {
      <div class="wizard-step">
        <h2>ENTER NAME AND PASSWORD</h2>

        <div class="input-group">
          <label for="name">Name (1-15 characters):</label>
          <input
            id="name"
            type="text"
            maxlength="15"
            [value]="wizardState().name"
            (input)="setName($any($event.target).value)"
          />
        </div>

        <div class="input-group">
          <label for="password">Password (4-8 characters):</label>
          <input
            id="password"
            type="password"
            maxlength="8"
            [value]="wizardState().password"
            (input)="setPassword($any($event.target).value)"
          />
        </div>

        <button class="primary-btn" (click)="finishNamePassword()">(ENTER) Continue</button>
        <button class="back-btn" (click)="previousStep()">(ESC) Back</button>
      </div>
    }

    <!-- Confirmation -->
    @if (currentStep() === 'CONFIRM') {
      <div class="wizard-step">
        <h2>CONFIRM CHARACTER</h2>

        @if (wizardState(); as wizard) {
          <div class="character-summary">
            <p><strong>Name:</strong> {{ wizard.name }}</p>
            <p><strong>Race:</strong> {{ wizard.selectedRace }}</p>
            <p><strong>Alignment:</strong> {{ wizard.selectedAlignment }}</p>
            <p><strong>Class:</strong> {{ wizard.selectedClass }}</p>

            @if (wizard.rolledStats; as stats) {
              <div class="stats-summary">
                <p><strong>STR:</strong> {{ stats.strength }}</p>
                <p><strong>IQ:</strong> {{ stats.intelligence }}</p>
                <p><strong>PIE:</strong> {{ stats.piety }}</p>
                <p><strong>VIT:</strong> {{ stats.vitality }}</p>
                <p><strong>AGI:</strong> {{ stats.agility }}</p>
                <p><strong>LUK:</strong> {{ stats.luck }}</p>
              </div>
            }
          </div>
        }

        <button class="primary-btn" (click)="confirmCharacterCreation()">(ENTER) Create Character</button>
        <button class="back-btn" (click)="previousStep()">(ESC) Back</button>
      </div>
    }
  </main>
</div>
```

### Step 2: Add CharacterClass enum to component

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`

Add to imports and expose to template:

```typescript
export class TrainingGroundsComponent implements OnInit {
  // Expose enum to template
  readonly CharacterClass = CharacterClass

  // ... rest of component
}
```

### Step 3: Verify tests still pass

Run: `npm test -- --ci --testPathPattern="training-grounds.component"`

Expected: PASS (all 43 tests still passing)

### Step 4: Commit

```bash
git add src/app/training-grounds/
git commit -m "feat(training): implement character creation wizard UI template

- Complete 7-step wizard HTML template
- Race selection with stat modifiers
- Alignment selection with descriptions
- Stat rolling with reroll functionality
- Bonus point allocation with real-time class updates
- Class selection with eligibility indicators
- Name/password input forms
- Character confirmation summary
- All wizard steps with navigation
- Tests still passing (43 total)

Part of Phase 5: Training Grounds implementation - COMPLETE"
```

---

## Execution Summary

**Task 12 Complete:**
- ✅ Wizard state management (10 tests)
- ✅ Race selection UI (3 tests)
- ✅ Alignment selection UI (3 tests)
- ✅ Stat rolling UI (6 tests)
- ✅ Bonus point allocation UI (6 tests)
- ✅ Class selection UI (5 tests)
- ✅ Name/password input UI (6 tests)
- ✅ Character creation completion (4 tests)
- ✅ Complete HTML template
- ✅ Total: 43 tests passing

**Files Modified:**
- `src/app/training-grounds/training-grounds.component.ts`
- `src/app/training-grounds/training-grounds.component.html`
- `src/app/training-grounds/training-grounds.component.spec.ts`

**Ready For:**
- Task 13: Shop sell flow
- Task 14: Shop identify flow

---

## Notes for Implementation

**Reference Documentation:**
- `/docs/ui/scenes/02-training-grounds.md` - Complete wizard flow and requirements
- `/docs/game-design/classes.md` - Class requirements
- `/docs/game-design/races.md` - Race modifiers

**Testing Requirements:**
- All wizard steps tested independently
- State persistence across navigation tested
- Validation tested at each step
- Complete end-to-end wizard flow

**Common Pitfalls:**
- Remember to apply race modifiers to rolled stats
- Ninja class requires ALL stats at 17 (very rare!)
- Bonus points use authentic Wizardry formula (weighted 7-29)
- Name max 15 chars, password 4-8 chars
- Reset wizard after successful character creation

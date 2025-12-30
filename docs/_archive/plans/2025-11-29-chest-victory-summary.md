# Chest Victory Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display a victory summary (XP earned, gold found, items obtained, trap effects) after chest interaction before returning to maze.

**Architecture:** Add `pendingCombatRewards` to GameState to pass combat XP from combat scene to chest scene. Add new `VICTORY_SUMMARY` mode to chest scene state machine to display combined rewards after chest interaction.

**Tech Stack:** Angular 17+, TypeScript, Jest testing

---

## Task 1: Add PendingCombatRewards Type to GameState

**Files:**
- Modify: `src/app/types/GameState.ts:54-64`

**Step 1: Write the failing test**

Create test file:

```typescript
// src/app/types/__tests__/GameState.spec.ts
import { GameState, PendingCombatRewards } from '../GameState'

describe('GameState', () => {
  describe('PendingCombatRewards', () => {
    it('should allow pendingCombatRewards to be defined', () => {
      const rewards: PendingCombatRewards = {
        totalXP: 100,
        xpPerCharacter: 50,
        livingCharacterCount: 2,
        monstersDefeated: 3
      }

      const state: Partial<GameState> = {
        pendingCombatRewards: rewards
      }

      expect(state.pendingCombatRewards?.totalXP).toBe(100)
      expect(state.pendingCombatRewards?.xpPerCharacter).toBe(50)
      expect(state.pendingCombatRewards?.livingCharacterCount).toBe(2)
      expect(state.pendingCombatRewards?.monstersDefeated).toBe(3)
    })

    it('should allow pendingCombatRewards to be undefined', () => {
      const state: Partial<GameState> = {
        pendingCombatRewards: undefined
      }

      expect(state.pendingCombatRewards).toBeUndefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- GameState.spec`
Expected: FAIL with "Module '"../GameState"' has no exported member 'PendingCombatRewards'"

**Step 3: Write minimal implementation**

Add to `src/app/types/GameState.ts` before the GameState interface:

```typescript
/**
 * Combat rewards pending display after chest interaction.
 * Stored in GameState to persist across scene transitions.
 */
export interface PendingCombatRewards {
  totalXP: number
  xpPerCharacter: number
  livingCharacterCount: number
  monstersDefeated: number
}
```

Then add to the GameState interface after `pendingChest?`:

```typescript
  pendingCombatRewards?: PendingCombatRewards // Combat rewards awaiting victory summary display
```

**Step 4: Run test to verify it passes**

Run: `npm test -- GameState.spec`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/types/GameState.ts src/app/types/__tests__/GameState.spec.ts
git commit -m "feat: add PendingCombatRewards type to GameState"
```

---

## Task 2: Store Combat Rewards in GameState on Victory

**Files:**
- Modify: `src/app/scenes/combat-scene/combat.ts:1334-1346`
- Test: `src/app/scenes/combat-scene/combat.component.spec.ts`

**Step 1: Write the failing test**

Add to `src/app/scenes/combat-scene/combat.component.spec.ts` in the victory handling describe block:

```typescript
describe('Victory with chest', () => {
  it('stores pendingCombatRewards in game state when victory with chest', () => {
    // Setup: Force chest roll to succeed
    RandomService.queueNextValues([0.1]) // Below 30% threshold = chest

    // Setup combat with defeated monsters
    const monsters: CombatMonster[] = [{
      id: 'mon1',
      monsterId: 'orc',
      name: 'Orc',
      hp: 0,
      maxHp: 10,
      status: 'DEAD',
      xpValue: 50,
      goldMin: 10,
      goldMax: 20,
      level: 1
    }]

    component['combatState'] = {
      ...component['combatState'],
      monsters: [{ monsters, groupIndex: 0 }]
    }

    component['handleVictory']()

    const state = gameState.state()
    expect(state.pendingCombatRewards).toBeDefined()
    expect(state.pendingCombatRewards?.totalXP).toBeGreaterThan(0)
    expect(state.pendingCombatRewards?.livingCharacterCount).toBeGreaterThan(0)
    expect(state.pendingCombatRewards?.monstersDefeated).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component.spec --testNamePattern="stores pendingCombatRewards"`
Expected: FAIL with "expect(state.pendingCombatRewards).toBeDefined()" failure

**Step 3: Write minimal implementation**

Modify `handleVictoryWithChest` in `src/app/scenes/combat-scene/combat.ts` around line 1334-1340:

Change from:
```typescript
    this.gameState.updateState(state => ({
      ...state,
      roster: newRoster,
      combat: undefined,
      pendingChest: chest
    }))
```

To:
```typescript
    this.gameState.updateState(state => ({
      ...state,
      roster: newRoster,
      combat: undefined,
      pendingChest: chest,
      pendingCombatRewards: {
        totalXP: rewards.totalXP,
        xpPerCharacter: rewards.xpPerCharacter,
        livingCharacterCount: rewards.livingCharacterCount,
        monstersDefeated: allMonsters.length
      }
    }))
```

Note: Need to pass `allMonsters` to the method. Add it as a parameter:

```typescript
private handleVictoryWithChest(
  newRoster: Map<string, Character>,
  rewards: VictoryRewards,
  party: { position: { x: number; y: number; level: number; facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' }; members: string[]; gold: number },
  maxMonsterLevel: number,
  allMonsters: CombatMonster[]  // Add this parameter
): void {
```

And update the call site in `handleVictory()`:
```typescript
this.handleVictoryWithChest(newRoster, rewards, party, maxMonsterLevel, allMonsters)
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component.spec --testNamePattern="stores pendingCombatRewards"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/combat-scene/combat.ts src/app/scenes/combat-scene/combat.component.spec.ts
git commit -m "feat: store pendingCombatRewards in GameState on chest victory"
```

---

## Task 3: Add VICTORY_SUMMARY Mode to Chest Component

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:24-30` (ChestMode type)
- Modify: `src/app/scenes/chest/chest.component.ts:67-82` (add signals)

**Step 1: Write the failing test**

Add to `src/app/scenes/chest/__tests__/chest.component.spec.ts`:

```typescript
describe('VICTORY_SUMMARY mode', () => {
  it('has VICTORY_SUMMARY as valid ChestMode', () => {
    component.mode.set('VICTORY_SUMMARY')
    expect(component.mode()).toBe('VICTORY_SUMMARY')
  })

  it('exposes pendingCombatRewards computed signal', () => {
    // Setup pending rewards in game state
    gameState.updateState(s => ({
      ...s,
      pendingCombatRewards: {
        totalXP: 100,
        xpPerCharacter: 50,
        livingCharacterCount: 2,
        monstersDefeated: 3
      }
    }))

    expect(component.pendingCombatRewards()).toBeDefined()
    expect(component.pendingCombatRewards()?.totalXP).toBe(100)
  })

  it('exposes chestResults signal', () => {
    component.chestResults.set({
      goldObtained: 50,
      itemsObtained: [],
      trapTriggered: true,
      trapType: 'GAS BOMB',
      trapMessage: 'Everyone is poisoned!'
    })

    expect(component.chestResults()?.goldObtained).toBe(50)
    expect(component.chestResults()?.trapTriggered).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="VICTORY_SUMMARY"`
Expected: FAIL with type error or undefined property

**Step 3: Write minimal implementation**

Modify `src/app/scenes/chest/chest.component.ts`:

1. Update ChestMode type (line 24-30):
```typescript
type ChestMode =
  | 'CHARACTER_SELECT'
  | 'ACTION_SELECT'
  | 'CASTER_SELECT'
  | 'TRAP_NAME_INPUT'
  | 'INVENTORY_WARNING'
  | 'RESULT_DISPLAY'
  | 'VICTORY_SUMMARY';  // NEW
```

2. Add signals after line 82 (after inventoryWarning signal):
```typescript
  // Chest interaction results for victory summary
  readonly chestResults = signal<{
    goldObtained: number
    itemsObtained: Item[]
    trapTriggered: boolean
    trapType: TrapType | null
    trapMessage: string | null
  } | null>(null)

  // Computed signal for pending combat rewards from game state
  readonly pendingCombatRewards = computed(() => {
    return this.gameState.state().pendingCombatRewards
  })
```

3. Add Item import at top:
```typescript
import { Item } from '@models/Item';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="VICTORY_SUMMARY"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: add VICTORY_SUMMARY mode and signals to chest component"
```

---

## Task 4: Update distributeTreasure to Store Results

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:541-589` (distributeTreasure method)

**Step 1: Write the failing test**

Add to chest.component.spec.ts:

```typescript
describe('distributeTreasure', () => {
  it('stores chest results after distribution', () => {
    // Setup opener and chest
    const opener = partyMembers[0]
    component.selectedOpener.set(opener)
    component.chest.set({
      id: 'test-chest',
      trapped: false,
      trapType: null,
      trapIdentified: true,
      trapDisarmed: false,
      rewardTier: 1,
      contents: { gold: 100, items: [] },
      sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
      mazeLevel: 1,
      source: 'combat_victory'
    })

    component['distributeTreasure'](component.chest()!, opener)

    expect(component.chestResults()).toBeDefined()
    expect(component.chestResults()?.goldObtained).toBe(100)
    expect(component.chestResults()?.trapTriggered).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="stores chest results"`
Expected: FAIL with chestResults being null

**Step 3: Write minimal implementation**

Modify `distributeTreasure` in `src/app/scenes/chest/chest.component.ts` to store results before setting mode:

Add after line 588 (after logger.debug) and before setting mode:

```typescript
    // Store results for victory summary
    this.chestResults.set({
      goldObtained: result.goldAdded,
      itemsObtained: result.itemsReceived,
      trapTriggered: false,
      trapType: null,
      trapMessage: null
    })
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="stores chest results"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: store chest results after treasure distribution"
```

---

## Task 5: Update triggerTrap to Store Trap Results

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:439-486` (triggerTrap method)

**Step 1: Write the failing test**

```typescript
describe('triggerTrap', () => {
  it('stores trap results when trap triggers', () => {
    const opener = partyMembers[0]
    component.selectedOpener.set(opener)
    component.chest.set({
      id: 'test-chest',
      trapped: true,
      trapType: 'POISON NEEDLE',
      trapIdentified: false,
      trapDisarmed: false,
      rewardTier: 1,
      contents: { gold: 50, items: [] },
      sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
      mazeLevel: 1,
      source: 'combat_victory'
    })

    component['triggerTrap'](component.chest()!, opener)

    expect(component.chestResults()?.trapTriggered).toBe(true)
    expect(component.chestResults()?.trapType).toBe('POISON NEEDLE')
    expect(component.chestResults()?.trapMessage).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="stores trap results"`
Expected: FAIL with trapTriggered being false

**Step 3: Write minimal implementation**

Modify `triggerTrap` method. After the `applyTrapDamage(result)` call (around line 468), update the chestResults before distributeTreasure:

```typescript
    // Store trap info for victory summary (will be combined with treasure results)
    const trapInfo = {
      trapTriggered: true,
      trapType: chest.trapType,
      trapMessage: result.message
    }
```

Then modify `distributeTreasure` call at line 485 to pass trap info, OR update chestResults in distributeTreasure.

Better approach: Store trap info in a signal, then merge in distributeTreasure:

Add signal:
```typescript
  private readonly pendingTrapInfo = signal<{
    trapTriggered: boolean
    trapType: TrapType | null
    trapMessage: string | null
  } | null>(null)
```

In triggerTrap, before distributeTreasure:
```typescript
    this.pendingTrapInfo.set({
      trapTriggered: true,
      trapType: chest.trapType,
      trapMessage: result.message
    })
```

In distributeTreasure, when setting chestResults:
```typescript
    const trapInfo = this.pendingTrapInfo() ?? {
      trapTriggered: false,
      trapType: null,
      trapMessage: null
    }

    this.chestResults.set({
      goldObtained: result.goldAdded,
      itemsObtained: result.itemsReceived,
      ...trapInfo
    })

    // Clear pending trap info
    this.pendingTrapInfo.set(null)
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="stores trap results"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: store trap results in chestResults signal"
```

---

## Task 6: Update handleContinue to Show Victory Summary

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:792-809` (handleContinue method)

**Step 1: Write the failing test**

```typescript
describe('handleContinue', () => {
  it('transitions to VICTORY_SUMMARY when coming from combat', () => {
    // Setup: pending combat rewards indicates this came from combat
    gameState.updateState(s => ({
      ...s,
      pendingCombatRewards: {
        totalXP: 100,
        xpPerCharacter: 50,
        livingCharacterCount: 2,
        monstersDefeated: 3
      }
    }))

    component.mode.set('RESULT_DISPLAY')
    component.chest.set({
      id: 'test',
      trapped: false,
      trapType: null,
      trapIdentified: true,
      trapDisarmed: false,
      rewardTier: 1,
      contents: { gold: 50, items: [] },
      sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
      mazeLevel: 1,
      source: 'combat_victory'
    })

    component['handleContinue']()

    expect(component.mode()).toBe('VICTORY_SUMMARY')
    expect(navigation.navigateTo).not.toHaveBeenCalled()
  })

  it('navigates to maze from VICTORY_SUMMARY', () => {
    component.mode.set('VICTORY_SUMMARY')

    component['handleContinue']()

    expect(navigation.navigateTo).toHaveBeenCalledWith('maze')
  })

  it('clears pendingCombatRewards when navigating to maze', () => {
    gameState.updateState(s => ({
      ...s,
      pendingCombatRewards: {
        totalXP: 100,
        xpPerCharacter: 50,
        livingCharacterCount: 2,
        monstersDefeated: 3
      }
    }))
    component.mode.set('VICTORY_SUMMARY')

    component['handleContinue']()

    expect(gameState.state().pendingCombatRewards).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="transitions to VICTORY_SUMMARY"`
Expected: FAIL with mode being unchanged or navigating to maze

**Step 3: Write minimal implementation**

Replace `handleContinue` method:

```typescript
  private handleContinue(): void {
    const chest = this.chest()
    const currentMode = this.mode()
    const hasCombatRewards = !!this.gameState.state().pendingCombatRewards

    console.log('[Chest] handleContinue called:', {
      hasChest: !!chest,
      currentMode,
      hasCombatRewards,
      lastActionMessage: this.lastActionMessage()
    })

    if (currentMode === 'RESULT_DISPLAY' && hasCombatRewards) {
      // From combat - show victory summary before maze
      console.log('[Chest] Transitioning to VICTORY_SUMMARY')
      this.mode.set('VICTORY_SUMMARY')
      return
    }

    if (currentMode === 'VICTORY_SUMMARY') {
      // After victory summary - clear rewards and go to maze
      console.log('[Chest] Navigating to maze from VICTORY_SUMMARY')
      this.clearCombatRewardsAndNavigate()
      return
    }

    // Non-combat chest or exploration - go directly to maze
    console.log('[Chest] Navigating to maze from RESULT_DISPLAY (no combat rewards)')
    this.navigation.navigateTo('maze')
  }

  private clearCombatRewardsAndNavigate(): void {
    this.gameState.updateState(state => ({
      ...state,
      pendingCombatRewards: undefined
    }))
    this.navigation.navigateTo('maze')
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="transitions to VICTORY_SUMMARY|navigates to maze from VICTORY_SUMMARY|clears pendingCombatRewards"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: show victory summary before navigating to maze"
```

---

## Task 7: Update handleLeave to Show Victory Summary

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:756-761` (handleLeave method)

**Step 1: Write the failing test**

```typescript
describe('handleLeave', () => {
  it('shows victory summary when leaving chest from combat', () => {
    gameState.updateState(s => ({
      ...s,
      pendingCombatRewards: {
        totalXP: 100,
        xpPerCharacter: 50,
        livingCharacterCount: 2,
        monstersDefeated: 3
      }
    }))
    component.mode.set('ACTION_SELECT')

    component['handleLeave']()

    expect(component.mode()).toBe('VICTORY_SUMMARY')
    expect(component.chestResults()?.goldObtained).toBe(0)
    expect(navigation.navigateTo).not.toHaveBeenCalled()
  })

  it('navigates directly to maze when leaving non-combat chest', () => {
    // No pendingCombatRewards
    component.mode.set('ACTION_SELECT')

    component['handleLeave']()

    expect(navigation.navigateTo).toHaveBeenCalledWith('maze')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="shows victory summary when leaving"`
Expected: FAIL

**Step 3: Write minimal implementation**

Replace `handleLeave` method:

```typescript
  private handleLeave(): void {
    const hasCombatRewards = !!this.gameState.state().pendingCombatRewards

    console.log('[Chest] handleLeave called:', { hasCombatRewards })

    if (hasCombatRewards) {
      // From combat - show victory summary even if chest abandoned
      console.log('[Chest] Showing victory summary (chest abandoned)')
      this.chestResults.set({
        goldObtained: 0,
        itemsObtained: [],
        trapTriggered: false,
        trapType: null,
        trapMessage: null
      })
      this.mode.set('VICTORY_SUMMARY')
      return
    }

    console.log('[Chest] handleLeave - navigating to maze')
    this.logger.debug('[Chest] Leaving chest')
    this.navigation.navigateTo('maze')
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="shows victory summary when leaving|navigates directly to maze"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: show victory summary when leaving chest from combat"
```

---

## Task 8: Add Victory Summary Footer Menu Items

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:114-186` (footerMenuItems computed)

**Step 1: Write the failing test**

```typescript
describe('footerMenuItems', () => {
  it('shows continue button in VICTORY_SUMMARY mode', () => {
    component.mode.set('VICTORY_SUMMARY')

    const items = component.footerMenuItems()

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('continue')
    expect(items[0].label).toBe('Return to Maze')
    expect(items[0].shortcut).toBe('ENTER')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="shows continue button in VICTORY_SUMMARY"`
Expected: FAIL (may show wrong items or no items)

**Step 3: Write minimal implementation**

Add case for VICTORY_SUMMARY in footerMenuItems computed (after RESULT_DISPLAY case, around line 153):

```typescript
    // In victory summary mode
    if (mode === 'VICTORY_SUMMARY') {
      return [
        { id: 'continue', label: 'Return to Maze', shortcut: 'ENTER', enabled: true }
      ];
    }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="shows continue button in VICTORY_SUMMARY"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: add footer menu for victory summary mode"
```

---

## Task 9: Handle Enter Key in Victory Summary Mode

**Files:**
- Modify: `src/app/scenes/chest/chest.component.ts:241-327` (handleKeyboard method)

**Step 1: Write the failing test**

```typescript
describe('keyboard handling', () => {
  it('handles ENTER in VICTORY_SUMMARY mode', () => {
    component.mode.set('VICTORY_SUMMARY')
    const spy = jest.spyOn(component as any, 'handleContinue')

    component.handleKeyboard(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(spy).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chest.component.spec --testNamePattern="handles ENTER in VICTORY_SUMMARY"`
Expected: FAIL

**Step 3: Write minimal implementation**

Update the Enter key handling (around line 261-265) to include VICTORY_SUMMARY:

```typescript
    // Handle Enter for continue
    if (key === 'ENTER' && (mode === 'RESULT_DISPLAY' || mode === 'VICTORY_SUMMARY')) {
      console.log('[Chest] ENTER pressed in', mode, '- calling handleContinue')
      this.handleContinue()
      return
    }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chest.component.spec --testNamePattern="handles ENTER in VICTORY_SUMMARY"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/chest/chest.component.ts src/app/scenes/chest/__tests__/chest.component.spec.ts
git commit -m "feat: handle Enter key in victory summary mode"
```

---

## Task 10: Add Victory Summary Template

**Files:**
- Modify: `src/app/scenes/chest/chest.component.html:93-101`

**Step 1: Verify template renders (manual test)**

This is a template-only change. We'll add the HTML and verify visually.

**Step 2: Write the template**

Add after line 101 (after result-display closing tag), before message display:

```html
    <!-- Victory Summary Mode -->
    @if (mode() === 'VICTORY_SUMMARY') {
      <div class="victory-summary">
        <h2 class="victory-title">VICTORY!</h2>

        <!-- Combat XP Section -->
        @if (pendingCombatRewards(); as rewards) {
          <div class="xp-section">
            <div class="section-header">Experience Earned</div>
            <div class="reward-row">
              <span class="label">Monsters Defeated:</span>
              <span class="value">{{ rewards.monstersDefeated }}</span>
            </div>
            <div class="reward-row">
              <span class="label">Total XP:</span>
              <span class="value highlight">{{ rewards.totalXP }}</span>
            </div>
            <div class="reward-row">
              <span class="label">XP per Character:</span>
              <span class="value">{{ rewards.xpPerCharacter }}</span>
            </div>
            <div class="reward-row muted">
              <span class="label">Living Characters:</span>
              <span class="value">{{ rewards.livingCharacterCount }}</span>
            </div>
          </div>
        }

        <!-- Chest Rewards Section -->
        @if (chestResults(); as results) {
          <div class="treasure-section">
            <div class="section-header">Treasure Found</div>

            @if (results.goldObtained > 0) {
              <div class="reward-row">
                <span class="label">Gold:</span>
                <span class="value gold">{{ results.goldObtained }}</span>
              </div>
            }

            @if (results.itemsObtained.length > 0) {
              <div class="items-found">
                <div class="items-header">Items ({{ results.itemsObtained.length }}):</div>
                @for (item of results.itemsObtained; track item.id) {
                  <div class="item-row">
                    <span class="item-name">{{ item.name }}</span>
                    @if (!item.identified) {
                      <span class="unidentified">(unidentified)</span>
                    }
                  </div>
                }
              </div>
            }

            @if (results.goldObtained === 0 && results.itemsObtained.length === 0) {
              <div class="reward-row muted">
                <span class="label">Chest abandoned - no treasure collected</span>
              </div>
            }
          </div>

          <!-- Trap Effects Section -->
          @if (results.trapTriggered) {
            <div class="trap-section">
              <div class="section-header warning">Trap Triggered!</div>
              <div class="trap-type">{{ results.trapType }}</div>
              <div class="trap-effects">{{ results.trapMessage }}</div>
            </div>
          }
        }

        <p class="continue-hint">Press ENTER to return to the maze...</p>
      </div>
    }
```

**Step 3: Commit**

```bash
git add src/app/scenes/chest/chest.component.html
git commit -m "feat: add victory summary template"
```

---

## Task 11: Add Victory Summary Styles

**Files:**
- Modify: `src/app/scenes/chest/chest.component.scss:272-304`

**Step 1: Add styles**

Add after the result-display section (after line 272):

```scss
// ============================================
// VICTORY SUMMARY MODE
// ============================================
.victory-summary {
  width: 100%;
  max-width: 500px;
  text-align: center;

  .victory-title {
    font-family: var(--font-display);
    font-size: var(--font-size-2xl);
    color: var(--color-gold-bright);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-4);
    text-shadow: 0 0 10px rgba(212, 165, 116, 0.5);
  }

  .section-header {
    font-family: var(--font-display);
    font-size: var(--font-size-base);
    color: var(--color-text-gold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--color-border);

    &.warning {
      color: var(--color-danger);
      border-color: var(--color-danger);
    }
  }

  .xp-section,
  .treasure-section,
  .trap-section {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--card-border-radius);
    padding: var(--space-3);
    margin-bottom: var(--space-3);
    text-align: left;
  }

  .reward-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) 0;

    .label {
      color: var(--color-text-secondary);
    }

    .value {
      color: var(--color-text-primary);
      font-weight: 600;

      &.highlight {
        color: var(--color-gold-bright);
        font-size: var(--font-size-lg);
      }

      &.gold {
        color: var(--color-gold-primary);
      }
    }

    &.muted {
      .label, .value {
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
      }
    }
  }

  .items-found {
    margin-top: var(--space-2);

    .items-header {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-1);
    }

    .item-row {
      padding: var(--space-1) var(--space-2);
      background: var(--color-bg-dark);
      border-radius: 2px;
      margin-bottom: var(--space-1);
      display: flex;
      justify-content: space-between;

      .item-name {
        color: var(--color-text-primary);
      }

      .unidentified {
        color: var(--color-text-muted);
        font-style: italic;
        font-size: var(--font-size-sm);
      }
    }
  }

  .trap-section {
    border-color: var(--color-danger);
    background: rgba(239, 68, 68, 0.1);

    .trap-type {
      font-weight: 600;
      color: var(--color-danger);
      margin-bottom: var(--space-2);
    }

    .trap-effects {
      color: var(--color-text-primary);
      line-height: 1.5;
    }
  }

  .continue-hint {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin-top: var(--space-4);
    animation: blink 2s ease-in-out infinite;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/scenes/chest/chest.component.scss
git commit -m "feat: add victory summary styles"
```

---

## Task 12: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run app and test manually**

Run: `npm start`

Test flow:
1. Enter maze
2. Trigger combat
3. Win combat (should get chest ~70% of time)
4. Interact with chest (open or leave)
5. Verify victory summary shows with XP + chest rewards
6. Press Enter to return to maze
7. Verify maze loads correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: verify chest victory summary integration"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add PendingCombatRewards type | GameState.ts |
| 2 | Store rewards in combat | combat.ts |
| 3 | Add VICTORY_SUMMARY mode | chest.component.ts |
| 4 | Store treasure results | chest.component.ts |
| 5 | Store trap results | chest.component.ts |
| 6 | Update handleContinue | chest.component.ts |
| 7 | Update handleLeave | chest.component.ts |
| 8 | Add footer menu | chest.component.ts |
| 9 | Handle Enter key | chest.component.ts |
| 10 | Add template | chest.component.html |
| 11 | Add styles | chest.component.scss |
| 12 | Integration test | - |

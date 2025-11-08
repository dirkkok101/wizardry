# Bonus Point Allocation Implementation Spec

**Date**: 2025-11-07
**Status**: Draft
**Target**: Character Creation Scene

## Executive Summary

The character creation wizard currently rolls 3d6 for each stat AND rolls a bonus point pool (7-29), but never uses the bonus points. According to Wizardry 1 documentation, the authentic system uses **only** bonus point allocation (no 3d6 rolls). This spec defines how to implement the missing allocation step and fix the stat generation system.

---

## Current State Analysis

### Current Flow (5 Steps)
1. **SELECT_RACE** - Choose race (shows base stats)
2. **SELECT_ALIGNMENT** - Choose alignment (Good/Neutral/Evil)
3. **ROLL_STATS** - Click "Roll Dice" button
   - Rolls 3d6 for each stat (STR, INT, PIE, VIT, AGI, LUC)
   - Rolls bonus points pool (7-29)
   - Auto-advances to SELECT_CLASS
4. **SELECT_CLASS** - Choose eligible class
5. **NAME_CHARACTER** - Enter character name

### Current Stat Formula
```
FinalStat = RaceBaseStat + 3d6Roll + 0
                                     └── Bonus points never used!
```

### Display Format (Just Implemented)
```
Base + Roll + Bonus = Total
  8  +  11  +   0   =  19      (STR)
  8  +   7  +   0   =  15      (INT)
  ...

Bonus Points Available: 23 (Not yet allocatable)
```

### Key Issues
1. ❌ **3d6 rolls are not authentic Wizardry** - Original uses pure allocation
2. ❌ **Bonus points rolled but never used** - `allocateBonusPoints()` exists but not wired
3. ❌ **No player agency** - Stats are pure RNG, no strategic choices
4. ❌ **Class eligibility is luck-based** - Can't target specific classes

---

## Authentic Wizardry System (Validated)

### Reference: Original Wizardry 1 (1981)

**Step 3: Roll Bonus Points**
- Roll 1d4 + 6 = 7-10 base points (90% probability)
- 1/11 chance: add +10 → 17-20 points (9.25% probability)
- 1/11 chance again if <20: add +10 → 27-29 points (0.75% probability)
- Player can **reroll unlimited times** until satisfied

**Step 4: Allocate Bonus Points**
- Display race base stats (e.g., Human: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9)
- Player distributes ALL bonus points across 6 stats
- No partial allocation - must spend all points
- Stats clamped to [3, 18] range

**Stat Formula**
```
FinalStat = RaceBaseStat + AllocatedBonus
Clamped to [3, 18]
```

**Example** (Human Fighter, 10 bonus points):
```
Race Base:  STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
Allocate:   +7 STR, +0 INT, +0 PIE, +3 VIT, +0 AGI, +0 LUC
Final:      STR 15, INT 8, PIE 5, VIT 11, AGI 8, LUC 9
```

**Example** (Hobbit Lord attempt, 28 bonus points):
```
Race Base:  STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 15
Need:       STR 15, INT 12, PIE 12, VIT 15, AGI 14, LUC 15
Required:   +10 STR, +5 INT, +5 PIE, +9 VIT, +4 AGI, +0 LUC = 33 points
Result:     ❌ CANNOT MAKE LORD (need 33, have 28) → Reroll
```

---

## Design Decisions

### Decision 1: Remove 3d6 Rolls Entirely

**Option A (Chosen)**: Pure bonus point allocation (authentic)
- Remove `roll3d6()` calls
- Stats start at race base values
- Players allocate entire pool
- ✅ Matches original Wizardry
- ✅ Gives players strategic control
- ✅ Enables targeted class builds

**Option B (Rejected)**: Hybrid system (3d6 + bonus)
- Keep 3d6 rolls for variance
- Add bonus points on top
- ❌ Not authentic to original
- ❌ Makes elite classes even harder
- ❌ Reduces player agency

### Decision 2: New Wizard Flow (6 Steps)

```
1. SELECT_RACE       → Pick race, see base stats
2. SELECT_ALIGNMENT  → Pick alignment
3. ROLL_BONUS_POINTS → Roll pool (7-29), unlimited rerolls
4. ALLOCATE_POINTS   → Distribute points across stats [NEW STEP]
5. SELECT_CLASS      → Pick from eligible classes
6. NAME_CHARACTER    → Enter character name
```

### Decision 3: Allocation UI Pattern

Use **increment/decrement controls** on character sheet (right panel):
- Each stat has +/- buttons
- Keyboard shortcuts: Arrow keys or +/- on number row
- Real-time validation (can't go negative, can't exceed 18)
- Remaining points counter at top
- Must allocate ALL points before continuing

### Decision 4: Reroll vs. Reallocate

**Reroll** (Step 3):
- Generates new bonus point pool
- Clears any allocations
- Returns to ROLL_BONUS_POINTS step

**Reallocate** (Step 4):
- Keeps same bonus point pool
- Clears current allocation
- Stays in ALLOCATE_POINTS step

---

## Implementation Plan

### Phase 1: Update Data Layer

#### 1.1 Modify `CharacterCreationService.rollStats()`

**Current**:
```typescript
static rollStats(): RolledStats {
  return {
    strength: this.roll3d6(),      // ❌ Remove
    intelligence: this.roll3d6(),  // ❌ Remove
    piety: this.roll3d6(),         // ❌ Remove
    vitality: this.roll3d6(),      // ❌ Remove
    agility: this.roll3d6(),       // ❌ Remove
    luck: this.roll3d6(),          // ❌ Remove
    bonusPoints: this.rollBonusPoints()
  }
}
```

**New**:
```typescript
static rollBonusPointsOnly(): RolledStats {
  return {
    strength: 0,      // ✅ Start at 0 (not allocated)
    intelligence: 0,
    piety: 0,
    vitality: 0,
    agility: 0,
    luck: 0,
    bonusPoints: this.rollBonusPoints()
  }
}
```

#### 1.2 Keep `allocateBonusPoints()` As-Is

```typescript
// Already exists - no changes needed
static allocateBonusPoints(
  stats: RolledStats,
  stat: keyof BaseStats,
  points: number
): RolledStats {
  if (stats.bonusPoints < points) {
    throw new Error('Not enough bonus points')
  }

  return {
    ...stats,
    [stat]: stats[stat] + points,
    bonusPoints: stats.bonusPoints - points
  }
}
```

#### 1.3 Add Helper: `resetAllocations()`

```typescript
static resetAllocations(currentStats: RolledStats): RolledStats {
  const totalAllocated =
    currentStats.strength +
    currentStats.intelligence +
    currentStats.piety +
    currentStats.vitality +
    currentStats.agility +
    currentStats.luck;

  return {
    strength: 0,
    intelligence: 0,
    piety: 0,
    vitality: 0,
    agility: 0,
    luck: 0,
    bonusPoints: currentStats.bonusPoints + totalAllocated
  };
}
```

### Phase 2: Update Component Layer

#### 2.1 Add New Wizard Step

```typescript
enum CreationStep {
  SELECT_RACE = 'SELECT_RACE',
  SELECT_ALIGNMENT = 'SELECT_ALIGNMENT',
  ROLL_BONUS_POINTS = 'ROLL_BONUS_POINTS',       // Renamed from ROLL_STATS
  ALLOCATE_POINTS = 'ALLOCATE_POINTS',           // ✅ NEW STEP
  SELECT_CLASS = 'SELECT_CLASS',
  NAME_CHARACTER = 'NAME_CHARACTER'
}
```

#### 2.2 Update Step Metadata

```typescript
stepTitle = computed(() => {
  switch(this.currentStep()) {
    case CreationStep.SELECT_RACE: return 'Choose Your Race';
    case CreationStep.SELECT_ALIGNMENT: return 'Choose Your Alignment';
    case CreationStep.ROLL_BONUS_POINTS: return 'Roll Bonus Points';
    case CreationStep.ALLOCATE_POINTS: return 'Allocate Bonus Points';  // NEW
    case CreationStep.SELECT_CLASS: return 'Choose Your Class';
    case CreationStep.NAME_CHARACTER: return 'Name Your Character';
  }
});

stepNumber = computed(() => {
  const steps = [
    CreationStep.SELECT_RACE,
    CreationStep.SELECT_ALIGNMENT,
    CreationStep.ROLL_BONUS_POINTS,
    CreationStep.ALLOCATE_POINTS,     // NEW (step 4 of 6)
    CreationStep.SELECT_CLASS,
    CreationStep.NAME_CHARACTER
  ];
  return steps.indexOf(this.currentStep()) + 1;
});
```

#### 2.3 Update `rollStats()` → `rollBonusPoints()`

```typescript
async rollBonusPoints() {
  this.isRolling.set(true);

  // Simulate dice roll animation
  await new Promise(resolve => setTimeout(resolve, this.ROLL_ANIMATION_DURATION_MS));

  const rolled = CharacterCreationService.rollBonusPointsOnly();  // Changed
  this.rolledStats.set(rolled);
  this.isRolling.set(false);

  // Lock race and alignment after first roll
  if (!this.isLocked()) {
    this.isLocked.set(true);
  }

  // Auto-advance to ALLOCATE_POINTS (changed from SELECT_CLASS)
  this.advanceToAllocatePoints();
}
```

#### 2.4 Add Allocation Methods

```typescript
// Allocate points to a specific stat
allocatePoint(stat: keyof BaseStats) {
  const current = this.rolledStats();
  if (!current || current.bonusPoints <= 0) return;

  // Check if adding would exceed 18 cap
  const raceBase = this.getRaceBaseStat(stat);
  const currentAllocation = current[stat];
  if (raceBase + currentAllocation + 1 > 18) return;

  try {
    const updated = CharacterCreationService.allocateBonusPoints(current, stat, 1);
    this.rolledStats.set(updated);
  } catch (error) {
    console.error('Allocation failed:', error);
  }
}

// Remove point from a specific stat
deallocatePoint(stat: keyof BaseStats) {
  const current = this.rolledStats();
  if (!current) return;

  const currentAllocation = current[stat];
  if (currentAllocation <= 0) return;

  // Manually reverse allocation
  this.rolledStats.set({
    ...current,
    [stat]: currentAllocation - 1,
    bonusPoints: current.bonusPoints + 1
  });
}

// Reset all allocations
resetAllocations() {
  const current = this.rolledStats();
  if (!current) return;

  const reset = CharacterCreationService.resetAllocations(current);
  this.rolledStats.set(reset);
}

// Helper: Get race base stat
private getRaceBaseStat(stat: keyof BaseStats): number {
  const raceData = this.raceData();
  if (!raceData) return 0;

  const mapping: Record<keyof BaseStats, keyof typeof raceData.baseStats> = {
    strength: 'str',
    intelligence: 'int',
    piety: 'pie',
    vitality: 'vit',
    agility: 'agi',
    luck: 'luc'
  };

  return raceData.baseStats[mapping[stat]];
}
```

#### 2.5 Add Validation

```typescript
// Check if all points allocated
allPointsAllocated = computed(() => {
  const stats = this.rolledStats();
  return stats ? stats.bonusPoints === 0 : false;
});
```

#### 2.6 Update Footer Menu Items

```typescript
case CreationStep.ROLL_BONUS_POINTS:
  items.push({ id: 'reroll', label: 'REROLL', shortcut: 'R', enabled: !this.isRolling() });
  items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.rolledStats() !== null });
  items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
  break;

case CreationStep.ALLOCATE_POINTS:
  items.push({ id: 'reset', label: 'RESET ALLOCATION', shortcut: 'R', enabled: true });
  items.push({ id: 'reroll', label: 'REROLL POOL', shortcut: 'SHIFT+R', enabled: true });
  items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.allPointsAllocated() });
  items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
  break;
```

### Phase 3: Update Template Layer

#### 3.1 ROLL_BONUS_POINTS Step (Left Panel)

```html
@case (CreationStep.ROLL_BONUS_POINTS) {
  <div class="roll-bonus-points">
    @if (rolledStats()) {
      <div class="bonus-result">
        <div class="bonus-amount">{{ rolledStats()!.bonusPoints }} Points</div>
        <div class="bonus-grade">
          @if (rolledStats()!.bonusPoints >= 27) {
            <span class="grade-exceptional">⭐ EXCEPTIONAL ROLL! ⭐</span>
          } @else if (rolledStats()!.bonusPoints >= 17) {
            <span class="grade-lucky">✨ Lucky Roll!</span>
          } @else {
            <span class="grade-normal">Normal Roll</span>
          }
        </div>
        <p class="bonus-hint">
          You can reroll as many times as you like. Elite classes need 17+ points.
        </p>
      </div>
    } @else {
      <button
        class="roll-button"
        [disabled]="isRolling()"
        (click)="rollBonusPoints()"
      >
        {{ isRolling() ? 'Rolling...' : 'ROLL BONUS POINTS' }} <span class="shortcut">(R)</span>
      </button>
      <div class="roll-explanation">
        <p>Roll for bonus points to allocate to your stats. You can reroll unlimited times.</p>
        <ul>
          <li>7-10 points: Normal (90%)</li>
          <li>17-20 points: Lucky (9.25%)</li>
          <li>27-29 points: Exceptional (0.75%)</li>
        </ul>
      </div>
    }
  </div>
}
```

#### 3.2 ALLOCATE_POINTS Step (Left Panel)

```html
@case (CreationStep.ALLOCATE_POINTS) {
  <div class="allocate-points">
    <div class="allocation-header">
      <div class="points-remaining">
        <span class="label">Points Remaining:</span>
        <span class="value" [class.zero]="allPointsAllocated()">
          {{ rolledStats()!.bonusPoints }}
        </span>
      </div>
      @if (!allPointsAllocated()) {
        <div class="allocation-warning">
          ⚠️ You must allocate all points before continuing
        </div>
      }
    </div>

    <div class="allocation-grid">
      @for (stat of statList; track stat.key) {
        <div class="allocation-row">
          <span class="stat-label">{{ stat.name }}:</span>

          <button
            class="btn-decrement"
            [disabled]="getAllocated(stat.key) <= 0"
            (click)="deallocatePoint(stat.key)"
          >
            −
          </button>

          <span class="allocated-amount">
            {{ getAllocated(stat.key) }}
          </span>

          <button
            class="btn-increment"
            [disabled]="!canAllocate(stat.key)"
            (click)="allocatePoint(stat.key)"
          >
            +
          </button>

          <span class="final-value">
            = {{ getFinalStat(stat.key) }}
          </span>
        </div>
      }
    </div>

    <div class="allocation-hint">
      Use +/- buttons or arrow keys to allocate points. Max 18 per stat.
    </div>
  </div>
}
```

#### 3.3 Update Character Sheet Display (Right Panel)

```html
<!-- Stats -->
@if (rolledStats() && finalStats()) {
  <div class="sheet-section stats">
    <label>Attributes:</label>
    <div class="stat-list">
      @if (currentStep() === CreationStep.ALLOCATE_POINTS) {
        <!-- Allocation view: Show Base + Allocated = Total -->
        <div class="stat-header">
          <span class="stat-name"></span>
          <span class="stat-breakdown-label">Base + Allocated = Total</span>
        </div>
        @for (stat of statNames; track stat) {
          <div class="stat-row">
            <span class="stat-name">{{ stat }}:</span>
            <span class="stat-breakdown">
              <span class="base">{{ getRaceBaseStat(stat) }}</span> +
              <span class="allocated">{{ getAllocated(stat) }}</span> =
              <span class="total">{{ getFinalStat(stat) }}</span>
            </span>
          </div>
        }
      } @else {
        <!-- Final view: Keep existing display -->
        <div class="stat-header">
          <span class="stat-name"></span>
          <span class="stat-breakdown-label">Base + Roll + Bonus = Total</span>
        </div>
        <!-- existing stat rows -->
      }

      @if (currentStep() === CreationStep.ALLOCATE_POINTS) {
        <div class="bonus-points">
          <strong>Points Remaining:</strong> {{ rolledStats()!.bonusPoints }}
        </div>
      } @else if (currentStep() === CreationStep.ROLL_BONUS_POINTS) {
        <div class="bonus-points">
          <strong>Bonus Points Rolled:</strong> {{ rolledStats()!.bonusPoints }}
          <span class="bonus-note">Next: Allocate these points</span>
        </div>
      } @else {
        <div class="bonus-points">
          <strong>Total Allocated:</strong> {{ getTotalAllocated() }}
        </div>
      }
    </div>
  </div>
}
```

### Phase 4: Update Keyboard Shortcuts

```typescript
private handleRollBonusPointsStepKeys(key: string): boolean {
  if (key === 'r' && !this.isRolling()) {
    this.rollBonusPoints();
    return true;
  } else if (key === 'enter' && this.rolledStats()) {
    this.advanceToAllocatePoints();
    return true;
  } else if (key === 'escape') {
    this.goBackFromRollBonusPoints();
    return true;
  }
  return false;
}

private handleAllocatePointsStepKeys(key: string): boolean {
  const statMap: Record<string, keyof BaseStats> = {
    's': 'strength',
    'i': 'intelligence',
    'p': 'piety',
    'v': 'vitality',
    'a': 'agility',
    'l': 'luck'
  };

  const currentFocus = this.focusedStat(); // Track which stat is selected

  if (key === 'arrowup') {
    // Allocate point to focused stat
    if (currentFocus) this.allocatePoint(currentFocus);
    return true;
  } else if (key === 'arrowdown') {
    // Deallocate point from focused stat
    if (currentFocus) this.deallocatePoint(currentFocus);
    return true;
  } else if (key === '+' || key === '=') {
    // Allocate point to focused stat
    if (currentFocus) this.allocatePoint(currentFocus);
    return true;
  } else if (key === '-' || key === '_') {
    // Deallocate point from focused stat
    if (currentFocus) this.deallocatePoint(currentFocus);
    return true;
  } else if (key === 'r') {
    // Reset allocation (keep same pool)
    this.resetAllocations();
    return true;
  } else if (key === 'R') {
    // Reroll pool (shift+R)
    this.goBackFromAllocatePoints();
    return true;
  } else if (key in statMap) {
    // Focus stat with letter key
    this.focusedStat.set(statMap[key]);
    return true;
  } else if (key === 'enter' && this.allPointsAllocated()) {
    this.advanceToSelectClass();
    return true;
  } else if (key === 'escape') {
    this.goBackFromAllocatePoints();
    return true;
  }
  return false;
}
```

### Phase 5: Update Navigation Methods

```typescript
// New navigation methods
advanceToAllocatePoints() {
  if (!this.rolledStats()) return;
  this.currentStep.set(CreationStep.ALLOCATE_POINTS);
}

goBackFromAllocatePoints() {
  // Go back to roll bonus points, clearing allocations
  this.rolledStats.set(null);
  this.currentStep.set(CreationStep.ROLL_BONUS_POINTS);
}

// Update existing methods
goBackFromSelectClass() {
  // Changed: go back to ALLOCATE_POINTS instead of ROLL_STATS
  this.currentStep.set(CreationStep.ALLOCATE_POINTS);
}
```

### Phase 6: Add Styles

```scss
// Roll Bonus Points Step
.roll-bonus-points {
  .bonus-result {
    text-align: center;
    padding: 2rem;

    .bonus-amount {
      font-size: 3rem;
      font-weight: bold;
      color: var(--accent-color);
      margin-bottom: 1rem;
    }

    .bonus-grade {
      font-size: 1.25rem;
      margin-bottom: 1rem;

      .grade-exceptional {
        color: #ffd700;
        animation: pulse 1s infinite;
      }

      .grade-lucky {
        color: #4a9eff;
      }

      .grade-normal {
        color: #888;
      }
    }

    .bonus-hint {
      color: var(--text-muted);
      font-size: 0.875rem;
      line-height: 1.6;
    }
  }
}

// Allocate Points Step
.allocate-points {
  .allocation-header {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(74, 158, 255, 0.1);
    border-radius: 4px;

    .points-remaining {
      display: flex;
      justify-content: space-between;
      font-size: 1.25rem;

      .value {
        font-weight: bold;
        color: var(--accent-color);

        &.zero {
          color: #00ff00;
        }
      }
    }

    .allocation-warning {
      margin-top: 0.5rem;
      color: #ffaa00;
      font-size: 0.875rem;
    }
  }

  .allocation-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .allocation-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;

      .stat-label {
        font-weight: bold;
        min-width: 4rem;
        color: var(--label-color);
      }

      .btn-decrement,
      .btn-increment {
        width: 2rem;
        height: 2rem;
        border: 1px solid var(--border-color);
        background: rgba(0, 0, 0, 0.3);
        color: var(--text-color);
        font-size: 1.25rem;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: var(--accent-color);
          border-color: var(--accent-color);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      }

      .allocated-amount {
        font-weight: bold;
        min-width: 2rem;
        text-align: center;
        color: #ffaa00;
      }

      .final-value {
        font-weight: bold;
        color: #00ff00;
        margin-left: auto;
      }
    }
  }

  .allocation-hint {
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    text-align: center;
    font-style: italic;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

---

## Testing Requirements

### Unit Tests

#### CharacterCreationService
- [ ] `rollBonusPointsOnly()` returns 0 for all stats
- [ ] `rollBonusPointsOnly()` returns 7-29 bonus points
- [ ] `allocateBonusPoints()` correctly adds points
- [ ] `allocateBonusPoints()` decrements pool
- [ ] `allocateBonusPoints()` throws when insufficient points
- [ ] `resetAllocations()` restores full pool
- [ ] `resetAllocations()` zeros all allocations

#### CharacterCreationComponent
- [ ] Step 3: Roll bonus points shows correct amount
- [ ] Step 3: Reroll generates new pool
- [ ] Step 4: Can allocate points with increment buttons
- [ ] Step 4: Can deallocate points with decrement buttons
- [ ] Step 4: Cannot exceed 18 cap (race base + allocated)
- [ ] Step 4: Cannot allocate when pool empty
- [ ] Step 4: Cannot deallocate below 0
- [ ] Step 4: Reset allocation returns to zero state
- [ ] Step 4: Continue button disabled until all points spent
- [ ] Step 4: Back button returns to Step 3 with cleared allocations
- [ ] Final stats use formula: RaceBase + Allocated (NO 3d6)

### Integration Tests

- [ ] E2E: Create Human Fighter with 10 points (allocate 7 STR, 3 VIT)
- [ ] E2E: Create Elf Mage with 15 points (allocate 8 INT, 4 PIE, 3 VIT)
- [ ] E2E: Attempt Hobbit Lord with 20 points (fails, must reroll)
- [ ] E2E: Create Hobbit Lord with 28 points (succeeds)
- [ ] E2E: Reroll from Step 3 clears allocations
- [ ] E2E: Reset allocation maintains same pool
- [ ] E2E: Keyboard shortcuts work in allocation step

### Manual Testing Checklist

- [ ] Visual: Bonus amount displays correctly
- [ ] Visual: Grade labels show (normal/lucky/exceptional)
- [ ] Visual: Points remaining updates in real-time
- [ ] Visual: Character sheet shows Base + Allocated = Total
- [ ] UX: +/- buttons have clear hover states
- [ ] UX: Disabled buttons are visually distinct
- [ ] UX: Warning shows when points remain unallocated
- [ ] UX: Success state when all points allocated
- [ ] Edge case: Maximum stat (18) cap works
- [ ] Edge case: Minimum stat (race base, no negatives) works
- [ ] Edge case: Can create character with 7 points
- [ ] Edge case: Can create elite class with 27+ points

---

## Rollout Plan

### Phase 1: Backend Changes (Low Risk)
1. Add `rollBonusPointsOnly()` method
2. Add `resetAllocations()` method
3. Update tests
4. Deploy to dev

### Phase 2: Component Logic (Medium Risk)
1. Add ALLOCATE_POINTS step enum
2. Add allocation methods
3. Update navigation flow
4. Update footer menu items
5. Test manually

### Phase 3: UI Implementation (High Risk)
1. Add ROLL_BONUS_POINTS template
2. Add ALLOCATE_POINTS template
3. Update character sheet display
4. Add styles
5. Test all visual states

### Phase 4: Keyboard Shortcuts (Low Risk)
1. Add keyboard handlers
2. Test accessibility

### Phase 5: Integration Testing (Critical)
1. Run full test suite
2. Manual E2E testing
3. Performance check (<2.5s)

### Phase 6: Documentation
1. Update CLAUDE.md
2. Update character-creation-system.md
3. Update training-grounds scene docs

---

## Success Criteria

✅ **Functional**
- [ ] Bonus points are rolled and displayed
- [ ] All points can be allocated via UI
- [ ] Final stats use formula: RaceBase + Allocated
- [ ] Cannot continue until all points spent
- [ ] Class eligibility updates in real-time
- [ ] Reroll and reset functions work correctly

✅ **Performance**
- [ ] Test suite runs in <2.5 seconds
- [ ] No UI lag during allocation

✅ **UX**
- [ ] Clear visual feedback for all interactions
- [ ] Keyboard shortcuts work smoothly
- [ ] Error states are helpful, not confusing

✅ **Authentic**
- [ ] Matches original Wizardry 1 behavior
- [ ] No 3d6 rolls (pure allocation)
- [ ] Unlimited rerolls allowed

---

## Open Questions

1. **Visual Design**: Should we show a stat distribution chart (e.g., radar chart) during allocation?
2. **Presets**: Should we offer allocation presets (e.g., "Fighter Build", "Mage Build")?
3. **Tutorial**: Should first-time users see a tooltip explaining allocation strategy?
4. **Elite Class Hints**: Should we show "You need X more points for Lord" during allocation?
5. **Animation**: Should stat changes animate or be instant?

---

## References

- [Character Creation System Docs](../systems/character-creation-system.md)
- [Training Grounds Scene Docs](../ui/scenes/02-training-grounds.md)
- [CharacterCreationService Docs](../services/CharacterCreationService.md)
- [Original Wizardry 1 Manual (1981)](../research/wizardry-manual.pdf)
- [Stat Formula Validation](../research/race-stats.md)

# Combined Roll/Allocate/Class Step - UX Design

**Date:** 2025-11-08
**Status:** Design Complete - Ready for Implementation
**Author:** Design collaboration with user

---

## Problem Statement

The current 6-step character creation wizard has two UX issues:

1. **Vertical space problem**: The ALLOCATE_POINTS step doesn't fit on 768px height screens (typical laptop resolution), requiring scrolling
2. **Delayed feedback**: Players don't see class eligibility until after completing allocation, leading to trial-and-error gameplay

The large "Points Remaining" card and vertically-spaced allocation controls consume too much screen real estate.

---

## Design Goals

1. **Fit on 768px height** screens without scrolling (targets 90%+ of users)
2. **Real-time class feedback** - show which classes become available as points are allocated
3. **Reduce steps** - streamline the wizard flow by combining related activities
4. **Reuse existing components** - leverage already-built UI elements
5. **Maintain visual consistency** - preserve the existing design language

---

## Solution Overview

**Merge three steps into one**: ROLL_BONUS_POINTS + ALLOCATE_POINTS + SELECT_CLASS → **ROLL_ALLOCATE_CLASS**

**New wizard flow** (5 steps instead of 6):
1. SELECT_RACE
2. SELECT_ALIGNMENT
3. **ROLL_ALLOCATE_CLASS** (combined step)
4. NAME_CHARACTER

**Auto-roll on entry**: Eliminates the need for a separate roll screen by automatically rolling bonus points when entering the combined step.

---

## Layout Design

### Screen Structure

```
┌──────────────────────────────────────────────────────┐
│              Step 3 of 5: Roll & Allocate            │
├──────────────────────────┬───────────────────────────┤
│   LEFT PANEL (50%)       │   RIGHT PANEL (50%)       │
│                          │                           │
│   ┌────────────────┐     │   YOUR CHARACTER          │
│   │ Class Grid     │     │   ━━━━━━━━━━━━━━━         │
│   │                │     │                           │
│   │ [FIGHTER] [MAGE]│    │   RACE: Human             │
│   │ [PRIEST] [THIEF]│    │                           │
│   │ [BISHOP] [SAMUR]│    │   ALIGNMENT: Good         │
│   │ [LORD]   [NINJA]│    │                           │
│   └────────────────┘     │   ATTRIBUTES:             │
│                          │   Points Remaining: 15    │
│   ┌────────────────┐     │   BASE + ALLOCATED = TOTAL│
│   │ Class Info     │     │                           │
│   │ (when selected)│     │   STR:  8 + [3] = 11 [−][+]│
│   │                │     │   INT:  8 + [0] =  8 [−][+]│
│   │ FIGHTER        │     │   PIE:  5 + [0] =  5 [−][+]│
│   │ Requirements:  │     │   VIT:  8 + [5] = 13 [−][+]│
│   │ STR 11+        │     │   AGI:  8 + [4] = 12 [−][+]│
│   │                │     │   LUC:  8 + [1] =  9 [−][+]│
│   │ Description... │     │                           │
│   └────────────────┘     │                           │
├──────────────────────────┴───────────────────────────┤
│  Footer: [Back]  [Reroll]  [Continue (disabled)]    │
└──────────────────────────────────────────────────────┘
```

### Vertical Space Budget

**Target: 768px total height**

- Header/title: ~40px
- Main content: ~650px
  - Left panel:
    - Class grid: ~280px (2 rows × 130px + spacing)
    - Class info panel: ~280px
  - Right panel:
    - YOUR CHARACTER header: ~60px
    - Race display: ~30px
    - Alignment display: ~30px
    - ATTRIBUTES header: ~40px
    - Points Remaining: ~30px
    - 6 stat rows: ~210px (6 × 35px)
- Footer: ~60px
- **Total: ~750px** ✅ Fits within 768px

### Layout Proportions

- **50/50 column split** (equal width for left/right panels)
- Left panel: Class selection + context
- Right panel: Character summary + allocation controls

---

## Interaction Flow

### Initial State (Scene Entry)

1. **Auto-roll bonus points** when entering the step (7-29 range)
2. Points Remaining displays the rolled amount
3. All allocations start at 0
4. Classes update immediately:
   - **Eligible classes**: Blue (clickable)
   - **Ineligible classes**: Gray (not clickable)
5. No class is selected yet (none are blue filled)
6. Footer state:
   - Continue: **Disabled** (needs allocation + class selection)
   - Reroll: **Enabled**
   - Back: **Enabled**

### During Allocation

**Point Allocation:**
- Click **+** button: Decrements Points Remaining, increments stat's allocated value
- Click **−** button: Increments Points Remaining, decrements stat's allocated value

**Button States:**
- **+ button disabled** when:
  - Points Remaining = 0, OR
  - Stat would exceed 18 cap: `(raceBase + allocated + 1) > 18`
- **− button disabled** when:
  - That stat's allocation = 0

**Real-Time Class Updates:**
- As stats change, classes automatically update state:
  - Ineligible → Eligible: Gray → Blue
  - Eligible → Ineligible: Blue → Gray (or Blue Filled → Gray if selected)
- If selected class becomes ineligible, it **auto-deselects**

### Class Selection

1. Click an **eligible (blue)** class → becomes **blue filled** (selected)
2. Click the **same class again** → deselects it (back to blue)
3. Click a **different eligible class** → switches selection
4. Click a **gray (ineligible)** class → does nothing (no effect)

### Continue Button Enabled

**Requirements (both must be true):**
1. `bonusPoints === 0` (all points allocated)
2. A class is selected (one class is blue filled)

### Reroll Button Behavior

When clicked:
1. Resets all allocations to 0
2. Rolls new bonus points (7-29)
3. Deselects any selected class
4. Updates class eligibility based on new roll

---

## Visual Design

### Class Button States

1. **Gray (Ineligible):**
   - Gray background (#555 or similar)
   - Gray text
   - Not clickable (`cursor: not-allowed`)
   - Shows ✗ marker
   - Optional: Lock icon or "Requirements not met" on hover

2. **Blue (Eligible):**
   - Blue background (#4a9eff or existing theme blue)
   - White text
   - Clickable (`cursor: pointer`)
   - Hover: Slightly brighter blue
   - Shows shortcut letter

3. **Blue Filled (Selected):**
   - Same blue background as eligible
   - White text
   - Visual indicator (border, checkmark, or filled pattern)
   - Clickable to deselect

### Stat Row Design

```
STR:  8 + [3] = 11  [−][+]
│     │   │    │    │  │
│     │   │    │    │  └─ Increment button
│     │   │    │    └──── Decrement button
│     │   │    └───────── Final value (green)
│     │   └────────────── Allocated (orange)
│     └────────────────── Base (gray/white)
└──────────────────────── Stat label
```

### Color Coding

- **Base stat**: Gray/white (inherited from race)
- **Allocated**: Orange (#ffaa00) - player's choices
- **Final total**: Green (#00ff00) - what matters for class eligibility
- **Points Remaining**:
  - Orange (#ffaa00) when > 0 (warning: not done yet)
  - Green (#00ff00) when = 0 (success: ready to continue)

### Spacing Guidelines

- Stat rows: 35px height each (compact but readable)
- Class buttons: 60-70px height each (adequate clickable target)
- Padding/margins: Minimal (8-12px) throughout to maximize content area

---

## Component Architecture

### Step Enum Changes

```typescript
enum CreationStep {
  SELECT_RACE = 'SELECT_RACE',                // Step 1
  SELECT_ALIGNMENT = 'SELECT_ALIGNMENT',      // Step 2
  ROLL_ALLOCATE_CLASS = 'ROLL_ALLOCATE_CLASS', // Step 3 (MERGED)
  NAME_CHARACTER = 'NAME_CHARACTER'           // Step 4 (was step 5)
}

// REMOVED:
// - ROLL_BONUS_POINTS
// - ALLOCATE_POINTS
// - SELECT_CLASS
```

### New Computed Signal

```typescript
readonly canProceedFromRollAllocate = computed(() => {
  const stats = this.rolledStats()
  const selectedClass = this.selectedClass()
  return stats?.bonusPoints === 0 && selectedClass !== null
})
```

### Modified Methods

**Auto-roll on entry:**
```typescript
// In navigation or ngOnInit when entering ROLL_ALLOCATE_CLASS
if (this.currentStep() === CreationStep.ROLL_ALLOCATE_CLASS && !this.rolledStats()) {
  this.rollBonusPoints()
}
```

**Reroll behavior:**
```typescript
rerollStats(): void {
  // Clear allocations
  this.rolledStats.update(stats => {
    if (!stats) return null
    return CharacterCreationService.resetAllocations(stats)
  })

  // Clear selected class
  this.selectedClass.set(null)

  // Roll new bonus points
  this.rollBonusPoints()
}
```

**No changes needed:**
- `allocatePoint()` - works as-is
- `deallocatePoint()` - works as-is
- `selectClass()` - works as-is

**Removed methods:**
- `resetAllAllocations()` - replaced by Reroll button behavior
- `advanceToAllocatePoints()` - no longer needed
- `goBackFromAllocatePoints()` - no longer needed

### Navigation Flow

**Step 2 → Step 3:**
- Auto-rolls bonus points on entry
- Shows combined allocation + class selection

**Step 3 → Step 4:**
- Requires `canProceedFromRollAllocate === true`
- Validates both allocation complete AND class selected

**Step 3 → Step 2 (Back):**
- Preserves race and alignment
- Clears rolled stats and selected class

---

## Template Structure

### Reusable Components

**From existing implementation:**

1. ✅ **Class Selection Grid** - Lines 254-278 in current template
2. ✅ **Class Info Panel** - Lines 271-275 in current template
3. ✅ **Allocation Grid** (+/- buttons) - Lines 149-246 in current template
4. ✅ **YOUR CHARACTER Panel** - Lines 312-472 in current template
5. ✅ **Points Remaining Header** - Lines 134-147 in current template

**All existing CSS classes can be reused** - no new styles needed.

### Combined Template

```html
@if (currentStep() === CreationStep.ROLL_ALLOCATE_CLASS) {
  <div class="step-content two-column">

    <!-- LEFT PANEL (50%) -->
    <div class="controls-column">

      <!-- Class Selection Grid (REUSE existing button-grid.classes) -->
      <div class="button-grid classes">
        <button *ngFor="let classType of allClasses"
                [class.selected]="selectedClass() === classType"
                [disabled]="!isClassEligible(classType)"
                (click)="selectClass(classType)">
          <span class="shortcut">{{ getClassShortcut(classType) }}</span>
          {{ classType }}
          @if (!isClassEligible(classType)) {
            <span class="ineligible-marker">✗</span>
          }
        </button>
      </div>

      <!-- Class Info Panel (REUSE existing class-description) -->
      @if (selectedClass()) {
        <div class="class-description">
          {{ getClassDescription(selectedClass()) }}
        </div>
      } @else {
        <div class="class-description empty">
          Select a class to see details
        </div>
      }

    </div>

    <!-- RIGHT PANEL (50%) -->
    <div class="character-display-column">

      <!-- YOUR CHARACTER Panel (REUSE existing character-sheet) -->
      <div class="character-sheet">

        <!-- Race Section -->
        <div class="section">
          <h3>RACE:</h3>
          <p>{{ selectedRace() }}</p>
        </div>

        <!-- Alignment Section -->
        <div class="section">
          <h3>ALIGNMENT:</h3>
          <p>{{ selectedAlignment() }}</p>
        </div>

        <!-- Attributes Section -->
        <div class="section">
          <h3>ATTRIBUTES:</h3>

          <!-- Points Remaining (REUSE existing allocation-header) -->
          <div class="allocation-header">
            <div class="points-remaining">
              <span class="label">Points Remaining:</span>
              <span class="value" [class.zero]="rolledStats()?.bonusPoints === 0">
                {{ rolledStats()?.bonusPoints ?? 0 }}
              </span>
            </div>
          </div>

          <div class="stat-breakdown-label">BASE + ALLOCATED = TOTAL</div>

          <!-- Allocation Grid (REUSE existing allocation-grid) -->
          <div class="allocation-grid">
            <!-- STR -->
            <div class="allocation-row">
              <span class="stat-label">STR:</span>
              <button class="btn-decrement"
                      [disabled]="rolledStats()!.strength <= 0"
                      (click)="deallocatePoint('strength')">−</button>
              <span class="allocated-amount">{{ rolledStats()!.strength }}</span>
              <button class="btn-increment"
                      [disabled]="rolledStats()!.bonusPoints <= 0 ||
                                 (getRaceBaseStat('strength') + rolledStats()!.strength >= 18)"
                      (click)="allocatePoint('strength')">+</button>
              <span class="final-value">
                {{ getRaceBaseStat('strength') + rolledStats()!.strength }}
              </span>
            </div>

            <!-- Repeat for INT, PIE, VIT, AGI, LUC -->
            <!-- ... -->
          </div>
        </div>

      </div>
    </div>
  </div>
}
```

### Footer Menu Items

```typescript
readonly footerMenuItems = computed(() => {
  const step = this.currentStep()

  switch (step) {
    case CreationStep.ROLL_ALLOCATE_CLASS:
      return [
        {
          label: 'Back',
          action: 'back',
          enabled: true,
          shortcut: 'ESC'
        },
        {
          label: 'Reroll',
          action: 'reroll',
          enabled: this.rolledStats() !== null,
          shortcut: 'R'
        },
        {
          label: 'Continue',
          action: 'continue',
          enabled: this.canProceedFromRollAllocate(),
          shortcut: 'ENTER'
        }
      ]

    // ... other steps
  }
})
```

---

## Testing Strategy

### Component Tests to Update

1. **Step enum tests**
   - Update to 4-step flow (was 6 steps)
   - Verify step numbering: "Step 3 of 4" instead of "Step 3 of 6"

2. **Navigation tests**
   - Test ALIGNMENT → ROLL_ALLOCATE_CLASS auto-rolls on entry
   - Test ROLL_ALLOCATE_CLASS → NAME_CHARACTER requires both conditions
   - Test Back from ROLL_ALLOCATE_CLASS clears stats and class

3. **Auto-roll test**
   - Verify bonus points rolled automatically on scene entry
   - Verify bonus points in range 7-29

4. **Allocation + class validation**
   - Test Continue disabled when points remain
   - Test Continue disabled when no class selected
   - Test Continue enabled when both conditions met

5. **Reroll behavior**
   - Test Reroll clears all allocations
   - Test Reroll deselects any selected class
   - Test Reroll rolls new bonus points

6. **Real-time class updates**
   - Test classes change from gray to blue as stats reach requirements
   - Test selected class auto-deselects if becomes ineligible
   - Test class eligibility recalculates on every allocation change

### Integration Tests

1. **Full flow**: Race → Alignment → Auto-roll + Allocate + Class → Name
2. **Reroll workflow**: Allocate points → Select class → Reroll → Start over
3. **Class ineligibility**: Allocate points → Class becomes ineligible → Auto-deselect
4. **18 cap validation**: Cannot allocate beyond cap, even with points remaining

### Visual Regression Testing

- Verify 768px height fits without scrolling
- Verify 50/50 column split at various screen widths (1366px, 1920px)
- Verify class button states render correctly (gray/blue/filled)
- Verify stat row layout is compact but readable

### Keyboard Shortcuts to Preserve

- **R**: Reroll (from footer)
- **F/M/P/T/B/A/L/J**: Class selection shortcuts
- **Enter**: Continue (when enabled)
- **Escape**: Back to alignment selection

---

## Removed Features

**What's being removed from the current implementation:**

1. **Separate ROLL_BONUS_POINTS step** - Merged into combined step with auto-roll
2. **Bonus roll result display** - The large "EXCEPTIONAL!" grade screen removed to save space
3. **Separate ALLOCATE_POINTS step** - Merged into combined step
4. **Separate SELECT_CLASS step** - Merged into combined step
5. **"Reset All" button** - Replaced by Reroll button which does more (resets + new roll)
6. **Manual "Roll" button** - Replaced by auto-roll on entry

**Rationale**: These features were spread across 3 steps, creating unnecessary navigation overhead and consuming vertical space.

---

## Migration Notes

### Before (6 steps):

1. SELECT_RACE
2. SELECT_ALIGNMENT
3. **ROLL_BONUS_POINTS** (show grade, click continue)
4. **ALLOCATE_POINTS** (allocate all points, click continue)
5. **SELECT_CLASS** (select class, click continue)
6. NAME_CHARACTER

### After (4 steps):

1. SELECT_RACE
2. SELECT_ALIGNMENT
3. **ROLL_ALLOCATE_CLASS** (auto-roll, allocate, select class, click continue once)
4. NAME_CHARACTER

**Saves**: 2 navigation clicks, 2 screen transitions, ~30 seconds per character creation

---

## Success Criteria

**Must achieve:**
- ✅ Fits on 768px height screens without scrolling
- ✅ Real-time class eligibility feedback during allocation
- ✅ All 160 character creation tests pass (updated for 4-step flow)
- ✅ No regressions in other features
- ✅ Reuses existing components (no new major CSS)

**Nice to have:**
- Keyboard shortcuts remain functional
- Visual consistency with existing wizard steps
- Smooth transitions between allocation and class selection states

---

## Implementation Checklist

**Phase 1: Enum & State**
- [ ] Update `CreationStep` enum (remove 3 steps, add 1 merged step)
- [ ] Add `canProceedFromRollAllocate` computed signal
- [ ] Update step numbering throughout (4 steps instead of 6)

**Phase 2: Component Logic**
- [ ] Add auto-roll on scene entry
- [ ] Update `rerollStats()` to clear allocations + class
- [ ] Update navigation methods for new flow
- [ ] Remove unused methods (`resetAllAllocations`, etc.)

**Phase 3: Template**
- [ ] Create combined step template with 50/50 columns
- [ ] Move class grid to left panel
- [ ] Move class info panel to left panel
- [ ] Move allocation controls to right panel (under YOUR CHARACTER)
- [ ] Update footer menu items for ROLL_ALLOCATE_CLASS

**Phase 4: Testing**
- [ ] Update component tests for 4-step flow
- [ ] Update integration tests
- [ ] Add new tests for combined step interactions
- [ ] Verify visual regression (768px height)

**Phase 5: Cleanup**
- [ ] Remove old step templates (ROLL, ALLOCATE, SELECT_CLASS)
- [ ] Remove unused SCSS (if any)
- [ ] Update documentation

---

## Open Questions

None - design is complete and validated.

---

## Appendix: Design Decisions

**Why auto-roll instead of manual roll?**
- Eliminates one user action (click "Roll")
- Saves screen real estate (no "Roll" button needed on combined step)
- Reroll button in footer handles the re-roll case

**Why merge all three steps instead of just two?**
- Class selection is tightly coupled to allocation (classes unlock as you allocate)
- Seeing classes while allocating provides immediate feedback and guidance
- Reduces navigation overhead from 3 clicks to 1

**Why 50/50 column split instead of 60/40?**
- Gives more room for character sheet + allocation controls
- Class grid doesn't need extra width (8 classes fit fine in 50%)
- Balances the visual weight of both panels

**Why remove the bonus roll grade display?**
- Consumes ~150px of vertical space
- Grade information is nice-to-have, not critical
- Players can infer grade from the number itself (27+ = exceptional)
- Prioritized vertical space savings for 768px target

**Why Reroll in footer instead of under class grid?**
- Cleaner left panel (no button clutter)
- Consistent with other wizard steps (footer actions)
- One clear location for reroll action

---

**End of Design Document**

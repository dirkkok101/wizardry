# Class Requirements Display Design

**Date**: 2025-11-08
**Status**: Design Complete - Ready for Implementation
**Feature**: Display class attribute requirements on class selection buttons

---

## Overview

Enhance the character creation wizard's class selection step to show users exactly which attribute requirements they need to meet for each class. Currently, users see ineligible classes as grayed-out buttons with a ✗ marker, but have no indication of which stats are too low.

### Goals

1. **Transparency**: Show users exactly what's needed to unlock each class
2. **Guidance**: Help users make informed decisions when allocating bonus points
3. **Real-time feedback**: Update requirements display as stats change
4. **Clean UX**: Keep eligible classes uncluttered

---

## Design Decisions

Based on brainstorming session analysis, the following design choices were validated:

### 1. Display Location
**Decision**: Show requirements directly on class buttons

**Alternatives considered**:
- Class description panel (requires selection)
- Stats panel on right side (less obvious)
- Tooltips (not keyboard-friendly)

**Rationale**: At-a-glance visibility for all classes without requiring interaction.

### 2. Detail Level
**Decision**: Show stat names with minimums (e.g., "STR 11+")

**Alternatives considered**:
- Just stat names (less clear)
- Current vs required ratios (takes more space)
- Met/unmet indicators only (less informative)

**Rationale**: Explicit thresholds are clear and informative without being verbose.

### 3. Visual Treatment
**Decision**: Show only UNMET requirements

**Alternatives considered**:
- Show all requirements with color coding
- Show all with checkmarks for met
- Show all with strikethrough for met

**Rationale**: Focuses attention on what's missing. Eligible classes stay clean and uncluttered.

### 4. Multiple Requirements
**Decision**: Show all unmet requirements in a list

**Alternatives considered**:
- Show count + first 2
- Show only primary requirement
- Show count only

**Rationale**: Complete information prevents surprises. Users can see the full path to eligibility.

### 5. Button Layout
**Decision**: Two-column internal grid (class name left, requirements right)

**Alternatives considered**:
- Compact stacked layout (class name over requirements)
- Expanding detail section (variable heights)

**Rationale**: Better horizontal space usage. Clear visual separation between class identity and requirements.

---

## Visual Layout & Mockup

### Class Button Grid (4 columns × 2 rows)

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ [F]: Fit │ [M]: Mag │ [P]: Pri │ [T]: Thi │            │
│  │ ghter    │ e        │ est      │ ef       │            │
│  │          │          │ Need:    │ Need:    │            │
│  │          │          │ PIE 11+  │ AGI 11+  │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ [B]: Bis │ [A]: Sam │ [L]: Lor │ [J]: Nin │            │
│  │ hop      │ urai     │ d        │ ja       │            │
│  │ Need:    │          │ Need:    │ Need:    │            │
│  │ INT 12+  │          │ STR 15+  │ STR 17+  │            │
│  │ PIE 12+  │          │ INT 12+  │ INT 17+  │            │
│  │          │          │ PIE 12+  │ PIE 17+  │            │
│  │          │          │ VIT 15+  │ VIT 17+  │            │
│  │          │          │ AGI 14+  │ AGI 17+  │            │
│  │          │          │ LUC 15+  │ LUC 17+  │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
└────────────────────────────────────────────────────────────┘
```

### Visual Hierarchy

- **Class name + shortcut**: Bold, larger text (1rem)
- **"Need:" label**: Smaller, muted color (0.75rem, 80% opacity)
- **Requirement list**: Smaller, warning color (0.75rem, orange/red, 90% opacity)
- **Ineligible marker (✗)**: Stays on same line as class name

### Button States

**Eligible** (enabled, no requirements shown):
```
┌──────────┐
│ [F]: Fit │
│ ghter    │
│          │
└──────────┘
```

**Ineligible** (disabled, requirements shown):
```
┌──────────┐
│ [P]: Pri │ ✗
│ est      │
│ Need:    │
│ PIE 11+  │
└──────────┘
```

**Selected** (blue background, no change to requirements):
```
┌──────────┐ (blue bg)
│ [F]: Fit │
│ ghter    │
│          │
└──────────┘
```

---

## Component Implementation

### New Computed Signal: `unmetRequirements`

**File**: `src/app/character-creation/character-creation.component.ts`

```typescript
readonly unmetRequirements = computed(() => {
  const finalStats = this.finalStats();
  if (!finalStats) return new Map<CharacterClass, string[]>();

  const result = new Map<CharacterClass, string[]>();

  for (const classOption of this.allClasses) {
    const classData = ClassService.getClassData(classOption.id);
    const requirements = classData?.requirements || {};
    const unmet: string[] = [];

    // Check each requirement
    for (const [stat, minimum] of Object.entries(requirements)) {
      const statKey = this.mapStatToFinalStats(stat); // 'str' -> 'strength'
      const currentValue = finalStats[statKey];

      if (currentValue < minimum) {
        unmet.push(`${stat.toUpperCase()} ${minimum}+`);
      }
    }

    result.set(classOption.id, unmet);
  }

  return result;
});
```

### Helper Method: `mapStatToFinalStats`

```typescript
private mapStatToFinalStats(abbrev: string): keyof FinalStats {
  const mapping: Record<string, keyof FinalStats> = {
    'str': 'strength',
    'int': 'intelligence',
    'pie': 'piety',
    'vit': 'vitality',
    'agi': 'agility',
    'luc': 'luck'
  };
  return mapping[abbrev];
}
```

### Data Flow

1. User allocates/deallocates points → `rolledStats` signal updates
2. `finalStats` computed signal recalculates (race base + allocated)
3. `unmetRequirements` computed signal recalculates for all 8 classes
4. Template reactively updates button content to show/hide requirements
5. `isClassEligible()` continues to work as-is (controls button disabled state)

### Performance Characteristics

- **Computation**: 8 classes × max 6 stats = 48 comparisons worst case
- **Optimization**: Computed signals only recalculate when dependencies change
- **Impact**: Negligible - runs in microseconds

---

## Template Changes

### Updated Button Template

**File**: `src/app/character-creation/character-creation.component.html`
**Location**: Lines 85-96 (class button grid)

```html
<div class="button-grid classes">
  @for (classOption of allClasses; track classOption.id) {
    <button
      [class.selected]="selectedClass() === classOption.id"
      [disabled]="!isClassEligible(classOption.id)"
      (click)="selectClass(classOption.id)"
    >
      <div class="class-button-content">
        <div class="class-name">
          <span class="shortcut">{{ classOption.shortcut }}</span>: {{ classOption.name }}
          @if (!isClassEligible(classOption.id)) {
            <span class="ineligible-marker">✗</span>
          }
        </div>
        @if (unmetRequirements().get(classOption.id)?.length ?? 0 > 0) {
          <div class="requirements-list">
            <span class="need-label">Need:</span>
            @for (req of unmetRequirements().get(classOption.id); track req) {
              <span class="requirement">{{ req }}</span>
            }
          </div>
        }
      </div>
    </button>
  }
</div>
```

### CSS Additions

**File**: `src/app/character-creation/character-creation.component.scss`

```scss
.class-button-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: left;
  width: 100%;
}

.class-name {
  font-weight: bold;
  font-size: 1rem;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.75rem;
  color: var(--warning-color, #ff9800);
  margin-top: 0.25rem;
}

.need-label {
  font-weight: 600;
  opacity: 0.8;
}

.requirement {
  padding-left: 0.5rem;
  opacity: 0.9;
}

// Adjust button height to accommodate requirements
.button-grid.classes button {
  min-height: 3rem; // Was 2.5rem
  height: auto; // Allow growth
  padding: 0.75rem;
  align-items: flex-start; // Top-align content
}
```

### Layout Considerations

**Grid columns**: May need to reduce from 4 columns to 3 columns if Lord/Ninja buttons become too tall.

**Alternative**: Keep 4 columns but reduce font sizes slightly for requirements (0.7rem instead of 0.75rem).

**Vertical space**: Buttons will grow from ~2.5rem to 3-8rem depending on requirements. This is acceptable within the 768px height budget.

---

## Testing Strategy

### Unit Tests

**File**: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**New test suite**: `describe('unmetRequirements computed signal')`

**Test cases**:

1. **Empty array for eligible classes**
   - Setup: Allocate enough points to meet Fighter requirements
   - Assert: `unmetRequirements().get(CharacterClass.FIGHTER)` returns `[]`

2. **Single unmet requirement**
   - Setup: Human base STR=8, don't allocate any points
   - Assert: `unmetRequirements().get(CharacterClass.FIGHTER)` returns `['STR 11+']`

3. **Multiple unmet requirements**
   - Setup: No points allocated
   - Assert: `unmetRequirements().get(CharacterClass.BISHOP)` contains `['INT 12+', 'PIE 12+']`

4. **Reactive updates when stats change**
   - Setup: Start with unmet Fighter requirement
   - Action: Allocate 3 strength points
   - Assert: Requirements list updates from `['STR 11+']` to `[]`

5. **All 6 requirements for advanced classes**
   - Setup: No points allocated
   - Assert: `unmetRequirements().get(CharacterClass.LORD)` has 6 items
   - Assert: `unmetRequirements().get(CharacterClass.NINJA)` has 6 items

### Integration Tests

**File**: `src/app/character-creation/__tests__/character-creation-integration.spec.ts`

**Test case**: "should display requirements on ineligible class buttons"

```typescript
it('should display requirements on ineligible class buttons', async () => {
  component.selectRace('HUMAN' as Race);
  component.advanceToAlignment();
  component.selectAlignment(Alignment.GOOD);
  component.advanceToRollAllocateClass();
  await component.rollBonusPoints();

  fixture.detectChanges();

  const compiled = fixture.nativeElement;

  // Verify requirements structure exists
  const requirementLists = compiled.querySelectorAll('.requirements-list');
  expect(requirementLists.length).toBeGreaterThan(0);

  // Verify "Need:" label is present
  const needLabels = compiled.querySelectorAll('.need-label');
  expect(needLabels.length).toBeGreaterThan(0);

  // Verify individual requirements are displayed
  const requirements = compiled.querySelectorAll('.requirement');
  expect(requirements.length).toBeGreaterThan(0);
});
```

### Coverage Targets

- **New computed signal**: 100% coverage (all branches tested)
- **Template rendering**: Test 0, 1, 2, and 6 unmet requirements scenarios
- **Reactive updates**: Verify requirements update on allocate/deallocate
- **Edge cases**: Null stats, empty requirements object, all classes eligible

---

## Implementation Notes

### Data Sources

**Class requirements** are loaded from `/Users/dirkkok/Development/wizardry/data/classes/*.json`:

Example Fighter:
```json
{
  "requirements": { "str": 11 }
}
```

Example Lord (most complex):
```json
{
  "requirements": {
    "str": 15,
    "int": 12,
    "pie": 12,
    "vit": 15,
    "agi": 14,
    "luc": 15
  }
}
```

**ClassService** already exposes this data via `getClassData(charClass).requirements`.

### Stat Mapping

The data files use abbreviated stat names (`str`, `int`, `pie`, `vit`, `agi`, `luc`), while the component uses full names (`strength`, `intelligence`, `piety`, `vitality`, `agility`, `luck`). The `mapStatToFinalStats()` helper handles this translation.

### Existing Logic Preserved

- **`isClassEligible()`**: No changes needed - continues to check eligibility
- **`eligibleClasses()`**: No changes needed - used by other logic
- **Button disabled state**: No changes - still controlled by `isClassEligible()`
- **Ineligible marker (✗)**: Still shown, now positioned next to class name

### Reactivity Chain

The entire feature is **purely reactive** via Angular signals:

```
User input (allocate/deallocate)
  ↓
rolledStats signal updates
  ↓
finalStats computed signal recalculates
  ↓
unmetRequirements computed signal recalculates
  ↓
Template auto-updates via @if/@for
```

No manual change detection or subscriptions needed.

---

## Future Enhancements (Not in Scope)

Potential future improvements if needed:

1. **Tooltip with full class requirements**: Hover to see all requirements including met ones
2. **Progress indicators**: Show "2/6 requirements met" on buttons
3. **Highlight closest class**: Auto-suggest which class is closest to being unlocked
4. **Smart allocation suggestions**: "Allocate 3 more STR to unlock Fighter"

These are not planned for the initial implementation but could be added based on user feedback.

---

## References

- **Codebase**: `/Users/dirkkok/Development/wizardry/`
- **Component**: `src/app/character-creation/character-creation.component.ts`
- **Template**: `src/app/character-creation/character-creation.component.html`
- **Data**: `data/classes/*.json`
- **Service**: `src/services/ClassService.ts`
- **Previous UX design**: `docs/plans/2025-11-08-combined-roll-allocate-class-ux.md`

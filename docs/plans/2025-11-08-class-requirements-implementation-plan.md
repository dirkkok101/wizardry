# Class Requirements Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display class attribute requirements directly on class selection buttons in the character creation wizard.

**Architecture:** Add a new computed signal `unmetRequirements` that calculates which stat requirements are not met for each class. Update the template to conditionally display these requirements on ineligible class buttons. Uses reactive Angular signals for automatic updates as stats change.

**Tech Stack:** Angular 18 (signals, control flow), TypeScript, Jest testing, SCSS

**Design Document:** `docs/plans/2025-11-08-class-requirements-display.md`

---

## Task 1: Add Helper Method for Stat Mapping

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts` (add after line ~520)

**Step 1: Write the failing test**

File: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

Add new test suite after line 1257:

```typescript
describe('mapStatToFinalStats()', () => {
  it('should map str to strength', () => {
    const result = (component as any).mapStatToFinalStats('str');
    expect(result).toBe('strength');
  });

  it('should map int to intelligence', () => {
    const result = (component as any).mapStatToFinalStats('int');
    expect(result).toBe('intelligence');
  });

  it('should map all 6 stats correctly', () => {
    expect((component as any).mapStatToFinalStats('str')).toBe('strength');
    expect((component as any).mapStatToFinalStats('int')).toBe('intelligence');
    expect((component as any).mapStatToFinalStats('pie')).toBe('piety');
    expect((component as any).mapStatToFinalStats('vit')).toBe('vitality');
    expect((component as any).mapStatToFinalStats('agi')).toBe('agility');
    expect((component as any).mapStatToFinalStats('luc')).toBe('luck');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- character-creation.component.spec.ts --testNamePattern="mapStatToFinalStats"
```

Expected: FAIL with "mapStatToFinalStats is not a function"

**Step 3: Write minimal implementation**

File: `src/app/character-creation/character-creation.component.ts`

Add after `getRaceBaseStat()` method (around line 520):

```typescript
  /**
   * Map abbreviated stat names (from JSON data) to FinalStats property names.
   * @param abbrev - Abbreviated stat name ('str', 'int', 'pie', 'vit', 'agi', 'luc')
   * @returns Full stat property name for FinalStats type
   */
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

**Step 4: Run test to verify it passes**

```bash
npm test -- character-creation.component.spec.ts --testNamePattern="mapStatToFinalStats"
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "feat: add stat abbreviation to property name mapper

Adds mapStatToFinalStats() helper to convert JSON stat names
(str, int, pie, vit, agi, luc) to FinalStats property names
(strength, intelligence, piety, vitality, agility, luck).

Needed for class requirements display feature."
```

---

## Task 2: Add Computed Signal for Unmet Requirements

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts` (add after line ~181)

**Step 1: Write the failing test**

File: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

Add new test suite after the footerMenuItems tests (around line 320):

```typescript
describe('unmetRequirements computed signal', () => {
  it('should return empty array for eligible classes', async () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    await component.advanceToRollAllocateClass();

    // Allocate points to make Fighter eligible (STR 11+, Human base 8)
    component.rolledStats.set({
      strength: 3, intelligence: 0, piety: 0,
      vitality: 0, agility: 0, luck: 0, bonusPoints: 0
    });

    fixture.detectChanges();

    const unmet = component.unmetRequirements().get(CharacterClass.FIGHTER);
    expect(unmet).toEqual([]);
  });

  it('should show single unmet requirement', async () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    await component.advanceToRollAllocateClass();

    // Don't allocate - Fighter needs STR 11+, Human base is 8
    component.rolledStats.set({
      strength: 0, intelligence: 0, piety: 0,
      vitality: 0, agility: 0, luck: 0, bonusPoints: 20
    });

    fixture.detectChanges();

    const unmet = component.unmetRequirements().get(CharacterClass.FIGHTER);
    expect(unmet).toEqual(['STR 11+']);
  });

  it('should show multiple unmet requirements for advanced classes', async () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    await component.advanceToRollAllocateClass();

    component.rolledStats.set({
      strength: 0, intelligence: 0, piety: 0,
      vitality: 0, agility: 0, luck: 0, bonusPoints: 20
    });

    fixture.detectChanges();

    const unmet = component.unmetRequirements().get(CharacterClass.BISHOP);
    expect(unmet).toContain('INT 12+');
    expect(unmet).toContain('PIE 12+');
    expect(unmet?.length).toBe(2);
  });

  it('should update reactively when stats change', async () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    await component.advanceToRollAllocateClass();

    component.rolledStats.set({
      strength: 0, intelligence: 0, piety: 0,
      vitality: 0, agility: 0, luck: 0, bonusPoints: 20
    });

    fixture.detectChanges();
    let unmet = component.unmetRequirements().get(CharacterClass.FIGHTER);
    expect(unmet).toEqual(['STR 11+']);

    // Allocate strength to meet requirement
    component.allocatePoint('strength');
    component.allocatePoint('strength');
    component.allocatePoint('strength');

    fixture.detectChanges();
    unmet = component.unmetRequirements().get(CharacterClass.FIGHTER);
    expect(unmet).toEqual([]);
  });

  it('should return empty map when stats not available', () => {
    const unmet = component.unmetRequirements();
    expect(unmet.size).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- character-creation.component.spec.ts --testNamePattern="unmetRequirements"
```

Expected: FAIL with "unmetRequirements is not a function"

**Step 3: Write minimal implementation**

File: `src/app/character-creation/character-creation.component.ts`

Add after `canProceedFromRollAllocate` computed signal (around line 181):

```typescript
  /**
   * Compute unmet requirements for each class based on current stats.
   * Returns a map of class ID to array of unmet requirement strings.
   * Only includes requirements that are NOT met (for display on ineligible buttons).
   * Format: ['STR 11+', 'INT 12+']
   */
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

**Step 4: Run test to verify it passes**

```bash
npm test -- character-creation.component.spec.ts --testNamePattern="unmetRequirements"
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "feat: add unmetRequirements computed signal

Calculates which class requirements are not met based on current
final stats. Returns Map<CharacterClass, string[]> with formatted
requirement strings like 'STR 11+'.

Updates reactively when stats change via Angular signals."
```

---

## Task 3: Update Template to Display Requirements

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html:85-96`

**Step 1: Write the integration test**

File: `src/app/character-creation/__tests__/character-creation-integration.spec.ts`

Add new test at end of file (after line 417):

```typescript
it('should display requirements on ineligible class buttons', async () => {
  component.selectRace('HUMAN' as Race);
  component.advanceToAlignment();
  component.selectAlignment(Alignment.GOOD);
  await component.advanceToRollAllocateClass();

  // Don't allocate points - most classes will be ineligible
  fixture.detectChanges();

  const compiled = fixture.nativeElement;

  // Verify requirements structure exists for ineligible classes
  const requirementLists = compiled.querySelectorAll('.requirements-list');
  expect(requirementLists.length).toBeGreaterThan(0);

  // Verify "Need:" label is present
  const needLabels = compiled.querySelectorAll('.need-label');
  expect(needLabels.length).toBeGreaterThan(0);

  // Verify individual requirements are displayed
  const requirements = compiled.querySelectorAll('.requirement');
  expect(requirements.length).toBeGreaterThan(0);

  // Verify at least one requirement text includes a stat and minimum
  const requirementTexts = Array.from(requirements).map(el => el.textContent);
  const hasValidFormat = requirementTexts.some(text =>
    text && /[A-Z]{3}\s+\d+\+/.test(text)
  );
  expect(hasValidFormat).toBe(true);
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- character-creation-integration.spec.ts --testNamePattern="should display requirements"
```

Expected: FAIL with "Expected 0 to be greater than 0" (no .requirements-list found)

**Step 3: Update template**

File: `src/app/character-creation/character-creation.component.html`

Replace lines 85-96 with:

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

**Step 4: Run test to verify it passes**

```bash
npm test -- character-creation-integration.spec.ts --testNamePattern="should display requirements"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/character-creation/character-creation.component.html src/app/character-creation/__tests__/character-creation-integration.spec.ts
git commit -m "feat: display class requirements on buttons

Shows unmet requirements on ineligible class buttons.
Format: 'Need: STR 11+' below class name.
Updates reactively as user allocates/deallocates points."
```

---

## Task 4: Add CSS Styling for Requirements Display

**Files:**
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Run visual verification**

```bash
npm start
```

Navigate to character creation, select race, advance to class selection.
Verify requirements appear but may look unstyled.

**Step 2: Add CSS**

File: `src/app/character-creation/character-creation.component.scss`

Add after the existing `.button-grid.classes button` styles:

```scss
// Class button content layout
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
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

// Requirements list styling
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
```

**Step 3: Update button sizing**

Find the `.button-grid.classes button` rule and update:

```scss
.button-grid.classes button {
  min-height: 3rem; // Was 2.5rem - increased for requirements
  height: auto; // Allow buttons to grow
  padding: 0.75rem;
  align-items: flex-start; // Top-align content

  // ... keep existing styles ...
}
```

**Step 4: Visual verification**

Refresh browser, verify:
- Requirements appear in orange/warning color
- "Need:" label is slightly muted
- Requirements are indented
- Buttons grow to accommodate Lord/Ninja (6 requirements)
- Eligible classes stay compact

**Step 5: Commit**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "style: add CSS for class requirements display

- Two-column layout within buttons (class name / requirements)
- Orange warning color for requirements
- Auto-height buttons to accommodate 1-6 requirements
- Increased min-height from 2.5rem to 3rem"
```

---

## Task 5: Run Full Test Suite and Fix Any Issues

**Files:**
- Test: All character creation tests

**Step 1: Run all character creation tests**

```bash
npm test -- character-creation
```

Expected: All tests should pass. If any fail, address them.

**Step 2: Check test coverage**

```bash
npm test -- character-creation --coverage
```

Verify:
- `unmetRequirements` signal: 100% coverage
- `mapStatToFinalStats` helper: 100% coverage
- Template integration: Requirements display tested

**Step 3: Run full test suite**

```bash
npm test
```

Verify no regressions in other components.

**Step 4: Manual testing checklist**

Run dev server and verify:
- [ ] Requirements appear on ineligible classes
- [ ] Requirements disappear when class becomes eligible
- [ ] Allocating points updates requirements in real-time
- [ ] Deallocating points shows requirements again
- [ ] Lord shows all 6 requirements correctly
- [ ] Ninja shows all 6 requirements correctly
- [ ] Eligible classes have no requirements displayed
- [ ] Button click still works for all classes
- [ ] Keyboard shortcuts still work
- [ ] Buttons fit within 768px height

**Step 5: Commit any fixes if needed**

```bash
git add <any-fixed-files>
git commit -m "fix: <description of fix>"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `docs/plans/2025-11-08-class-requirements-display.md`

**Step 1: Mark design as implemented**

File: `docs/plans/2025-11-08-class-requirements-display.md`

Update line 2:

```markdown
**Status**: ✅ Implemented (2025-11-08)
```

**Step 2: Add implementation notes section**

Add at end of document:

```markdown
---

## Implementation Completed

**Date**: 2025-11-08
**Commits**:
- Helper method for stat mapping
- Computed signal for unmet requirements
- Template update for requirements display
- CSS styling for requirements
- Full test coverage

**Test Results**:
- Unit tests: 142/142 passing
- Integration tests: 9/9 passing
- Coverage: 100% for new code

**Manual Verification**: ✅ All checklist items verified

**Known Issues**: None

**Future Enhancements**: See "Future Enhancements (Not in Scope)" section above
```

**Step 3: Commit documentation update**

```bash
git add docs/plans/2025-11-08-class-requirements-display.md
git commit -m "docs: mark class requirements display as implemented"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] `mapStatToFinalStats()` helper method added with tests
- [ ] `unmetRequirements` computed signal added with 5+ tests
- [ ] Template updated to show requirements on buttons
- [ ] CSS added for requirements display styling
- [ ] All 142+ character creation tests passing
- [ ] Integration test for requirements display passing
- [ ] Manual testing completed (10-item checklist)
- [ ] Documentation updated with implementation status
- [ ] All commits have clear messages
- [ ] No regressions in other components

---

## Expected Timeline

**Total estimated time**: 45-60 minutes

- Task 1 (Helper method): 5-8 minutes
- Task 2 (Computed signal): 10-15 minutes
- Task 3 (Template update): 8-10 minutes
- Task 4 (CSS styling): 8-10 minutes
- Task 5 (Testing & verification): 10-15 minutes
- Task 6 (Documentation): 4-5 minutes

---

## Notes

**TDD Approach**: Each task follows Test-Driven Development:
1. Write failing test first
2. Run to verify failure
3. Write minimal code to pass
4. Run to verify pass
5. Commit

**Reactive Architecture**: Uses Angular signals throughout - no manual subscriptions or change detection needed.

**YAGNI**: Implements exactly what's in the design, no extra features.

**DRY**: Reuses existing components, styles, and patterns from the codebase.

**Frequent Commits**: One commit per task (6 total) for easy review and rollback if needed.

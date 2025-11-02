# Character Creation Contextual Footer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fixed footer menu with contextual step-specific navigation in character creation wizard.

**Architecture:** Extend existing `footerMenuItems` computed signal with switch statement per step, expand `handleFooterAction` switch for new action IDs, simplify template by removing hint paragraphs and inline REROLL button.

**Tech Stack:** Angular 18, TypeScript, Signals, Jest

---

## Task 1: Update footerMenuItems Computed Signal

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts:147-160`

**Step 1: Replace fixed footer with contextual switch statement**

Locate the `footerMenuItems` computed signal (around line 147) and replace it with:

```typescript
readonly footerMenuItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [];

  switch(this.currentStep()) {
    case CreationStep.SELECT_RACE:
      items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.selectedRace() !== null });
      items.push({ id: 'cancel', label: 'CANCEL', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.SELECT_ALIGNMENT:
      items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.selectedAlignment() !== null });
      items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.ROLL_STATS:
      items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.SELECT_CLASS:
      items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.selectedClass() !== null });
      items.push({ id: 'reroll', label: 'REROLL STATS', shortcut: 'R', enabled: true });
      items.push({ id: 'reset', label: 'START OVER', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.NAME_CHARACTER:
      items.push({ id: 'create', label: 'CREATE CHARACTER', shortcut: 'ENTER', enabled: this.characterName().trim().length > 0 });
      items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;
  }

  return items;
});
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds, no TypeScript errors

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "refactor: add contextual footer menu items per step"
```

---

## Task 2: Expand handleFooterAction Switch

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts:574-584`

**Step 1: Add new action handlers**

Locate `handleFooterAction(itemId: string)` (around line 574) and replace the entire switch statement:

```typescript
handleFooterAction(itemId: string) {
  switch(itemId) {
    case 'continue':
      // Context-aware continue based on current step
      if (this.currentStep() === CreationStep.SELECT_RACE) {
        this.advanceToAlignment();
      } else if (this.currentStep() === CreationStep.SELECT_ALIGNMENT) {
        this.advanceToRollStats();
      } else if (this.currentStep() === CreationStep.SELECT_CLASS) {
        this.advanceToNameCharacter();
      }
      break;

    case 'cancel':
      // Step 1 only: cancel to training grounds
      this.cancelToTrainingGrounds();
      break;

    case 'back':
      // Context-aware back based on current step
      if (this.currentStep() === CreationStep.SELECT_ALIGNMENT) {
        this.goBackFromAlignment();
      } else if (this.currentStep() === CreationStep.ROLL_STATS) {
        this.goBackFromRollStats();
      } else if (this.currentStep() === CreationStep.NAME_CHARACTER) {
        this.goBackFromNameCharacter();
      }
      break;

    case 'reset':
      // Step 4 only: start over (nuclear reset)
      this.goBackFromSelectClass();
      break;

    case 'reroll':
      // Step 4 only: reroll stats
      this.rerollStats();
      break;

    case 'create':
      // Step 5 only: create character
      const name = this.characterName().trim();
      if (name) {
        this.submitCharacter(name);
      }
      break;

    case 'quit':
      this.navigateToTrainingGrounds();
      break;
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds, no TypeScript errors

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "refactor: expand footer action handler for contextual actions"
```

---

## Task 3: Remove Step Hint Paragraphs from Template

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html:149-176`

**Step 1: Remove hint paragraph sections from all steps**

Find and **DELETE** the `<div class="step-hints">` section (around lines 149-176) that contains:

```html
<div class="step-hints">
  @switch (currentStep()) {
    @case (CreationStep.SELECT_RACE) {
      <p><strong>ENTER:</strong> Continue | <strong>ESC:</strong> Cancel | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.SELECT_ALIGNMENT) {
      <p><strong>ENTER:</strong> Continue | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.ROLL_STATS) {
      <p><strong>R:</strong> Roll dice | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.SELECT_CLASS) {
      <p><strong>ENTER:</strong> Continue | <strong>R:</strong> Reroll stats | <strong>ESC:</strong> Start over | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.NAME_CHARACTER) {
      <p><strong>ENTER:</strong> Create character | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit</p>
    }
  }

  @if (successMessage()) {
    <div class="success-message">{{ successMessage() }}</div>
  }

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }
</div>
```

**Keep the success/error messages** but move them outside the deleted section. Place them after the closing `</div>` of `.step-content`:

```html
      </div> <!-- end .step-content -->

      @if (successMessage()) {
        <div class="success-message">{{ successMessage() }}</div>
      }

      @if (errorMessage()) {
        <div class="error-message">{{ errorMessage() }}</div>
      }
    </div> <!-- end .controls-column -->
```

**Step 2: Verify app still runs**

Run: `npm start` (in background if not running)
Navigate to: `http://localhost:4200/character-creation`
Expected: Wizard displays without hint paragraphs, success/error messages still visible

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.html
git commit -m "refactor: remove step hint paragraphs from template"
```

---

## Task 4: Remove Inline REROLL STATS Button

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html:95-103`

**Step 1: Delete REROLL STATS button from SELECT_CLASS step**

Find the SELECT_CLASS case (around line 95) and **DELETE** these lines:

```html
<button
  class="reroll-button"
  (click)="rerollStats()"
>
  REROLL STATS <span class="shortcut">(R)</span>
</button>

<hr class="section-divider" />
```

The class selection grid should start immediately after the step content div opens.

**Step 2: Verify app displays correctly**

Navigate to Step 4 (SELECT_CLASS) in browser
Expected: No inline REROLL button, class grid displays immediately

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.html
git commit -m "refactor: remove inline REROLL STATS button (now in footer)"
```

---

## Task 5: Add Minimal Selection Hints

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html`

**Step 1: Add selection hint to SELECT_RACE**

After the race description `<div class="race-description">` closing tag (around line 44), add:

```html
              </div>
            }
            <div class="selection-hint">Press 1-5 to select race</div>
          </div>
```

**Step 2: Add selection hint to SELECT_ALIGNMENT**

After the alignment description `<div class="alignment-description">` closing tag (around line 75), add:

```html
              </div>
            }
            <div class="selection-hint">Press G/N/E to select alignment</div>
          </div>
```

**Step 3: Add selection hint to SELECT_CLASS**

After the class description `<div class="class-description">` closing tag (around line 124), add:

```html
              </div>
            }
            <div class="selection-hint">Press letter key to select class</div>
          </div>
```

**Note:** ROLL_STATS and NAME_CHARACTER steps do NOT need hints (self-explanatory).

**Step 4: Verify hints display**

Navigate through steps 1, 2, and 4
Expected: Subtle hint text below selection grids

**Step 5: Commit**

```bash
git add src/app/character-creation/character-creation.component.html
git commit -m "feat: add minimal selection hints to wizard steps"
```

---

## Task 6: Add CSS Styling for Selection Hints

**Files:**
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Add selection-hint styles**

Add to the SCSS file:

```scss
.selection-hint {
  font-size: 0.9em;
  color: #888;
  margin-top: 0.5rem;
  text-align: center;
  font-style: italic;
}
```

**Step 2: Verify styling**

Check browser at steps 1, 2, and 4
Expected: Hints are subtle, smaller text, gray color, centered, italicized

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "style: add selection-hint styling"
```

---

## Task 7: Manual Testing - Footer Updates Per Step

**No files modified - testing only**

**Step 1: Test Step 1 (SELECT_RACE) footer**

Navigate to character creation
Expected footer: `[ENTER] CONTINUE | [ESC] CANCEL | [Q] QUIT TO TRAINING GROUNDS`
- CONTINUE disabled initially, enabled after selecting race
- Click CONTINUE → advances to alignment
- Click ESC → returns to training grounds

**Step 2: Test Step 2 (SELECT_ALIGNMENT) footer**

Select race, press Enter
Expected footer: `[ENTER] CONTINUE | [ESC] BACK | [Q] QUIT TO TRAINING GROUNDS`
- CONTINUE disabled initially, enabled after selecting alignment
- Click CONTINUE → advances to roll stats
- Click ESC → returns to race selection

**Step 3: Test Step 3 (ROLL_STATS) footer**

Select alignment, press Enter
Expected footer: `[ESC] BACK | [Q] QUIT TO TRAINING GROUNDS`
- Click ROLL DICE → auto-advances to class selection
- Click ESC → returns to alignment selection

**Step 4: Test Step 4 (SELECT_CLASS) footer**

Roll stats
Expected footer: `[ENTER] CONTINUE | [R] REROLL STATS | [ESC] START OVER | [Q] QUIT TO TRAINING GROUNDS`
- CONTINUE disabled initially, enabled after selecting class
- Click REROLL → re-rolls stats, stays on class selection
- Click ESC → returns to alignment (clears stats)
- Click CONTINUE → advances to name character

**Step 5: Test Step 5 (NAME_CHARACTER) footer**

Select class, press Enter
Expected footer: `[ENTER] CREATE CHARACTER | [ESC] BACK | [Q] QUIT TO TRAINING GROUNDS`
- CREATE disabled initially, enabled after typing name
- Type name, click CREATE → creates character, resets wizard
- Click ESC → returns to class selection

**Step 6: Document testing results**

If all tests pass: Proceed
If any issues: Note them for fixing

---

## Task 8: Keyboard Shortcuts Still Work

**No files modified - testing only**

**Step 1: Test keyboard shortcuts at each step**

- Step 1: Press 1-5 to select race, ENTER to continue, ESC to cancel
- Step 2: Press G/N/E to select alignment, ENTER to continue, ESC to go back
- Step 3: Press R to roll, ESC to go back
- Step 4: Press F/M/P/T/B/A/L/J to select class, R to reroll, ENTER to continue, ESC to start over
- Step 5: Type name, ENTER to create, ESC to go back
- All steps: Q to quit

**Step 2: Verify all shortcuts work**

Expected: All keyboard handlers still functional (dual path works)

---

## Task 9: Final Build and Commit

**Files:**
- All modified files

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings (except SCSS budget warning if present)

**Step 2: Run tests (if applicable)**

Run: `npm test`
Expected: All existing tests pass (no new test failures)

**Step 3: Final visual inspection**

Navigate through entire character creation flow
Expected: Clean UI, contextual footer updates per step, all actions work

**Step 4: Final commit message (if any loose changes)**

```bash
git add .
git commit -m "refactor: character creation contextual footer complete

- Footer menu now shows step-specific actions
- Removed redundant hint paragraphs and inline REROLL button
- Added minimal selection hints for better UX
- All keyboard shortcuts still functional
- Maintains enabled/disabled state logic per step"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Footer shows 3 items at Step 1 (Continue, Cancel, Quit)
- [ ] Footer shows 3 items at Step 2 (Continue, Back, Quit)
- [ ] Footer shows 2 items at Step 3 (Back, Quit)
- [ ] Footer shows 4 items at Step 4 (Continue, Reroll, Start Over, Quit)
- [ ] Footer shows 3 items at Step 5 (Create, Back, Quit)
- [ ] Continue/Create buttons disabled until valid input
- [ ] All footer button clicks work correctly
- [ ] All keyboard shortcuts still work
- [ ] ESC behavior changes per step (Cancel → Back → Start Over)
- [ ] No REROLL inline button at Step 4
- [ ] Selection hints visible at Steps 1, 2, 4
- [ ] Success/error messages still display
- [ ] Build succeeds with no TypeScript errors
- [ ] No visual regressions

---

## Files Modified Summary

1. `src/app/character-creation/character-creation.component.ts` - footerMenuItems computed, handleFooterAction expanded
2. `src/app/character-creation/character-creation.component.html` - removed hints, removed REROLL button, added selection hints
3. `src/app/character-creation/character-creation.component.scss` - added .selection-hint styles

**Total Lines Changed:** ~100 lines (60 added, 40 removed)
**Estimated Time:** 30-45 minutes
**Risk Level:** Low (extends existing patterns, no new dependencies)

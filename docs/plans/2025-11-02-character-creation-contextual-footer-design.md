# Character Creation Contextual Footer Menu Design

**Date:** 2025-11-02
**Status:** Design Approved
**Component:** Character Creation Wizard

## Overview

Refactor the character creation wizard to use a contextual footer menu that displays step-specific navigation actions, replacing the current fixed 2-item footer and scattered step hints.

## Goals

1. **Centralize Navigation**: Move all navigation actions (Continue, Back, Reset, Quit, Reroll) to a contextual footer
2. **Maintain Primary Actions**: Keep selection buttons and ROLL DICE inline in step content
3. **Improve Clarity**: Footer shows exactly what actions are available at each step with correct labels
4. **Preserve Keyboard Flow**: All existing keyboard shortcuts remain functional

## Current State Problems

1. **Footer Mismatch**: Footer shows "RESET (ESC)" but ESC actually does navigation (back/cancel), not reset
2. **Scattered UI**: Navigation hints in step content, some actions as inline buttons (REROLL), others keyboard-only
3. **Hidden Actions**: Continue/Back actions only visible in hint text, not as clickable buttons
4. **Inconsistent Patterns**: Mix of inline buttons, hints-only, and footer items

## Design Decisions

### What Stays in Step Content (Inline)
- Selection buttons: Race (1-5), Alignment (G/N/E), Class (F/M/P/T/B/A/L/J)
- ROLL DICE button (primary action with animation)
- Character name input field
- Descriptions and stat displays

### What Moves to Contextual Footer
- Continue/Create buttons (context-aware)
- Back/Cancel buttons (context-aware)
- Reset/Start Over (Step 4 only)
- Reroll Stats (Step 4 only - removes inline button)
- Quit to Training Grounds (all steps)

### What Gets Simplified
- Current hint paragraphs removed
- Replaced with minimal selection hints: "Press 1-5 to select race"

## Architecture

### Computed Signal Pattern

Use existing `footerMenuItems` computed signal, replace fixed array with switch statement:

```typescript
readonly footerMenuItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [];

  switch(this.currentStep()) {
    case CreationStep.SELECT_RACE:
      items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER',
                   enabled: this.selectedRace() !== null });
      items.push({ id: 'cancel', label: 'CANCEL', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.SELECT_ALIGNMENT:
      items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER',
                   enabled: this.selectedAlignment() !== null });
      items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.ROLL_STATS:
      items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.SELECT_CLASS:
      items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER',
                   enabled: this.selectedClass() !== null });
      items.push({ id: 'reroll', label: 'REROLL STATS', shortcut: 'R', enabled: true });
      items.push({ id: 'reset', label: 'START OVER', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;

    case CreationStep.NAME_CHARACTER:
      items.push({ id: 'create', label: 'CREATE CHARACTER', shortcut: 'ENTER',
                   enabled: this.characterName().trim().length > 0 });
      items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
      items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });
      break;
  }

  return items;
});
```

## Footer Menu Items Per Step

| Step | Actions | ESC Behavior |
|------|---------|--------------|
| **Step 1: SELECT_RACE** | Continue (ENTER), Cancel (ESC), Quit (Q) | Cancel to Training Grounds |
| **Step 2: SELECT_ALIGNMENT** | Continue (ENTER), Back (ESC), Quit (Q) | Back to Race |
| **Step 3: ROLL_STATS** | Back (ESC), Quit (Q) | Back to Alignment |
| **Step 4: SELECT_CLASS** | Continue (ENTER), Reroll (R), Start Over (ESC), Quit (Q) | Back to Alignment (clears stats) |
| **Step 5: NAME_CHARACTER** | Create (ENTER), Back (ESC), Quit (Q) | Back to Class |

**Enabled State Logic:**
- Continue: Enabled when selection made (`selectedRace() !== null`, etc.)
- Create: Enabled when name valid (`characterName().trim().length > 0`)
- All others: Always enabled

## Handler Updates

Expand `handleFooterAction(itemId)` with new cases:

```typescript
handleFooterAction(itemId: string) {
  switch(itemId) {
    case 'continue':
      // Context-aware continue
      if (this.currentStep() === CreationStep.SELECT_RACE) {
        this.advanceToAlignment();
      } else if (this.currentStep() === CreationStep.SELECT_ALIGNMENT) {
        this.advanceToRollStats();
      } else if (this.currentStep() === CreationStep.SELECT_CLASS) {
        this.advanceToNameCharacter();
      }
      break;

    case 'cancel':
      this.cancelToTrainingGrounds();
      break;

    case 'back':
      // Context-aware back
      if (this.currentStep() === CreationStep.SELECT_ALIGNMENT) {
        this.goBackFromAlignment();
      } else if (this.currentStep() === CreationStep.ROLL_STATS) {
        this.goBackFromRollStats();
      } else if (this.currentStep() === CreationStep.NAME_CHARACTER) {
        this.goBackFromNameCharacter();
      }
      break;

    case 'reset':
      this.goBackFromSelectClass(); // Nuclear reset
      break;

    case 'reroll':
      this.rerollStats();
      break;

    case 'create':
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

**Note:** Keyboard handlers (`handleRaceStepKeys`, etc.) remain unchanged - they handle selection shortcuts and call the same navigation methods.

## Template Changes

### Remove From Each Step

**Current hint paragraphs** like:
```html
<paragraph>
  <strong>ENTER:</strong> Continue | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit
</paragraph>
```

**REROLL STATS inline button** at Step 4:
```html
<button class="reroll-button" (click)="rerollStats()">
  REROLL STATS <span class="shortcut">(R)</span>
</button>
```

### Add Minimal Selection Hints

```html
<!-- Step 1: SELECT_RACE -->
<div class="selection-hint">Press 1-5 to select race</div>

<!-- Step 2: SELECT_ALIGNMENT -->
<div class="selection-hint">Press G/N/E to select alignment</div>

<!-- Step 4: SELECT_CLASS -->
<div class="selection-hint">Press letter key to select class</div>
```

**Styling:**
```scss
.selection-hint {
  font-size: 0.9em;
  color: #888;
  margin-top: 0.5rem;
  text-align: center;
}
```

## Benefits

1. **Single Source of Truth**: Footer is THE navigation control center
2. **Contextual Clarity**: Users see exactly what actions are available per step
3. **Consistent ESC Behavior**: Button label matches actual behavior
4. **Better Discoverability**: All actions visible and clickable, not keyboard-only
5. **Cleaner UI**: Removes redundant hint paragraphs
6. **Progressive Enablement**: Buttons disabled until valid state
7. **Maintains Keyboard Flow**: All shortcuts still work

## Testing Strategy

### Unit Tests

- `footerMenuItems` returns correct items for each `CreationStep`
- Continue button enabled/disabled based on selection state
- Create button enabled/disabled based on name length
- `handleFooterAction` routes actions correctly per context
- All 5 steps show expected footer items

### Manual Testing Flow

1. Navigate through all 5 steps checking footer updates
2. Verify Continue/Create disabled when invalid
3. Test all footer buttons (mouse clicks)
4. Test all keyboard shortcuts (still functional)
5. Verify ESC changes behavior per step
6. Check visual layout with 4 items (Step 4 density)

## Implementation Notes

- No changes to footer component itself (already dynamic)
- Keyboard handlers stay intact (dual path: keyboard + footer clicks)
- Reuses existing `MenuItem` interface
- Existing `handleFooterAction` switch extends cleanly
- Angular signals handle reactivity automatically

## Files to Modify

1. `src/app/character-creation/character-creation.component.ts`
   - Update `footerMenuItems` computed signal (~60 lines)
   - Expand `handleFooterAction` switch (~40 lines)

2. `src/app/character-creation/character-creation.component.html`
   - Remove hint paragraphs from all 5 steps
   - Remove REROLL STATS inline button
   - Add minimal selection hints

3. `src/app/character-creation/character-creation.component.scss`
   - Add `.selection-hint` styling

## Risk Assessment

**Low Risk Refactor:**
- No new patterns introduced
- Reuses existing MenuItem/footer infrastructure
- Keyboard handlers unchanged (fallback path)
- Can be tested incrementally per step
- Easy to revert if issues arise

**Potential Issues:**
- Footer might feel crowded at Step 4 (4 items) - monitor UX
- Need to ensure enabled state logic is bulletproof
- Test that footer updates on step transitions

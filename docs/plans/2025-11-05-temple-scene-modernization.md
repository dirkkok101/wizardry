# Temple Scene Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize Temple scene to use SceneFooterComponent pattern, display only afflicted characters, eliminate multi-state view machine.

**Architecture:** Replace 3-view state machine (main → select-character → select-service) with single-state reactive design using Angular signals. Show afflicted characters using CharacterCardComponent, auto-match services to character status.

**Tech Stack:** Angular 19 standalone components, Angular signals, Jest testing, SceneFooterComponent, CharacterCardComponent

---

## Task 1: Add footerMenuItems computed signal (TDD)

**Files:**
- Test: `src/app/temple/temple.component.spec.ts`
- Modify: `src/app/temple/temple.component.ts`

### Step 1: Write failing test for footerMenuItems

Add to `temple.component.spec.ts` after existing describe blocks:

```typescript
describe('footerMenuItems', () => {
  it('has 5 menu items with correct shortcuts', () => {
    fixture.detectChanges();
    const items = component.footerMenuItems();

    expect(items.length).toBe(5);
    expect(items[0]).toEqual({ id: 'cure-poison', label: 'Cure Poison', shortcut: 'P', enabled: expect.any(Boolean) });
    expect(items[1]).toEqual({ id: 'cure-paralysis', label: 'Cure Paralysis', shortcut: 'A', enabled: expect.any(Boolean) });
    expect(items[2]).toEqual({ id: 'resurrect', label: 'Resurrect', shortcut: 'R', enabled: expect.any(Boolean) });
    expect(items[3]).toEqual({ id: 'restore', label: 'Restore', shortcut: 'S', enabled: expect.any(Boolean) });
    expect(items[4]).toEqual({ id: 'return', label: 'Return to Castle (ESC)', shortcut: 'ESC', enabled: true });
  });

  it('enables Cure Poison when character is POISONED', () => {
    fixture.detectChanges();
    const items = component.footerMenuItems();
    const curePoison = items.find(i => i.id === 'cure-poison');
    expect(curePoison?.enabled).toBe(true);
  });

  it('disables Cure Poison when no character is POISONED', () => {
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', {
        ...mockCharacter,
        status: CharacterStatus.DEAD
      })
    }));
    fixture.detectChanges();

    const items = component.footerMenuItems();
    const curePoison = items.find(i => i.id === 'cure-poison');
    expect(curePoison?.enabled).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- temple.component.spec
```

Expected output: `FAIL - footerMenuItems is not a function`

### Step 3: Add footerMenuItems computed signal

In `temple.component.ts`, add after `afflictedCharacters` computed:

```typescript
readonly footerMenuItems = computed((): MenuItem[] => {
  const afflicted = this.afflictedCharacters();

  return [
    {
      id: 'cure-poison',
      label: 'Cure Poison',
      shortcut: 'P',
      enabled: afflicted.some(c => c.status === CharacterStatus.POISONED)
    },
    {
      id: 'cure-paralysis',
      label: 'Cure Paralysis',
      shortcut: 'A',
      enabled: afflicted.some(c => c.status === CharacterStatus.PARALYZED)
    },
    {
      id: 'resurrect',
      label: 'Resurrect',
      shortcut: 'R',
      enabled: afflicted.some(c => c.status === CharacterStatus.DEAD)
    },
    {
      id: 'restore',
      label: 'Restore',
      shortcut: 'S',
      enabled: afflicted.some(c => c.status === CharacterStatus.ASHES)
    },
    {
      id: 'return',
      label: 'Return to Castle (ESC)',
      shortcut: 'ESC',
      enabled: true
    }
  ];
});
```

### Step 4: Run test to verify it passes

```bash
npm test -- temple.component.spec
```

Expected output: `PASS` for all 3 new tests

### Step 5: Commit

```bash
git add src/app/temple/temple.component.ts src/app/temple/temple.component.spec.ts
git commit -m "test: add footerMenuItems computed signal with affliction-based enabling"
```

---

## Task 2: Add confirmation dialog signals (TDD)

**Files:**
- Test: `src/app/temple/temple.component.spec.ts`
- Modify: `src/app/temple/temple.component.ts`

### Step 1: Write failing test for confirmation dialog

Add to `temple.component.spec.ts`:

```typescript
describe('confirmation dialog', () => {
  it('shows confirmation when service selected', () => {
    expect(component.showConfirmation()).toBe(false);

    component.handleFooterAction('cure-poison');

    expect(component.showConfirmation()).toBe(true);
    expect(component.confirmationMessage()).toContain('Gandalf');
    expect(component.confirmationMessage()).toContain('poison');
  });

  it('hides confirmation when cancelled', () => {
    component.handleFooterAction('cure-poison');
    expect(component.showConfirmation()).toBe(true);

    component.cancelService();

    expect(component.showConfirmation()).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- temple.component.spec
```

Expected output: `FAIL - showConfirmation is not a function`

### Step 3: Add confirmation dialog signals

In `temple.component.ts`, replace old signals with:

```typescript
// Confirmation dialog state
readonly showConfirmation = signal(false);
readonly confirmationMessage = signal('');
private pendingService = signal<{
  type: ServiceType;
  characterId: string;
} | null>(null);
```

Remove old signals: `currentView`, `selectedCharacterId`, `selectedService`, `errorMessage`, `successMessage`

### Step 4: Add cancelService method

```typescript
cancelService(): void {
  this.showConfirmation.set(false);
  this.confirmationMessage.set('');
  this.pendingService.set(null);
}
```

### Step 5: Add handleFooterAction stub

```typescript
handleFooterAction(itemId: string): void {
  if (itemId === 'return') {
    this.router.navigate(['/castle-menu']);
    return;
  }

  // Service selection - to be implemented
  const serviceType = this.getServiceTypeFromId(itemId);
  if (!serviceType) return;

  const afflicted = this.afflictedCharacters();
  const matchingCharacters = afflicted.filter(c => {
    switch (serviceType) {
      case ServiceType.CURE_POISON: return c.status === CharacterStatus.POISONED;
      case ServiceType.CURE_PARALYSIS: return c.status === CharacterStatus.PARALYZED;
      case ServiceType.RESURRECT: return c.status === CharacterStatus.DEAD;
      case ServiceType.RESTORE: return c.status === CharacterStatus.ASHES;
      default: return false;
    }
  });

  if (matchingCharacters.length === 1) {
    const char = matchingCharacters[0];
    this.pendingService.set({ type: serviceType, characterId: char.id });
    this.confirmationMessage.set(`${this.getServiceActionText(serviceType)} ${char.name}?`);
    this.showConfirmation.set(true);
  }
}

private getServiceTypeFromId(id: string): ServiceType | null {
  switch (id) {
    case 'cure-poison': return ServiceType.CURE_POISON;
    case 'cure-paralysis': return ServiceType.CURE_PARALYSIS;
    case 'resurrect': return ServiceType.RESURRECT;
    case 'restore': return ServiceType.RESTORE;
    default: return null;
  }
}

private getServiceActionText(service: ServiceType): string {
  switch (service) {
    case ServiceType.CURE_POISON: return 'Cure poison for';
    case ServiceType.CURE_PARALYSIS: return 'Cure paralysis for';
    case ServiceType.RESURRECT: return 'Attempt to resurrect';
    case ServiceType.RESTORE: return 'Attempt to restore';
    default: return 'Service for';
  }
}
```

### Step 6: Run test to verify it passes

```bash
npm test -- temple.component.spec
```

Expected output: `PASS` for confirmation dialog tests

### Step 7: Commit

```bash
git add src/app/temple/temple.component.ts src/app/temple/temple.component.spec.ts
git commit -m "feat: add confirmation dialog signals and service selection flow"
```

---

## Task 3: Implement confirmService method (TDD)

**Files:**
- Test: `src/app/temple/temple.component.spec.ts`
- Modify: `src/app/temple/temple.component.ts`

### Step 1: Write failing test for service execution

Add to `temple.component.spec.ts`:

```typescript
describe('confirmService', () => {
  it('executes Cure Poison service and updates state', () => {
    component.handleFooterAction('cure-poison');
    const initialStatus = gameState.state().roster.get('char-1')?.status;
    expect(initialStatus).toBe(CharacterStatus.POISONED);

    component.confirmService();

    const updatedStatus = gameState.state().roster.get('char-1')?.status;
    expect(updatedStatus).toBe(CharacterStatus.OK);
    expect(component.showConfirmation()).toBe(false);
  });

  it('deducts gold from party', () => {
    const initialGold = gameState.state().party.gold;
    component.handleFooterAction('cure-poison');

    component.confirmService();

    const finalGold = gameState.state().party.gold;
    expect(finalGold).toBeLessThan(initialGold);
  });

  it('shows error when insufficient gold', () => {
    gameState.updateState(state => ({
      ...state,
      party: { ...state.party, gold: 0 }
    }));

    component.handleFooterAction('cure-poison');
    component.confirmService();

    expect(component.errorMessage()).toContain('Cannot afford');
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- temple.component.spec
```

Expected output: `FAIL - confirmService is not defined` or `Expected OK but got POISONED`

### Step 3: Add errorMessage signal

In `temple.component.ts`:

```typescript
readonly errorMessage = signal<string | null>(null);
```

### Step 4: Implement confirmService method

```typescript
confirmService(): void {
  const pending = this.pendingService();
  if (!pending) return;

  const state = this.gameState.state();
  const character = state.roster.get(pending.characterId);
  if (!character) {
    this.errorMessage.set('Character not found');
    this.cancelService();
    return;
  }

  // Check gold
  const tithe = TempleService.calculateTithe(character, pending.type);
  const party = this.currentParty();
  if (party.gold < tithe) {
    this.errorMessage.set(`Cannot afford service. Need ${tithe} gold.`);
    this.cancelService();
    return;
  }

  // Execute service
  const result = TempleService.performService(state, pending.characterId, pending.type);

  if (result.success && result.state) {
    this.gameState.updateState(() => result.state!);
    this.errorMessage.set(null);
  } else if (result.error && result.state) {
    // Service failed but state changed (resurrection failure)
    this.gameState.updateState(() => result.state!);
    this.errorMessage.set(result.error);
  } else {
    this.errorMessage.set(result.error || 'Service failed');
  }

  this.cancelService();
}
```

### Step 5: Run test to verify it passes

```bash
npm test -- temple.component.spec
```

Expected output: `PASS` for all confirmService tests

### Step 6: Commit

```bash
git add src/app/temple/temple.component.ts src/app/temple/temple.component.spec.ts
git commit -m "feat: implement confirmService with TempleService integration"
```

---

## Task 4: Update component template to use SceneFooterComponent

**Files:**
- Test: `src/app/temple/temple.component.spec.ts`
- Modify: `src/app/temple/temple.component.html`
- Modify: `src/app/temple/temple.component.ts` (imports)

### Step 1: Write test for SceneFooterComponent presence

Add to `temple.component.spec.ts`:

```typescript
describe('template structure', () => {
  it('renders SceneTitleComponent', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('app-scene-title');
    expect(title).toBeTruthy();
  });

  it('renders SceneFooterComponent with menu items', () => {
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('app-scene-footer');
    expect(footer).toBeTruthy();
  });

  it('renders character cards for afflicted characters', () => {
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('app-character-card');
    expect(cards.length).toBe(1); // One POISONED character
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- temple.component.spec
```

Expected output: `FAIL - app-scene-title not found`

### Step 3: Update component imports

In `temple.component.ts`:

```typescript
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { TempleService } from '../../services/TempleService';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '../../components/menu/menu.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ServiceType } from '../../types/ServiceType';

@Component({
  selector: 'app-temple',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
```

### Step 4: Replace template HTML

Replace entire `temple.component.html`:

```html
<div class="temple-scene">
  <!-- Header -->
  <app-scene-title />

  <!-- Content: Afflicted Characters -->
  <div class="temple-content">
    @if (afflictedCharacters().length > 0) {
      <div class="character-grid">
        @for (char of afflictedCharacters(); track char.id) {
          <app-character-card
            [character]="char"
            [actions]="['inspect']"
            (actionClick)="handleCharacterAction($event)"
          />
        }
      </div>
    } @else {
      <div class="empty-state">
        <p>Your party is in good health.</p>
        <p>No one requires the temple's services at this time.</p>
      </div>
    }

    <!-- Error Message -->
    @if (errorMessage()) {
      <div class="error-message">{{ errorMessage() }}</div>
    }
  </div>

  <!-- Footer: Service Menu -->
  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />

  <!-- Confirmation Dialog -->
  @if (showConfirmation()) {
    <app-confirmation-dialog
      [message]="confirmationMessage()"
      (confirm)="confirmService()"
      (cancel)="cancelService()"
    />
  }
</div>
```

### Step 5: Add handleCharacterAction stub

In `temple.component.ts`:

```typescript
handleCharacterAction(event: CharacterActionEvent): void {
  if (event.actionType === 'inspect') {
    this.router.navigate(['/character-inspection'], {
      queryParams: {
        characterId: event.characterId,
        returnTo: 'temple'
      }
    });
  }
}
```

### Step 6: Run test to verify it passes

```bash
npm test -- temple.component.spec
```

Expected output: `PASS` for template structure tests

### Step 7: Commit

```bash
git add src/app/temple/temple.component.ts src/app/temple/temple.component.html
git commit -m "feat: update Temple template to use SceneFooterComponent pattern"
```

---

## Task 5: Add temple-specific styles

**Files:**
- Modify: `src/app/temple/temple.component.scss`

### Step 1: Replace styles

Replace entire `temple.component.scss`:

```scss
.temple-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.temple-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary, #888);

  p {
    margin: 0.5rem 0;
    font-size: 1.1rem;
  }
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--error-bg, #fee);
  color: var(--error-text, #c00);
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
}
```

### Step 2: Commit

```bash
git add src/app/temple/temple.component.scss
git commit -m "style: add Temple scene grid layout and empty state styles"
```

---

## Task 6: Remove old method implementations

**Files:**
- Modify: `src/app/temple/temple.component.ts`

### Step 1: Remove obsolete methods

Delete these methods from `temple.component.ts`:
- `handleMenuSelect()`
- `handleCharacterSelect()`
- `getFilteredCharacters()`
- `executeService()` (replaced by `confirmService()`)
- `cancelView()`

### Step 2: Remove obsolete properties

Delete:
- `readonly menuItems: MenuItem[]`

### Step 3: Run tests

```bash
npm test -- temple.component.spec
```

Expected output: All existing tests should still pass

### Step 4: Commit

```bash
git add src/app/temple/temple.component.ts
git commit -m "refactor: remove obsolete multi-state view methods"
```

---

## Task 7: Update tests for new architecture

**Files:**
- Modify: `src/app/temple/temple.component.spec.ts`

### Step 1: Remove obsolete test blocks

Delete these describe blocks:
- Tests for `handleMenuSelect` (if exists)
- Tests for `handleCharacterSelect` (if exists)
- Tests for `getFilteredCharacters` (if exists)
- Tests for view state transitions (if exists)

### Step 2: Add integration test for full service flow

Add to `temple.component.spec.ts`:

```typescript
describe('integration: full service flow', () => {
  it('completes Cure Poison flow from menu to state update', () => {
    fixture.detectChanges();

    // Verify character is poisoned
    expect(gameState.state().roster.get('char-1')?.status).toBe(CharacterStatus.POISONED);

    // Verify menu has Cure Poison enabled
    const items = component.footerMenuItems();
    const curePoison = items.find(i => i.id === 'cure-poison');
    expect(curePoison?.enabled).toBe(true);

    // Select Cure Poison
    component.handleFooterAction('cure-poison');
    expect(component.showConfirmation()).toBe(true);

    // Confirm service
    component.confirmService();

    // Verify character is cured
    expect(gameState.state().roster.get('char-1')?.status).toBe(CharacterStatus.OK);
    expect(component.showConfirmation()).toBe(false);

    // Verify menu now has Cure Poison disabled
    fixture.detectChanges();
    const updatedItems = component.footerMenuItems();
    const updatedCurePoison = updatedItems.find(i => i.id === 'cure-poison');
    expect(updatedCurePoison?.enabled).toBe(false);
  });
});
```

### Step 3: Run full test suite

```bash
npm test -- temple.component.spec
```

Expected output: All tests passing

### Step 4: Commit

```bash
git add src/app/temple/temple.component.spec.ts
git commit -m "test: update Temple tests for single-state architecture"
```

---

## Task 8: Update Temple documentation

**Files:**
- Modify: `docs/ui/scenes/05-temple-of-cant.md`

### Step 1: Update ASCII mockup section

Find and replace the ASCII mockup in `05-temple-of-cant.md`:

```markdown
## Visual Layout

```
┌─────────────────────────────────────────────────┐
│  TEMPLE OF CANT                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Gandalf - POISONED]      [Frodo - DEAD]      │
│  Level 5 Mage              Level 3 Thief        │
│  HP: 15/25                 HP: 0/18             │
│  [Inspect]                 [Inspect]            │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  (P)oison  P(A)ralysis  (R)esurrect  Re(S)tore │
│  Return to Castle (ESC)                         │
└─────────────────────────────────────────────────┘
```
```

### Step 2: Update Navigation section

Replace navigation table:

```markdown
## Navigation

| Action | Key | Destination | Validation |
|--------|-----|-------------|------------|
| Cure Poison | P | Confirmation dialog | At least one POISONED character |
| Cure Paralysis | A | Confirmation dialog | At least one PARALYZED character |
| Resurrect | R | Confirmation dialog | At least one DEAD character |
| Restore | S | Confirmation dialog | At least one ASHES character |
| Inspect Character | Click | Character Inspection | Always available |
| Return to Castle | ESC | Castle Menu | Always available |
```

### Step 3: Add Empty State section

Add new section:

```markdown
## Empty State

When no party members have afflictions (all status = OK):

- Display message: "Your party is in good health. No one requires the temple's services at this time."
- All service menu items (P/A/R/S) are disabled
- Only ESC (Return to Castle) is enabled
```

### Step 4: Commit

```bash
git add docs/ui/scenes/05-temple-of-cant.md
git commit -m "docs: update Temple scene documentation for new architecture"
```

---

## Task 9: Run full test suite and verify build

**Files:**
- None (verification only)

### Step 1: Run complete test suite

```bash
npm test
```

Expected output:
- All tests passing (≥787 total)
- Coverage ≥88%
- Execution time <20 seconds

### Step 2: Verify TypeScript build

```bash
ng build
```

Expected output:
- Build succeeds
- No TypeScript errors
- No unused import warnings

### Step 3: Manual verification checklist

- [ ] Temple scene displays correctly
- [ ] Only afflicted characters shown
- [ ] Empty state appears when all healthy
- [ ] Service menu items enable/disable correctly
- [ ] Confirmation dialog shows correct message
- [ ] Service execution updates character status
- [ ] Gold deducted from party
- [ ] Error shown for insufficient gold
- [ ] Character inspection navigation works
- [ ] ESC returns to Castle Menu

---

## Task 10: Update implementation status in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

### Step 1: Add to "Completed" section

Find "Phase 6: Town Service Completion & Castle Integration" and add after:

```markdown
- **Temple Scene Modernization** (2025-11-05):
  - Migrated to SceneTitleComponent + SceneFooterComponent pattern
  - Replaced multi-state view machine with single-state reactive design
  - Display only afflicted characters using CharacterCardComponent
  - Auto-match services to character afflictions
  - Service shortcuts: (P)oison, P(A)ralysis, (R)esurrect, Re(S)tore
  - Reduced component code by ~80 lines
  - All 4 Temple services working identically
  - Empty state when party fully healthy
```

### Step 2: Commit

```bash
git add CLAUDE.md
git commit -m "docs: update implementation status with Temple modernization"
```

---

## Success Criteria

- ✅ All Temple functionality preserved
- ✅ Code reduced by ~80 lines
- ✅ Follows Castle Menu/Training Grounds pattern
- ✅ All tests passing (≥787 total)
- ✅ Coverage maintained (≥88%)
- ✅ Build succeeds with no errors
- ✅ Documentation updated

## Testing Commands Reference

```bash
# Run all tests
npm test

# Run Temple tests only
npm test -- temple.component.spec

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Build for production
ng build

# Development server
npm start
```

## Related Skills

- @superpowers:test-driven-development - Used throughout for RED-GREEN-REFACTOR cycle
- @superpowers:verification-before-completion - Used in Task 9 for final verification
- @superpowers:requesting-code-review - Should be run after Task 10

---

**Plan complete.** Ready for execution using superpowers:executing-plans or superpowers:subagent-driven-development.

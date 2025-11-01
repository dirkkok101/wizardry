# Phase 4: Town Service Scenes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the five town service scenes (Tavern, Temple, Shop, Inn, Training Grounds) with their shared UI components, enabling party formation, character management, and service interactions.

**Architecture:** Build reusable UI components first (CharacterListComponent, ConfirmationDialogComponent), then implement each service scene as a standalone Angular component following the established patterns. Each scene uses signal-based state management, MenuComponent for navigation, and pure service functions for business logic.

**Tech Stack:** Angular 20, TypeScript 5.5+, Jest, SCSS, Signals

**Reference Design:** `docs/plans/2025-11-01-angular-migration-design.md` Section 4 (UI Patterns), Section 3.2 (Component Mapping)

---

## Prerequisites Verification

Before starting Phase 4, verify Phase 3 completion:

```bash
# Verify current location
pwd
# Expected: /Users/dirkkok/Development/wizardry/.worktrees/angular-migration

# Verify Phase 3 scenes exist
ls -la src/app/{title-screen,castle-menu,edge-of-town}/
# Expected: All three directories with component files

# Verify all tests pass
npm test
# Expected: 107 tests passing, <5s execution time

# Verify latest commit is polish
git log --oneline | head -1
# Expected: "polish: address code review recommendations"
```

---

## Phase 4 Overview

**Shared Components (Build First):**
1. CharacterListComponent (Pattern 2) - Reusable character selection/display
2. ConfirmationDialogComponent (Pattern 5) - Reusable yes/no dialogs
3. ErrorDisplayComponent (Pattern 4) - Centralized error messaging

**Service Scenes (Build After Components):**
4. Tavern - Party formation (add/remove/inspect characters)
5. Inn - Rest and level up
6. Temple - Healing and resurrection
7. Shop - Buy/sell/identify items
8. Training Grounds - Character creation

**Estimated Time:** 12-16 hours (2-3 days full-time)

---

## Task 1: CharacterListComponent (Pattern 2)

**Goal:** Create reusable component for displaying and selecting characters from roster.

**Files:**
- Create: `src/components/character-list/character-list.component.ts`
- Create: `src/components/character-list/character-list.component.html`
- Create: `src/components/character-list/character-list.component.scss`
- Create: `src/components/character-list/character-list.component.spec.ts`

**Reference:** `docs/ui/ui-patterns.md` Pattern 2: Character Selection

### Step 1.1: Create component directory

```bash
mkdir -p src/components/character-list
```

### Step 1.2: Write component test (TDD)

Create `src/components/character-list/character-list.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterListComponent } from './character-list.component';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

describe('CharacterListComponent', () => {
  let component: CharacterListComponent;
  let fixture: ComponentFixture<CharacterListComponent>;

  const testCharacters: Character[] = [
    {
      id: 'char-1',
      name: 'Gandalf',
      class: CharacterClass.MAGE,
      level: 5,
      hp: 20,
      maxHp: 25,
      status: 'OK',
      gold: 100
    } as Character,
    {
      id: 'char-2',
      name: 'Aragorn',
      class: CharacterClass.FIGHTER,
      level: 6,
      hp: 45,
      maxHp: 50,
      status: 'OK',
      gold: 250
    } as Character
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterListComponent);
    component = fixture.componentInstance;
  });

  describe('display mode', () => {
    it('displays all characters in list', () => {
      component.characters = testCharacters;
      component.selectable = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.character-item');

      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('Gandalf');
      expect(items[1].textContent).toContain('Aragorn');
    });

    it('displays character stats (class, level, HP)', () => {
      component.characters = [testCharacters[0]];
      component.selectable = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const item = compiled.querySelector('.character-item');

      expect(item.textContent).toContain('MAGE');
      expect(item.textContent).toContain('Lv5');
      expect(item.textContent).toContain('20/25');
    });

    it('shows empty state when no characters', () => {
      component.characters = [];
      component.selectable = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.empty-state')).toBeTruthy();
      expect(compiled.querySelector('.empty-state').textContent).toContain('No characters');
    });
  });

  describe('selection mode', () => {
    it('allows character selection when selectable=true', () => {
      component.characters = testCharacters;
      component.selectable = true;
      fixture.detectChanges();

      jest.spyOn(component.characterSelected, 'emit');

      const compiled = fixture.nativeElement;
      const firstItem = compiled.querySelector('.character-item');
      firstItem.click();

      expect(component.characterSelected.emit).toHaveBeenCalledWith('char-1');
    });

    it('highlights selected character', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedId = 'char-1';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.character-item');

      expect(items[0].classList.contains('selected')).toBe(true);
      expect(items[1].classList.contains('selected')).toBe(false);
    });

    it('filters characters by custom filter function', () => {
      component.characters = testCharacters;
      component.filterFn = (char: Character) => char.class === CharacterClass.MAGE;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.character-item');

      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Gandalf');
    });
  });

  describe('keyboard navigation', () => {
    it('moves selection down on ArrowDown', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      component.handleKeyPress(event);

      expect(component.selectedIndex).toBe(1);
    });

    it('moves selection up on ArrowUp', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 1;

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      component.handleKeyPress(event);

      expect(component.selectedIndex).toBe(0);
    });

    it('wraps selection at boundaries', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 1;

      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      component.handleKeyPress(downEvent);

      expect(component.selectedIndex).toBe(0); // Wraps to top
    });

    it('emits selection on Enter key', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 0;

      jest.spyOn(component.characterSelected, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.characterSelected.emit).toHaveBeenCalledWith('char-1');
    });
  });
});
```

### Step 1.3: Run test to verify it fails

```bash
npm test -- character-list.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 1.4: Create component implementation

Create `src/components/character-list/character-list.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';

/**
 * CharacterListComponent - Reusable character roster display and selection.
 *
 * Implements UI Pattern 2: Character Selection.
 *
 * Features:
 * - Display mode: Shows character list with stats
 * - Selection mode: Allows character picking with keyboard/mouse
 * - Filtering: Custom filter function for conditional display
 * - Empty state: Shows message when no characters available
 *
 * @example
 * <app-character-list
 *   [characters]="roster"
 *   [selectable]="true"
 *   [selectedId]="currentCharId"
 *   (characterSelected)="onSelectChar($event)">
 * </app-character-list>
 */
@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-list.component.html',
  styleUrls: ['./character-list.component.scss']
})
export class CharacterListComponent {
  @Input() characters: Character[] = [];
  @Input() selectable: boolean = false;
  @Input() selectedId: string | null = null;
  @Input() filterFn: ((char: Character) => boolean) | null = null;
  @Input() emptyMessage: string = 'No characters available';

  @Output() characterSelected = new EventEmitter<string>();

  selectedIndex: number = 0;

  /**
   * Get filtered characters list.
   */
  get filteredCharacters(): Character[] {
    if (this.filterFn) {
      return this.characters.filter(this.filterFn);
    }
    return this.characters;
  }

  /**
   * Handle character selection (click).
   */
  selectCharacter(charId: string): void {
    if (!this.selectable) return;
    this.characterSelected.emit(charId);
  }

  /**
   * Check if character is selected.
   */
  isSelected(charId: string): boolean {
    return this.selectedId === charId;
  }

  /**
   * Handle keyboard navigation.
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.selectable || this.filteredCharacters.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCharacters.length;
        event.preventDefault();
        break;

      case 'ArrowUp':
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredCharacters.length) % this.filteredCharacters.length;
        event.preventDefault();
        break;

      case 'Enter':
        const selectedChar = this.filteredCharacters[this.selectedIndex];
        if (selectedChar) {
          this.characterSelected.emit(selectedChar.id);
        }
        event.preventDefault();
        break;
    }
  }

  /**
   * Format HP display.
   */
  formatHP(char: Character): string {
    return `${char.hp}/${char.maxHp}`;
  }
}
```

Create `src/components/character-list/character-list.component.html`:

```html
<div class="character-list" [class.selectable]="selectable">
  @if (filteredCharacters.length > 0) {
    <div class="character-items">
      @for (char of filteredCharacters; track char.id; let i = $index) {
        <div
          class="character-item"
          [class.selected]="isSelected(char.id) || (selectable && i === selectedIndex)"
          (click)="selectCharacter(char.id)">

          <div class="character-number">{{ i + 1 }}.</div>

          <div class="character-info">
            <div class="character-name">{{ char.name }}</div>
            <div class="character-stats">
              <span class="class">{{ char.class }}</span>
              <span class="level">Lv{{ char.level }}</span>
              <span class="hp">HP: {{ formatHP(char) }}</span>
            </div>
          </div>

          <div class="character-status" [class.dead]="char.status !== 'OK'">
            {{ char.status }}
          </div>
        </div>
      }
    </div>
  } @else {
    <div class="empty-state">
      <p>{{ emptyMessage }}</p>
    </div>
  }
</div>
```

Create `src/components/character-list/character-list.component.scss`:

```scss
@use '../../styles/variables' as *;

.character-list {
  border: 1px solid $color-text-dim;
  padding: $spacing-md;

  &.selectable {
    .character-item {
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover {
        background-color: rgba(0, 255, 0, 0.1);
      }
    }
  }
}

.character-items {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.character-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: $spacing-md;
  padding: $spacing-sm;
  border: 1px solid transparent;

  &.selected {
    background-color: rgba(0, 255, 0, 0.2);
    border-color: $color-text-bright;
  }
}

.character-number {
  color: $color-text-dim;
  font-weight: bold;
}

.character-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.character-name {
  color: $color-text-bright;
  font-weight: bold;
  font-size: 16px;
}

.character-stats {
  display: flex;
  gap: $spacing-md;
  font-size: 12px;
  color: $color-text-green;

  .class {
    color: $color-amber;
  }

  .level {
    color: $color-text-bright;
  }

  .hp {
    color: $color-text-green;
  }
}

.character-status {
  color: $color-text-bright;
  font-weight: bold;

  &.dead {
    color: $color-error;
  }
}

.empty-state {
  text-align: center;
  padding: $spacing-xl;
  color: $color-text-dim;
  font-style: italic;
}
```

### Step 1.5: Run tests to verify they pass

```bash
npm test -- character-list.component
```

**Expected:** All 11 tests pass

### Step 1.6: Commit CharacterListComponent

```bash
git add src/components/character-list/
git commit -m "feat: create CharacterListComponent for character selection

- Implements UI Pattern 2: Character Selection
- Display mode shows character roster with stats
- Selection mode enables picking with keyboard/mouse
- Arrow key navigation with wrapping
- Enter to select current character
- Custom filter function support
- Empty state when no characters
- 11 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: ConfirmationDialogComponent (Pattern 5)

**Goal:** Create reusable yes/no confirmation dialog for critical actions.

**Files:**
- Create: `src/components/confirmation-dialog/confirmation-dialog.component.ts`
- Create: `src/components/confirmation-dialog/confirmation-dialog.component.html`
- Create: `src/components/confirmation-dialog/confirmation-dialog.component.scss`
- Create: `src/components/confirmation-dialog/confirmation-dialog.component.spec.ts`

**Reference:** `docs/ui/ui-patterns.md` Pattern 5: Confirmation Dialog

### Step 2.1: Create component directory

```bash
mkdir -p src/components/confirmation-dialog
```

### Step 2.2: Write component test (TDD)

Create `src/components/confirmation-dialog/confirmation-dialog.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
  });

  describe('visibility', () => {
    it('shows dialog when visible=true', () => {
      component.visible = true;
      component.message = 'Are you sure?';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.dialog-overlay')).toBeTruthy();
      expect(compiled.querySelector('.dialog-message').textContent).toContain('Are you sure?');
    });

    it('hides dialog when visible=false', () => {
      component.visible = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.dialog-overlay')).toBeFalsy();
    });
  });

  describe('user interaction', () => {
    beforeEach(() => {
      component.visible = true;
      component.message = 'Confirm action?';
      fixture.detectChanges();
    });

    it('emits confirmed event when Yes clicked', () => {
      jest.spyOn(component.confirmed, 'emit');

      const compiled = fixture.nativeElement;
      const yesButton = compiled.querySelector('.btn-yes');
      yesButton.click();

      expect(component.confirmed.emit).toHaveBeenCalled();
    });

    it('emits cancelled event when No clicked', () => {
      jest.spyOn(component.cancelled, 'emit');

      const compiled = fixture.nativeElement;
      const noButton = compiled.querySelector('.btn-no');
      noButton.click();

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('confirms on Y key press', () => {
      jest.spyOn(component.confirmed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'y' });
      component.handleKeyPress(event);

      expect(component.confirmed.emit).toHaveBeenCalled();
    });

    it('cancels on N key press', () => {
      jest.spyOn(component.cancelled, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'n' });
      component.handleKeyPress(event);

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('cancels on Escape key press', () => {
      jest.spyOn(component.cancelled, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyPress(event);

      expect(component.cancelled.emit).toHaveBeenCalled();
    });
  });

  describe('customization', () => {
    it('uses custom button labels', () => {
      component.visible = true;
      component.yesLabel = 'Confirm';
      component.noLabel = 'Cancel';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.btn-yes').textContent).toContain('Confirm');
      expect(compiled.querySelector('.btn-no').textContent).toContain('Cancel');
    });
  });
});
```

### Step 2.3: Run test to verify it fails

```bash
npm test -- confirmation-dialog.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 2.4: Create component implementation

Create `src/components/confirmation-dialog/confirmation-dialog.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ConfirmationDialogComponent - Reusable yes/no confirmation modal.
 *
 * Implements UI Pattern 5: Confirmation Dialog.
 *
 * Features:
 * - Modal overlay (blocks interaction with background)
 * - Keyboard shortcuts (Y/N/Escape)
 * - Click handlers for buttons
 * - Customizable labels
 * - Emits confirmed or cancelled events
 *
 * @example
 * <app-confirmation-dialog
 *   [visible]="showDialog"
 *   [message]="'Delete character?'"
 *   (confirmed)="onConfirm()"
 *   (cancelled)="onCancel()">
 * </app-confirmation-dialog>
 */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  @Input() visible: boolean = false;
  @Input() message: string = 'Are you sure?';
  @Input() yesLabel: string = '(Y)es';
  @Input() noLabel: string = '(N)o';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  /**
   * Handle keyboard shortcuts.
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.visible) return;

    const key = event.key.toLowerCase();

    if (key === 'y') {
      this.confirm();
      event.preventDefault();
    } else if (key === 'n' || key === 'escape') {
      this.cancel();
      event.preventDefault();
    }
  }

  /**
   * Emit confirmed event.
   */
  confirm(): void {
    this.confirmed.emit();
  }

  /**
   * Emit cancelled event.
   */
  cancel(): void {
    this.cancelled.emit();
  }
}
```

Create `src/components/confirmation-dialog/confirmation-dialog.component.html`:

```html
@if (visible) {
  <div class="dialog-overlay" (click)="cancel()">
    <div class="dialog-content" (click)="$event.stopPropagation()">
      <div class="dialog-message">{{ message }}</div>

      <div class="dialog-actions">
        <button class="btn-yes" (click)="confirm()">{{ yesLabel }}</button>
        <button class="btn-no" (click)="cancel()">{{ noLabel }}</button>
      </div>
    </div>
  </div>
}
```

Create `src/components/confirmation-dialog/confirmation-dialog.component.scss`:

```scss
@use '../../styles/variables' as *;

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: $color-bg-black;
  border: 2px solid $color-text-bright;
  padding: $spacing-xl;
  min-width: 300px;
  max-width: 500px;
  text-align: center;
}

.dialog-message {
  font-size: 18px;
  color: $color-text-bright;
  margin-bottom: $spacing-lg;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: $spacing-md;
  justify-content: center;

  button {
    background: none;
    border: 1px solid $color-text-green;
    color: $color-text-green;
    font-family: $font-mono;
    font-size: 14px;
    padding: $spacing-sm $spacing-lg;
    cursor: pointer;
    transition: all 0.1s;

    &:hover {
      background: $color-text-green;
      color: $color-bg-black;
    }

    &.btn-yes {
      border-color: $color-text-bright;
      color: $color-text-bright;

      &:hover {
        background: $color-text-bright;
      }
    }
  }
}
```

### Step 2.5: Run tests to verify they pass

```bash
npm test -- confirmation-dialog.component
```

**Expected:** All 9 tests pass

### Step 2.6: Commit ConfirmationDialogComponent

```bash
git add src/components/confirmation-dialog/
git commit -m "feat: create ConfirmationDialogComponent for yes/no prompts

- Implements UI Pattern 5: Confirmation Dialog
- Modal overlay blocks background interaction
- Keyboard shortcuts (Y/N/Escape)
- Click outside to cancel
- Customizable message and button labels
- Emits confirmed/cancelled events
- 9 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Tavern Component (Gilgamesh's Tavern)

**Goal:** Implement party formation scene - add/remove characters, inspect roster.

**Files:**
- Create: `src/app/tavern/tavern.component.ts`
- Create: `src/app/tavern/tavern.component.html`
- Create: `src/app/tavern/tavern.component.scss`
- Create: `src/app/tavern/tavern.component.spec.ts`
- Modify: `src/app/app.routes.ts` (add tavern route)

**Reference:** `docs/ui/scenes/03-tavern.md`

### Step 3.1: Create component directory

```bash
mkdir -p src/app/tavern
```

### Step 3.2: Write component test (TDD)

Create `src/app/tavern/tavern.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TavernComponent } from './tavern.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

describe('TavernComponent', () => {
  let component: TavernComponent;
  let fixture: ComponentFixture<TavernComponent>;
  let gameState: GameStateService;
  let router: Router;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 20,
    maxHp: 25,
    status: 'OK',
    gold: 100
  } as Character;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TavernComponent]
    });

    fixture = TestBed.createComponent(TavernComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Add mock character to roster
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter)
    }));
  });

  describe('initialization', () => {
    it('updates scene to TAVERN on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.TAVERN);
    });

    it('displays tavern title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('TAVERN');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(3);
      expect(component.menuItems[0].id).toBe('add-character');
      expect(component.menuItems[1].id).toBe('remove-character');
      expect(component.menuItems[2].id).toBe('castle');
    });
  });

  describe('party management', () => {
    it('displays current party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1']
        }
      }));

      fixture.detectChanges();
      expect(component.currentParty().members.length).toBe(1);
    });

    it('shows add character view when selected', () => {
      component.handleMenuSelect('add-character');
      fixture.detectChanges();

      expect(component.currentView()).toBe('add');
    });

    it('shows remove character view when selected', () => {
      component.handleMenuSelect('remove-character');
      fixture.detectChanges();

      expect(component.currentView()).toBe('remove');
    });
  });

  describe('adding characters', () => {
    beforeEach(() => {
      component.currentView.set('add');
      fixture.detectChanges();
    });

    it('adds character to party when selected', () => {
      component.handleAddCharacter('char-1');

      const party = gameState.party();
      expect(party.members).toContain('char-1');
    });

    it('shows error when party is full (6 members)', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']
        }
      }));

      component.handleAddCharacter('char-1');

      expect(component.errorMessage()).toBeTruthy();
      expect(component.errorMessage()).toContain('full');
    });

    it('filters out characters already in party', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1']
        }
      }));

      fixture.detectChanges();

      const availableChars = component.availableCharacters();
      expect(availableChars.some(c => c.id === 'char-1')).toBe(false);
    });
  });

  describe('removing characters', () => {
    beforeEach(() => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1']
        }
      }));
      component.currentView.set('remove');
      fixture.detectChanges();
    });

    it('removes character from party when selected', () => {
      component.handleRemoveCharacter('char-1');

      const party = gameState.party();
      expect(party.members).not.toContain('char-1');
    });

    it('returns to main view after removal', () => {
      component.handleRemoveCharacter('char-1');
      expect(component.currentView()).toBe('main');
    });
  });

  describe('navigation', () => {
    it('returns to castle menu when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

### Step 3.3: Run test to verify it fails

```bash
npm test -- tavern.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 3.4: Create component implementation

Create `src/app/tavern/tavern.component.ts`:

```typescript
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

type TavernView = 'main' | 'add' | 'remove';

/**
 * Tavern Component (Gilgamesh's Tavern)
 *
 * Party formation hub where players:
 * - Add characters to party (max 6)
 * - Remove characters from party
 * - Inspect character details
 * - Return to castle
 */
@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './tavern.component.html',
  styleUrls: ['./tavern.component.scss']
})
export class TavernComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'add-character',
      label: 'ADD TO PARTY',
      enabled: true,
      shortcut: 'A'
    },
    {
      id: 'remove-character',
      label: 'REMOVE FROM PARTY',
      enabled: true,
      shortcut: 'R'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  // View state
  readonly currentView = signal<TavernView>('main');
  readonly errorMessage = signal<string | null>(null);

  // Party and roster
  readonly currentParty = computed(() => this.gameState.party());
  readonly allCharacters = computed(() => {
    const state = this.gameState.state();
    return Array.from(state.roster.values());
  });

  // Characters available to add (not in party)
  readonly availableCharacters = computed(() => {
    const party = this.currentParty();
    const partyMemberIds = new Set(party.members);
    return this.allCharacters().filter(char => !partyMemberIds.has(char.id));
  });

  // Characters in party (for removal)
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TAVERN
    }));
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);

    switch (itemId) {
      case 'add-character':
        this.currentView.set('add');
        break;

      case 'remove-character':
        if (this.partyCharacters().length === 0) {
          this.errorMessage.set('No characters in party to remove');
          return;
        }
        this.currentView.set('remove');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  handleAddCharacter(charId: string): void {
    const party = this.currentParty();

    // Check party size limit
    if (party.members.length >= 6) {
      this.errorMessage.set('Party is full (maximum 6 characters)');
      return;
    }

    // Add character to party
    this.gameState.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: [...state.party.members, charId]
      }
    }));

    this.currentView.set('main');
  }

  handleRemoveCharacter(charId: string): void {
    // Remove character from party
    this.gameState.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: state.party.members.filter(id => id !== charId)
      }
    }));

    this.currentView.set('main');
  }

  cancelView(): void {
    this.currentView.set('main');
    this.errorMessage.set(null);
  }
}
```

Create `src/app/tavern/tavern.component.html`:

```html
<div class="tavern">
  <header>
    <h1>GILGAMESH'S TAVERN</h1>
  </header>

  <main>
    <!-- Main menu view -->
    @if (currentView() === 'main') {
      <div class="main-view">
        <div class="menu-section">
          <app-menu
            [items]="menuItems"
            (select)="handleMenuSelect($event)"
          />
        </div>

        <div class="party-section">
          <h2>CURRENT PARTY ({{ partyCharacters().length }}/6):</h2>
          <app-character-list
            [characters]="partyCharacters()"
            [selectable]="false"
            [emptyMessage]="'No party members'"
          />
        </div>
      </div>
    }

    <!-- Add character view -->
    @if (currentView() === 'add') {
      <div class="character-select-view">
        <h2>SELECT CHARACTER TO ADD:</h2>
        <app-character-list
          [characters]="availableCharacters()"
          [selectable]="true"
          [emptyMessage]="'No characters available (all in party or none created)'"
          (characterSelected)="handleAddCharacter($event)"
        />
        <button class="cancel-btn" (click)="cancelView()">(ESC) Cancel</button>
      </div>
    }

    <!-- Remove character view -->
    @if (currentView() === 'remove') {
      <div class="character-select-view">
        <h2>SELECT CHARACTER TO REMOVE:</h2>
        <app-character-list
          [characters]="partyCharacters()"
          [selectable]="true"
          (characterSelected)="handleRemoveCharacter($event)"
        />
        <button class="cancel-btn" (click)="cancelView()">(ESC) Cancel</button>
      </div>
    }
  </main>

  <!-- Error message -->
  @if (errorMessage()) {
    <div class="error-message">
      <p>{{ errorMessage() }}</p>
    </div>
  }
</div>
```

Create `src/app/tavern/tavern.component.scss`:

```scss
@use '../../styles/variables' as *;

.tavern {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
  }
}

.main-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-xl;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.menu-section {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.party-section {
  h2 {
    font-size: 16px;
    color: $color-text-green;
    margin: 0 0 $spacing-md 0;
  }
}

.character-select-view {
  max-width: 600px;
  margin: 0 auto;

  h2 {
    font-size: 16px;
    color: $color-text-bright;
    margin: 0 0 $spacing-md 0;
    text-align: center;
  }

  .cancel-btn {
    margin-top: $spacing-lg;
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-dim;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
    display: block;
    margin-left: auto;
    margin-right: auto;

    &:hover {
      border-color: $color-text-green;
      color: $color-text-green;
    }
  }
}

.error-message {
  margin-top: $spacing-lg;
  text-align: center;

  p {
    color: $color-error;
    font-weight: bold;
  }
}
```

### Step 3.5: Run tests to verify they pass

```bash
npm test -- tavern.component
```

**Expected:** All 15 tests pass

### Step 3.6: Add tavern route

Modify `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { TitleScreenComponent } from './title-screen/title-screen.component';
import { CastleMenuComponent } from './castle-menu/castle-menu.component';
import { EdgeOfTownComponent } from './edge-of-town/edge-of-town.component';
import { TavernComponent } from './tavern/tavern.component';

export const routes: Routes = [
  {
    path: '',
    component: TitleScreenComponent
  },
  {
    path: 'castle-menu',
    component: CastleMenuComponent
  },
  {
    path: 'edge-of-town',
    component: EdgeOfTownComponent
  },
  {
    path: 'tavern',
    component: TavernComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

### Step 3.7: Run all tests

```bash
npm test
```

**Expected:** All tests pass (including routing tests)

### Step 3.8: Commit Tavern component

```bash
git add src/app/tavern/ src/app/app.routes.ts
git commit -m "feat: implement Tavern component for party formation

- Add/remove characters to/from party (max 6)
- View current party roster with stats
- Filter available characters (exclude party members)
- Party size validation with error messages
- Three-view system: main/add/remove
- Uses CharacterListComponent for selection
- 15 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Inn Component (Adventurer's Inn)

**Goal:** Implement rest and level-up functionality.

**Files:**
- Create: `src/app/inn/inn.component.ts`
- Create: `src/app/inn/inn.component.html`
- Create: `src/app/inn/inn.component.scss`
- Create: `src/app/inn/inn.component.spec.ts`
- Modify: `src/app/app.routes.ts` (add inn route)

**Reference:** `docs/ui/scenes/06-inn.md`

### Step 4.1: Create component directory

```bash
mkdir -p src/app/inn
```

### Step 4.2: Write component test (TDD)

Create `src/app/inn/inn.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { InnComponent } from './inn.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

describe('InnComponent', () => {
  let component: InnComponent;
  let fixture: ComponentFixture<InnComponent>;
  let gameState: GameStateService;
  let router: Router;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 15,
    maxHp: 25,
    status: 'OK',
    gold: 100,
    experience: 10000
  } as Character;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InnComponent]
    });

    fixture = TestBed.createComponent(InnComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Setup party with character
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1']
      }
    }));
  });

  describe('initialization', () => {
    it('updates scene to INN on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.INN);
    });

    it('displays inn title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('INN');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(3);
      expect(component.menuItems[0].id).toBe('rest');
      expect(component.menuItems[1].id).toBe('stables');
      expect(component.menuItems[2].id).toBe('castle');
    });
  });

  describe('rest functionality', () => {
    it('restores all party HP to maximum', () => {
      component.handleMenuSelect('rest');

      const state = gameState.state();
      const character = state.roster.get('char-1')!;
      expect(character.hp).toBe(character.maxHp);
    });

    it('shows success message after resting', () => {
      component.handleMenuSelect('rest');
      expect(component.successMessage()).toBeTruthy();
      expect(component.successMessage()).toContain('rested');
    });

    it('costs 10 gold per party member', () => {
      const initialGold = gameState.party().gold || 0;
      component.handleMenuSelect('rest');

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold - 10);
    });

    it('shows error when party cannot afford rest', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 5
        }
      }));

      component.handleMenuSelect('rest');
      expect(component.errorMessage()).toBeTruthy();
      expect(component.errorMessage()).toContain('afford');
    });

    it('shows error when no party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: []
        }
      }));

      component.handleMenuSelect('rest');
      expect(component.errorMessage()).toBeTruthy();
    });
  });

  describe('stables functionality', () => {
    it('shows stables view when selected', () => {
      component.handleMenuSelect('stables');
      expect(component.currentView()).toBe('stables');
    });

    it('displays party characters for stable boarding', () => {
      component.currentView.set('stables');
      fixture.detectChanges();

      expect(component.partyCharacters().length).toBe(1);
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

### Step 4.3: Run test to verify it fails

```bash
npm test -- inn.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 4.4: Create component implementation

Create `src/app/inn/inn.component.ts`:

```typescript
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

type InnView = 'main' | 'stables';

const REST_COST_PER_MEMBER = 10;

/**
 * Inn Component (Adventurer's Inn)
 *
 * Rest and recovery services:
 * - Rest: Restore all party HP (costs 10 gold per member)
 * - Stables: Board characters for later retrieval
 * - Return to castle
 */
@Component({
  selector: 'app-inn',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './inn.component.html',
  styleUrls: ['./inn.component.scss']
})
export class InnComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'rest',
      label: 'REST (10 GOLD/MEMBER)',
      enabled: true,
      shortcut: 'R'
    },
    {
      id: 'stables',
      label: 'STABLES',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  // View state
  readonly currentView = signal<InnView>('main');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Party
  readonly currentParty = computed(() => this.gameState.party());
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.INN
    }));
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'rest':
        this.rest();
        break;

      case 'stables':
        this.currentView.set('stables');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  private rest(): void {
    const party = this.currentParty();

    // Validate party exists
    if (party.members.length === 0) {
      this.errorMessage.set('You need a party to rest');
      return;
    }

    // Calculate cost
    const cost = party.members.length * REST_COST_PER_MEMBER;
    const partyGold = party.gold || 0;

    // Check if party can afford
    if (partyGold < cost) {
      this.errorMessage.set(`Not enough gold. Rest costs ${cost} gold (${REST_COST_PER_MEMBER} per member)`);
      return;
    }

    // Restore all party members to full HP
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster);

      party.members.forEach(charId => {
        const char = newRoster.get(charId);
        if (char) {
          newRoster.set(charId, {
            ...char,
            hp: char.maxHp
          });
        }
      });

      return {
        ...state,
        roster: newRoster,
        party: {
          ...state.party,
          gold: partyGold - cost
        }
      };
    });

    this.successMessage.set(`Party rested well! All HP restored. (-${cost} gold)`);
  }

  cancelView(): void {
    this.currentView.set('main');
  }
}
```

Create `src/app/inn/inn.component.html`:

```html
<div class="inn">
  <header>
    <h1>ADVENTURER'S INN</h1>
  </header>

  <main>
    <!-- Main menu view -->
    @if (currentView() === 'main') {
      <div class="main-view">
        <div class="menu-section">
          <app-menu
            [items]="menuItems"
            (select)="handleMenuSelect($event)"
          />
        </div>

        <div class="party-section">
          <h2>PARTY STATUS:</h2>
          <app-character-list
            [characters]="partyCharacters()"
            [selectable]="false"
            [emptyMessage]="'No party (visit Tavern to form party)'"
          />

          <div class="party-gold">
            Gold: {{ currentParty().gold || 0 }}
          </div>
        </div>
      </div>
    }

    <!-- Stables view -->
    @if (currentView() === 'stables') {
      <div class="stables-view">
        <h2>STABLES (Character Storage):</h2>
        <p class="info">Board characters here for safekeeping.</p>

        <app-character-list
          [characters]="partyCharacters()"
          [selectable]="false"
          [emptyMessage]="'No characters to board'"
        />

        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }
  </main>

  <!-- Success message -->
  @if (successMessage()) {
    <div class="success-message">
      <p>{{ successMessage() }}</p>
    </div>
  }

  <!-- Error message -->
  @if (errorMessage()) {
    <div class="error-message">
      <p>{{ errorMessage() }}</p>
    </div>
  }
</div>
```

Create `src/app/inn/inn.component.scss`:

```scss
@use '../../styles/variables' as *;

.inn {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
  }
}

.main-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-xl;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.menu-section {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.party-section {
  h2 {
    font-size: 16px;
    color: $color-text-green;
    margin: 0 0 $spacing-md 0;
  }

  .party-gold {
    margin-top: $spacing-md;
    padding: $spacing-sm;
    border-top: 1px solid $color-text-dim;
    color: $color-amber;
    font-weight: bold;
    text-align: right;
  }
}

.stables-view {
  max-width: 600px;
  margin: 0 auto;

  h2 {
    font-size: 16px;
    color: $color-text-bright;
    margin: 0 0 $spacing-md 0;
    text-align: center;
  }

  .info {
    text-align: center;
    color: $color-text-dim;
    font-size: 14px;
    margin-bottom: $spacing-lg;
  }

  .cancel-btn {
    margin-top: $spacing-lg;
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-dim;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
    display: block;
    margin-left: auto;
    margin-right: auto;

    &:hover {
      border-color: $color-text-green;
      color: $color-text-green;
    }
  }
}

.success-message {
  margin-top: $spacing-lg;
  text-align: center;

  p {
    color: $color-text-bright;
    font-weight: bold;
  }
}

.error-message {
  margin-top: $spacing-lg;
  text-align: center;

  p {
    color: $color-error;
    font-weight: bold;
  }
}
```

### Step 4.5: Run tests to verify they pass

```bash
npm test -- inn.component
```

**Expected:** All 14 tests pass

### Step 4.6: Add inn route

Modify `src/app/app.routes.ts` (add inn import and route):

```typescript
import { InnComponent } from './inn/inn.component';

// ... in routes array:
{
  path: 'inn',
  component: InnComponent
},
```

### Step 4.7: Run all tests

```bash
npm test
```

**Expected:** All tests pass

### Step 4.8: Commit Inn component

```bash
git add src/app/inn/ src/app/app.routes.ts
git commit -m "feat: implement Inn component for rest and recovery

- Rest service restores all party HP (10 gold per member)
- Gold validation before allowing rest
- Stables view for character boarding (placeholder)
- Success/error messages for user feedback
- Party gold display
- 14 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Progress Update

**Phase 4 Completed Tasks:**
1. ✅ CharacterListComponent (Pattern 2) - 10 tests
2. ✅ ConfirmationDialogComponent (Pattern 5) - 8 tests
3. ✅ Tavern Component - 12 tests
4. ✅ Inn Component - 11 tests

**Note:** ErrorDisplayComponent (Pattern 4) was planned but not needed - inline error handling with signals is sufficient.

**Current Status:** 148 tests passing, 3.628s execution time

---

## Remaining Phase 4 Tasks

**Important:** Tasks 5-7 implement scaffolded/placeholder versions with basic structure and navigation. Full business logic (complex resurrection mechanics, inventory system, character creation wizard) will be implemented in Phase 5.

---

## Task 5: Temple Component (Scaffolded Version)

**Goal:** Create Temple of Cant scene with basic structure and simple healing. Complex resurrection mechanics deferred to Phase 5.

**Files:**
- Create: `src/app/temple/temple.component.ts`
- Create: `src/app/temple/temple.component.html`
- Create: `src/app/temple/temple.component.scss`
- Create: `src/app/temple/temple.component.spec.ts`
- Modify: `src/app/app.routes.ts` (add temple route)

**Reference:** `docs/ui/scenes/05-temple-of-cant.md`

### Step 5.1: Create component directory

```bash
mkdir -p src/app/temple
```

### Step 5.2: Write component test (TDD)

Create `src/app/temple/temple.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TempleComponent } from './temple.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('TempleComponent', () => {
  let component: TempleComponent;
  let fixture: ComponentFixture<TempleComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TempleComponent]
    });

    fixture = TestBed.createComponent(TempleComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('updates scene to TEMPLE on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.TEMPLE);
    });

    it('displays temple title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('TEMPLE');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(2);
      expect(component.menuItems[0].id).toBe('healing');
      expect(component.menuItems[1].id).toBe('castle');
    });
  });

  describe('placeholder services', () => {
    it('shows healing placeholder when selected', () => {
      component.handleMenuSelect('healing');
      expect(component.currentView()).toBe('healing');
    });

    it('displays placeholder message for healing services', () => {
      component.currentView.set('healing');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Healing services will be implemented in Phase 5');
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

### Step 5.3: Run test to verify it fails

```bash
npm test -- temple.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 5.4: Create component implementation

Create `src/app/temple/temple.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';

type TempleView = 'main' | 'healing';

/**
 * Temple Component (Temple of Cant)
 *
 * Healing and resurrection services (Phase 4: Scaffolded)
 * - Basic structure and navigation
 * - Placeholder for healing services
 * - Full resurrection mechanics in Phase 5
 */
@Component({
  selector: 'app-temple',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'healing',
      label: 'HEALING SERVICES',
      enabled: true,
      shortcut: 'H'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  readonly currentView = signal<TempleView>('main');

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TEMPLE
    }));
  }

  handleMenuSelect(itemId: string): void {
    switch (itemId) {
      case 'healing':
        this.currentView.set('healing');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  cancelView(): void {
    this.currentView.set('main');
  }
}
```

Create `src/app/temple/temple.component.html`:

```html
<div class="temple">
  <header>
    <h1>TEMPLE OF CANT</h1>
  </header>

  <main>
    @if (currentView() === 'main') {
      <div class="main-view">
        <app-menu
          [items]="menuItems"
          (select)="handleMenuSelect($event)"
        />
      </div>
    }

    @if (currentView() === 'healing') {
      <div class="placeholder-view">
        <h2>HEALING SERVICES</h2>
        <p class="placeholder-text">
          Healing services will be implemented in Phase 5.
        </p>
        <p class="placeholder-details">
          This will include:
        </p>
        <ul>
          <li>Cure Poison</li>
          <li>Cure Paralysis</li>
          <li>Cure Stone</li>
          <li>Resurrection (with success/failure mechanics)</li>
        </ul>
        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }
  </main>
</div>
```

Create `src/app/temple/temple.component.scss`:

```scss
@use '../../styles/variables' as *;

.temple {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
  }
}

.main-view {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.placeholder-view {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;

  h2 {
    font-size: 18px;
    color: $color-text-bright;
    margin-bottom: $spacing-lg;
  }

  .placeholder-text {
    color: $color-amber;
    font-weight: bold;
    margin-bottom: $spacing-md;
  }

  .placeholder-details {
    color: $color-text-dim;
    font-size: 14px;
    margin-bottom: $spacing-sm;
  }

  ul {
    color: $color-text-green;
    text-align: left;
    max-width: 300px;
    margin: 0 auto $spacing-lg auto;
  }

  .cancel-btn {
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-dim;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;

    &:hover {
      border-color: $color-text-green;
      color: $color-text-green;
    }
  }
}
```

### Step 5.5: Run tests to verify they pass

```bash
npm test -- temple.component
```

**Expected:** All 6 tests pass

### Step 5.6: Add temple route

Modify `src/app/app.routes.ts`:

```typescript
import { TempleComponent } from './temple/temple.component';

// ... in routes array:
{
  path: 'temple',
  component: TempleComponent
},
```

### Step 5.7: Run all tests

```bash
npm test
```

**Expected:** All tests pass

### Step 5.8: Commit Temple component

```bash
git add src/app/temple/ src/app/app.routes.ts
git commit -m "feat: implement Temple component (scaffolded)

- Basic structure with menu and navigation
- Placeholder for healing services
- Full resurrection mechanics deferred to Phase 5
- 6 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Shop Component (Scaffolded Version)

**Goal:** Create Boltac's Trading Post with basic structure. Full inventory/item management deferred to Phase 5.

**Files:**
- Create: `src/app/shop/shop.component.ts`
- Create: `src/app/shop/shop.component.html`
- Create: `src/app/shop/shop.component.scss`
- Create: `src/app/shop/shop.component.spec.ts`
- Modify: `src/app/app.routes.ts` (add shop route)

**Reference:** `docs/ui/scenes/04-boltacs-trading-post.md`

### Step 6.1: Create component directory

```bash
mkdir -p src/app/shop
```

### Step 6.2: Write component test (TDD)

Create `src/app/shop/shop.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ShopComponent } from './shop.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('ShopComponent', () => {
  let component: ShopComponent;
  let fixture: ComponentFixture<ShopComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShopComponent]
    });

    fixture = TestBed.createComponent(ShopComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('updates scene to SHOP on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.SHOP);
    });

    it('displays shop title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('BOLTAC');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(4);
      expect(component.menuItems[0].id).toBe('buy');
      expect(component.menuItems[1].id).toBe('sell');
      expect(component.menuItems[2].id).toBe('identify');
      expect(component.menuItems[3].id).toBe('castle');
    });
  });

  describe('placeholder services', () => {
    it('shows buy placeholder when selected', () => {
      component.handleMenuSelect('buy');
      expect(component.currentView()).toBe('buy');
    });

    it('shows sell placeholder when selected', () => {
      component.handleMenuSelect('sell');
      expect(component.currentView()).toBe('sell');
    });

    it('shows identify placeholder when selected', () => {
      component.handleMenuSelect('identify');
      expect(component.currentView()).toBe('identify');
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

### Step 6.3: Run test to verify it fails

```bash
npm test -- shop.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 6.4: Create component implementation

Create `src/app/shop/shop.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';

type ShopView = 'main' | 'buy' | 'sell' | 'identify';

/**
 * Shop Component (Boltac's Trading Post)
 *
 * Item trading services (Phase 4: Scaffolded)
 * - Basic structure and navigation
 * - Placeholder for buy/sell/identify
 * - Full inventory system in Phase 5
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'buy',
      label: 'BUY ITEMS',
      enabled: true,
      shortcut: 'B'
    },
    {
      id: 'sell',
      label: 'SELL ITEMS',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: 'identify',
      label: 'IDENTIFY ITEMS',
      enabled: true,
      shortcut: 'I'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  readonly currentView = signal<ShopView>('main');

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.SHOP
    }));
  }

  handleMenuSelect(itemId: string): void {
    switch (itemId) {
      case 'buy':
        this.currentView.set('buy');
        break;

      case 'sell':
        this.currentView.set('sell');
        break;

      case 'identify':
        this.currentView.set('identify');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  cancelView(): void {
    this.currentView.set('main');
  }
}
```

Create `src/app/shop/shop.component.html`:

```html
<div class="shop">
  <header>
    <h1>BOLTAC'S TRADING POST</h1>
  </header>

  <main>
    @if (currentView() === 'main') {
      <div class="main-view">
        <app-menu
          [items]="menuItems"
          (select)="handleMenuSelect($event)"
        />
      </div>
    }

    @if (currentView() === 'buy') {
      <div class="placeholder-view">
        <h2>BUY ITEMS</h2>
        <p class="placeholder-text">
          Item purchasing will be implemented in Phase 5.
        </p>
        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }

    @if (currentView() === 'sell') {
      <div class="placeholder-view">
        <h2>SELL ITEMS</h2>
        <p class="placeholder-text">
          Item selling will be implemented in Phase 5.
        </p>
        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }

    @if (currentView() === 'identify') {
      <div class="placeholder-view">
        <h2>IDENTIFY ITEMS</h2>
        <p class="placeholder-text">
          Item identification will be implemented in Phase 5.
        </p>
        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }
  </main>
</div>
```

Create `src/app/shop/shop.component.scss`:

```scss
@use '../../styles/variables' as *;

.shop {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
  }
}

.main-view {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.placeholder-view {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;

  h2 {
    font-size: 18px;
    color: $color-text-bright;
    margin-bottom: $spacing-lg;
  }

  .placeholder-text {
    color: $color-amber;
    font-weight: bold;
    margin-bottom: $spacing-xl;
  }

  .cancel-btn {
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-dim;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;

    &:hover {
      border-color: $color-text-green;
      color: $color-text-green;
    }
  }
}
```

### Step 6.5: Run tests to verify they pass

```bash
npm test -- shop.component
```

**Expected:** All 7 tests pass

### Step 6.6: Add shop route

Modify `src/app/app.routes.ts`:

```typescript
import { ShopComponent } from './shop/shop.component';

// ... in routes array:
{
  path: 'shop',
  component: ShopComponent
},
```

### Step 6.7: Run all tests

```bash
npm test
```

**Expected:** All tests pass

### Step 6.8: Commit Shop component

```bash
git add src/app/shop/ src/app/app.routes.ts
git commit -m "feat: implement Shop component (scaffolded)

- Basic structure with menu and navigation
- Placeholder for buy/sell/identify services
- Full inventory system deferred to Phase 5
- 7 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Training Grounds Component (Scaffolded Version)

**Goal:** Create Training Grounds route with placeholder. Full character creation wizard deferred to Phase 5.

**Files:**
- Create: `src/app/training-grounds/training-grounds.component.ts`
- Create: `src/app/training-grounds/training-grounds.component.html`
- Create: `src/app/training-grounds/training-grounds.component.scss`
- Create: `src/app/training-grounds/training-grounds.component.spec.ts`
- Modify: `src/app/app.routes.ts` (add training-grounds route)

**Reference:** `docs/ui/scenes/02-training-grounds.md`

### Step 7.1: Create component directory

```bash
mkdir -p src/app/training-grounds
```

### Step 7.2: Write component test (TDD)

Create `src/app/training-grounds/training-grounds.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TrainingGroundsComponent } from './training-grounds.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('TrainingGroundsComponent', () => {
  let component: TrainingGroundsComponent;
  let fixture: ComponentFixture<TrainingGroundsComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent]
    });

    fixture = TestBed.createComponent(TrainingGroundsComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('updates scene to TRAINING_GROUNDS on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.TRAINING_GROUNDS);
    });

    it('displays training grounds title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('TRAINING');
    });

    it('shows placeholder message', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Character creation will be implemented in Phase 5');
    });
  });

  describe('navigation', () => {
    it('returns to castle when back button clicked', () => {
      const compiled = fixture.nativeElement;
      fixture.detectChanges();

      const backButton = compiled.querySelector('.back-btn');
      backButton.click();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

### Step 7.3: Run test to verify it fails

```bash
npm test -- training-grounds.component
```

**Expected:** Test fails - component doesn't exist yet

### Step 7.4: Create component implementation

Create `src/app/training-grounds/training-grounds.component.ts`:

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

/**
 * Training Grounds Component
 *
 * Character creation service (Phase 4: Scaffolded)
 * - Basic structure and navigation
 * - Placeholder for character creation wizard
 * - Full creation flow in Phase 5
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }));
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }
}
```

Create `src/app/training-grounds/training-grounds.component.html`:

```html
<div class="training-grounds">
  <header>
    <h1>TRAINING GROUNDS</h1>
  </header>

  <main>
    <div class="placeholder-view">
      <h2>CHARACTER CREATION</h2>
      <p class="placeholder-text">
        Character creation will be implemented in Phase 5.
      </p>
      <p class="placeholder-details">
        This will include:
      </p>
      <ul>
        <li>Roll character stats (Strength, IQ, Piety, etc.)</li>
        <li>Choose character class (Fighter, Mage, Priest, Thief, etc.)</li>
        <li>Assign bonus points</li>
        <li>Name your character</li>
        <li>Add to roster</li>
      </ul>
      <button class="back-btn" (click)="returnToCastle()">(ESC) Return to Castle</button>
    </div>
  </main>
</div>
```

Create `src/app/training-grounds/training-grounds.component.scss`:

```scss
@use '../../styles/variables' as *;

.training-grounds {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
  }
}

.placeholder-view {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;

  h2 {
    font-size: 18px;
    color: $color-text-bright;
    margin-bottom: $spacing-lg;
  }

  .placeholder-text {
    color: $color-amber;
    font-weight: bold;
    margin-bottom: $spacing-md;
  }

  .placeholder-details {
    color: $color-text-dim;
    font-size: 14px;
    margin-bottom: $spacing-sm;
  }

  ul {
    color: $color-text-green;
    text-align: left;
    max-width: 400px;
    margin: 0 auto $spacing-xl auto;
    line-height: 1.8;
  }

  .back-btn {
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-dim;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;

    &:hover {
      border-color: $color-text-green;
      color: $color-text-green;
    }
  }
}
```

### Step 7.5: Run tests to verify they pass

```bash
npm test -- training-grounds.component
```

**Expected:** All 4 tests pass

### Step 7.6: Add training grounds route

Modify `src/app/app.routes.ts`:

```typescript
import { TrainingGroundsComponent } from './training-grounds/training-grounds.component';

// ... in routes array:
{
  path: 'training-grounds',
  component: TrainingGroundsComponent
},
```

### Step 7.7: Run all tests

```bash
npm test
```

**Expected:** All tests pass

### Step 7.8: Commit Training Grounds component

```bash
git add src/app/training-grounds/ src/app/app.routes.ts
git commit -m "feat: implement Training Grounds component (scaffolded)

- Basic structure with placeholder message
- Full character creation wizard deferred to Phase 5
- 4 tests passing

Part of Phase 4: Town Service Scenes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4 Complete

After completing Task 7, all Phase 4 town service scenes will be scaffolded with basic structure and navigation.

**Expected Final State:**
- Test Suites: ~24 passing
- Tests: ~165 passing
- Time: <4s

**Next:** Proceed to Phase 5 for full business logic implementation (resurrection mechanics, inventory system, character creation wizard, dungeon exploration, combat).

---

## Notes for Engineer

**Testing Strategy:**
- TDD: Write test first, watch it fail, implement, watch it pass
- Run tests frequently: `npm test -- <component-name>`
- Commit after each completed task (keep commits small)

**Common Patterns:**
- All scenes update `currentScene` in `ngOnInit()`
- Use signals for reactive state (`signal`, `computed`)
- Use `MenuComponent` for navigation menus
- Use `CharacterListComponent` for character display/selection
- Error/success messages use signals and conditional rendering

**Gotchas:**
- Party members are IDs (strings), not Character objects
- Always filter roster by party member IDs to get Character objects
- Gold is stored on party, not individual characters
- Use `@use '../../styles/variables' as *;` for SCSS imports

**Getting Help:**
- Reference `docs/ui/scenes/` for scene specifications
- Reference `docs/ui/ui-patterns.md` for UI patterns
- Reference `docs/services/` for service documentation
- All service functions are pure (no side effects, easy to test)

---

**End of Phase 4 Implementation Plan (Partial)**

**Plan saved to:** `docs/plans/2025-11-01-angular-migration-phase-4.md`

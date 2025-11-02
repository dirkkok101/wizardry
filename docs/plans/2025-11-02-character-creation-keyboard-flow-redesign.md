# Character Creation Keyboard Flow Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate keyboard shortcut conflicts in character creation through state-based locking and a separate name modal component.

**Architecture:** Implement state-based locking where race/alignment selections lock after first stats roll. Create separate name modal component with isolated keyboard handling. Use context-aware keyboard shortcuts where keys have different meanings before/after locking (G/N/E for alignment vs classes).

**Tech Stack:** Angular 19, TypeScript, Signals, Jest

---

## Background

**Current Issues:**
1. Keyboard shortcuts interfere with name input (pressing 'r' rerolls stats instead of typing)
2. Race selection shows unnecessary confirmation dialogs
3. Number key '3' causes navigation during confirmation dialog
4. Class shortcuts conflict with alignment shortcuts (G/N for both)

**New Keyboard Layout:**
- **Before Stats Rolled (UNLOCKED):** `1-5` race, `G/N/E` alignment, `R` roll, `ESC` reset, `Q` quit
- **After Stats Rolled (LOCKED):** `R` reroll, `F/M/P/T/B/S/L/N` classes, `ENTER` accept, `ESC` reset, `Q` quit
- **Name Modal:** `ENTER` save, `ESC` cancel, all parent shortcuts blocked

---

## Task 1: Create Name Modal Component

**Files:**
- Create: `src/app/components/name-modal/name-modal.component.ts`
- Create: `src/app/components/name-modal/name-modal.component.html`
- Create: `src/app/components/name-modal/name-modal.component.scss`
- Create: `src/app/components/name-modal/__tests__/name-modal.component.spec.ts`

**Step 1: Write the failing test**

Create test file:

```typescript
// src/app/components/name-modal/__tests__/name-modal.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NameModalComponent } from '../name-modal.component';

describe('NameModalComponent', () => {
  let component: NameModalComponent;
  let fixture: ComponentFixture<NameModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NameModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('visibility', () => {
    it('should not be visible by default', () => {
      const compiled = fixture.nativeElement;
      const modal = compiled.querySelector('.name-modal');
      expect(modal).toBeNull();
    });

    it('should be visible when visible input is true', () => {
      component.visible = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const modal = compiled.querySelector('.name-modal');
      expect(modal).toBeTruthy();
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      component.visible = true;
      fixture.detectChanges();
    });

    it('should emit save when Enter pressed with valid name', () => {
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('Gandalf');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(saveSpy).toHaveBeenCalledWith('Gandalf');
    });

    it('should not emit save when Enter pressed with empty name', () => {
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('   ');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should emit cancel when Escape pressed', () => {
      const cancelSpy = jest.fn();
      component.cancel.subscribe(cancelSpy);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should not handle keys when not visible', () => {
      component.visible = false;
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('Test');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      component.visible = true;
      fixture.detectChanges();
    });

    it('should emit cancel when backdrop clicked', () => {
      const cancelSpy = jest.fn();
      component.cancel.subscribe(cancelSpy);

      const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
      backdrop.click();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should emit save when save button clicked with valid name', () => {
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('Merlin');
      fixture.detectChanges();

      const saveButton = fixture.nativeElement.querySelector('.save-button');
      saveButton.click();

      expect(saveSpy).toHaveBeenCalledWith('Merlin');
    });

    it('should emit cancel when cancel button clicked', () => {
      const cancelSpy = jest.fn();
      component.cancel.subscribe(cancelSpy);

      const cancelButton = fixture.nativeElement.querySelector('.cancel-button');
      cancelButton.click();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- name-modal.component`
Expected: FAIL - Component not found

**Step 3: Write minimal component implementation**

Create component TypeScript:

```typescript
// src/app/components/name-modal/name-modal.component.ts
import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-name-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './name-modal.component.html',
  styleUrl: './name-modal.component.scss'
})
export class NameModalComponent {
  @Input() visible = false;
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly characterName = signal<string>('');

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    if (!this.visible) return;

    if (event.key === 'Enter' && this.characterName().trim().length > 0) {
      event.preventDefault();
      this.save.emit(this.characterName().trim());
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
    }
  }

  onBackdropClick() {
    this.cancel.emit();
  }

  onSaveClick() {
    if (this.characterName().trim().length > 0) {
      this.save.emit(this.characterName().trim());
    }
  }

  onCancelClick() {
    this.cancel.emit();
  }
}
```

Create component template:

```html
<!-- src/app/components/name-modal/name-modal.component.html -->
@if (visible) {
  <div class="modal-backdrop" (click)="onBackdropClick()">
    <div class="name-modal" (click)="$event.stopPropagation()">
      <h2>Name Your Character</h2>

      <div class="form-group">
        <label for="character-name">Character Name:</label>
        <input
          id="character-name"
          type="text"
          class="name-input"
          [value]="characterName()"
          (input)="characterName.set($any($event.target).value)"
          maxlength="15"
          placeholder="Enter character name"
          autofocus
        />
      </div>

      <div class="button-group">
        <button
          class="save-button"
          (click)="onSaveClick()"
          [disabled]="characterName().trim().length === 0"
        >
          [ENTER] Save
        </button>
        <button class="cancel-button" (click)="onCancelClick()">
          [ESC] Cancel
        </button>
      </div>
    </div>
  </div>
}
```

Create component styles:

```scss
// src/app/components/name-modal/name-modal.component.scss
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.name-modal {
  background-color: #1a1a1a;
  border: 2px solid #ffd700;
  padding: 2rem;
  min-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);

  h2 {
    color: #ffd700;
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
    font-size: 1.5rem;
  }
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    color: #ffd700;
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }
}

.name-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background-color: #2a2a2a;
  border: 1px solid #ffd700;
  color: #fff;
  font-family: 'Courier New', monospace;

  &:focus {
    outline: none;
    border-color: #fff;
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  }

  &::placeholder {
    color: #666;
  }
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: center;

  button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    border: 2px solid #ffd700;
    background-color: #2a2a2a;
    color: #ffd700;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background-color: #ffd700;
      color: #1a1a1a;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .save-button {
    &:hover:not(:disabled) {
      background-color: #4caf50;
      border-color: #4caf50;
      color: #fff;
    }
  }

  .cancel-button {
    &:hover {
      background-color: #f44336;
      border-color: #f44336;
      color: #fff;
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- name-modal.component`
Expected: PASS - All tests green

**Step 5: Commit**

```bash
git add src/app/components/name-modal/
git commit -m "feat(character-creation): add name modal component

- Separate modal component for character naming
- Keyboard shortcuts: Enter to save, Escape to cancel
- Blocks parent shortcuts when visible
- Auto-focus on name input field"
```

---

## Task 2: Add isLocked State to Character Creation

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Write the failing test**

Add to existing test file:

```typescript
// src/app/character-creation/__tests__/character-creation.component.spec.ts

describe('state locking', () => {
  it('should not be locked initially', () => {
    expect(component.isLocked()).toBe(false);
  });

  it('should lock race and alignment after first stats roll', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);

    expect(component.isLocked()).toBe(false);

    component.rollStats();

    // Wait for animation
    jest.advanceTimersByTime(300);

    expect(component.isLocked()).toBe(true);
  });

  it('should remain locked after rerolling stats', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);

    component.rollStats();
    jest.advanceTimersByTime(300);

    expect(component.isLocked()).toBe(true);
  });

  it('should unlock when form is reset', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);

    expect(component.isLocked()).toBe(true);

    component.resetForm();

    expect(component.isLocked()).toBe(false);
  });

  it('should prevent race selection when locked', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);

    // Try to select different race
    component.selectRace(Race.ELF);

    // Should still be HUMAN
    expect(component.selectedRace()).toBe(Race.HUMAN);
  });

  it('should prevent alignment selection when locked', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);

    // Try to select different alignment
    component.selectAlignment(Alignment.EVIL);

    // Should still be GOOD
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- character-creation.component`
Expected: FAIL - isLocked() not defined

**Step 3: Add isLocked signal and modify methods**

Modify component:

```typescript
// In src/app/character-creation/character-creation.component.ts

// Add new signal after line 53
readonly isLocked = signal<boolean>(false);

// Modify selectRace method (around line 120)
selectRace(race: Race) {
  // Prevent selection if locked
  if (this.isLocked()) return;

  this.selectedRace.set(race);
  // Reset downstream selections
  this.rolledStats.set(null);
  this.selectedClass.set(null);
}

// Modify selectAlignment method (around line 128)
selectAlignment(alignment: Alignment) {
  // Prevent selection if locked
  if (this.isLocked()) return;

  this.selectedAlignment.set(alignment);
  // Reset downstream selections
  this.rolledStats.set(null);
  this.selectedClass.set(null);
}

// Modify rollStats method (around line 136)
rollStats() {
  this.isRolling.set(true);

  // Simulate dice rolling animation
  setTimeout(() => {
    const rolled = CharacterCreationService.rollStats();
    this.rolledStats.set(rolled);
    this.selectedClass.set(null); // Reset class when rerolling
    this.isRolling.set(false);

    // Lock race and alignment after first roll
    if (!this.isLocked()) {
      this.isLocked.set(true);
    }
  }, 300);
}

// Modify resetForm method (around line 197)
resetForm() {
  this.selectedRace.set(null);
  this.selectedAlignment.set(null);
  this.rolledStats.set(null);
  this.selectedClass.set(null);
  this.characterName.set('');
  this.errorMessage.set(null);
  this.showCancelConfirmation.set(false);
  this.isLocked.set(false); // Add this line
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- character-creation.component`
Expected: PASS - All new tests green

**Step 5: Commit**

```bash
git add src/app/character-creation/
git commit -m "feat(character-creation): add state locking after first stats roll

- Add isLocked signal to track lock state
- Lock race/alignment selection after first roll
- Prevent race/alignment changes when locked
- Reset unlocks all selections"
```

---

## Task 3: Update Class Shortcuts to New Letters

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Write the failing test**

Add to existing test file:

```typescript
// In keyboard shortcuts section

describe('class selection keyboard shortcuts', () => {
  beforeEach(() => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);
  });

  it('should select Fighter with F key', () => {
    const event = new KeyboardEvent('keydown', { key: 'f' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
  });

  it('should select Mage with M key', () => {
    const event = new KeyboardEvent('keydown', { key: 'm' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.MAGE);
  });

  it('should select Priest with P key', () => {
    const event = new KeyboardEvent('keydown', { key: 'p' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.PRIEST);
  });

  it('should select Thief with T key', () => {
    const event = new KeyboardEvent('keydown', { key: 't' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.THIEF);
  });

  it('should select Bishop with B key', () => {
    // Roll stats that make Bishop eligible
    component.rolledStats.set({
      strength: 10, intelligence: 12, piety: 12,
      vitality: 10, agility: 10, luck: 10, bonusPoints: 5
    });

    const event = new KeyboardEvent('keydown', { key: 'b' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.BISHOP);
  });

  it('should select Samurai with A key', () => {
    // Roll stats that make Samurai eligible
    component.rolledStats.set({
      strength: 15, intelligence: 11, piety: 10,
      vitality: 14, agility: 10, luck: 10, bonusPoints: 5
    });

    const event = new KeyboardEvent('keydown', { key: 'a' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.SAMURAI);
  });

  it('should select Lord with L key', () => {
    // Roll stats that make Lord eligible
    component.rolledStats.set({
      strength: 15, intelligence: 12, piety: 12,
      vitality: 14, agility: 10, luck: 10, bonusPoints: 6
    });

    const event = new KeyboardEvent('keydown', { key: 'l' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.LORD);
  });

  it('should select Ninja with J key', () => {
    // Roll stats that make Ninja eligible
    component.rolledStats.set({
      strength: 17, intelligence: 17, piety: 10,
      vitality: 15, agility: 17, luck: 10, bonusPoints: 8
    });

    const event = new KeyboardEvent('keydown', { key: 'j' });
    component.handleKeyPress(event);
    expect(component.selectedClass()).toBe(CharacterClass.NINJA);
  });

  it('should not select class before stats rolled', () => {
    component.resetForm();
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);

    const event = new KeyboardEvent('keydown', { key: 'f' });
    component.handleKeyPress(event);

    expect(component.selectedClass()).toBeNull();
  });

  it('should not select ineligible class', () => {
    // Stats that don't qualify for Ninja
    component.rolledStats.set({
      strength: 10, intelligence: 10, piety: 10,
      vitality: 10, agility: 10, luck: 10, bonusPoints: 3
    });

    const event = new KeyboardEvent('keydown', { key: 'j' });
    component.handleKeyPress(event);

    expect(component.selectedClass()).not.toBe(CharacterClass.NINJA);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- character-creation.component`
Expected: FAIL - Wrong class shortcuts (current: I/S/N, new: B/A/J)

**Step 3: Update class keyboard shortcuts**

Modify component:

```typescript
// Update getClassShortcut method (around line 226)
getClassShortcut(classId: string): string {
  const shortcuts: { [key: string]: string } = {
    'FIGHTER': 'F',
    'MAGE': 'M',
    'PRIEST': 'P',
    'THIEF': 'T',
    'BISHOP': 'B',    // Changed from 'I'
    'SAMURAI': 'A',   // Changed from 'S'
    'LORD': 'L',
    'NINJA': 'J'      // Changed from 'N'
  };
  return shortcuts[classId] || '?';
}

// Update handleKeyPress method - class selection section (around line 297)
// Priority 6: Class selection (F, M, P, T, B, A, L, J)
// Only active when stats rolled (so alignment keys won't conflict) AND form not complete (so Save key takes precedence)
if (this.rolledStats() && !this.canSave()) {
  const classMap: { [key: string]: CharacterClass } = {
    'f': CharacterClass.FIGHTER,
    'm': CharacterClass.MAGE,
    'p': CharacterClass.PRIEST,
    't': CharacterClass.THIEF,
    'b': CharacterClass.BISHOP,   // Changed from 'i'
    'a': CharacterClass.SAMURAI,  // Changed from 's'
    'l': CharacterClass.LORD,
    'j': CharacterClass.NINJA     // Changed from 'n'
  };

  const charClass = classMap[key];
  if (charClass && this.isClassEligible(charClass)) {
    event.preventDefault();
    this.selectClass(charClass);
    return;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- character-creation.component`
Expected: PASS - All class shortcut tests green

**Step 5: Commit**

```bash
git add src/app/character-creation/
git commit -m "feat(character-creation): update class shortcuts to avoid conflicts

- Bishop: I -> B
- Samurai: S -> A
- Ninja: N -> J
- Prevents conflicts with alignment keys (G/N/E)
- All 8 classes now use first letter or mnemonic"
```

---

## Task 4: Integrate Name Modal and Update Keyboard Handler

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`
- Modify: `src/app/character-creation/character-creation.component.html`
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Write the failing test**

Add to test file:

```typescript
describe('name modal integration', () => {
  it('should show name modal when Enter pressed after class selection', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);
    component.selectClass(CharacterClass.FIGHTER);

    expect(component.showNameModal()).toBe(false);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleKeyPress(event);

    expect(component.showNameModal()).toBe(true);
  });

  it('should not show name modal when Enter pressed without class', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleKeyPress(event);

    expect(component.showNameModal()).toBe(false);
  });

  it('should block keyboard shortcuts when name modal is open', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);
    component.selectClass(CharacterClass.FIGHTER);
    component.showNameModal.set(true);

    const currentStats = component.rolledStats();

    // Try to reroll (should not work)
    const event = new KeyboardEvent('keydown', { key: 'r' });
    component.handleKeyPress(event);
    jest.advanceTimersByTime(300);

    // Stats should not change
    expect(component.rolledStats()).toBe(currentStats);
  });

  it('should save character when name modal emits save', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);
    component.selectClass(CharacterClass.FIGHTER);

    component.handleNameSave('Conan');

    const state = component['gameState'].state();
    const characters = Array.from(state.roster.values());
    expect(characters.length).toBe(1);
    expect(characters[0].name).toBe('Conan');
  });

  it('should close modal and return to form when name modal emits cancel', () => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);
    component.selectClass(CharacterClass.FIGHTER);
    component.showNameModal.set(true);

    component.handleNameCancel();

    expect(component.showNameModal()).toBe(false);
    expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
  });

  it('should reset form after successful save', () => {
    jest.useFakeTimers();

    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);
    component.selectClass(CharacterClass.FIGHTER);

    component.handleNameSave('Gandalf');

    // Wait for success message timeout
    jest.advanceTimersByTime(2000);

    expect(component.selectedRace()).toBeNull();
    expect(component.isLocked()).toBe(false);
    expect(component.showNameModal()).toBe(false);

    jest.useRealTimers();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- character-creation.component`
Expected: FAIL - showNameModal, handleNameSave, handleNameCancel not defined

**Step 3: Add name modal integration**

Modify component TypeScript:

```typescript
// Add import at top
import { NameModalComponent } from '../../components/name-modal/name-modal.component';

// Add to imports array in @Component decorator (around line 36)
imports: [
  CommonModule,
  FormsModule,
  SceneTitleComponent,
  SceneFooterComponent,
  NameModalComponent  // Add this
],

// Add new signal after isLocked (around line 54)
readonly showNameModal = signal<boolean>(false);

// Remove characterName signal (around line 47) - no longer needed on main form

// Update canSave computed to check if class is selected (around line 94)
readonly canAccept = computed(() => {
  return this.selectedRace() !== null &&
         this.selectedAlignment() !== null &&
         this.selectedClass() !== null;
});

// Remove old canSave computed and saveCharacter method

// Add new methods for name modal handling (after selectClass method, around line 159)
acceptCharacter() {
  if (!this.canAccept()) return;
  this.showNameModal.set(true);
}

handleNameSave(name: string) {
  if (!this.canAccept()) return;

  const stats = this.finalStats()!;
  const character = CharacterService.createCharacterFromStats({
    name: name,
    password: '', // Password field removed per plan, but required by interface
    race: this.selectedRace()!,
    alignment: this.selectedAlignment()!,
    selectedClass: this.selectedClass()!,
    stats: {
      strength: stats.strength,
      intelligence: stats.intelligence,
      piety: stats.piety,
      vitality: stats.vitality,
      agility: stats.agility,
      luck: stats.luck
    }
  });

  // Add to roster
  this.gameState.updateState(state => ({
    ...state,
    roster: new Map(state.roster).set(character.id, character)
  }));

  // Close modal
  this.showNameModal.set(false);

  // Show success and reset
  this.successMessage.set(`${character.name} created successfully!`);
  setTimeout(() => {
    this.resetForm();
    this.successMessage.set(null);
  }, 2000);
}

handleNameCancel() {
  this.showNameModal.set(false);
}

// Update resetForm to close modal (around line 197)
resetForm() {
  this.selectedRace.set(null);
  this.selectedAlignment.set(null);
  this.rolledStats.set(null);
  this.selectedClass.set(null);
  this.errorMessage.set(null);
  this.showCancelConfirmation.set(false);
  this.isLocked.set(false);
  this.showNameModal.set(false);  // Add this line
}

// Update keyboard handler (around line 241)
@HostListener('window:keydown', ['$event'])
handleKeyPress(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  // Priority 0: Block all shortcuts if name modal is open
  if (this.showNameModal()) {
    return;
  }

  // Priority 1: Reset form (ESC)
  if (key === 'escape') {
    event.preventDefault();
    this.resetForm();
    return;
  }

  // Priority 2: Quit to Training Grounds (Q)
  if (key === 'q') {
    event.preventDefault();
    this.navigateToTrainingGrounds();
    return;
  }

  // Priority 3: Race selection (1-5) - only if not locked
  if (key >= '1' && key <= '5' && !this.isLocked()) {
    const races = this.allRaces();
    const index = parseInt(key) - 1;
    if (index < races.length) {
      event.preventDefault();
      const raceId = this.parseRaceId(races[index].id);
      if (raceId) this.selectRace(raceId);
    }
    return;
  }

  // Priority 4: Alignment selection (G, N, E) - only if race selected and not locked
  if (this.selectedRace() && !this.isLocked()) {
    switch(key) {
      case 'g':
        event.preventDefault();
        this.selectAlignment(Alignment.GOOD);
        return;
      case 'n':
        event.preventDefault();
        this.selectAlignment(Alignment.NEUTRAL);
        return;
      case 'e':
        event.preventDefault();
        this.selectAlignment(Alignment.EVIL);
        return;
    }
  }

  // Priority 5: Roll stats (R)
  if (key === 'r' && this.selectedAlignment()) {
    event.preventDefault();
    this.rollStats();
    return;
  }

  // Priority 6: Class selection (F, M, P, T, B, A, L, J) - only when locked
  if (this.rolledStats() && this.isLocked() && !this.canAccept()) {
    const classMap: { [key: string]: CharacterClass } = {
      'f': CharacterClass.FIGHTER,
      'm': CharacterClass.MAGE,
      'p': CharacterClass.PRIEST,
      't': CharacterClass.THIEF,
      'b': CharacterClass.BISHOP,
      'a': CharacterClass.SAMURAI,
      'l': CharacterClass.LORD,
      'j': CharacterClass.NINJA
    };

    const charClass = classMap[key];
    if (charClass && this.isClassEligible(charClass)) {
      event.preventDefault();
      this.selectClass(charClass);
      return;
    }
  }

  // Priority 7: Accept character (Enter) - only when class selected
  if (key === 'enter' && this.canAccept()) {
    event.preventDefault();
    this.acceptCharacter();
    return;
  }
}

// Remove old footer menu handler logic for 'save' case
// Update footer menu items (around line 101)
readonly footerMenuItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [];

  if (this.canAccept()) {
    items.push({ id: 'accept', label: 'ACCEPT & NAME CHARACTER', shortcut: 'ENTER', enabled: true });
  }

  items.push({ id: 'reset', label: 'RESET', shortcut: 'ESC', enabled: true });
  items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });

  return items;
});

// Update footer handler (around line 328)
handleFooterAction(itemId: string) {
  switch(itemId) {
    case 'accept':
      this.acceptCharacter();
      break;
    case 'reset':
      this.resetForm();
      break;
    case 'quit':
      this.navigateToTrainingGrounds();
      break;
  }
}
```

**Step 4: Update template to include name modal**

Add to template before closing tag:

```html
<!-- After contentinfo section, before end of component -->
<app-name-modal
  [visible]="showNameModal()"
  (save)="handleNameSave($event)"
  (cancel)="handleNameCancel()"
></app-name-modal>
```

Remove old name input field from Step 5 section in template (the entire form-group div with character name input).

**Step 5: Run test to verify it passes**

Run: `npm test -- character-creation.component`
Expected: PASS - All integration tests green

**Step 6: Commit**

```bash
git add src/app/character-creation/
git commit -m "feat(character-creation): integrate name modal with keyboard flow

- Add showNameModal signal to control modal visibility
- Replace inline name input with name modal
- Block all shortcuts when modal is open
- Accept character with Enter key (opens modal)
- Update footer to show ACCEPT & NAME action
- Update keyboard handler priority order"
```

---

## Task 5: Update Template - Locked State Visual Indicators

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html`
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Update race selection section**

```html
<!-- Update Step 1: CHOOSE RACE section -->
<div class="form-section">
  <h2>1. CHOOSE RACE</h2>
  <div class="race-buttons">
    @for (race of allRaces(); track race.id) {
      <button
        [class.selected]="selectedRace() === parseRaceId(race.id)"
        [class.locked]="isLocked() && selectedRace() === parseRaceId(race.id)"
        [disabled]="isLocked()"
        (click)="selectRace(parseRaceId(race.id)!)"
      >
        [{{ $index + 1 }}] {{ race.name }}
        @if (isLocked() && selectedRace() === parseRaceId(race.id)) {
          <span class="lock-icon">🔒</span>
        }
      </button>
    }
  </div>

  @if (raceData()) {
    <div class="race-info">
      <p>{{ raceData()!.description }}</p>
      <div class="stat-line">
        <strong>Base Stats:</strong>
        STR {{ raceData()!.baseStats.str }} |
        INT {{ raceData()!.baseStats.int }} |
        PIE {{ raceData()!.baseStats.pie }} |
        VIT {{ raceData()!.baseStats.vit }} |
        AGI {{ raceData()!.baseStats.agi }} |
        LUC {{ raceData()!.baseStats.luc }}
      </div>
      <div class="stat-line">
        <strong>Strengths:</strong> {{ raceData()!.strengths.join(', ') }}
      </div>
      <div class="stat-line">
        <strong>Weaknesses:</strong> {{ raceData()!.weaknesses.join(', ') }}
      </div>
    </div>
  }

  @if (isLocked()) {
    <p class="lock-hint">Press ESC to unlock and change race</p>
  }
</div>
```

**Step 2: Update alignment selection section**

```html
<!-- Update Step 2: CHOOSE ALIGNMENT section -->
<div class="form-section">
  <h2>2. CHOOSE ALIGNMENT</h2>
  <div class="alignment-buttons">
    <button
      [disabled]="!selectedRace() || isLocked()"
      [class.selected]="selectedAlignment() === Alignment.GOOD"
      [class.locked]="isLocked() && selectedAlignment() === Alignment.GOOD"
      (click)="selectAlignment(Alignment.GOOD)"
    >
      [G] GOOD
      @if (isLocked() && selectedAlignment() === Alignment.GOOD) {
        <span class="lock-icon">🔒</span>
      }
    </button>
    <button
      [disabled]="!selectedRace() || isLocked()"
      [class.selected]="selectedAlignment() === Alignment.NEUTRAL"
      [class.locked]="isLocked() && selectedAlignment() === Alignment.NEUTRAL"
      (click)="selectAlignment(Alignment.NEUTRAL)"
    >
      [N] NEUTRAL
      @if (isLocked() && selectedAlignment() === Alignment.NEUTRAL) {
        <span class="lock-icon">🔒</span>
      }
    </button>
    <button
      [disabled]="!selectedRace() || isLocked()"
      [class.selected]="selectedAlignment() === Alignment.EVIL"
      [class.locked]="isLocked() && selectedAlignment() === Alignment.EVIL"
      (click)="selectAlignment(Alignment.EVIL)"
    >
      [E] EVIL
      @if (isLocked() && selectedAlignment() === Alignment.EVIL) {
        <span class="lock-icon">🔒</span>
      }
    </button>
  </div>

  @if (isLocked()) {
    <p class="lock-hint">Press ESC to unlock and change alignment</p>
  }
</div>
```

**Step 3: Update class selection section to show new shortcuts**

```html
<!-- Update Step 4: CHOOSE CLASS section -->
<div class="form-section">
  <h2>4. CHOOSE CLASS</h2>

  @if (!rolledStats()) {
    <p class="hint">Roll stats to see eligible classes</p>
  }

  <div class="class-buttons">
    @for (classItem of allClasses(); track classItem.id) {
      @let charClass = parseClassId(classItem.id);
      @let eligible = isClassEligible(charClass!);
      @let shortcut = getClassShortcut(classItem.id);

      <button
        [disabled]="!rolledStats() || !eligible"
        [class.selected]="selectedClass() === charClass"
        (click)="selectClass(charClass!)"
        [attr.title]="!eligible ? 'Stats or alignment requirements not met' : ''"
      >
        <span class="class-label">[{{ shortcut }}] {{ classItem.name }}</span>
        @if (!eligible) {
          <span class="ineligible-marker">✗</span>
        }
      </button>
    }
  </div>

  @if (selectedClass()) {
    @let classData = getClassData(selectedClass()!);
    <div class="class-info">
      <p>{{ classData.description }}</p>
      <div class="stat-line">
        <strong>Hit Dice:</strong> {{ classData.hitDice }}
      </div>
    </div>
  }
</div>
```

**Step 4: Remove Step 5 (NAME CHARACTER) section from template**

Delete the entire Step 5 section since naming now happens in modal.

**Step 5: Add locked state styles**

```scss
// Add to character-creation.component.scss

.locked {
  background-color: #3a3a3a !important;
  cursor: not-allowed !important;
  opacity: 0.7;

  .lock-icon {
    margin-left: 0.5rem;
    font-size: 0.9rem;
  }
}

.lock-hint {
  color: #ffa500;
  font-size: 0.9rem;
  font-style: italic;
  margin-top: 0.5rem;
  text-align: center;
}

.hint {
  color: #888;
  font-size: 0.9rem;
  font-style: italic;
  text-align: center;
  margin-bottom: 1rem;
}

.ineligible-marker {
  margin-left: 0.5rem;
  color: #f44336;
  font-weight: bold;
}

button {
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background-color: inherit;
      color: inherit;
    }
  }
}
```

**Step 6: Test manually**

Run: `npm start`
- Navigate to character creation
- Select race, verify it can switch
- Select alignment, verify it can switch
- Press R to roll stats
- Verify race/alignment buttons show lock icon and are disabled
- Verify class buttons show new shortcuts (F/M/P/T/B/A/L/J)
- Select class
- Press Enter, verify name modal appears
- Type name and press Enter, verify success

**Step 7: Commit**

```bash
git add src/app/character-creation/
git commit -m "feat(character-creation): add locked state visual indicators

- Show lock icon on locked race/alignment selections
- Disable locked buttons with visual feedback
- Add hint text explaining how to unlock
- Update class shortcuts in template (B/A/J)
- Remove inline name input from template
- Add styles for locked/disabled states"
```

---

## Task 6: Remove Confirmation Dialog Code

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`
- Modify: `src/app/character-creation/character-creation.component.html`
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Remove confirmation dialog from component**

```typescript
// Remove ConfirmationDialogComponent from imports (around line 12)
// Remove from imports array in @Component decorator

// Remove showCancelConfirmation signal (around line 53)

// Remove confirmCancel method (around line 208)

// Update resetForm to remove confirmation flag reference (around line 197)
resetForm() {
  this.selectedRace.set(null);
  this.selectedAlignment.set(null);
  this.rolledStats.set(null);
  this.selectedClass.set(null);
  this.errorMessage.set(null);
  // Remove this line: this.showCancelConfirmation.set(false);
  this.isLocked.set(false);
  this.showNameModal.set(false);
}
```

**Step 2: Remove confirmation dialog from template**

Remove the entire confirmation dialog section from template (near the end):

```html
<!-- Remove this entire section -->
<!--
<app-confirmation-dialog
  [visible]="showCancelConfirmation()"
  message="Discard current character creation?"
  (confirm)="resetForm()"
  (cancel)="showCancelConfirmation.set(false)"
></app-confirmation-dialog>
-->
```

**Step 3: Remove confirmation dialog tests**

Remove any tests related to `showCancelConfirmation` or the confirmation dialog.

**Step 4: Run tests**

Run: `npm test -- character-creation.component`
Expected: PASS - All tests still green

**Step 5: Commit**

```bash
git add src/app/character-creation/
git commit -m "refactor(character-creation): remove confirmation dialog

- Remove showCancelConfirmation signal
- Remove confirmCancel method
- Remove ConfirmationDialogComponent usage
- ESC now immediately resets form
- Q now immediately quits to Training Grounds"
```

---

## Task 7: Update Integration Tests

**Files:**
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Add comprehensive integration test**

```typescript
describe('complete character creation flow', () => {
  it('should complete full workflow with keyboard only', () => {
    jest.useFakeTimers();

    // Step 1: Select race with keyboard
    const event1 = new KeyboardEvent('keydown', { key: '1' });
    component.handleKeyPress(event1);
    expect(component.selectedRace()).toBe(Race.HUMAN);
    expect(component.isLocked()).toBe(false);

    // Step 2: Select alignment with keyboard
    const event2 = new KeyboardEvent('keydown', { key: 'g' });
    component.handleKeyPress(event2);
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    expect(component.isLocked()).toBe(false);

    // Step 3: Roll stats (locks race/alignment)
    const event3 = new KeyboardEvent('keydown', { key: 'r' });
    component.handleKeyPress(event3);
    jest.advanceTimersByTime(300);
    expect(component.rolledStats()).toBeTruthy();
    expect(component.isLocked()).toBe(true);

    // Step 4: Try to change race (should fail - locked)
    const event4 = new KeyboardEvent('keydown', { key: '2' });
    component.handleKeyPress(event4);
    expect(component.selectedRace()).toBe(Race.HUMAN); // Still HUMAN

    // Step 5: Select class with keyboard
    const event5 = new KeyboardEvent('keydown', { key: 'f' });
    component.handleKeyPress(event5);
    expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

    // Step 6: Accept character (open name modal)
    const event6 = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleKeyPress(event6);
    expect(component.showNameModal()).toBe(true);

    // Step 7: Try to reroll while modal open (should be blocked)
    const statsBeforeBlock = component.rolledStats();
    const event7 = new KeyboardEvent('keydown', { key: 'r' });
    component.handleKeyPress(event7);
    jest.advanceTimersByTime(300);
    expect(component.rolledStats()).toBe(statsBeforeBlock); // No change

    // Step 8: Save character with name
    component.handleNameSave('TestHero');
    expect(component.showNameModal()).toBe(false);
    expect(component.successMessage()).toContain('TestHero');

    // Step 9: Wait for reset
    jest.advanceTimersByTime(2000);
    expect(component.selectedRace()).toBeNull();
    expect(component.isLocked()).toBe(false);
    expect(component.successMessage()).toBeNull();

    // Verify character in roster
    const state = component['gameState'].state();
    const characters = Array.from(state.roster.values());
    expect(characters.length).toBe(1);
    expect(characters[0].name).toBe('TestHero');
    expect(characters[0].race).toBe(Race.HUMAN);
    expect(characters[0].class).toBe(CharacterClass.FIGHTER);

    jest.useRealTimers();
  });

  it('should handle reset workflow', () => {
    // Create partial character
    component.selectRace(Race.ELF);
    component.selectAlignment(Alignment.NEUTRAL);
    component.rollStats();
    jest.advanceTimersByTime(300);

    expect(component.isLocked()).toBe(true);
    expect(component.rolledStats()).toBeTruthy();

    // Press ESC to reset
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleKeyPress(event);

    // Verify complete reset
    expect(component.selectedRace()).toBeNull();
    expect(component.selectedAlignment()).toBeNull();
    expect(component.rolledStats()).toBeNull();
    expect(component.isLocked()).toBe(false);
    expect(component.showNameModal()).toBe(false);
  });

  it('should handle reroll workflow', () => {
    component.selectRace(Race.DWARF);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();
    jest.advanceTimersByTime(300);

    const firstStats = component.rolledStats();
    expect(component.isLocked()).toBe(true);

    // Reroll multiple times
    component.rollStats();
    jest.advanceTimersByTime(300);
    const secondStats = component.rolledStats();

    component.rollStats();
    jest.advanceTimersByTime(300);
    const thirdStats = component.rolledStats();

    // Stats should change
    expect(secondStats).not.toBe(firstStats);
    expect(thirdStats).not.toBe(secondStats);

    // Should remain locked
    expect(component.isLocked()).toBe(true);
    expect(component.selectedRace()).toBe(Race.DWARF);
  });

  it('should handle name modal cancel workflow', () => {
    component.selectRace(Race.GNOME);
    component.selectAlignment(Alignment.EVIL);
    component.rollStats();
    jest.advanceTimersByTime(300);
    component.selectClass(CharacterClass.THIEF);

    // Open modal
    component.acceptCharacter();
    expect(component.showNameModal()).toBe(true);

    // Cancel
    component.handleNameCancel();
    expect(component.showNameModal()).toBe(false);

    // Character data should remain
    expect(component.selectedClass()).toBe(CharacterClass.THIEF);
    expect(component.selectedRace()).toBe(Race.GNOME);

    // Should be able to reopen modal
    component.acceptCharacter();
    expect(component.showNameModal()).toBe(true);
  });
});
```

**Step 2: Run tests**

Run: `npm test -- character-creation.component`
Expected: PASS - All integration tests green

**Step 3: Commit**

```bash
git add src/app/character-creation/__tests__/
git commit -m "test(character-creation): add comprehensive integration tests

- Test complete keyboard-only workflow
- Test state locking behavior
- Test reset workflow
- Test reroll workflow
- Test name modal cancel workflow
- Verify keyboard shortcuts are blocked when modal open"
```

---

## Task 8: Update Documentation

**Files:**
- Modify: `docs/ui/scenes/02-training-grounds.md`
- Create: `docs/ui/keyboard-shortcuts-character-creation.md`

**Step 1: Create keyboard shortcuts documentation**

```markdown
<!-- docs/ui/keyboard-shortcuts-character-creation.md -->
# Character Creation Keyboard Shortcuts

## Overview

Character creation uses context-aware keyboard shortcuts that change based on workflow state. After rolling stats for the first time, race and alignment selections lock to prevent accidental changes.

## State Flow

```
[Race Selection] → [Alignment Selection] → [First Stats Roll] → [LOCKED]
                                                ↓
                                          [Class Selection] → [Accept & Name]
```

## Keyboard Shortcuts by State

### Before Stats Rolled (UNLOCKED)

| Key | Action | Available When |
|-----|--------|----------------|
| `1-5` | Select race (Human/Elf/Dwarf/Gnome/Hobbit) | Always |
| `G` | Select GOOD alignment | Race selected |
| `N` | Select NEUTRAL alignment | Race selected |
| `E` | Select EVIL alignment | Race selected |
| `R` | Roll stats (locks race/alignment) | Alignment selected |
| `ESC` | Reset entire form | Always |
| `Q` | Quit to Training Grounds | Always |

### After Stats Rolled (LOCKED)

| Key | Action | Available When |
|-----|--------|----------------|
| `R` | Reroll stats | Always |
| `F` | Select Fighter | Eligible |
| `M` | Select Mage | Eligible |
| `P` | Select Priest | Eligible |
| `T` | Select Thief | Eligible |
| `B` | Select Bishop | Eligible |
| `A` | Select Samurai | Eligible |
| `L` | Select Lord | Eligible |
| `J` | Select Ninja | Eligible |
| `ENTER` | Accept & open name modal | Class selected |
| `ESC` | Reset (unlocks all) | Always |
| `Q` | Quit to Training Grounds | Always |

### Name Modal Open

| Key | Action | Notes |
|-----|--------|-------|
| `ENTER` | Save character | Only if name not empty |
| `ESC` | Cancel, return to form | Character data preserved |
| All other keys | Type into name field | Parent shortcuts blocked |

## Design Principles

1. **State-Based Locking**: First stats roll is the "commitment point" - race/alignment lock
2. **No Overlapping Shortcuts**: Keys have different meanings before/after locking (G/N/E)
3. **Modal Isolation**: Name modal blocks all parent shortcuts to enable conflict-free typing
4. **Clear Reset Path**: ESC always available to unlock and start over
5. **Visual Feedback**: Locked selections show 🔒 icon and are visually disabled

## Common Workflows

### Happy Path
1. Press `1` → Select Human
2. Press `G` → Select GOOD
3. Press `R` → Roll stats (now LOCKED)
4. Press `F` → Select Fighter
5. Press `ENTER` → Open name modal
6. Type "Conan" → Enter name
7. Press `ENTER` → Save character

### Reroll for Better Stats
1. Steps 1-3 above
2. Press `R` multiple times → Keep rerolling until satisfied
3. Continue from step 4 above

### Change Mind About Race
1. Steps 1-3 above
2. Press `ESC` → Reset and unlock
3. Start over from step 1

### Cancel During Naming
1. Steps 1-5 above
2. Press `ESC` in modal → Cancel naming
3. Back at class selection, press `ENTER` to retry

## Technical Notes

- Class shortcuts changed from I/S/N to B/A/J to avoid alignment conflicts
- Name modal is a separate component with isolated keyboard handling
- All shortcuts use `event.preventDefault()` to avoid browser defaults
- Tests verify shortcuts are blocked when modal is open
```

**Step 2: Update Training Grounds documentation**

```markdown
<!-- Update docs/ui/scenes/02-training-grounds.md -->

<!-- Add to Keyboard Shortcuts section -->

### Character Creation Shortcuts

See [Character Creation Keyboard Shortcuts](../keyboard-shortcuts-character-creation.md) for comprehensive guide.

**Quick Reference:**
- `1-5` - Select race (before stats rolled)
- `G/N/E` - Select alignment (before stats rolled)
- `R` - Roll/reroll stats
- `F/M/P/T/B/A/L/J` - Select class (after stats rolled)
- `ENTER` - Accept & name character
- `ESC` - Reset form
- `Q` - Quit to Training Grounds
```

**Step 3: Commit**

```bash
git add docs/ui/
git commit -m "docs(character-creation): add keyboard shortcuts guide

- Create comprehensive keyboard shortcuts documentation
- Document state-based locking behavior
- Explain context-aware key mappings
- Add common workflow examples
- Update Training Grounds docs with reference"
```

---

## Verification & Testing

**Manual Test Checklist:**

```
Character Creation Keyboard Flow:
- [ ] Race selection (1-5) works before rolling
- [ ] Race buttons show lock icon after rolling
- [ ] Race selection disabled after rolling
- [ ] Alignment selection (G/N/E) works before rolling
- [ ] Alignment buttons show lock icon after rolling
- [ ] Alignment selection disabled after rolling
- [ ] First R press rolls stats and locks race/alignment
- [ ] Multiple R presses reroll stats successfully
- [ ] Class shortcuts (F/M/P/T/B/A/L/J) work after rolling
- [ ] Class shortcuts don't work before rolling
- [ ] ENTER opens name modal after class selected
- [ ] ENTER doesn't work before class selected
- [ ] Name modal blocks all parent shortcuts
- [ ] Can type all letters in name modal without triggering shortcuts
- [ ] ENTER in modal saves character (if name not empty)
- [ ] ESC in modal cancels and returns to form
- [ ] ESC in main form resets and unlocks
- [ ] Q quits to Training Grounds
- [ ] Success message appears after save
- [ ] Form resets 2 seconds after save
- [ ] Character appears in roster after save
```

**Automated Test Coverage:**
```bash
npm test -- character-creation

Expected:
✓ State locking tests (6 tests)
✓ Class shortcut tests (9 tests)
✓ Name modal integration (6 tests)
✓ Complete workflow integration (4 tests)
✓ All existing tests still passing

Total: ~50+ tests, >95% coverage for character-creation component
```

---

## Rollback Plan

If issues arise:

```bash
# Revert all changes
git log --oneline  # Find commit before Task 1
git revert --no-commit <commit-hash>..HEAD
git commit -m "revert: rollback character creation keyboard redesign"

# Or revert specific tasks
git revert <task-N-commit-hash>
```

**Critical files to backup before starting:**
- `src/app/character-creation/character-creation.component.ts`
- `src/app/character-creation/character-creation.component.html`
- `src/app/character-creation/__tests__/character-creation.component.spec.ts`

---

## Post-Implementation

After all tasks complete:

1. Run full test suite: `npm test`
2. Run build: `npm run build`
3. Manual test all workflows above
4. Update CHANGELOG.md with feature description
5. Consider adding to release notes

**Success Criteria:**
- ✅ All automated tests passing
- ✅ Manual test checklist 100% complete
- ✅ No keyboard shortcut conflicts
- ✅ Can create character using keyboard only
- ✅ State locking works as designed
- ✅ Name modal isolates typing from shortcuts

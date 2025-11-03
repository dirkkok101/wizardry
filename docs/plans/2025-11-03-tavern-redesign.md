# Tavern Scene Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign tavern scene with 2-column layout, party gold system, formation management, and ESC navigation

**Architecture:** Composition pattern with wrapper components around existing CharacterCardComponent. Party-level gold replaces character-level gold. Direct-action buttons for immediate add/remove/move operations.

**Tech Stack:** Angular 19, TypeScript, Jest, SCSS

---

## Task 1: Update Type Definitions - Remove Character Gold, Add Party Gold

**Files:**
- Modify: `src/types/Character.ts` (remove gold field)
- Modify: `src/types/GameState.ts:14-28` (add gold to Party interface)

**Step 1: Remove gold field from Character interface**

Open `src/types/Character.ts` and locate the `gold` field. Remove it entirely:

```typescript
export interface Character {
  id: string;
  name: string;
  race: Race;
  class: CharacterClass;
  alignment: Alignment;
  // ... other fields
  // REMOVED: gold: number;
}
```

**Step 2: Add gold field to Party interface**

Open `src/types/GameState.ts` and add `gold` to the Party interface:

```typescript
export interface Party {
  members: string[]; // Character IDs (1-6)
  formation: {
    frontRow: string[]; // Max 3 character IDs
    backRow: string[]; // Max 3 character IDs
  };
  position: {
    level: number;
    x: number;
    y: number;
    facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  };
  light: boolean;
  gold: number; // NEW: Party's shared gold pool
}
```

**Step 3: Commit type changes**

```bash
git add src/types/Character.ts src/types/GameState.ts
git commit -m "refactor: migrate from character gold to party gold"
```

---

## Task 2: PartyService - Add Gold Management Functions (TDD)

**Files:**
- Create: `src/services/__tests__/PartyService.gold.spec.ts`
- Modify: `src/services/PartyService.ts`

**Step 1: Write failing tests for gold functions**

Create `src/services/__tests__/PartyService.gold.spec.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import * as PartyService from '../PartyService';
import { GameState } from '../../types/GameState';
import { createTestGameState } from '../../test-helpers/test-factories';

describe('PartyService - Gold Management', () => {
  describe('getPartyGold', () => {
    it('returns current party gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 500
        }
      };

      expect(PartyService.getPartyGold(state)).toBe(500);
    });
  });

  describe('addPartyGold', () => {
    it('adds gold to party immutably', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      const newState = PartyService.addPartyGold(state, 50);

      expect(newState.party.gold).toBe(150);
      expect(state.party.gold).toBe(100); // Original unchanged
    });
  });

  describe('removePartyGold', () => {
    it('removes gold from party immutably', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      const newState = PartyService.removePartyGold(state, 30);

      expect(newState.party.gold).toBe(70);
      expect(state.party.gold).toBe(100); // Original unchanged
    });

    it('never goes below zero', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 50
        }
      };

      const newState = PartyService.removePartyGold(state, 100);

      expect(newState.party.gold).toBe(0);
    });
  });

  describe('hasEnoughGold', () => {
    it('returns true when party has enough gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      expect(PartyService.hasEnoughGold(state, 50)).toBe(true);
      expect(PartyService.hasEnoughGold(state, 100)).toBe(true);
    });

    it('returns false when party does not have enough gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      expect(PartyService.hasEnoughGold(state, 101)).toBe(false);
      expect(PartyService.hasEnoughGold(state, 200)).toBe(false);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- PartyService.gold
```

Expected output: All tests FAIL with "function not defined" or similar errors.

**Step 3: Implement gold management functions**

Add to `src/services/PartyService.ts`:

```typescript
// Gold Management Functions

export function getPartyGold(state: GameState): number {
  return state.party.gold;
}

export function addPartyGold(state: GameState, amount: number): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      gold: state.party.gold + amount
    }
  };
}

export function removePartyGold(state: GameState, amount: number): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      gold: Math.max(0, state.party.gold - amount)
    }
  };
}

export function hasEnoughGold(state: GameState, amount: number): boolean {
  return state.party.gold >= amount;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- PartyService.gold
```

Expected output: All tests PASS.

**Step 5: Commit**

```bash
git add src/services/__tests__/PartyService.gold.spec.ts src/services/PartyService.ts
git commit -m "feat: add party gold management functions to PartyService"
```

---

## Task 3: PartyService - Add Formation Movement Functions (TDD)

**Files:**
- Create: `src/services/__tests__/PartyService.formation.spec.ts`
- Modify: `src/services/PartyService.ts`

**Step 1: Write failing tests for formation movement**

Create `src/services/__tests__/PartyService.formation.spec.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import * as PartyService from '../PartyService';
import { GameState } from '../../types/GameState';
import { createTestGameState, createTestCharacter } from '../../test-helpers/test-factories';

describe('PartyService - Formation Movement', () => {
  function createStateWithParty(memberIds: string[]): GameState {
    const state = createTestGameState();
    return {
      ...state,
      party: {
        ...state.party,
        members: [...memberIds],
        formation: {
          frontRow: memberIds.slice(0, 3),
          backRow: memberIds.slice(3, 6)
        }
      }
    };
  }

  describe('moveCharacterUp', () => {
    it('swaps character with previous position', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3', 'char4']);

      const newState = PartyService.moveCharacterUp(state, 'char2');

      expect(newState.party.members).toEqual(['char2', 'char1', 'char3', 'char4']);
      expect(newState.party.formation.frontRow).toEqual(['char2', 'char1', 'char3']);
      expect(newState.party.formation.backRow).toEqual(['char4']);
    });

    it('returns unchanged state if character is at position 0', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3']);

      const newState = PartyService.moveCharacterUp(state, 'char1');

      expect(newState).toEqual(state);
    });

    it('returns unchanged state if character not found', () => {
      const state = createStateWithParty(['char1', 'char2']);

      const newState = PartyService.moveCharacterUp(state, 'char99');

      expect(newState).toEqual(state);
    });
  });

  describe('moveCharacterDown', () => {
    it('swaps character with next position', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3', 'char4']);

      const newState = PartyService.moveCharacterDown(state, 'char2');

      expect(newState.party.members).toEqual(['char1', 'char3', 'char2', 'char4']);
      expect(newState.party.formation.frontRow).toEqual(['char1', 'char3', 'char2']);
      expect(newState.party.formation.backRow).toEqual(['char4']);
    });

    it('returns unchanged state if character is at last position', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3']);

      const newState = PartyService.moveCharacterDown(state, 'char3');

      expect(newState).toEqual(state);
    });

    it('returns unchanged state if character not found', () => {
      const state = createStateWithParty(['char1', 'char2']);

      const newState = PartyService.moveCharacterDown(state, 'char99');

      expect(newState).toEqual(state);
    });
  });

  describe('formation split across front/back rows', () => {
    it('correctly splits 6 members (3 front, 3 back)', () => {
      const state = createStateWithParty(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

      expect(state.party.formation.frontRow).toEqual(['c1', 'c2', 'c3']);
      expect(state.party.formation.backRow).toEqual(['c4', 'c5', 'c6']);
    });

    it('correctly splits 4 members (3 front, 1 back)', () => {
      const state = createStateWithParty(['c1', 'c2', 'c3', 'c4']);

      expect(state.party.formation.frontRow).toEqual(['c1', 'c2', 'c3']);
      expect(state.party.formation.backRow).toEqual(['c4']);
    });

    it('correctly splits 2 members (2 front, 0 back)', () => {
      const state = createStateWithParty(['c1', 'c2']);

      expect(state.party.formation.frontRow).toEqual(['c1', 'c2']);
      expect(state.party.formation.backRow).toEqual([]);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- PartyService.formation
```

Expected output: All tests FAIL.

**Step 3: Implement formation movement functions**

Add to `src/services/PartyService.ts`:

```typescript
// Formation Movement Functions

export function moveCharacterUp(state: GameState, characterId: string): GameState {
  const currentIndex = state.party.members.indexOf(characterId);
  if (currentIndex <= 0) {
    return state; // Already at top or not found
  }

  const newMembers = [...state.party.members];
  // Swap with previous
  [newMembers[currentIndex - 1], newMembers[currentIndex]] =
    [newMembers[currentIndex], newMembers[currentIndex - 1]];

  return updateFormationFromMembers(state, newMembers);
}

export function moveCharacterDown(state: GameState, characterId: string): GameState {
  const currentIndex = state.party.members.indexOf(characterId);
  if (currentIndex === -1 || currentIndex >= state.party.members.length - 1) {
    return state; // Not found or already at bottom
  }

  const newMembers = [...state.party.members];
  // Swap with next
  [newMembers[currentIndex], newMembers[currentIndex + 1]] =
    [newMembers[currentIndex + 1], newMembers[currentIndex]];

  return updateFormationFromMembers(state, newMembers);
}

// Helper function to recalculate formation from members array
function updateFormationFromMembers(state: GameState, members: string[]): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      members,
      formation: {
        frontRow: members.slice(0, 3),
        backRow: members.slice(3, 6)
      }
    }
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- PartyService.formation
```

Expected output: All tests PASS.

**Step 5: Commit**

```bash
git add src/services/__tests__/PartyService.formation.spec.ts src/services/PartyService.ts
git commit -m "feat: add formation movement functions to PartyService"
```

---

## Task 4: Update Test Factories - Remove Character Gold, Add Party Gold

**Files:**
- Modify: `src/test-helpers/test-factories.ts`

**Step 1: Update createTestCharacter to remove gold**

Open `src/test-helpers/test-factories.ts` and locate `createTestCharacter`:

```typescript
export function createTestCharacter(overrides?: Partial<Character>): Character {
  return {
    id: generateId(),
    name: 'Test Character',
    race: 'HUMAN',
    class: 'FIGHTER',
    alignment: 'GOOD',
    level: 1,
    xp: 0,
    hp: 10,
    maxHp: 10,
    status: 'OKAY',
    strength: 10,
    intelligence: 10,
    piety: 10,
    vitality: 10,
    agility: 10,
    luck: 10,
    // REMOVED: gold: 0,
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    spells: [],
    ...overrides
  };
}
```

**Step 2: Update createTestParty / createTestGameState to include gold**

Locate party creation functions and ensure `gold: 0` is included:

```typescript
export function createTestParty(overrides?: Partial<Party>): Party {
  return {
    members: [],
    formation: {
      frontRow: [],
      backRow: []
    },
    position: {
      level: 1,
      x: 0,
      y: 0,
      facing: 'NORTH'
    },
    light: false,
    gold: 0, // NEW: default party gold
    ...overrides
  };
}
```

**Step 3: Run all tests to verify no breakage**

```bash
npm test
```

Expected: Some tests may fail due to gold references. We'll fix those in next tasks.

**Step 4: Commit factory updates**

```bash
git add src/test-helpers/test-factories.ts
git commit -m "refactor: update test factories for party gold system"
```

---

## Task 5: Update GameInitializationService for Party Gold

**Files:**
- Modify: `src/services/GameInitializationService.ts`
- Modify: `src/services/__tests__/GameInitializationService.spec.ts`

**Step 1: Update GameInitializationService to initialize party.gold**

Open `src/services/GameInitializationService.ts` and ensure party initialization includes gold:

```typescript
export function initializeGame(): GameState {
  return {
    roster: new Map(),
    party: {
      members: [],
      formation: {
        frontRow: [],
        backRow: []
      },
      position: {
        level: 1,
        x: 0,
        y: 0,
        facing: 'NORTH'
      },
      light: false,
      gold: 0 // NEW: initialize with 0 gold
    },
    currentScene: SceneType.TITLE_SCREEN,
    eventLog: []
  };
}
```

**Step 2: Update tests to verify party.gold initialization**

Open `src/services/__tests__/GameInitializationService.spec.ts`:

```typescript
describe('initializeGame', () => {
  it('initializes party with zero gold', () => {
    const state = GameInitializationService.initializeGame();

    expect(state.party.gold).toBe(0);
  });
});
```

**Step 3: Run tests**

```bash
npm test -- GameInitializationService
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/services/GameInitializationService.ts src/services/__tests__/GameInitializationService.spec.ts
git commit -m "feat: initialize party gold in GameInitializationService"
```

---

## Task 6: Create CharacterCardActionsComponent (TDD)

**Files:**
- Create: `src/components/character-card-actions/character-card-actions.component.ts`
- Create: `src/components/character-card-actions/character-card-actions.component.html`
- Create: `src/components/character-card-actions/character-card-actions.component.scss`
- Create: `src/components/character-card-actions/__tests__/character-card-actions.component.spec.ts`

**Step 1: Write failing component test**

Create `src/components/character-card-actions/__tests__/character-card-actions.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardActionsComponent, ActionType } from '../character-card-actions.component';

describe('CharacterCardActionsComponent', () => {
  let component: CharacterCardActionsComponent;
  let fixture: ComponentFixture<CharacterCardActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardActionsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardActionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders buttons for specified actions', () => {
    component.actions = ['inspect', 'add'];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe('Inspect');
    expect(buttons[1].textContent.trim()).toBe('Add');
  });

  it('emits inspect event when inspect button clicked', () => {
    component.actions = ['inspect'];
    fixture.detectChanges();

    const emitSpy = jest.spyOn(component.inspectClick, 'emit');
    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('disables button when action is in disabledActions', () => {
    component.actions = ['moveUp', 'moveDown'];
    component.disabledActions = ['moveUp'];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
  });

  it('renders all action types correctly', () => {
    component.actions = ['inspect', 'add', 'remove', 'moveUp', 'moveDown'];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(5);
    expect(buttons[0].textContent.trim()).toBe('Inspect');
    expect(buttons[1].textContent.trim()).toBe('Add');
    expect(buttons[2].textContent.trim()).toBe('Remove');
    expect(buttons[3].textContent.trim()).toBe('↑');
    expect(buttons[4].textContent.trim()).toBe('↓');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- character-card-actions.component
```

Expected: FAIL (component doesn't exist).

**Step 3: Implement CharacterCardActionsComponent**

Create `src/components/character-card-actions/character-card-actions.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ActionType = 'inspect' | 'add' | 'remove' | 'moveUp' | 'moveDown';

@Component({
  selector: 'app-character-card-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-card-actions.component.html',
  styleUrl: './character-card-actions.component.scss'
})
export class CharacterCardActionsComponent {
  @Input() actions: ActionType[] = [];
  @Input() disabledActions: ActionType[] = [];

  @Output() inspectClick = new EventEmitter<void>();
  @Output() addClick = new EventEmitter<void>();
  @Output() removeClick = new EventEmitter<void>();
  @Output() moveUpClick = new EventEmitter<void>();
  @Output() moveDownClick = new EventEmitter<void>();

  getButtonLabel(action: ActionType): string {
    const labels: Record<ActionType, string> = {
      inspect: 'Inspect',
      add: 'Add',
      remove: 'Remove',
      moveUp: '↑',
      moveDown: '↓'
    };
    return labels[action];
  }

  isDisabled(action: ActionType): boolean {
    return this.disabledActions.includes(action);
  }

  handleClick(action: ActionType): void {
    const emitters: Record<ActionType, EventEmitter<void>> = {
      inspect: this.inspectClick,
      add: this.addClick,
      remove: this.removeClick,
      moveUp: this.moveUpClick,
      moveDown: this.moveDownClick
    };
    emitters[action].emit();
  }
}
```

Create `src/components/character-card-actions/character-card-actions.component.html`:

```html
<div class="character-card-actions">
  @for (action of actions; track action) {
    <button
      [disabled]="isDisabled(action)"
      (click)="handleClick(action)"
      class="action-button"
    >
      {{ getButtonLabel(action) }}
    </button>
  }
</div>
```

Create `src/components/character-card-actions/character-card-actions.component.scss`:

```scss
@import '../../../styles/variables';

.character-card-actions {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: var(--color-background-darker);
  border-top: 1px solid var(--color-primary);

  .action-button {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    cursor: pointer;
    font-family: var(--font-family-mono);
    font-size: 0.875rem;

    &:hover:not(:disabled) {
      background: var(--color-primary);
      color: var(--color-background);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- character-card-actions.component
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/components/character-card-actions/
git commit -m "feat: add CharacterCardActionsComponent with configurable actions"
```

---

## Task 7: Create CharacterCardWrapperComponent (TDD)

**Files:**
- Create: `src/components/character-card-wrapper/character-card-wrapper.component.ts`
- Create: `src/components/character-card-wrapper/character-card-wrapper.component.html`
- Create: `src/components/character-card-wrapper/character-card-wrapper.component.scss`
- Create: `src/components/character-card-wrapper/__tests__/character-card-wrapper.component.spec.ts`

**Step 1: Write failing component test**

Create `src/components/character-card-wrapper/__tests__/character-card-wrapper.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardWrapperComponent } from '../character-card-wrapper.component';
import { CharacterCardComponent } from '../../character-card/character-card.component';
import { CharacterCardActionsComponent, ActionType } from '../../character-card-actions/character-card-actions.component';
import { createTestCharacter } from '../../../test-helpers/test-factories';

describe('CharacterCardWrapperComponent', () => {
  let component: CharacterCardWrapperComponent;
  let fixture: ComponentFixture<CharacterCardWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CharacterCardWrapperComponent,
        CharacterCardComponent,
        CharacterCardActionsComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardWrapperComponent);
    component = fixture.componentInstance;
    component.character = createTestCharacter({ name: 'Test Hero' });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders CharacterCardComponent with character', () => {
    component.actions = ['inspect'];
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('app-character-card');
    expect(cardElement).toBeTruthy();
  });

  it('renders CharacterCardActionsComponent with specified actions', () => {
    component.actions = ['inspect', 'add'];
    fixture.detectChanges();

    const actionsElement = fixture.nativeElement.querySelector('app-character-card-actions');
    expect(actionsElement).toBeTruthy();
  });

  it('emits inspect event when actions component emits inspectClick', () => {
    component.actions = ['inspect'];
    fixture.detectChanges();

    const emitSpy = jest.spyOn(component.inspect, 'emit');
    component.onInspect();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits add event when actions component emits addClick', () => {
    component.actions = ['add'];
    fixture.detectChanges();

    const emitSpy = jest.spyOn(component.add, 'emit');
    component.onAdd();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('passes disabledActions to CharacterCardActionsComponent', () => {
    component.actions = ['moveUp', 'moveDown'];
    component.disabledActions = ['moveUp'];
    fixture.detectChanges();

    const actionsComponent = fixture.debugElement.query(
      (el) => el.componentInstance instanceof CharacterCardActionsComponent
    );
    expect(actionsComponent.componentInstance.disabledActions).toEqual(['moveUp']);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- character-card-wrapper.component
```

Expected: FAIL.

**Step 3: Implement CharacterCardWrapperComponent**

Create `src/components/character-card-wrapper/character-card-wrapper.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterCardComponent } from '../character-card/character-card.component';
import { CharacterCardActionsComponent, ActionType } from '../character-card-actions/character-card-actions.component';

@Component({
  selector: 'app-character-card-wrapper',
  standalone: true,
  imports: [CommonModule, CharacterCardComponent, CharacterCardActionsComponent],
  templateUrl: './character-card-wrapper.component.html',
  styleUrl: './character-card-wrapper.component.scss'
})
export class CharacterCardWrapperComponent {
  @Input() character!: Character;
  @Input() actions: ActionType[] = [];
  @Input() disabledActions: ActionType[] = [];

  @Output() inspect = new EventEmitter<void>();
  @Output() add = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  onInspect(): void {
    this.inspect.emit();
  }

  onAdd(): void {
    this.add.emit();
  }

  onRemove(): void {
    this.remove.emit();
  }

  onMoveUp(): void {
    this.moveUp.emit();
  }

  onMoveDown(): void {
    this.moveDown.emit();
  }
}
```

Create `src/components/character-card-wrapper/character-card-wrapper.component.html`:

```html
<div class="character-card-wrapper">
  <app-character-card [character]="character"></app-character-card>
  <app-character-card-actions
    [actions]="actions"
    [disabledActions]="disabledActions"
    (inspectClick)="onInspect()"
    (addClick)="onAdd()"
    (removeClick)="onRemove()"
    (moveUpClick)="onMoveUp()"
    (moveDownClick)="onMoveDown()"
  ></app-character-card-actions>
</div>
```

Create `src/components/character-card-wrapper/character-card-wrapper.component.scss`:

```scss
.character-card-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-primary);
  background: var(--color-background);
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- character-card-wrapper.component
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/components/character-card-wrapper/
git commit -m "feat: add CharacterCardWrapperComponent with composition pattern"
```

---

## Task 8: Redesign TavernComponent - Layout & State (Part 1)

**Files:**
- Modify: `src/app/tavern/tavern.component.ts`
- Modify: `src/app/tavern/tavern.component.html`
- Modify: `src/app/tavern/tavern.component.scss`

**Step 1: Update TavernComponent TypeScript**

Open `src/app/tavern/tavern.component.ts` and replace with new implementation:

```typescript
import { Component, computed, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { CharacterCardWrapperComponent } from '../../components/character-card-wrapper/character-card-wrapper.component';
import { ActionType } from '../../components/character-card-actions/character-card-actions.component';
import { SceneNavigationService, SceneType } from '../../services/SceneNavigationService';
import * as PartyService from '../../services/PartyService';

@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [CommonModule, CharacterCardWrapperComponent],
  templateUrl: './tavern.component.html',
  styleUrl: './tavern.component.scss'
})
export class TavernComponent {
  private gameStateService = inject(GameStateService);
  private router = inject(Router);

  gameState = this.gameStateService.state;
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Computed properties
  availableCharacters = computed(() => {
    const state = this.gameState();
    return Array.from(state.roster.values())
      .filter(char => !state.party.members.includes(char.id))
      .filter(char => char.status === 'OKAY' || char.status === 'GOOD');
  });

  frontRowCharacters = computed(() => {
    const state = this.gameState();
    return state.party.formation.frontRow
      .map(id => state.roster.get(id))
      .filter(char => char !== undefined);
  });

  backRowCharacters = computed(() => {
    const state = this.gameState();
    return state.party.formation.backRow
      .map(id => state.roster.get(id))
      .filter(char => char !== undefined);
  });

  partyGold = computed(() => this.gameState().party.gold);

  // Action configurations
  availableCharacterActions: ActionType[] = ['inspect', 'add'];

  partyCharacterActions: ActionType[] = ['inspect', 'remove', 'moveUp', 'moveDown'];

  getDisabledActionsForPartyMember(characterId: string): ActionType[] {
    const state = this.gameState();
    const index = state.party.members.indexOf(characterId);
    const disabled: ActionType[] = [];

    if (index === 0) disabled.push('moveUp');
    if (index === state.party.members.length - 1) disabled.push('moveDown');

    return disabled;
  }

  // Action handlers
  onAddCharacter(characterId: string): void {
    const state = this.gameState();
    const character = state.roster.get(characterId);

    if (!character) {
      this.showError('Character not found');
      return;
    }

    if (state.party.members.length >= 6) {
      this.showError('Party is full (maximum 6 members)');
      return;
    }

    if (character.status !== 'OKAY' && character.status !== 'GOOD') {
      this.showError(`${character.name} is ${character.status} and cannot join the party`);
      return;
    }

    const alignmentResult = PartyService.validateAlignment(state, characterId);
    if (!alignmentResult.valid) {
      this.showError(alignmentResult.reason);
      return;
    }

    const newState = PartyService.addMember(state, characterId);
    this.gameStateService.updateState(newState);
    this.showSuccess(`${character.name} joined the party`);
  }

  onRemoveCharacter(characterId: string): void {
    const state = this.gameState();
    const character = state.roster.get(characterId);

    if (!character) {
      this.showError('Character not found');
      return;
    }

    const newState = PartyService.removeMember(state, characterId);
    this.gameStateService.updateState(newState);
    this.showSuccess(`${character.name} left the party`);
  }

  onMoveUp(characterId: string): void {
    const state = this.gameState();
    const newState = PartyService.moveCharacterUp(state, characterId);
    this.gameStateService.updateState(newState);
  }

  onMoveDown(characterId: string): void {
    const state = this.gameState();
    const newState = PartyService.moveCharacterDown(state, characterId);
    this.gameStateService.updateState(newState);
  }

  onInspect(characterId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: { characterId, returnTo: 'tavern' }
    });
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    SceneNavigationService.transitionTo(SceneType.CASTLE_MENU);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(null), 3000);
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
```

**Step 2: Update TavernComponent HTML**

Replace `src/app/tavern/tavern.component.html`:

```html
<div class="tavern-container">
  <!-- Error/Success Messages -->
  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }
  @if (successMessage()) {
    <div class="success-message">{{ successMessage() }}</div>
  }

  <!-- Left Column: Available Characters -->
  <div class="available-characters">
    <h2>Available Characters</h2>
    @if (availableCharacters().length === 0) {
      <div class="empty-state">No characters available to join the party</div>
    } @else {
      <div class="character-grid">
        @for (character of availableCharacters(); track character.id) {
          <app-character-card-wrapper
            [character]="character"
            [actions]="availableCharacterActions"
            (inspect)="onInspect(character.id)"
            (add)="onAddCharacter(character.id)"
          ></app-character-card-wrapper>
        }
      </div>
    }
  </div>

  <!-- Right Column: Party Members -->
  <div class="party-column">
    <div class="party-gold-header">
      Party Gold: {{ partyGold() }} GP
    </div>

    <!-- Front Row -->
    <div class="formation-section">
      <h3>Front Row</h3>
      @if (frontRowCharacters().length === 0) {
        <div class="empty-state">Front row is empty</div>
      } @else {
        @for (character of frontRowCharacters(); track character.id) {
          <app-character-card-wrapper
            [character]="character"
            [actions]="partyCharacterActions"
            [disabledActions]="getDisabledActionsForPartyMember(character.id)"
            (inspect)="onInspect(character.id)"
            (remove)="onRemoveCharacter(character.id)"
            (moveUp)="onMoveUp(character.id)"
            (moveDown)="onMoveDown(character.id)"
          ></app-character-card-wrapper>
        }
      }
    </div>

    <!-- Back Row -->
    <div class="formation-section">
      <h3>Back Row</h3>
      @if (backRowCharacters().length === 0) {
        <div class="empty-state">Back row is empty</div>
      } @else {
        @for (character of backRowCharacters(); track character.id) {
          <app-character-card-wrapper
            [character]="character"
            [actions]="partyCharacterActions"
            [disabledActions]="getDisabledActionsForPartyMember(character.id)"
            (inspect)="onInspect(character.id)"
            (remove)="onRemoveCharacter(character.id)"
            (moveUp)="onMoveUp(character.id)"
            (moveDown)="onMoveDown(character.id)"
          ></app-character-card-wrapper>
        }
      }
    </div>
  </div>
</div>
```

**Step 3: Update TavernComponent SCSS**

Replace `src/app/tavern/tavern.component.scss`:

```scss
@import '../../styles/variables';

.tavern-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  height: 100%;
  padding: var(--spacing-md);
}

.error-message {
  grid-column: 1 / -1;
  background: var(--color-error, #ff0000);
  color: var(--color-background);
  padding: var(--spacing-md);
  border: 2px solid var(--color-error, #ff0000);
  text-align: center;
  font-weight: bold;
}

.success-message {
  grid-column: 1 / -1;
  background: var(--color-primary);
  color: var(--color-background);
  padding: var(--spacing-md);
  border: 2px solid var(--color-primary);
  text-align: center;
  font-weight: bold;
}

.available-characters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);

  h2 {
    color: var(--color-primary);
    border-bottom: 1px solid var(--color-primary);
    padding-bottom: var(--spacing-sm);
    margin: 0;
  }

  .character-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    overflow-y: auto;
    max-height: calc(100vh - 250px);
    padding-right: var(--spacing-sm);
  }
}

.party-column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.party-gold-header {
  background: var(--color-background-dark, #1a1a1a);
  border: 1px solid var(--color-primary);
  padding: var(--spacing-md);
  text-align: center;
  font-size: 1.2rem;
  color: var(--color-primary);
  font-weight: bold;
}

.formation-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  h3 {
    color: var(--color-primary);
    border-bottom: 1px solid var(--color-primary);
    padding-bottom: var(--spacing-xs);
    margin: 0;
  }
}

.empty-state {
  color: var(--color-text-dim, #666);
  font-style: italic;
  padding: var(--spacing-md);
  text-align: center;
  border: 1px dashed var(--color-text-dim, #666);
}
```

**Step 4: Commit**

```bash
git add src/app/tavern/
git commit -m "refactor: redesign tavern with 2-column layout and direct actions"
```

---

## Task 9: Update ShopService to Use Party Gold (TDD)

**Files:**
- Modify: `src/services/ShopService.ts`
- Modify: `src/services/__tests__/ShopService.spec.ts`

**Step 1: Update ShopService tests to use party gold**

Open `src/services/__tests__/ShopService.spec.ts` and update tests that reference character.gold:

```typescript
// Update all tests to check party.gold instead of character.gold

describe('buyItem', () => {
  it('deducts gold from party when buying item', () => {
    const state = {
      ...createTestGameState(),
      party: {
        ...createTestGameState().party,
        gold: 500
      }
    };
    const item = { id: 'sword', name: 'Sword', cost: 100 };

    const newState = ShopService.buyItem(state, characterId, item);

    expect(newState.party.gold).toBe(400); // 500 - 100
  });

  it('returns error if party has insufficient gold', () => {
    const state = {
      ...createTestGameState(),
      party: {
        ...createTestGameState().party,
        gold: 50
      }
    };
    const item = { id: 'sword', name: 'Sword', cost: 100 };

    const result = ShopService.buyItem(state, characterId, item);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient party gold');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- ShopService
```

Expected: Tests FAIL (using character.gold instead of party.gold).

**Step 3: Update ShopService implementation**

Open `src/services/ShopService.ts` and replace all `character.gold` references with party gold operations:

```typescript
import * as PartyService from './PartyService';

export function buyItem(state: GameState, characterId: string, item: Item): BuyResult {
  const character = state.roster.get(characterId);
  if (!character) {
    return { success: false, error: 'Character not found' };
  }

  // Check party gold instead of character gold
  if (!PartyService.hasEnoughGold(state, item.cost)) {
    return { success: false, error: 'Insufficient party gold' };
  }

  // Deduct from party gold
  let newState = PartyService.removePartyGold(state, item.cost);

  // Add item to character inventory
  const updatedCharacter = {
    ...character,
    inventory: [...character.inventory, item]
  };

  newState = {
    ...newState,
    roster: new Map(newState.roster).set(characterId, updatedCharacter)
  };

  return { success: true, state: newState };
}

export function sellItem(state: GameState, characterId: string, item: Item): SellResult {
  // Similar updates for selling - add gold to party
  let newState = PartyService.addPartyGold(state, item.sellValue);

  // Remove item from character inventory
  // ... rest of implementation

  return { success: true, state: newState };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- ShopService
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/services/ShopService.ts src/services/__tests__/ShopService.spec.ts
git commit -m "refactor: update ShopService to use party gold"
```

---

## Task 10: Update TempleService to Use Party Gold (TDD)

**Files:**
- Modify: `src/services/TempleService.ts`
- Modify: `src/services/__tests__/TempleService.spec.ts`

**Step 1: Update TempleService tests**

Similar to ShopService, update all tests to use party gold:

```typescript
describe('healCharacter', () => {
  it('deducts healing cost from party gold', () => {
    const state = {
      ...createTestGameState(),
      party: {
        ...createTestGameState().party,
        gold: 200
      }
    };
    const healingCost = 50;

    const newState = TempleService.healCharacter(state, characterId);

    expect(newState.party.gold).toBe(150);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- TempleService
```

**Step 3: Update TempleService implementation**

Replace character gold checks with PartyService calls:

```typescript
import * as PartyService from './PartyService';

export function healCharacter(state: GameState, characterId: string): HealResult {
  const cost = calculateHealingCost(character);

  if (!PartyService.hasEnoughGold(state, cost)) {
    return { success: false, error: 'Insufficient party gold' };
  }

  let newState = PartyService.removePartyGold(state, cost);
  // ... rest of healing logic

  return { success: true, state: newState };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- TempleService
```

**Step 5: Commit**

```bash
git add src/services/TempleService.ts src/services/__tests__/TempleService.spec.ts
git commit -m "refactor: update TempleService to use party gold"
```

---

## Task 11: Update InnService to Use Party Gold (TDD)

**Files:**
- Modify: `src/services/InnService.ts`
- Modify: `src/services/__tests__/InnService.spec.ts`

**Step 1: Update InnService tests**

```typescript
describe('restAtInn', () => {
  it('deducts room cost from party gold', () => {
    const state = {
      ...createTestGameState(),
      party: {
        ...createTestGameState().party,
        gold: 500
      }
    };
    const roomType = 'STABLES'; // cost: 1 GP

    const newState = InnService.restAtInn(state, roomType);

    expect(newState.party.gold).toBe(499);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- InnService
```

**Step 3: Update InnService implementation**

```typescript
import * as PartyService from './PartyService';

export function restAtInn(state: GameState, roomType: RoomType): RestResult {
  const cost = getRoomCost(roomType);

  if (!PartyService.hasEnoughGold(state, cost)) {
    return { success: false, error: 'Insufficient party gold' };
  }

  let newState = PartyService.removePartyGold(state, cost);
  // ... rest of resting logic

  return { success: true, state: newState };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- InnService
```

**Step 5: Commit**

```bash
git add src/services/InnService.ts src/services/__tests__/InnService.spec.ts
git commit -m "refactor: update InnService to use party gold"
```

---

## Task 12: Write TavernComponent Tests

**Files:**
- Create: `src/app/tavern/__tests__/tavern.component.spec.ts`

**Step 1: Write comprehensive component tests**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TavernComponent } from '../tavern.component';
import { GameStateService } from '../../../services/GameStateService';
import { Router } from '@angular/router';
import { createTestGameState, createTestCharacter } from '../../../test-helpers/test-factories';
import * as PartyService from '../../../services/PartyService';

describe('TavernComponent', () => {
  let component: TavernComponent;
  let fixture: ComponentFixture<TavernComponent>;
  let gameStateService: GameStateService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernComponent],
      providers: [GameStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(TavernComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('availableCharacters', () => {
    it('returns characters not in party with OKAY or GOOD status', () => {
      const char1 = createTestCharacter({ id: 'c1', status: 'OKAY' });
      const char2 = createTestCharacter({ id: 'c2', status: 'GOOD' });
      const char3 = createTestCharacter({ id: 'c3', status: 'DEAD' });

      const state = {
        ...createTestGameState(),
        roster: new Map([
          ['c1', char1],
          ['c2', char2],
          ['c3', char3]
        ]),
        party: {
          ...createTestGameState().party,
          members: []
        }
      };

      gameStateService.updateState(state);
      fixture.detectChanges();

      expect(component.availableCharacters().length).toBe(2);
      expect(component.availableCharacters()).toContain(char1);
      expect(component.availableCharacters()).toContain(char2);
    });
  });

  describe('onAddCharacter', () => {
    it('adds character to party when valid', () => {
      const char = createTestCharacter({ id: 'c1', alignment: 'GOOD' });
      const state = {
        ...createTestGameState(),
        roster: new Map([['c1', char]]),
        party: {
          ...createTestGameState().party,
          members: []
        }
      };

      gameStateService.updateState(state);
      fixture.detectChanges();

      component.onAddCharacter('c1');

      expect(gameStateService.state().party.members).toContain('c1');
    });

    it('shows error when party is full', () => {
      const state = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']
        }
      };

      gameStateService.updateState(state);
      fixture.detectChanges();

      component.onAddCharacter('c7');

      expect(component.errorMessage()).toBe('Party is full (maximum 6 members)');
    });
  });

  describe('onRemoveCharacter', () => {
    it('removes character from party', () => {
      const char = createTestCharacter({ id: 'c1' });
      const state = {
        ...createTestGameState(),
        roster: new Map([['c1', char]]),
        party: {
          ...createTestGameState().party,
          members: ['c1'],
          formation: {
            frontRow: ['c1'],
            backRow: []
          }
        }
      };

      gameStateService.updateState(state);
      fixture.detectChanges();

      component.onRemoveCharacter('c1');

      expect(gameStateService.state().party.members).not.toContain('c1');
    });
  });

  describe('ESC key handling', () => {
    it('navigates to castle menu on ESC key', () => {
      const navigateSpy = jest.spyOn(router, 'navigate');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);

      expect(navigateSpy).toHaveBeenCalledWith(['/castle-menu']);
    });
  });

  describe('party gold display', () => {
    it('displays current party gold', () => {
      const state = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 1250
        }
      };

      gameStateService.updateState(state);
      fixture.detectChanges();

      const goldHeader = fixture.nativeElement.querySelector('.party-gold-header');
      expect(goldHeader.textContent).toContain('1250');
    });
  });
});
```

**Step 2: Run tests**

```bash
npm test -- tavern.component
```

Expected: All tests PASS.

**Step 3: Commit**

```bash
git add src/app/tavern/__tests__/
git commit -m "test: add comprehensive TavernComponent tests"
```

---

## Task 13: Integration Tests - Complete Tavern Workflow

**Files:**
- Create: `src/app/tavern/__tests__/tavern.integration.spec.ts`

**Step 1: Write integration test**

```typescript
import { TestBed } from '@angular/core/testing';
import { TavernComponent } from '../tavern.component';
import { GameStateService } from '../../../services/GameStateService';
import { createTestGameState, createTestCharacter } from '../../../test-helpers/test-factories';

describe('TavernComponent - Integration Tests', () => {
  it('complete workflow: add 6 characters, rearrange formation, remove 2', () => {
    TestBed.configureTestingModule({
      imports: [TavernComponent],
      providers: [GameStateService]
    });

    const fixture = TestBed.createComponent(TavernComponent);
    const component = fixture.componentInstance;
    const gameStateService = TestBed.inject(GameStateService);

    // Setup: 6 characters in roster
    const chars = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({ id: `c${i + 1}`, name: `Hero ${i + 1}`, alignment: 'GOOD' })
    );
    const state = {
      ...createTestGameState(),
      roster: new Map(chars.map(c => [c.id, c])),
      party: {
        ...createTestGameState().party,
        members: []
      }
    };
    gameStateService.updateState(state);
    fixture.detectChanges();

    // Add all 6 characters
    chars.forEach(char => component.onAddCharacter(char.id));
    expect(gameStateService.state().party.members.length).toBe(6);
    expect(gameStateService.state().party.formation.frontRow.length).toBe(3);
    expect(gameStateService.state().party.formation.backRow.length).toBe(3);

    // Move character 2 down (swap with character 3)
    component.onMoveDown('c2');
    expect(gameStateService.state().party.members[1]).toBe('c3');
    expect(gameStateService.state().party.members[2]).toBe('c2');

    // Remove 2 characters
    component.onRemoveCharacter('c1');
    component.onRemoveCharacter('c6');
    expect(gameStateService.state().party.members.length).toBe(4);
    expect(gameStateService.state().party.formation.frontRow.length).toBe(3);
    expect(gameStateService.state().party.formation.backRow.length).toBe(1);
  });
});
```

**Step 2: Run integration test**

```bash
npm test -- tavern.integration
```

**Step 3: Commit**

```bash
git add src/app/tavern/__tests__/tavern.integration.spec.ts
git commit -m "test: add tavern integration tests for complete workflows"
```

---

## Task 14: Run Full Test Suite and Verify Coverage

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS in <5 seconds.

**Step 2: Run tests with coverage**

```bash
npm test -- --coverage
```

Expected: Overall coverage >89%, new components/services at 90-100%.

**Step 3: Verify no regressions**

Check that existing components (ShopComponent, TempleComponent, InnComponent) still work with party gold.

**Step 4: Commit if all pass**

```bash
git commit -m "test: verify all tests pass with party gold system"
```

---

## Task 15: Update Documentation

**Files:**
- Create: `docs/plans/2025-11-03-tavern-redesign-design.md`
- Modify: `docs/ui/scenes/03-gilgameshs-tavern.md`
- Modify: `docs/services/PartyService.md`

**Step 1: Create design document**

Document the design decisions made during brainstorming.

**Step 2: Update tavern scene documentation**

Update the UI scene doc with new 2-column layout, screenshots/ASCII mockups.

**Step 3: Update PartyService documentation**

Add gold management and formation movement functions to the service documentation.

**Step 4: Commit documentation**

```bash
git add docs/
git commit -m "docs: update tavern redesign and PartyService documentation"
```

---

## Task 16: Final Verification and Cleanup

**Step 1: Manual testing**

Start the dev server and manually test:
- Adding characters to party
- Removing characters from party
- Moving characters up/down
- ESC key navigation
- Error messages display correctly
- Party gold updates correctly

**Step 2: Code review**

Review all changes for:
- DRY violations
- YAGNI violations
- Unused imports
- Console.log statements
- TODO comments

**Step 3: Final commit**

```bash
git add .
git commit -m "chore: final cleanup and verification for tavern redesign"
```

---

## Success Criteria Checklist

- [ ] 2-column layout implemented with responsive grid
- [ ] Party gold system fully functional (character.gold removed)
- [ ] Formation management with move up/down buttons
- [ ] Direct-action pattern (click = immediate action)
- [ ] ESC key returns to castle menu
- [ ] All tests pass in <5 seconds
- [ ] Code coverage >89%
- [ ] No console errors or warnings
- [ ] Documentation updated
- [ ] Clean, DRY, SOLID code

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2025-11-03-tavern-redesign.md`.**

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

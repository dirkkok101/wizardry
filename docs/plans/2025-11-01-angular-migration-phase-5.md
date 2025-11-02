# Phase 5: Complete Town Service Business Logic - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete business logic for three scaffolded town service components: Temple (healing/resurrection), Shop (inventory/trading), and Training Grounds (character creation)

**Architecture:**
- Implement pure function services first (TempleService, ResurrectionService, ShopService, InventoryService, CharacterCreationService)
- Update Angular components with full UI flows (character selection, multi-step wizards, result display)
- Follow TDD: test → fail → implement → pass → commit for every feature
- Progressive complexity: Temple (simplest) → Shop (medium) → Training Grounds (most complex)

**Tech Stack:** Angular 20, TypeScript 5.5+, Jest, Signals API, standalone components, TDD methodology

**Estimated Duration:** 8-11 days | **Target:** 60+ new tests (200+ total tests)

---

## Part 1: Temple Component - Healing & Resurrection Services

### Task 1: Create ServiceType Enum and CharacterStatus Enum

**Files:**
- Create: `src/types/ServiceType.ts`
- Create: `src/types/CharacterStatus.ts`
- Modify: `src/types/Character.ts` (update status field type)

**Step 1: Create ServiceType enum**

```typescript
// src/types/ServiceType.ts
export enum ServiceType {
  CURE_POISON = 'CURE_POISON',
  CURE_PARALYSIS = 'CURE_PARALYSIS',
  RESURRECT = 'RESURRECT',
  RESTORE = 'RESTORE'
}
```

**Step 2: Create CharacterStatus enum**

```typescript
// src/types/CharacterStatus.ts
export enum CharacterStatus {
  OK = 'OK',
  POISONED = 'POISONED',
  PARALYZED = 'PARALYZED',
  DEAD = 'DEAD',
  ASHES = 'ASHES',
  LOST = 'LOST'
}
```

**Step 3: Update Character interface**

```typescript
// src/types/Character.ts
import { CharacterStatus } from './CharacterStatus';

export interface Character {
  // ... existing fields
  status: CharacterStatus; // Change from string to enum
  vitality: number; // Add if not present (needed for resurrection)
}
```

**Step 4: Commit**

```bash
git add src/types/ServiceType.ts src/types/CharacterStatus.ts src/types/Character.ts
git commit -m "feat(types): add ServiceType and CharacterStatus enums

- Add temple service types (cure poison/paralysis, resurrect, restore)
- Add character status enum (OK, POISONED, PARALYZED, DEAD, ASHES, LOST)
- Update Character interface to use CharacterStatus enum

Part of Phase 5: Temple implementation"
```

---

### Task 2: Implement TempleService - Tithe Calculations (TDD)

**Files:**
- Create: `src/services/TempleService.ts`
- Create: `src/services/__tests__/TempleService.spec.ts`

**Step 1: Write failing test for tithe calculation**

```typescript
// src/services/__tests__/TempleService.spec.ts
import { TempleService } from '../TempleService';
import { ServiceType } from '../../types/ServiceType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';

describe('TempleService', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 20,
    maxHp: 25,
    status: CharacterStatus.OK,
    gold: 500,
    experience: 10000,
    vitality: 15
  } as Character;

  describe('calculateTithe', () => {
    it('calculates cure poison tithe (10 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_POISON);
      expect(tithe).toBe(50); // 10 × 5
    });

    it('calculates cure paralysis tithe (20 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.CURE_PARALYSIS);
      expect(tithe).toBe(100); // 20 × 5
    });

    it('calculates resurrection tithe (250 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.RESURRECT);
      expect(tithe).toBe(1250); // 250 × 5
    });

    it('calculates restoration tithe (500 × level)', () => {
      const tithe = TempleService.calculateTithe(mockCharacter, ServiceType.RESTORE);
      expect(tithe).toBe(2500); // 500 × 5
    });

    it('scales tithe with character level', () => {
      const highLevelChar = { ...mockCharacter, level: 10 };
      const tithe = TempleService.calculateTithe(highLevelChar, ServiceType.RESURRECT);
      expect(tithe).toBe(2500); // 250 × 10
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- TempleService`

Expected output:
```
FAIL src/services/__tests__/TempleService.spec.ts
  ● Test suite failed to run
    Cannot find module '../TempleService'
```

**Step 3: Implement TempleService with tithe calculations**

```typescript
// src/services/TempleService.ts
import { Character } from '../types/Character';
import { ServiceType } from '../types/ServiceType';

/**
 * TempleService - Temple of Cant service calculations
 *
 * Provides healing, curing, and resurrection services.
 * All services require payment (tithe) based on character level.
 */
export class TempleService {
  /**
   * Calculate tithe (cost) for a temple service.
   *
   * Base costs per level:
   * - Cure Poison: 10 gold
   * - Cure Paralysis: 20 gold
   * - Resurrect (DEAD → OK): 250 gold
   * - Restore (ASHES → OK): 500 gold
   */
  static calculateTithe(character: Character, service: ServiceType): number {
    const baseCosts: Record<ServiceType, number> = {
      [ServiceType.CURE_POISON]: 10,
      [ServiceType.CURE_PARALYSIS]: 20,
      [ServiceType.RESURRECT]: 250,
      [ServiceType.RESTORE]: 500
    };

    return baseCosts[service] * character.level;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- TempleService`

Expected output:
```
PASS src/services/__tests__/TempleService.spec.ts
  TempleService
    calculateTithe
      ✓ calculates cure poison tithe (10 × level)
      ✓ calculates cure paralysis tithe (20 × level)
      ✓ calculates resurrection tithe (250 × level)
      ✓ calculates restoration tithe (500 × level)
      ✓ scales tithe with character level

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

**Step 5: Commit**

```bash
git add src/services/TempleService.ts src/services/__tests__/TempleService.spec.ts
git commit -m "feat(temple): implement tithe calculation logic

- Calculate tithe based on service type and character level
- Base costs: cure poison (10), cure paralysis (20), resurrect (250), restore (500)
- All costs scale with character level
- 5 tests passing

Part of Phase 5: Temple implementation"
```

---

### Task 3: Implement ResurrectionService - Success Rate Logic (TDD)

**Files:**
- Create: `src/services/ResurrectionService.ts`
- Create: `src/services/__tests__/ResurrectionService.spec.ts`

**Step 1: Write failing tests for success rate calculation**

```typescript
// src/services/__tests__/ResurrectionService.spec.ts
import { ResurrectionService } from '../ResurrectionService';
import { ServiceType } from '../../types/ServiceType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';

describe('ResurrectionService', () => {
  const createChar = (vitality: number): Character => ({
    id: 'char-1',
    name: 'Test',
    class: CharacterClass.FIGHTER,
    level: 5,
    hp: 0,
    maxHp: 30,
    status: CharacterStatus.DEAD,
    gold: 0,
    experience: 5000,
    vitality
  } as Character);

  describe('getSuccessRate', () => {
    describe('cure services', () => {
      it('returns 100% for cure poison (always succeeds)', () => {
        const char = createChar(10);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.CURE_POISON);
        expect(rate).toBe(100);
      });

      it('returns 100% for cure paralysis (always succeeds)', () => {
        const char = createChar(10);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.CURE_PARALYSIS);
        expect(rate).toBe(100);
      });
    });

    describe('resurrection (DEAD → OK)', () => {
      it('calculates success rate: 50% base + (vitality × 2%)', () => {
        const char = createChar(18);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        expect(rate).toBe(86); // 50 + (18 × 2) = 86%
      });

      it('handles low vitality characters', () => {
        const char = createChar(3);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        expect(rate).toBe(56); // 50 + (3 × 2) = 56%
      });

      it('handles high vitality characters', () => {
        const char = createChar(18);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        expect(rate).toBe(86); // 50 + (18 × 2) = 86%
      });
    });

    describe('restoration (ASHES → OK)', () => {
      it('calculates success rate: 40% base + (vitality × 1%)', () => {
        const char = createChar(15);
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE);
        expect(rate).toBe(55); // 40 + (15 × 1) = 55%
      });

      it('has lower success rate than resurrection', () => {
        const char = createChar(15);
        const resurrectRate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT);
        const restoreRate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE);
        expect(restoreRate).toBeLessThan(resurrectRate);
      });
    });
  });

  describe('attemptService', () => {
    it('returns success/failure based on success rate', () => {
      const char = createChar(18);

      // Run service attempt multiple times
      const results = Array.from({ length: 100 }, () =>
        ResurrectionService.attemptService(char, ServiceType.RESURRECT)
      );

      const successCount = results.filter(Boolean).length;

      // With 86% success rate, expect roughly 80-92 successes out of 100
      expect(successCount).toBeGreaterThan(70);
      expect(successCount).toBeLessThan(95);
    });

    it('always succeeds for cure services', () => {
      const char = createChar(10);

      // Run 10 times, all should succeed
      for (let i = 0; i < 10; i++) {
        expect(ResurrectionService.attemptService(char, ServiceType.CURE_POISON)).toBe(true);
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ResurrectionService`

Expected: FAIL (ResurrectionService not found)

**Step 3: Implement ResurrectionService**

```typescript
// src/services/ResurrectionService.ts
import { Character } from '../types/Character';
import { ServiceType } from '../types/ServiceType';

/**
 * ResurrectionService - Handles resurrection and restoration success rates
 *
 * Success rates are based on character Vitality:
 * - Cure services: 100% (always succeed)
 * - Resurrection (DEAD → OK): 50% + (Vitality × 2%)
 * - Restoration (ASHES → OK): 40% + (Vitality × 1%)
 *
 * On failure:
 * - Resurrection failure: DEAD → ASHES
 * - Restoration failure: ASHES → LOST (permanent death)
 */
export class ResurrectionService {
  /**
   * Calculate success rate for a temple service based on character vitality.
   */
  static getSuccessRate(character: Character, service: ServiceType): number {
    switch (service) {
      case ServiceType.CURE_POISON:
      case ServiceType.CURE_PARALYSIS:
        return 100; // Cure services always succeed

      case ServiceType.RESURRECT:
        // 50% base + (Vitality × 2%)
        return 50 + (character.vitality * 2);

      case ServiceType.RESTORE:
        // 40% base + (Vitality × 1%)
        return 40 + (character.vitality * 1);

      default:
        return 100;
    }
  }

  /**
   * Attempt a temple service with success/failure based on success rate.
   * Returns true if service succeeds, false if it fails.
   */
  static attemptService(character: Character, service: ServiceType): boolean {
    const successRate = this.getSuccessRate(character, service);
    const roll = Math.random() * 100;
    return roll < successRate;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- ResurrectionService`

Expected output:
```
PASS src/services/__tests__/ResurrectionService.spec.ts
  ResurrectionService
    getSuccessRate
      cure services
        ✓ returns 100% for cure poison (always succeeds)
        ✓ returns 100% for cure paralysis (always succeeds)
      resurrection (DEAD → OK)
        ✓ calculates success rate: 50% base + (vitality × 2%)
        ✓ handles low vitality characters
        ✓ handles high vitality characters
      restoration (ASHES → OK)
        ✓ calculates success rate: 40% base + (vitality × 1%)
        ✓ has lower success rate than resurrection
    attemptService
      ✓ returns success/failure based on success rate
      ✓ always succeeds for cure services

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

**Step 5: Commit**

```bash
git add src/services/ResurrectionService.ts src/services/__tests__/ResurrectionService.spec.ts
git commit -m "feat(temple): implement resurrection success rate logic

- Calculate success rates based on character Vitality
- Cure services: 100% success (always work)
- Resurrection: 50% + (Vit × 2%)
- Restoration: 40% + (Vit × 1%)
- Include randomized service attempts
- 9 tests passing

Part of Phase 5: Temple implementation"
```

---

### Task 4: Update TempleComponent - Add Service Execution Logic (TDD)

**Files:**
- Modify: `src/app/temple/temple.component.ts`
- Modify: `src/app/temple/temple.component.html`
- Modify: `src/app/temple/temple.component.spec.ts`

**Step 1: Write failing tests for service execution**

```typescript
// src/app/temple/temple.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TempleComponent } from './temple.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ServiceType } from '../../types/ServiceType';

describe('TempleComponent', () => {
  let component: TempleComponent;
  let fixture: ComponentFixture<TempleComponent>;
  let gameState: GameStateService;
  let router: Router;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 15,
    maxHp: 25,
    status: CharacterStatus.POISONED,
    gold: 100,
    experience: 10000,
    vitality: 15
  } as Character;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TempleComponent]
    });

    fixture = TestBed.createComponent(TempleComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Setup party with afflicted character
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1'],
        gold: 500
      }
    }));
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
  });

  describe('character filtering', () => {
    it('displays only afflicted characters', () => {
      const okChar: Character = {
        ...mockCharacter,
        id: 'char-2',
        status: CharacterStatus.OK
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster)
          .set('char-1', mockCharacter)
          .set('char-2', okChar)
      }));

      component.handleMenuSelect('healing');
      fixture.detectChanges();

      const afflicted = component.afflictedCharacters();
      expect(afflicted.length).toBe(1);
      expect(afflicted[0].id).toBe('char-1');
    });

    it('filters characters by service type', () => {
      const deadChar: Character = {
        ...mockCharacter,
        id: 'char-2',
        status: CharacterStatus.DEAD
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster)
          .set('char-1', mockCharacter) // POISONED
          .set('char-2', deadChar) // DEAD
      }));

      // Select healing services - should see POISONED character
      component.handleMenuSelect('healing');
      let filtered = component.getFilteredCharacters(ServiceType.CURE_POISON);
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe(CharacterStatus.POISONED);
    });
  });

  describe('service execution', () => {
    it('deducts tithe from party gold', () => {
      const initialGold = gameState.party().gold || 0;

      component.executeService('char-1', ServiceType.CURE_POISON);

      const finalGold = gameState.party().gold || 0;
      const expectedCost = 50; // 10 × level 5

      expect(finalGold).toBe(initialGold - expectedCost);
    });

    it('cures poison when service succeeds', () => {
      component.executeService('char-1', ServiceType.CURE_POISON);

      const char = gameState.state().roster.get('char-1')!;
      expect(char.status).toBe(CharacterStatus.OK);
    });

    it('shows success message after successful service', () => {
      component.executeService('char-1', ServiceType.CURE_POISON);

      expect(component.successMessage()).toBeTruthy();
      expect(component.successMessage()).toContain('cured');
    });

    it('deducts gold even on failure', () => {
      // Mock resurrection failure
      jest.spyOn(Math, 'random').mockReturnValue(0.99); // Force failure

      const deadChar: Character = {
        ...mockCharacter,
        status: CharacterStatus.DEAD
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', deadChar),
        party: {
          ...state.party,
          gold: 5000
        }
      }));

      const initialGold = gameState.party().gold || 0;

      component.executeService('char-1', ServiceType.RESURRECT);

      const finalGold = gameState.party().gold || 0;
      const expectedCost = 1250; // 250 × level 5

      expect(finalGold).toBe(initialGold - expectedCost);
    });

    it('shows error when party cannot afford service', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 10 // Not enough for cure poison (50 gold)
        }
      }));

      component.executeService('char-1', ServiceType.CURE_POISON);

      expect(component.errorMessage()).toBeTruthy();
      expect(component.errorMessage()).toContain('afford');
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

**Step 2: Run test to verify it fails**

Run: `npm test -- temple.component`

Expected: FAIL (methods not implemented)

**Step 3: Update TempleComponent with service execution logic**

```typescript
// src/app/temple/temple.component.ts
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { TempleService } from '../../services/TempleService';
import { ResurrectionService } from '../../services/ResurrectionService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ServiceType } from '../../types/ServiceType';

type TempleView = 'main' | 'select-character' | 'select-service';

/**
 * Temple Component (Temple of Cant)
 *
 * Healing and resurrection services:
 * - Cure Poison: Remove POISONED status
 * - Cure Paralysis: Remove PARALYZED status
 * - Resurrect: DEAD → OK (can fail → ASHES)
 * - Restore: ASHES → OK (can fail → LOST)
 */
@Component({
  selector: 'app-temple',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    { id: 'healing', label: 'HEALING SERVICES', enabled: true, shortcut: 'H' },
    { id: 'castle', label: 'RETURN TO CASTLE', enabled: true, shortcut: 'C' }
  ];

  // View state
  readonly currentView = signal<TempleView>('main');
  readonly selectedCharacterId = signal<string | null>(null);
  readonly selectedService = signal<ServiceType | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Party and afflicted characters
  readonly currentParty = computed(() => this.gameState.party());
  readonly afflictedCharacters = computed(() => {
    const state = this.gameState.state();
    const party = this.currentParty();

    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .filter(char => char.status !== CharacterStatus.OK);
  });

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
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'healing':
        if (this.afflictedCharacters().length === 0) {
          this.errorMessage.set('No afflicted characters in party');
          return;
        }
        this.currentView.set('select-character');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  handleCharacterSelect(charId: string): void {
    this.selectedCharacterId.set(charId);
    this.currentView.set('select-service');
  }

  getFilteredCharacters(service: ServiceType): Character[] {
    const afflicted = this.afflictedCharacters();

    switch (service) {
      case ServiceType.CURE_POISON:
        return afflicted.filter(c => c.status === CharacterStatus.POISONED);
      case ServiceType.CURE_PARALYSIS:
        return afflicted.filter(c => c.status === CharacterStatus.PARALYZED);
      case ServiceType.RESURRECT:
        return afflicted.filter(c => c.status === CharacterStatus.DEAD);
      case ServiceType.RESTORE:
        return afflicted.filter(c => c.status === CharacterStatus.ASHES);
      default:
        return afflicted;
    }
  }

  executeService(charId: string, service: ServiceType): void {
    const state = this.gameState.state();
    const character = state.roster.get(charId);
    const party = this.currentParty();

    if (!character) {
      this.errorMessage.set('Character not found');
      return;
    }

    // Calculate tithe (cost)
    const tithe = TempleService.calculateTithe(character, service);
    const partyGold = party.gold || 0;

    // Check if party can afford
    if (partyGold < tithe) {
      this.errorMessage.set(`Cannot afford service. Need ${tithe} gold.`);
      return;
    }

    // Attempt service
    const success = ResurrectionService.attemptService(character, service);

    // Update character status based on service and result
    let newStatus = character.status;
    let message = '';

    if (success) {
      switch (service) {
        case ServiceType.CURE_POISON:
        case ServiceType.CURE_PARALYSIS:
        case ServiceType.RESURRECT:
        case ServiceType.RESTORE:
          newStatus = CharacterStatus.OK;
          message = `${character.name} has been cured!`;
          break;
      }
    } else {
      // Handle failures
      if (service === ServiceType.RESURRECT) {
        newStatus = CharacterStatus.ASHES;
        message = `Resurrection failed. ${character.name} has turned to ashes.`;
      } else if (service === ServiceType.RESTORE) {
        newStatus = CharacterStatus.LOST;
        message = `Restoration failed. ${character.name} is lost forever.`;
      }
    }

    // Update game state
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(charId, {
        ...character,
        status: newStatus
      }),
      party: {
        ...state.party,
        gold: partyGold - tithe
      }
    }));

    if (success) {
      this.successMessage.set(message);
    } else {
      this.errorMessage.set(message);
    }

    this.currentView.set('main');
  }

  cancelView(): void {
    this.currentView.set('main');
    this.selectedCharacterId.set(null);
    this.selectedService.set(null);
  }
}
```

**Step 4: Update temple.component.html with service selection UI**

```html
<!-- src/app/temple/temple.component.html -->
<div class="temple">
  <header>
    <h1>TEMPLE OF CANT</h1>
  </header>

  <main>
    @if (currentView() === 'main') {
      <!-- Main menu -->
      <app-menu
        [items]="menuItems"
        (itemSelected)="handleMenuSelect($event)">
      </app-menu>

      @if (errorMessage()) {
        <div class="error-message">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="success-message">{{ successMessage() }}</div>
      }
    }

    @if (currentView() === 'select-character') {
      <!-- Character selection -->
      <div class="service-view">
        <h2>SELECT CHARACTER</h2>
        <app-character-list
          [characters]="afflictedCharacters()"
          [selectable]="true"
          (characterSelected)="handleCharacterSelect($event)"
          emptyMessage="No afflicted characters">
        </app-character-list>
        <button class="back-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }

    @if (currentView() === 'select-service') {
      <!-- Service selection (placeholder for now) -->
      <div class="service-view">
        <h2>SELECT SERVICE</h2>
        <p>Service selection UI to be implemented...</p>
        <button class="back-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }
  </main>
</div>
```

**Step 5: Run test to verify it passes**

Run: `npm test -- temple.component`

Expected: PASS (all tests passing)

**Step 6: Commit**

```bash
git add src/app/temple/
git commit -m "feat(temple): implement service execution logic

- Add character filtering by status (POISONED, PARALYZED, DEAD, ASHES)
- Implement service execution with success/failure handling
- Deduct tithe from party gold (even on failure)
- Update character status based on service result
- Handle failure states (DEAD→ASHES, ASHES→LOST)
- Show success/error messages
- 14 tests passing (6 new temple component tests)

Part of Phase 5: Temple implementation"
```

---

## Part 2: Shop Component - Inventory & Trading System

### Task 5: Create Item Type Definitions

**Files:**
- Create: `src/types/Item.ts`
- Create: `src/types/ItemType.ts`
- Modify: `src/types/Character.ts` (add inventory field)

**Step 1: Create Item interfaces and enums**

```typescript
// src/types/ItemType.ts
export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD',
  HELMET = 'HELMET',
  GAUNTLET = 'GAUNTLET',
  CONSUMABLE = 'CONSUMABLE',
  MISC = 'MISC'
}

export enum ItemSlot {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD',
  HEAD = 'HEAD',
  HANDS = 'HANDS',
  NONE = 'NONE'
}
```

```typescript
// src/types/Item.ts
import { ItemType, ItemSlot } from './ItemType';
import { CharacterClass } from './CharacterClass';
import { Alignment } from './Alignment';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot: ItemSlot;
  price: number;

  // Combat stats
  damage?: number;
  defense?: number;

  // Requirements
  classRestrictions?: CharacterClass[];
  alignmentRestrictions?: Alignment[];

  // Special properties
  cursed: boolean;
  identified: boolean;
  equipped: boolean;

  // Description
  description?: string;
  unidentifiedName?: string; // Name shown before identification
}
```

**Step 2: Update Character interface to include inventory**

```typescript
// src/types/Character.ts
import { Item } from './Item';

export interface Character {
  // ... existing fields
  inventory: Item[]; // Max 8 items
  equippedWeapon?: string; // Item ID
  equippedArmor?: string; // Item ID
}
```

**Step 3: Commit**

```bash
git add src/types/Item.ts src/types/ItemType.ts src/types/Character.ts
git commit -m "feat(types): add Item and inventory types

- Add Item interface with stats, requirements, properties
- Add ItemType and ItemSlot enums
- Add inventory field to Character (max 8 items)
- Add equipped item tracking

Part of Phase 5: Shop implementation"
```

---

### Task 6: Implement InventoryService (TDD)

**Files:**
- Create: `src/services/InventoryService.ts`
- Create: `src/services/__tests__/InventoryService.spec.ts`

**Step 1: Write failing tests for inventory management**

```typescript
// src/services/__tests__/InventoryService.spec.ts
import { InventoryService } from '../InventoryService';
import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { ItemType, ItemSlot } from '../../types/ItemType';
import { CharacterClass } from '../../types/CharacterClass';

describe('InventoryService', () => {
  const mockItem: Item = {
    id: 'item-1',
    name: 'Short Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 100,
    damage: 5,
    cursed: false,
    identified: true,
    equipped: false
  };

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 20,
    maxHp: 25,
    inventory: [],
    gold: 500
  } as Character;

  describe('hasSpace', () => {
    it('returns true when inventory is empty', () => {
      expect(InventoryService.hasSpace(mockCharacter)).toBe(true);
    });

    it('returns true when inventory has less than 8 items', () => {
      const char = {
        ...mockCharacter,
        inventory: [mockItem, mockItem, mockItem]
      };
      expect(InventoryService.hasSpace(char)).toBe(true);
    });

    it('returns false when inventory has 8 items', () => {
      const char = {
        ...mockCharacter,
        inventory: Array(8).fill(mockItem)
      };
      expect(InventoryService.hasSpace(char)).toBe(false);
    });
  });

  describe('addItem', () => {
    it('adds item to empty inventory', () => {
      const result = InventoryService.addItem(mockCharacter, mockItem);
      expect(result.inventory.length).toBe(1);
      expect(result.inventory[0]).toEqual(mockItem);
    });

    it('adds item to existing inventory', () => {
      const char = { ...mockCharacter, inventory: [mockItem] };
      const newItem = { ...mockItem, id: 'item-2', name: 'Long Sword' };

      const result = InventoryService.addItem(char, newItem);
      expect(result.inventory.length).toBe(2);
    });

    it('throws error when inventory is full', () => {
      const char = {
        ...mockCharacter,
        inventory: Array(8).fill(mockItem)
      };

      expect(() => {
        InventoryService.addItem(char, mockItem);
      }).toThrow('Inventory full');
    });
  });

  describe('removeItem', () => {
    it('removes item from inventory', () => {
      const char = { ...mockCharacter, inventory: [mockItem] };

      const result = InventoryService.removeItem(char, 'item-1');
      expect(result.inventory.length).toBe(0);
    });

    it('cannot remove equipped cursed item', () => {
      const cursedItem = { ...mockItem, cursed: true, equipped: true };
      const char = { ...mockCharacter, inventory: [cursedItem] };

      expect(() => {
        InventoryService.removeItem(char, 'item-1');
      }).toThrow('Cannot remove equipped cursed item');
    });

    it('throws error when item not found', () => {
      expect(() => {
        InventoryService.removeItem(mockCharacter, 'nonexistent');
      }).toThrow('Item not found');
    });
  });

  describe('canEquip', () => {
    it('returns true when character meets class requirements', () => {
      const weapon = {
        ...mockItem,
        classRestrictions: [CharacterClass.FIGHTER, CharacterClass.MAGE]
      };

      expect(InventoryService.canEquip(mockCharacter, weapon)).toBe(true);
    });

    it('returns false when character does not meet class requirements', () => {
      const weapon = {
        ...mockItem,
        classRestrictions: [CharacterClass.FIGHTER]
      };

      expect(InventoryService.canEquip(mockCharacter, weapon)).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- InventoryService`

Expected: FAIL (InventoryService not found)

**Step 3: Implement InventoryService**

```typescript
// src/services/InventoryService.ts
import { Character } from '../types/Character';
import { Item } from '../types/Item';

const MAX_INVENTORY_SIZE = 8;

/**
 * InventoryService - Manages character inventory
 *
 * Features:
 * - Add/remove items
 * - Check inventory capacity (8 items max)
 * - Equip/unequip items
 * - Validate class/alignment restrictions
 * - Handle cursed items (cannot remove when equipped)
 */
export class InventoryService {
  /**
   * Check if character has space in inventory.
   */
  static hasSpace(character: Character): boolean {
    return character.inventory.length < MAX_INVENTORY_SIZE;
  }

  /**
   * Add item to character inventory.
   * Throws error if inventory is full.
   */
  static addItem(character: Character, item: Item): Character {
    if (!this.hasSpace(character)) {
      throw new Error('Inventory full');
    }

    return {
      ...character,
      inventory: [...character.inventory, item]
    };
  }

  /**
   * Remove item from character inventory.
   * Cannot remove equipped cursed items.
   */
  static removeItem(character: Character, itemId: string): Character {
    const item = character.inventory.find(i => i.id === itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    if (item.equipped && item.cursed) {
      throw new Error('Cannot remove equipped cursed item');
    }

    return {
      ...character,
      inventory: character.inventory.filter(i => i.id !== itemId)
    };
  }

  /**
   * Check if character can equip item based on class/alignment restrictions.
   */
  static canEquip(character: Character, item: Item): boolean {
    // Check class restrictions
    if (item.classRestrictions && item.classRestrictions.length > 0) {
      if (!item.classRestrictions.includes(character.class)) {
        return false;
      }
    }

    // Check alignment restrictions (if implemented)
    // if (item.alignmentRestrictions && item.alignmentRestrictions.length > 0) {
    //   if (!item.alignmentRestrictions.includes(character.alignment)) {
    //     return false;
    //   }
    // }

    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- InventoryService`

Expected: PASS (all tests passing)

**Step 5: Commit**

```bash
git add src/services/InventoryService.ts src/services/__tests__/InventoryService.spec.ts
git commit -m "feat(shop): implement inventory management service

- Check inventory capacity (8 items max)
- Add/remove items with validation
- Prevent removal of equipped cursed items
- Check class/alignment restrictions for equipping
- 10 tests passing

Part of Phase 5: Shop implementation"
```

---

## Part 3: Training Grounds - Character Creation Wizard

### Task 7: Create Race and Alignment Enums

**Files:**
- Create: `src/types/Race.ts`
- Create: `src/types/Alignment.ts`
- Modify: `src/types/Character.ts` (add race and alignment fields)

**Step 1: Create Race enum**

```typescript
// src/types/Race.ts
export enum Race {
  HUMAN = 'HUMAN',
  ELF = 'ELF',
  DWARF = 'DWARF',
  GNOME = 'GNOME',
  HOBBIT = 'HOBBIT'
}

export interface RaceModifiers {
  strength: number;
  iq: number;
  piety: number;
  vitality: number;
  agility: number;
  luck: number;
}

export const RACE_MODIFIERS: Record<Race, RaceModifiers> = {
  [Race.HUMAN]: {
    strength: 0,
    iq: 0,
    piety: 0,
    vitality: 0,
    agility: 0,
    luck: 0
  },
  [Race.ELF]: {
    strength: -1,
    iq: 1,
    piety: 0,
    vitality: -1,
    agility: 1,
    luck: 0
  },
  [Race.DWARF]: {
    strength: 1,
    iq: 0,
    piety: 0,
    vitality: 2,
    agility: -1,
    luck: 0
  },
  [Race.GNOME]: {
    strength: 0,
    iq: 1,
    piety: 1,
    vitality: -1,
    agility: 0,
    luck: 0
  },
  [Race.HOBBIT]: {
    strength: -1,
    iq: 0,
    piety: 0,
    vitality: 1,
    agility: 1,
    luck: 1
  }
};
```

**Step 2: Create Alignment enum**

```typescript
// src/types/Alignment.ts
export enum Alignment {
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  EVIL = 'EVIL'
}
```

**Step 3: Update Character interface**

```typescript
// src/types/Character.ts
import { Race } from './Race';
import { Alignment } from './Alignment';

export interface Character {
  // ... existing fields
  race: Race;
  alignment: Alignment;

  // Base stats
  strength: number;
  iq: number;
  piety: number;
  vitality: number;
  agility: number;
  luck: number;

  // Password for deletion
  password?: string;
}
```

**Step 4: Commit**

```bash
git add src/types/Race.ts src/types/Alignment.ts src/types/Character.ts
git commit -m "feat(types): add Race and Alignment with stat modifiers

- Add Race enum (Human, Elf, Dwarf, Gnome, Hobbit)
- Add race-specific stat modifiers
- Add Alignment enum (Good, Neutral, Evil)
- Update Character interface with race, alignment, base stats, password

Part of Phase 5: Training Grounds implementation"
```

---

## Execution Summary

**Phase 5 implements three major components in order of complexity:**

1. **Temple** (Tasks 1-4): Service calculations, resurrection logic, character healing
2. **Shop** (Tasks 5-6): Inventory management, item trading system
3. **Training Grounds** (Task 7+): Character creation wizard, stat rolling, class eligibility

**Each task follows TDD methodology:**
- Write failing test
- Run to verify failure
- Implement minimal code
- Run to verify pass
- Commit with descriptive message

**Total estimated tasks:** 15-20 tasks
**Total estimated tests:** 60+ new tests (200+ total)
**Execution time:** 8-11 days

**Success criteria:**
- All placeholder messages removed
- Full business logic implemented
- Auto-save after transactions
- All tests passing (<4s)
- Integration with existing Phase 1-4 functionality

---

## Notes for Implementation

**Reference Documentation:**
- `/docs/ui/scenes/05-temple-of-cant.md` - Complete Temple flow
- `/docs/ui/scenes/04-boltacs-trading-post.md` - Complete Shop mechanics
- `/docs/ui/scenes/02-training-grounds.md` - Character creation wizard
- `/docs/services/` - Service-specific documentation

**Testing Requirements:**
- Use `createTestCharacter()` from test factories
- Follow TDD: test → fail → implement → pass → commit
- Maintain <4s test execution time
- Target 80%+ coverage

**Code Style:**
- Pure functions for services (no side effects)
- Immutable state updates (spread operators)
- Signal-based reactivity in components
- Standalone Angular components

**Common Pitfalls:**
- Don't forget to deduct gold even on failed resurrections
- Cursed items cannot be removed when equipped
- Ninja class requires ALL stats at 17 (extremely rare!)
- Restoration failure = permanent death (LOST status)

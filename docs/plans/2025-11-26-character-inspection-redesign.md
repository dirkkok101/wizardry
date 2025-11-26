# Character Inspection Scene Redesign

**Date:** 2025-11-26
**Status:** Design Phase
**Author:** Claude

---

## Executive Summary

This document outlines a comprehensive redesign of the Character Inspection scene to:
1. Establish clear **party action vs character action** patterns
2. Align with existing component patterns (Maze, Temple, Tavern)
3. Support all three inspection modes (Training Grounds, Tavern, Camp/Maze)
4. Create reusable shared components for spell points and spell book display
5. Fix UX issues and improve consistency

---

## 1. Action Pattern: Party vs Character

### Guiding Principle

> **Party actions go in the footer menu. Character actions go on the character card.**

This pattern is already established in the Maze scene:
- **Footer**: Movement, Open Door, Inspect Tile (party-level navigation)
- **Character Card**: Inspect, Cast Spell, Move Up/Down (character-specific)

### Application to Character Inspection

| Action | Type | Location | Rationale |
|--------|------|----------|-----------|
| **Return/Leave** | Party | Footer | Navigation affects all |
| **Pool All Gold** | Party | Footer | Affects party pool |
| **Read Spell Book** | Character | Card | Shows individual's spells |
| **Equip/Unequip** | Character | Card (via ItemCard) | Individual equipment |
| **Trade** | Character | Card (via ItemCard) | Item moves between characters |
| **Drop** | Character | Card (via ItemCard) | Individual loses item |
| **Cast Spell** | Character | Card | Individual casts |
| **Use Item** | Character | Card | Individual uses |
| **Identify** | Character | Card | Bishop's ability |
| **Delete Character** | Character | Card (Training only) | Destroys individual |
| **Change Class** | Character | Card (Training only) | Changes individual |

### Mode-Specific Footer Menu

```typescript
// Party-level actions only in footer
readonly footerMenuItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [];

  // Pool gold available in Tavern and Camp modes
  if (this.mode() !== 'TRAINING_GROUNDS' && this.hasPartyGold()) {
    items.push({ id: 'pool-all', label: 'Pool All Gold', shortcut: 'P', enabled: true });
  }

  // Return always available
  items.push({ id: 'return', label: 'Return', shortcut: 'ESC', enabled: true });

  return items;
});
```

### Character Card Actions by Mode

```typescript
getActionsForCharacter(char: Character, mode: InspectionMode): CharacterAction[] {
  const actions: CharacterAction[] = [];

  // Common to all modes
  if (SpellLearningService.isCaster(char) && char.knownSpells.length > 0) {
    actions.push({ type: 'read-spells', label: 'Spells', enabled: true });
  }

  switch (mode) {
    case 'TRAINING_GROUNDS':
      // Training-specific: delete, class change
      actions.push({ type: 'change-class', label: 'Class', enabled: this.canChangeClass(char) });
      actions.push({ type: 'delete', label: 'Delete', enabled: true, variant: 'danger' });
      break;

    case 'TAVERN':
      // Inventory management only
      if (char.class === CharacterClass.BISHOP) {
        actions.push({ type: 'identify', label: 'ID', enabled: this.hasUnidentifiedItems(char) });
      }
      break;

    case 'CAMP':
      // Full access including spell casting and item use
      if (SpellLearningService.isCaster(char) && this.hasSpellPoints(char)) {
        actions.push({ type: 'cast-spell', label: 'Cast', enabled: true });
      }
      actions.push({ type: 'use-item', label: 'Use', enabled: this.hasUsableItems(char) });
      if (char.class === CharacterClass.BISHOP) {
        actions.push({ type: 'identify', label: 'ID', enabled: this.hasUnidentifiedItems(char) });
      }
      break;
  }

  return actions;
}
```

---

## 2. Scene Layout Design

### ASCII Mockup - Single Character View

```
┌─────────────────────────────────────────────────────────────────┐
│  GANDALF                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  HUMAN MAGE Lvl 5 • GOOD           [OK]                 │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  STR: 10   INT: 18   PIE: 12                            │    │
│  │  VIT: 11   AGI: 14   LUK: 13                            │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  HP: 15/15    AC: 4    XP: 12,450                       │    │
│  │  Next Level: 15,000 XP (2,550 to go)                    │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  MAGE SPELLS                                            │    │
│  │  L1: 3/3  L2: 2/2  L3: 1/1  L4: 0/0                     │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │               [Spells]  [Cast]  (Camp mode)             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────┬──────────────────────────┐    │
│  │  EQUIPMENT                   │  INVENTORY (3/8)          │    │
│  │  ─────────────────────────── │  ────────────────────────│    │
│  │  Weapon: Staff        [Uneq] │  1. Potion of Healing    │    │
│  │  Armor:  Robe         [Uneq] │     [Trade] [Drop] [Use] │    │
│  │  Shield: (empty)             │  2. Scroll of MAHALITO   │    │
│  │  Helmet: (empty)             │     [Trade] [Drop] [Use] │    │
│  │  Gauntlets: (empty)          │  3. Dagger               │    │
│  │                              │     [Equip] [Trade] [Drop]│    │
│  └──────────────────────────────┴──────────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  (ESC) Return                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Structure

```html
<app-scene-title [title]="character().name" [showPartyGold]="showPartyGold()" />

<div class="character-inspection">
  <!-- Message Banner (using MessageService) -->
  @if (messages.hasMessage()) {
    <div class="message" [class.error]="messages.isError()" [class.success]="messages.isSuccess()">
      {{ messages.messageText() }}
    </div>
  }

  <!-- Character Detail Card (NEW COMPONENT) -->
  <app-character-detail-card
    [character]="character()"
    [mode]="mode()"
    [actions]="characterActions()"
    (actionClick)="handleCharacterAction($event)"
  />

  <!-- Equipment & Inventory Grid -->
  <div class="items-grid">
    <!-- Equipment Column -->
    <div class="equipment-section">
      <h3>Equipment</h3>
      <div class="equipment-slots">
        @for (slot of equipmentSlots; track slot.type) {
          <app-item-card
            [item]="getEquippedItem(slot.type)"
            [slot]="slot.type"
            [isEquipped]="true"
            [showActions]="mode() !== 'TRAINING_GROUNDS'"
            (actionClick)="handleItemAction($event)"
          />
        }
      </div>
    </div>

    <!-- Inventory Column -->
    <div class="inventory-section">
      <h3>Inventory ({{ inventoryCount() }}/8)</h3>
      <div class="inventory-grid">
        @for (item of inventoryItems(); track item.id) {
          <app-item-card
            [item]="item"
            [isEquipped]="false"
            [showActions]="mode() !== 'TRAINING_GROUNDS'"
            [showUseButton]="mode() === 'CAMP' && item.effect"
            (actionClick)="handleItemAction($event)"
          />
        } @empty {
          <div class="empty-inventory">No items in inventory</div>
        }
      </div>
    </div>
  </div>
</div>

<app-scene-footer
  [menuItems]="footerMenuItems()"
  (itemSelected)="handleFooterAction($event)"
/>

<!-- Dialogs -->
<app-spell-book-dialog ... />
<app-spell-selection-dialog ... />
<app-character-selection-dialog ... />
<app-trade-item-dialog ... />
<app-confirmation-dialog ... />
```

---

## 3. New Shared Components

### 3.1 CharacterDetailCardComponent

A new component that displays comprehensive character information with inline actions.

**Purpose:** Single character display with stats, spell points, and character-level actions.

**Location:** `src/app/shared/components/character-detail-card/`

```typescript
// character-detail-card.component.ts
@Component({
  selector: 'app-character-detail-card',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    SpellPointsDisplayComponent,
    CharacterActionsComponent
  ],
  templateUrl: './character-detail-card.component.html',
  styleUrls: ['./character-detail-card.component.scss']
})
export class CharacterDetailCardComponent {
  @Input() character!: Character;
  @Input() mode: InspectionMode = 'TAVERN';
  @Input() actions: CharacterAction[] = [];
  @Input() showXpProgress: boolean = true;

  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  // Computed properties
  get isSpellcaster(): boolean {
    return SpellLearningService.isCaster(this.character);
  }

  get xpToNextLevel(): number {
    return LevelUpService.getXPForNextLevel(this.character) - this.character.experience;
  }

  get nextLevelXP(): number {
    return LevelUpService.getXPForNextLevel(this.character);
  }
}
```

**Template:**
```html
<div class="character-detail-card">
  <!-- Header: Race, Class, Level, Alignment, Status -->
  <div class="card-header">
    <span class="classification">
      {{ character.race }} {{ character.class }} Lvl {{ character.level }}
    </span>
    <span class="separator">•</span>
    <span class="alignment">{{ character.alignment }}</span>
    <app-status-badge [status]="character.status" variant="badge" />
  </div>

  <div class="card-divider"></div>

  <!-- Attributes: 3x2 grid -->
  <div class="attributes-section">
    <div class="stat-row">
      <span class="stat">STR: <em>{{ character.strength }}</em></span>
      <span class="stat">INT: <em>{{ character.intelligence }}</em></span>
      <span class="stat">PIE: <em>{{ character.piety }}</em></span>
    </div>
    <div class="stat-row">
      <span class="stat">VIT: <em>{{ character.vitality }}</em></span>
      <span class="stat">AGI: <em>{{ character.agility }}</em></span>
      <span class="stat">LUK: <em>{{ character.luck }}</em></span>
    </div>
  </div>

  <div class="card-divider"></div>

  <!-- Combat Stats -->
  <div class="combat-section">
    <span class="combat-stat">HP: <em>{{ character.hp }}/{{ character.maxHp }}</em></span>
    <span class="combat-stat">AC: <em>{{ character.ac }}</em></span>
    <span class="combat-stat">XP: <em>{{ character.experience | number }}</em></span>
  </div>

  <!-- XP Progress (optional) -->
  @if (showXpProgress && xpToNextLevel > 0) {
    <div class="xp-progress">
      Next Level: {{ nextLevelXP | number }} XP ({{ xpToNextLevel | number }} to go)
    </div>
  }

  <div class="card-divider"></div>

  <!-- Spell Points (casters only) -->
  @if (isSpellcaster && character.spellPoints) {
    <app-spell-points-display [spellPoints]="character.spellPoints" />
    <div class="card-divider"></div>
  }

  <!-- Actions -->
  @if (actions.length > 0) {
    <app-character-actions
      [actions]="actions"
      [characterId]="character.id"
      (actionClick)="actionClick.emit($event)"
    />
  }
</div>
```

---

### 3.2 SpellPointsDisplayComponent

Displays spell point pools for mage and/or priest spells.

**Location:** `src/app/shared/components/spell-points-display/`

```typescript
// spell-points-display.component.ts
@Component({
  selector: 'app-spell-points-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (spellPoints?.mage) {
      <div class="spell-pool mage">
        <span class="pool-label">MAGE:</span>
        <span class="levels">
          @for (level of levels; track level) {
            <span class="level" [class.depleted]="getMagePoints(level).current === 0">
              L{{ level }}: {{ getMagePoints(level).current }}/{{ getMagePoints(level).max }}
            </span>
          }
        </span>
      </div>
    }
    @if (spellPoints?.priest) {
      <div class="spell-pool priest">
        <span class="pool-label">PRIEST:</span>
        <span class="levels">
          @for (level of levels; track level) {
            <span class="level" [class.depleted]="getPriestPoints(level).current === 0">
              L{{ level }}: {{ getPriestPoints(level).current }}/{{ getPriestPoints(level).max }}
            </span>
          }
        </span>
      </div>
    }
  `,
  styleUrls: ['./spell-points-display.component.scss']
})
export class SpellPointsDisplayComponent {
  @Input() spellPoints?: CharacterSpellPoints;

  readonly levels = [1, 2, 3, 4, 5, 6, 7];

  getMagePoints(level: number): MaxCurrent {
    const key = `level${level}` as keyof SpellPointPool;
    return this.spellPoints?.mage?.[key] ?? { current: 0, max: 0 };
  }

  getPriestPoints(level: number): MaxCurrent {
    const key = `level${level}` as keyof SpellPointPool;
    return this.spellPoints?.priest?.[key] ?? { current: 0, max: 0 };
  }
}
```

---

### 3.3 SpellBookDialogComponent

Displays character's known spells organized by level.

**Location:** `src/app/shared/components/spell-book-dialog/`

```typescript
// spell-book-dialog.component.ts
export interface SpellBookEntry {
  spell: SpellData;
  level: number;
  casterType: 'mage' | 'priest';
}

@Component({
  selector: 'app-spell-book-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spell-book-dialog.component.html',
  styleUrls: ['./spell-book-dialog.component.scss']
})
export class SpellBookDialogComponent {
  @Input() visible: boolean = false;
  @Input() character: Character | null = null;
  @Input() spells: SpellBookEntry[] = [];

  @Output() closed = new EventEmitter<void>();

  // Group spells by caster type and level
  get mageSpellsByLevel(): Map<number, SpellBookEntry[]> {
    return this.groupByLevel(this.spells.filter(s => s.casterType === 'mage'));
  }

  get priestSpellsByLevel(): Map<number, SpellBookEntry[]> {
    return this.groupByLevel(this.spells.filter(s => s.casterType === 'priest'));
  }

  private groupByLevel(spells: SpellBookEntry[]): Map<number, SpellBookEntry[]> {
    const map = new Map<number, SpellBookEntry[]>();
    for (const spell of spells) {
      const list = map.get(spell.level) || [];
      list.push(spell);
      map.set(spell.level, list);
    }
    return map;
  }

  @HostListener('keydown.escape')
  @HostListener('keydown.space')
  @HostListener('keydown.enter')
  onClose(): void {
    if (this.visible) {
      this.closed.emit();
    }
  }
}
```

**Template:**
```html
@if (visible && character) {
  <div class="dialog-overlay" (click)="closed.emit()">
    <div class="dialog-content" (click)="$event.stopPropagation()">
      <div class="dialog-header">
        <h2>{{ character.name }}'s Spell Book</h2>
      </div>

      <div class="dialog-body">
        @if (mageSpellsByLevel.size > 0) {
          <div class="spell-section">
            <h3>Mage Spells</h3>
            @for (entry of mageSpellsByLevel | keyvalue; track entry.key) {
              <div class="spell-level">
                <span class="level-header">Level {{ entry.key }}:</span>
                <div class="spell-list">
                  @for (spell of entry.value; track spell.spell.id) {
                    <div class="spell-entry">
                      <span class="spell-name">{{ spell.spell.name }}</span>
                      <span class="spell-desc">{{ spell.spell.description }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (priestSpellsByLevel.size > 0) {
          <div class="spell-section">
            <h3>Priest Spells</h3>
            @for (entry of priestSpellsByLevel | keyvalue; track entry.key) {
              <div class="spell-level">
                <span class="level-header">Level {{ entry.key }}:</span>
                <div class="spell-list">
                  @for (spell of entry.value; track spell.spell.id) {
                    <div class="spell-entry">
                      <span class="spell-name">{{ spell.spell.name }}</span>
                      <span class="spell-desc">{{ spell.spell.description }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (mageSpellsByLevel.size === 0 && priestSpellsByLevel.size === 0) {
          <div class="no-spells">No spells learned yet.</div>
        }
      </div>

      <div class="dialog-footer">
        <span class="instruction">Press any key to close</span>
      </div>
    </div>
  </div>
}
```

---

## 4. ItemCardComponent Updates

The existing `ItemCardComponent` needs a minor update to support the "Use" action for Camp mode.

```typescript
// Add to item-card.component.ts
@Input() showUseButton: boolean = false;

get canUse(): boolean {
  return this.item !== null &&
         this.item.effect !== undefined &&
         !this.isEquipped;
}

// Add 'use' to ItemAction type
export interface ItemAction {
  type: 'equip' | 'unequip' | 'trade' | 'drop' | 'use';
  item: Item;
}
```

```html
<!-- Add to item-card.component.html -->
@if (showUseButton && canUse) {
  <button class="btn-use" (click)="handleAction('use')">Use</button>
}
```

---

## 5. Mode Detection and Query Parameters

### Entry Point Pattern

```typescript
// Navigation to inspection
this.navigation.inspectCharacter(characterId, 'maze');      // Camp mode
this.navigation.inspectCharacter(characterId, 'tavern');    // Tavern mode
this.navigation.inspectCharacter(characterId, 'training');  // Training mode

// SceneNavigationService
inspectCharacter(characterId: string, returnTo: string): void {
  const mode = this.getInspectionMode(returnTo);
  this.router.navigate(['/character-inspection'], {
    queryParams: { characterId, returnTo, mode }
  });
}

private getInspectionMode(returnTo: string): InspectionMode {
  switch (returnTo) {
    case 'training-grounds': return 'TRAINING_GROUNDS';
    case 'tavern': return 'TAVERN';
    case 'maze':
    case 'camp':
    default: return 'CAMP';
  }
}
```

### Component Mode Handling

```typescript
// character-inspection.component.ts
export type InspectionMode = 'TRAINING_GROUNDS' | 'TAVERN' | 'CAMP';

readonly mode = computed((): InspectionMode => {
  const modeParam = this.queryParams()['mode'];
  if (modeParam === 'TRAINING_GROUNDS' || modeParam === 'TAVERN' || modeParam === 'CAMP') {
    return modeParam;
  }
  // Fallback based on returnTo
  const returnTo = this.returnTo();
  if (returnTo === 'training-grounds') return 'TRAINING_GROUNDS';
  if (returnTo === 'tavern') return 'TAVERN';
  return 'CAMP';
});

// Show party gold only in Tavern mode
readonly showPartyGold = computed(() => this.mode() === 'TAVERN');
```

---

## 6. Updated Component Architecture

```
character-inspection/
├── character-inspection.component.ts
├── character-inspection.component.html
├── character-inspection.component.scss
└── character-inspection.component.spec.ts

shared/components/
├── character-detail-card/          [NEW]
│   ├── character-detail-card.component.ts
│   ├── character-detail-card.component.html
│   ├── character-detail-card.component.scss
│   └── character-detail-card.component.spec.ts
├── spell-points-display/           [NEW]
│   ├── spell-points-display.component.ts
│   ├── spell-points-display.component.scss
│   └── spell-points-display.component.spec.ts
├── spell-book-dialog/              [NEW]
│   ├── spell-book-dialog.component.ts
│   ├── spell-book-dialog.component.html
│   ├── spell-book-dialog.component.scss
│   └── spell-book-dialog.component.spec.ts
├── item-card/                      [UPDATE]
│   └── (add 'use' action support)
└── (existing components unchanged)
```

---

## 7. State Management

### Dialog State

```typescript
// Dialog visibility signals
readonly showSpellBookDialog = signal(false);
readonly showSpellCastDialog = signal(false);
readonly showTargetDialog = signal(false);
readonly showTradeDialog = signal(false);
readonly showDropConfirmDialog = signal(false);
readonly showDeleteConfirmDialog = signal(false);
readonly showClassChangeDialog = signal(false);

// Pending action tracking
readonly pendingItemAction = signal<{ action: string; item: Item } | null>(null);
```

### Service Integration

```typescript
// Use MessageService for consistency
private readonly messages = inject(MessageService);

// Success feedback
this.messages.showSuccess(`Equipped ${item.name}`);

// Error feedback
this.messages.showError(error.message || 'Failed to equip item');
```

---

## 8. Implementation Phases

### Phase 1: Core Refactoring (P0)
1. Remove duplicate status display
2. Add mode parameter support
3. Switch to MessageService
4. Update footer menu to be mode-aware

### Phase 2: New Components (P1)
1. Create `SpellPointsDisplayComponent`
2. Create `CharacterDetailCardComponent`
3. Create `SpellBookDialogComponent`
4. Update `ItemCardComponent` for 'use' action

### Phase 3: Integration (P1)
1. Integrate new components into inspection scene
2. Add spell book viewing (R action)
3. Add spell casting for Camp mode
4. Implement Use Item for Camp mode

### Phase 4: Training Mode (P2)
1. Implement Delete Character flow
2. Implement Change Class flow
3. Add password validation

### Phase 5: Polish (P2)
1. Add XP to next level display
2. Improve equipment grid layout (2 columns)
3. Add keyboard shortcuts for common actions
4. Update documentation

---

## 9. Testing Strategy

### Unit Tests

```typescript
// CharacterDetailCardComponent
describe('CharacterDetailCardComponent', () => {
  it('displays character attributes in 3x2 grid');
  it('shows spell points for casters only');
  it('hides spell points for non-casters');
  it('displays XP progress when enabled');
  it('emits action events on button click');
});

// SpellPointsDisplayComponent
describe('SpellPointsDisplayComponent', () => {
  it('displays mage spell points when available');
  it('displays priest spell points when available');
  it('displays both for Bishops');
  it('marks depleted levels with special styling');
});

// SpellBookDialogComponent
describe('SpellBookDialogComponent', () => {
  it('groups spells by caster type and level');
  it('closes on ESC key');
  it('closes on backdrop click');
  it('shows empty state when no spells');
});
```

### Integration Tests

```typescript
describe('Character Inspection Integration', () => {
  it('navigates from tavern with TAVERN mode');
  it('navigates from maze with CAMP mode');
  it('shows correct actions for each mode');
  it('completes equip/unequip flow');
  it('completes trade flow');
  it('completes spell casting flow in Camp mode');
});
```

---

## 10. Documentation Updates Required

After implementation, update:

1. `docs/ui/scenes/13-character-inspection.md` - Update to reflect:
   - Action pattern (party vs character)
   - Footer menu contents by mode
   - Character card actions by mode
   - New component usage

2. `docs/services/SceneNavigationService.md` - Add:
   - `inspectCharacter()` method documentation
   - Mode parameter explanation

3. `CLAUDE.md` - Add:
   - Party action vs character action pattern
   - Reference to CharacterDetailCardComponent

---

## Appendix A: Complete Action Matrix

| Action | Training | Tavern | Camp | Location | Shortcut |
|--------|----------|--------|------|----------|----------|
| Return | Yes | Yes | Yes | Footer | ESC |
| Pool All Gold | No | Yes | Yes | Footer | P |
| Read Spell Book | Yes | Yes | Yes | Card | R |
| Equip/Unequip | No | Yes | Yes | ItemCard | - |
| Trade | No | Yes | Yes | ItemCard | - |
| Drop | No | Yes | Yes | ItemCard | - |
| Use Item | No | No | Yes | ItemCard | - |
| Cast Spell | No | No | Yes | Card | - |
| Identify (Bishop) | No | Yes | Yes | Card | - |
| Change Class | Yes | No | No | Card | - |
| Delete Character | Yes | No | No | Card | - |

---

## Appendix B: File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `character-inspection.component.ts` | Major Update | Mode support, MessageService, new layout |
| `character-inspection.component.html` | Major Update | New component structure |
| `character-inspection.component.scss` | Update | Two-column layout, remove duplicates |
| `character-detail-card/*` | New | Character display with stats and actions |
| `spell-points-display/*` | New | Spell point pool display |
| `spell-book-dialog/*` | New | Known spells viewer |
| `item-card.component.ts` | Minor Update | Add 'use' action support |
| `SceneNavigationService.ts` | Update | Add mode to inspectCharacter() |
| `CharacterDisplayHelpers.ts` | Update | Add action labels for new actions |
| `docs/ui/scenes/13-character-inspection.md` | Update | Reflect new design |

# Character Inspection Scene Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize Character Inspection scene with inline item actions, full equipment management, and best-practice component architecture.

**Architecture:** Single-view design with SceneTitleComponent + SceneFooterComponent. Item cards have contextual action buttons (Equip/Unequip/Trade/Drop). New ItemDataService establishes pattern for domain-specific data services. Services use pure functions with immutable state updates.

**Tech Stack:** Angular 19, TypeScript, Jest, Signals, Standalone Components

---

## Task 1: ItemDataService Foundation

**Files:**
- Create: `src/services/ItemDataService.ts`
- Create: `src/services/__tests__/ItemDataService.spec.ts`

**Step 1: Write failing test for loadAllItems**

```typescript
// src/services/__tests__/ItemDataService.spec.ts
import { ItemDataService } from '../ItemDataService';

describe('ItemDataService', () => {
  beforeEach(() => {
    // Reset service state between tests
    ItemDataService['itemsCache'].clear();
    ItemDataService['loaded'] = false;
  });

  describe('loadAllItems', () => {
    it('loads items from JSON files', async () => {
      await ItemDataService.loadAllItems();

      const sword = ItemDataService.getItem('long_sword');
      expect(sword).toBeDefined();
      expect(sword?.name).toBe('Long Sword');
    });

    it('does not reload on subsequent calls', async () => {
      await ItemDataService.loadAllItems();
      const firstLoadCount = ItemDataService['itemsCache'].size;

      await ItemDataService.loadAllItems();
      const secondLoadCount = ItemDataService['itemsCache'].size;

      expect(secondLoadCount).toBe(firstLoadCount);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ItemDataService`
Expected: FAIL with "Cannot find module '../ItemDataService'"

**Step 3: Write minimal ItemDataService implementation**

```typescript
// src/services/ItemDataService.ts
import { Item } from '../types/Item';
import { ItemType } from '../types/ItemType';

/**
 * ItemDataService - Loads and caches item data from JSON files
 * Establishes pattern for domain-specific data services
 */
export class ItemDataService {
  private static itemsCache: Map<string, Item> = new Map();
  private static loaded = false;

  /**
   * Load all item data from data/items/*.json
   * Called during game initialization
   */
  static async loadAllItems(): Promise<void> {
    if (this.loaded) return;

    // For now, load from assets (copied from data/ during build)
    const itemFiles = [
      'weapons.json',
      'armor.json',
      'shields.json',
      'helmets.json',
      'gauntlets.json',
      'consumables.json',
      'misc.json'
    ];

    for (const file of itemFiles) {
      try {
        const response = await fetch(`/assets/items/${file}`);
        const items: Item[] = await response.json();

        for (const item of items) {
          this.itemsCache.set(item.id, item);
        }
      } catch (error) {
        console.error(`Failed to load ${file}:`, error);
      }
    }

    this.loaded = true;
  }

  /**
   * Get single item by ID
   */
  static getItem(itemId: string): Item | null {
    return this.itemsCache.get(itemId) ?? null;
  }

  /**
   * Get multiple items by IDs
   * Filters out null values (missing items)
   */
  static getItems(itemIds: string[]): Item[] {
    return itemIds
      .map(id => this.getItem(id))
      .filter((item): item is Item => item !== null);
  }

  /**
   * Get all items of a specific type
   */
  static getItemsByType(type: ItemType): Item[] {
    return Array.from(this.itemsCache.values())
      .filter(item => item.type === type);
  }

  /**
   * Get inventory count for display
   */
  static getInventoryCount(current: number): { current: number; max: number } {
    return { current, max: 8 };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- ItemDataService`
Expected: PASS (2 tests)

**Step 5: Add tests for getItem and getItems**

```typescript
// Add to src/services/__tests__/ItemDataService.spec.ts
describe('getItem', () => {
  beforeEach(async () => {
    await ItemDataService.loadAllItems();
  });

  it('returns item by ID', () => {
    const item = ItemDataService.getItem('long_sword');
    expect(item).not.toBeNull();
    expect(item?.name).toBe('Long Sword');
  });

  it('returns null for unknown ID', () => {
    const item = ItemDataService.getItem('unknown_item_xyz');
    expect(item).toBeNull();
  });
});

describe('getItems', () => {
  beforeEach(async () => {
    await ItemDataService.loadAllItems();
  });

  it('resolves multiple item IDs', () => {
    const items = ItemDataService.getItems(['long_sword', 'plate_mail']);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('filters out null values for missing items', () => {
    const items = ItemDataService.getItems(['long_sword', 'unknown', 'plate_mail']);
    // Should only return valid items
    expect(items.every(item => item !== null)).toBe(true);
  });

  it('returns empty array for empty input', () => {
    const items = ItemDataService.getItems([]);
    expect(items).toEqual([]);
  });
});
```

**Step 6: Run tests**

Run: `npm test -- ItemDataService`
Expected: PASS (7 tests)

**Step 7: Commit**

```bash
git add src/services/ItemDataService.ts src/services/__tests__/ItemDataService.spec.ts
git commit -m "feat: add ItemDataService for item data loading and caching"
```

---

## Task 2: EquipmentService - Core Equip/Unequip Logic

**Files:**
- Create: `src/services/EquipmentService.ts`
- Create: `src/services/__tests__/EquipmentService.spec.ts`
- Read: `docs/services/EquipmentService.md` (API reference)

**Step 1: Write failing test for canEquipItem validation**

```typescript
// src/services/__tests__/EquipmentService.spec.ts
import { EquipmentService } from '../EquipmentService';
import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { ItemType } from '../../types/ItemType';
import { ItemSlot } from '../../types/ItemType';

describe('EquipmentService', () => {
  let fighter: Character;
  let longSword: Item;

  beforeEach(() => {
    fighter = {
      id: 'fighter-1',
      name: 'Test Fighter',
      race: 'HUMAN',
      class: 'FIGHTER',
      alignment: 'GOOD',
      strength: 16,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 18,
      hp: 10,
      maxHp: 10,
      ac: 10,
      status: 'OK',
      vim: { current: 100, max: 100 },
      knownSpells: [],
      inventory: ['long_sword'],
      createdAt: Date.now(),
      lastModified: Date.now()
    };

    longSword = {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      damage: 8,
      classRestrictions: ['FIGHTER', 'SAMURAI', 'LORD', 'NINJA'],
      cursed: false,
      identified: true,
      equipped: false
    };
  });

  describe('canEquipItem', () => {
    it('allows fighter to equip sword', () => {
      const result = EquipmentService.canEquipItem(fighter, longSword);
      expect(result.allowed).toBe(true);
    });

    it('rejects unidentified item', () => {
      longSword.identified = false;
      const result = EquipmentService.canEquipItem(fighter, longSword);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('identified');
    });

    it('rejects item for wrong class', () => {
      const mage = { ...fighter, class: 'MAGE' as const };
      const result = EquipmentService.canEquipItem(mage, longSword);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('MAGE');
    });

    it('allows item with no class restrictions', () => {
      const potion: Item = {
        ...longSword,
        id: 'potion',
        type: ItemType.CONSUMABLE,
        classRestrictions: undefined
      };
      const result = EquipmentService.canEquipItem(fighter, potion);
      expect(result.allowed).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- EquipmentService`
Expected: FAIL with "Cannot find module '../EquipmentService'"

**Step 3: Write minimal EquipmentService with canEquipItem**

```typescript
// src/services/EquipmentService.ts
import { Character } from '../types/Character';
import { Item } from '../types/Item';
import { ItemSlot } from '../types/ItemType';

/**
 * EquipmentService - Equipment management and validation
 * Pure functions following docs/services/EquipmentService.md
 */
export class EquipmentService {
  /**
   * Validate if character can equip item
   */
  static canEquipItem(
    character: Character,
    item: Item
  ): { allowed: boolean; reason?: string } {
    // Must be identified
    if (!item.identified) {
      return { allowed: false, reason: 'Item must be identified first' };
    }

    // Class restrictions
    if (item.classRestrictions?.length) {
      if (!item.classRestrictions.includes(character.class)) {
        return {
          allowed: false,
          reason: `${character.class} cannot use this item`
        };
      }
    }

    // Alignment restrictions
    if (item.alignmentRestrictions?.length) {
      if (!item.alignmentRestrictions.includes(character.alignment)) {
        return { allowed: false, reason: 'Alignment restriction' };
      }
    }

    return { allowed: true };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- EquipmentService`
Expected: PASS (4 tests)

**Step 5: Write failing test for equipItem**

```typescript
// Add to src/services/__tests__/EquipmentService.spec.ts
describe('equipItem', () => {
  it('equips weapon from inventory to slot', () => {
    const result = EquipmentService.equipItem(fighter, 'long_sword');

    expect(result.equippedWeapon).toBe('long_sword');
    expect(result.inventory).not.toContain('long_sword');
  });

  it('throws error if item not in inventory', () => {
    fighter.inventory = [];

    expect(() => EquipmentService.equipItem(fighter, 'long_sword'))
      .toThrow('Item not in inventory');
  });

  it('throws error for unidentified item', () => {
    longSword.identified = false;

    expect(() => EquipmentService.equipItem(fighter, 'long_sword'))
      .toThrow('identified');
  });

  it('unequips existing item when slot occupied', () => {
    fighter.equippedWeapon = 'short_sword';
    fighter.inventory = ['long_sword'];

    const result = EquipmentService.equipItem(fighter, 'long_sword');

    expect(result.equippedWeapon).toBe('long_sword');
    expect(result.inventory).toContain('short_sword');
    expect(result.inventory).not.toContain('long_sword');
  });

  it('recalculates AC after equipping armor', () => {
    const plateMail: Item = {
      id: 'plate_mail',
      name: 'Plate Mail',
      type: ItemType.ARMOR,
      slot: ItemSlot.ARMOR,
      price: 750,
      defense: 5,
      classRestrictions: ['FIGHTER', 'SAMURAI', 'LORD'],
      cursed: false,
      identified: true,
      equipped: false
    };

    fighter.inventory = ['plate_mail'];
    fighter.ac = 10;

    const result = EquipmentService.equipItem(fighter, 'plate_mail');

    expect(result.ac).toBeLessThan(10);
    expect(result.equippedArmor).toBe('plate_mail');
  });
});
```

**Step 6: Run test to verify it fails**

Run: `npm test -- EquipmentService`
Expected: FAIL with "equipItem is not a function"

**Step 7: Implement equipItem**

```typescript
// Add to src/services/EquipmentService.ts
import { ItemDataService } from './ItemDataService';

/**
 * Equip item from inventory to equipment slot
 */
static equipItem(
  character: Character,
  itemId: string
): Character {
  // Check item in inventory
  if (!character.inventory.includes(itemId)) {
    throw new Error('Item not in inventory');
  }

  // Get item data
  const item = ItemDataService.getItem(itemId);
  if (!item) {
    throw new Error('Item not found in database');
  }

  // Validate can equip
  const validation = this.canEquipItem(character, item);
  if (!validation.allowed) {
    throw new Error(validation.reason || 'Cannot equip item');
  }

  // Determine slot
  const slotField = this.getSlotFieldName(item.slot);
  if (!slotField) {
    throw new Error('Invalid item slot');
  }

  // Start with character copy
  let updatedChar = { ...character };

  // If slot occupied, unequip existing item first
  const existingItemId = updatedChar[slotField];
  if (existingItemId) {
    updatedChar = {
      ...updatedChar,
      inventory: [...updatedChar.inventory, existingItemId as string],
      [slotField]: undefined
    };
  }

  // Equip new item
  updatedChar = {
    ...updatedChar,
    inventory: updatedChar.inventory.filter(id => id !== itemId),
    [slotField]: itemId
  };

  // Recalculate AC
  updatedChar.ac = this.calculateAC(updatedChar);

  return updatedChar;
}

/**
 * Get character field name for slot
 */
private static getSlotFieldName(slot: ItemSlot): keyof Character | null {
  switch (slot) {
    case ItemSlot.WEAPON: return 'equippedWeapon';
    case ItemSlot.ARMOR: return 'equippedArmor';
    case ItemSlot.SHIELD: return 'equippedShield';
    case ItemSlot.HEAD: return 'equippedHelmet';
    case ItemSlot.HANDS: return 'equippedGauntlets';
    default: return null;
  }
}

/**
 * Calculate AC based on equipment
 * Formula: Base 10 - armor bonus - shield bonus - AGI modifier
 */
static calculateAC(character: Character): number {
  let ac = 10; // Base AC

  // Equipment bonuses
  const slots: Array<keyof Character> = [
    'equippedArmor',
    'equippedShield',
    'equippedHelmet',
    'equippedGauntlets'
  ];

  for (const slotField of slots) {
    const itemId = character[slotField] as string | undefined;
    if (itemId) {
      const item = ItemDataService.getItem(itemId);
      if (item?.defense) {
        ac -= item.defense; // Lower is better
      }
    }
  }

  // AGI modifier
  const agiMod = Math.floor((character.agility - 10) / 2);
  ac -= agiMod;

  return Math.max(ac, -10); // Cap at -10
}
```

**Step 8: Run test to verify it passes**

Run: `npm test -- EquipmentService`
Expected: PASS (9 tests)

**Step 9: Commit**

```bash
git add src/services/EquipmentService.ts src/services/__tests__/EquipmentService.spec.ts
git commit -m "feat: add EquipmentService equipItem and AC calculation"
```

---

## Task 3: EquipmentService - Unequip Logic

**Files:**
- Modify: `src/services/EquipmentService.ts`
- Modify: `src/services/__tests__/EquipmentService.spec.ts`

**Step 1: Write failing test for unequipItem**

```typescript
// Add to src/services/__tests__/EquipmentService.spec.ts
describe('unequipItem', () => {
  beforeEach(() => {
    fighter.equippedWeapon = 'long_sword';
    fighter.inventory = [];
  });

  it('moves item from slot to inventory', () => {
    const result = EquipmentService.unequipItem(fighter, ItemSlot.WEAPON);

    expect(result.equippedWeapon).toBeUndefined();
    expect(result.inventory).toContain('long_sword');
  });

  it('throws error if no item in slot', () => {
    fighter.equippedWeapon = undefined;

    expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
      .toThrow('No item in slot');
  });

  it('throws error if item is cursed', () => {
    longSword.cursed = true;

    expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
      .toThrow('Cannot unequip cursed item');
  });

  it('throws error if inventory full', () => {
    fighter.inventory = new Array(8).fill('potion');

    expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
      .toThrow('Inventory full');
  });

  it('recalculates AC after unequipping armor', () => {
    fighter.equippedArmor = 'plate_mail';
    fighter.ac = 5;
    fighter.inventory = [];

    const result = EquipmentService.unequipItem(fighter, ItemSlot.ARMOR);

    expect(result.ac).toBeGreaterThan(5);
    expect(result.equippedArmor).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- EquipmentService`
Expected: FAIL with "unequipItem is not a function"

**Step 3: Implement unequipItem**

```typescript
// Add to src/services/EquipmentService.ts
import { InventoryService } from './InventoryService';

/**
 * Unequip item from slot to inventory
 */
static unequipItem(
  character: Character,
  slot: ItemSlot
): Character {
  const slotField = this.getSlotFieldName(slot);
  if (!slotField) {
    throw new Error('Invalid slot');
  }

  const itemId = character[slotField] as string | undefined;
  if (!itemId) {
    throw new Error('No item in slot');
  }

  // Check if cursed
  const item = ItemDataService.getItem(itemId);
  if (item?.cursed) {
    throw new Error('Cannot unequip cursed item');
  }

  // Check inventory space
  if (!InventoryService.hasSpace(character)) {
    throw new Error('Inventory full');
  }

  // Move to inventory
  const updatedChar = {
    ...character,
    inventory: [...character.inventory, itemId],
    [slotField]: undefined
  };

  // Recalculate AC
  updatedChar.ac = this.calculateAC(updatedChar);

  return updatedChar;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- EquipmentService`
Expected: PASS (14 tests)

**Step 5: Commit**

```bash
git add src/services/EquipmentService.ts src/services/__tests__/EquipmentService.spec.ts
git commit -m "feat: add EquipmentService unequipItem with cursed item handling"
```

---

## Task 4: InventoryService Extensions

**Files:**
- Modify: `src/services/InventoryService.ts`
- Modify: `src/services/__tests__/InventoryService.spec.ts`

**Step 1: Write failing tests for transferItem**

```typescript
// Add to src/services/__tests__/InventoryService.spec.ts
describe('transferItem', () => {
  let fromChar: Character;
  let toChar: Character;

  beforeEach(() => {
    fromChar = {
      id: 'char-1',
      name: 'Fighter',
      // ... other required fields
      inventory: ['potion', 'sword']
    } as Character;

    toChar = {
      id: 'char-2',
      name: 'Mage',
      // ... other required fields
      inventory: ['staff']
    } as Character;
  });

  it('transfers item between characters', () => {
    const result = InventoryService.transferItem(fromChar, toChar, 'potion');

    expect(result.from.inventory).not.toContain('potion');
    expect(result.to.inventory).toContain('potion');
    expect(result.from.inventory).toContain('sword');
  });

  it('throws error if item not in donor inventory', () => {
    expect(() => InventoryService.transferItem(fromChar, toChar, 'unknown'))
      .toThrow('Item not found in donor inventory');
  });

  it('throws error if recipient inventory full', () => {
    toChar.inventory = new Array(8).fill('item');

    expect(() => InventoryService.transferItem(fromChar, toChar, 'potion'))
      .toThrow('Recipient inventory full');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- InventoryService`
Expected: FAIL with "transferItem is not a function"

**Step 3: Implement transferItem**

```typescript
// Add to src/services/InventoryService.ts

/**
 * Transfer item between characters
 */
static transferItem(
  fromCharacter: Character,
  toCharacter: Character,
  itemId: string
): { from: Character; to: Character } {
  if (!fromCharacter.inventory.includes(itemId)) {
    throw new Error('Item not found in donor inventory');
  }

  if (!this.hasSpace(toCharacter)) {
    throw new Error('Recipient inventory full');
  }

  const from = {
    ...fromCharacter,
    inventory: fromCharacter.inventory.filter(id => id !== itemId)
  };

  const to = {
    ...toCharacter,
    inventory: [...toCharacter.inventory, itemId]
  };

  return { from, to };
}
```

**Step 4: Write failing tests for dropItem**

```typescript
// Add to src/services/__tests__/InventoryService.spec.ts
describe('dropItem', () => {
  let character: Character;

  beforeEach(() => {
    character = {
      id: 'char-1',
      name: 'Fighter',
      inventory: ['potion', 'sword', 'shield']
    } as Character;
  });

  it('removes item from inventory', () => {
    const result = InventoryService.dropItem(character, 'potion');

    expect(result.inventory).toHaveLength(2);
    expect(result.inventory).not.toContain('potion');
    expect(result.inventory).toContain('sword');
  });

  it('throws error if item not in inventory', () => {
    expect(() => InventoryService.dropItem(character, 'unknown'))
      .toThrow('Item not in inventory');
  });
});
```

**Step 5: Implement dropItem**

```typescript
// Add to src/services/InventoryService.ts

/**
 * Drop item from inventory (permanent removal)
 */
static dropItem(
  character: Character,
  itemId: string
): Character {
  if (!character.inventory.includes(itemId)) {
    throw new Error('Item not in inventory');
  }

  return {
    ...character,
    inventory: character.inventory.filter(id => id !== itemId)
  };
}

/**
 * Get inventory count
 */
static getInventoryCount(character: Character): { current: number; max: number } {
  return {
    current: character.inventory.length,
    max: MAX_INVENTORY_SIZE
  };
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- InventoryService`
Expected: PASS (all tests including new ones)

**Step 7: Commit**

```bash
git add src/services/InventoryService.ts src/services/__tests__/InventoryService.spec.ts
git commit -m "feat: add transferItem and dropItem to InventoryService"
```

---

## Task 5: ItemCardComponent

**Files:**
- Create: `src/app/components/item-card/item-card.component.ts`
- Create: `src/app/components/item-card/item-card.component.html`
- Create: `src/app/components/item-card/item-card.component.scss`
- Create: `src/app/components/item-card/item-card.component.spec.ts`

**Step 1: Write failing component test**

```typescript
// src/app/components/item-card/item-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemCardComponent } from './item-card.component';
import { Item } from '../../../types/Item';
import { ItemType, ItemSlot } from '../../../types/ItemType';

describe('ItemCardComponent', () => {
  let component: ItemCardComponent;
  let fixture: ComponentFixture<ItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemCardComponent);
    component = fixture.componentInstance;
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('displays equipped weapon with stats', () => {
    const item: Item = {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      damage: 8,
      identified: true,
      cursed: false,
      equipped: true
    };

    component.item = item;
    component.isEquipped = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Long Sword');
    expect(compiled.textContent).toContain('Weapon');
  });

  it('shows Unequip button for equipped items', () => {
    const item: Item = {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      identified: true,
      cursed: false,
      equipped: true
    };

    component.item = item;
    component.isEquipped = true;
    component.showActions = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button?.textContent).toContain('Unequip');
  });

  it('shows Equip, Trade, Drop buttons for inventory items', () => {
    const item: Item = {
      id: 'potion',
      name: 'Healing Potion',
      type: ItemType.CONSUMABLE,
      slot: ItemSlot.NONE,
      price: 10,
      identified: true,
      cursed: false,
      equipped: false
    };

    component.item = item;
    component.isEquipped = false;
    component.showActions = true;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b: any) => b.textContent);

    expect(buttonTexts.some((t: string) => t.includes('Trade'))).toBe(true);
    expect(buttonTexts.some((t: string) => t.includes('Drop'))).toBe(true);
  });

  it('displays empty slot placeholder', () => {
    component.item = null;
    component.slot = ItemSlot.WEAPON;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Empty');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ItemCardComponent`
Expected: FAIL with "Cannot find module"

**Step 3: Create ItemCardComponent**

```typescript
// src/app/components/item-card/item-card.component.ts
import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '../../../types/Item';
import { ItemSlot } from '../../../types/ItemType';

export interface ItemAction {
  type: 'equip' | 'unequip' | 'trade' | 'drop';
  item: Item;
}

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss'
})
export class ItemCardComponent {
  @Input() item: Item | null = null;
  @Input() slot?: ItemSlot;
  @Input() isEquipped: boolean = false;
  @Input() showActions: boolean = true;

  actionClick = output<ItemAction>();

  handleAction(type: ItemAction['type']): void {
    if (this.item) {
      this.actionClick.emit({ type, item: this.item });
    }
  }

  get displayName(): string {
    if (!this.item) {
      return this.slot ? `Empty ${this.slot}` : 'Empty Slot';
    }

    if (!this.item.identified) {
      return '???Unknown Item???';
    }

    return this.item.name;
  }

  get displayType(): string {
    if (!this.item) return '---';

    const type = this.item.type;
    const status = this.item.identified ? 'Identified' : 'Unknown';

    return `${type} • ${status}`;
  }

  get displayStats(): string {
    if (!this.item || !this.item.identified) return '';

    if (this.item.damage) {
      return `DMG: ${this.item.damage}`;
    }

    if (this.item.defense) {
      return `AC Bonus: -${this.item.defense}`;
    }

    return '';
  }

  get canEquip(): boolean {
    return this.item !== null &&
           this.item.identified &&
           !this.isEquipped &&
           this.item.slot !== ItemSlot.NONE;
  }

  get canUnequip(): boolean {
    return this.item !== null &&
           this.isEquipped &&
           !this.item.cursed;
  }

  get showEquipButton(): boolean {
    return this.showActions && this.canEquip;
  }

  get showUnequipButton(): boolean {
    return this.showActions && this.isEquipped;
  }

  get showTradeButton(): boolean {
    return this.showActions && !this.isEquipped && this.item !== null;
  }

  get showDropButton(): boolean {
    return this.showActions && !this.isEquipped && this.item !== null;
  }
}
```

**Step 4: Create template**

```html
<!-- src/app/components/item-card/item-card.component.html -->
<div class="item-card" [class.equipped]="isEquipped" [class.empty]="!item">
  <div class="item-header">
    <span class="item-name">{{ displayName }}</span>
    @if (item?.cursed && isEquipped) {
      <span class="cursed-badge">CURSED</span>
    }
  </div>

  <div class="item-type">{{ displayType }}</div>

  @if (displayStats) {
    <div class="item-stats">{{ displayStats }}</div>
  }

  @if (showActions && item) {
    <div class="item-actions">
      @if (showEquipButton) {
        <button class="btn-equip" (click)="handleAction('equip')">Equip</button>
      }

      @if (showUnequipButton) {
        <button
          class="btn-unequip"
          (click)="handleAction('unequip')"
          [disabled]="item.cursed">
          {{ item.cursed ? 'Cannot Unequip' : 'Unequip' }}
        </button>
      }

      @if (showTradeButton) {
        <button class="btn-trade" (click)="handleAction('trade')">Trade</button>
      }

      @if (showDropButton) {
        <button class="btn-drop" (click)="handleAction('drop')">Drop</button>
      }
    </div>
  }
</div>
```

**Step 5: Create basic styles**

```scss
// src/app/components/item-card/item-card.component.scss
.item-card {
  border: 1px solid #ccc;
  padding: 0.5rem;
  border-radius: 4px;
  background: #fff;

  &.equipped {
    background: #f0f8ff;
    border-color: #4a90e2;
  }

  &.empty {
    opacity: 0.5;
    font-style: italic;
  }
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.item-name {
  font-weight: bold;
}

.cursed-badge {
  color: red;
  font-size: 0.75rem;
  font-weight: bold;
}

.item-type {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.item-stats {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  button {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-equip {
    background: #4a90e2;
    color: white;
    border-color: #4a90e2;
  }

  .btn-unequip {
    background: #f0f0f0;
  }

  .btn-trade {
    background: #52c41a;
    color: white;
    border-color: #52c41a;
  }

  .btn-drop {
    background: #ff4d4f;
    color: white;
    border-color: #ff4d4f;
  }
}
```

**Step 6: Run tests**

Run: `npm test -- ItemCardComponent`
Expected: PASS (5 tests)

**Step 7: Commit**

```bash
git add src/app/components/item-card/
git commit -m "feat: add ItemCardComponent with contextual actions"
```

---

## Task 6: TradeItemDialogComponent

**Files:**
- Create: `src/app/components/trade-item-dialog/trade-item-dialog.component.ts`
- Create: `src/app/components/trade-item-dialog/trade-item-dialog.component.html`
- Create: `src/app/components/trade-item-dialog/trade-item-dialog.component.scss`
- Create: `src/app/components/trade-item-dialog/trade-item-dialog.component.spec.ts`

**Step 1: Write failing component test**

```typescript
// src/app/components/trade-item-dialog/trade-item-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TradeItemDialogComponent } from './trade-item-dialog.component';
import { Character } from '../../../types/Character';
import { Item } from '../../../types/Item';
import { ItemType, ItemSlot } from '../../../types/ItemType';

describe('TradeItemDialogComponent', () => {
  let component: TradeItemDialogComponent;
  let fixture: ComponentFixture<TradeItemDialogComponent>;

  const testItem: Item = {
    id: 'potion',
    name: 'Healing Potion',
    type: ItemType.CONSUMABLE,
    slot: ItemSlot.NONE,
    price: 10,
    identified: true,
    cursed: false,
    equipped: false
  };

  const partyMembers: Character[] = [
    {
      id: 'char-1',
      name: 'Gandalf',
      class: 'MAGE',
      level: 3,
      inventory: ['staff', 'scroll', 'potion', 'ring', 'book']
    } as Character,
    {
      id: 'char-2',
      name: 'Conan',
      class: 'FIGHTER',
      level: 4,
      inventory: new Array(8).fill('item') // Full inventory
    } as Character
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeItemDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TradeItemDialogComponent);
    component = fixture.componentInstance;
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('displays item name in header', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Healing Potion');
  });

  it('lists party members with inventory space', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Gandalf');
    expect(compiled.textContent).toContain('5/8');
  });

  it('disables member with full inventory', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('input[type="radio"]');
    expect(options[1].disabled).toBe(true);
  });

  it('emits confirm with selected character ID', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;

    let emittedId: string | undefined;
    component.confirm.subscribe((id: string) => {
      emittedId = id;
    });

    component.selectedCharacterId = 'char-1';
    component.onConfirm();

    expect(emittedId).toBe('char-1');
  });

  it('emits cancel', () => {
    let cancelled = false;
    component.cancel.subscribe(() => {
      cancelled = true;
    });

    component.onCancel();

    expect(cancelled).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- TradeItemDialogComponent`
Expected: FAIL

**Step 3: Create TradeItemDialogComponent**

```typescript
// src/app/components/trade-item-dialog/trade-item-dialog.component.ts
import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character } from '../../../types/Character';
import { Item } from '../../../types/Item';
import { InventoryService } from '../../../services/InventoryService';

@Component({
  selector: 'app-trade-item-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trade-item-dialog.component.html',
  styleUrl: './trade-item-dialog.component.scss'
})
export class TradeItemDialogComponent {
  @Input() item!: Item;
  @Input() partyMembers: Character[] = [];
  @Input() currentCharacterId!: string;

  confirm = output<string>();
  cancel = output<void>();

  selectedCharacterId: string | null = null;

  getInventoryDisplay(character: Character): string {
    const count = InventoryService.getInventoryCount(character);
    return `${count.current}/${count.max}`;
  }

  canReceive(character: Character): boolean {
    return InventoryService.hasSpace(character);
  }

  onConfirm(): void {
    if (this.selectedCharacterId) {
      this.confirm.emit(this.selectedCharacterId);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
```

**Step 4: Create template**

```html
<!-- src/app/components/trade-item-dialog/trade-item-dialog.component.html -->
<div class="dialog-overlay" (click)="onCancel()">
  <div class="dialog-content" (click)="$event.stopPropagation()">
    <div class="dialog-header">
      <h2>TRADE ITEM: {{ item.name }}</h2>
    </div>

    <div class="dialog-body">
      <p>Select party member to receive item:</p>

      @for (member of partyMembers; track member.id) {
        <label class="member-option" [class.disabled]="!canReceive(member)">
          <input
            type="radio"
            name="recipient"
            [value]="member.id"
            [(ngModel)]="selectedCharacterId"
            [disabled]="!canReceive(member)"
          />
          <div class="member-info">
            <span class="member-name">{{ member.name }}</span>
            <span class="member-class">({{ member.class }}, Lvl {{ member.level }})</span>
            <span class="member-inventory" [class.full]="!canReceive(member)">
              Inventory: {{ getInventoryDisplay(member) }}
              @if (!canReceive(member)) {
                <span class="full-badge">[FULL]</span>
              }
            </span>
          </div>
        </label>
      }

      @if (partyMembers.length === 0) {
        <p class="no-recipients">No other party members available</p>
      }
    </div>

    <div class="dialog-footer">
      <button
        class="btn-confirm"
        (click)="onConfirm()"
        [disabled]="!selectedCharacterId">
        Confirm
      </button>
      <button class="btn-cancel" (click)="onCancel()">Cancel</button>
    </div>
  </div>
</div>
```

**Step 5: Create styles**

```scss
// src/app/components/trade-item-dialog/trade-item-dialog.component.scss
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 400px;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  margin-bottom: 1rem;

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }
}

.dialog-body {
  margin-bottom: 1.5rem;

  p {
    margin-bottom: 1rem;
  }
}

.member-option {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;

  &:hover:not(.disabled) {
    background: #f0f0f0;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type="radio"] {
    margin-right: 0.75rem;
    margin-top: 0.25rem;
  }
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.member-name {
  font-weight: bold;
}

.member-class {
  font-size: 0.875rem;
  color: #666;
}

.member-inventory {
  font-size: 0.875rem;

  &.full {
    color: #ff4d4f;
  }
}

.full-badge {
  font-weight: bold;
  margin-left: 0.5rem;
}

.no-recipients {
  text-align: center;
  color: #999;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-confirm {
    background: #52c41a;
    color: white;
  }

  .btn-cancel {
    background: #f0f0f0;
  }
}
```

**Step 6: Run tests**

Run: `npm test -- TradeItemDialogComponent`
Expected: PASS (6 tests)

**Step 7: Commit**

```bash
git add src/app/components/trade-item-dialog/
git commit -m "feat: add TradeItemDialogComponent for item transfers"
```

---

## Task 7: CharacterInspectionComponent Modernization

**Files:**
- Modify: `src/app/character-inspection/character-inspection.component.ts`
- Modify: `src/app/character-inspection/character-inspection.component.html`
- Modify: `src/app/character-inspection/character-inspection.component.scss`
- Modify: `src/app/character-inspection/character-inspection.component.spec.ts`

**Step 1: Update component imports and state**

```typescript
// Update src/app/character-inspection/character-inspection.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { SceneTitleComponent } from '../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../components/scene-footer/scene-footer.component';
import { ItemCardComponent, ItemAction } from '../components/item-card/item-card.component';
import { TradeItemDialogComponent } from '../components/trade-item-dialog/trade-item-dialog.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '../components/menu/menu.component';

import { GameStateService } from '../../services/GameStateService';
import { ItemDataService } from '../../services/ItemDataService';
import { EquipmentService } from '../../services/EquipmentService';
import { InventoryService } from '../../services/InventoryService';

import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { ItemSlot } from '../../types/ItemType';

@Component({
  selector: 'app-character-inspection',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    ItemCardComponent,
    TradeItemDialogComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './character-inspection.component.html',
  styleUrl: './character-inspection.component.scss'
})
export class CharacterInspectionComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private gameState = inject(GameStateService);

  // Query params
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Record<string, string>
  });

  readonly characterId = computed(() =>
    this.queryParams()['characterId'] || null
  );

  readonly returnTo = computed(() =>
    this.queryParams()['returnTo'] || 'castle-menu'
  );

  // Character data
  readonly character = computed(() => {
    const id = this.characterId();
    if (!id) return null;
    return this.gameState.state().roster.get(id) ?? null;
  });

  // Equipment slots (all 5 slots)
  readonly ItemSlot = ItemSlot; // For template
  readonly equipmentSlots = computed(() => {
    const char = this.character();
    if (!char) return [];

    return [
      { slot: ItemSlot.WEAPON, itemId: char.equippedWeapon },
      { slot: ItemSlot.ARMOR, itemId: char.equippedArmor },
      { slot: ItemSlot.SHIELD, itemId: char.equippedShield },
      { slot: ItemSlot.HEAD, itemId: char.equippedHelmet },
      { slot: ItemSlot.HANDS, itemId: char.equippedGauntlets }
    ].map(({ slot, itemId }) => ({
      slot,
      item: itemId ? ItemDataService.getItem(itemId) : null
    }));
  });

  // Inventory items
  readonly inventoryItems = computed(() => {
    const char = this.character();
    if (!char) return [];
    return ItemDataService.getItems(char.inventory);
  });

  // Party members (excluding current character)
  readonly partyMembers = computed(() => {
    const currentCharId = this.characterId();
    const party = this.gameState.party();
    const state = this.gameState.state();

    return party.members
      .filter(id => id !== currentCharId)
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  // Dialog state
  readonly showTradeDialog = signal(false);
  readonly showDropConfirmation = signal(false);
  readonly selectedItem = signal<Item | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Spell data (display only)
  readonly spellData = computed(() => {
    const char = this.character();
    if (!char || !char.spellPoints) return null;

    const spellLevels = [1, 2, 3, 4, 5, 6, 7];
    const magePoints = spellLevels.map(level => ({
      level,
      current: char.spellPoints.mage[level]?.current ?? 0,
      max: char.spellPoints.mage[level]?.max ?? 0
    }));

    const priestPoints = spellLevels.map(level => ({
      level,
      current: char.spellPoints.priest[level]?.current ?? 0,
      max: char.spellPoints.priest[level]?.max ?? 0
    }));

    return {
      magePoints,
      priestPoints,
      knownSpells: char.knownSpells || [],
      hasMageSpells: magePoints.some(p => p.max > 0),
      hasPriestSpells: priestPoints.some(p => p.max > 0)
    };
  });

  // Footer menu
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'leave', label: 'Return', shortcut: 'ESC', enabled: true }
  ]);

  // Action handlers
  handleItemAction(action: ItemAction): void {
    switch (action.type) {
      case 'equip':
        this.handleEquip(action.item);
        break;
      case 'trade':
        this.handleTrade(action.item);
        break;
      case 'drop':
        this.handleDrop(action.item);
        break;
    }
  }

  handleEquip(item: Item): void {
    const char = this.character();
    if (!char) return;

    try {
      const updatedChar = EquipmentService.equipItem(char, item.id);
      this.updateCharacter(updatedChar);
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Cannot equip item');
    }
  }

  handleUnequip(slot: ItemSlot): void {
    const char = this.character();
    if (!char) return;

    try {
      const updatedChar = EquipmentService.unequipItem(char, slot);
      this.updateCharacter(updatedChar);
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Cannot unequip item');
    }
  }

  handleTrade(item: Item): void {
    this.selectedItem.set(item);
    this.showTradeDialog.set(true);
  }

  confirmTrade(recipientId: string): void {
    const char = this.character();
    const item = this.selectedItem();
    if (!char || !item) return;

    const state = this.gameState.state();
    const recipient = state.roster.get(recipientId);
    if (!recipient) return;

    try {
      const { from, to } = InventoryService.transferItem(char, recipient, item.id);

      this.updateMultipleCharacters([
        { id: char.id, character: from },
        { id: recipientId, character: to }
      ]);

      this.showTradeDialog.set(false);
      this.selectedItem.set(null);
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Cannot trade item');
    }
  }

  cancelTrade(): void {
    this.showTradeDialog.set(false);
    this.selectedItem.set(null);
  }

  handleDrop(item: Item): void {
    this.selectedItem.set(item);
    this.showDropConfirmation.set(true);
  }

  confirmDrop(): void {
    const char = this.character();
    const item = this.selectedItem();
    if (!char || !item) return;

    try {
      const updatedChar = InventoryService.dropItem(char, item.id);
      this.updateCharacter(updatedChar);
      this.showDropConfirmation.set(false);
      this.selectedItem.set(null);
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Cannot drop item');
    }
  }

  cancelDrop(): void {
    this.showDropConfirmation.set(false);
    this.selectedItem.set(null);
  }

  handleFooterAction(itemId: string): void {
    if (itemId === 'leave') {
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    const returnScene = this.returnTo();
    this.router.navigate([`/${returnScene}`]);
  }

  private updateCharacter(character: Character): void {
    const state = this.gameState.state();
    const newRoster = new Map(state.roster);
    newRoster.set(character.id, character);

    this.gameState.setState({
      ...state,
      roster: newRoster
    });
  }

  private updateMultipleCharacters(updates: Array<{ id: string; character: Character }>): void {
    const state = this.gameState.state();
    const newRoster = new Map(state.roster);

    for (const { id, character } of updates) {
      newRoster.set(id, character);
    }

    this.gameState.setState({
      ...state,
      roster: newRoster
    });
  }
}
```

**Step 2: Update template with new components**

```html
<!-- Update src/app/character-inspection/character-inspection.component.html -->
<div class="character-inspection-container">
  <app-scene-title title="CHARACTER INSPECTION" />

  @if (character(); as char) {
    <!-- Character Stats Card -->
    <section class="character-stats">
      <div class="stats-header">
        <h2>{{ char.name }}</h2>
        <div class="meta">{{ char.race }} {{ char.class }} ({{ char.alignment }})</div>
      </div>

      <div class="stats-grid">
        <div class="stat-row">
          <span class="label">Level:</span>
          <span class="value">{{ char.level }}</span>
          <span class="label">XP:</span>
          <span class="value">{{ char.experience }}</span>
          <span class="label">Age:</span>
          <span class="value">{{ char.age }}</span>
        </div>

        <div class="stat-row">
          <span class="label">STR:</span>
          <span class="value">{{ char.strength }}</span>
          <span class="label">INT:</span>
          <span class="value">{{ char.intelligence }}</span>
          <span class="label">PIE:</span>
          <span class="value">{{ char.piety }}</span>
        </div>

        <div class="stat-row">
          <span class="label">VIT:</span>
          <span class="value">{{ char.vitality }}</span>
          <span class="label">AGI:</span>
          <span class="value">{{ char.agility }}</span>
          <span class="label">LUC:</span>
          <span class="value">{{ char.luck }}</span>
        </div>

        <div class="stat-row">
          <span class="label">HP:</span>
          <span class="value">{{ char.hp }}/{{ char.maxHp }}</span>
          <span class="label">AC:</span>
          <span class="value">{{ char.ac }}</span>
          <span class="label">Status:</span>
          <span class="value">{{ char.status }}</span>
        </div>
      </div>
    </section>

    <!-- Equipment & Inventory Grid -->
    <section class="items-section">
      <div class="equipment-column">
        <h3>EQUIPMENT</h3>
        @for (equipped of equipmentSlots(); track equipped.slot) {
          <app-item-card
            [item]="equipped.item"
            [slot]="equipped.slot"
            [isEquipped]="true"
            [showActions]="char.status === 'OK'"
            (actionClick)="handleUnequip(equipped.slot)"
          />
        }
      </div>

      <div class="inventory-column">
        <h3>INVENTORY ({{ char.inventory.length }}/8)</h3>
        @for (item of inventoryItems(); track item.id) {
          <app-item-card
            [item]="item"
            [isEquipped]="false"
            [showActions]="char.status === 'OK'"
            (actionClick)="handleItemAction($event)"
          />
        }

        @for (_ of [].constructor(8 - inventoryItems().length); track $index) {
          <app-item-card [item]="null" [showActions]="false" />
        }
      </div>
    </section>

    <!-- Spells Section -->
    @if (spellData(); as spells) {
      <section class="spells-section">
        <h3>SPELLS</h3>

        @if (spells.hasMageSpells) {
          <div class="spell-category">
            <h4>Mage Spells</h4>
            <div class="spell-points">
              @for (level of spells.magePoints; track level.level) {
                @if (level.max > 0) {
                  <span class="spell-level">
                    L{{ level.level }}: {{ level.current }}/{{ level.max }}
                  </span>
                }
              }
            </div>
            <div class="known-spells">
              {{ spells.knownSpells.join(', ') || 'None' }}
            </div>
          </div>
        }

        @if (spells.hasPriestSpells) {
          <div class="spell-category">
            <h4>Priest Spells</h4>
            <div class="spell-points">
              @for (level of spells.priestPoints; track level.level) {
                @if (level.max > 0) {
                  <span class="spell-level">
                    L{{ level.level }}: {{ level.current }}/{{ level.max }}
                  </span>
                }
              }
            </div>
          </div>
        }
      </section>
    }

    @if (errorMessage(); as error) {
      <div class="error-message">{{ error }}</div>
    }
  } @else {
    <div class="error-state">Character not found</div>
  }

  @if (showTradeDialog()) {
    <app-trade-item-dialog
      [item]="selectedItem()!"
      [partyMembers]="partyMembers()"
      [currentCharacterId]="characterId()!"
      (confirm)="confirmTrade($event)"
      (cancel)="cancelTrade()"
    />
  }

  @if (showDropConfirmation()) {
    <app-confirmation-dialog
      [message]="'Drop ' + selectedItem()?.name + '? This cannot be undone.'"
      (confirm)="confirmDrop()"
      (cancel)="cancelDrop()"
    />
  }

  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />
</div>
```

**Step 3: Update styles**

```scss
// Update src/app/character-inspection/character-inspection.component.scss
.character-inspection-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
}

.character-stats {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.stats-header {
  margin-bottom: 1rem;

  h2 {
    margin: 0 0 0.25rem 0;
  }

  .meta {
    color: #666;
    font-size: 0.875rem;
  }
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;

  .label {
    font-weight: bold;
  }
}

.items-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 1rem 0;
  flex: 1;
  overflow-y: auto;
}

.equipment-column,
.inventory-column {
  h3 {
    margin: 0 0 1rem 0;
  }

  app-item-card {
    display: block;
    margin-bottom: 0.5rem;
  }
}

.spells-section {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;

  h3 {
    margin: 0 0 1rem 0;
  }
}

.spell-category {
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
  }
}

.spell-points {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.spell-level {
  font-size: 0.875rem;
}

.known-spells {
  font-size: 0.875rem;
  color: #666;
}

.error-message {
  padding: 1rem;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  border-radius: 4px;
  margin: 1rem 0;
}

.error-state {
  text-align: center;
  padding: 2rem;
  color: #999;
  font-size: 1.25rem;
}
```

**Step 4: Write component tests**

```typescript
// Update src/app/character-inspection/character-inspection.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { CharacterInspectionComponent } from './character-inspection.component';
import { GameStateService } from '../../services/GameStateService';
import { ItemDataService } from '../../services/ItemDataService';

describe('CharacterInspectionComponent', () => {
  let component: CharacterInspectionComponent;
  let fixture: ComponentFixture<CharacterInspectionComponent>;
  let gameStateService: jasmine.SpyObj<GameStateService>;
  let router: jasmine.SpyObj<Router>;

  const mockCharacter = {
    id: 'char-1',
    name: 'Test Fighter',
    race: 'HUMAN',
    class: 'FIGHTER',
    alignment: 'GOOD',
    level: 1,
    experience: 0,
    age: 18,
    strength: 16,
    intelligence: 10,
    piety: 10,
    vitality: 14,
    agility: 12,
    luck: 10,
    hp: 10,
    maxHp: 10,
    ac: 10,
    status: 'OK',
    vim: { current: 100, max: 100 },
    knownSpells: [],
    inventory: ['long_sword', 'potion'],
    equippedWeapon: 'short_sword',
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  beforeEach(async () => {
    const gameStateSpy = jasmine.createSpyObj('GameStateService', ['state', 'setState', 'party']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    gameStateSpy.state.and.returnValue({
      roster: new Map([['char-1', mockCharacter]]),
      party: { members: ['char-1'] }
    });
    gameStateSpy.party.and.returnValue({ members: ['char-1'] });

    await TestBed.configureTestingModule({
      imports: [CharacterInspectionComponent],
      providers: [
        { provide: GameStateService, useValue: gameStateSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ characterId: 'char-1', returnTo: 'castle-menu' })
          }
        }
      ]
    }).compileComponents();

    gameStateService = TestBed.inject(GameStateService) as jasmine.SpyObj<GameStateService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Load item data
    await ItemDataService.loadAllItems();

    fixture = TestBed.createComponent(CharacterInspectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('displays character name and stats', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Test Fighter');
    expect(compiled.textContent).toContain('HUMAN');
    expect(compiled.textContent).toContain('FIGHTER');
  });

  it('displays equipment slots', () => {
    const slots = component.equipmentSlots();
    expect(slots.length).toBe(5); // All 5 equipment slots
  });

  it('displays inventory items', () => {
    const items = component.inventoryItems();
    expect(items.length).toBeGreaterThanOrEqual(0);
  });

  it('navigates back on leave action', () => {
    component.handleFooterAction('leave');
    expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
  });
});
```

**Step 5: Run tests**

Run: `npm test -- CharacterInspectionComponent`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/character-inspection/
git commit -m "feat: modernize CharacterInspectionComponent with inline actions"
```

---

## Task 8: Integration Tests

**Files:**
- Create: `src/app/character-inspection/__tests__/character-inspection-integration.spec.ts`

**Step 1: Write integration test for equip/unequip flow**

```typescript
// src/app/character-inspection/__tests__/character-inspection-integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CharacterInspectionComponent } from '../character-inspection.component';
import { GameStateService } from '../../../services/GameStateService';
import { ItemDataService } from '../../../services/ItemDataService';
import { EquipmentService } from '../../../services/EquipmentService';
import { Character } from '../../../types/Character';
import { Item } from '../../../types/Item';
import { ItemType, ItemSlot } from '../../../types/ItemType';

describe('Character Inspection Integration Tests', () => {
  let component: CharacterInspectionComponent;
  let fixture: ComponentFixture<CharacterInspectionComponent>;
  let gameStateService: GameStateService;

  const createTestCharacter = (): Character => ({
    id: 'test-fighter',
    name: 'Test Fighter',
    race: 'HUMAN',
    class: 'FIGHTER',
    alignment: 'GOOD',
    strength: 16,
    intelligence: 10,
    piety: 10,
    vitality: 14,
    agility: 12,
    luck: 10,
    level: 1,
    experience: 0,
    age: 18,
    hp: 10,
    maxHp: 10,
    ac: 10,
    status: 'OK',
    vim: { current: 100, max: 100 },
    knownSpells: [],
    inventory: ['plate_mail'],
    equippedWeapon: undefined,
    equippedArmor: undefined,
    equippedShield: undefined,
    equippedHelmet: undefined,
    equippedGauntlets: undefined,
    createdAt: Date.now(),
    lastModified: Date.now()
  });

  beforeEach(async () => {
    await ItemDataService.loadAllItems();

    const testChar = createTestCharacter();

    await TestBed.configureTestingModule({
      imports: [CharacterInspectionComponent],
      providers: [
        GameStateService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ characterId: 'test-fighter', returnTo: 'castle-menu' })
          }
        }
      ]
    }).compileComponents();

    gameStateService = TestBed.inject(GameStateService);

    // Setup initial game state
    gameStateService.setState({
      roster: new Map([['test-fighter', testChar]]),
      party: { members: ['test-fighter'] }
    } as any);

    fixture = TestBed.createComponent(CharacterInspectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('equips armor and recalculates AC', () => {
    const char = component.character()!;
    const initialAC = char.ac;

    // Get plate mail from inventory
    const plateMail = component.inventoryItems().find(i => i.id === 'plate_mail');
    expect(plateMail).toBeDefined();

    // Equip plate mail
    component.handleEquip(plateMail!);

    // Verify AC improved
    const updatedChar = component.character()!;
    expect(updatedChar.equippedArmor).toBe('plate_mail');
    expect(updatedChar.ac).toBeLessThan(initialAC);
    expect(updatedChar.inventory).not.toContain('plate_mail');
  });

  it('unequips armor and recalculates AC back', () => {
    // First equip plate mail
    const char = component.character()!;
    const plateMail = component.inventoryItems().find(i => i.id === 'plate_mail');
    component.handleEquip(plateMail!);

    const equippedAC = component.character()!.ac;

    // Then unequip
    component.handleUnequip(ItemSlot.ARMOR);

    // Verify AC returned and item back in inventory
    const finalChar = component.character()!;
    expect(finalChar.equippedArmor).toBeUndefined();
    expect(finalChar.ac).toBeGreaterThan(equippedAC);
    expect(finalChar.inventory).toContain('plate_mail');
  });

  it('trades item to another party member', () => {
    // Add second character to party
    const mage: Character = {
      ...createTestCharacter(),
      id: 'test-mage',
      name: 'Test Mage',
      class: 'MAGE',
      inventory: []
    };

    gameStateService.setState({
      roster: new Map([
        ['test-fighter', component.character()!],
        ['test-mage', mage]
      ]),
      party: { members: ['test-fighter', 'test-mage'] }
    } as any);

    fixture.detectChanges();

    const potion = component.inventoryItems()[0];
    expect(potion).toBeDefined();

    // Initiate trade
    component.handleTrade(potion);
    expect(component.showTradeDialog()).toBe(true);

    // Confirm trade to mage
    component.confirmTrade('test-mage');

    // Verify transfer
    const state = gameStateService.state();
    const updatedFighter = state.roster.get('test-fighter')!;
    const updatedMage = state.roster.get('test-mage')!;

    expect(updatedFighter.inventory).not.toContain(potion.id);
    expect(updatedMage.inventory).toContain(potion.id);
    expect(component.showTradeDialog()).toBe(false);
  });

  it('prevents equipping cursed unidentified item', () => {
    const cursedItem: Item = {
      id: 'cursed_sword',
      name: '???',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 0,
      identified: false,
      cursed: true,
      equipped: false
    };

    // Add to character inventory
    const char = component.character()!;
    char.inventory.push('cursed_sword');
    gameStateService.setState({
      roster: new Map([['test-fighter', char]]),
      party: { members: ['test-fighter'] }
    } as any);

    fixture.detectChanges();

    // Attempt to equip
    component.handleEquip(cursedItem);

    // Verify error
    expect(component.errorMessage()).toContain('identified');
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- character-inspection-integration`
Expected: PASS (4 tests)

**Step 3: Commit**

```bash
git add src/app/character-inspection/__tests__/
git commit -m "test: add integration tests for character inspection flows"
```

---

## Task 9: Documentation Updates

**Files:**
- Update: `docs/ui/scenes/13-character-inspection.md`
- Create: `docs/services/ItemDataService.md`

**Step 1: Update scene documentation with new design**

```markdown
<!-- Update docs/ui/scenes/13-character-inspection.md header -->
# Character Inspection Scene

## Overview

**Description:** View character details, manage equipment, trade items between party members, and view spells. Modernized with inline item actions and SceneTitleComponent/SceneFooterComponent architecture.

**Scene Type:** Multi-Context (accessible from Training Grounds, Tavern, Camp, Castle)

**Location in Game Flow:** Hub scene accessible from multiple locations for character management.

**Architecture:** Single-view design with inline item actions. Equipment and inventory items have contextual action buttons (Equip/Unequip/Trade/Drop). Trade uses modal dialog for party member selection.

---

## UI Components

**Header:** SceneTitleComponent with "CHARACTER INSPECTION" title (no party gold)

**Footer:** SceneFooterComponent with ESC to return to parent scene

**Main Content:**
- Character stats card (name, race, class, alignment, level, attributes, HP, AC, status)
- Equipment column (5 slots: weapon, armor, shield, helmet, gauntlets)
- Inventory column (8 slots max)
- Spells section (display only, grouped by mage/priest with spell points by level)

**Interactive Elements:**
- ItemCardComponent with inline action buttons
- TradeItemDialogComponent for party member selection
- ConfirmationDialogComponent for drop confirmation

---

## Equipment Management

**Equip Action:**
- Button appears on inventory items (if equippable and identified)
- Validates: class restrictions, alignment restrictions, identified status
- Auto-unequips existing item in slot if occupied
- Recalculates AC after equipping armor/shield/helmet/gauntlets

**Unequip Action:**
- Button appears on equipped items
- Validates: not cursed, inventory has space
- Moves item to inventory
- Recalculates AC after change

**Trade Action:**
- Button appears on inventory items
- Opens modal with party member list (excludes current character)
- Shows inventory space for each member (e.g., "5/8")
- Disables members with full inventory
- Transfers item on confirmation

**Drop Action:**
- Button appears on inventory items
- Opens confirmation dialog ("Drop [Item Name]? This cannot be undone.")
- Permanently removes item on confirmation

---
```

**Step 2: Document ItemDataService pattern**

```markdown
<!-- Create docs/services/ItemDataService.md -->
# ItemDataService

**Pure function service for item data loading and caching.**

## Responsibility

Loads item definitions from JSON files, caches in memory, and provides lookup methods. Establishes pattern for domain-specific data services (SpellDataService, MonsterDataService, etc. should follow this structure).

## API Reference

### loadAllItems

Load all item data from JSON files during game initialization.

**Signature**:
```typescript
static async loadAllItems(): Promise<void>
```

**Behavior**:
- Loads from `/assets/items/*.json` (weapons, armor, shields, helmets, gauntlets, consumables, misc)
- Caches items in Map<itemId, Item>
- Idempotent: Subsequent calls are no-ops
- Logs errors for failed file loads but continues

**Example**:
```typescript
await ItemDataService.loadAllItems();
// All item data now cached
```

---

### getItem

Get single item by ID.

**Signature**:
```typescript
static getItem(itemId: string): Item | null
```

**Returns**: Item if found, null if not in cache

**Example**:
```typescript
const sword = ItemDataService.getItem('long_sword');
if (sword) {
  console.log(sword.name); // "Long Sword"
}
```

---

### getItems

Get multiple items by IDs, filtering out missing items.

**Signature**:
```typescript
static getItems(itemIds: string[]): Item[]
```

**Parameters**:
- `itemIds`: Array of item IDs to resolve

**Returns**: Array of resolved items (missing IDs filtered out)

**Example**:
```typescript
const items = ItemDataService.getItems(['long_sword', 'unknown', 'potion']);
// Returns array with long_sword and potion (unknown filtered out)
```

---

### getItemsByType

Get all items of a specific type.

**Signature**:
```typescript
static getItemsByType(type: ItemType): Item[]
```

**Example**:
```typescript
const weapons = ItemDataService.getItemsByType(ItemType.WEAPON);
// All weapons from cache
```

---

## Pattern for Future Data Services

When creating SpellDataService, MonsterDataService, etc., follow this structure:

```typescript
export class XDataService {
  private static cache: Map<string, X> = new Map();
  private static loaded = false;

  static async loadAll(): Promise<void> {
    if (this.loaded) return;
    // Load from JSON files
    this.loaded = true;
  }

  static get(id: string): X | null {
    return this.cache.get(id) ?? null;
  }

  static getMultiple(ids: string[]): X[] {
    return ids
      .map(id => this.get(id))
      .filter((x): x is X => x !== null);
  }
}
```

**Benefits:**
- Clear separation of concerns (data loading vs business logic)
- Consistent API across all data services
- Easy to test (inject mock data into cache)
- Performance: Load once, access many times

---

## Related

- [EquipmentService](./EquipmentService.md) - Uses ItemDataService for item lookups
- [InventoryService](./InventoryService.md) - Uses ItemDataService for item resolution
- [Character Inspection Scene](../ui/scenes/13-character-inspection.md) - Primary consumer
```

**Step 3: Commit documentation**

```bash
git add docs/ui/scenes/13-character-inspection.md docs/services/ItemDataService.md
git commit -m "docs: update character inspection scene and document ItemDataService pattern"
```

---

## Task 10: Initialize ItemDataService in Game Setup

**Files:**
- Modify: `src/services/GameInitializationService.ts`

**Step 1: Add ItemDataService initialization**

```typescript
// Add to GameInitializationService.ts initialize() method
import { ItemDataService } from './ItemDataService';

// In the initialize() method, add:
// Load item data
await ItemDataService.loadAllItems();
```

**Step 2: Verify it loads on game start**

Run: `npm start`
Expected: Game starts without errors, items loaded

**Step 3: Commit**

```bash
git add src/services/GameInitializationService.ts
git commit -m "feat: initialize ItemDataService on game startup"
```

---

## Verification Checklist

**Run all tests:**
```bash
npm test
```
Expected: All tests pass in <10 seconds

**Verify test coverage:**
```bash
npm test -- --coverage
```
Expected: 80%+ coverage for services and components

**Manual testing:**
1. Navigate to Character Inspection from Tavern
2. Equip plate mail from inventory → AC improves
3. Unequip plate mail → AC returns to original
4. Trade potion to another party member → Item transfers
5. Drop sword from inventory → Confirmation, then removed
6. Try to equip cursed unidentified item → Error message shown
7. Press ESC → Returns to Tavern

**Success criteria:**
- ✅ All 5 equipment slots displayed
- ✅ Equip/unequip with AC recalculation
- ✅ Trade between party members
- ✅ Drop with confirmation
- ✅ Cursed item restrictions enforced
- ✅ Class restrictions validated
- ✅ Spell display (no casting)
- ✅ Footer navigation works
- ✅ All tests passing
- ✅ 80%+ coverage

---

## Execution Options

**Plan complete and saved to `docs/plans/2025-11-05-character-inspection-redesign.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

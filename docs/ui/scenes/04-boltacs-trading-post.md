# Boltac's Trading Post

## Overview

**Description:** Equipment shop for buying, selling, identifying, and uncursing items. The only place to acquire new equipment and manage cursed items.

**Scene Type:** Safe Zone (auto-saves on transactions)

**Location in Game Flow:** Primary commerce hub - essential for equipping party before dungeon runs

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Castle Menu → (B)oltac's Trading Post → Shop

**Direct Access:**
- Accessible directly from Castle Menu
- One of the primary town services

### Requirements

**State Requirements:**
- [ ] None (always accessible from Castle)
- [ ] Prompts for character selection immediately on entry

**Note:** Must select a character to shop for. Cannot browse without selecting character first.

### State Prerequisites

```typescript
interface ShopEntryState {
  characterRoster: Character[]  // All characters
  shopInventory: Item[]  // Available items for sale
  selectedCharacter: Character | null  // For shopping context
}
```

---

## UI Layout

### Screen Regions

- **Header:** "BOLTAC'S TRADING POST" title
- **Main:** Item catalog or character inventory
- **Sidebar:** Character info (gold, equipped items)
- **Menu:** Action options (B/S/I/U/P/L)
- **Status:** Current character, gold balance
- **Messages:** Transaction feedback

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  BOLTAC'S TRADING POST              │
├─────────────────────────────────────┤
│  Shopping for: Gandalf              │
│  Gold: 500                          │
│                                     │
│  (B)UY  (S)ELL  (I)DENTIFY          │
│  (U)NCURSE  (P)OOL GOLD  (L)EAVE    │
│                                     │
├─────────────────────────────────────┤
│  ITEMS FOR SALE:                    │
│  1. Long Sword         200 gp       │
│  2. Chain Mail         300 gp       │
│  3. Shield             100 gp       │
│  4. Leather Armor       50 gp       │
│  5. Dagger              20 gp       │
│                                     │
│  (F)ORWARD  (B)ACKWARD  (P)URCHASE  │
├─────────────────────────────────────┤
│  > Enter item number to purchase... │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Character selection happens first (before main shop screen)
- Item catalog paginated (10-20 items per page)
- Prices shown in gold pieces (gp)
- Character's current gold displayed prominently

---

## Available Actions

### Character Selection (Entry)

**Description:** Select which character to shop for

**Flow:**
1. Enter shop from Castle Menu
2. Prompt: "Shop for which character? (Name or number)"
3. User types character name or roster number
4. Validate character exists
5. Load character's inventory and gold
6. Show main shop menu

**Validation:**

```typescript
function canSelectCharacter(roster: Character[], nameOrNumber: string): { allowed: boolean; reason?: string } {
  const character = findCharacter(roster, nameOrNumber)
  if (!character) {
    return { allowed: false, reason: "Character not found" }
  }
  return { allowed: true }
}
```

---

### (B) Buy Items

**Description:** Browse and purchase equipment from shop inventory

**Key Binding:** B (case-insensitive)

**Requirements:**
- Character has gold
- Shop has items available

**Flow:**
1. User presses 'B'
2. Display item catalog (paginated)
3. Show item number, name, price
4. Actions in catalog:
   - (F)orward - Next page
   - (B)ackward - Previous page
   - Type item number - Purchase item
5. If purchasing:
   a. Validate character has enough gold
   b. Validate character has inventory space (max 8 items)
   c. Check item compatibility (class/alignment restrictions)
   d. Deduct gold
   e. Add item to character inventory
   f. Show success/warning messages

**Item Catalog Format:**

```
ITEMS FOR SALE:                      PAGE 1 of 3

Num  Item Name            Price  Type       Class Req
-----------------------------------------------------------
1    Long Sword           200    Weapon     Fighter
2    Chain Mail           300    Armor      All
3    Shield               100    Shield     Fighter
4    Leather Armor         50    Armor      All
5    Dagger                20    Weapon     All
6    Staff                 30    Weapon     Mage
7    Mace                 150    Weapon     Priest
8    Plate Mail           500    Armor      Fighter only
9    Holy Water            75    Special    Priest
10   Rope                  10    Misc       All

(F)orward  (B)ackward  Enter number to purchase
```

**Validation:**

```typescript
function canPurchaseItem(character: Character, item: Item): { allowed: boolean; reason?: string } {
  if (character.gold < item.price) {
    return { allowed: false, reason: "Not enough gold" }
  }

  if (character.inventory.length >= 8) {
    return { allowed: false, reason: "Inventory full (max 8 items)" }
  }

  if (!item.canBeUsedBy(character.class)) {
    // Warning, not blocking
    return { allowed: true, warning: `${character.class} cannot use this item` }
  }

  if (!item.canBeUsedBy(character.alignment)) {
    return { allowed: false, reason: `${character.alignment} characters cannot use this item` }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.gold -= item.price`
- `character.inventory.push(item)`
- Auto-save after purchase

**UI Feedback:**
- Success: "[Item] purchased for [X] gold"
- Warning: "You cannot use this item effectively" (still allows purchase)
- Failure: "Not enough gold"
- Failure: "Inventory full"
- Failure: "Your alignment prevents using this item"

**Transitions:**
- Remains in Shop (can purchase more items)

---

### (S) Sell Items

**Description:** Sell equipment from character inventory

**Key Binding:** S (case-insensitive)

**Requirements:**
- Character has items in inventory

**Flow:**
1. User presses 'S'
2. Display character's inventory
3. Prompt: "Sell which item? (Number or name)"
4. User selects item
5. Calculate sell price (typically 50% of purchase price)
6. Prompt: "Sell [Item] for [X] gold? (Y/N)"
7. If confirmed:
   a. Remove item from inventory
   b. Add gold to character
   c. Show confirmation

**Sell Price Calculation:**

```typescript
function calculateSellPrice(item: Item): number {
  return Math.floor(item.purchasePrice * 0.5)
}
```

**Validation:**

```typescript
function canSellItem(character: Character, itemIndex: number): { allowed: boolean; reason?: string } {
  if (character.inventory.length === 0) {
    return { allowed: false, reason: "No items to sell" }
  }

  if (itemIndex < 0 || itemIndex >= character.inventory.length) {
    return { allowed: false, reason: "Invalid item" }
  }

  const item = character.inventory[itemIndex]
  if (item.cursed && item.equipped) {
    return { allowed: false, reason: "Cannot sell equipped cursed item (uncurse first)" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.inventory.splice(index, 1)`
- `character.gold += sellPrice`
- Auto-save after sale

**UI Feedback:**
- Success: "[Item] sold for [X] gold"
- Failure: "Cannot sell cursed item"
- Failure: "No items to sell"

**Transitions:**
- Remains in Shop (can sell more items)

---

### (I) Identify Items

**Description:** Reveal properties of unidentified items

**Key Binding:** I (case-insensitive)

**Requirements:**
- Character has unidentified items
- Character has gold (identification costs money)

**Flow:**
1. User presses 'I'
2. Display unidentified items in inventory
3. Prompt: "Identify which item? (Number)"
4. User selects item
5. Show identification cost (based on item type/power)
6. Prompt: "Pay [X] gold to identify? (Y/N)"
7. If confirmed:
   a. Deduct gold
   b. Reveal item properties (name, bonuses, curses)
   c. Mark item as identified
   d. Show item details

**Identification Cost:**

```typescript
function calculateIdentifyCost(item: Item): number {
  const baseCost = 100
  const levelMultiplier = item.powerLevel || 1
  return baseCost * levelMultiplier
}
```

**Validation:**

```typescript
function canIdentifyItem(character: Character, item: Item): { allowed: boolean; reason?: string } {
  if (item.identified) {
    return { allowed: false, reason: "Item already identified" }
  }

  const cost = calculateIdentifyCost(item)
  if (character.gold < cost) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `item.identified = true`
- `character.gold -= identifyCost`
- Auto-save after identification

**UI Feedback:**
- Success: "This is a [Item Name]! ([Properties])"
- Curse revealed: "This is a [Item Name]! IT'S CURSED!"
- Failure: "Not enough gold"
- Failure: "No unidentified items"

**Transitions:**
- Remains in Shop (can identify more items)

---

### (U) Uncurse Items

**Description:** Remove curse from cursed item (allows unequipping)

**Key Binding:** U (case-insensitive)

**Requirements:**
- Character has cursed items
- Character has gold (uncursing is expensive)

**Flow:**
1. User presses 'U'
2. Display cursed items in inventory
3. Prompt: "Uncurse which item? (Number)"
4. User selects item
5. Show uncurse cost (expensive!)
6. Prompt: "Pay [X] gold to uncurse? (Y/N)"
7. If confirmed:
   a. Deduct gold
   b. Remove curse from item
   c. Item can now be unequipped/dropped
   d. Show confirmation

**Uncurse Cost:**

```typescript
function calculateUncurseCost(item: Item): number {
  const baseCost = 500  // Expensive!
  const levelMultiplier = item.powerLevel || 1
  return baseCost * levelMultiplier
}
```

**Validation:**

```typescript
function canUncurseItem(character: Character, item: Item): { allowed: boolean; reason?: string } {
  if (!item.cursed) {
    return { allowed: false, reason: "Item is not cursed" }
  }

  const cost = calculateUncurseCost(item)
  if (character.gold < cost) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `item.cursed = false`
- `character.gold -= uncurseCost`
- Auto-save after uncurse

**UI Feedback:**
- Success: "[Item] is no longer cursed!"
- Failure: "Not enough gold"
- Failure: "No cursed items"

**Transitions:**
- Remains in Shop (can uncurse more items)

---

### (P) Pool Gold

**Description:** Transfer character's gold to party pool

**Key Binding:** P (case-insensitive)

**Requirements:**
- Character has gold > 0
- Party exists (character must be in party)

**Flow:**
1. User presses 'P'
2. Prompt: "Pool how much gold? (Enter amount or 'ALL')"
3. User enters amount
4. Validate character has that much gold
5. Transfer gold from character to party pool
6. Show confirmation

**Validation:**

```typescript
function canPoolGold(character: Character, amount: number): { allowed: boolean; reason?: string } {
  if (character.gold === 0) {
    return { allowed: false, reason: "No gold to pool" }
  }

  if (amount > character.gold) {
    return { allowed: false, reason: "Not enough gold" }
  }

  if (!character.inParty) {
    return { allowed: false, reason: "Character must be in a party" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.gold -= amount`
- `party.pooledGold += amount`
- Auto-save after pooling

**UI Feedback:**
- Success: "[X] gold pooled"
- Failure: "Not enough gold"
- Failure: "No gold to pool"

**Transitions:**
- Remains in Shop

---

### (L) Leave Shop

**Description:** Return to Castle Menu

**Key Binding:** L (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L'
2. Auto-save any changes
3. Transition to Castle Menu

**Validation:**

```typescript
function canLeaveShop(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
}
```

**State Changes:**
- `state.currentScene = SceneType.CASTLE_MENU`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Castle Menu

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID SELECTION"
- Remain in Shop

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Buy | (B) | Item Catalog | Always |
| Sell | (S) | Inventory Display | Has items |
| Identify | (I) | Unidentified Items | Has unidentified items |
| Uncurse | (U) | Cursed Items | Has cursed items |
| Pool Gold | (P) | Shop | In party |
| Leave | (L) | Castle Menu | Always |

### Parent Scene

- Castle Menu → (B) → Shop

### Child Scenes

- Shop → (B/S/I/U/P) → Shop (same scene, updated)
- Shop → (L) → Castle Menu

---

## State Management

### Scene State

```typescript
interface ShopState {
  mode: 'CHARACTER_SELECT' | 'MAIN_MENU' | 'BUYING' | 'SELLING' | 'IDENTIFYING' | 'UNCURSING'
  selectedCharacter: Character | null
  catalogPage: number  // For item pagination
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Must select character first
- Item catalog is paginated
- All transactions auto-save

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.SHOP`
- Prompt for character selection

**On Purchase:**
- Update character gold and inventory
- Auto-save

**On Sale:**
- Update character gold and inventory
- Auto-save

**On Identify/Uncurse:**
- Update item properties
- Update character gold
- Auto-save

**On Exit:**
- Save all changes
- Transition to Castle Menu

### Persistence

- **Auto-save:** Yes, after each transaction
- **Manual save:** No (auto-saves are sufficient)
- **Safe zone:** Yes (no risk to characters)

---

## Implementation Notes

### Services Used

- `ShopService.getItemCatalog()`
- `ShopService.purchaseItem(character, item)`
- `ShopService.sellItem(character, item)`
- `ShopService.identifyItem(character, item)`
- `ShopService.uncurseItem(character, item)`
- `SaveService.autoSave(state)`

### Commands

- `SelectCharacterCommand` - Choose character to shop for
- `BuyItemCommand` - Purchase item
- `SellItemCommand` - Sell item
- `IdentifyItemCommand` - Identify item
- `UncurseItemCommand` - Remove curse
- `PoolGoldCommand` - Transfer gold to party
- `LeaveShopCommand` - Return to Castle

### Edge Cases

1. **Inventory full (8 items):**
   - Cannot purchase more items
   - Show "Inventory full" error
   - Must sell/drop items first

2. **Not enough gold:**
   - Cannot purchase/identify/uncurse
   - Show "Not enough gold" error
   - Can pool gold from other party members

3. **Cursed item equipped:**
   - Cannot sell cursed item while equipped
   - Cannot unequip cursed item without uncurse
   - Must pay to uncurse first

4. **Item compatibility:**
   - Show warning if character can't use item
   - Still allow purchase (player may want for another character)
   - Alignment restrictions are hard blocks (evil items for good characters)

5. **Unidentified items:**
   - Show as "Unknown Item" until identified
   - Cannot see properties/curses
   - Identification reveals true nature

6. **Sell price vs purchase price:**
   - Sell for 50% of purchase price (standard)
   - Cannot make profit from shop transactions

### Technical Considerations

- **Item catalog:** Static or dynamic (level-based availability)
- **Pagination:** 10-20 items per page for readability
- **Price calculation:** Based on item power level
- **Curse detection:** Only revealed after identification
- **Inventory management:** Hard limit of 8 items per character
- **Auto-save timing:** After each successful transaction

---

## Testing Scenarios

### Test 1: Purchase Item

```
1. From Castle Menu, press (B)
2. Select character to shop for
3. Press (B) to browse items
4. Enter item number
5. Verify gold sufficient
6. Verify inventory not full
7. Confirm purchase
8. Verify gold deducted
9. Verify item added to inventory
10. Verify auto-save triggered
```

### Test 2: Sell Item

```
1. At shop, press (S)
2. View character inventory
3. Select item to sell
4. Verify sell price displayed (50% of purchase)
5. Confirm sale
6. Verify item removed from inventory
7. Verify gold added to character
8. Verify auto-save triggered
```

### Test 3: Identify Unknown Item

```
1. Character has unidentified item
2. Press (I) to identify
3. View unidentified items
4. Select item
5. Verify identification cost
6. Pay to identify
7. Verify item properties revealed
8. If cursed: verify curse revealed
9. Verify gold deducted
10. Verify auto-save triggered
```

### Test 4: Uncurse Item

```
1. Character has cursed item (equipped)
2. Attempt to unequip
3. Verify cannot unequip (cursed)
4. At shop, press (U)
5. Select cursed item
6. Verify high uncurse cost
7. Pay to uncurse
8. Verify curse removed
9. Verify can now unequip
10. Verify auto-save triggered
```

### Test 5: Inventory Full

```
1. Fill character inventory (8 items)
2. Attempt to purchase item
3. Verify error: "Inventory full"
4. Verify purchase blocked
5. Sell one item
6. Verify can now purchase
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Parent scene
- [Character Inspection](./13-character-inspection.md) - Inventory management
- [Item System](../../systems/item-system.md) - Item properties
- [Economy System](../../systems/economy-system.md) - Pricing mechanics
- [Navigation Map](../navigation-map.md) - Complete navigation flow

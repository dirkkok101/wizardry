# ChestService

**Pure function service for chest generation, treasure distribution, and loot mechanics.**

## Responsibility

Generates treasure chests with appropriate traps, gold, and items based on dungeon level and reward tier. Implements the two-tier treasure system from original Wizardry 1 including the inventory management mechanics.

## API Reference

### generateChest

Generate a treasure chest for given dungeon level and reward tier.

**Signature**:
```typescript
function generateChest(
  dungeonLevel: number,
  rewardTier: number,
  randomSeed: number
): Chest
```

**Parameters**:
- `dungeonLevel`: Dungeon floor (1-10)
- `rewardTier`: Reward quality (1-5, higher = better)
- `randomSeed`: Random seed for deterministic generation

**Returns**: `Chest` object

```typescript
interface Chest {
  trapped: boolean
  trapType: TrapType | null
  trapDifficulty: number        // 1-10
  contents: ChestContents
  rewardTier: number
}

interface ChestContents {
  gold: number
  items: Item[]                 // 0-2 items
}
```

**Example**:
```typescript
// Low-level chest (dungeon 1, tier 1)
const chest1 = ChestService.generateChest(1, 1, 12345)
// {
//   trapped: true,
//   trapType: 'POISON_NEEDLE',
//   trapDifficulty: 2,
//   contents: {
//     gold: 45,
//     items: [{ name: 'Leather Armor', ...}]
//   },
//   rewardTier: 1
// }

// High-level chest (dungeon 10, tier 5)
const chest2 = ChestService.generateChest(10, 5, 54321)
// {
//   trapped: true,
//   trapType: 'TELEPORTER',
//   trapDifficulty: 9,
//   contents: {
//     gold: 8500,
//     items: [
//       { name: 'Plate Mail +3', ...},
//       { name: 'Shield +2', ...}
//     ]
//   },
//   rewardTier: 5
// }
```

### calculateGoldAmount

Calculate gold amount for chest based on dungeon level and tier.

**Signature**:
```typescript
function calculateGoldAmount(
  dungeonLevel: number,
  rewardTier: number,
  randomSeed: number
): number
```

**Parameters**:
- `dungeonLevel`: Dungeon floor (1-10)
- `rewardTier`: Reward quality (1-5)
- `randomSeed`: Random seed for roll

**Returns**: Gold amount

**Formula**:
```typescript
baseGold = dungeonLevel × 10 × rewardTier
variance = random(50%, 150%)
gold = baseGold × variance
```

**Example**:
```typescript
// Dungeon 1, Tier 1
const gold1 = ChestService.calculateGoldAmount(1, 1, 12345)
// base = 1 × 10 × 1 = 10
// variance = 120% (example)
// gold = 12

// Dungeon 10, Tier 5
const gold2 = ChestService.calculateGoldAmount(10, 5, 54321)
// base = 10 × 10 × 5 = 500
// variance = 180% (example)
// gold = 900
```

### generateTrap

Generate trap for chest based on reward tier.

**Signature**:
```typescript
function generateTrap(
  rewardTier: number,
  randomSeed: number
): TrapInfo | null
```

**Parameters**:
- `rewardTier`: Reward quality (1-5)
- `randomSeed`: Random seed

**Returns**: `TrapInfo` or `null` if no trap

```typescript
interface TrapInfo {
  trapType: TrapType
  difficulty: number    // 1-10
}
```

**Trap Probability by Tier**:
```typescript
Tier 1: 50% trapped
Tier 2: 60% trapped
Tier 3: 70% trapped
Tier 4: 80% trapped
Tier 5: 90% trapped
```

**Trap Distribution**:
```typescript
Low Tier (1-2):
  - Trapless (40-50%)
  - POISON_NEEDLE (20%)
  - GAS_BOMB (15%)
  - CROSSBOW_BOLT (10%)
  - ALARM (10%)
  - Others (5%)

Mid Tier (3-4):
  - CROSSBOW_BOLT (20%)
  - EXPLODING_BOX (20%)
  - STUNNER (20%)
  - POISON_NEEDLE (15%)
  - TELEPORTER (15%)
  - Others (10%)

High Tier (5):
  - TELEPORTER (25%)
  - MAGE_BLASTER (20%)
  - PRIEST_BLASTER (20%)
  - EXPLODING_BOX (15%)
  - All others (20%)
```

**Example**:
```typescript
const trap1 = ChestService.generateTrap(1, 12345)
// { trapType: 'POISON_NEEDLE', difficulty: 2 }

const trap2 = ChestService.generateTrap(5, 54321)
// { trapType: 'TELEPORTER', difficulty: 9 }

const trap3 = ChestService.generateTrap(1, 99999)
// null (no trap)
```

### generateItems

Generate items for chest based on dungeon level and tier.

**Signature**:
```typescript
function generateItems(
  dungeonLevel: number,
  rewardTier: number,
  randomSeed: number
): Item[]
```

**Parameters**:
- `dungeonLevel`: Dungeon floor (1-10)
- `rewardTier`: Reward quality (1-5)
- `randomSeed`: Random seed

**Returns**: Array of 0-2 items

**Item Generation**:
```typescript
// 100% chance for gold (handled separately)

// Item Slot 1 chance
slot1Chance = 10% + (rewardTier × 18%)
// Tier 1: 28%, Tier 5: 100%

// Item Slot 2 chance
slot2Chance = 5% + (rewardTier × 9%)
// Tier 1: 14%, Tier 5: 50%
```

**Item Quality by Dungeon Level**:
```typescript
Level 1-2:  Common items (Leather, Chain, +0 weapons)
Level 3-5:  Uncommon items (Plate, +1 weapons)
Level 6-8:  Rare items (+2 weapons, +2 armor)
Level 9-10: Epic items (+3 weapons, +3 armor, special items)
```

**Example**:
```typescript
// Dungeon 1, Tier 1 (low chance)
const items1 = ChestService.generateItems(1, 1, 12345)
// [{ name: 'Leather Armor', bonus: 0 }]  // 1 item

// Dungeon 10, Tier 5 (high chance)
const items2 = ChestService.generateItems(10, 5, 54321)
// [
//   { name: 'Plate Mail', bonus: 3 },
//   { name: 'Long Sword', bonus: 2 }
// ]  // 2 items
```

### openChest

Open chest and distribute contents to character.

**Signature**:
```typescript
function openChest(
  chest: Chest,
  character: Character,
  party: Party
): OpenChestResult
```

**Parameters**:
- `chest`: Chest to open
- `character`: Character opening chest
- `party`: Current party state

**Returns**: `OpenChestResult`

```typescript
interface OpenChestResult {
  success: boolean
  goldCollected: number
  itemsCollected: Item[]
  itemsDiscarded: Item[]      // Items lost due to full inventory!
  trapTriggered: boolean
  trapDamage: number
  newParty: Party             // Updated party state
}
```

**⚠️ Critical Inventory Management**:
- If character has **full inventory** (8/8 items), items are **discarded silently**
- **No warning message** in original game
- Can lose valuable items permanently

**Example**:
```typescript
const chest = {
  trapped: false,
  contents: {
    gold: 500,
    items: [
      { name: 'Plate Mail +3', value: 5000 },
      { name: 'Shield +2', value: 2000 }
    ]
  }
}

const character = {
  inventory: [/* 8 items - FULL */],
  gold: 100
}

const result = ChestService.openChest(chest, character, party)
// {
//   success: true,
//   goldCollected: 500,
//   itemsCollected: [],
//   itemsDiscarded: [  // ⚠️ LOST FOREVER!
//     { name: 'Plate Mail +3', value: 5000 },
//     { name: 'Shield +2', value: 2000 }
//   ],
//   trapTriggered: false,
//   trapDamage: 0,
//   newParty: { ... }  // Gold added, no items added
// }
```

### calculateInventorySpace

Calculate available inventory space for character.

**Signature**:
```typescript
function calculateInventorySpace(character: Character): number
```

**Parameters**:
- `character`: Character to check

**Returns**: Number of empty inventory slots (0-8)

**Example**:
```typescript
const character = {
  inventory: [
    { name: 'Long Sword' },
    { name: 'Plate Mail' },
    { name: 'Shield' }
  ]
}

const space = ChestService.calculateInventorySpace(character)
// space === 5 (8 max - 3 used = 5 empty)
```

### canAcceptItems

Check if character can accept all items from chest.

**Signature**:
```typescript
function canAcceptItems(
  character: Character,
  items: Item[]
): boolean
```

**Parameters**:
- `character`: Character to check
- `items`: Items to potentially add

**Returns**: `true` if all items fit, `false` if any would be discarded

**Example**:
```typescript
const character = {
  inventory: [/* 7 items */]  // 1 slot free
}

const items = [
  { name: 'Sword' },
  { name: 'Shield' }
]

const canAccept = ChestService.canAcceptItems(character, items)
// canAccept === false (need 2 slots, only 1 available)
```

### getRewardTierProbability

Get probability distribution of reward tiers for dungeon level.

**Signature**:
```typescript
function getRewardTierProbability(dungeonLevel: number): TierProbability
```

**Parameters**:
- `dungeonLevel`: Dungeon floor (1-10)

**Returns**: Probability distribution

```typescript
interface TierProbability {
  tier1: number  // %
  tier2: number  // %
  tier3: number  // %
  tier4: number  // %
  tier5: number  // %
}
```

**Tier Distribution**:
```typescript
Dungeon 1:   Tier 1: 60%, Tier 2: 30%, Tier 3: 10%
Dungeon 3:   Tier 1: 40%, Tier 2: 40%, Tier 3: 20%
Dungeon 5:   Tier 2: 40%, Tier 3: 40%, Tier 4: 20%
Dungeon 8:   Tier 3: 30%, Tier 4: 40%, Tier 5: 30%
Dungeon 10:  Tier 4: 40%, Tier 5: 60%
```

**Example**:
```typescript
const prob = ChestService.getRewardTierProbability(1)
// { tier1: 60, tier2: 30, tier3: 10, tier4: 0, tier5: 0 }

const prob2 = ChestService.getRewardTierProbability(10)
// { tier1: 0, tier2: 0, tier3: 0, tier4: 40, tier5: 60 }
```

## Implementation Details

### Chest Generation

```typescript
export function generateChest(
  dungeonLevel: number,
  rewardTier: number,
  randomSeed: number
): Chest {
  // Generate trap
  const trapInfo = generateTrap(rewardTier, randomSeed)

  // Generate contents
  const gold = calculateGoldAmount(dungeonLevel, rewardTier, randomSeed + 1)
  const items = generateItems(dungeonLevel, rewardTier, randomSeed + 2)

  return {
    trapped: trapInfo !== null,
    trapType: trapInfo?.trapType ?? null,
    trapDifficulty: trapInfo?.difficulty ?? 0,
    contents: {
      gold,
      items
    },
    rewardTier
  }
}
```

### Item Range Bug

**Known Issue**: Original Wizardry 1 has off-by-one error in item selection

```typescript
// Intended ranges
const INTENDED_RANGES = [
  { min: 1, max: 16 },
  { min: 17, max: 32 },
  { min: 33, max: 51 },
  { min: 52, max: 79 },
  { min: 80, max: 93 }
]

// Actual implementation (bug)
const ACTUAL_RANGES = [
  { min: 1, max: 15 },   // Item 16 skipped
  { min: 17, max: 31 },  // Item 32 skipped
  { min: 33, max: 50 },  // Item 51 skipped
  { min: 52, max: 78 },  // Item 79 skipped
  { min: 80, max: 92 }   // Item 93 skipped
]

// Result: Items 16, 32, 51, 79, 93 are UNOBTAINABLE as chest drops
```

**For Faithful Recreation**: Implement the bug
**For Fixed Version**: Use intended ranges

### Inventory Management

```typescript
export function openChest(
  chest: Chest,
  character: Character,
  party: Party
): OpenChestResult {
  const result: OpenChestResult = {
    success: true,
    goldCollected: 0,
    itemsCollected: [],
    itemsDiscarded: [],
    trapTriggered: false,
    trapDamage: 0,
    newParty: party
  }

  // Trigger trap if present
  if (chest.trapped && chest.trapType) {
    result.trapTriggered = true
    result.trapDamage = TrapService.calculateTrapDamage(
      chest.trapType,
      character,
      randomSeed
    )
    // Apply damage and status effects to character/party
  }

  // Collect gold (always works)
  result.goldCollected = chest.contents.gold
  party.gold += chest.contents.gold

  // Attempt to collect items
  const inventorySpace = calculateInventorySpace(character)

  for (const item of chest.contents.items) {
    if (character.inventory.length < 8) {
      // Space available - collect item
      character.inventory.push(item)
      result.itemsCollected.push(item)
    } else {
      // Inventory full - DISCARD ITEM SILENTLY
      result.itemsDiscarded.push(item)
      // ⚠️ NO WARNING MESSAGE IN ORIGINAL GAME
    }
  }

  result.newParty = party
  return result
}
```

## Reward Tier System

### Tier 1 (Common)
**Trap Chance**: 50%
**Gold**: Low (10-100)
**Item Slot 1**: 28% chance
**Item Slot 2**: 14% chance
**Common Traps**: Poison Needle, Gas Bomb, Alarm
**Common Items**: Leather, Chain, +0 weapons

### Tier 2 (Uncommon)
**Trap Chance**: 60%
**Gold**: Medium (50-300)
**Item Slot 1**: 46% chance
**Item Slot 2**: 23% chance
**Common Traps**: Crossbow Bolt, Poison Needle
**Common Items**: Chain, Plate, +1 weapons

### Tier 3 (Rare)
**Trap Chance**: 70%
**Gold**: Good (100-600)
**Item Slot 1**: 64% chance
**Item Slot 2**: 32% chance
**Common Traps**: Exploding Box, Stunner, Teleporter
**Common Items**: Plate, +1/+2 weapons, +1 armor

### Tier 4 (Epic)
**Trap Chance**: 80%
**Gold**: High (300-1500)
**Item Slot 1**: 82% chance
**Item Slot 2**: 41% chance
**Common Traps**: Teleporter, Mage Blaster, Priest Blaster
**Common Items**: +2 weapons, +2 armor, special items

### Tier 5 (Legendary)
**Trap Chance**: 90%
**Gold**: Very High (500-5000)
**Item Slot 1**: 100% chance (guaranteed)
**Item Slot 2**: 50% chance
**Common Traps**: Teleporter, Mage/Priest Blaster
**Common Items**: +3 weapons, +3 armor, unique items

## Strategic Considerations

### When to Open Chests

✅ **Always Safe**:
- Character has empty inventory slots
- Trap has been disarmed
- Party is at full HP/spells

⚠️ **Risky**:
- Character has full inventory (WILL LOSE ITEMS)
- Trap is still active
- Low HP party

❌ **Never Open**:
- Teleporter trap and party is deep in dungeon
- Anti-Mage/Priest trap and caster has low HP
- Inventory is full and chest is high-tier (valuable items)

### Inventory Management Strategy

**Before Opening Chest**:
1. Identify trap and disarm if possible
2. **Drop unnecessary items** to make space
3. Ensure character has at least 2 empty slots
4. Open chest
5. Retrieve dropped items

**Best Opener**:
- Fighter or other non-caster (can tank damage)
- Has empty inventory slots
- High HP (can survive trap)

### Chest Value Assessment

**Skip Low-Value Chests**:
- Tier 1 chests on dungeon 1-2 (minimal reward)
- Any chest with Teleporter trap (too risky)

**Always Open High-Value Chests**:
- Tier 4-5 chests on dungeon 8-10 (best items)
- After successfully disarming
- When inventory is managed

## Dependencies

Uses:
- `TrapService` (for trap generation, damage calculation)
- `ItemService` (for item generation)
- `RandomService` (for all random rolls)

No dependencies on combat or navigation.

## Testing

**Test File**: `tests/services/ChestService.test.ts`

**Key Test Cases**:

1. **Chest generation**
   ```typescript
   test('generates chest with appropriate tier', () => {
     const chest = ChestService.generateChest(5, 3, 12345)
     expect(chest.rewardTier).toBe(3)
     expect(chest.contents.gold).toBeGreaterThan(0)
   })
   ```

2. **Gold calculation**
   ```typescript
   test('higher level = more gold', () => {
     const gold1 = ChestService.calculateGoldAmount(1, 1, 12345)
     const gold10 = ChestService.calculateGoldAmount(10, 1, 12345)
     expect(gold10).toBeGreaterThan(gold1)
   })
   ```

3. **Inventory management**
   ```typescript
   test('discards items when inventory full', () => {
     const character = {
       inventory: new Array(8).fill({ name: 'Item' })  // Full
     }
     const chest = {
       trapped: false,
       contents: {
         gold: 100,
         items: [{ name: 'Sword +3' }]
       }
     }

     const result = ChestService.openChest(chest, character, party)
     expect(result.itemsCollected).toHaveLength(0)
     expect(result.itemsDiscarded).toHaveLength(1)
     expect(result.itemsDiscarded[0].name).toBe('Sword +3')
   })
   ```

4. **Tier probability**
   ```typescript
   test('dungeon 1 has no tier 5 chests', () => {
     const prob = ChestService.getRewardTierProbability(1)
     expect(prob.tier5).toBe(0)
   })

   test('dungeon 10 has tier 4-5 only', () => {
     const prob = ChestService.getRewardTierProbability(10)
     expect(prob.tier1).toBe(0)
     expect(prob.tier2).toBe(0)
     expect(prob.tier3).toBe(0)
   })
   ```

## Related

**Services**:
- [TrapService](./TrapService.md) - Trap mechanics
- [ItemService](./ItemService.md) - Item generation
- [LootService](./LootService.md) - Combat loot distribution

**Commands**:
- [OpenChestCommand](../commands/OpenChestCommand.md) - Uses this service
- [InspectChestCommand](../commands/InspectChestCommand.md) - Chest inspection

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Chest mechanics
- [Equipment Reference](../research/equipment-reference.md) - Item database

**Game Design**:
- [Traps & Chests](../game-design/08-traps-chests.md) - Player guide

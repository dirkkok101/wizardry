# OpenChestCommand

**Command to open treasure chest and collect contents.**

## Responsibility

Opens chest and distributes treasure (gold and items) to party. If chest is trapped, triggers trap effects. Handles critical inventory management - **items are silently discarded if character's inventory is full**.

## Command Structure

```typescript
class OpenChestCommand implements Command {
  constructor(
    characterIndex: number,
    chestId: string
  )

  execute(state: GameState): GameState
}
```

## Parameters

**characterIndex**: Index of character who opens chest (0-5)
**chestId**: Unique identifier of chest to open

## Validation

### Preconditions

**Character Exists**:
```typescript
if (characterIndex < 0 || characterIndex >= party.members.length) {
  throw new InvalidCharacterError('Character index out of range')
}
```

**Character Is Alive**:
```typescript
if (character.hp <= 0) {
  throw new CharacterDeadError('Dead characters cannot open chests')
}
```

**Chest Exists**:
```typescript
const chest = findChest(state, chestId)
if (!chest) {
  throw new ChestNotFoundError('No chest at this location')
}
```

**Chest Not Already Opened**:
```typescript
if (chest.opened) {
  throw new ChestAlreadyOpenedError('Chest has already been opened')
}
```

**Not In Combat**:
```typescript
if (state.combatState) {
  throw new InvalidStateError('Cannot open chests during combat')
}
```

## Execution

### 1. Trigger Trap (If Present)

```typescript
if (chest.trapped && chest.trapType) {
  const trapDamage = TrapService.calculateTrapDamage(
    chest.trapType,
    character,
    state.randomSeed
  )

  // Apply damage
  character.hp = Math.max(0, character.hp - trapDamage)

  // Apply status effects
  applyTrapStatusEffects(character, chest.trapType)

  // Handle special traps
  if (chest.trapType === 'TELEPORTER') {
    teleportParty(state, randomLocation)
  } else if (chest.trapType === 'ALARM') {
    triggerMonsterEncounter(state)
  }
}
```

### 2. Collect Gold

```typescript
// Gold always collected successfully
party.gold += chest.contents.gold
```

### 3. Collect Items (⚠️ Critical Section)

```typescript
const inventorySpace = ChestService.calculateInventorySpace(character)
const itemsToCollect = chest.contents.items

const itemsCollected = []
const itemsDiscarded = []  // ⚠️ LOST FOREVER

for (const item of itemsToCollect) {
  if (character.inventory.length < 8) {
    // Space available
    character.inventory.push(item)
    itemsCollected.push(item)
  } else {
    // ⚠️ INVENTORY FULL - ITEM DISCARDED SILENTLY
    itemsDiscarded.push(item)
    // NO WARNING MESSAGE IN ORIGINAL GAME
  }
}
```

### 4. Mark Chest as Opened

```typescript
chest.opened = true
chest.openedBy = character.id
chest.trapped = false  // Trap is gone (triggered or disarmed)
```

## State Changes

### Update Character State

```typescript
newState.party.members[characterIndex] = {
  ...character,
  hp: newHP,  // After trap damage
  status: updatedStatus,  // After trap status effects
  inventory: updatedInventory  // After collecting items
}
```

### Update Party State

```typescript
newState.party.gold += chest.contents.gold
```

### Update Chest State

```typescript
newState.chests[chestId] = {
  ...chest,
  opened: true,
  openedBy: character.id,
  trapped: false,
  contents: { gold: 0, items: [] }  // Emptied
}
```

### Create Event

```typescript
const event = {
  type: 'CHEST_OPENED',
  characterId: character.id,
  chestId,
  trapTriggered: chest.trapped,
  trapType: chest.trapType,
  trapDamage,
  goldCollected: chest.contents.gold,
  itemsCollected: itemsCollected.map(i => i.id),
  itemsDiscarded: itemsDiscarded.map(i => i.id),  // Track losses!
  timestamp: Date.now()
}
```

## Examples

### Example 1: Safe Chest, Full Inventory (⚠️ Critical)

```typescript
const state = {
  party: {
    members: [
      {
        id: 'fighter-1',
        name: 'Greedy',
        hp: 50,
        inventory: [
          { name: 'Long Sword' },
          { name: 'Plate Mail' },
          { name: 'Shield' },
          { name: 'Helmet' },
          { name: 'Potion' },
          { name: 'Potion' },
          { name: 'Potion' },
          { name: 'Rope' }
        ]  // 8/8 FULL!
      }
    ],
    gold: 100
  },
  chests: {
    'chest-1': {
      trapped: false,
      contents: {
        gold: 500,
        items: [
          { name: 'Murasama Blade +5', value: 50000 },
          { name: 'Shield +3', value: 10000 }
        ]
      }
    }
  }
}

const command = new OpenChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Output: "Greedy opens the chest!"
// Output: "Collected 500 gold"
// ⚠️ NO MESSAGE ABOUT ITEMS
// newState.party.gold === 600
// newState.party.members[0].inventory.length === 8 (still full)
// Murasama Blade +5 and Shield +3 LOST FOREVER!
```

### Example 2: Trapped Chest, Party Survives

```typescript
const state = {
  party: {
    members: [
      { id: 'thief-1', name: 'Reckless', hp: 20, inventory: [] }
    ],
    gold: 50
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'CROSSBOW_BOLT',
      trapDifficulty: 5,
      contents: {
        gold: 200,
        items: [{ name: 'Dagger +1', value: 500 }]
      }
    }
  }
}

const command = new OpenChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Output: "Reckless opens the chest!"
// Output: "CROSSBOW_BOLT trap triggered!"
// Damage: 2d8 = 10 (example roll)
// Output: "Reckless takes 10 damage!"
// newState.party.members[0].hp === 10
// Output: "Collected 200 gold"
// Output: "Found: Dagger +1"
// newState.party.gold === 250
// newState.party.members[0].inventory === [{ name: 'Dagger +1' }]
```

### Example 3: TELEPORTER Trap (Worst Case)

```typescript
const state = {
  party: {
    members: [
      { id: 'mage-1', name: 'Curious', hp: 15 }
    ],
    position: { x: 10, y: 15, level: 5 }
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'TELEPORTER',
      contents: {
        gold: 1000,
        items: [{ name: 'Staff +2' }]
      }
    }
  }
}

const command = new OpenChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Output: "Curious opens the chest!"
// Output: "TELEPORTER trap triggered!"
// Output: "The party is teleported!"
// newState.party.position = { x: 3, y: 8, level: 7 }  // Random!
// Risk: Could teleport INTO WALL = instant party death
// Risk: Could teleport to dangerous level
// If survived teleport:
// Output: "Collected 1000 gold"
// Output: "Found: Staff +2"
```

### Example 4: Inventory Management Strategy

```typescript
const state = {
  party: {
    members: [
      {
        id: 'fighter-1',
        name: 'Smart',
        inventory: [
          { name: 'Long Sword' },
          { name: 'Plate Mail' },
          { name: 'Shield' },
          { name: 'Helmet' },
          { name: 'Gauntlets' },
          { name: 'Boots' }
        ]  // 6/8 items - 2 slots free
      }
    ]
  },
  chests: {
    'chest-1': {
      trapped: false,
      contents: {
        gold: 500,
        items: [
          { name: 'Long Sword +3', value: 5000 },
          { name: 'Shield +2', value: 2000 }
        ]
      }
    }
  }
}

const command = new OpenChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Output: "Smart opens the chest!"
// Output: "Collected 500 gold"
// Output: "Found: Long Sword +3"
// Output: "Found: Shield +2"
// newState.party.members[0].inventory.length === 8 (now full)
// Both items collected successfully!
```

## Critical Warning: Inventory Management

### The Silent Discard Bug

**⚠️ CRITICAL GAME MECHANIC**:

If character has **full inventory** (8/8 items), any items in chest are **discarded permanently** with **NO WARNING**.

**Original Wizardry 1 Behavior**:
- No message like "Inventory full!"
- No prompt like "Drop an item?"
- Items just vanish silently
- Can lose priceless artifacts this way

**Player Strategy**:
1. **Before opening chest**: Check character inventory
2. **Drop unnecessary items** to make space
3. **Ensure 2-3 empty slots** (chests can have 0-2 items)
4. **After opening**: Pick up dropped items

### Inventory Management Workflow

**Safe Opening Sequence**:
```
1. Inspect chest (identify trap)
2. Disarm trap if needed
3. Check opener's inventory
4. Drop 2-3 items on ground if needed
5. Open chest
6. Collect treasure
7. Pick up dropped items
```

## Trap Effects by Type

### POISON_NEEDLE
**Damage**: 1d6
**Status**: Poison (continue losing HP after combat)
**Target**: Character opening chest
**Severity**: Low

### GAS_BOMB
**Damage**: 2d6 to entire party
**Status**: Poison to all party members
**Target**: Entire party
**Severity**: Medium

### CROSSBOW_BOLT
**Damage**: 2d8
**Status**: None
**Target**: Character opening chest
**Severity**: Medium

### EXPLODING_BOX
**Damage**: 3d6 to entire party
**Status**: None
**Target**: Entire party
**Severity**: High

### STUNNER
**Damage**: 1d4
**Status**: Paralysis
**Target**: Character opening chest
**Severity**: Medium (paralysis is dangerous)

### TELEPORTER
**Damage**: None
**Status**: None
**Effect**: Teleports entire party to random dungeon location
**Target**: Entire party
**Severity**: CRITICAL (can teleport into walls = death)

### MAGE_BLASTER
**Damage**: 4d6
**Status**: None
**Target**: Mages and Bishops only (others immune)
**Severity**: High (can one-shot low-level mages)

### PRIEST_BLASTER
**Damage**: 4d6
**Status**: None
**Target**: Priests, Bishops, Lords only (others immune)
**Severity**: High (can one-shot low-level priests)

### ALARM
**Damage**: None
**Status**: None
**Effect**: Triggers immediate monster encounter
**Target**: Entire party (combat state)
**Severity**: Medium (depends on monster strength)

## Strategic Considerations

### Who Should Open?

**Best**: Fighter or high-HP character
- Can survive trap damage
- Not vulnerable to class-specific traps

**Avoid**: Mages or Priests if MAGE_BLASTER/PRIEST_BLASTER suspected

**Critical**: Character must have **empty inventory slots**

### When to Open Without Disarming?

✅ **Safe to Risk**:
- POISON_NEEDLE (low damage, easy cure)
- CROSSBOW_BOLT (moderate damage, no status)
- High-level party (can tank damage)

⚠️ **Risky**:
- GAS_BOMB (party-wide damage)
- STUNNER (paralysis is dangerous)
- MAGE/PRIEST_BLASTER (if you have those classes)

❌ **Never Risk**:
- TELEPORTER (can instantly kill entire party)
- ALARM (if party is low HP/spells)
- Any trap if party is critically damaged

### Optimal Opening Workflow

**Safe Approach** (Recommended):
1. Thief inspects → Identifies trap type
2. Priest casts CALFO → Confirms trap type
3. Thief disarms → 95% success
4. Fighter opens → Collects treasure safely

**Risky Approach** (High Level):
1. Fighter just opens
2. Tank trap damage
3. Collect treasure
4. Heal afterwards

**Desperate Approach** (Dangerous):
1. Open without inspection/disarm
2. Hope for no trap
3. If trap, hope to survive

## Error Handling

**Character Index Out of Range**:
```typescript
throw new InvalidCharacterError(
  `Character index ${characterIndex} out of range`
)
```

**Dead Character**:
```typescript
throw new CharacterDeadError(
  `${character.name} is dead and cannot open chests`
)
```

**Chest Not Found**:
```typescript
throw new ChestNotFoundError(
  `No chest found with ID: ${chestId}`
)
```

**Already Opened**:
```typescript
throw new ChestAlreadyOpenedError(
  'This chest has already been opened and looted'
)
```

**In Combat**:
```typescript
throw new InvalidStateError(
  'Cannot open chests during combat'
)
```

## Related

**Services**:
- [ChestService](../services/ChestService.md) - Chest opening, inventory management
- [TrapService](../services/TrapService.md) - Trap damage calculation

**Commands**:
- [InspectChestCommand](./InspectChestCommand.md) - Inspect before opening
- [DisarmTrapCommand](./DisarmTrapCommand.md) - Disarm before opening

**Game Design**:
- [Traps & Chests](../game-design/08-traps-chests.md) - Player guide

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Trap formulas

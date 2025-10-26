# Town System

**Comprehensive overview of town services: Inn, Temple, Shop, and Training Grounds.**

## Overview

The town is the **safe zone** where parties rest, resurrect, buy equipment, and manage roster.

**Key Concepts**:
- Four main services: Inn, Temple, Shop, Training Grounds
- Cannot save in dungeon (must return to town)
- Resurrection only available at temple
- Equipment bought/sold at shop
- Training Grounds for character creation and party formation
- Town is Level 0 (dungeon starts at Level 1)

## Architecture

### Services Involved

- **TownService** - Town state management, service access
- **InnService** - Resting, HP/spell point restoration
- **TempleService** - Resurrection, status effect curing, donation
- **ShopService** - Buy/sell equipment, inventory management
- **TrainingService** - Roster management, character creation, party formation, level-up
- **CharacterService** - Stat changes, level-up calculations

### Commands Involved

- **EnterTownCommand** - Enter town from dungeon
- **RestAtInnCommand** - Rest at inn
- **VisitTempleCommand** - Enter temple
- **ResurrectCharacterCommand** - Temple resurrection
- **CureStatusCommand** - Temple cure poison/paralysis/etc
- **VisitShopCommand** - Enter shop
- **BuyItemCommand** - Purchase equipment
- **SellItemCommand** - Sell equipment
- **VisitTrainingCommand** - Enter training grounds
- **CreateCharacterCommand** - Create new character
- **FormPartyCommand** - Create/modify party
- **LevelUpCharacterCommand** - Level up character

### Data Structures

```typescript
interface TownState {
  currentService: TownService | null    // Active service
  party: Party | null                   // Current party (if formed)
  availableServices: TownService[]      // Inn, Temple, Shop, Training
}

type TownService = 'inn' | 'temple' | 'shop' | 'training' | 'none'

interface InnPricing {
  stables: number                       // Free (but risky)
  cot: number                           // 10 gold per person
  economy: number                       // 50 gold per person
  merchant: number                      // 200 gold per person
  royal: number                         // 500 gold per person
}

interface TemplePricing {
  resurrect: number                     // 250 gold
  raiseAshes: number                    // 500 gold
  curePoison: number                    // 50 gold
  cureParalysis: number                 // 100 gold
  restoreMana: number                   // 100 gold (rare)
  donation: number                      // Any amount
}

interface ShopInventory {
  weapons: Item[]
  armor: Item[]
  shields: Item[]
  accessories: Item[]
  consumables: Item[]
}
```

## Inn Services

### Resting Options

**Stables** (Free):
- Restores ALL HP
- Restores ALL spell points
- Ages characters (1d10 weeks)
- 5% chance of random encounter (can die)
- Cheapest but riskiest

**Cot** (10 gold per person):
- Restores ALL HP
- Restores ALL spell points
- Ages characters (1 week)
- Safe (no encounters)
- Budget option

**Economy Room** (50 gold per person):
- Restores ALL HP
- Restores ALL spell points
- Ages characters (1 day)
- Safe
- Standard option

**Merchant Suite** (200 gold per person):
- Restores ALL HP
- Restores ALL spell points
- Minimal aging (1 hour)
- Safe
- Luxury option

**Royal Suite** (500 gold per person):
- Restores ALL HP
- Restores ALL spell points
- No aging
- Safe
- Premium option

### Rest Mechanics

**HP Restoration**:
```typescript
function restoreHP(character: Character): Character {
  return {
    ...character,
    hp: character.maxHP
  }
}
```

**Spell Point Restoration**:
```typescript
function restoreSpellPoints(character: Character): Character {
  const maxMagePoints = calculateMaxSpellPoints(character, 'mage')
  const maxPriestPoints = calculateMaxSpellPoints(character, 'priest')

  return {
    ...character,
    mageSpellPoints: new Map(maxMagePoints),
    priestSpellPoints: new Map(maxPriestPoints)
  }
}
```

**Aging**:
```typescript
function ageCharacter(
  character: Character,
  roomType: InnRoomType
): Character {
  const agingTable = {
    stables: random(1, 10),    // 1-10 weeks
    cot: 1,                    // 1 week
    economy: 0.1,              // 1 day (0.1 week)
    merchant: 0.01,            // 1 hour (0.01 week)
    royal: 0                   // No aging
  }

  const weeksAged = agingTable[roomType]
  const newAge = character.age + (weeksAged / 52)  // Convert weeks to years

  return {
    ...character,
    age: newAge
  }
}
```

### Stables Encounter

**Encounter Chance**: 5% per rest

**Encounter Process**:
1. Roll d100
2. If ≤ 5, trigger encounter
3. Generate random monster group (Level 1-3)
4. Enter combat state
5. If party dies, lose characters
6. If victory, no healing (encounter interrupted rest)

## Temple Services

### Resurrection

**Dead → Alive**:
- Cost: 250 gold
- Success: ~90%
- Failure: Character turns to ashes
- Cannot resurrect ashes (use KADORTO or temple raise)

**Process**:
```typescript
function resurrectCharacter(character: Character): ResurrectionResult {
  if (character.status.includes('ashes')) {
    return { success: false, error: 'Character is ashes, need raise ashes' }
  }

  if (!character.status.includes('dead')) {
    return { success: false, error: 'Character not dead' }
  }

  const success = random(1, 100) <= 90

  if (success) {
    return {
      success: true,
      character: {
        ...character,
        status: character.status.filter(s => s !== 'dead'),
        hp: 1  // Resurrected with 1 HP
      }
    }
  } else {
    return {
      success: false,
      character: {
        ...character,
        status: [...character.status.filter(s => s !== 'dead'), 'ashes']
      },
      error: 'Resurrection failed, character turned to ashes'
    }
  }
}
```

### Raise Ashes

**Ashes → Alive**:
- Cost: 500 gold
- Success: ~50%
- Failure: Character LOST FOREVER
- Very risky

**Process**:
```typescript
function raiseAshes(character: Character): RaiseResult {
  if (!character.status.includes('ashes')) {
    return { success: false, error: 'Character not ashes' }
  }

  const success = random(1, 100) <= 50

  if (success) {
    return {
      success: true,
      character: {
        ...character,
        status: character.status.filter(s => s !== 'ashes'),
        hp: 1
      }
    }
  } else {
    return {
      success: false,
      lostForever: true,
      error: 'Raise failed, character lost forever'
    }
  }
}
```

### Status Effect Curing

**Cure Poison** (50 gold):
- Removes poison status
- Stops HP drain
- Instant effect

**Cure Paralysis** (100 gold):
- Removes paralysis status
- Character can act again
- Instant effect

**Cure Silence** (free, automatic after combat):
- Silence only lasts during combat
- No temple service needed

**Cure Petrification** (200 gold):
- Removes stone status
- Character alive again
- Rare status

### Donation

**Tithe to Temple**:
- Any amount (1-10,000 gold)
- Increases alignment toward Good
- May unlock special blessings (implementation detail)
- No direct mechanical benefit

**Alignment Shift**:
```typescript
function donate(character: Character, amount: number): Character {
  if (amount >= 1000) {
    // Large donation shifts toward Good
    if (character.alignment === 'Evil') {
      return { ...character, alignment: 'Neutral' }
    } else if (character.alignment === 'Neutral') {
      return { ...character, alignment: 'Good' }
    }
  }
  return character
}
```

## Shop Services

### Shop Inventory

**Available Items**:
- Weapons (all types)
- Armor (all types)
- Shields (small to large)
- Helmets
- Gauntlets
- Accessories (rings, amulets)
- Consumables (potions, scrolls)

**Stock Changes**:
- Fixed inventory (same items always available)
- No random stock
- Unlimited quantity (can buy multiple)

### Buying Equipment

**Purchase Process**:
1. Select character (for equipment restrictions check)
2. Browse shop categories
3. Select item
4. Check price vs. party gold
5. Validate character can use item (class restrictions)
6. Deduct gold, add item to party inventory
7. Character can equip immediately or later

**Class Restrictions**:
```typescript
function canUseItem(character: Character, item: Item): boolean {
  if (!item.classRestrictions) return true

  return item.classRestrictions.includes(character.class)
}
```

**Price Formula**:
```
BuyPrice = BasePrice × 1.0  // No markup
```

### Selling Equipment

**Sell Process**:
1. Select item from party inventory or character equipment
2. Shop offers price (50% of base price)
3. Confirm sale
4. Item removed, gold added to party

**Sell Price Formula**:
```
SellPrice = BasePrice × 0.5  // 50% of base price
```

**Cannot Sell**:
- Quest items
- Cursed items (stuck to character)
- Unique items (implementation detail: allowed)

### Identify Items

**Identification**:
- Unknown items show as "Unknown Sword +?"
- Bishop can identify for free (special ability)
- Shop charges 100 gold to identify
- Reveals item name, bonuses, curse status

**Identify Process**:
```typescript
function identifyItem(item: Item): Item {
  return {
    ...item,
    identified: true
  }
}
```

## Training Grounds Services

### Character Creation

**Create New Character**:
- Enter name (1-15 chars)
- Select race (Human, Elf, Dwarf, Gnome, Hobbit)
- Roll bonus points (7-29 range)
- Allocate stats
- Select alignment
- Select class
- Save to roster (max 20 characters)

See [Character Creation System](./character-creation-system.md) for full details.

### Party Formation

**Form Party**:
1. Select up to 6 characters from roster
2. Assign to front row (max 3) or back row (max 3)
3. Confirm party
4. Party ready to enter dungeon

**Modify Party**:
- Add character (if <6 in party)
- Remove character
- Change formation (front ↔ back)

**Restrictions**:
- Must have at least 1 character
- Cannot form party with all dead characters
- Cannot add character already in another party (single party system)

### Level Up

**Level Up Process**:
1. Character returns from dungeon with enough XP
2. Visit Training Grounds
3. Select character
4. Pay level-up fee (varies by level)
5. Roll stat increases
6. Learn new spells (if caster)
7. Recalculate HP, spell points, attacks per round

**Level Up Fee**:
```
Fee = NewLevel × 1000 gold

Examples:
- Level 1 → 2: 2,000 gold
- Level 2 → 3: 3,000 gold
- Level 5 → 6: 6,000 gold
```

**Stat Increases**:
```typescript
function rollStatIncreases(character: Character): Character {
  const statGainChance = (130 - character.age) / 100
  const stats = { ...character.stats }

  for (const stat of ['str', 'int', 'pie', 'vit', 'agi', 'luc']) {
    // 75% base chance per stat
    if (random(1, 100) <= 75 * statGainChance) {
      stats[stat] += 1  // Increase by 1
    }
  }

  return { ...character, stats }
}
```

## State Transitions

### Town State Machine

```
DUNGEON → Exit Stairs → TOWN (at entrance)
TOWN → Enter Dungeon → NAVIGATION (Level 1)

TOWN → Inn → Rest → TOWN
TOWN → Temple → Service → TOWN
TOWN → Shop → Transaction → TOWN
TOWN → Training → Character/Party Management → TOWN

Cannot enter dungeon if:
  - Party not formed
  - All party members dead
```

### Service Access

**Service Restrictions**:
- **Inn**: Requires party with living members
- **Temple**: Can access with dead party (for resurrection)
- **Shop**: Requires party (for inventory management)
- **Training**: No party required (roster management)

## Pricing Reference

### Inn Prices

| Room Type | Gold Cost | Aging | Encounter Risk |
|-----------|-----------|-------|----------------|
| Stables | Free | 1-10 weeks | 5% |
| Cot | 10/person | 1 week | 0% |
| Economy | 50/person | 1 day | 0% |
| Merchant | 200/person | 1 hour | 0% |
| Royal | 500/person | None | 0% |

### Temple Prices

| Service | Gold Cost | Success Rate |
|---------|-----------|--------------|
| Resurrect | 250 | ~90% |
| Raise Ashes | 500 | ~50% |
| Cure Poison | 50 | 100% |
| Cure Paralysis | 100 | 100% |
| Cure Petrification | 200 | 100% |

### Training Prices

| Service | Gold Cost |
|---------|-----------|
| Create Character | Free |
| Level Up | NewLevel × 1000 |
| Change Class | 5000 |

## Related Documentation

**Services**:
- [InnService](../services/InnService.md) - Resting mechanics
- [TempleService](../services/TempleService.md) - Resurrection, curing
- [ShopService](../services/ShopService.md) - Buy/sell equipment
- [TrainingService](../services/TrainingService.md) - Roster, leveling

**Commands**:
- [RestAtInnCommand](../commands/RestAtInnCommand.md) - Inn rest
- [ResurrectCharacterCommand](../commands/ResurrectCharacterCommand.md) - Temple resurrection
- [BuyItemCommand](../commands/BuyItemCommand.md) - Shop purchase
- [LevelUpCharacterCommand](../commands/LevelUpCharacterCommand.md) - Training level-up

**Game Design**:
- [Town Services](../game-design/07-town.md) - Player guide to town
- [Progression](../game-design/08-progression.md) - Leveling mechanics

**Research**:
- [Combat Formulas](../research/combat-formulas.md) - Level-up stat formula
- [Equipment Reference](../research/equipment-reference.md) - All shop items

**Diagrams**:
- [Game State Machine](../diagrams/game-state-machine.md) - Town state transitions

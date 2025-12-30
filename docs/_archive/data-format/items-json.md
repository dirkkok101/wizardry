# items.json Format

**Equipment and items data file specification.**

## File Location

`src/data/items.json`

## Format

```json
{
  "weapons": [
    {
      "id": "dagger",
      "name": "Dagger",
      "category": "weapon",
      "weaponType": "dagger",
      "damage": { "dice": "1d4", "min": 1, "max": 4 },
      "enhancement": 0,
      "cost": 5,
      "usableBy": ["fighter", "mage", "thief", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    },
    {
      "id": "murasama_blade",
      "name": "Murasama Blade",
      "category": "weapon",
      "weaponType": "sword",
      "damage": { "dice": "10d50", "min": 10, "max": 50 },
      "enhancement": 0,
      "cost": 1000000,
      "usableBy": ["samurai"],
      "cursed": false,
      "depletionChance": 50,
      "transformsTo": null,
      "special": {
        "invoke": "str_bonus",
        "invokeEffect": { "stat": "str", "bonus": 1 }
      }
    },
    {
      "id": "staff_mogref",
      "name": "Staff of Mogref",
      "category": "weapon",
      "weaponType": "staff",
      "damage": { "dice": "1d6", "min": 1, "max": 6 },
      "enhancement": 0,
      "cost": 3000,
      "usableBy": ["mage", "bishop"],
      "cursed": false,
      "depletionChance": 25,
      "transformsTo": "broken_item",
      "special": {
        "invoke": "cast_spell",
        "spellId": "mogref"
      }
    },
    {
      "id": "short_sword_cursed_1",
      "name": "Short Sword -1",
      "category": "weapon",
      "weaponType": "sword",
      "damage": { "dice": "1d6", "min": 1, "max": 6 },
      "enhancement": -1,
      "cost": 1000,
      "usableBy": ["fighter", "thief", "samurai", "lord", "ninja"],
      "cursed": true,
      "special": null
    }
  ],
  "armor": [
    {
      "id": "robes",
      "name": "Robes",
      "category": "armor",
      "armorType": "body",
      "ac": 1,
      "enhancement": 0,
      "cost": 15,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    },
    {
      "id": "lords_garb",
      "name": "Lords Garb",
      "category": "armor",
      "armorType": "body",
      "ac": 10,
      "enhancement": 0,
      "cost": 1000000,
      "usableBy": ["lord"],
      "cursed": false,
      "special": {
        "protections": ["mythical", "dragon", "werebeast", "demon", "undead"],
        "regeneration": 1
      }
    },
    {
      "id": "evil_plate_3",
      "name": "Evil Plate +3",
      "category": "armor",
      "armorType": "body",
      "ac": 9,
      "enhancement": 3,
      "cost": 150000,
      "usableBy": ["fighter", "priest", "samurai", "lord", "ninja"],
      "alignmentRequired": "evil",
      "cursed": false,
      "special": null
    },
    {
      "id": "cursed_robe",
      "name": "Cursed Robe",
      "category": "armor",
      "armorType": "body",
      "ac": -2,
      "enhancement": 0,
      "cost": 8000,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": true,
      "special": null
    }
  ],
  "shields": [
    {
      "id": "small_shield",
      "name": "Small Shield",
      "category": "shield",
      "ac": 2,
      "enhancement": 0,
      "cost": 20,
      "usableBy": ["fighter", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    },
    {
      "id": "shield_3",
      "name": "Shield +3",
      "category": "shield",
      "ac": 6,
      "enhancement": 3,
      "cost": 250000,
      "usableBy": ["fighter", "priest", "thief", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    }
  ],
  "helmets": [
    {
      "id": "helm",
      "name": "Helm",
      "category": "helmet",
      "ac": 1,
      "enhancement": 0,
      "cost": 100,
      "usableBy": ["fighter", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    },
    {
      "id": "diadem_malor",
      "name": "Diadem of Malor",
      "category": "helmet",
      "ac": 2,
      "enhancement": 0,
      "cost": 25000,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": false,
      "depletionChance": 100,
      "transformsTo": "helm",
      "special": {
        "invoke": "cast_spell",
        "spellId": "malor"
      }
    }
  ],
  "gauntlets": [
    {
      "id": "copper_gloves",
      "name": "Copper Gloves",
      "category": "gauntlets",
      "ac": 1,
      "enhancement": 0,
      "cost": 6000,
      "usableBy": ["fighter", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    },
    {
      "id": "silver_gloves",
      "name": "Silver Gloves",
      "category": "gauntlets",
      "ac": 3,
      "enhancement": 0,
      "cost": 60000,
      "usableBy": ["fighter", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    }
  ],
  "accessories": [
    {
      "id": "ring_healing",
      "name": "Ring of Healing",
      "category": "accessory",
      "accessoryType": "ring",
      "cost": 300000,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": {
        "regeneration": 1
      }
    },
    {
      "id": "rod_flame",
      "name": "Rod of Flame",
      "category": "accessory",
      "accessoryType": "rod",
      "cost": 25000,
      "usableBy": ["mage", "bishop", "samurai"],
      "cursed": false,
      "special": {
        "protection": "fire",
        "invoke": "cast_spell",
        "spellId": "mahalito"
      }
    },
    {
      "id": "deadly_ring",
      "name": "Deadly Ring",
      "category": "accessory",
      "accessoryType": "ring",
      "cost": 500000,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": true,
      "special": {
        "regeneration": -3
      }
    }
  ],
  "consumables": [
    {
      "id": "potion_dios",
      "name": "Potion of Curing",
      "category": "consumable",
      "consumableType": "potion",
      "cost": 500,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "singleUse": true,
      "depletionChance": 100,
      "transformsTo": "broken_item",
      "effect": {
        "type": "heal",
        "healing": "1d8"
      }
    },
    {
      "id": "scroll_katino",
      "name": "Scroll of Kanito",
      "category": "consumable",
      "consumableType": "scroll",
      "cost": 500,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "singleUse": true,
      "effect": {
        "type": "cast_spell",
        "spellId": "katino"
      }
    }
  ],
  "special": [
    {
      "id": "bronze_key",
      "name": "Bronze Key",
      "category": "special",
      "specialType": "key",
      "cost": 0,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "purpose": "level_2_access"
    },
    {
      "id": "blue_ribbon",
      "name": "Blue Ribbon",
      "category": "special",
      "specialType": "key",
      "cost": 0,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "purpose": "elevator_access"
    },
    {
      "id": "werdna_amulet",
      "name": "Werdna's Amulet",
      "category": "special",
      "specialType": "legendary",
      "cost": 999999999999,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "alignmentRequired": "evil",
      "cursed": true,
      "special": {
        "ac": 10,
        "invoke": "cast_spell",
        "spellId": "malor",
        "regeneration": 3,
        "protections": ["all"],
        "partyHealing": true
      }
    },
    {
      "id": "broken_item",
      "name": "Broken Item",
      "category": "special",
      "specialType": "broken",
      "cost": 0,
      "usableBy": ["fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"],
      "cursed": false,
      "special": null
    }
  ]
}
```

## Field Definitions

### Required Fields (All Items)

**id**: `string` - Unique item identifier (lowercase with underscores)

**name**: `string` - Display name

**category**: `string` - Item category
- `"weapon"` - Weapons
- `"armor"` - Body armor
- `"shield"` - Shields
- `"helmet"` - Helmets
- `"gauntlets"` - Gauntlets
- `"accessory"` - Rings, amulets, rods
- `"consumable"` - Potions, scrolls
- `"special"` - Keys, quest items, legendary items

**cost**: `number` - Gold cost to buy (sell price = 50% of cost)

**usableBy**: `array` - Classes that can use item
- Classes: "fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"

**cursed**: `boolean` - Is item cursed? (cannot be removed without UNCURSE)

**special**: `object | null` - Special properties (see Special Properties below)

### Category-Specific Fields

#### Weapons

**weaponType**: `string` - Type of weapon
- `"dagger"`, `"sword"`, `"mace"`, `"flail"`, `"staff"`, `"blade"`, `"shuriken"`

**damage**: `object` - Damage dealt
- `dice`: Dice notation string (e.g. "1d4", "10d50")
- `min`: Minimum damage
- `max`: Maximum damage

**enhancement**: `number` - Enhancement bonus (+1, +2, +3, or negative for cursed)

#### Armor

**armorType**: `string` - Type of armor
- `"body"` for body armor

**ac**: `number` - Armor class value (higher = better, max 10)

**enhancement**: `number` - Enhancement bonus

#### Shields

**ac**: `number` - AC bonus from shield

**enhancement**: `number` - Enhancement bonus

#### Helmets

**ac**: `number` - AC bonus from helmet

**enhancement**: `number` - Enhancement bonus

#### Gauntlets

**ac**: `number` - AC bonus from gauntlets

**enhancement**: `number` - Enhancement bonus

#### Accessories

**accessoryType**: `string` - Type of accessory
- `"ring"`, `"amulet"`, `"rod"`

#### Consumables

**consumableType**: `string` - Type of consumable
- `"potion"`, `"scroll"`

**singleUse**: `boolean` - Is item consumed on use?

**effect**: `object` - What happens when used
- `type`: Effect type ("heal", "cast_spell", "remove_status")
- Additional fields based on type

#### Special Items

**specialType**: `string` - Type of special item
- `"key"`, `"quest"`, `"legendary"`

**purpose**: `string` - What the item is used for

### Optional Fields

**alignmentRequired**: `string` - Required alignment to use
- `"good"`, `"neutral"`, `"evil"`

**effectiveAgainst**: `array` - Enemy types item is effective against
- Grants 50% chance enemy attack silently fails (protection)
- Grants 2x damage bonus when attacking protected enemy type
- Examples: `["dragon"]`, `["werebeast"]`, `["undead"]`, `["mage"]`
- Provided by specialty weapons (Dragon Slayer, Were Slayer, Mage Masher, etc.)

**depletionChance**: `number` - Probability (0-100) item breaks/transforms when invoked
- `0`: Never depletes (default for most items)
- `25`: 25% chance (Staff of Mogref when cast)
- `50`: 50% chance (Murasama Blade STR invoke, Lord's Garb party heal)
- `100`: Always depletes (Thieves Dagger class change, Diadem becomes Helm, all consumables)

**transformsTo**: `string` - Item ID this transforms into when depleted
- `null`: Item is destroyed/removed (Thieves Dagger)
- `"helm"`: Becomes basic helm (Diadem of Malor after MALOR cast)
- `"broken_item"`: Becomes broken/useless item (failed scrolls, consumed potions)
- Only applies when depletion occurs

## Special Properties

Special items have a `special` object with various effects:

### Invoke Effects

**invoke**: `string` - What can be invoked
- `"cast_spell"` - Cast a spell
- `"str_bonus"` - Bonus to STR stat
- `"hp_bonus"` - Bonus to HP

**spellId**: `string` - Spell to cast (references spells.json)

**invokeEffect**: `object` - Effect details
- For stat bonuses: `{ stat: "str", bonus: 1 }`

### Passive Effects

**regeneration**: `number` - HP regenerated per round
- Positive = healing (Ring of Healing: +1)
- Negative = damage (Deadly Ring: -3)

**protection**: `string` - Single protection type
- `"fire"`, `"cold"`, `"poison"`, `"undead"`, etc.

**protections**: `array` - Multiple protection types
- `["mythical", "dragon", "werebeast", "demon", "undead"]` for Lords Garb
- `["all"]` for Werdna's Amulet

**ac**: `number` - Additional AC bonus (accessories only)

**partyHealing**: `boolean` - Can heal entire party

## Class Restrictions

**Fighter**: All weapons, all armor, all shields, helmets, gauntlets

**Mage**: Dagger, staff only; robes only; no shields; no helmets (except Diadem)

**Priest**: Blunt weapons only (mace, flail, staff); any armor except helmets; shields allowed

**Thief**: Dagger, short sword; leather armor only; shields allowed; no helmets

**Bishop**: Same as Mage (dagger, staff, robes, no shields)

**Samurai**: All weapons, all armor (like Fighter)

**Lord**: All weapons, all armor (like Fighter)

**Ninja**: Any weapon, but best unarmored; special unarmored AC bonus

## Cursed Items

Cursed items:
- Cannot be removed after equipping
- Provide worse stats than normal versions
- Often expensive to trick players

**Removal Methods**:
- Temple UNCURSE service
- KADILLTO spell (Priest Level 5)

**Common Cursed Items**:
- Weapons: Staff -2, Short Sword -1/-2, Long Sword -1, Mace -1/-2
- Armor: Cursed Robe, Leather -1/-2, Chain -1/-2, Breast Plate -1/-2
- Shields: Shield -1, Shield -2
- Accessories: Cursed Helmet, Deadly Ring (very expensive trap)

## Item Identification

**Unidentified Items**: Found items may be unidentified

**Identification Methods**:
- Bishop's IDENTIFY ability
- Shop identification service (costs gold)
- LATUMOFIS spell (Priest Level 4)

**Always Identify Before Equipping**: Prevents equipping cursed items

## Equipment Strategy

### Early Game (Levels 1-3)
- Basic weapons and armor (5-200 gold each)
- Total ~100-200 gold per character
- Fighter: Long Sword + Chain Mail + Large Shield
- Priest: Anointed Mace + Leather + Small Shield
- Mage: Staff + Robes
- Thief: Short Sword + Leather + Small Shield

### Mid Game (Levels 4-7)
- +1 equipment (1,500-4,000 gold)
- Specialty weapons (Dragon Slayer, Were Slayer: 10,000 gold)
- Protection accessories (5,000-25,000 gold)

### Late Game (Levels 8-10)
- +2/+3 equipment (6,000-250,000 gold)
- Regeneration items (Ring of Healing: 300,000 gold)
- Ultimate gear (Lords Garb, Murasama: 1,000,000 gold each)

### Legendary Items

**Murasama Blade**: 1,000,000 gold
- Samurai only
- 10-50 damage per hit
- STR +1 invoke
- Best weapon in game

**Lords Garb**: 1,000,000 gold
- Lord only
- AC 10
- All protections (mythical, dragon, were, demon, undead)
- Regeneration +1
- Best armor in game

**Werdna's Amulet**: Dropped by Werdna (final boss)
- Evil alignment required
- Cursed (cannot remove)
- AC 10 bonus
- Casts MALOR
- Regeneration +3
- All protections
- Party healing invoke

## Shop Pricing

**Buy Price**: Listed cost in item data

**Sell Price**: 50% of buy price (estimated)

**Identification Cost**: Varies by item value (typically 10% of item cost)

## File Organization

**Individual Item Files**: Each item is stored as a separate JSON file in `data/items/`
- **Naming Convention**: `{item-id}.json` (e.g., `dagger.json`, `murasama_blade.json`, `werdna_amulet.json`)
- **Benefits**:
  - Easy to reference by filename
  - Load items individually as needed
  - Simple to version control and diff
  - Clear separation of concerns

**Example File Path**: `data/items/murasama_blade.json`

## Validation

See [Equipment Reference](../research/equipment-reference.md) for complete validated item list.

All 80+ items cross-referenced against original Wizardry 1 sources.

## Notes

- **Total Items**: 80+ equipment, consumables, and special items
- **Weapons**: 27 weapons (including cursed variants)
- **Armor**: 19 body armor pieces
- **Shields**: 7 shields
- **Helmets**: 5 helmets (priests cannot use except Diadem)
- **Cursed Items**: 15+ cursed traps
- **Legendary Items**: 3 legendary items (Murasama, Lords Garb, Werdna's Amulet)
- **Consumables**: Single-use potions and scrolls (all classes can use)
- **Special Items**: Keys and quest items (Bronze Key, Silver Key, Gold Key, Blue Ribbon)
- **Broken Item**: Result of depleted/consumed items (no effect, minimal value)

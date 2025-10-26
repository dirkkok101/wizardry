# classes.json Format

**Character class data file specification.**

## File Location

`src/data/classes.json`

## Format

```json
{
  "classes": [
    {
      "id": "fighter",
      "name": "Fighter",
      "type": "basic",
      "description": "Master of weapons and armor. Can use any weapon and armor in the game.",
      "requirements": {
        "str": 11
      },
      "alignmentRestrictions": [],
      "equipmentRestrictions": {
        "weapons": [],
        "armor": [],
        "shields": [],
        "helmets": []
      },
      "spellAccess": null,
      "specialAbilities": [],
      "hitDice": "1d10",
      "attacksPerLevel": {
        "1-4": 1,
        "5-9": 2,
        "10-12": 3,
        "13+": 4
      },
      "canIdentifyItems": false,
      "canDispelUndead": false,
      "canCriticalHit": false
    },
    {
      "id": "mage",
      "name": "Mage",
      "type": "basic",
      "description": "Master of arcane magic. Fragile but devastating spellcaster.",
      "requirements": {
        "int": 11
      },
      "alignmentRestrictions": [],
      "equipmentRestrictions": {
        "weapons": ["dagger", "staff"],
        "armor": ["none"],
        "shields": ["none"],
        "helmets": ["none"]
      },
      "spellAccess": {
        "mage": {
          "minLevel": 1,
          "maxLevel": 7
        }
      },
      "specialAbilities": ["spellcasting_mage"],
      "hitDice": "1d4",
      "attacksPerLevel": {
        "1+": 1
      },
      "canIdentifyItems": false,
      "canDispelUndead": false,
      "canCriticalHit": false
    },
    {
      "id": "priest",
      "name": "Priest",
      "type": "basic",
      "description": "Divine spellcaster focused on healing and protection. Cannot use edged weapons.",
      "requirements": {
        "pie": 11
      },
      "alignmentRestrictions": ["good", "evil"],
      "equipmentRestrictions": {
        "weapons": ["mace", "flail", "staff"],
        "armor": [],
        "shields": [],
        "helmets": ["none"]
      },
      "spellAccess": {
        "priest": {
          "minLevel": 1,
          "maxLevel": 7
        }
      },
      "specialAbilities": ["spellcasting_priest", "dispel_undead"],
      "hitDice": "1d8",
      "attacksPerLevel": {
        "1+": 1
      },
      "canIdentifyItems": false,
      "canDispelUndead": true,
      "canCriticalHit": false
    },
    {
      "id": "thief",
      "name": "Thief",
      "type": "basic",
      "description": "Expert at disarming traps and backstabbing enemies. Poor combat otherwise.",
      "requirements": {
        "agi": 11
      },
      "alignmentRestrictions": ["neutral", "evil"],
      "equipmentRestrictions": {
        "weapons": ["dagger", "short_sword", "club"],
        "armor": ["leather", "none"],
        "shields": ["small"],
        "helmets": ["leather"]
      },
      "spellAccess": null,
      "specialAbilities": ["disarm_traps", "backstab"],
      "hitDice": "1d8",
      "attacksPerLevel": {
        "1+": 1
      },
      "canIdentifyItems": false,
      "canDispelUndead": false,
      "canCriticalHit": true
    },
    {
      "id": "bishop",
      "name": "Bishop",
      "type": "elite",
      "description": "Master of both divine and arcane magic. Can identify cursed items. Slower spell progression.",
      "requirements": {
        "str": 12,
        "int": 12,
        "pie": 12
      },
      "alignmentRestrictions": [],
      "equipmentRestrictions": {
        "weapons": ["mace", "flail", "staff"],
        "armor": [],
        "shields": [],
        "helmets": ["none"]
      },
      "spellAccess": {
        "mage": {
          "minLevel": 1,
          "maxLevel": 7
        },
        "priest": {
          "minLevel": 1,
          "maxLevel": 7
        }
      },
      "specialAbilities": ["spellcasting_mage", "spellcasting_priest", "identify_items", "dispel_undead"],
      "hitDice": "1d6",
      "attacksPerLevel": {
        "1+": 1
      },
      "canIdentifyItems": true,
      "canDispelUndead": true,
      "canCriticalHit": false
    },
    {
      "id": "samurai",
      "name": "Samurai",
      "type": "elite",
      "description": "Fighter with mage spells. Excellent combat with magical support.",
      "requirements": {
        "str": 15,
        "int": 11,
        "pie": 10,
        "vit": 14,
        "agi": 10
      },
      "alignmentRestrictions": ["good", "neutral"],
      "equipmentRestrictions": {
        "weapons": [],
        "armor": [],
        "shields": [],
        "helmets": []
      },
      "spellAccess": {
        "mage": {
          "minLevel": 1,
          "maxLevel": 6
        }
      },
      "specialAbilities": ["spellcasting_mage", "critical_hit"],
      "hitDice": "1d10",
      "attacksPerLevel": {
        "1-4": 1,
        "5-9": 2,
        "10-12": 3,
        "13+": 4
      },
      "canIdentifyItems": false,
      "canDispelUndead": false,
      "canCriticalHit": true
    },
    {
      "id": "lord",
      "name": "Lord",
      "type": "elite",
      "description": "Fighter with priest spells. Excellent combat with healing and protection.",
      "requirements": {
        "str": 15,
        "int": 12,
        "pie": 12,
        "vit": 15,
        "agi": 14,
        "luc": 15
      },
      "alignmentRestrictions": ["good"],
      "equipmentRestrictions": {
        "weapons": [],
        "armor": [],
        "shields": [],
        "helmets": []
      },
      "spellAccess": {
        "priest": {
          "minLevel": 1,
          "maxLevel": 6
        }
      },
      "specialAbilities": ["spellcasting_priest", "dispel_undead", "critical_hit"],
      "hitDice": "1d10",
      "attacksPerLevel": {
        "1-4": 1,
        "5-9": 2,
        "10-12": 3,
        "13+": 4
      },
      "canIdentifyItems": false,
      "canDispelUndead": true,
      "canCriticalHit": true
    },
    {
      "id": "ninja",
      "name": "Ninja",
      "type": "elite",
      "description": "Ultimate assassin. Requires all stats at 17. Can decapitate enemies instantly.",
      "requirements": {
        "str": 17,
        "int": 17,
        "pie": 17,
        "vit": 17,
        "agi": 17,
        "luc": 17
      },
      "alignmentRestrictions": ["evil"],
      "equipmentRestrictions": {
        "weapons": ["dagger", "short_sword", "shuriken"],
        "armor": ["leather", "chain", "none"],
        "shields": ["small"],
        "helmets": ["leather"]
      },
      "spellAccess": null,
      "specialAbilities": ["critical_hit", "decapitate", "disarm_traps"],
      "hitDice": "1d8",
      "attacksPerLevel": {
        "1+": 2
      },
      "canIdentifyItems": false,
      "canDispelUndead": false,
      "canCriticalHit": true
    }
  ]
}
```

## Field Definitions

### Required Fields

**id**: `string` - Unique class identifier (lowercase with underscores)
- "fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"

**name**: `string` - Display name (e.g. "Fighter", "Ninja")

**type**: `string` - Class tier
- `"basic"`: Fighter, Mage, Priest, Thief (easier requirements)
- `"elite"`: Bishop, Samurai, Lord, Ninja (harder requirements)

**description**: `string` - Brief class description focusing on role and playstyle

**requirements**: `object` - Minimum attribute requirements
- Keys: "str", "int", "pie", "vit", "agi", "luc"
- Values: Minimum required value (11-17)
- Only includes stats that have requirements (omit stats with no minimum)
- Examples:
  - Fighter: `{ "str": 11 }`
  - Ninja: `{ "str": 17, "int": 17, "pie": 17, "vit": 17, "agi": 17, "luc": 17 }`

**alignmentRestrictions**: `array` - Allowed alignments
- Empty array `[]` = all alignments allowed
- Valid values: "good", "neutral", "evil"
- Examples:
  - Fighter: `[]` (any alignment)
  - Priest: `["good", "evil"]` (no neutral)
  - Lord: `["good"]` (good only)
  - Ninja: `["evil"]` (evil only)

**equipmentRestrictions**: `object` - Allowed equipment by category
- Empty array `[]` = can use all items in category
- Array with items = can ONLY use listed items
- `"none"` = cannot use any items in category
- Categories:
  - `weapons`: Weapon IDs from items.json
  - `armor`: Armor IDs from items.json
  - `shields`: Shield IDs from items.json
  - `helmets`: Helmet IDs from items.json
- Examples:
  - Fighter: All empty arrays (no restrictions)
  - Mage: `{ "weapons": ["dagger", "staff"], "armor": ["none"], ... }`
  - Priest: `{ "weapons": ["mace", "flail", "staff"], "helmets": ["none"] }`

**spellAccess**: `object | null` - Spell casting ability
- `null` if class cannot cast spells (Fighter, Thief, Ninja)
- Object with spell type keys if class can cast:
  - `mage`: Mage spell access
  - `priest`: Priest spell access
- Each spell type has:
  - `minLevel`: Lowest spell level accessible (always 1)
  - `maxLevel`: Highest spell level accessible (6 or 7)
- Examples:
  - Fighter: `null`
  - Mage: `{ "mage": { "minLevel": 1, "maxLevel": 7 } }`
  - Bishop: `{ "mage": { ... }, "priest": { ... } }`
  - Samurai: `{ "mage": { "minLevel": 1, "maxLevel": 6 } }` (limited to 6)

**specialAbilities**: `array` - Special class abilities
- `"spellcasting_mage"`: Can cast mage spells
- `"spellcasting_priest"`: Can cast priest spells
- `"identify_items"`: Can identify cursed items (Bishop only)
- `"dispel_undead"`: Extra effective against undead (Priest, Bishop, Lord)
- `"disarm_traps"`: Can disarm traps (Thief, Ninja)
- `"backstab"`: Bonus damage from behind (Thief)
- `"critical_hit"`: Chance for critical hits (Samurai, Lord, Ninja, Thief)
- `"decapitate"`: Instant kill chance (Ninja only)

**hitDice**: `string` - Hit point die per level
- `"1d4"`: Mage (lowest HP)
- `"1d6"`: Bishop
- `"1d8"`: Priest, Thief, Ninja
- `"1d10"`: Fighter, Samurai, Lord (highest HP)

**attacksPerLevel**: `object` - Attacks per round by level range
- Keys: Level range strings (e.g., "1-4", "5-9", "13+")
- Values: Number of attacks per round
- Examples:
  - Mage: `{ "1+": 1 }` (always 1 attack)
  - Fighter: `{ "1-4": 1, "5-9": 2, "10-12": 3, "13+": 4 }` (scales with level)
  - Ninja: `{ "1+": 2 }` (always 2 attacks)

**canIdentifyItems**: `boolean` - Can identify cursed items?
- `true`: Bishop only
- `false`: All other classes

**canDispelUndead**: `boolean` - Extra effective vs undead?
- `true`: Priest, Bishop, Lord
- `false`: Fighter, Mage, Thief, Samurai, Ninja

**canCriticalHit**: `boolean` - Can perform critical hits/backstabs?
- `true`: Thief, Samurai, Lord, Ninja
- `false`: Fighter, Mage, Priest, Bishop

## Class Changing Mechanics

**Class Change System**: Characters can change class after creation
- **Location**: Training Grounds
- **Cost**: Time (character ages during retraining)
- **Process**:
  1. Character resets to level 1 in new class
  2. All stats reset to racial minimum values
  3. HP reset based on new class hit dice
  4. Spells preserved from previous class
  5. Equipment restrictions apply immediately

**Strategic Use**:
- Create hybrid spell lists (e.g., Mage → Bishop → Fighter for combat mage)
- Accumulate spells from multiple classes
- Final class determines equipment and combat ability

**Popular Builds**:
- **Combat Mage**: Mage → Samurai (mage spells + fighter combat)
- **Combat Priest**: Priest → Lord (priest spells + fighter combat)
- **Mega Caster**: Mage → Priest → Bishop (all spells both schools)

**Restrictions**:
- Must meet new class stat requirements (with racial minimums)
- Must have compatible alignment
- Cannot change if in dungeon
- Character ages 1-3 weeks per class change

## Special Ability Reference

### Spellcasting
- **spellcasting_mage**: Access to offensive, utility, and transformation magic
- **spellcasting_priest**: Access to healing, buffs, and holy damage
- Classes: Mage (1-7), Priest (1-7), Bishop (1-7 both), Samurai (Mage 1-6), Lord (Priest 1-6)

### Combat Abilities
- **critical_hit**: Chance for bonus damage on successful hit
- **decapitate**: Chance for instant kill (Ninja only, extremely rare)
- **backstab**: Bonus damage when attacking from behind (Thief only)

### Utility Abilities
- **identify_items**: Detect cursed items before equipping (Bishop only)
- **disarm_traps**: Attempt to disarm chest/door traps (Thief, Ninja)
- **dispel_undead**: Bonus damage and special abilities vs undead (Priest, Bishop, Lord)

## Equipment Restrictions by Class

### Weapons

| Class | Allowed Weapons |
|-------|----------------|
| Fighter | All |
| Mage | Dagger, Staff only |
| Priest | Mace, Flail, Staff only (no edged weapons) |
| Thief | Dagger, Short Sword, Club |
| Bishop | Mace, Flail, Staff only |
| Samurai | All |
| Lord | All |
| Ninja | Dagger, Short Sword, Shuriken |

### Armor

| Class | Allowed Armor |
|-------|---------------|
| Fighter | All |
| Mage | None |
| Priest | All |
| Thief | Leather only |
| Bishop | All |
| Samurai | All |
| Lord | All |
| Ninja | Leather, Chain |

### Shields

| Class | Allowed Shields |
|-------|----------------|
| Fighter | All |
| Mage | None |
| Priest | All |
| Thief | Small only |
| Bishop | All |
| Samurai | All |
| Lord | All |
| Ninja | Small only |

### Helmets

| Class | Allowed Helmets |
|-------|----------------|
| Fighter | All |
| Mage | None |
| Priest | None |
| Thief | Leather only |
| Bishop | None |
| Samurai | All |
| Lord | All |
| Ninja | Leather only |

## Class Tier Comparison

### Basic Classes
- **Requirements**: Single stat ≥ 11
- **Creation**: Easy with most bonus rolls
- **Specialization**: Focused on one role
- **Learning Curve**: Straightforward

### Elite Classes
- **Requirements**: Multiple high stats (12-17)
- **Creation**: Requires excellent bonus rolls (18-56 points)
- **Specialization**: Hybrid capabilities
- **Learning Curve**: Complex but powerful

## File Organization

**Individual Class Files**: Each class is stored as a separate JSON file in `data/classes/`
- **Naming Convention**: `{class-id}.json` (e.g., `fighter.json`, `ninja.json`)
- **Benefits**:
  - Easy to reference by filename
  - Load classes individually as needed
  - Simple to version control and diff
  - Clear separation of concerns

**Example File Path**: `data/classes/fighter.json`

## Validation

All class data validated against:
- Wizardry Wiki (wizardry.fandom.com)
- Strategy Wiki - Character Classes
- Original Wizardry 1 manual

**Total Classes**: 8 (4 basic + 4 elite)

## Notes

- **Easiest to Create**: Fighter (STR ≥ 11 only)
- **Hardest to Create**: Ninja (all stats ≥ 17)
- **Most Versatile**: Bishop (both spell types, item identification)
- **Highest HP**: Fighter, Samurai, Lord (1d10 per level)
- **Lowest HP**: Mage (1d4 per level)
- **Most Attacks**: Fighter at level 13+ (4 attacks per round)
- **Instant Kill**: Ninja only (decapitate ability)
- **Item Expert**: Bishop only (identify cursed items)
- **Best Healers**: Priest, Bishop, Lord (priest spells)
- **Best Damage**: Mage, Bishop (high-level mage spells)

**Last Updated**: 2025-10-26
**Next Review**: After implementing character creation and class change systems

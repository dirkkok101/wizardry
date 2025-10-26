# spells.json Format

**Spell data file specification.**

## File Location

`src/data/spells.json`

## Format

```json
{
  "mage": {
    "1": [
      {
        "id": "dumapic",
        "name": "DUMAPIC",
        "level": 1,
        "type": "utility",
        "target": "self",
        "effect": "show_coordinates",
        "description": "Shows current coordinates and facing direction",
        "castableIn": ["dungeon", "combat"]
      },
      {
        "id": "halito",
        "name": "HALITO",
        "level": 1,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "1d8",
        "damageType": "fire",
        "description": "1d8 fire damage to enemy group",
        "castableIn": ["combat"]
      },
      {
        "id": "katino",
        "name": "KATINO",
        "level": 1,
        "type": "debuff",
        "target": "enemy_group",
        "effect": "sleep",
        "description": "Sleep enemy group",
        "castableIn": ["combat"]
      },
      {
        "id": "mogref",
        "name": "MOGREF",
        "level": 1,
        "type": "buff",
        "target": "single_ally",
        "effect": "ac_bonus",
        "acBonus": -2,
        "description": "-2 AC to ally (improves armor class)",
        "castableIn": ["combat"]
      }
    ],
    "2": [
      {
        "id": "dilto",
        "name": "DILTO",
        "level": 2,
        "type": "debuff",
        "target": "enemy_group",
        "effect": "blind",
        "description": "Blinds enemy group",
        "castableIn": ["combat"]
      },
      {
        "id": "melito",
        "name": "MELITO",
        "level": 2,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "1d8",
        "damageType": "lightning",
        "damageMode": "each",
        "description": "1d8 damage to each enemy in group",
        "castableIn": ["combat"]
      },
      {
        "id": "sopic",
        "name": "SOPIC",
        "level": 2,
        "type": "buff",
        "target": "single_ally",
        "effect": "invisible",
        "description": "Makes ally invisible",
        "castableIn": ["combat"]
      }
    ],
    "3": [
      {
        "id": "mahalito",
        "name": "MAHALITO",
        "level": 3,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "4d6",
        "damageType": "fire",
        "description": "4d6 fire damage",
        "castableIn": ["combat"]
      },
      {
        "id": "molito",
        "name": "MOLITO",
        "level": 3,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "3d6",
        "damageType": "lightning",
        "damageMode": "each",
        "description": "3d6 damage to each enemy",
        "castableIn": ["combat"]
      }
    ],
    "4": [
      {
        "id": "dalto",
        "name": "DALTO",
        "level": 4,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "6d6",
        "damageType": "cold",
        "description": "6d6 cold damage",
        "castableIn": ["combat"]
      },
      {
        "id": "lahalito",
        "name": "LAHALITO",
        "level": 4,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "6d6",
        "damageType": "fire",
        "description": "6d6 fire damage",
        "castableIn": ["combat"]
      },
      {
        "id": "morlis",
        "name": "MORLIS",
        "level": 4,
        "type": "debuff",
        "target": "enemy_group",
        "effect": "paralyze",
        "description": "Paralyze enemy group",
        "castableIn": ["combat"]
      }
    ],
    "5": [
      {
        "id": "madalto",
        "name": "MADALTO",
        "level": 5,
        "type": "offensive",
        "target": "all_enemies",
        "damage": "variable",
        "damageType": "cold",
        "description": "Party-wide cold attack",
        "castableIn": ["combat"]
      },
      {
        "id": "lakanito",
        "name": "LAKANITO",
        "level": 5,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "variable",
        "damageType": "vacuum",
        "description": "Vacuum attack, ignores some resistances",
        "castableIn": ["combat"]
      },
      {
        "id": "zilwan",
        "name": "ZILWAN",
        "level": 5,
        "type": "utility",
        "target": "enemy_group",
        "effect": "dispel",
        "description": "Removes magical effects",
        "castableIn": ["combat"]
      }
    ],
    "6": [
      {
        "id": "haman",
        "name": "HAMAN",
        "level": 6,
        "type": "utility",
        "target": "enemy_group",
        "effect": "transform",
        "description": "Transforms monsters",
        "castableIn": ["combat"]
      },
      {
        "id": "lomilwa",
        "name": "LOMILWA",
        "level": 6,
        "type": "utility",
        "target": "party",
        "effect": "light_extended",
        "description": "Extended light radius",
        "castableIn": ["dungeon"]
      },
      {
        "id": "mahaman",
        "name": "MAHAMAN",
        "level": 6,
        "type": "utility",
        "target": "all_enemies",
        "effect": "transform",
        "description": "Transforms all monster groups",
        "castableIn": ["combat"]
      },
      {
        "id": "malor",
        "name": "MALOR",
        "level": 6,
        "type": "utility",
        "target": "location",
        "effect": "teleport",
        "description": "Teleport party to any coordinates (DANGEROUS)",
        "castableIn": ["dungeon"]
      },
      {
        "id": "tiltowait",
        "name": "TILTOWAIT",
        "level": 6,
        "type": "offensive",
        "target": "all_enemies",
        "damage": "massive",
        "damageType": "magic",
        "description": "Massive damage to all groups",
        "castableIn": ["combat"]
      }
    ],
    "7": [
      {
        "id": "haman_7",
        "name": "HAMAN",
        "level": 7,
        "type": "utility",
        "target": "enemy_group",
        "effect": "transform",
        "description": "Greater transform monsters",
        "castableIn": ["combat"]
      },
      {
        "id": "mahaman_7",
        "name": "MAHAMAN",
        "level": 7,
        "type": "utility",
        "target": "all_enemies",
        "effect": "transform",
        "description": "Transform all monster groups",
        "castableIn": ["combat"]
      },
      {
        "id": "tiltowait_7",
        "name": "TILTOWAIT",
        "level": 7,
        "type": "offensive",
        "target": "all_enemies",
        "damage": "massive",
        "damageType": "magic",
        "description": "Ultimate damage spell",
        "castableIn": ["combat"]
      }
    ]
  },
  "priest": {
    "1": [
      {
        "id": "badios",
        "name": "BADIOS",
        "level": 1,
        "type": "offensive",
        "target": "single_enemy",
        "damage": "1d8",
        "damageType": "holy",
        "effectiveAgainst": ["undead"],
        "description": "1d8 damage to undead",
        "castableIn": ["combat"]
      },
      {
        "id": "dios",
        "name": "DIOS",
        "level": 1,
        "type": "healing",
        "target": "single_ally",
        "healing": "1d8",
        "description": "Restore 1d8 HP",
        "castableIn": ["combat", "dungeon", "town"]
      },
      {
        "id": "kalki",
        "name": "KALKI",
        "level": 1,
        "type": "buff",
        "target": "party",
        "effect": "ac_bonus",
        "acBonus": -1,
        "description": "-1 AC to entire party",
        "castableIn": ["combat"]
      },
      {
        "id": "milwa",
        "name": "MILWA",
        "level": 1,
        "type": "utility",
        "target": "party",
        "effect": "light",
        "description": "Illuminates dungeon",
        "castableIn": ["dungeon"]
      },
      {
        "id": "porfic",
        "name": "PORFIC",
        "level": 1,
        "type": "buff",
        "target": "single_ally",
        "effect": "ac_bonus",
        "acBonus": -4,
        "description": "-4 AC to single ally",
        "castableIn": ["combat"]
      }
    ],
    "2": [
      {
        "id": "calfo",
        "name": "CALFO",
        "level": 2,
        "type": "utility",
        "target": "chest",
        "effect": "identify_trap",
        "description": "Identify trap type",
        "castableIn": ["dungeon"]
      },
      {
        "id": "manifo",
        "name": "MANIFO",
        "level": 2,
        "type": "debuff",
        "target": "enemy_group",
        "effect": "silence",
        "description": "Silence enemy group (no spells)",
        "castableIn": ["combat"]
      },
      {
        "id": "matu",
        "name": "MATU",
        "level": 2,
        "type": "buff",
        "target": "party",
        "effect": "ac_bonus",
        "acBonus": -2,
        "description": "-2 AC to entire party",
        "castableIn": ["combat"]
      },
      {
        "id": "montino",
        "name": "MONTINO",
        "level": 2,
        "type": "debuff",
        "target": "enemy_group",
        "effect": "silence",
        "description": "Silence enemy group",
        "castableIn": ["combat"]
      }
    ],
    "3": [
      {
        "id": "bamatu",
        "name": "BAMATU",
        "level": 3,
        "type": "buff",
        "target": "party",
        "effect": "ac_bonus",
        "acBonus": -4,
        "description": "-4 AC to entire party",
        "castableIn": ["combat"]
      },
      {
        "id": "badial",
        "name": "BADIAL",
        "level": 3,
        "type": "offensive",
        "target": "all_enemies",
        "damage": "2d8",
        "damageType": "holy",
        "description": "2d8 damage to all enemy groups",
        "castableIn": ["combat"]
      },
      {
        "id": "dial",
        "name": "DIAL",
        "level": 3,
        "type": "healing",
        "target": "single_ally",
        "healing": "2d8",
        "description": "Restore 2d8 HP",
        "castableIn": ["combat", "dungeon", "town"]
      },
      {
        "id": "latumapic",
        "name": "LATUMAPIC",
        "level": 3,
        "type": "utility",
        "target": "enemy_group",
        "effect": "identify_foe",
        "description": "Shows enemy stats and abilities",
        "castableIn": ["combat"]
      },
      {
        "id": "lomilwa_priest",
        "name": "LOMILWA",
        "level": 3,
        "type": "utility",
        "target": "party",
        "effect": "light_extended",
        "description": "Extended light radius",
        "castableIn": ["dungeon"]
      }
    ],
    "4": [
      {
        "id": "badialma",
        "name": "BADIALMA",
        "level": 4,
        "type": "offensive",
        "target": "all_enemies",
        "damage": "4d8",
        "damageType": "holy",
        "effectiveAgainst": ["undead"],
        "description": "4d8 damage to all undead",
        "castableIn": ["combat"]
      },
      {
        "id": "bamordi",
        "name": "BAMORDI",
        "level": 4,
        "type": "offensive",
        "target": "single_enemy",
        "damage": "3d8",
        "damageType": "holy",
        "description": "3d8 damage",
        "castableIn": ["combat"]
      },
      {
        "id": "dalto_priest",
        "name": "DALTO",
        "level": 4,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "6d6",
        "damageType": "cold",
        "description": "6d6 cold damage",
        "castableIn": ["combat"]
      },
      {
        "id": "kandi",
        "name": "KANDI",
        "level": 4,
        "type": "utility",
        "target": "dead_body",
        "effect": "locate_person",
        "description": "Find specific character in dungeon",
        "castableIn": ["dungeon"]
      },
      {
        "id": "katu",
        "name": "KATU",
        "level": 4,
        "type": "buff",
        "target": "party",
        "effect": "ac_bonus",
        "acBonus": -6,
        "description": "Massive AC reduction to entire party",
        "castableIn": ["combat"]
      },
      {
        "id": "latumofis",
        "name": "LATUMOFIS",
        "level": 4,
        "type": "utility",
        "target": "enemy_group",
        "effect": "identify_enemy",
        "description": "Full enemy analysis",
        "castableIn": ["combat"]
      },
      {
        "id": "maporfic",
        "name": "MAPORFIC",
        "level": 4,
        "type": "buff",
        "target": "party",
        "effect": "ac_bonus",
        "acBonus": -4,
        "description": "-4 AC to entire party",
        "castableIn": ["combat"]
      }
    ],
    "5": [
      {
        "id": "badi",
        "name": "BADI",
        "level": 5,
        "type": "offensive",
        "target": "enemy_group",
        "effect": "instant_death",
        "description": "Instant death to enemy group",
        "castableIn": ["combat"]
      },
      {
        "id": "badialma_5",
        "name": "BADIALMA",
        "level": 5,
        "type": "utility",
        "target": "all_enemies",
        "effect": "dispel",
        "description": "Remove all enemy buffs",
        "castableIn": ["combat"]
      },
      {
        "id": "dial_5",
        "name": "DIAL",
        "level": 5,
        "type": "healing",
        "target": "single_ally",
        "healing": "full",
        "description": "Full HP restore",
        "castableIn": ["combat", "dungeon", "town"]
      },
      {
        "id": "kadorto",
        "name": "KADORTO",
        "level": 5,
        "type": "utility",
        "target": "ashes",
        "effect": "resurrect",
        "successRate": 0.5,
        "failureResult": "lost_forever",
        "description": "Resurrect from ashes (50% success)",
        "castableIn": ["town", "dungeon"]
      },
      {
        "id": "loktofeit",
        "name": "LOKTOFEIT",
        "level": 5,
        "type": "utility",
        "target": "party",
        "effect": "recall",
        "successFormula": "level * 2%",
        "description": "Teleport party to castle entrance",
        "castableIn": ["dungeon"]
      },
      {
        "id": "mabadi",
        "name": "MABADI",
        "level": 5,
        "type": "offensive",
        "target": "all_enemies",
        "effect": "instant_death",
        "description": "Instant death to all enemy groups",
        "castableIn": ["combat"]
      }
    ],
    "6": [
      {
        "id": "badi_6",
        "name": "BADI",
        "level": 6,
        "type": "offensive",
        "target": "enemy_group",
        "effect": "instant_death",
        "description": "Greater instant death",
        "castableIn": ["combat"]
      },
      {
        "id": "lorto",
        "name": "LORTO",
        "level": 6,
        "type": "offensive",
        "target": "enemy_group",
        "damage": "massive",
        "damageType": "physical",
        "description": "Massive damage",
        "castableIn": ["combat"]
      },
      {
        "id": "malikto",
        "name": "MALIKTO",
        "level": 6,
        "type": "offensive",
        "target": "enemy_group",
        "effect": "petrify",
        "description": "Turn enemies to stone",
        "castableIn": ["combat"]
      }
    ],
    "7": [
      {
        "id": "di",
        "name": "DI",
        "level": 7,
        "type": "utility",
        "target": "dead_body",
        "effect": "resurrect",
        "successRate": 0.9,
        "failureResult": "ashes",
        "description": "Resurrect from death (90% success)",
        "castableIn": ["town", "dungeon"]
      },
      {
        "id": "mabadi_7",
        "name": "MABADI",
        "level": 7,
        "type": "offensive",
        "target": "all_enemies",
        "effect": "instant_death",
        "description": "Party-wide death spell",
        "castableIn": ["combat"]
      },
      {
        "id": "malikto_7",
        "name": "MALIKTO",
        "level": 7,
        "type": "offensive",
        "target": "all_enemies",
        "effect": "petrify",
        "description": "Turn all enemies to stone",
        "castableIn": ["combat"]
      }
    ]
  }
}
```

## Field Definitions

### Required Fields

**id**: `string` - Unique spell identifier (lowercase, e.g. "dumapic", "halito")

**name**: `string` - Display name (uppercase, traditional Wizardry format, e.g. "DUMAPIC", "HALITO")

**level**: `number` - Spell level (1-7)

**type**: `string` - Spell category
- `"offensive"` - Damage-dealing spells
- `"healing"` - HP restoration spells
- `"utility"` - Non-combat utility (light, teleport, identify)
- `"buff"` - Beneficial effects on allies
- `"debuff"` - Negative effects on enemies

**target**: `string` - Valid target types
- `"self"` - Caster only
- `"single_ally"` - One party member
- `"party"` - All party members
- `"single_enemy"` - One enemy
- `"enemy_group"` - One enemy group
- `"all_enemies"` - All enemy groups
- `"location"` - Map coordinates (MALOR)
- `"chest"` - Treasure chest (CALFO)
- `"dead_body"` - Dead character (DI)
- `"ashes"` - Character turned to ashes (KADORTO)

**description**: `string` - Human-readable description

**castableIn**: `string[]` - Valid casting contexts
- `"combat"` - During combat
- `"dungeon"` - While exploring dungeon
- `"town"` - In town/castle

### Optional Fields

**damage**: `string` - Damage dice (e.g. "1d8", "4d6", "massive", "variable")

**damageType**: `string` - Type of damage
- `"fire"`, `"cold"`, `"lightning"`, `"holy"`, `"magic"`, `"physical"`, `"vacuum"`

**damageMode**: `string` - How damage is applied
- `"each"` - Damage to each enemy individually (MELITO)
- Default: Damage shared across group

**healing**: `string` - Healing dice (e.g. "1d8", "2d8", "full")

**effect**: `string` - Special effect identifier
- `"show_coordinates"`, `"sleep"`, `"blind"`, `"invisible"`, `"paralyze"`
- `"transform"`, `"dispel"`, `"teleport"`, `"light"`, `"light_extended"`
- `"identify_trap"`, `"identify_foe"`, `"identify_enemy"`, `"silence"`
- `"instant_death"`, `"petrify"`, `"resurrect"`, `"recall"`, `"locate_person"`
- `"ac_bonus"` (use with acBonus field)

**acBonus**: `number` - AC modifier (negative = better armor)

**effectiveAgainst**: `string[]` - Enemy types spell is extra effective against
- `["undead"]` for BADIOS, BADIALMA

**successRate**: `number` - Probability of success (0.0 to 1.0)
- Used for LOKTOFEIT, DI, KADORTO

**successFormula**: `string` - Formula for success rate
- `"level * 2%"` for LOKTOFEIT

**failureResult**: `string` - What happens on failure
- `"ashes"` for DI (body → ashes)
- `"lost_forever"` for KADORTO (ashes → permanent death)

## Spell Point System

**Cost**: Each spell costs **1 spell point** from its level pool

**Pools**: Characters have separate spell point pools for each spell level (1-7)

**Restoration**: All spell points restored when resting at inn

**Pool Size Formula**: See [Combat Formulas](../research/combat-formulas.md)

## Validation

See [Spell Reference](../research/spell-reference.md) for complete validated spell list.

All 65+ spells cross-referenced against original Wizardry 1 sources.

## Notes

- Some spells appear at multiple levels (HAMAN, MAHAMAN, TILTOWAIT, BADI, etc.)
- Level 7 versions are more powerful than lower-level counterparts
- MALOR is dangerous: wrong coordinates = teleport into rock = instant party death
- LOKTOFEIT has very low success rate (level × 2%, max 14% at level 7)
- DI vs KADORTO: DI is safer (90% success, body → ashes on fail) but requires body not ashes

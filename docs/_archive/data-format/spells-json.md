# Spell JSON File Format

**Spell data file specification for individual spell JSON files.**

## File Location

`data/spells/` directory containing individual spell JSON files.

**Current State**: 50 JSON files defining 50 spell definitions (21 Mage + 29 Priest)

## File Organization

Spells are stored as **individual JSON files** in `data/spells/`:

- **Naming Convention**: `{spell-name}.json` (lowercase, e.g., `halito.json`, `dios.json`)
- **One spell per file**: Each JSON file contains a single spell definition
- **File Count**: 50 files (one per spell)

## Format

### Single Spell Per File

Each spell is defined in its own JSON file with all metadata.

**Example**: `data/spells/halito.json`

```json
{
  "id": "halito",
  "name": "HALITO",
  "translation": "Little Fire",
  "level": 1,
  "casterType": "mage",
  "category": "offensive",
  "target": "single",
  "description": "Basic single-target fire attack spell",
  "castableIn": ["combat"],
  "damage": {
    "dice": "1d8",
    "min": 1,
    "max": 8,
    "average": 4.5,
    "type": "fire"
  },
  "resistance": {
    "type": "fire",
    "effect": "half_damage"
  }
}
```

## Field Definitions

### Top-Level Fields

All fields are at the top level of each spell JSON file.

### Required Fields (All Spells)

**id**: `string` - Unique spell identifier (lowercase, e.g., "halito", "dios")

**name**: `string` - Display name (uppercase Wizardry format, e.g., "HALITO", "BADI")

**level**: `number` - Spell level (1-7)

**casterType**: `"mage" | "priest"` - Which class can cast this spell

**category**: `string` - Spell category
- `"offensive"` - Damage or instant death spells
- `"healing"` - HP restoration spells
- `"utility"` - Non-combat utility (light, teleport, identify)
- `"buff"` - Beneficial effects on allies
- `"debuff"` - Negative effects on enemies

**target**: `string` - Valid target types
- `"single"` - One character/enemy
- `"group"` - One enemy group
- `"all_enemies"` - All enemy groups
- `"all_allies"` - All party members
- `"self"` - Caster only
- `"party"` - All party members
- `"dead_body"` - Dead character (DI)
- `"ashes"` - Character turned to ashes (KADORTO)

**description**: `string` - Human-readable description

**castableIn**: `Array<"combat" | "dungeon" | "town">` - Valid casting contexts

### Optional Fields (Category-Specific)

#### Offensive Spells

**damage**: `object` - Damage specification (for direct damage spells)
```json
{
  "dice": "1d8",  // Damage dice notation
  "type": "fire" | "cold" | "lightning" | "holy" | "air" | "magic" | "physical"
}
```

**effect**: `object` - Special effect (for instant death, petrification, etc.)
```json
{
  "type": "instant_death" | "petrification"
}
```

**Note**: Offensive spells must have **either** `damage` OR `effect` field.

#### Healing Spells

**healing**: `object` - Healing specification
```json
{
  "dice": "1d8",  // Optional: healing dice
  "type": "normal" | "full"  // "full" for complete HP restoration
}
```

#### Buff/Debuff Spells

**acModifier**: `number` - AC modifier (negative = better defense)
- Example: -2 for MOGREF, -4 for PORFIC

**statusEffect**: `string` - Status effect to apply
- `"ASLEEP"`, `"BLIND"`, `"SILENCED"`, `"INVISIBLE"`, `"PARALYZED"`, `"POISONED"`

#### Utility Spells

**utility**: `string` - Utility effect type
- `"reveal_stats"`, `"identify_foe"`, `"identify_trap"`, `"extended_light"`
- `"locate_person"`, `"teleport"`, `"recall"`, `"show_coordinates"`

**resurrection**: `boolean` - True for resurrection spells (DI, KADORTO)

**resurrectionSuccessRate**: `number` - Success rate (0.0 to 1.0)
- 0.50 for KADORTO, 0.90 for DI

**teleportSuccessRate**: `number` - Teleport success rate
- 0.75 for MALOR

**recallSuccessRate**: `string` - Formula for recall success
- `"level_based"` for LOKTOFEIT (caster level × 2%, max 95%)

**statusCure**: `string` - Status condition cured
- `"poison"`, `"paralysis"`, `"silence"`, `"blind"`, `"asleep"`, `"all"`

### Special Effect Flags

**instantDeath**: `boolean` - Instant death effect (MAKANITO, BADI, MABADI)

**dispelMagic**: `boolean` - Dispel magic effect (ZILWAN)

**transformation**: `boolean` - Monster transformation (HAMAN, MAHAMAN)

**undeadOnly**: `boolean` - Only affects undead (BADIOS)

**ignoresAC**: `boolean` - Ignores armor class (LAKANITO)

**failureResult**: `string` - What happens on spell failure
- Used for resurrection spells

## Validation

### Validation Script

Run validation against research documentation:

```bash
node scripts/validate-spells.mjs
```

### Validation Rules

1. All required fields must be present
2. `casterType` must be `"mage"` or `"priest"`
3. `level` must be 1-7
4. Offensive spells must have either `damage` OR `effect` field
5. Healing spells must have `healing` field
6. Spell counts must match research documentation:
   - Mage: 21 spells across levels 1-7
   - Priest: 29 spells across levels 1-7

### Spell Count Validation

| Caster | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 | Level 6 | Level 7 | Total |
|--------|---------|---------|---------|---------|---------|---------|---------|-------|
| Mage   | 4       | 2       | 2       | 3       | 3       | 4       | 3       | **21**|
| Priest | 5       | 4       | 4       | 4       | 6       | 4       | 2       | **29**|

**Total**: 50 spell definitions in 50 JSON files

## Spell Point System

**Cost**: Each spell costs **1 spell point** from its level pool

**Pools**: Characters have **separate spell point pools** for each spell level (1-7)

**Restoration**: All spell points restored when resting at inn

**Pool Size**: Varies by character class and level (see Character Service documentation)

## Loading System

Spells are loaded at runtime by `SpellDataLoader`:

1. Loads all JSON files from `data/spells/`
2. Validates each spell with Zod schema
3. Caches results for performance

**Error Handling**: Individual spell failures don't crash the game - failed spells are tracked separately.

## Examples

### Example 1: Simple Damage Spell

`data/spells/halito.json`:
```json
{
  "id": "halito",
  "name": "HALITO",
  "translation": "Little Fire",
  "level": 1,
  "casterType": "mage",
  "category": "offensive",
  "target": "single",
  "description": "Basic single-target fire attack spell",
  "castableIn": ["combat"],
  "damage": {
    "dice": "1d8",
    "min": 1,
    "max": 8,
    "average": 4.5,
    "type": "fire"
  },
  "resistance": {
    "type": "fire",
    "effect": "half_damage"
  }
}
```

### Example 2: Healing Spell

`data/spells/dios.json`:
```json
{
  "id": "dios",
  "name": "DIOS",
  "translation": "Heal",
  "level": 1,
  "casterType": "priest",
  "category": "healing",
  "target": "single",
  "description": "Basic healing spell - minor HP restoration",
  "castableIn": ["combat", "camp"],
  "healing": {
    "dice": "1d8",
    "min": 1,
    "max": 8,
    "average": 4.5
  }
}
```

### Example 3: Instant Death Spell

`data/spells/badi.json`:
```json
{
  "id": "badi",
  "name": "BADI",
  "translation": "Death",
  "level": 5,
  "casterType": "priest",
  "category": "instant_death",
  "target": "single",
  "description": "Attempts to instantly kill one monster - binary outcome",
  "castableIn": ["combat"],
  "instantDeath": {
    "type": "divine_word",
    "savingThrow": true
  },
  "resistance": {
    "formula": "(Monster Level × 10)%",
    "notes": "Level 10+ monsters are immune"
  }
}
```

### Example 4: Utility Spell

`data/spells/malor.json`:
```json
{
  "id": "malor",
  "name": "MALOR",
  "translation": "Apport",
  "level": 7,
  "casterType": "mage",
  "category": "utility",
  "target": "party",
  "description": "Teleports party to specified coordinates - EXTREMELY DANGEROUS",
  "castableIn": ["combat", "camp"],
  "teleport": {
    "campMode": "Player inputs coordinates",
    "combatMode": "Random safe location on current level",
    "danger": "Teleporting into solid rock = INSTANT PARTY DEATH"
  }
}
```

## Notes

- **Dangerous Spells**: MALOR is extremely dangerous - wrong coordinates = instant party death
- **Low Success Rates**: LOKTOFEIT has very low success rate ((caster level × 2 + 1)%, max 27% at level 13), and success loses all equipment
- **Resurrection Success**: DI and KADORTO both use (Vitality × 4)% success rate; DI returns with 1 HP, KADORTO returns with full HP
- **Resurrection Failure**: DI failure turns body to ashes; KADORTO failure from ashes = lost forever
- **Field Name Change**: Original `type` field split into `casterType` (who casts) and `category` (spell type) to avoid ambiguity

## References

- **Spell Reference**: `docs/research/spell-reference.md` - Complete validated spell list (50 spells)
- **Game Design**: `docs/game-design/04-spells.md` - Spell mechanics and rules
- **Type Definitions**: `src/types/SpellDefinition.ts` - TypeScript interfaces

# Spell JSON File Format

**Spell data file specification for individual spell JSON files.**

## File Location

`data/spells/` directory containing individual spell JSON files.

**Current State**: 49 JSON files defining 56 spell definitions (23 Mage + 33 Priest)

## File Organization

Spells are stored as **individual JSON files** in `data/spells/`:

- **Naming Convention**: `{spell-name}.json` (lowercase, e.g., `halito.json`, `dios.json`)
- **Multi-level Spells**: Use consolidated format with `levels` array (e.g., `badi.json` contains both level 5 and level 6 versions)
- **File Count**: 49 files (reduced from 56 by consolidating multi-level spell families)

### Consolidated Spell Families

The following spells use the consolidated format (shared metadata + levels array):

1. **badi.json** - Priest levels 5+6 (instant death progression)
2. **mabadi.json** - Priest levels 5+7 (party-wide instant death)
3. **dial.json** - Priest levels 3+5 (healing progression)
4. **haman.json** - Mage levels 6+7 (monster transformation)
5. **mahaman.json** - Mage levels 6+7 (transform all groups)
6. **tiltowait.json** - Mage levels 6+7 (ultimate damage)
7. **malikto.json** - Priest levels 6+7 (petrification)

## Format Types

### Format 1: Legacy Single-Level Spell

Used for spells that appear at only one level.

**Example**: `data/spells/halito.json`

```json
{
  "id": "halito",
  "name": "HALITO",
  "level": 1,
  "casterType": "mage",
  "category": "offensive",
  "target": "group",
  "description": "1d8 fire damage to enemy group",
  "castableIn": ["combat"],
  "damage": {
    "dice": "1d8",
    "type": "fire"
  }
}
```

### Format 2: Consolidated Multi-Level Spell

Used for spells that appear at multiple levels (e.g., BADI at levels 5 and 6).

**Example**: `data/spells/badi.json`

```json
{
  "name": "BADI",
  "casterType": "priest",
  "category": "offensive",
  "castableIn": ["combat"],
  "levels": [
    {
      "level": 5,
      "id": "badi",
      "description": "Instant death to enemy group",
      "target": "group",
      "effect": {
        "type": "instant_death"
      }
    },
    {
      "level": 6,
      "id": "badi_6",
      "description": "Greater instant death",
      "target": "group",
      "effect": {
        "type": "instant_death"
      }
    }
  ]
}
```

**Consolidated Format Benefits**:
- Shared metadata at top level (no duplication)
- Spell progression visible in single file
- Easier to maintain spell families
- Clearer relationship between level variants

**Runtime Handling**: `SpellDataLoader` automatically detects the format and flattens consolidated spells into individual `SpellDefinition` objects.

## Field Definitions

### Top-Level Fields (Both Formats)

**For Legacy Format**: All fields at top level
**For Consolidated Format**: Shared fields at top level, level-specific fields in `levels` array

### Required Fields (All Spells)

**id**: `string` - Unique spell identifier (lowercase, e.g., "halito", "badi_6")
- For consolidated format: appears in `levels[].id`

**name**: `string` - Display name (uppercase Wizardry format, e.g., "HALITO", "BADI")

**level**: `number` - Spell level (1-7)
- For consolidated format: appears in `levels[].level`

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

**causeFear**: `boolean` - Causes fear effect (MORLIS)

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
   - Mage: 23 spells across levels 1-7
   - Priest: 33 spells across levels 1-7

### Spell Count Validation

| Caster | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 | Level 6 | Level 7 | Total |
|--------|---------|---------|---------|---------|---------|---------|---------|-------|
| Mage   | 4       | 3       | 2       | 3       | 3       | 5       | 3       | **23**|
| Priest | 5       | 4       | 5       | 7       | 6       | 3       | 3       | **33**|

**Total**: 56 spell definitions in 49 JSON files

## Spell Point System

**Cost**: Each spell costs **1 spell point** from its level pool

**Pools**: Characters have **separate spell point pools** for each spell level (1-7)

**Restoration**: All spell points restored when resting at inn

**Pool Size**: Varies by character class and level (see Character Service documentation)

## Loading System

Spells are loaded at runtime by `SpellDataLoader`:

1. Loads all JSON files from `data/spells/`
2. Detects format (legacy vs consolidated)
3. Flattens consolidated format into individual spell definitions
4. Validates each spell with Zod schema
5. Caches results for performance

**Error Handling**: Individual spell failures don't crash the game - failed spells are tracked separately.

## Examples

### Example 1: Simple Damage Spell

`data/spells/halito.json`:
```json
{
  "id": "halito",
  "name": "HALITO",
  "level": 1,
  "casterType": "mage",
  "category": "offensive",
  "target": "group",
  "description": "1d8 fire damage to enemy group",
  "castableIn": ["combat"],
  "damage": {
    "dice": "1d8",
    "type": "fire"
  }
}
```

### Example 2: Healing Spell

`data/spells/dios.json`:
```json
{
  "id": "dios",
  "name": "DIOS",
  "level": 1,
  "casterType": "priest",
  "category": "healing",
  "target": "single",
  "description": "Restore 1d8 HP",
  "castableIn": ["combat", "dungeon", "town"],
  "healing": {
    "dice": "1d8",
    "type": "normal"
  }
}
```

### Example 3: Instant Death Spell (Consolidated Format)

`data/spells/badi.json`:
```json
{
  "name": "BADI",
  "casterType": "priest",
  "category": "offensive",
  "castableIn": ["combat"],
  "levels": [
    {
      "level": 5,
      "id": "badi",
      "description": "Instant death to enemy group",
      "target": "group",
      "effect": {
        "type": "instant_death"
      }
    },
    {
      "level": 6,
      "id": "badi_6",
      "description": "Greater instant death",
      "target": "group",
      "effect": {
        "type": "instant_death"
      }
    }
  ]
}
```

### Example 4: Utility Spell

`data/spells/malor.json`:
```json
{
  "id": "malor",
  "name": "MALOR",
  "level": 6,
  "casterType": "mage",
  "category": "utility",
  "target": "party",
  "description": "Teleport party to any coordinates (DANGEROUS)",
  "castableIn": ["dungeon"],
  "utility": "teleport",
  "teleportSuccessRate": 0.75,
  "failureResult": "Teleporting into rock causes instant party death"
}
```

## Notes

- **Multi-Level Spells**: Some spells appear at multiple levels with increased power (HAMAN, MAHAMAN, TILTOWAIT, BADI, MABADI, DIAL, MALIKTO)
- **Dangerous Spells**: MALOR is extremely dangerous - wrong coordinates = instant party death
- **Low Success Rates**: LOKTOFEIT has very low success rate (caster level × 2%, max 14% at level 7)
- **Resurrection**: DI (90% success, body→ashes on fail) vs KADORTO (50% success, ashes→lost forever on fail)
- **Field Name Change**: Original `type` field split into `casterType` (who casts) and `category` (spell type) to avoid ambiguity

## References

- **Spell Reference**: `docs/research/spell-reference.md` - Complete validated spell list
- **Game Design**: `docs/game-design/04-spells.md` - Spell mechanics and rules
- **Type Definitions**: `src/types/SpellDefinition.ts` - TypeScript interfaces
- **Consolidated Format**: `src/types/SpellFileData.ts` - Multi-level spell format
- **Validation Script**: `scripts/validate-spells.mjs` - Automated validation

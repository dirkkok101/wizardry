# monsters.json Format

**Monster data file specification.**

## File Location

`src/data/monsters.json`

## Format

```json
{
  "monsters": [
    {
      "id": "bubbly_slime",
      "name": "Bubbly Slime",
      "level": 1,
      "numberAppearing": { "min": 2, "max": 4 },
      "hp": { "min": 2, "max": 4 },
      "ac": 12,
      "damage": [
        { "dice": "1d1", "min": 1, "max": 1 }
      ],
      "xp": 55,
      "type": "normal",
      "class": null,
      "specialAbilities": [],
      "resistances": [],
      "regeneration": 0,
      "isBoss": false,
      "canFlee": false
    },
    {
      "id": "murphy_ghost",
      "name": "Murphy's Ghost",
      "level": 1,
      "numberAppearing": { "min": 1, "max": 1 },
      "hp": { "min": 20, "max": 110 },
      "ac": -3,
      "damage": [
        { "dice": "1d8", "min": 1, "max": 8 }
      ],
      "xp": 4450,
      "type": "undead",
      "class": null,
      "specialAbilities": ["regeneration"],
      "resistances": [],
      "regeneration": 1,
      "isBoss": true,
      "canFlee": false,
      "fixedEncounter": true,
      "location": { "level": 1, "x": 13, "y": 5 }
    },
    {
      "id": "lvl_1_mage",
      "name": "Lvl 1 Mage",
      "level": 1,
      "numberAppearing": { "min": 1, "max": 1 },
      "hp": { "min": 2, "max": 5 },
      "ac": 4,
      "damage": [],
      "xp": 475,
      "type": "humanoid",
      "class": "mage",
      "spellLevels": { "mage": 1 },
      "spells": ["katino", "halito", "dumapic", "mogref"],
      "specialAbilities": ["spellcasting"],
      "resistances": [],
      "regeneration": 0,
      "isBoss": false,
      "canFlee": false
    },
    {
      "id": "dragon_zombie",
      "name": "Dragon Zombie",
      "level": 8,
      "numberAppearing": { "min": 1, "max": 4 },
      "hp": { "min": 12, "max": 96 },
      "ac": -2,
      "damage": [
        { "dice": "2d8", "min": 2, "max": 16 },
        { "dice": "2d8", "min": 2, "max": 16 },
        { "dice": "2d8", "min": 2, "max": 16 }
      ],
      "xp": 5360,
      "type": "undead",
      "class": "mage",
      "spellLevels": { "mage": 5 },
      "spells": ["madalto", "lakanito", "zilwan"],
      "specialAbilities": ["breath_weapon", "spellcasting", "multiple_attacks"],
      "breathWeapon": {
        "type": "fire",
        "damage": "8d6",
        "target": "party"
      },
      "resistances": [],
      "regeneration": 0,
      "isBoss": true,
      "canFlee": false
    },
    {
      "id": "werdna",
      "name": "W*E*R*D*N*A",
      "level": 10,
      "numberAppearing": { "min": 1, "max": 1 },
      "hp": { "min": 210, "max": 300 },
      "ac": -7,
      "damage": [
        { "dice": "4d10", "min": 4, "max": 40 },
        { "dice": "4d10", "min": 4, "max": 40 }
      ],
      "xp": 15880,
      "type": "humanoid",
      "class": "mage",
      "spellLevels": { "mage": 7 },
      "spells": ["tiltowait_7", "mahaman_7", "haman_7", "malor", "tiltowait", "mahaman"],
      "specialAbilities": [
        "spellcasting",
        "multiple_attacks",
        "poison",
        "paralyze",
        "petrify",
        "decapitate",
        "regeneration",
        "magic_resistance"
      ],
      "resistances": [
        { "type": "magic", "value": 70 }
      ],
      "regeneration": 5,
      "isBoss": true,
      "isUnique": true,
      "isFinalBoss": true,
      "canFlee": false,
      "fixedEncounter": true,
      "location": { "level": 10, "x": 17, "y": 3 },
      "dropItems": ["werdna_amulet"]
    },
    {
      "id": "vorpal_bunny",
      "name": "Vorpal Bunny",
      "level": 2,
      "numberAppearing": { "min": 4, "max": 8 },
      "hp": { "min": 5, "max": 20 },
      "ac": 6,
      "damage": [
        { "dice": "1d6", "min": 1, "max": 6 }
      ],
      "xp": 735,
      "type": "normal",
      "class": null,
      "specialAbilities": ["decapitate"],
      "resistances": [
        { "type": "cold", "value": 100 }
      ],
      "regeneration": 0,
      "isBoss": false,
      "canFlee": false
    },
    {
      "id": "greater_demon",
      "name": "Greater Demon",
      "level": 10,
      "numberAppearing": { "min": 1, "max": 6 },
      "hp": { "min": 11, "max": 88 },
      "ac": -3,
      "damage": [
        { "dice": "3d8", "min": 3, "max": 24 },
        { "dice": "3d8", "min": 3, "max": 24 },
        { "dice": "3d8", "min": 3, "max": 24 },
        { "dice": "3d8", "min": 3, "max": 24 },
        { "dice": "3d8", "min": 3, "max": 24 }
      ],
      "xp": 44570,
      "type": "demon",
      "class": null,
      "specialAbilities": [
        "multiple_attacks",
        "poison",
        "paralyze",
        "summon_reinforcements",
        "regeneration"
      ],
      "resistances": [],
      "regeneration": 3,
      "isBoss": true,
      "canFlee": false
    }
  ]
}
```

## Field Definitions

### Required Fields

**id**: `string` - Unique monster identifier (lowercase with underscores, e.g. "bubbly_slime", "werdna")

**name**: `string` - Display name (e.g. "Bubbly Slime", "W\*E\*R\*D\*N\*A")

**level**: `number` - Dungeon level where monster appears (1-10)

**numberAppearing**: `object` - Group size range
- `min`: Minimum number appearing
- `max`: Maximum number appearing

**hp**: `object` - Hit point range
- `min`: Minimum HP
- `max`: Maximum HP

**ac**: `number` - Armor class (lower = better defense, can be negative)

**damage**: `array` - Attack damage per round
- Each entry: `{ dice: string, min: number, max: number }`
- Multiple entries = multiple attacks per round (array length determines attack count)
- Empty array = no physical attacks (spellcaster only)
- Examples:
  - `[{dice: "1d8"}]` = 1 attack per round
  - `[{dice: "3d8"}, {dice: "3d8"}]` = 2 attacks per round
  - `[]` = 0 attacks (pure caster)

**xp**: `number` - Experience points awarded for defeat

**type**: `string` - Monster type
- `"normal"` - Standard creature
- `"undead"` - Undead (vulnerable to BADIOS, DI, etc.)
- `"humanoid"` - Human-like (NPCs, enemy adventurers)
- `"demon"` - Demonic entity
- `"dragon"` - Dragon-type
- `"mythical"` - Mythical creature
- `"werebeast"` - Lycanthrope

**class**: `string | null` - Character class if applicable
- `"fighter"`, `"mage"`, `"priest"`, `"thief"`, `"bishop"`, `"samurai"`, `"lord"`, `"ninja"`
- `null` for non-class monsters

**specialAbilities**: `array` - Special ability identifiers
- `"spellcasting"` - Can cast spells
- `"breath_weapon"` - Has breath attack
- `"poison"` - Poison attack
- `"paralyze"` - Paralyze attack
- `"petrify"` - Petrification attack
- `"decapitate"` - Instant kill attack
- `"level_drain"` - Drains character levels
- `"regeneration"` - Heals each round
- `"multiple_attacks"` - More than 1 attack per round
- `"summon_reinforcements"` - Can call backup
- `"magic_resistance"` - Resists magic

**resistances**: `array` - Resistance to damage types
- Each entry: `{ type: string, value: number }`
- `type`: "fire", "cold", "magic", "poison"
- `value`: Resistance percentage (0-100, 100 = immune)

**regeneration**: `number` - HP regenerated per round (0 = no regen)

**isBoss**: `boolean` - Is this a boss-tier monster?

**canFlee**: `boolean` - Can monster flee from combat?
- `true`: Monster may attempt to flee when HP is low (Rogue, Attack Dog, Ogre, etc.)
- `false`: Monster fights to the death (most monsters, all bosses)

### Optional Fields

**spellLevels**: `object` - Spell levels accessible
- `{ mage: number }` for mage spells
- `{ priest: number }` for priest spells
- `{ mage: number, priest: number }` for bishop

**spells**: `array` - Spell IDs monster can cast (references spells.json)

**breathWeapon**: `object` - Breath weapon details
- `type`: Damage type ("fire", "cold", "poison", "petrify")
- `damage`: Damage dice string
- `target`: "party" or "single"

**isUnique**: `boolean` - Only one exists in game (Werdna)

**isFinalBoss**: `boolean` - Is this the final boss?

**fixedEncounter**: `boolean` - Appears at fixed location (not random)

**location**: `object` - Fixed encounter location
- `level`: Dungeon level
- `x`: X coordinate
- `y`: Y coordinate

**dropItems**: `array` - Item IDs dropped on defeat (references items.json)

**levelDrain**: `number` - Number of levels drained on hit (1-4)
- 1: Shade, Nightstalker
- 2: Lifestealer, Vampire
- 3: Maelific
- 4: Vampire Lord

**effectiveAgainst**: `array` - Enemy types this monster is strong against

## Special Abilities Reference

### Instant Kill Abilities

**decapitate**: Chance to instantly kill on hit
- Ninjas, Vorpal Bunny, Hatamoto, High Master, Flack, Werdna

**petrify**: Turn target to stone (permanent)
- Medusalizard, Gorgon, Malikto spell users, Flack, Werdna

### Status Effect Abilities

**poison**: Inflict poison status
- Many monsters (spiders, werebeasts, Gas Dragon, etc.)

**paralyze**: Inflict paralysis
- Zombies, Gas Cloud, Grave Mist, Gaze Hound, Vampire, Flack, Werdna

### Combat Abilities

**breath_weapon**: Area attack hitting entire party or group
- Dragons (fire/cold), Gorgon (petrify), Gas Dragon (poison)

**multiple_attacks**: More than 1 attack per round
- Number of attacks = length of damage array
- This ability tag is informational; actual attack count is determined by damage array length
- Gargoyle (4 attacks), Greater Demon (5 attacks), etc.

**summon_reinforcements**: Call additional monsters mid-combat
- Creeping Coin?, Lesser Demon, Greater Demon, Bleeb

### Defensive Abilities

**regeneration**: Heal HP each round
- +1: Murphy's Ghost
- +2: Raver Lord
- +3: Troll, Maelific, Ogre Lord, Greater Demon
- +4: Vampire Lord
- +5: Werdna

**magic_resistance**: Percentage chance to resist spells
- 70%: Werdna
- 85%: Earth Giant
- 95%: Frost Giant, Poison Giant, Will O' Wisp

### Special Combat Mechanics

**level_drain**: Permanent level loss on hit (until restoration)
- Extremely dangerous; reduces character power
- Shade (1), Lifestealer (2), Nightstalker (1), Vampire (2), Maelific (3), Vampire Lord (4)

## Monster AI Behavior

**Spellcasters**: Prioritize spells over physical attacks
- Offensive spells first (damage, death)
- Defensive spells if outnumbered
- Healing spells if wounded

**Breath Weapons**: Used every few rounds (cooldown system)
- Typically round 1, then every 3-4 rounds

**Fleeing**: Some monsters flee when HP low
- Rogue, Attack Dog, Coyote, Ogre, various thieves

**Reinforcements**: Called when encounter starts or mid-combat
- Adds new monster group(s) to battle

## Encounter Tables

Monster appearance determined by:
- **Dungeon Level**: Level 1 has weakest, Level 10 has strongest
- **Random Rolls**: Per-tile encounter chance
- **Fixed Encounters**: Specific monsters at specific coordinates

See [Monster Reference](../research/monster-reference.md) for complete encounter distribution.

## Boss Encounters

**Level 1**: Murphy's Ghost (fixed at 13E, 5N)

**Level 4**: High Ninja

**Level 6**: Earth Giant, High Wizard, Chimera

**Level 7**: Lesser Demon, Gorgon

**Level 8**: Dragon Zombie, Fire Dragon, High Master, Hatamoto

**Level 9**: Frost Giant, Maelific

**Level 10**: Greater Demon, Vampire Lord, Will O' Wisp, Flack, **Werdna** (final boss)

## Validation

See [Monster Reference](../research/monster-reference.md) for complete validated monster list.

All 96 monsters cross-referenced against original Wizardry 1 sources.

## File Organization

**Individual Monster Files**: Each monster is stored as a separate JSON file in `data/monsters/`
- **Naming Convention**: `{monster-id}.json` (e.g., `bubbly_slime.json`, `werdna.json`)
- **Benefits**:
  - Easy to reference by filename
  - Load monsters individually as needed
  - Simple to version control and diff
  - Clear separation of concerns

**Example File Path**: `data/monsters/murphy_ghost.json`

## Notes

- **Total Monsters**: 96 unique creatures
- **Boss Count**: 17 boss-tier encounters
- **Level Distribution**: Difficulty scales with dungeon level
- **Highest XP**: Greater Demon (44,570 XP) and Will O' Wisp (43,320 XP)
- **Hardest Boss**: Werdna (210-300 HP, AC -7, all special abilities)
- **Unique Monsters**: Only Werdna is truly unique (one per game)
- **Fixed Encounters**: Murphy's Ghost (repeatable), Level 10 guardians, Werdna (one-time)

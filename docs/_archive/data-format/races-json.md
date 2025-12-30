# races.json Format

**Race data file specification.**

## File Location

`src/data/races.json`

## Format

```json
{
  "races": [
    {
      "id": "human",
      "name": "Human",
      "baseStats": {
        "str": 8,
        "int": 8,
        "pie": 5,
        "vit": 8,
        "agi": 8,
        "luc": 9
      },
      "statTotal": 46,
      "description": "Balanced race with no extreme strengths or weaknesses. Most versatile for general builds.",
      "strengths": ["Balanced", "Versatile"],
      "weaknesses": ["Low PIE (5) makes Priest classes harder"],
      "bestClasses": ["fighter", "mage", "thief"],
      "savingThrowBonuses": {
        "death": -1
      }
    },
    {
      "id": "elf",
      "name": "Elf",
      "baseStats": {
        "str": 7,
        "int": 10,
        "pie": 10,
        "vit": 6,
        "agi": 9,
        "luc": 6
      },
      "statTotal": 48,
      "description": "Natural spellcaster with high INT and PIE. Excellent for magical classes but physically fragile.",
      "strengths": ["Excellent for Mage (INT 10)", "Excellent for Priest (PIE 10)", "Natural spellcaster"],
      "weaknesses": ["Low VIT (6) = fragile", "Low LUC (6)"],
      "bestClasses": ["mage", "priest", "bishop"],
      "savingThrowBonuses": {
        "wand": -2
      }
    },
    {
      "id": "dwarf",
      "name": "Dwarf",
      "baseStats": {
        "str": 10,
        "int": 7,
        "pie": 10,
        "vit": 10,
        "agi": 5,
        "luc": 6
      },
      "statTotal": 48,
      "description": "Toughest race with high STR and VIT. Excellent for warrior classes but very slow.",
      "strengths": ["Best starting VIT (10)", "High STR (10)", "Excellent PIE (10)"],
      "weaknesses": ["Very low AGI (5) = poor initiative/AC"],
      "bestClasses": ["fighter", "priest", "lord"],
      "savingThrowBonuses": {
        "breath": -4
      }
    },
    {
      "id": "gnome",
      "name": "Gnome",
      "baseStats": {
        "str": 7,
        "int": 7,
        "pie": 10,
        "vit": 8,
        "agi": 10,
        "luc": 7
      },
      "statTotal": 49,
      "description": "Nimble caster with balanced magical abilities and highest AGI. Good for agility-dependent builds.",
      "strengths": ["Highest AGI (10)", "Good PIE (10)", "Balanced"],
      "weaknesses": ["No standout high stats"],
      "bestClasses": ["thief", "priest", "bishop"],
      "savingThrowBonuses": {
        "petrify": -2
      }
    },
    {
      "id": "hobbit",
      "name": "Hobbit",
      "baseStats": {
        "str": 5,
        "int": 7,
        "pie": 7,
        "vit": 6,
        "agi": 10,
        "luc": 15
      },
      "statTotal": 50,
      "description": "Lucky rogue with extreme LUC advantage. Hardest race to qualify for elite classes but highest stat total.",
      "strengths": ["Highest LUC by far (15)", "High AGI (10)", "Highest stat total (50)"],
      "weaknesses": ["Lowest STR (5)", "Low VIT (6)", "Low stats overall"],
      "bestClasses": ["thief"],
      "savingThrowBonuses": {
        "spell": -3
      }
    }
  ]
}
```

## Field Definitions

### Required Fields

**id**: `string` - Unique race identifier (lowercase, e.g. "human", "elf", "dwarf", "gnome", "hobbit")

**name**: `string` - Display name (e.g. "Human", "Elf")

**baseStats**: `object` - Base attribute values before bonus allocation
- `str`: Strength (melee damage, hit chance)
- `int`: Intelligence (mage spell power, learn chance)
- `pie`: Piety (priest spell power, learn chance)
- `vit`: Vitality (hit points, survival)
- `agi`: Agility (initiative, armor class)
- `luc`: Luck (critical hits, saving throws, treasure)

**statTotal**: `number` - Sum of all base stats (46-50)
- Human: 46 (lowest, balanced distribution)
- Elf: 48 (higher, concentrated in mental)
- Dwarf: 48 (higher, concentrated in physical)
- Gnome: 49 (second highest)
- Hobbit: 50 (highest, extreme LUC concentration)

**description**: `string` - Brief race description focusing on role and playstyle

**strengths**: `array` - List of racial advantages (combat, magic, etc.)

**weaknesses**: `array` - List of racial disadvantages

**bestClasses**: `array` - Class IDs this race excels at (references classes.json)
- Uses class IDs: "fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja"

**savingThrowBonuses**: `object` - Saving throw bonuses by type
- Keys: "death", "petrify", "wand", "breath", "spell"
- Values: Negative numbers improve saves (lower is better)
- Race bonuses:
  - Human: `{ "death": -1 }`
  - Elf: `{ "wand": -2 }` (unused in original game code)
  - Dwarf: `{ "breath": -4 }`
  - Gnome: `{ "petrify": -2 }`
  - Hobbit: `{ "spell": -3 }`

**resistances**: `object` - Racial resistance bonuses (percentage)
- Keys: "poison", "paralysis", "critical", "breath", "poisonGasTrap", "stoning", "antiMageTrap", "antiPriestTrap", "silence"
- Values: Percentage bonus to resistance
- Each resistance type is stored as a separate field for independent evaluation
- Race resistances:
  - Human: `{ "poison": 5, "paralysis": 5, "critical": 5 }`
  - Elf: `{ "breath": 10 }` (halves damage)
  - Dwarf: `{ "poisonGasTrap": 20 }`
  - Gnome: `{ "stoning": 10 }`
  - Hobbit: `{ "antiMageTrap": 15, "antiPriestTrap": 15, "silence": 15 }`

## Bonus Point Requirements

These are NOT stored in the JSON but documented here for reference:

### Bonus Pool Generation
- **Typical**: 7-10 points (90.0%)
- **Uncommon**: 11-19 points (9.25%)
- **Rare**: 20+ points (0.75%)
- **Maximum**: 29 points (extremely rare)

### Minimum Bonus Points Needed for Elite Classes

**Samurai** (STR 15, VIT 14, INT 11, PIE 10, AGI 10):
- Human: 23 points minimum
- Elf: 18 points minimum
- Dwarf: 18 points minimum
- Gnome: 18 points minimum
- Hobbit: 25 points minimum

**Lord** (STR 15, VIT 15, INT 12, PIE 12, AGI 14, LUC 15):
- Human: 37 points minimum
- Elf: 35 points minimum
- Dwarf: 35 points minimum
- Gnome: 34 points minimum
- Hobbit: 33 points minimum (best)

**Ninja** (All stats 17):
- Human: 56 points minimum
- Elf: 54 points minimum
- Dwarf: 54 points minimum
- Gnome: 53 points minimum
- Hobbit: 52 points minimum (best)

## Saving Throw Formula

Saving throws use the formula:
```
Save% = (CharacterLevel/5 + Luck/6 - ClassBonus - RaceBonus) * 5%
```

Race bonuses reduce the percentage (improve save chance):
- Human: -1 vs death effects
- Elf: -2 vs wand effects (unused in original game code)
- Dwarf: -4 vs breath attacks
- Gnome: -2 vs petrification
- Hobbit: -3 vs spells

## File Organization

**Individual Race Files**: Each race is stored as a separate JSON file in `data/races/`
- **Naming Convention**: `{race-id}.json` (e.g., `human.json`, `elf.json`)
- **Benefits**:
  - Easy to reference by filename
  - Load races individually as needed
  - Simple to version control and diff
  - Clear separation of concerns

**Example File Path**: `data/races/human.json`

## Racial Analysis Reference

### Human
- **Role**: Jack-of-all-trades
- **Best For**: New players, flexible builds
- **Avoid**: Priest classes (low PIE)
- **Strategy**: Use bonus points to specialize or stay balanced

### Elf
- **Role**: Spellcaster (Mage/Priest)
- **Best For**: Magic-focused parties
- **Avoid**: Front-line combat (low VIT)
- **Strategy**: Maximize INT/PIE for spell power

### Dwarf
- **Role**: Tanky warrior-priest
- **Best For**: Front-line fighters, support priests
- **Avoid**: Speed-dependent builds (low AGI)
- **Strategy**: Use high VIT for survivability

### Gnome
- **Role**: Agile spellcaster
- **Best For**: Thieves, balanced casters
- **Avoid**: Pure fighters (moderate STR)
- **Strategy**: Leverage AGI for defense

### Hobbit
- **Role**: Lucky rogue
- **Best For**: Thieves (highest AGI and LUC)
- **Avoid**: Elite classes (Ninja is impossible at creation; requires 52+ points, max is 29)
- **Strategy**: Rely on extreme LUC for saving throws and treasure. Best candidate for class change to Ninja after leveling.

## Validation

All racial data validated against:
- Thomas William Ewers' reverse-engineered Apple II Pascal source code
- Snafaru's Wizardry Game Code Calculations (zimlab.com)
- Data Driven Gamer blog (datadrivengamer.blogspot.com)
- Original Wizardry 1 manual

**Total Races**: 5

## Notes

- **Stat Ranges**: Base stats range from 5 (Hobbit STR) to 15 (Hobbit LUC)
- **Highest Base Stat**: Hobbit LUC (15) - unique advantage
- **Lowest Base Stat**: Human PIE (5) and Hobbit STR (5)
- **Most Balanced**: Human (no stat above 9, no stat below 5 except PIE)
- **Most Specialized**: Hobbit (LUC 15 vs other stats 5-10)
- **Ninja**: Impossible to create at character creation (requires 52+ bonus points, max is 29). Can only be achieved through class change after leveling up.

**Last Updated**: 2025-11-30
**Status**: ✅ Complete - validated against reverse-engineered source code

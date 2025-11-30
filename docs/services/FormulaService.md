# FormulaService

**Pure function service for game formulas and calculations.**

> **IMPORTANT**: For authoritative formula reference, see:
> [character-creation-technical-reference.md](../research/character-creation-technical-reference.md)

## Responsibility

Implements all Wizardry 1 formulas including hit chance, damage, initiative, spell learning, level-up stat changes, and resurrection rates.

## API Reference

### calculateHitChance

Calculate hit chance percentage for attack.

**Signature**:
```typescript
function calculateHitChance(
  attacker: Combatant,
  targetAC: number
): number
```

**Parameters**:
- `attacker`: Attacking character or monster
- `targetAC`: Target's armor class

**Returns**: Hit chance percentage (0-95%)

**Formula**:
```
HPCALCMD = BaseMod + floor(Level / Divisor)
  Fighter/Priest/Samurai/Lord/Ninja: BaseMod=2, Divisor=3
  Mage/Thief/Bishop: BaseMod=0, Divisor=5

HitChance = (HPCALCMD + MonsterAC + (3 × VictimPosition) - 1) × 5%
Clamped to range: 5% to 95%
```

**Example**:
```typescript
const hitChance = FormulaService.calculateHitChance(
  { level: 10, class: "Fighter" },
  -5  // Target AC
)
// HPCALCMD = 2 + floor(10/3) = 2 + 3 = 5
// hitChance = (5 + (-5) + 29) × 5% = 29 × 5% = 145% -> 95% (capped)
```

### calculateDamage

Calculate damage for weapon attack.

**Signature**:
```typescript
function calculateDamage(
  attacker: Combatant,
  weapon: Weapon,
  critical: boolean
): number
```

**Parameters**:
- `attacker`: Attacking character
- `weapon`: Weapon being used
- `critical`: Whether attack is critical hit

**Returns**: Total damage dealt

**Formula**:
```
BaseDamage = WeaponDice + STR_Modifier
Critical: Multiply by 2 (or instant kill for decapitate)
```

**Example**:
```typescript
const damage = FormulaService.calculateDamage(
  { str: 18 },
  { damage: "1d8" },
  false
)
// damage = 1d8 + 3 (STR 18 = +3) = 4-11 damage
```

### calculateInitiative

Calculate initiative roll for combat.

**Signature**:
```typescript
function calculateInitiative(combatant: Combatant): number
```

**Parameters**:
- `combatant`: Character or monster

**Returns**: Initiative value (1-14)

**Formula**:
```
Character: random(1,10) + AgilityMod, clamped to 1-10
Monster: random(0,7) + 2 (range: 2-9)
Lower acts first. Characters win ties vs. monsters.
```

**Agility Modifiers** (lower is better - acts first):
- AGI 3: +2 (Slowest)
- AGI 4-5: +1
- AGI 6-7: 0 (Base)
- AGI 8-14: -1
- AGI 15: -2
- AGI 16: -3
- AGI 17: -4
- AGI 18: -5 (Fastest)

**Example**:
```typescript
const initiative = FormulaService.calculateInitiative({ agi: 15 })
// initiative = random(1-10) + (-2) = -1 to 8, clamped to 1-8
```

### calculateSpellLearningChance

Calculate chance to learn spell on level-up.

**Signature**:
```typescript
function calculateSpellLearningChance(
  stat: number,
  spellType: "mage" | "priest"
): number
```

**Parameters**:
- `stat`: INT for mage spells, PIE for priest spells
- `spellType`: Spell type being learned

**Returns**: Learning chance percentage (0-60%)

**Formula**:
```
LearnChance = stat / 30
```

**Example**:
```typescript
const chance = FormulaService.calculateSpellLearningChance(15, "mage")
// chance = 15 / 30 = 50%
```

### calculateStatChangeOnLevelUp

Calculate stat changes on level-up.

**Signature**:
```typescript
function calculateStatChangeOnLevelUp(
  currentStat: number,
  age: number
): number
```

**Parameters**:
- `currentStat`: Current stat value
- `age`: Character age

**Returns**: New stat value (±1 or unchanged)

**Formula**:
```
For each stat:
  75% chance to check for change
  If checked:
    If random(1-100) <= (130 - age): stat += 1
    Else: stat -= 1
```

**Example**:
```typescript
const newSTR = FormulaService.calculateStatChangeOnLevelUp(15, 20)
// Age 20: 110% increase chance (capped 95%), 5% decrease
// 75% × 95% = 71.25% chance to gain +1 STR
```

### calculateHPGainOnLevelUp

Calculate HP gained on level-up.

**Signature**:
```typescript
function calculateHPGainOnLevelUp(
  className: ClassName,
  vitality: number
): number
```

**Parameters**:
- `className`: Character class
- `vitality`: VIT stat

**Returns**: HP gained (minimum 1)

**Formula**:
Wizardry uses a unique HP system where ALL dice are re-rolled every level:
```
1. Roll ALL dice for current level (plus bonuses)
2. If new roll > current max HP: new max = roll
3. If new roll <= current max HP: new max = current max + 1
4. Always gain at least 1 HP

ClassHitDice:
  Fighter/Lord: 1d10
  Priest/Samurai: 1d8 (Samurai gets +1 extra die per level)
  Thief/Bishop/Ninja: 1d6
  Mage: 1d4

VIT_Modifier (per die):
  VIT 3: -2
  VIT 4-5: -1
  VIT 6-15: 0
  VIT 16: +1
  VIT 17: +2
  VIT 18: +3
```

**Example**:
```typescript
const hpGain = FormulaService.calculateHPGainOnLevelUp("Fighter", 18)
// hpGain = 1d10 + 2 (VIT 18) = 3-12 HP gained
```

### calculateAttacksPerRound

Calculate number of attacks per round.

**Signature**:
```typescript
function calculateAttacksPerRound(
  className: ClassName,
  level: number
): number
```

**Parameters**:
- `className`: Character class
- `level`: Character level

**Returns**: Attacks per round (1-10)

**Formula**:
```
Fighter/Samurai/Lord: 1 + floor(Level / 5), max 10
Ninja: 2 + floor(Level / 5), max 10
Others: 1 (fixed)
```

**Example**:
```typescript
const attacks = FormulaService.calculateAttacksPerRound("Fighter", 25)
// attacks = 1 + floor(25/5) = 1 + 5 = 6 attacks
```

### calculateCriticalChance

Calculate critical hit chance.

**Signature**:
```typescript
function calculateCriticalChance(level: number): number
```

**Parameters**:
- `level`: Attacker level

**Returns**: Critical hit percentage (2-50%)

**Formula**:
```
CriticalChance = 2 × Level (max 50%)
```

**Example**:
```typescript
const critChance = FormulaService.calculateCriticalChance(10)
// critChance = 2 × 10 = 20%
```

### calculateResurrectionChance

Calculate chance resurrection succeeds.

**Signature**:
```typescript
function calculateResurrectionChance(
  character: Character,
  spellType: "DI" | "KADORTO"
): number
```

**Parameters**:
- `character`: Dead character to resurrect
- `spellType`: Resurrection spell used

**Returns**: Success percentage

**Formula**:
```
Temple Resurrection:
  Dead: (50 + (3 × Vitality))%
  Ashes: (40 + (3 × Vitality))%

DI/KADORTO Spells:
  Success rate: (4 × Vitality)%
  On success: Target permanently loses 1 Vitality
  If Vitality = 3 when spell cast: Character LOST forever
```

**Example**:
```typescript
const chance = FormulaService.calculateResurrectionChance(
  deadCharacter,
  "temple"
)
// VIT 15: 50 + (3 × 15) = 95% success at temple
```

### calculateMonsterIdentificationChance

Calculate chance to identify monster per round.

**Signature**:
```typescript
function calculateMonsterIdentificationChance(
  character: Character
): number
```

**Parameters**:
- `character`: Character attempting identification

**Returns**: Identification percentage per round

**Formula**:
```
IDChance = (INT + PIE + Level) / 99
```

**Example**:
```typescript
const chance = FormulaService.calculateMonsterIdentificationChance({
  int: 18,
  pie: 18,
  level: 10
})
// chance = (18 + 18 + 10) / 99 = 46.5% per round
```

### calculateSpellPoints

Calculate spell points for character at level.

**Signature**:
```typescript
function calculateSpellPoints(
  character: Character,
  spellLevel: number,
  spellType: "mage" | "priest"
): number
```

**Parameters**:
- `character`: Character with spellcasting
- `spellLevel`: Spell level (1-7)
- `spellType`: Mage or priest spells

**Returns**: Spell points for that level (0-9)

**Formula**:
Each class has Value A and Value B:
```
| Class            | Value A | Value B |
|------------------|---------|---------|
| Priest           | 0       | 2       |
| Mage             | 0       | 2       |
| Bishop (Priest)  | 3       | 4       |
| Bishop (Mage)    | 0       | 4       |
| Lord (Priest)    | 3       | 2       |
| Samurai (Mage)   | 3       | 3       |

SP = CharacterLevel - ValueA + ValueB - (ValueB × Circle)
Clamped to range: 0-9
Minimum 1 SP per known spell in each circle
```

**Example**:
```typescript
const points = FormulaService.calculateSpellPoints(mage, 3, "mage")
// Level 5 Mage, circle 3:
// SP = 5 - 0 + 2 - (2 × 3) = 5 + 2 - 6 = 1 point
```

## Formula Validation

All formulas validated against:
- Thomas William Ewers' reverse-engineered Apple II source code (2012-2014)
- Snafaru's Wizardry #1-2-3 Game Code Calculations (zimlab.com)
- Data Driven Gamer blog (datadrivengamer.blogspot.com)

See:
- [Character Creation Technical Reference](../research/character-creation-technical-reference.md) - Complete mechanics
- [Combat Formulas](../research/combat-formulas.md) - Combat-specific formulas

## Dependencies

Uses:
- `RandomService` (dice rolls)

## Testing

See [FormulaService.test.ts](../../tests/services/FormulaService.test.ts)

**Key test cases**:
- Hit chance calculated correctly for all classes
- Agility modifiers applied to initiative
- Spell learning chance = stat/30
- Stat changes on level-up follow age formula
- HP gain uses correct hit dice per class
- Attacks per round increase every 5 levels
- Critical chance = 2 × level (max 50%)
- Resurrection rates match validated values
- Monster ID chance increases with INT/PIE/Level

## Related

- [Combat Formulas](../research/combat-formulas.md) - Formula validation
- [CombatService](./CombatService.md) - Uses formulas in combat
- [LevelingService](./LevelingService.md) - Uses level-up formulas
- [SpellService](./SpellService.md) - Uses spell formulas
- [RandomService](./RandomService.md) - Dice rolling

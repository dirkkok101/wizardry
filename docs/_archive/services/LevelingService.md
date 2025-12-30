# LevelingService

**Pure function service for experience points, level-up, and stat changes.**

## Responsibility

Manages character leveling, XP tracking, stat changes on level-up, HP gains, and spell point pool updates. Handles age-based stat progression and level requirements.

## API Reference

### awardExperience

Award experience points to character.

**Signature**:
```typescript
function awardExperience(
  character: Character,
  xpAmount: number
): Character
```

**Parameters**:
- `character`: Character to award XP
- `xpAmount`: Experience points to award

**Returns**: New character with updated XP

**Example**:
```typescript
const updated = LevelingService.awardExperience(fighter, 500)
// updated.xp = fighter.xp + 500
```

### canLevelUp

Check if character has enough XP to level up.

**Signature**:
```typescript
function canLevelUp(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: True if XP meets next level requirement

**Example**:
```typescript
if (LevelingService.canLevelUp(fighter)) {
  // Can visit training grounds to level up
}
```

### levelUp

Perform level-up (stats, HP, spells).

**Signature**:
```typescript
function levelUp(character: Character): LevelUpResult
```

**Parameters**:
- `character`: Character leveling up

**Returns**: Result with stat changes, HP gain, and new spell opportunities

**Effects**:
- Level increased by 1
- Stats modified (age-based chance)
- HP increased (class hit dice + VIT modifier)
- Spell point pools recalculated
- Age increased slightly

**Example**:
```typescript
const result = LevelingService.levelUp(fighter)
// result.character.level = fighter.level + 1
// result.statChanges: { str: +1, vit: +1, agi: -1, ... }
// result.hpGain: 8 (rolled 1d10 + VIT)
// result.spellsAvailable: [] (fighter has no spells)
```

### applyStatChanges

Apply stat changes on level-up.

**Signature**:
```typescript
function applyStatChanges(character: Character): StatChangeResult
```

**Parameters**:
- `character`: Character leveling up

**Returns**: Result with stat changes applied

**Formula**: Each stat has 75% chance to be checked, then `(130-age)%` chance to increase

**Example**:
```typescript
const result = LevelingService.applyStatChanges(fighter)
// result.changes: { str: +1, int: 0, pie: 0, vit: +1, agi: 0, luc: -1 }
// Younger characters more likely to gain
```

### calculateHPGain

Calculate HP gain on level-up.

**Signature**:
```typescript
function calculateHPGain(character: Character): number
```

**Parameters**:
- `character`: Character leveling up

**Returns**: HP gain amount (minimum 1)

**Formula**: `HitDice + VIT_modifier`, minimum 1

**Hit Dice by Class**:
- Fighter/Samurai/Lord: 1d10
- Priest/Ninja: 1d8
- Thief/Bishop: 1d6
- Mage: 1d4

**Example**:
```typescript
const hpGain = LevelingService.calculateHPGain(fighter)
// Fighter: 1d10 + VIT_modifier (average ~6-8 HP)
```

### getNextLevelXP

Get XP required for next level.

**Signature**:
```typescript
function getNextLevelXP(
  characterClass: CharacterClass,
  currentLevel: number
): number
```

**Parameters**:
- `characterClass`: Character class
- `currentLevel`: Current level

**Returns**: XP required for next level

**Example**:
```typescript
const xpNeeded = LevelingService.getNextLevelXP('FIGHTER', 5)
// XP to reach level 6
```

### updateSpellPoints

Update spell point pools after level-up.

**Signature**:
```typescript
function updateSpellPoints(character: Character): Character
```

**Parameters**:
- `character`: Character after level-up

**Returns**: Character with recalculated spell point pools

**Example**:
```typescript
const updated = LevelingService.updateSpellPoints(mage)
// Spell point pools increased based on new level
```

### getAvailableSpellsToLearn

Get spells character can attempt to learn.

**Signature**:
```typescript
function getAvailableSpellsToLearn(character: Character): Spell[]
```

**Parameters**:
- `character`: Character after level-up

**Returns**: Array of spells eligible for learning

**Example**:
```typescript
const spells = LevelingService.getAvailableSpellsToLearn(mage)
// Level 5 mage can learn level 1-3 spells not yet learned
```

### attemptSpellLearning

Attempt to learn spells on level-up.

**Signature**:
```typescript
function attemptSpellLearning(
  character: Character,
  availableSpells: Spell[]
): SpellLearningResult
```

**Parameters**:
- `character`: Character attempting to learn
- `availableSpells`: Spells to attempt

**Returns**: Result with learned spells

**Formula**: Learn chance = `(INT or PIE) / 30` per spell

**Example**:
```typescript
const result = LevelingService.attemptSpellLearning(
  mage,
  [spell1, spell2, spell3]
)
// result.learned: ['MAHALITO', 'MOLITO']
// result.failed: ['DALTO']
```

### getStatIncreaseChance

Get chance for stat to increase on level-up.

**Signature**:
```typescript
function getStatIncreaseChance(age: number): number
```

**Parameters**:
- `age`: Character age

**Returns**: Percentage chance stat increases (vs decreases)

**Formula**: `(130 - age)%`

**Example**:
```typescript
const chance = LevelingService.getStatIncreaseChance(15)
// chance = 115% (capped at 95% in practice)
// Young characters almost always gain stats
```

### applyAging

Apply aging effect from level-up or resting.

**Signature**:
```typescript
function applyAging(
  character: Character,
  amount: number
): Character
```

**Parameters**:
- `character`: Character aging
- `amount`: Age increase (typically 0.1-1.0 years)

**Returns**: Character with increased age

**Example**:
```typescript
const aged = LevelingService.applyAging(fighter, 0.5)
// aged.age = fighter.age + 0.5
```

### checkOldAgeDeath

Check if character dies from old age.

**Signature**:
```typescript
function checkOldAgeDeath(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: True if died from old age

**Risk Formula**: Increases significantly after age 50

**Example**:
```typescript
if (LevelingService.checkOldAgeDeath(character)) {
  // Character died from old age (50+)
}
```

### getXPToNextLevel

Get remaining XP needed for next level.

**Signature**:
```typescript
function getXPToNextLevel(character: Character): number
```

**Parameters**:
- `character`: Character to check

**Returns**: XP still needed (0 if can level up)

**Example**:
```typescript
const remaining = LevelingService.getXPToNextLevel(fighter)
// remaining = 1500 (need 1500 more XP to level up)
```

### distributePartyXP

Distribute XP to all living party members.

**Signature**:
```typescript
function distributePartyXP(
  party: Party,
  totalXP: number
): Party
```

**Parameters**:
- `party`: Current party
- `totalXP`: Total XP to distribute

**Returns**: Party with XP awarded to members

**Distribution**: Split evenly among living members

**Example**:
```typescript
const updated = LevelingService.distributePartyXP(party, 6000)
// 6 members: 1000 XP each
```

## Dependencies

Uses:
- `CharacterService` - Stat modifications, HP calculation
- `SpellService` - Spell point pool updates
- `RandomService` - RNG for stat changes, HP rolls, spell learning
- `xp-tables.json` - XP requirements per class

## Testing

See [LevelingService.test.ts](../../tests/services/LevelingService.test.ts)

**Key test cases**:
- XP award and tracking
- Level-up eligibility check
- Stat changes (age-based probability)
- HP gain (class hit dice + VIT)
- Spell point pool updates
- Spell learning (INT/PIE based)
- Age increase effects
- Old age death risk (50+)
- XP distribution to party
- Next level XP calculation

## Related

- [Progression System](../game-design/08-progression.md) - Player guide
- [Combat Formulas](../research/combat-formulas.md) - Stat change formulas
- [LevelUpCharacterCommand](../commands/LevelUpCharacterCommand.md) - Uses this service
- [TrainingService](./TrainingService.md) - Training grounds management

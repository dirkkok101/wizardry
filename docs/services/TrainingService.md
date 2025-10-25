# TrainingService

**Pure function service for training grounds roster management and level-up.**

## Responsibility

Manages character roster operations, level-up processing, class changing, and character deletion at training grounds.

## API Reference

### levelUpCharacter

Level up character at training grounds.

**Signature**:
```typescript
function levelUpCharacter(character: Character): Character
```

**Parameters**:
- `character`: Character with sufficient XP for next level

**Returns**: Character with level increased, stats changed, HP gained, spells learned

**Effects**:
- Increment level
- Increase HP by class hit dice + VIT modifier
- Attempt to learn new spells
- Roll stat changes (75% chance per stat, age-dependent)
- Recalculate spell points

**Throws**:
- `InsufficientXPError` if character doesn't have enough XP
- `MaxLevelError` if character at max level (13+ for most classes)

**Example**:
```typescript
const fighter = createCharacter({
  class: 'Fighter',
  level: 4,
  xp: 2000,  // Enough for level 5
  hp: 30,
  maxHP: 30,
  stats: { str: 16, int: 10, pie: 10, vit: 14, agi: 12, luc: 10 },
  age: 20
})

const leveled = TrainingService.levelUpCharacter(fighter)
// leveled.level = 5
// leveled.hp = 30 + (1d10 + VIT_modifier) (e.g., 30 + 7 = 37)
// leveled.maxHP = 37
// leveled.stats may have changed (75% chance per stat, age-based)
```

### addToRoster

Add new character to roster.

**Signature**:
```typescript
function addToRoster(
  roster: Map<string, Character>,
  character: Character
): Map<string, Character>
```

**Parameters**:
- `roster`: Current character roster
- `character`: New character to add

**Returns**: Updated roster with character added

**Throws**:
- `RosterFullError` if roster has 20 characters (max)
- `DuplicateNameError` if name already exists

**Example**:
```typescript
const roster = new Map([
  ['char1', createCharacter({ name: 'Gandalf' })]
])
const newChar = createCharacter({ name: 'Aragorn' })

const updated = TrainingService.addToRoster(roster, newChar)
// updated.size = 2
// updated.has('char2') = true
```

### removeFromRoster

Remove character from roster.

**Signature**:
```typescript
function removeFromRoster(
  roster: Map<string, Character>,
  characterId: string,
  activeParty: Party
): Map<string, Character>
```

**Parameters**:
- `roster`: Current roster
- `characterId`: ID of character to remove
- `activeParty`: Current active party

**Returns**: Updated roster without character

**Throws**:
- `CharacterNotFoundError` if character ID doesn't exist
- `CharacterInPartyError` if character is in active party

**Example**:
```typescript
const roster = new Map([
  ['char1', gandalf],
  ['char2', aragorn]
])
const party = createParty({ members: [gandalf] })  // Gandalf in party

// This throws error:
// TrainingService.removeFromRoster(roster, 'char1', party)
// Error: Cannot delete character in active party

// This succeeds:
const updated = TrainingService.removeFromRoster(roster, 'char2', party)
// updated.has('char2') = false (Aragorn removed)
```

### changeClass

Change character's class.

**Signature**:
```typescript
function changeClass(
  character: Character,
  newClass: Class
): Character
```

**Parameters**:
- `character`: Character changing class
- `newClass`: New class to change to

**Returns**: Character with class changed, stats/abilities updated

**Requirements**:
- Character must meet stat requirements for new class
- Character must be alive
- Character usually high level (to meet elite class requirements)

**Effects**:
- Change class
- Reset level to 1 (keep stats)
- Recalculate HP (based on new class hit dice)
- Update spell access (if applicable)
- Update equipment restrictions

**Throws**:
- `InsufficientStatsError` if character doesn't meet class requirements
- `InvalidStatusError` if character is dead/ashes

**Example**:
```typescript
const thief = createCharacter({
  class: 'Thief',
  level: 10,
  stats: { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 },  // Perfect roll
  alignment: 'evil'
})

const ninja = TrainingService.changeClass(thief, 'Ninja')
// ninja.class = 'Ninja'
// ninja.level = 1 (reset)
// ninja.stats = same (17s across the board)
// ninja.maxHP recalculated (Ninja hit dice)
// ninja can now use Ninja abilities (decapitation, best AC unarmored)
```

### getRosterCharacters

Get all characters in roster.

**Signature**:
```typescript
function getRosterCharacters(
  roster: Map<string, Character>
): Character[]
```

**Parameters**:
- `roster`: Character roster

**Returns**: Array of all characters

**Example**:
```typescript
const roster = new Map([
  ['char1', gandalf],
  ['char2', aragorn],
  ['char3', legolas]
])

const characters = TrainingService.getRosterCharacters(roster)
// Result: [gandalf, aragorn, legolas]
```

### getEligibleForLevelUp

Get characters eligible for level-up.

**Signature**:
```typescript
function getEligibleForLevelUp(
  roster: Map<string, Character>
): Character[]
```

**Parameters**:
- `roster`: Character roster

**Returns**: Characters with sufficient XP for next level

**Example**:
```typescript
const roster = new Map([
  ['char1', createCharacter({ level: 5, xp: 10000 })],  // Enough XP
  ['char2', createCharacter({ level: 3, xp: 500 })],     // Not enough
  ['char3', createCharacter({ level: 7, xp: 50000 })]   // Enough XP
])

const eligible = TrainingService.getEligibleForLevelUp(roster)
// Result: [char1, char3] (have enough XP)
```

### canChangeClass

Check if character can change to target class.

**Signature**:
```typescript
function canChangeClass(
  character: Character,
  targetClass: Class
): boolean
```

**Parameters**:
- `character`: Character attempting class change
- `targetClass`: Target class

**Returns**: True if character meets requirements

**Checks**:
- Stat requirements
- Alignment requirements
- Character is alive

**Example**:
```typescript
const fighter = createCharacter({
  class: 'Fighter',
  stats: { str: 15, int: 11, pie: 10, vit: 14, agi: 10, luc: 9 },
  alignment: 'good'
})

const canBeSamurai = TrainingService.canChangeClass(fighter, 'Samurai')
// Result: false (needs STR 15, VIT 14, INT 11, PIE 10, AGI 10 - missing AGI and all stats slightly low)

const canBeLord = TrainingService.canChangeClass(fighter, 'Lord')
// Result: false (Lord needs STR 15, VIT 15, INT 12, PIE 12, AGI 14, LUC 15 - doesn't meet requirements)
```

### calculateStatChanges

Calculate stat changes on level-up.

**Signature**:
```typescript
function calculateStatChanges(character: Character): StatChanges
```

**Parameters**:
- `character`: Character leveling up

**Returns**: Stat changes to apply (increases/decreases)

**Formula**:
```typescript
For each stat:
  if random(1-100) <= 75:  // 75% chance stat is checked
    Roll = random(1-100)

    if Roll <= (130 - Age):
      Stat += 1  // INCREASE
    else:
      Stat -= 1  // DECREASE
```

**Example**:
```typescript
const young = createCharacter({ age: 20, stats: { str: 15, int: 12, ... } })

const changes = TrainingService.calculateStatChanges(young)
// Age 20: 110% increase chance (capped at 95%), 5% decrease
// Likely result: { str: +1, int: 0, pie: +1, vit: 0, agi: +1, luc: -1 }
// (Most stats increase, rare decrease)

const old = createCharacter({ age: 70, stats: { str: 10, int: 10, ... } })
const oldChanges = TrainingService.calculateStatChanges(old)
// Age 70: 60% increase, 40% decrease
// Likely result: Mix of increases and decreases
```

## Dependencies

Uses:
- `LevelingService` (XP requirements, HP gain)
- `SpellLearningService` (learn spells on level-up)
- `ValidationService` (validate class requirements, roster limits)
- `RandomService` (stat changes, HP rolls)

## Testing

See [TrainingService.test.ts](../../tests/services/TrainingService.test.ts)

**Key test cases**:
- Level-up increases level
- Level-up grants HP (class hit dice)
- Level-up attempts spell learning
- Level-up rolls stat changes
- Insufficient XP throws error
- Add to roster increments roster size
- Roster full (20 max) throws error
- Remove from roster decreases size
- Cannot remove character in party
- Class change resets level to 1
- Class change keeps stats
- Class change requires stat minimums
- Stat changes 75% chance per stat
- Age impacts stat increase/decrease probability

## Related

- [Combat Formulas](../research/combat-formulas.md) - Level-up stat formulas
- [Class Reference](../research/class-reference.md) - Class requirements
- [LevelUpCharacterCommand](../commands/LevelUpCharacterCommand.md) - Uses this service
- [ChangeClassCommand](../commands/ChangeClassCommand.md) - Uses this service
- [TownService](./TownService.md) - Training access validation
- [Town System](../systems/town-system.md) - Town services overview

# LearnSpellCommand

**Attempt to learn new spell on character level-up.**

## Responsibility

Handles spell learning when character gains a level, determining success based on character's INT (Mage) or PIE (Priest) stat. Adds spell to character's spell book on success and recalculates spell point pool for the spell's level.

## Command Flow

### Preconditions
1. Character is eligible spell caster (Mage, Priest, Bishop, Samurai, Lord)
2. Character has gained a level (triggered by level-up)
3. Spell level is accessible at character's current level
4. Character doesn't already know the spell
5. Spell is appropriate for character's spell type (Mage/Priest)

### Services Called
1. **SpellService.canLearnSpellLevel** - Validate spell level access
2. **SpellService.learnSpell** - Attempt spell learning
3. **SpellService.calculateSpellPoints** - Recalculate spell point pool
4. **CharacterService.getSpellClass** - Determine Mage or Priest type
5. **EventService.createEvent** - Log learning attempt

### Events Created
```typescript
{
  type: "SPELL_LEARNED",
  characterId: string,
  spellId: string,
  success: boolean,
  learnChance: number,
  timestamp: number
}
```

### State Changes
1. Spell added to spell book (if successful)
2. Spell point pool recalculated for spell's level
3. Character spell list updated
4. Event added to game log

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  characterId: string,
  spellId: string
}): GameState
```

**Parameters**:
- `state` - Current game state
- `params.characterId` - Character attempting to learn spell
- `params.spellId` - Spell identifier to learn (e.g., "HALITO", "DIOS")

**Returns**: New game state with spell learned (if successful)

**Throws**:
- `CharacterNotFoundError` - Character ID invalid
- `CannotLearnSpellError` - Character class cannot learn spells
- `SpellNotFoundError` - Invalid spell ID
- `SpellAlreadyLearnedError` - Character already knows spell
- `SpellLevelTooHighError` - Character level too low for spell level
- `WrongSpellTypeError` - Mage trying to learn Priest spell or vice versa

## Preconditions

### Character Validation
```typescript
// Character must exist
const character = state.roster.get(characterId)
if (!character) throw new CharacterNotFoundError()

// Character must be spell caster
const spellCasters = ['MAGE', 'PRIEST', 'BISHOP', 'SAMURAI', 'LORD']
if (!spellCasters.includes(character.class)) {
  throw new CannotLearnSpellError(
    `${character.class} cannot learn spells`
  )
}
```

### Spell Validation
```typescript
// Spell must exist
const spell = SpellService.getSpellData(spellId)
if (!spell) throw new SpellNotFoundError(spellId)

// Character must not already know spell
if (SpellService.hasSpellLearned(character, spellId)) {
  throw new SpellAlreadyLearnedError(
    `${character.name} already knows ${spellId}`
  )
}
```

### Spell Level Check
```typescript
// Character level must be high enough for spell level
const spellClass = spell.class // 'MAGE' or 'PRIEST'
if (!SpellService.canLearnSpellLevel(character, spell.level, spellClass)) {
  throw new SpellLevelTooHighError(
    `Level ${character.level} too low for level ${spell.level} spell`
  )
}
```

### Spell Type Check
```typescript
// Verify character can learn this spell type
const characterSpellType = CharacterService.getSpellClass(character)
if (characterSpellType !== spell.class) {
  // Bishop exception: can learn both Mage and Priest
  if (character.class !== 'BISHOP') {
    throw new WrongSpellTypeError(
      `${character.class} cannot learn ${spell.class} spells`
    )
  }
}
```

## Services Used

### SpellService
- **learnSpell** - Attempt spell learning with probability
- **hasSpellLearned** - Check if spell already known
- **canLearnSpellLevel** - Validate level access
- **calculateSpellPoints** - Recalculate pool for spell level
- **getSpellData** - Get spell properties

### CharacterService
- **getSpellClass** - Determine if character uses Mage or Priest spells

### RandomService
- **roll** - Determine learning success

### EventService
- **createEvent** - Create SPELL_LEARNED event

## Events Created

### SPELL_LEARNED Event (Success)
```typescript
{
  id: "evt-12352",
  type: "SPELL_LEARNED",
  timestamp: 1635725500000,
  characterId: "char-mage",
  characterName: "Gandalf",
  characterLevel: 3,
  spellId: "MAHALITO",
  spellName: "MAHALITO (Big Fire)",
  spellLevel: 3,
  spellType: "MAGE",
  success: true,
  learnChance: 60,
  roll: 45,
  newSpellPointsMax: 3  // For level 3 spells
}
```

### SPELL_LEARNED Event (Failure)
```typescript
{
  id: "evt-12353",
  type: "SPELL_LEARNED",
  timestamp: 1635725600000,
  characterId: "char-priest",
  characterName: "Merlin",
  characterLevel: 2,
  spellId: "MATU",
  spellName: "MATU (Bless)",
  spellLevel: 2,
  spellType: "PRIEST",
  success: false,
  learnChance: 40,
  roll: 85
}
```

## Learning Mechanics

### Learn Chance Formula
```typescript
// Learn probability = (INT or PIE) / 30
const stat = spellType === 'MAGE' ? character.stats.int : character.stats.pie
const learnChance = Math.min(100, (stat / 30) * 100)

// Example: INT 15 = 15/30 = 50% chance
// Example: PIE 18 = 18/30 = 60% chance
```

### Stat Requirements by Probability
| INT/PIE | Learn Chance | Expected Attempts |
|---------|--------------|-------------------|
| 11 | 36.7% | ~3 levels |
| 12 | 40.0% | ~2.5 levels |
| 13 | 43.3% | ~2.3 levels |
| 14 | 46.7% | ~2.1 levels |
| 15 | 50.0% | ~2 levels |
| 16 | 53.3% | ~1.9 levels |
| 17 | 56.7% | ~1.8 levels |
| 18+ | 60.0% | ~1.7 levels |

### Spell Level Access by Character Level
**Mage/Priest**:
- Level 1: Can learn level 1 spells
- Level 3: Can learn level 2 spells
- Level 5: Can learn level 3 spells
- Level 7: Can learn level 4 spells
- Level 9: Can learn level 5 spells
- Level 11: Can learn level 6 spells
- Level 13: Can learn level 7 spells

**Bishop**: Same as Mage/Priest, but can learn both types

**Samurai/Lord**: Limited spell access (subset of levels)

### Spell Point Pool Recalculation
When spell is learned:
1. Count spells known at that level
2. Recalculate max spell points for level
3. Current points set to new maximum

```typescript
// Example: Learning 2nd level 3 spell
// Before: 1 spell known, max 2 points
// After: 2 spells known, max 3 points
```

## Testing

### Test Cases

**Successful Learning**:
```typescript
test('mage learns HALITO with high INT', () => {
  const mage = createMage({
    level: 1,
    stats: { int: 18 },
    spells: []
  })
  const state = createGameState({ roster: [mage] })

  // Mock roll for guaranteed success (60% chance)
  jest.spyOn(RandomService, 'roll').mockReturnValue(50)

  const result = LearnSpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'HALITO'
  })

  const updated = result.roster.get(mage.id)!
  expect(updated.spells).toContain('HALITO')
  expect(updated.mageSpellPoints.get(1)).toBeGreaterThan(0)
})
```

**Failed Learning**:
```typescript
test('priest fails to learn spell with low PIE', () => {
  const priest = createPriest({
    level: 1,
    stats: { pie: 11 },
    spells: []
  })
  const state = createGameState({ roster: [priest] })

  // Mock roll for guaranteed failure (36.7% chance)
  jest.spyOn(RandomService, 'roll').mockReturnValue(80)

  const result = LearnSpellCommand.execute(state, {
    characterId: priest.id,
    spellId: 'DIOS'
  })

  const updated = result.roster.get(priest.id)!
  expect(updated.spells).not.toContain('DIOS')

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.success).toBe(false)
})
```

**Bishop Learns Both Types**:
```typescript
test('bishop can learn both mage and priest spells', () => {
  const bishop = createBishop({
    level: 1,
    stats: { int: 16, pie: 16 },
    spells: []
  })
  const state = createGameState({ roster: [bishop] })

  // Learn mage spell
  const state2 = LearnSpellCommand.execute(state, {
    characterId: bishop.id,
    spellId: 'HALITO'
  })

  // Learn priest spell
  const state3 = LearnSpellCommand.execute(state2, {
    characterId: bishop.id,
    spellId: 'DIOS'
  })

  const updated = state3.roster.get(bishop.id)!
  expect(updated.spells).toContain('HALITO')
  expect(updated.spells).toContain('DIOS')
})
```

**Already Learned**:
```typescript
test('prevents learning spell already known', () => {
  const mage = createMage({
    level: 1,
    spells: ['HALITO']
  })
  const state = createGameState({ roster: [mage] })

  expect(() => LearnSpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'HALITO'
  })).toThrow(SpellAlreadyLearnedError)
})
```

**Level Too Low**:
```typescript
test('prevents learning high-level spell at low level', () => {
  const mage = createMage({
    level: 1,  // Can only learn level 1 spells
    stats: { int: 18 }
  })
  const state = createGameState({ roster: [mage] })

  expect(() => LearnSpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'MAHALITO'  // Level 3 spell
  })).toThrow(SpellLevelTooHighError)
})
```

**Wrong Spell Type**:
```typescript
test('prevents mage from learning priest spell', () => {
  const mage = createMage({
    level: 1,
    stats: { int: 18 }
  })
  const state = createGameState({ roster: [mage] })

  expect(() => LearnSpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'DIOS'  // Priest spell
  })).toThrow(WrongSpellTypeError)
})
```

**Spell Points Recalculation**:
```typescript
test('recalculates spell point pool when spell learned', () => {
  const mage = createMage({
    level: 3,
    stats: { int: 16 },
    spells: ['HALITO'],  // 1 level-1 spell
    mageSpellPoints: new Map([[1, 2]])
  })
  const state = createGameState({ roster: [mage] })

  const result = LearnSpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'KATINO'  // Another level-1 spell
  })

  const updated = result.roster.get(mage.id)!
  // Pool increases with more spells known
  expect(updated.mageSpellPoints.get(1)).toBeGreaterThan(2)
})
```

**Event Creation**:
```typescript
test('creates SPELL_LEARNED event with details', () => {
  const mage = createMage({
    level: 1,
    stats: { int: 15 }
  })
  const state = createGameState({ roster: [mage] })

  const result = LearnSpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'HALITO'
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('SPELL_LEARNED')
  expect(lastEvent.spellName).toContain('HALITO')
  expect(lastEvent.learnChance).toBe(50)  // 15 INT = 50%
  expect(lastEvent.success).toBeDefined()
})
```

## Related

- [SpellService](../services/SpellService.md) - Spell learning and management
- [CharacterService](../services/CharacterService.md) - Character class validation
- [LevelUpCharacterCommand](../inn/LevelUpCharacterCommand.md) - Triggers spell learning
- [CastUtilitySpellCommand](./CastUtilitySpellCommand.md) - Use learned spells
- [CastSpellCommand](../combat/CastSpellCommand.md) - Combat spells
- [Spell Reference](../research/spell-reference.md) - All spells documented
- [Magic System](../game-design/09-magic-system.md) - Spell learning mechanics

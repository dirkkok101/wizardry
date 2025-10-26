# ChangeClassCommand

**Change character class at the Training Grounds (resets to level 1).**

## Responsibility

Handles class changing by validating new class requirements, resetting character to level 1, preserving stats and some spells, and updating class. Creates event log entry for class change. Critical for advanced character building strategies.

## Command Flow

**Preconditions**:
- Character must exist in roster
- Character must meet stat requirements for new class
- Character alignment must be compatible with new class
- Character must be at Training Grounds (town)
- Character must be alive

**Services Called**:
1. `CharacterService.canChangeClass()` - Validate class change requirements
2. `CharacterCreationService.getClassRequirements()` - Get new class requirements
3. `CharacterService.changeClass()` - Execute class change
4. `SpellService.retainSpells()` - Determine which spells to keep
5. `CharacterService.resetToLevel1()` - Reset level and experience

**Events Created**:
- `CharacterClassChangedEvent` - Log class change with details

**State Changes**:
- Changes `character.class` to new class
- Resets `character.level` to 1
- Resets `character.experience` to 0
- Updates `character.hp` to new class base
- Preserves `character.stats` (all stats retained!)
- Updates `character.spells` (some spells may be retained)
- Adds class change event to `gameState.eventLog`

## API Reference

```typescript
interface ChangeClassCommand {
  execute(
    state: GameState,
    characterId: string,
    newClass: CharacterClass
  ): GameState
}

interface ClassChangeResult {
  oldClass: CharacterClass
  newClass: CharacterClass
  spellsRetained: Spell[]
  spellsLost: Spell[]
}
```

## Preconditions

**Validation checks**:
1. **Character exists**: Character ID must exist in roster
2. **Stat requirements**: Character stats must meet new class minimums
3. **Alignment compatible**: Character alignment must match class restrictions
4. **Location check**: Character must be at Training Grounds
5. **Character alive**: Cannot change class if dead

**Throws**:
- `CharacterNotFoundError` - Character ID doesn't exist
- `InsufficientStatsError` - Stats don't meet new class requirements
- `AlignmentMismatchError` - Alignment incompatible with new class
- `InvalidLocationError` - Not at Training Grounds
- `CharacterDeadError` - Cannot change class when dead

## Services Used

### CharacterService
- `canChangeClass()` - Check if class change is valid
- `changeClass()` - Execute class change
- `resetToLevel1()` - Reset character to level 1
- `recalculateHP()` - Calculate HP for new class at level 1

### CharacterCreationService
- `getClassRequirements()` - Get stat/alignment requirements for new class
- `getEligibleClasses()` - List all classes character can become

### SpellService
- `retainSpells()` - Determine which spells carry over to new class
  - Mage→Bishop: Keep all Mage spells
  - Priest→Bishop: Keep all Priest spells
  - Bishop→Mage: Keep learned Mage spells
  - Bishop→Priest: Keep learned Priest spells
  - Other transitions: Lose all spells

## Events Created

### CharacterClassChangedEvent
```typescript
{
  type: 'CHARACTER_CLASS_CHANGED',
  timestamp: number,
  data: {
    characterId: string,
    name: string,
    oldClass: CharacterClass,
    newClass: CharacterClass,
    level: 1,
    spellsRetained: string[],
    spellsLost: string[]
  }
}
```

**Event log message**: "Gandalf changed from Mage to Bishop! (Reset to Level 1, retained 5 Mage spells)"

## Class Change Strategies

### Common Paths

**Fighter → Samurai**:
- Build up INT/PIE through items/aging
- Gain Mage spells while keeping combat prowess
- Popular path for balanced hybrid

**Mage → Samurai**:
- Build up STR/VIT/AGI through items/aging
- Lose Mage spells but gain combat ability
- Eventually regain spell access

**Priest → Lord**:
- Build up STR/VIT/AGI/LUC through items/aging
- Keep Priest spells during transition
- Ultimate paladin build

**Any → Ninja**:
- Requires all stats ≥ 17 (very difficult)
- Usually achieved through aging and cursed items
- Must be Evil alignment

### Multi-Class Grinding
- Change class repeatedly to build ultimate character
- Each class change resets to level 1 but keeps stats
- Level 1→13 in each class to maximize stat gains
- Eventually achieve Ninja with mastery of all classes

## Example Usage

```typescript
// High-level Mage wants to become Bishop
const mage = RosterService.findCharacter(roster, "char-123")
// mage: { class: "MAGE", level: 8, stats: { int: 18, pie: 15 }, knownSpells: [...] }

// Check if eligible for Bishop
const canChange = CharacterService.canChangeClass(mage, "BISHOP")
// canChange: true (INT 18 ≥ 12, PIE 15 ≥ 12)

// Execute class change
const newState = ChangeClassCommand.execute(gameState, "char-123", "BISHOP")

// Character now Bishop at level 1
const bishop = RosterService.findCharacter(newState.roster, "char-123")
// bishop: {
//   class: "BISHOP",
//   level: 1,
//   stats: { int: 18, pie: 15 }, // STATS PRESERVED!
//   knownSpells: [...] // Mage spells retained
// }
```

## Spell Retention Rules

```typescript
// Spell retention matrix
const retentionRules = {
  'MAGE→BISHOP': 'Keep all Mage spells',
  'PRIEST→BISHOP': 'Keep all Priest spells',
  'BISHOP→MAGE': 'Keep Mage spells learned as Bishop',
  'BISHOP→PRIEST': 'Keep Priest spells learned as Bishop',
  'SAMURAI→MAGE': 'Keep Mage spells learned as Samurai',
  'LORD→PRIEST': 'Keep Priest spells learned as Lord',
  // All other combinations: lose all spells
}
```

## Testing

**Test cases**:

```typescript
describe('ChangeClassCommand', () => {
  test('Mage changes to Bishop at level 1', () => {
    const mage = createCharacter({
      name: "Wizard",
      class: "MAGE",
      level: 5,
      stats: { int: 18, pie: 15 },
      knownSpells: ['KATINO', 'MAHALITO', 'DUMAPIC']
    })

    const newState = ChangeClassCommand.execute(gameState, mage.id, "BISHOP")
    const bishop = RosterService.findCharacter(newState.roster, mage.id)

    expect(bishop.class).toBe("BISHOP")
    expect(bishop.level).toBe(1)
    expect(bishop.stats.int).toBe(18) // Stats preserved
    expect(bishop.knownSpells).toContain('KATINO') // Spells retained
  })

  test('Fighter changes to Samurai (loses no spells)', () => {
    const fighter = createCharacter({
      class: "FIGHTER",
      level: 10,
      stats: { str: 17, vit: 16, int: 12, pie: 11, agi: 11 }
    })

    const newState = ChangeClassCommand.execute(gameState, fighter.id, "SAMURAI")
    const samurai = RosterService.findCharacter(newState.roster, fighter.id)

    expect(samurai.class).toBe("SAMURAI")
    expect(samurai.level).toBe(1)
    expect(samurai.knownSpells).toEqual([]) // Fighter had no spells
  })

  test('throws error when stats insufficient', () => {
    const weakMage = createCharacter({
      class: "MAGE",
      stats: { int: 11, pie: 8 } // PIE too low for Bishop (needs 12)
    })

    expect(() => ChangeClassCommand.execute(gameState, weakMage.id, "BISHOP"))
      .toThrow(InsufficientStatsError)
  })

  test('throws error when alignment incompatible', () => {
    const evilFighter = createCharacter({
      class: "FIGHTER",
      alignment: "EVIL",
      stats: { str: 16, vit: 16, int: 13, pie: 13, agi: 15, luc: 16 }
    })

    expect(() => ChangeClassCommand.execute(gameState, evilFighter.id, "LORD"))
      .toThrow(AlignmentMismatchError) // Lord must be Good
  })

  test('Priest to Lord retains Priest spells', () => {
    const priest = createCharacter({
      class: "PRIEST",
      level: 7,
      alignment: "GOOD",
      stats: { str: 15, vit: 15, int: 12, pie: 14, agi: 14, luc: 15 },
      knownSpells: ['DIOS', 'BADIOS', 'DIALKO']
    })

    const newState = ChangeClassCommand.execute(gameState, priest.id, "LORD")
    const lord = RosterService.findCharacter(newState.roster, priest.id)

    expect(lord.knownSpells).toContain('DIOS')
    expect(lord.knownSpells).toContain('BADIOS')
  })

  test('Bishop to Mage loses Priest spells', () => {
    const bishop = createCharacter({
      class: "BISHOP",
      level: 5,
      stats: { int: 16, pie: 14 },
      knownSpells: ['KATINO', 'MAHALITO', 'DIOS', 'BADIOS']
    })

    const newState = ChangeClassCommand.execute(gameState, bishop.id, "MAGE")
    const mage = RosterService.findCharacter(newState.roster, bishop.id)

    expect(mage.knownSpells).toContain('KATINO') // Mage spell kept
    expect(mage.knownSpells).not.toContain('DIOS') // Priest spell lost
  })

  test('HP recalculated for new class', () => {
    const mage = createCharacter({
      class: "MAGE",
      level: 8,
      hp: { current: 30, max: 30 },
      stats: { int: 18, pie: 14, vit: 8 }
    })

    const newState = ChangeClassCommand.execute(gameState, mage.id, "BISHOP")
    const bishop = RosterService.findCharacter(newState.roster, mage.id)

    expect(bishop.level).toBe(1)
    expect(bishop.hp.max).toBeLessThan(30) // Level 1 HP
  })

  test('experience reset to 0', () => {
    const veteran = createCharacter({
      class: "FIGHTER",
      level: 10,
      experience: 50000,
      stats: { str: 18, vit: 17, int: 12, pie: 11, agi: 12 }
    })

    const newState = ChangeClassCommand.execute(gameState, veteran.id, "SAMURAI")
    const samurai = RosterService.findCharacter(newState.roster, veteran.id)

    expect(samurai.experience).toBe(0)
  })

  test('event log contains class change details', () => {
    const character = createCharacter({
      name: "Versatile",
      class: "MAGE",
      level: 5,
      stats: { int: 16, pie: 14 },
      knownSpells: ['KATINO', 'MAHALITO']
    })

    const newState = ChangeClassCommand.execute(gameState, character.id, "BISHOP")
    const event = newState.eventLog[newState.eventLog.length - 1]

    expect(event.type).toBe('CHARACTER_CLASS_CHANGED')
    expect(event.data.oldClass).toBe("MAGE")
    expect(event.data.newClass).toBe("BISHOP")
    expect(event.data.spellsRetained).toHaveLength(2)
  })

  test('change to Ninja requires all stats 17+', () => {
    const almostNinja = createCharacter({
      class: "THIEF",
      alignment: "EVIL",
      stats: { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 16 } // LUC too low
    })

    expect(() => ChangeClassCommand.execute(gameState, almostNinja.id, "NINJA"))
      .toThrow(InsufficientStatsError)
  })

  test('successful Ninja class change', () => {
    const perfect = createCharacter({
      class: "THIEF",
      alignment: "EVIL",
      level: 13,
      stats: { str: 18, int: 18, pie: 18, vit: 18, agi: 18, luc: 18 }
    })

    const newState = ChangeClassCommand.execute(gameState, perfect.id, "NINJA")
    const ninja = RosterService.findCharacter(newState.roster, perfect.id)

    expect(ninja.class).toBe("NINJA")
    expect(ninja.level).toBe(1) // Reset!
  })
})
```

## Related

**Services**:
- [CharacterService](../services/CharacterService.md) - Class change logic
- [CharacterCreationService](../services/CharacterCreationService.md) - Class requirements
- [SpellService](../services/SpellService.md) - Spell retention

**Reference Data**:
- [Class Reference](../research/class-reference.md) - All class requirements
- [Class Change Paths](../research/class-reference.md#class-changing) - Optimal strategies

**Related Commands**:
- [CreateCharacterCommand](./CreateCharacterCommand.md) - Initial class selection
- [LevelUpCharacterCommand](../inn/LevelUpCharacterCommand.md) - Level progression

**Game Design**:
- [Character Progression](../game-design/04-character-progression.md) - Multi-class strategies
- [Training Grounds](../game-design/town-training-grounds.md) - Where to change class

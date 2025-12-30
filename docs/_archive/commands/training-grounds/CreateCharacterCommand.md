# CreateCharacterCommand

**Create new character at the Training Grounds.**

## Responsibility

Orchestrates character creation by validating creation parameters, calling CharacterCreationService to generate the character, and adding it to the roster. Creates event log entry for character birth.

## Command Flow

**Preconditions**:
- Character name must not be empty
- Stats must meet class requirements
- Alignment must be compatible with class
- Bonus points must be properly allocated
- Race and class must be valid

**Services Called**:
1. `CharacterCreationService.validateCreation()` - Validate all parameters
2. `CharacterCreationService.createNewCharacter()` - Generate character entity
3. `RosterService.addCharacter()` - Add to character roster

**Events Created**:
- `CharacterCreatedEvent` - Log character creation with full details

**State Changes**:
- Adds new character to `gameState.roster.characters`
- Adds creation event to `gameState.eventLog`

## API Reference

```typescript
interface CreateCharacterCommand {
  execute(state: GameState, params: CharacterCreationParams): GameState
}

interface CharacterCreationParams {
  name: string
  race: Race
  characterClass: CharacterClass
  stats: Stats
  alignment: Alignment
  bonusPoints: number
}

type Race = 'HUMAN' | 'ELF' | 'DWARF' | 'GNOME' | 'HOBBIT'

type CharacterClass =
  | 'FIGHTER' | 'MAGE' | 'PRIEST' | 'THIEF'
  | 'BISHOP' | 'SAMURAI' | 'LORD' | 'NINJA'

type Alignment = 'GOOD' | 'NEUTRAL' | 'EVIL'

interface Stats {
  str: number
  int: number
  pie: number
  vit: number
  agi: number
  luc: number
}
```

## Preconditions

**Validation checks**:
1. **Name validation**: Name must not be empty string
2. **Stat requirements**: Stats must meet minimum for chosen class
   - Fighter: STR ≥ 11
   - Mage: INT ≥ 11
   - Priest: PIE ≥ 11 (and not Neutral)
   - Thief: AGI ≥ 11 (and not Good)
   - Bishop: INT ≥ 12, PIE ≥ 12
   - Samurai: STR ≥ 15, VIT ≥ 14, INT ≥ 11, PIE ≥ 10, AGI ≥ 10 (not Evil)
   - Lord: STR ≥ 15, VIT ≥ 15, INT ≥ 12, PIE ≥ 12, AGI ≥ 14, LUC ≥ 15 (Good only)
   - Ninja: All stats ≥ 17 (Evil only)
3. **Alignment compatibility**: Class alignment restrictions enforced
4. **Bonus allocation**: Allocated points cannot exceed bonus points rolled

**Throws**:
- `InvalidNameError` - Empty name
- `InsufficientStatsError` - Stats don't meet class requirements
- `AlignmentMismatchError` - Alignment incompatible with class
- `InvalidAllocationError` - Bonus points misallocated

## Services Used

### CharacterCreationService
- `validateCreation()` - Validates all creation parameters
- `createNewCharacter()` - Generates complete character entity with:
  - Starting age (14-16 years)
  - Level 1 stats
  - Empty equipment slots
  - Starting HP based on class and VIT
  - Initial spell points (if spellcaster)

### RosterService
- `addCharacter()` - Adds character to roster, assigns unique ID

## Events Created

### CharacterCreatedEvent
```typescript
{
  type: 'CHARACTER_CREATED',
  timestamp: number,
  data: {
    characterId: string,
    name: string,
    race: Race,
    class: CharacterClass,
    stats: Stats,
    alignment: Alignment,
    age: number
  }
}
```

**Event log message**: "Gandalf the Elf Mage has been created! (Age 15, GOOD)"

## Example Usage

```typescript
// Roll bonus points (typically done in UI first)
const bonusPoints = CharacterCreationService.rollBonusPoints()
// bonusPoints = 8

// Get race base stats
const baseStats = CharacterCreationService.getRaceBaseStats('ELF')
// baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 }

// Allocate bonus points
const allocation = { str: 0, int: 3, pie: 2, vit: 0, agi: 2, luc: 1 }
const finalStats = CharacterCreationService.allocateStats('ELF', bonusPoints, allocation)
// finalStats: { str: 7, int: 13, pie: 12, vit: 6, agi: 11, luc: 7 }

// Check eligible classes
const eligibleClasses = CharacterCreationService.getEligibleClasses(finalStats, 'GOOD')
// eligibleClasses: ['MAGE', 'PRIEST', 'THIEF', 'BISHOP']

// Create character
const params: CharacterCreationParams = {
  name: "Gandalf",
  race: "ELF",
  characterClass: "MAGE",
  stats: finalStats,
  alignment: "GOOD",
  bonusPoints: bonusPoints
}

const newState = CreateCharacterCommand.execute(gameState, params)
// Character added to roster with unique ID
```

## Testing

**Test cases**:

```typescript
describe('CreateCharacterCommand', () => {
  test('creates basic Fighter character', () => {
    const params = {
      name: "Conan",
      race: "HUMAN",
      characterClass: "FIGHTER",
      stats: { str: 16, int: 8, pie: 5, vit: 15, agi: 10, luc: 9 },
      alignment: "NEUTRAL",
      bonusPoints: 12
    }

    const newState = CreateCharacterCommand.execute(gameState, params)

    expect(newState.roster.characters).toHaveLength(1)
    expect(newState.roster.characters[0].name).toBe("Conan")
    expect(newState.roster.characters[0].level).toBe(1)
  })

  test('creates elite Lord character (Hobbit optimal)', () => {
    const params = {
      name: "Paladin",
      race: "HOBBIT",
      characterClass: "LORD",
      stats: { str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15 },
      alignment: "GOOD",
      bonusPoints: 27 // High roll needed
    }

    const newState = CreateCharacterCommand.execute(gameState, params)

    expect(newState.roster.characters[0].class).toBe("LORD")
    expect(newState.roster.characters[0].race).toBe("HOBBIT")
  })

  test('creates Ninja with perfect stats (extreme difficulty)', () => {
    const params = {
      name: "Shadow",
      race: "HOBBIT",
      characterClass: "NINJA",
      stats: { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 },
      alignment: "EVIL",
      bonusPoints: 29 // Maximum possible
    }

    const newState = CreateCharacterCommand.execute(gameState, params)

    expect(newState.roster.characters[0].class).toBe("NINJA")
  })

  test('throws error for insufficient stats', () => {
    const params = {
      name: "Weakling",
      race: "HOBBIT",
      characterClass: "FIGHTER",
      stats: { str: 8, int: 7, pie: 7, vit: 6, agi: 10, luc: 15 },
      alignment: "NEUTRAL",
      bonusPoints: 7
    }

    expect(() => CreateCharacterCommand.execute(gameState, params))
      .toThrow(InsufficientStatsError)
  })

  test('throws error for alignment mismatch (Priest cannot be Neutral)', () => {
    const params = {
      name: "Failed Priest",
      race: "ELF",
      characterClass: "PRIEST",
      stats: { str: 7, int: 10, pie: 14, vit: 6, agi: 9, luc: 6 },
      alignment: "NEUTRAL", // Invalid!
      bonusPoints: 10
    }

    expect(() => CreateCharacterCommand.execute(gameState, params))
      .toThrow(AlignmentMismatchError)
  })

  test('throws error for empty name', () => {
    const params = {
      name: "",
      race: "HUMAN",
      characterClass: "FIGHTER",
      stats: { str: 16, int: 8, pie: 5, vit: 15, agi: 10, luc: 9 },
      alignment: "NEUTRAL",
      bonusPoints: 12
    }

    expect(() => CreateCharacterCommand.execute(gameState, params))
      .toThrow(InvalidNameError)
  })

  test('event log contains creation event', () => {
    const params = {
      name: "Gandalf",
      race: "ELF",
      characterClass: "MAGE",
      stats: { str: 7, int: 13, pie: 12, vit: 6, agi: 11, luc: 7 },
      alignment: "GOOD",
      bonusPoints: 8
    }

    const newState = CreateCharacterCommand.execute(gameState, params)

    const event = newState.eventLog[newState.eventLog.length - 1]
    expect(event.type).toBe('CHARACTER_CREATED')
    expect(event.data.name).toBe("Gandalf")
    expect(event.data.race).toBe("ELF")
  })
})
```

## Related

**Services**:
- [CharacterCreationService](../services/CharacterCreationService.md) - Character creation logic
- [RosterService](../services/RosterService.md) - Roster management
- [CharacterService](../services/CharacterService.md) - Character operations

**Reference Data**:
- [Class Reference](../research/class-reference.md) - All class requirements
- [Race Stats](../research/race-stats.md) - Racial base stats

**Game Design**:
- [Character Creation System](../game-design/02-character-creation.md) - Player guide

**Related Commands**:
- [DeleteCharacterCommand](./DeleteCharacterCommand.md) - Remove character
- [ChangeClassCommand](./ChangeClassCommand.md) - Change class later

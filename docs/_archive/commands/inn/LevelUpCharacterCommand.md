# LevelUpCharacterCommand

**Level up character at the Training Grounds when sufficient experience earned.**

## Responsibility

Handles character level advancement by verifying experience requirements, increasing character level, rolling HP gains, learning new spells (for spellcasters), and increasing age. Creates event log entry for level advancement.

## Command Flow

**Preconditions**:
- Character must exist in roster
- Character must have sufficient experience for next level
- Character must be at Training Grounds (or town)
- Character must be alive (not DEAD, ASHES, or LOST)

**Services Called**:
1. `CharacterService.canLevelUp()` - Check experience requirements
2. `CharacterService.levelUp()` - Advance character level
3. `HPService.rollHPGain()` - Roll HP increase based on VIT and class
4. `SpellService.attemptLearnSpells()` - Try to learn new spells (spellcasters)
5. `CharacterService.increaseAge()` - Age character by ~1 year

**Events Created**:
- `CharacterLeveledUpEvent` - Log level advancement with details

**State Changes**:
- Increments `character.level`
- Increases `character.hp.max`
- Updates `character.spells` (if spellcaster learns new spells)
- Increases `character.age`
- Updates `character.experience` tracker
- Adds level-up event to `gameState.eventLog`

## API Reference

```typescript
interface LevelUpCharacterCommand {
  execute(state: GameState, characterId: string): GameState
}

interface LevelUpResult {
  newLevel: number
  hpGain: number
  spellsLearned: Spell[]
  ageIncrease: number
}
```

## Preconditions

**Validation checks**:
1. **Character exists**: Character ID must exist in roster
2. **Experience sufficient**: Character has enough XP for next level
3. **Location check**: Character must be in town (at Training Grounds)
4. **Character alive**: Character must not be DEAD, ASHES, or LOST

**Throws**:
- `CharacterNotFoundError` - Character ID doesn't exist
- `InsufficientExperienceError` - Not enough XP to level up
- `InvalidLocationError` - Not at Training Grounds
- `CharacterDeadError` - Cannot level up dead character

## Services Used

### CharacterService
- `canLevelUp()` - Check if character has enough experience
- `getExperienceForLevel()` - Get XP requirement for next level
- `levelUp()` - Advance character level
- `increaseAge()` - Age character (0-2 years per level)

### HPService
- `rollHPGain()` - Roll HP increase: `1d8 + (VIT - 10) / 2`
  - Minimum gain: 1 HP per level
  - VIT bonus applies to each roll

### SpellService (for spellcasters)
- `getLearnableSpells()` - Get spells available at new level
- `attemptLearnSpell()` - Try to learn spell with INT or PIE check
- `learnSpell()` - Add spell to known spells

### ExperienceService
- `getExperienceTable()` - Get level progression for class

## Events Created

### CharacterLeveledUpEvent
```typescript
{
  type: 'CHARACTER_LEVELED_UP',
  timestamp: number,
  data: {
    characterId: string,
    name: string,
    class: CharacterClass,
    oldLevel: number,
    newLevel: number,
    hpGain: number,
    spellsLearned: string[],
    ageIncrease: number
  }
}
```

**Event log message**: "Gandalf has reached Level 4! (+6 HP, learned MAHALITO, aged 1 year)"

## Level Progression Details

### Experience Requirements (varies by class)
- **Fighter**: Fastest progression (900 XP/level early)
- **Thief**: Fast progression
- **Mage/Priest**: Medium progression
- **Bishop**: Slow progression
- **Samurai/Lord**: Slow progression
- **Ninja**: Slowest progression

### HP Gain
```typescript
// HP gain formula
const baseRoll = roll1d8()
const vitBonus = Math.floor((character.stats.vit - 10) / 2)
const hpGain = Math.max(1, baseRoll + vitBonus)
```

### Spell Learning (Spellcasters)
```typescript
// Learn chance per spell
const learnChance = character.stats.int / 30 // For Mage spells
const learnChance = character.stats.pie / 30 // For Priest spells

// Bishop learns both but at slower rate
const bishopMageChance = character.stats.int / 40
const bishopPriestChance = character.stats.pie / 40
```

### Age Increase
- Each level up: Age increases 0-2 years
- Formula: `age += random(0, 2)`
- No death from old age in Wizardry 1

## Example Usage

```typescript
// Check if character can level up
const character = RosterService.findCharacter(roster, "char-123")
const canLevel = CharacterService.canLevelUp(character)
// canLevel: true (has enough XP)

// Execute level up
const newState = LevelUpCharacterCommand.execute(gameState, "char-123")

// Result details in event
const event = newState.eventLog[newState.eventLog.length - 1]
console.log(`
${event.data.name} advanced from level ${event.data.oldLevel} to ${event.data.newLevel}!
HP Gained: +${event.data.hpGain}
Spells Learned: ${event.data.spellsLearned.join(', ') || 'None'}
Age: +${event.data.ageIncrease} years
`)
```

## Testing

**Test cases**:

```typescript
describe('LevelUpCharacterCommand', () => {
  test('levels up Fighter with HP gain', () => {
    const fighter = createCharacter({
      name: "Conan",
      class: "FIGHTER",
      level: 1,
      experience: 1000, // Enough for level 2
      stats: { vit: 16 }
    })

    const newState = LevelUpCharacterCommand.execute(gameState, fighter.id)
    const leveled = RosterService.findCharacter(newState.roster, fighter.id)

    expect(leveled.level).toBe(2)
    expect(leveled.hp.max).toBeGreaterThan(fighter.hp.max)
    expect(leveled.age).toBeGreaterThanOrEqual(fighter.age)
  })

  test('Mage learns spells on level up', () => {
    const mage = createCharacter({
      name: "Gandalf",
      class: "MAGE",
      level: 1,
      experience: 1200,
      stats: { int: 18 }, // High INT = good learn chance
      knownSpells: ['KATINO']
    })

    const newState = LevelUpCharacterCommand.execute(gameState, mage.id)
    const leveled = RosterService.findCharacter(newState.roster, mage.id)

    expect(leveled.level).toBe(2)
    expect(leveled.knownSpells.length).toBeGreaterThan(1) // Likely learned new spells
  })

  test('Bishop learns both Mage and Priest spells', () => {
    const bishop = createCharacter({
      class: "BISHOP",
      level: 2,
      experience: 3000,
      stats: { int: 15, pie: 15 }
    })

    const newState = LevelUpCharacterCommand.execute(gameState, bishop.id)
    const event = newState.eventLog[newState.eventLog.length - 1]

    // Bishop can learn from both spell lists
    expect(event.data.spellsLearned).toBeDefined()
  })

  test('throws error when insufficient experience', () => {
    const character = createCharacter({
      level: 1,
      experience: 100 // Not enough
    })

    expect(() => LevelUpCharacterCommand.execute(gameState, character.id))
      .toThrow(InsufficientExperienceError)
  })

  test('throws error for dead character', () => {
    const dead = createCharacter({
      name: "Dead",
      experience: 10000,
      condition: 'DEAD'
    })

    expect(() => LevelUpCharacterCommand.execute(gameState, dead.id))
      .toThrow(CharacterDeadError)
  })

  test('HP gain has minimum of 1', () => {
    const weakling = createCharacter({
      class: "MAGE",
      level: 1,
      experience: 1200,
      stats: { vit: 3 } // Very low VIT
    })

    const newState = LevelUpCharacterCommand.execute(gameState, weakling.id)
    const leveled = RosterService.findCharacter(newState.roster, weakling.id)

    const hpGain = leveled.hp.max - weakling.hp.max
    expect(hpGain).toBeGreaterThanOrEqual(1)
  })

  test('high VIT character gains more HP', () => {
    const tough = createCharacter({
      class: "FIGHTER",
      level: 1,
      experience: 1000,
      stats: { vit: 18 }
    })

    const newState = LevelUpCharacterCommand.execute(gameState, tough.id)
    const leveled = RosterService.findCharacter(newState.roster, tough.id)

    const hpGain = leveled.hp.max - tough.hp.max
    expect(hpGain).toBeGreaterThan(5) // Should gain substantial HP
  })

  test('age increases by 0-2 years', () => {
    const character = createCharacter({
      age: 20,
      level: 5,
      experience: 10000
    })

    const newState = LevelUpCharacterCommand.execute(gameState, character.id)
    const leveled = RosterService.findCharacter(newState.roster, character.id)

    expect(leveled.age).toBeGreaterThanOrEqual(20)
    expect(leveled.age).toBeLessThanOrEqual(22)
  })

  test('level up from 12 to 13 (max level)', () => {
    const veteran = createCharacter({
      level: 12,
      experience: 1000000 // Enough for level 13
    })

    const newState = LevelUpCharacterCommand.execute(gameState, veteran.id)
    const leveled = RosterService.findCharacter(newState.roster, veteran.id)

    expect(leveled.level).toBe(13)
  })

  test('event log contains level up details', () => {
    const character = createCharacter({
      name: "Hero",
      class: "FIGHTER",
      level: 3,
      experience: 5000
    })

    const newState = LevelUpCharacterCommand.execute(gameState, character.id)
    const event = newState.eventLog[newState.eventLog.length - 1]

    expect(event.type).toBe('CHARACTER_LEVELED_UP')
    expect(event.data.name).toBe("Hero")
    expect(event.data.oldLevel).toBe(3)
    expect(event.data.newLevel).toBe(4)
    expect(event.data.hpGain).toBeGreaterThan(0)
  })
})
```

## Related

**Services**:
- [CharacterService](../services/CharacterService.md) - Level progression
- [HPService](../services/HPService.md) - HP gain calculation
- [SpellService](../services/SpellService.md) - Spell learning
- [ExperienceService](../services/ExperienceService.md) - XP requirements

**Reference Data**:
- [Experience Tables](../research/experience-tables.md) - Level requirements by class
- [Spell Learning](../research/spell-reference.md) - Spell availability by level

**Related Commands**:
- [CreateCharacterCommand](../training-grounds/CreateCharacterCommand.md) - Start at level 1
- [ChangeClassCommand](../training-grounds/ChangeClassCommand.md) - Reset to level 1
- [LearnSpellCommand](../character/LearnSpellCommand.md) - Spell learning process

**Game Design**:
- [Character Progression](../game-design/04-character-progression.md) - Player guide
- [Training Grounds](../game-design/town-training-grounds.md) - Where to level up

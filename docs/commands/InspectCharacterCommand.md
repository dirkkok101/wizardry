# InspectCharacterCommand

**View complete character sheet with stats, equipment, spells, and status.**

## Responsibility

Retrieves character details and formats comprehensive character sheet display. Shows all character attributes including stats, class, level, HP, AC, equipment, known spells, and current status effects.

## Command Flow

**Preconditions**:
- Character must exist in roster
- Character ID must be valid

**Services Called**:
1. `RosterService.findCharacter()` - Get character entity
2. `CharacterService.getCharacterSheet()` - Format complete character sheet
3. `EquipmentService.getEquippedItems()` - List equipped items
4. `SpellService.getKnownSpells()` - List learned spells (if spellcaster)

**Events Created**:
- `CharacterInspectedEvent` - Log character inspection (optional)

**State Changes**:
- No state changes (read-only operation)
- Optionally adds inspection event to `gameState.eventLog`

## API Reference

```typescript
interface InspectCharacterCommand {
  execute(state: GameState, characterId: string): CharacterSheet
}

interface CharacterSheet {
  // Basic Info
  id: string
  name: string
  race: Race
  class: CharacterClass
  alignment: Alignment
  level: number
  experience: number
  nextLevel: number
  age: number

  // Stats
  stats: Stats

  // Combat Stats
  hp: { current: number; max: number }
  ac: number
  attacks: number
  damage: string

  // Equipment
  equipped: {
    weapon?: Item
    armor?: Item
    shield?: Item
    helmet?: Item
    gloves?: Item
  }

  // Spells (if applicable)
  spellPoints?: { current: number; max: number }
  knownSpells?: Spell[]

  // Status
  status: CharacterStatus
  condition: 'GOOD' | 'INJURED' | 'CRITICAL' | 'DEAD' | 'ASHES' | 'LOST'
}

type CharacterStatus = {
  poisoned: boolean
  asleep: boolean
  paralyzed: boolean
  silenced: boolean
  afraid: boolean
  stoned: boolean
}
```

## Preconditions

**Validation checks**:
1. **Character exists**: Character ID must exist in roster
2. **Valid ID**: Character ID must be valid UUID format

**Throws**:
- `CharacterNotFoundError` - Character ID doesn't exist
- `InvalidIdError` - Invalid character ID format

## Services Used

### RosterService
- `findCharacter()` - Locate character by ID

### CharacterService
- `getCharacterSheet()` - Format complete character information
- `calculateAC()` - Calculate armor class with equipment
- `calculateAttacks()` - Calculate attacks per round
- `calculateDamage()` - Calculate damage range

### EquipmentService
- `getEquippedItems()` - Get all equipped items with bonuses
- `calculateEquipmentBonus()` - Calculate total AC/stat bonuses

### SpellService
- `getKnownSpells()` - Get learned spells by level (for spellcasters)
- `getSpellPoints()` - Get current/max spell points

## Events Created

### CharacterInspectedEvent (Optional)
```typescript
{
  type: 'CHARACTER_INSPECTED',
  timestamp: number,
  data: {
    characterId: string,
    name: string
  }
}
```

**Event log message**: "Inspected Gandalf the Mage (Level 5)"

## Example Usage

```typescript
// Inspect character
const characterSheet = InspectCharacterCommand.execute(gameState, "char-123")

// Display character sheet
console.log(`
=== CHARACTER SHEET ===
Name: ${characterSheet.name}
Race: ${characterSheet.race}
Class: ${characterSheet.class}
Alignment: ${characterSheet.alignment}
Level: ${characterSheet.level}
Age: ${characterSheet.age} years

--- STATS ---
STR: ${characterSheet.stats.str}
INT: ${characterSheet.stats.int}
PIE: ${characterSheet.stats.pie}
VIT: ${characterSheet.stats.vit}
AGI: ${characterSheet.stats.agi}
LUC: ${characterSheet.stats.luc}

--- COMBAT ---
HP: ${characterSheet.hp.current}/${characterSheet.hp.max}
AC: ${characterSheet.ac}
Attacks: ${characterSheet.attacks}
Damage: ${characterSheet.damage}

--- EQUIPMENT ---
Weapon: ${characterSheet.equipped.weapon?.name || 'None'}
Armor: ${characterSheet.equipped.armor?.name || 'None'}
Shield: ${characterSheet.equipped.shield?.name || 'None'}

--- SPELLS ---
${characterSheet.knownSpells?.map(s => `${s.level}: ${s.name}`).join('\n') || 'None'}

Status: ${characterSheet.condition}
`)
```

## Testing

**Test cases**:

```typescript
describe('InspectCharacterCommand', () => {
  test('returns complete character sheet for Fighter', () => {
    const fighter = createCharacter({
      name: "Conan",
      class: "FIGHTER",
      level: 5,
      stats: { str: 18, int: 8, pie: 5, vit: 16, agi: 10, luc: 9 }
    })

    const sheet = InspectCharacterCommand.execute(gameState, fighter.id)

    expect(sheet.name).toBe("Conan")
    expect(sheet.class).toBe("FIGHTER")
    expect(sheet.level).toBe(5)
    expect(sheet.stats.str).toBe(18)
    expect(sheet.knownSpells).toBeUndefined() // Fighter has no spells
  })

  test('returns character sheet with spells for Mage', () => {
    const mage = createCharacter({
      name: "Gandalf",
      class: "MAGE",
      level: 3,
      knownSpells: ['KATINO', 'DUMAPIC', 'MAHALITO']
    })

    const sheet = InspectCharacterCommand.execute(gameState, mage.id)

    expect(sheet.knownSpells).toHaveLength(3)
    expect(sheet.spellPoints).toBeDefined()
    expect(sheet.spellPoints.max).toBeGreaterThan(0)
  })

  test('shows equipped items', () => {
    const character = createCharacter({ name: "Armed" })
    const withEquipment = equipItem(character, createItem('LONG_SWORD'))

    const sheet = InspectCharacterCommand.execute(gameState, withEquipment.id)

    expect(sheet.equipped.weapon?.name).toBe('Long Sword')
  })

  test('calculates AC with equipment bonuses', () => {
    const character = createCharacter({ name: "Armored", agi: 15 })
    const withArmor = equipItem(character, createItem('PLATE_MAIL'))

    const sheet = InspectCharacterCommand.execute(gameState, withArmor.id)

    expect(sheet.ac).toBeLessThan(10) // Lower AC is better
  })

  test('shows multiple attacks for high-level Fighter', () => {
    const fighter = createCharacter({ class: "FIGHTER", level: 10 })

    const sheet = InspectCharacterCommand.execute(gameState, fighter.id)

    expect(sheet.attacks).toBe(3) // 1 + (10 / 5) = 3
  })

  test('shows status effects', () => {
    const poisoned = createCharacter({ name: "Sick", status: { poisoned: true } })

    const sheet = InspectCharacterCommand.execute(gameState, poisoned.id)

    expect(sheet.status.poisoned).toBe(true)
  })

  test('shows condition (HP-based)', () => {
    const injured = createCharacter({
      name: "Hurt",
      hp: { current: 5, max: 20 }
    })

    const sheet = InspectCharacterCommand.execute(gameState, injured.id)

    expect(sheet.condition).toBe('INJURED')
  })

  test('throws error for non-existent character', () => {
    expect(() => InspectCharacterCommand.execute(gameState, "invalid-id"))
      .toThrow(CharacterNotFoundError)
  })

  test('shows Bishop with both Mage and Priest spells', () => {
    const bishop = createCharacter({
      class: "BISHOP",
      knownSpells: ['KATINO', 'DIOS', 'MAHALITO', 'BADIOS']
    })

    const sheet = InspectCharacterCommand.execute(gameState, bishop.id)

    expect(sheet.knownSpells).toContain('KATINO') // Mage spell
    expect(sheet.knownSpells).toContain('DIOS') // Priest spell
  })

  test('shows experience and next level', () => {
    const character = createCharacter({ level: 3, experience: 500 })

    const sheet = InspectCharacterCommand.execute(gameState, character.id)

    expect(sheet.experience).toBe(500)
    expect(sheet.nextLevel).toBeGreaterThan(500)
  })
})
```

## Related

**Services**:
- [RosterService](../services/RosterService.md) - Character lookup
- [CharacterService](../services/CharacterService.md) - Character sheet formatting
- [EquipmentService](../services/EquipmentService.md) - Equipment display
- [SpellService](../services/SpellService.md) - Spell information

**Related Commands**:
- [CreateCharacterCommand](./CreateCharacterCommand.md) - Create character
- [LevelUpCharacterCommand](./LevelUpCharacterCommand.md) - Level up character
- [EquipItemCommand](./EquipItemCommand.md) - Equip items

**Game Design**:
- [Character Sheet UI](../game-design/ui-character-sheet.md) - Display design

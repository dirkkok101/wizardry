# CastUtilitySpellCommand

**Cast non-combat spell in dungeon or town context.**

## Responsibility

Executes utility spells outside of combat, including healing (DIOS, DIAL), light (MILWA, LOMILWA), mapping (DUMAPIC), teleportation (MALOR, LOKTOFEIT), and identification (CALFO, LATUMAPIC). Deducts spell points and applies spell effects to party or dungeon state.

## Command Flow

### Preconditions
1. Character has spell learned in spell book
2. Character has spell points available for spell level
3. Spell can be cast in current context (dungeon/town/any)
4. Valid targets provided (if spell requires targets)
5. Character is alive and not ashed

### Services Called
1. **SpellService.hasSpellLearned** - Validate spell is known
2. **SpellService.hasSpellPoints** - Check spell points available
3. **SpellService.deductSpellPoints** - Deduct 1 point from level pool
4. **SpellService.castSpell** - Execute spell effect
5. **EventService.createEvent** - Log spell casting event

### Events Created
```typescript
{
  type: "UTILITY_SPELL_CAST",
  characterId: string,
  spellId: string,
  targets: string[],
  effect: SpellEffect,
  timestamp: number
}
```

### State Changes
1. Spell points deducted from appropriate pool
2. Spell effect applied (healing, light, teleport, etc.)
3. Party state updated based on spell effect
4. Event added to game log

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  characterId: string,
  spellId: string,
  targets?: string[]
}): GameState
```

**Parameters**:
- `state` - Current game state
- `params.characterId` - Character casting spell
- `params.spellId` - Spell identifier (e.g., "DIOS", "MILWA", "MALOR")
- `params.targets` - Optional target character IDs (for healing, buffs)

**Returns**: New game state with spell effect applied

**Throws**:
- `CharacterNotFoundError` - Character ID invalid
- `SpellNotLearnedError` - Character doesn't know spell
- `InsufficientSpellPointsError` - No spell points for spell level
- `InvalidContextError` - Spell cannot be cast in current mode
- `InvalidTargetError` - Invalid or missing targets
- `CharacterDeadError` - Cannot cast when dead/ashed

## Preconditions

### Character Validation
```typescript
// Character must exist and be alive
const character = state.roster.get(characterId)
if (!character) throw new CharacterNotFoundError()
if (character.status === 'ASHES' || character.status === 'DEAD') {
  throw new CharacterDeadError()
}
```

### Spell Knowledge Check
```typescript
// Character must have learned the spell
if (!SpellService.hasSpellLearned(character, spellId)) {
  throw new SpellNotLearnedError(
    `${character.name} has not learned ${spellId}`
  )
}
```

### Spell Points Check
```typescript
// Must have spell points for spell level
const spell = SpellService.getSpellData(spellId)
const spellType = spell.class === 'MAGE' ? 'MAGE' : 'PRIEST'

if (!SpellService.hasSpellPoints(character, spell.level, spellType)) {
  throw new InsufficientSpellPointsError(
    `No ${spellType} level ${spell.level} spell points remaining`
  )
}
```

### Context Validation
```typescript
// Check spell can be cast in current mode
const spell = SpellService.getSpellData(spellId)
const validContexts = spell.contexts // ['COMBAT', 'DUNGEON', 'TOWN']

if (!validContexts.includes(state.mode)) {
  throw new InvalidContextError(
    `${spellId} cannot be cast in ${state.mode} mode`
  )
}
```

### Target Validation
```typescript
// Validate targets for targeted spells
if (spell.requiresTarget && !targets) {
  throw new InvalidTargetError('Spell requires target')
}

if (targets) {
  targets.forEach(targetId => {
    const target = state.roster.get(targetId)
    if (!target) throw new CharacterNotFoundError(targetId)
  })
}
```

## Services Used

### SpellService
- **hasSpellLearned** - Check spell in spell book
- **hasSpellPoints** - Validate spell points available
- **deductSpellPoints** - Remove 1 point from level pool
- **castSpell** - Execute spell effect
- **getSpellData** - Get spell properties

### EventService
- **createEvent** - Create UTILITY_SPELL_CAST event

## Events Created

### UTILITY_SPELL_CAST Event (Healing)
```typescript
{
  id: "evt-12350",
  type: "UTILITY_SPELL_CAST",
  timestamp: 1635725300000,
  characterId: "char-priest",
  characterName: "Merlin",
  spellId: "DIOS",
  spellName: "DIOS (Heal)",
  spellLevel: 1,
  spellType: "PRIEST",
  targets: ["char-fighter"],
  effect: {
    type: "HEALING",
    amount: 6,  // 1d8 roll
    targetName: "Conan"
  },
  spellPointsRemaining: 4
}
```

### UTILITY_SPELL_CAST Event (Teleport)
```typescript
{
  id: "evt-12351",
  type: "UTILITY_SPELL_CAST",
  timestamp: 1635725400000,
  characterId: "char-mage",
  characterName: "Gandalf",
  spellId: "MALOR",
  spellName: "MALOR (Teleport)",
  spellLevel: 6,
  spellType: "MAGE",
  targets: null,
  effect: {
    type: "TELEPORT",
    fromPosition: { x: 10, y: 10, level: 3 },
    toPosition: { x: 0, y: 0, level: 1 },
    success: true
  },
  spellPointsRemaining: 1
}
```

## Utility Spell Categories

### Healing Spells
**DIOS (Priest Level 1)**: Restore 1d8 HP to single target
```typescript
const healed = SpellService.castSpell(state, character, "DIOS", [targetId])
// Target HP increased by 1-8
```

**DIAL (Priest Level 3)**: Restore 2d8 HP to single target
```typescript
const healed = SpellService.castSpell(state, character, "DIAL", [targetId])
// Target HP increased by 2-16
```

### Light Spells
**MILWA (Priest Level 1)**: Basic dungeon illumination
```typescript
const lit = SpellService.castSpell(state, character, "MILWA")
// Party light radius increased (duration: limited)
```

**LOMILWA (Priest Level 3, Mage Level 6)**: Extended illumination
```typescript
const lit = SpellService.castSpell(state, character, "LOMILWA")
// Party light radius increased (duration: extended)
```

### Mapping Spells
**DUMAPIC (Mage Level 1)**: Show coordinates and facing
```typescript
const info = SpellService.castSpell(state, character, "DUMAPIC")
// Returns: { x: 10, y: 15, level: 3, facing: 'NORTH' }
```

### Teleportation Spells
**MALOR (Mage Level 6)**: Teleport to specific coordinates
```typescript
const teleported = SpellService.castSpell(
  state,
  character,
  "MALOR",
  null,
  { x: 5, y: 5, level: 1 }
)
// WARNING: Teleporting into rock = instant party death
```

**LOKTOFEIT (Priest Level 5)**: Recall to castle entrance
```typescript
const recalled = SpellService.castSpell(state, character, "LOKTOFEIT")
// Success chance: Level × 2%
// Failure: Nothing happens (can retry)
```

### Identification Spells
**CALFO (Priest Level 2)**: Identify trap type on chest
```typescript
const trapInfo = SpellService.castSpell(state, character, "CALFO", [chestId])
// Returns: { trapType: 'POISON', disarmDifficulty: 'MEDIUM' }
```

**LATUMAPIC (Priest Level 3)**: Show basic enemy info
```typescript
const enemyInfo = SpellService.castSpell(state, character, "LATUMAPIC", [enemyGroupId])
// Returns: { name, AC, HP, groupSize }
```

## Testing

### Test Cases

**Healing Spell**:
```typescript
test('casts DIOS to heal injured character', () => {
  const priest = createPriest({
    level: 3,
    spells: ['DIOS'],
    priestSpellPoints: new Map([[1, 5]])
  })
  const fighter = createFighter({ hp: 10, maxHP: 25 })
  const state = createGameState({
    mode: 'CAMP',
    roster: [priest, fighter]
  })

  jest.spyOn(RandomService, 'rollDice').mockReturnValue(6)

  const result = CastUtilitySpellCommand.execute(state, {
    characterId: priest.id,
    spellId: 'DIOS',
    targets: [fighter.id]
  })

  const healedFighter = result.roster.get(fighter.id)!
  expect(healedFighter.hp).toBe(16) // 10 + 6

  const updatedPriest = result.roster.get(priest.id)!
  expect(updatedPriest.priestSpellPoints.get(1)).toBe(4) // 5 - 1
})
```

**Light Spell**:
```typescript
test('casts MILWA to illuminate dungeon', () => {
  const priest = createPriest({
    spells: ['MILWA'],
    priestSpellPoints: new Map([[1, 3]])
  })
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [priest],
    party: { lightRadius: 1 }
  })

  const result = CastUtilitySpellCommand.execute(state, {
    characterId: priest.id,
    spellId: 'MILWA'
  })

  expect(result.party.lightRadius).toBeGreaterThan(1)
  expect(result.party.lightDuration).toBeGreaterThan(0)
})
```

**Teleport Spell**:
```typescript
test('casts MALOR to teleport party', () => {
  const mage = createMage({
    level: 10,
    spells: ['MALOR'],
    mageSpellPoints: new Map([[6, 2]])
  })
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [mage],
    party: { position: { x: 10, y: 10, level: 3 } }
  })

  const result = CastUtilitySpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'MALOR',
    targetPosition: { x: 0, y: 0, level: 1 }
  })

  expect(result.party.position).toEqual({ x: 0, y: 0, level: 1 })
})
```

**Spell Not Learned**:
```typescript
test('prevents casting unlearned spell', () => {
  const priest = createPriest({
    spells: ['DIOS'], // Only knows DIOS
    priestSpellPoints: new Map([[3, 5]])
  })
  const state = createGameState({ roster: [priest] })

  expect(() => CastUtilitySpellCommand.execute(state, {
    characterId: priest.id,
    spellId: 'DIAL' // Not learned
  })).toThrow(SpellNotLearnedError)
})
```

**Insufficient Spell Points**:
```typescript
test('prevents casting without spell points', () => {
  const priest = createPriest({
    spells: ['DIOS'],
    priestSpellPoints: new Map([[1, 0]]) // No points
  })
  const state = createGameState({ roster: [priest] })

  expect(() => CastUtilitySpellCommand.execute(state, {
    characterId: priest.id,
    spellId: 'DIOS'
  })).toThrow(InsufficientSpellPointsError)
})
```

**Invalid Context**:
```typescript
test('prevents casting combat-only spell outside combat', () => {
  const mage = createMage({
    spells: ['HALITO'],
    mageSpellPoints: new Map([[1, 5]])
  })
  const state = createGameState({
    mode: 'NAVIGATION', // Not in combat
    roster: [mage]
  })

  expect(() => CastUtilitySpellCommand.execute(state, {
    characterId: mage.id,
    spellId: 'HALITO' // Combat only
  })).toThrow(InvalidContextError)
})
```

**Event Creation**:
```typescript
test('creates UTILITY_SPELL_CAST event', () => {
  const priest = createPriest({
    spells: ['DIOS'],
    priestSpellPoints: new Map([[1, 5]])
  })
  const fighter = createFighter({ hp: 10 })
  const state = createGameState({ roster: [priest, fighter] })

  const result = CastUtilitySpellCommand.execute(state, {
    characterId: priest.id,
    spellId: 'DIOS',
    targets: [fighter.id]
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('UTILITY_SPELL_CAST')
  expect(lastEvent.spellName).toContain('DIOS')
  expect(lastEvent.effect.type).toBe('HEALING')
})
```

## Related

- [SpellService](../services/SpellService.md) - Spell casting and management
- [CastSpellCommand](./CastSpellCommand.md) - Combat spell casting
- [LearnSpellCommand](./LearnSpellCommand.md) - Learn spells on level-up
- [RestAtInnCommand](./RestAtInnCommand.md) - Restore spell points
- [Spell Reference](../research/spell-reference.md) - All spells documented
- [Magic System](../game-design/09-magic-system.md) - Player guide

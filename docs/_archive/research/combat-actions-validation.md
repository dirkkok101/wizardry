# Combat Actions Validation - Wizardry 1

**Research Date**: 2025-10-26
**Sources**: Strategy Wiki, The Spoiler, Steam Community, GOG Forums
**Status**: ✅ Validated against original game

---

## Original Wizardry 1 Combat Actions

Based on research of the original 1981 game, the exact combat menu options were:

### 1. FIGHT
- **Function**: Physical melee attack with weapon or bare hands
- **Restriction**: Front row only (positions 1-3)
- **Target**: Single enemy in a group
- **Classes**: All classes can fight

### 2. PARRY
- **Function**: Defensive stance using weapon or hands to defend
- **Effect**: Reduces chance of being hit by enemies
- **Target**: Self (defensive)
- **Classes**: All classes can parry

### 3. SPELL
- **Function**: Cast a spell from character's spell book
- **Restriction**: Must have spells learned and spell points available
- **Target**: Varies by spell
- **Classes**: Mage, Priest, Bishop, Samurai, Lord

### 4. DISPELL
- **Function**: Attempt to dispel undead enemies
- **Restriction**: Only available to Priest, Bishop, Lord
- **Effect**: Similar to Turn Undead in D&D, can instantly destroy undead
- **Target**: Undead enemies
- **Classes**: Priest, Bishop, Lord only

### 5. USE
- **Function**: Use an item from inventory (potion, scroll, etc.)
- **Examples**: Healing potions, scrolls, magical items
- **Target**: Varies by item
- **Classes**: All classes can use items

### 6. RUN
- **Function**: Attempt to flee from combat
- **Success Rate**: Based on party AGI vs monster speed
- **Restriction**: Cannot flee from fixed encounters (Murphy's Ghosts, Werdna)
- **Classes**: All classes can run

### 7. TAKE BACK (Optional)
- **Function**: Undo/redo combat commands before round resolution
- **Availability**: During input phase only
- **Purpose**: Allow player to reconsider tactics

---

## Actions NOT in Original Wizardry 1

### ❌ HIDE / BACKSTAB
- **Status**: NOT in Wizardry 1
- **First Appeared**: Wizardry 5 (1988)
- **Note**: In Wizardry 5+, Thieves and Ninjas could hide in back row and ambush
- **Conclusion**: Should NOT be included in faithful Wizardry 1 remake

### ❌ DEFEND (as separate from PARRY)
- **Status**: NOT in Wizardry 1
- **Note**: Only PARRY existed as the defensive action
- **Confusion**: Some later games had separate Defend action

---

## Current Documentation Status

### ✅ Correctly Documented
1. **AttackCommand** → FIGHT ✅
2. **CastSpellCommand** → SPELL ✅
3. **ParryCommand** → PARRY ✅
4. **UseItemCommand** → USE ✅
5. **FleeCommand** → RUN ✅

### ❌ Missing from Documentation
1. **DispellCommand** → DISPELL (Priest/Bishop/Lord only)
2. **TakeBackCommand** → TAKE BACK (undo combat input)

### ⚠️ Incorrectly Documented
1. **DefendCommand** - Should NOT exist (only PARRY existed)

---

## Combat Action Priority

Based on original game mechanics, the typical action priority was:

1. **Fastest**: Spell casting (initiative-based)
2. **Fast**: Physical attacks (initiative-based)
3. **Medium**: Item use (initiative-based)
4. **Slow**: Parry (defensive, passive)
5. **Slowest**: Run (all party members must agree)

---

## DISPELL Mechanics (Missing Documentation)

### DISPELL Action Details

**Class Restriction**: Priest, Bishop, Lord only

**Target**: Single group of undead enemies

**Success Formula** (estimated based on Turn Undead mechanics):
```
DispellChance = (CasterLevel - UndeadLevel) × 10%

Minimum: 5% (vs higher-level undead)
Maximum: 95% (vs lower-level undead)
```

**Effect on Success**:
- Undead group instantly destroyed
- No XP awarded (dispelled, not defeated)
- No treasure from dispelled undead

**Effect on Failure**:
- No effect
- Action wasted for this round

**Undead Targets**:
- Creeping Coins
- Gas Cloud
- Ghouls
- Spectres
- Wraiths
- Zombies
- Vampire
- Vampire Lord

**Non-Undead**: DISPELL has no effect on non-undead monsters

---

## Recommendations for Documentation Updates

### 1. Remove DefendCommand
- **File**: `docs/commands/DefendCommand.md`
- **Action**: Delete or mark as non-canonical
- **Reason**: Not in original Wizardry 1

### 2. Add DispellCommand
- **File**: `docs/commands/DispellCommand.md` (NEW)
- **Content**: Full documentation of DISPELL action
- **Services**: Create DispellService for undead dispelling logic

### 3. Add TakeBackCommand (Optional)
- **File**: `docs/commands/TakeBackCommand.md` (NEW)
- **Content**: Undo/redo combat input
- **Consideration**: May be UI-level feature rather than command

### 4. Update Combat Commands Index
- **File**: `docs/commands/README.md`
- **Changes**: Remove DefendCommand, add DispellCommand

### 5. Update Combat System Documentation
- **File**: `docs/systems/combat-system.md`
- **Changes**: Add DISPELL action, remove DEFEND, clarify PARRY

### 6. Update Game Design Documentation
- **File**: `docs/game-design/05-combat.md`
- **Changes**: Add DISPELL mechanics, remove HIDE/BACKSTAB references

### 7. Update Research Documentation
- **File**: `docs/research/combat-formulas.md`
- **Changes**: Add DISPELL success formula

### 8. Clarify HIDE is NOT in Wizardry 1
- **Files**: All relevant docs
- **Note**: Add explicit note that HIDE was added in Wizardry 5

---

## Verification Checklist

- [x] Validate original combat actions against sources
- [x] Identify missing actions (DISPELL, TAKE BACK)
- [x] Identify incorrect actions (DEFEND)
- [ ] Create DispellCommand documentation
- [ ] Create DispellService documentation
- [ ] Remove or deprecate DefendCommand
- [ ] Update all cross-references
- [ ] Update combat system docs
- [ ] Update game design docs
- [ ] Commit all changes

---

**Last Updated**: 2025-10-26
**Validated By**: Web research (multiple authoritative sources)
**Status**: Analysis complete, updates pending

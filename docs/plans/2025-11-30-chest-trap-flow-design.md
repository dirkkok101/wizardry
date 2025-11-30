# Chest & Trap Flow Redesign

> **For Claude:** Complete redesign of post-combat chest handling with scrambled letters trap identification.

## Overview

Redesign the chest scene to separate victory display from chest handling, implement a skill-based scrambled letters system for trap identification, and handle special trap effects (Teleporter, Alarm) appropriately.

---

## Flow Order: Victory-First

```
COMBAT ENDS
     ↓
┌─────────────────────────────────┐
│  VICTORY SCREEN                 │
│  • XP earned (total + per char) │
│  • Monsters defeated            │
│  • [Press ENTER to continue]    │
└─────────────────────────────────┘
     ↓
┌─────────────────────────────────┐
│  HANDLER SELECT                 │
│  "Who will handle the chest?"   │
│  • Character list with AGI      │
│  • Recommended: highest AGI     │
└─────────────────────────────────┘
     ↓
┌─────────────────────────────────┐
│  ACTION SELECT                  │
│  • (O)pen - risky if trapped    │
│  • (I)nspect - skill-based      │
│  • (C)ALFO - if priest available│
│  • (D)isarm - after inspection  │
│  • (L)eave - immediate, no conf │
└─────────────────────────────────┘
     ↓
┌─────────────────────────────────┐
│  CHEST CONSEQUENCE DIALOG       │
│  • Rewards (gold + items)       │
│  • Trap effects (if triggered)  │
│  • [Press ENTER to continue]    │
└─────────────────────────────────┘
     ↓
   RETURN TO MAZE
```

---

## Scrambled Letters System

### Trap Identification Mechanics

When inspecting, character skill determines letter reveal quality:

```
Trap: "POISON NEEDLE" (13 characters)

Low skill (AGI 8):   "P?I?ON N??DLE"  (? = red/uncertain)
High skill (AGI 16): "POISON NE?DLE"  (mostly green)
CALFO spell:         "NEEDLO SIONPI"  (all green, scrambled)
```

### Letter States
- **Green** = Confirmed in trap name (position may be wrong)
- **Red** = Might be in the trap, uncertain
- **Underscore** = Not revealed yet
- **Asterisk** = Confirmed NOT in trap (from multiple inspections)

### Stacking Inspections
Multiple characters can inspect - findings combine:
- New green letters add to known set
- Contradicting red letters become asterisks
- Higher skill = more greens, fewer reds

### CALFO Spell Effect
- Reveals ALL letters as green (confirmed)
- Still scrambled - player must unscramble
- Consumes 1 level-2 priest spell point

### Disarm Input
Player types their guess (case-insensitive):
- **Correct**: Trap disarmed, proceed to open safely
- **Wrong guess**: "That doesn't seem right..." (can retry, no trigger)
- **Wrong trap type**: Triggers the trap immediately

---

## Failed Disarm Handling

When disarm fails and trap triggers:
1. Apply trap damage/effects to affected characters
2. Show consequence dialog with damage details
3. **Still give chest rewards** (gold + items)
4. Return to maze

The trap hurts you, but you still get the treasure.

---

## Special Trap Effects

### TELEPORTER
When triggered:
```
┌─────────────────────────────────┐
│  TELEPORTER TRIGGERED!          │
│  The world spins around you...  │
│  [Press ENTER]                  │
└─────────────────────────────────┘
```
- Immediate maze return at random position (same level)
- **Chest contents LOST** - no rewards given
- No consequence dialog

### ALARM
When triggered:
```
┌─────────────────────────────────┐
│  CHEST OPENED                   │
│  Found 250 gold!                │
│  Obtained: Long Sword           │
│                                 │
│  ALARM TRIGGERED!               │
│  You hear footsteps approaching │
└─────────────────────────────────┘
```
- **Give rewards FIRST**
- Then spawn new combat encounter
- If party survives, normal flow continues

### All Other Traps
Standard flow: damage applied → consequence dialog → rewards given → maze

---

## Chest Consequence Dialog

Shows everything that happened:

```
┌─────────────────────────────────────────┐
│  CHEST OPENED                           │
│  ─────────────────────────────────────  │
│                                         │
│  REWARDS                                │
│  • Gold: 250                            │
│  • Long Sword (unidentified)            │
│  → Items go to: Thief                   │
│                                         │
│  TRAP: POISON NEEDLE                    │
│  • Thief takes 8 damage                 │
│  • Thief is POISONED                    │
│                                         │
│  [Press ENTER to continue]              │
└─────────────────────────────────────────┘
```

### Sections (conditional):
1. **Rewards** - Always shown (gold + items + recipient)
2. **Trap Effects** - Only if triggered (damage + status per character)
3. **Inventory Warning** - If items couldn't fit ("2 items LOST!")

### Edge Cases:
- No trap / Disarmed: Just rewards section
- Empty chest: "The chest was empty."
- All party dead from trap: Defeat screen instead

---

## UI/UX Notes

- **Leave**: Immediate, no confirmation dialog
- **Handler recommendation**: Show character with highest AGI
- **Scrambled display**: Use monospace font, color-coded letters
- **Keyboard shortcuts**: O/I/C/D/L for actions, typed input for trap name

---

## Key Files to Modify

- `src/app/scenes/chest/chest.component.ts` - Main component rewrite
- `src/app/scenes/chest/chest.component.html` - New templates for modes
- `src/app/services/TrapService.ts` - Add scrambled letters logic
- `src/app/models/Trap.ts` - Add letter state types
- `src/app/scenes/combat-scene/combat.ts` - Separate XP victory from chest

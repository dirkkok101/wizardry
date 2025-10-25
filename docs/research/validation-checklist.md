# Wizardry 1 Design Validation Checklist

**Purpose**: Track validation status of every game mechanic against original Wizardry 1 sources.

**Status Legend**:
- ⬜ Not Started
- 🔍 Researching
- ⚠️ Needs Verification
- ✅ Validated
- ❌ Incorrect (needs design update)
- 🔄 Updated (re-validate needed)

---

## 1. Character System

### 1.1 Character Stats
- ⬜ Six stats: STR, INT, PIE, VIT, AGI, LUC (not DEX, CHA, SPD)
- ⬜ Stat ranges (3-18? Higher possible?)
- ⬜ Stat effects on gameplay

### 1.2 Races
- ⬜ Five races: Human, Elf, Dwarf, Gnome, Hobbit
- ⬜ Human base stats: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
- ⬜ Elf base stats: STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6
- ⬜ Dwarf base stats: STR 10, INT 7, PIE 10, VIT 10, AGI 6, LUC 6
- ⬜ Gnome base stats: STR 7, INT 7, PIE 10, VIT 8, AGI 10, LUC 7
- ⬜ Hobbit base stats: STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 12

### 1.3 Character Creation
- ⬜ Creation flow: Name → Race → Bonus Roll → Stat Allocation → Alignment → Class
- ⬜ Bonus point roll: 7-10 base (90%), 17-20 (9.25%), 27-29 (0.75%)
- ⬜ Bonus roll formula: 7-10 + (10% chance +10) + (if <20, 10% chance +10)
- ⬜ Stat allocation: Player distributes bonus points
- ⬜ Starting age: 14-16 years

### 1.4 Character Classes
- ⬜ Eight classes total
- ⬜ Fighter: STR ≥ 11, any alignment
- ⬜ Mage: INT ≥ 11, any alignment
- ⬜ Priest: PIE ≥ 11, not neutral (Good or Evil only)
- ⬜ Thief: AGI ≥ 11, not good (Neutral or Evil only)
- ⬜ Bishop: INT ≥ 12, PIE ≥ 12, any alignment
- ⬜ Samurai: STR ≥ 15, VIT ≥ 14, INT ≥ 11, PIE ≥ 10, AGI ≥ 10, not evil
- ⬜ Lord: STR ≥ 15, VIT ≥ 15, INT ≥ 12, PIE ≥ 12, AGI ≥ 14, LUC ≥ 15, must be good
- ⬜ Ninja: STR ≥ 17, INT ≥ 17, PIE ≥ 17, AGI ≥ 17, must be evil

### 1.5 Alignment
- ⬜ Three alignments: Good, Neutral, Evil
- ⬜ Alignment affects class eligibility
- ⬜ Alignment affects item usability (cursed items, holy items)

---

## 2. Spell System

### 2.1 Spell Points (Not Slots)
- ⬜ Spell point pools per level (1-7)
- ⬜ Separate pools for mage and priest
- ⬜ Each spell costs 1 point from its level
- ⬜ Spell point calculation formula
- ⬜ Spell points restore at inn

### 2.2 Spell Learning
- ⬜ Learn on level-up
- ⬜ Chance = (INT or PIE) / 30
- ⬜ Can retry failed spells on next level
- ⬜ First spell per level auto-learned

### 2.3 Mage Spells (Level 1)
- ⬜ KATINO - Sleep enemy group
- ⬜ DUMAPIC - Show coordinates
- ⬜ HALITO - 1d8 fire damage to group
- ⬜ MOGREF - -2 AC to ally

### 2.4 Priest Spells (Level 1)
- ⬜ DIOS - Heal 1d8 HP
- ⬜ BADIOS - 1d8 holy damage to enemy
- ⬜ [Research others]

### 2.5 Spell Levels
- ⬜ 7 mage spell levels exist
- ⬜ 7 priest spell levels exist
- ⬜ Total spells per level (research exact count)

### 2.6 Spell Casting Contexts
- ⬜ Combat: Can target enemies and allies
- ⬜ Dungeon: Can only target party/self (no enemies)
- ⬜ Town: Can cast healing/utility

### 2.7 Spell Failure
- ⬜ No general fizzle rate
- ⬜ Some spells have specific success rates (LOKTOFEIT: level × 2%)
- ⬜ Resurrection spells can fail (DI → ashes, KADORTO → lost)
- ⬜ Silenced/paralyzed prevents casting

---

## 3. Combat System

### 3.1 Combat Structure
- ⬜ Round-based (not turn-based like roguelike)
- ⬜ Phases: Surprise Check → Input → Initiative → Resolution → End Check

### 3.2 Combat Actions
- ⬜ Attack
- ⬜ Cast Spell
- ⬜ Use Item
- ⬜ Defend
- ⬜ Parry
- ⬜ Run (flee)

### 3.3 Initiative
- ⬜ Initiative = AGI + random + action modifier
- ⬜ Action modifiers (research values)
- ⬜ Fastest first, resolve in order

### 3.4 Hit Chance
- ⬜ Hit chance formula (research)
- ⬜ AC system (lower = better, D&D 1st edition style)
- ⬜ Sleeping enemy bonus

### 3.5 Damage
- ⬜ Weapon damage dice
- ⬜ STR bonus to damage
- ⬜ Critical hit system (if any)

### 3.6 Monster Groups
- ⬜ 1-4 monster groups per encounter
- ⬜ Multiple monsters per group
- ⬜ Target group, not individual monster
- ⬜ Damage distributes across group

---

## 4. Party System

### 4.1 Party Structure
- ⬜ 1-6 characters
- ⬜ Front row (max 3)
- ⬜ Back row (max 3)
- ⬜ Front row takes melee attacks
- ⬜ Back row protected, can't melee (can use ranged/magic)

### 4.2 Character Roster
- ⬜ Unlimited characters can be created
- ⬜ Only 6 active at a time
- ⬜ Roster managed in town (Training Grounds)

### 4.3 Shared Resources
- ⬜ Party gold (shared)
- ⬜ Individual equipment
- ⬜ Individual spell points

---

## 5. Progression System

### 5.1 Leveling
- ⬜ XP tables per level (research exact values)
- ⬜ XP gained from killing monsters
- ⬜ Level-up at town (Training Grounds)

### 5.2 Stat Changes on Level-Up
- ⬜ Each stat has 75% chance to be modified
- ⬜ If modified, increase chance = (130 - age)%
- ⬜ Young characters (~age 15): ~87% gain, ~13% lose
- ⬜ Old characters (50+): high chance to lose, can die

### 5.3 HP Gain
- ⬜ HP gain on level-up (class-specific hit dice)
- ⬜ VIT modifier to HP
- ⬜ Minimum HP gain

### 5.4 Aging
- ⬜ Starting age: 14-16
- ⬜ Inn rest ages slightly (~0.1 years)
- ⬜ Vim decreases with age
- ⬜ Age 50+ risk death from old age

### 5.5 Class Changing
- ⬜ Can change class if stats qualify
- ⬜ Resets to level 1
- ⬜ Keeps stats
- ⬜ Retains some spell knowledge

---

## 6. Death & Resurrection

### 6.1 Death Mechanics
- ⬜ Character dies → body left in dungeon
- ⬜ Body location tracked
- ⬜ Party wipe → return to town

### 6.2 Body Recovery
- ⬜ New party can find bodies
- ⬜ Pick up corpse (add to party)
- ⬜ Return to town with body

### 6.3 Resurrection
- ⬜ DI spell: ~90% success, 10% → ashes
- ⬜ KADORTO spell: ~50% success, 50% → lost forever
- ⬜ Temple resurrection costs: 100 gold × level (dead), 500 gold × level (ashes)
- ⬜ Can cast resurrection spells in dungeon

### 6.4 Death States
- ⬜ Dead → resurrectable
- ⬜ Ashes → harder resurrection
- ⬜ Lost Forever → permanent

---

## 7. Town System

### 7.1 Town Locations
- ⬜ Castle Entrance
- ⬜ Training Grounds
- ⬜ Inn
- ⬜ Temple
- ⬜ Tavern (rumors)
- ⬜ Shop
- ⬜ Edge of Town (enter dungeon)

### 7.2 Inn
- ⬜ Rest cost formula
- ⬜ Restores HP
- ⬜ Restores all spell points
- ⬜ Ages characters
- ⬜ Decreases vim

### 7.3 Temple
- ⬜ Resurrection services
- ⬜ Cure status effects
- ⬜ Cost formulas

### 7.4 Shop
- ⬜ Buy equipment
- ⬜ Sell equipment (50% of buy price?)
- ⬜ Available items by level

### 7.5 Training Grounds
- ⬜ Create character
- ⬜ Add to party
- ⬜ Remove from party
- ⬜ Inspect character
- ⬜ Delete character
- ⬜ Level up character

---

## 8. Dungeon System

### 8.1 Dungeon Structure
- ⬜ 10 levels total
- ⬜ Each level: 20×20 grid
- ⬜ Fixed maps (not procedural)

### 8.2 Tile Types
- ⬜ Floor
- ⬜ Wall
- ⬜ Door (open, closed, locked, secret)
- ⬜ Stairs (up, down)
- ⬜ Darkness zones (cannot be lit)
- ⬜ Teleporters
- ⬜ Traps

### 8.3 Encounters
- ⬜ Random encounter system
- ⬜ Encounter rate per tile
- ⬜ Level-based monster tables

### 8.4 Navigation
- ⬜ First-person view
- ⬜ 3 tiles visible ahead
- ⬜ Discrete tile-by-tile movement
- ⬜ 90° rotation in place

---

## 9. Monsters

### 9.1 Monster Count
- ⬜ 100+ monsters in original

### 9.2 Monster Stats
- ⬜ HP (dice formula)
- ⬜ AC
- ⬜ Damage (dice formula)
- ⬜ XP value
- ⬜ Level range (min/max level)

### 9.3 Monster Abilities
- ⬜ Some cast spells
- ⬜ Special attacks (poison, drain, rust armor)
- ⬜ Resistances/immunities

### 9.4 Monster AI
- ⬜ Simple attack behavior
- ⬜ Spellcasters choose spells
- ⬜ Fleeing behavior (low HP)

---

## 10. Items & Equipment

### 10.1 Equipment Types
- ⬜ Weapons
- ⬜ Armor
- ⬜ Shields
- ⬜ Rings (2 slots)
- ⬜ Helmets

### 10.2 Class Restrictions
- ⬜ Mage: Dagger only, no armor
- ⬜ Priest: Blunt weapons (mace, staff), no helmets
- ⬜ Fighter: Any weapon, any armor
- ⬜ Thief: Dagger, short sword, leather armor

### 10.3 Special Items
- ⬜ Cursed items (cannot remove)
- ⬜ Amulet of Yendor (win condition)

---

## 11. Win Condition

- ⬜ Find Amulet of Yendor (level 10?)
- ⬜ Return to surface (level 1)
- ⬜ Victory!

---

## Summary Progress

**Total Items**: [Count when complete]
**Validated**: 0
**Needs Verification**: 0
**Incorrect**: 0
**Not Started**: [All]

**Completion**: 0%

---

**Last Updated**: 2025-10-25
**Next Update**: [Date after research]

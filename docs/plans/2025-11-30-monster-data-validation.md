# Monster Data Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate all 101 Wizardry 1 monster JSON files against authoritative research data, updating schema and data to match the original Apple II Pascal source code.

**Architecture:** Phase 1 updates the schema to capture all research fields. Phase 2+ validates each monster file individually against the research document, fixing discrepancies. Progress is tracked via checkboxes for cross-session resumability.

**Tech Stack:** TypeScript, Zod validation, Jest testing, JSON data files

---

## Reference: Research Data Location

The authoritative monster research is provided by the user in the conversation. Key reference tables:
- Level 1-3 monsters (IDs 0-23)
- Level 4-6 monsters (IDs 24-46)
- Level 7-9 monsters (IDs 47-69)
- Level 10+ and boss monsters (IDs 70-96)
- Fixed encounter monsters (IDs 97-100)

## Progress Tracking

### Phase 1: Schema Updates
- [x] Task 1.1: Add monster class enum (13 classes)
- [x] Task 1.2: Add missing special abilities
- [x] Task 1.3: Add missing resistance types
- [x] Task 1.4: Update breath weapon schema (HP-based)
- [x] Task 1.5: Add numeric ID and spell resistance fields
- [x] Task 1.6: Run tests and commit

### Phase 2: Level 1-3 Monsters (IDs 0-23) ✓ COMPLETE
- [x] Task 2.1: Bubbly Slime (ID 0)
- [x] Task 2.2: Orc (ID 1)
- [x] Task 2.3: Kobold (ID 2)
- [x] Task 2.4: Undead Kobold (ID 3)
- [x] Task 2.5: Rogue (ID 4)
- [x] Task 2.6: Bushwacker (ID 5)
- [x] Task 2.7: Highwayman (ID 6)
- [x] Task 2.8: Zombie (ID 7)
- [x] Task 2.9: Creeping Crud (ID 8)
- [x] Task 2.10: Gas Cloud (ID 9)
- [x] Task 2.11: Lvl 1 Mage (ID 10)
- [x] Task 2.12: Lvl 1 Priest (ID 11)
- [x] Task 2.13: Creeping Coin (ID 12)
- [x] Task 2.14: Lvl 1 Ninja (ID 13)
- [x] Task 2.15: Vorpal Bunny (ID 14)
- [x] Task 2.16: Capybara (ID 15)
- [x] Task 2.17: Giant Toad (ID 16)
- [x] Task 2.18: Coyote (ID 17)
- [x] Task 2.19: Lvl 3 Priest (ID 18)
- [x] Task 2.20: Lvl 3 Samurai (ID 19)
- [x] Task 2.21: Lvl 3 Ninja (ID 20)
- [x] Task 2.22: Were Bear (ID 21)
- [x] Task 2.23: Dragon Fly (ID 22)
- [x] Task 2.24: Rotting Corpse (ID 23)
- [x] Task 2.25: Commit Phase 2 (pending)

### Phase 3: Level 4-6 Monsters (IDs 24-46) ✓ COMPLETE
- [x] Task 3.1: Ogre (ID 24)
- [x] Task 3.2: Huge Spider (ID 25)
- [x] Task 3.3: Wererat (ID 26)
- [x] Task 3.4: Boring Beetle (ID 27)
- [x] Task 3.5: Gas Dragon (ID 28)
- [x] Task 3.6: Priestess (ID 29)
- [x] Task 3.7: Swordsman (ID 30)
- [x] Task 3.8: Huge Spider Deep (ID 31) - Duplicate
- [x] Task 3.9: Attack Dog (ID 32)
- [x] Task 3.10: Gargoyle (ID 33)
- [x] Task 3.11: Grave Mist (ID 34)
- [x] Task 3.12: Dragon Puppy (ID 35)
- [x] Task 3.13: Werewolf (ID 36)
- [x] Task 3.14: Shade (ID 37)
- [x] Task 3.15: Bishop (ID 38)
- [x] Task 3.16: Minor Daimyo (ID 39)
- [x] Task 3.17: Lvl 5 Mage (ID 40)
- [x] Task 3.18: Lvl 4 Thief (ID 41)
- [x] Task 3.19: Killer Wolf (ID 42)
- [x] Task 3.20: Spirit (ID 43)
- [x] Task 3.21: Giant Spider (ID 44)
- [x] Task 3.22: Weretiger (ID 45)
- [x] Task 3.23: Medusalizard (ID 46)
- [x] Task 3.24: Commit Phase 3 (pending)

### Phase 4: Level 7-9 Monsters (IDs 47-69) ✓ COMPLETE
- [x] Task 4.1: Lvl 5 Priest (ID 47)
- [x] Task 4.2: Lvl 6 Ninja (ID 48)
- [x] Task 4.3: Lvl 7 Mage (ID 49)
- [x] Task 4.4: Master Thief Lesser (ID 50)
- [x] Task 4.5: Major Daimyo (ID 51)
- [x] Task 4.6: High Priest Lesser (ID 52)
- [x] Task 4.7: Champ Samurai (ID 53)
- [x] Task 4.8: Arch Mage Lesser (ID 54)
- [x] Task 4.9: Master Thief Greater (ID 55)
- [x] Task 4.10: Gaze Hound (ID 56)
- [x] Task 4.11: Ogre Lord (ID 57)
- [x] Task 4.12: Troll (ID 58)
- [x] Task 4.13: Lifestealer (ID 59)
- [x] Task 4.14: Nightstalker (ID 60)
- [x] Task 4.15: Wyvern (ID 61)
- [x] Task 4.16: Lvl 8 Priest (ID 62)
- [x] Task 4.17: Lvl 10 Fighter (ID 63)
- [x] Task 4.18: Lvl 7 Mage Deep (ID 64)
- [x] Task 4.19: Lvl 7 Thief (ID 65)
- [x] Task 4.20: Lvl 8 Ninja (ID 66)
- [x] Task 4.21: Earth Giant (ID 67)
- [x] Task 4.22: Lesser Demon (ID 68)
- [x] Task 4.23: Chimera (ID 69)
- [x] Task 4.24: Commit Phase 4 (pending)

### Phase 5: Level 10+ and Boss Monsters (IDs 70-96) ✓ COMPLETE
- [x] Task 5.1: Fire Giant (ID 70)
- [x] Task 5.2: Gorgon (ID 71)
- [x] Task 5.3: Lvl 8 Bishop (ID 72)
- [x] Task 5.4: Lvl 8 Fighter (ID 73)
- [x] Task 5.5: Lvl 10 Mage (ID 74)
- [x] Task 5.6: Thief (ID 75)
- [x] Task 5.7: Master Ninja (ID 76)
- [x] Task 5.8: Murphy's Ghost (ID 77)
- [x] Task 5.9: Will O' Wisp (ID 78)
- [x] Task 5.10: Bleeb (ID 79)
- [x] Task 5.11: Frost Giant (ID 80)
- [x] Task 5.12: Fire Dragon (ID 81)
- [x] Task 5.13: High Priest Greater (ID 82)
- [x] Task 5.14: High Wizard (ID 83)
- [x] Task 5.15: Master Thief ID 84 (ID 84)
- [x] Task 5.16: Hatamoto (ID 85)
- [x] Task 5.17: Vampire (ID 86)
- [x] Task 5.18: Greater Demon (ID 87)
- [x] Task 5.19: Poison Giant (ID 88)
- [x] Task 5.20: Dragon Zombie (ID 89)
- [x] Task 5.21: Raver Lord (ID 90)
- [x] Task 5.22: High Master (ID 91)
- [x] Task 5.23: Flack (ID 92)
- [x] Task 5.24: Arch Mage Greater (ID 93)
- [x] Task 5.25: Maelific (ID 94)
- [x] Task 5.26: Vampire Lord (ID 95)
- [x] Task 5.27: WERDNA (ID 96)
- [x] Task 5.28: Commit Phase 5 (pending)

### Phase 6: Fixed Encounter Monsters (IDs 97-100) ✓ COMPLETE
- [x] Task 6.1: High Ninja (ID 97) - Updated existing
- [x] Task 6.2: High Priest fixed (ID 98) - Created new
- [x] Task 6.3: Lvl 7 Mage fixed (ID 99) - Created new
- [x] Task 6.4: Lvl 7 Fighter (ID 100) - Updated existing
- [x] Task 6.5: Update index.json with new monsters
- [x] Task 6.6: Commit Phase 6 (pending)

### Phase 7: Service Updates ✓ COMPLETE
- [x] Task 7.1: Update MonsterService for new schema (monsterClass field)
- [x] Task 7.2: Update MonsterResistanceService (monsterClass field)
- [x] Task 7.3: Update CombatService for breath weapons (deferred - not in scope)
- [x] Task 7.4: Run full test suite (195 monster tests pass)
- [x] Task 7.5: Updated positioning tests for authentic data behavior

---

## Task Details

### Task 1.1: Add monster class enum (13 classes)

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts:78-86`

**Step 1: Read current schema**

Run: `cat src/app/validation/MonsterSchema.ts | head -100`

**Step 2: Replace type enum with monsterClass enum**

Replace lines 78-86 in `src/app/validation/MonsterSchema.ts`:

```typescript
  // Monster class from original Wizardry (13 classes)
  // Affects: friendly encounter %, spell targeting, turn undead
  monsterClass: z.enum([
    'fighter',    // 11% friendly - Standard humanoid fighters
    'mage',       // 6% friendly - Spellcaster humanoids
    'priest',     // 16% friendly - Divine casters
    'thief',      // 4% friendly - Rogues
    'giant',      // Never friendly - Large humanoids
    'mythical',   // 1% friendly - Gorgon, Medusalizard
    'dragon',     // 26% friendly - Dragons and dragonkin
    'animal',     // 1% friendly - Beasts and creatures
    'were',       // 1% friendly - Lycanthropes
    'undead',     // 1% friendly - Makanito immune, Dispell target
    'demon',      // 1% friendly - High spell resist
    'insect',     // 1% friendly - Spiders, beetles
    'enchanted'   // 1% friendly - Magical creatures
  ]),
```

**Step 3: Remove the old class field (character class association)**

Delete the `class` field that associates monsters with character classes - this is not part of original Wizardry.

**Step 4: Run validation to check for errors**

Run: `npx tsc --noEmit`
Expected: Errors about existing JSON files using old `type` field

---

### Task 1.2: Add missing special abilities

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts:97-109`

**Step 1: Expand specialAbilities enum**

Replace the specialAbilities array definition:

```typescript
  specialAbilities: z.array(z.enum([
    // Combat abilities
    'spellcasting',           // Can cast spells (requires spellLevels)
    'breath_weapon',          // Breath attack (requires breathWeapon)
    'multiple_attacks',       // Has multiple damage rolls
    'critical_hit',           // Can instant-kill (level×2% chance, max 50%)
    'decapitate',             // Ninja-style instant kill

    // Status infliction
    'poison',                 // Can poison targets
    'paralyze',               // Can paralyze targets
    'petrify',                // Can turn to stone
    'level_drain',            // Drains character levels (requires levelDrain)

    // Defensive
    'regeneration',           // Heals HP per round (requires regeneration > 0)
    'magic_resistance',       // Flat % spell resistance (requires spellResist)

    // Behavioral (for service logic)
    'can_sleep',              // Can be affected by Katino
    'can_run',                // Can flee when demoralized
    'call_help',              // Can summon reinforcements mid-combat
  ])),
```

---

### Task 1.3: Add missing resistance types

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts:34-37`

**Step 1: Expand ResistanceSchema types**

```typescript
const ResistanceSchema = z.object({
  type: z.enum([
    'fire',    // Half damage from fire spells
    'cold',    // Half damage from cold spells
    'magic',   // General magic resistance (for non-elemental)
    'poison',  // Resistance to poison effects
    'drain',   // Resistance to level drain
    'stone'    // Resistance to petrification
  ]),
  value: z.number().int().min(0).max(100)
})
```

---

### Task 1.4: Update breath weapon schema (HP-based)

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts:39-43`

**Step 1: Replace BreathWeaponSchema**

Research shows breath weapon damage = CurrentHP ÷ 2, not dice.

```typescript
const BreathWeaponSchema = z.object({
  type: z.enum([
    'fire',    // Fire breath (Dragon Fly, Chimera, Fire Dragon)
    'cold',    // Cold breath (Dragon Puppy, Flack)
    'poison',  // Poison breath (Gas Dragon, Poison Giant)
    'stone',   // Stone breath (Gorgon) - does damage only, not petrify
    'drain'    // Drain breath (Dragon Zombie, Creeping Coin)
  ]),
  // Breath damage is ALWAYS CurrentHP ÷ 2, dealt to ALL party members
  // Save vs. Breath = half damage, Elemental protection = half damage
  // Both = quarter damage
})
// Note: Remove 'damage' and 'target' fields - they're always HP/2 and 'party'
```

---

### Task 1.5: Add numeric ID and spell resistance fields

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts:68-77`

**Step 1: Add new required/optional fields**

Add after `id` field:

```typescript
  // Original game monster ID (0-100) for reference/sorting
  numericId: z.number().int().min(0).max(100),
```

Add in optional fields section:

```typescript
  // Flat % chance to resist damage spells (separate from elemental resistance)
  // Affected spells: Badios, Badial, Badialma, Litokan, Lorto, Malikto,
  // Halito, Mahalito, Molito, Dalto, Lahalito, Madalto, Zilwan, Tiltowait
  spellResist: z.number().int().min(0).max(100).optional(),
```

---

### Task 1.6: Run tests and commit

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Errors (expected - JSON files need updating)

**Step 2: Run existing tests**

Run: `npm test -- MonsterSchema`
Expected: Some failures due to schema changes

**Step 3: Commit schema changes**

```bash
git add src/app/validation/MonsterSchema.ts
git commit -m "feat: update MonsterSchema for authentic Wizardry 1 data

- Replace 'type' with 'monsterClass' (13 original classes)
- Add missing abilities: can_sleep, can_run, call_help, critical_hit
- Add missing resistances: drain, stone
- Change breath weapon to HP-based (not dice)
- Add numericId and spellResist fields

BREAKING: All monster JSON files need updating to new schema"
```

---

## Monster Validation Template

For each monster task (2.1 through 6.4), follow this pattern:

### Task N.X: [Monster Name] (ID [X])

**Files:**
- Modify: `data/monsters/[filename].json`

**Step 1: Read current JSON**

Run: `cat data/monsters/[filename].json`

**Step 2: Compare against research**

Research data:
| Field | Research Value | Current Value | Status |
|-------|---------------|---------------|--------|
| numericId | [X] | N/A | ADD |
| name | [Name] | ? | CHECK |
| monsterClass | [Class] | type: ? | FIX |
| ac | [AC] | ? | CHECK |
| hp | [dice] → min/max | ? | CHECK |
| numberAppearing | [dice] → min/max | ? | CHECK |
| damage | [attacks] | ? | CHECK |
| xp | [XP] | ? | CHECK |
| specialAbilities | [list] | ? | CHECK |
| resistances | [list] | ? | CHECK |
| spellLevels | Mage/Priest Lv | ? | CHECK |
| spellResist | [%] | N/A | ADD if present |
| regeneration | Heal [N] | ? | CHECK |
| levelDrain | Drain [N] | ? | CHECK |
| breathWeapon | [type] | ? | CHECK |

**Step 3: Update JSON file**

Write corrected JSON with all fields matching research.

**Step 4: Validate**

Run: `npx ts-node -e "import { validateMonster } from './src/app/validation/MonsterSchema'; console.log(validateMonster(require('./data/monsters/[filename].json')))"`

Expected: No errors

---

## Dice to Range Conversion Reference

| Dice Notation | Min | Max | Formula |
|---------------|-----|-----|---------|
| 1d1 | 1 | 1 | N=1, M=1 |
| 1d3 | 1 | 3 | N×1, N×M |
| 1d4 | 1 | 4 | |
| 1d6 | 1 | 6 | |
| 1d8 | 1 | 8 | |
| 1d10 | 1 | 10 | |
| 2d3 | 2 | 6 | |
| 2d4 | 2 | 8 | |
| 3d6 | 3 | 18 | |
| NdM | N | N×M | |
| NdM+X | N+X | N×M+X | Add X to both |

---

## Example Monster Validation: Kobold (ID 2)

**Research Data:**
- ID: 2
- Name: Kobold
- Class: Fighter
- AC: 8
- HP: 2d3+1 → min: 3, max: 7
- Group: 2d2+1 → min: 3, max: 5
- Attacks: 2×1d2+1 → [{dice: "1d2+1", min: 2, max: 3}, {dice: "1d2+1", min: 2, max: 3}]
- XP: 415
- Abilities: Cold Resist, Sleep, Run

**Corrected JSON:**
```json
{
  "id": "kobold",
  "numericId": 2,
  "name": "Kobold",
  "monsterClass": "fighter",
  "level": 1,
  "numberAppearing": { "min": 3, "max": 5 },
  "hp": { "min": 3, "max": 7 },
  "ac": 8,
  "damage": [
    { "dice": "1d2+1", "min": 2, "max": 3 },
    { "dice": "1d2+1", "min": 2, "max": 3 }
  ],
  "xp": 415,
  "specialAbilities": ["multiple_attacks", "can_sleep", "can_run"],
  "resistances": [{ "type": "cold", "value": 100 }],
  "regeneration": 0,
  "isBoss": false,
  "canFlee": true
}
```

---

## Resuming After Compact

1. Read this plan file
2. Find the first unchecked `[ ]` task
3. Execute that task following the steps
4. Mark as `[x]` when complete
5. Continue to next task

**To find current progress:**
```bash
grep -n "^\- \[ \]" docs/plans/2025-11-30-monster-data-validation.md | head -5
```

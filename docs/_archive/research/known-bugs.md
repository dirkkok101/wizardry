# Known Bugs in Original Wizardry 1

**Documentation of bugs from the original Apple II version and our approach.**

This document identifies bugs discovered through reverse-engineering of Thomas William Ewers' Apple II Pascal source code. For each bug, we document whether our remake fixes it or preserves it for authenticity.

## Bug Summary

| Bug | Original Behavior | Our Approach | Rationale |
|-----|-------------------|--------------|-----------|
| Inn Resting Age | No aging | **FIX** | Match manual's intent |
| Poison Cure on Disband | Cures poison | **FIX** | Unintended exploit |
| Haman/Mahaman Effects | 2 of 5 effects never trigger | **FIX** | Designer intent clear |
| MONTINO Silence Recovery | Monsters never recover | **FIX** | Designer intent clear |
| LATUMAPIC Single Group | Only identifies one group | **FIX** | Designer intent clear |
| Save vs. Wand | Unused in code | **KEEP** | Affects only Elf bonus display |
| Bishop Identify Exploit | Massive XP for wrong input | **FIX** | Game-breaking exploit |
| HP Stickiness | HP trends high | **KEEP** | Intended behavior, not a bug |

---

## Detailed Bug Descriptions

### 1. Inn Resting Does Not Age Characters

**Original Bug**: The Apple II code does not increment character age when resting at the Adventurer's Inn, despite the game manual claiming it does.

**Impact**: Characters can rest infinitely without aging, making stat growth optimization trivial.

**Our Fix**: **Resting at the Inn DOES age characters** as the manual intended. This restores the intended risk/reward balance for resting.

**Implementation**: Inn resting adds 1 week of age per rest (consistent with manual).

---

### 2. LostXYL Poison Cure

**Original Bug**: The X coordinate field is repurposed during expeditions to store poison value. When the party is disbanded, coordinates reset to default values, which inadvertently cures poison.

**Impact**: Players can cure poison for free by disbanding and reforming party.

**Our Fix**: **Disbanding does NOT cure poison.** Poison status is stored separately from coordinates.

**Implementation**: Poison is tracked as a boolean status flag, not repurposed from coordinate storage.

---

### 3. Haman/Mahaman Spell Bug

**Original Bug**: Due to a Pascal operator precedence error (`RANDOM (MOD 3) * MAHAMFLG` instead of `RANDOM MOD (3 * MAHAMFLG)`), two of the five intended spell effects never trigger:
- "Shields Party" (AC=-10) - **Never triggers**
- "Resurrects and Heals Party" - **Never triggers**

Only 3 of 5 effects actually work in the original.

**Impact**: These powerful spells are less useful than intended.

**Our Fix**: **All 5 effects can trigger.** We implement the correct random distribution as the designers intended.

**Implementation**: Spell data includes all 5 effects with `bugFix: true` flag on effects 4 and 5.

---

### 4. MONTINO Silence Recovery Bug

**Original Bug**: In the Apple II code, the silence recovery timer was never decremented. Once silenced, monsters NEVER recovered from the silenced status for the remainder of combat.

**Impact**: Made MONTINO overpowered—a single successful cast permanently disabled enemy spellcasting.

**Our Fix**: **Silenced monsters CAN recover.** Recovery chance per round is `(Monster Level × 10)%` capped at 50%.

**Implementation**: Code implements the intended recovery formula.

---

### 5. LATUMAPIC Single Group Bug

**Original Bug**: Despite the spell description saying it identifies ALL monster groups, the code only identified one random group per casting.

**Impact**: Required multiple castings to identify all monster groups in combat.

**Our Fix**: **Identifies ALL groups** in a single casting as intended.

**Implementation**: Code identifies all monster groups, not just one random group.

---

### 7. Save vs. Wand Unused

**Original Bug**: The `LUCKSKIL[2]` saving throw category (Wand) is never checked anywhere in the game code. Elves receive a -2 bonus to this stat that provides no gameplay benefit.

**Impact**: Elf racial bonus is partially wasted.

**Our Decision**: **Keep as-is.** This is a harmless quirk that doesn't break gameplay. We display the Wand save bonus for completeness, but it has no mechanical effect (matching original).

**Note**: Future expansion could add Wand-based effects to give this stat meaning.

---

### 8. Bishop Identify Exploit

**Original Bug**: During Bishop item identification, typing an item number that doesn't exist on the list grants massive XP (up to 100,000,000 XP). This was intentionally preserved by PC port developers "to be fair."

**Impact**: Trivializes character progression for players who know the exploit.

**Our Fix**: **Invalid item numbers are rejected.** Only valid item selections are processed.

**Implementation**: Item identification validates input against actual item list.

---

### 9. HP Stickiness (NOT A BUG)

**Original Behavior**: Because HP is recalculated by rolling ALL hit dice each level-up (keeping the higher of new roll vs current), HP values trend toward the high end of possible values over time.

**Impact**: High-level characters tend to have near-maximum HP.

**Our Decision**: **Keep as-is.** This is intended behavior that rewards leveling. The "keep better" mechanic ensures characters improve over time. Not a bug.

---

## Version-Specific Bugs (Not Applicable)

### NES Version AC Bug

The NES port has a critical bug where armor class modifiers are not applied in combat calculations—characters are effectively unarmored regardless of equipment.

**Our Decision**: Not applicable. We are based on the Apple II version, not NES.

---

## Related Quirks (Intended Behavior)

These are sometimes mistaken for bugs but are working as designed:

### Stat 18 Protection
Stats at 18 have an 83.3% (5/6) chance to resist decrease. This is intentional to protect max stats.

### Class Change Spell Retention
Characters keep all learned spells permanently after class change. This is a feature, not a bug.

### MaxLev HP Preservation
HP is calculated against highest level ever achieved, not current level. This is intentional to preserve investment.

---

## Sources

- Thomas William Ewers' reverse-engineered Apple II Pascal source code (2012-2014)
- Snafaru's Wizardry Game Code Calculations (zimlab.com)
- Data Driven Gamer blog analysis (datadrivengamer.blogspot.com)

---

**Last Updated**: 2025-11-30
**Status**: Complete - validated against reverse-engineered source code

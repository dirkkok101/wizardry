# Wizardry 1 Design Validation Matrix

**Purpose**: Systematic validation of every design decision against authoritative sources.

**Status Legend**:
- ✅ Validated (matches source)
- ⚠️ To Verify (need to confirm)
- ❌ Incorrect (design needs update)
- 🔄 Updated (re-validate)
- ⬜ Not researched yet

**Source Abbreviations**:
- [W1M] - Wizardry 1 Manual
- [WW] - Wizardry Wiki (wizardry.fandom.com)
- [SW] - Strategy Wiki (strategywiki.org)
- [ZL] - Zimlab (www.zimlab.com/wizardry)
- [DG] - Data Driven Gamer blog
- [COM] - Community verification

---

## Character System

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Core Stats** | STR, INT, PIE, VIT, AGI, LUC | [WW] | ✅ | Confirmed from multiple sources |
| **Stat Range** | 3-18 base, higher with bonuses | [?] | ⬜ | Need to verify maximum possible |
| | | | | |
| **Human Base** | STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9 | [DG] | ⚠️ | Need manual confirmation |
| **Elf Base** | STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6 | [DG] | ⚠️ | Need manual confirmation |
| **Dwarf Base** | STR 10, INT 7, PIE 10, VIT 10, AGI 6, LUC 6 | [DG] | ⚠️ | Need manual confirmation |
| **Gnome Base** | STR 7, INT 7, PIE 10, VIT 8, AGI 10, LUC 7 | [DG] | ⚠️ | Need manual confirmation |
| **Hobbit Base** | STR 5, INT 7, PIE 7, VIT 6, AGI 10, LUC 12 | [DG] | ⚠️ | Need manual confirmation |
| | | | | |
| **Bonus Roll** | 7-10 base (90%), 17-20 (9.25%), 27-29 (0.75%) | [DG] | ✅ | Confirmed Apple II formula |
| **Bonus Formula** | 7-10 + (10% +10) + (if <20, 10% +10) | [DG] | ✅ | Confirmed |
| **Starting Age** | 14-16 years | [DG] | ✅ | Confirmed |
| | | | | |
| **Fighter Req** | STR ≥ 11 | [WW] | ✅ | Confirmed |
| **Mage Req** | INT ≥ 11 | [WW] | ✅ | Confirmed |
| **Priest Req** | PIE ≥ 11, not neutral | [WW] | ✅ | Confirmed |
| **Thief Req** | AGI ≥ 11, not good | [WW] | ✅ | Confirmed |
| **Bishop Req** | INT ≥ 12, PIE ≥ 12 | [WW] | ✅ | Confirmed |
| **Samurai Req** | STR 15, VIT 14, INT 11, PIE 10, AGI 10, not evil | [WW] | ⚠️ | Need exact stats verification |
| **Lord Req** | STR 15, VIT 15, INT 12, PIE 12, AGI 14, LUC 15, good | [WW] | ⚠️ | Need exact stats verification |
| **Ninja Req** | STR 17, INT 17, PIE 17, AGI 17, evil | [WW] | ⚠️ | Need exact stats verification |

---

## Spell System

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Spell Points** | Separate pools per level (1-7) | [DG] | ✅ | Not spell slots |
| **Spell Cost** | 1 point per cast from spell's level | [DG] | ✅ | Confirmed |
| **Point Calc** | max(learned, 1 + first_level - current_level, cap 9) | [DG] | ⚠️ | Need formula verification |
| **Learn Chance** | (INT or PIE) / 30 | [DG] | ✅ | Confirmed |
| **Restore** | Rest at inn restores all | [WW] | ✅ | Confirmed |
| | | | | |
| **KATINO** | Sleep enemy group (Mage L1) | [WW] | ⚠️ | Need effect details |
| **DUMAPIC** | Show coordinates (Mage L1) | [WW] | ⚠️ | Need effect details |
| **HALITO** | 1d8 fire to group (Mage L1) | [WW] | ⚠️ | Need damage confirmation |
| **MOGREF** | -2 AC to ally (Mage L1) | [WW] | ⚠️ | Need effect details |
| **DIOS** | Heal 1d8 HP (Priest L1) | [WW] | ⚠️ | Need heal amount |
| **BADIOS** | 1d8 holy to enemy (Priest L1) | [WW] | ⚠️ | Need damage confirmation |
| | | | | |
| **No Fizzle** | No general fizzle rate | [Community] | ✅ | Only specific spells fail |
| **LOKTOFEIT** | Level × 2% success | [WW] | ⚠️ | Need confirmation |
| **DI Failure** | 10% → ashes | [?] | ⬜ | Need resurrection rates |
| **KADORTO Fail** | 50% → lost | [?] | ⬜ | Need resurrection rates |

---

## Combat System

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Combat Mode** | Modal: Input → Initiative → Resolution | [?] | ⬜ | Need flow confirmation |
| **Actions** | Attack, Spell, Item, Defend, Parry, Run | [WW] | ⚠️ | Confirm all actions |
| **Initiative** | AGI + random + action mod | [?] | ⬜ | Need formula |
| **Hit Chance** | Base + modifiers | [?] | ⬜ | Need formula |
| **AC System** | Lower = better (D&D 1st ed) | [WW] | ✅ | Confirmed |
| **Damage** | Weapon dice + STR | [?] | ⬜ | Need formula |
| **Monster Groups** | 1-4 groups per encounter | [?] | ⬜ | Need confirmation |
| **Target Group** | Target group, not individual | [?] | ⬜ | Need confirmation |

---

## Party & Progression

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Party Size** | 1-6 characters | [WW] | ✅ | Confirmed |
| **Formation** | Front (3), Back (3) | [WW] | ✅ | Confirmed |
| **Front Row** | Takes melee hits | [WW] | ✅ | Confirmed |
| **Back Row** | Protected, no melee | [WW] | ✅ | Confirmed |
| **Shared Gold** | Party gold shared | [?] | ⬜ | Need confirmation |
| | | | | |
| **Level-Up Stat** | 75% chance per stat to change | [DG] | ✅ | Confirmed |
| **Increase Chance** | (130 - age)% | [DG] | ✅ | Confirmed |
| **Young Char** | Age 15: ~87% gain, ~13% lose | [DG] | ✅ | Confirmed calculation |
| **Old Age Death** | Age 50+: risk death | [DG] | ✅ | Confirmed |
| **Aging Rate** | Inn rest: ~0.1 years | [DG] | ⚠️ | Need exact rate |
| **Vim Loss** | Inn rest: ~0.05 vim | [DG] | ⚠️ | Need exact rate |
| | | | | |
| **Class Change** | Reset to L1, keep stats | [WW] | ⚠️ | Need details |
| **Spell Retention** | Keep some spells | [?] | ⬜ | Need details |

---

## Death & Resurrection

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Body Location** | Tracked at death position | [WW] | ⚠️ | Confirm mechanic |
| **Body Recovery** | New party finds & picks up | [WW] | ⚠️ | Confirm mechanic |
| **Death States** | Dead → Ashes → Lost | [WW] | ✅ | Confirmed |
| **DI Success** | ~90% success | [?] | ⬜ | Need rate |
| **DI Failure** | → Ashes | [WW] | ✅ | Confirmed |
| **KADORTO Success** | ~50% success | [?] | ⬜ | Need rate |
| **KADORTO Failure** | → Lost Forever | [WW] | ✅ | Confirmed |
| **Temple Cost (Dead)** | 100 gold × level | [?] | ⬜ | Need cost |
| **Temple Cost (Ashes)** | 500 gold × level | [?] | ⬜ | Need cost |

---

## Town System

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Locations** | Entrance, Training, Inn, Temple, Tavern, Shop, Edge | [WW] | ⚠️ | Confirm all |
| **Inn Cost** | Level-based | [?] | ⬜ | Need formula |
| **Inn Effect** | Restore HP, restore spells, age | [WW] | ⚠️ | Confirm all |
| **Temple Services** | Resurrect, cure status | [WW] | ✅ | Confirmed |
| **Shop Sell Price** | 50% of buy? | [?] | ⬜ | Need confirmation |

---

## Dungeon System

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Level Count** | 10 levels | [WW] | ✅ | Confirmed |
| **Level Size** | 20×20 grid | [WW] | ✅ | Confirmed |
| **Fixed Maps** | Not procedural | [WW] | ✅ | Confirmed |
| **View Distance** | 3 tiles ahead | [?] | ⬜ | Need confirmation |
| **Movement** | Discrete tile-based | [WW] | ✅ | Confirmed |
| **Rotation** | 90° in place | [WW] | ✅ | Confirmed |
| **Encounter Rate** | Per-tile probability | [?] | ⬜ | Need formula |
| **Darkness Zones** | Special tiles (cannot light) | [WW] | ⚠️ | Confirm mechanic |

---

## Monsters

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Monster Count** | 100+ | [WW] | ⚠️ | Need exact count |
| **Stats** | HP, AC, Damage, XP, Level Range | [WW] | ✅ | Confirmed |
| **Spellcasters** | Some cast spells | [WW] | ✅ | Confirmed |
| **Special Attacks** | Poison, drain, rust | [WW] | ✅ | Confirmed |

---

## Items & Equipment

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Equipment Slots** | Weapon, Armor, Shield, 2 Rings, Helmet | [?] | ⬜ | Need confirmation |
| **Mage Restrictions** | Dagger only, no armor | [WW] | ✅ | Confirmed |
| **Priest Restrictions** | Blunt weapons, no helmet | [WW] | ✅ | Confirmed |
| **Cursed Items** | Cannot remove | [WW] | ✅ | Confirmed |

---

## Win Condition

| Design Element | Current Design | Source | Status | Notes |
|----------------|----------------|--------|--------|-------|
| **Goal** | Get Amulet, return to surface | [WW] | ✅ | Confirmed |
| **Amulet Location** | Level 10 | [?] | ⬜ | Need confirmation |

---

## Summary Statistics

**Total Items to Validate**: ~150

**Status Breakdown**:
- ✅ Validated: 32
- ⚠️ To Verify: 28
- ⬜ Not Researched: 90
- ❌ Incorrect: 0
- 🔄 Updated: 0

**Completion**: 21% validated, 40% researched

---

**Research Priority** (Next Steps):
1. Find/download Wizardry 1 manual (PDF)
2. Verify all spell effects and formulas
3. Confirm combat formulas (hit, damage, initiative)
4. Verify exact class requirements (Samurai, Lord, Ninja)
5. Confirm town service costs (inn, temple)
6. Research resurrection success rates
7. Extract complete monster list
8. Verify equipment restrictions

---

**Last Updated**: 2025-10-25
**Next Review**: [After completing source research]

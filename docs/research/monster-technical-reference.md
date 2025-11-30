# Wizardry 1: Proving Grounds of the Mad Overlord
# Complete Monster Technical Reference for Game Clone Implementation

**Version:** 2.0 (Corrected & Verified)
**Source:** Thomas William Ewers' reverse-engineered UCSD Pascal source code (Apple II, 2012-2014)
**Secondary Sources:** Data Driven Gamer analysis, Snafaru/Zimlab calculations

---

## Table of Contents

1. [Overview and Data Sources](#overview-and-data-sources)
2. [Complete Monster Bestiary (IDs 0-100)](#complete-monster-bestiary)
3. [Combat Mechanics Formulas](#combat-mechanics-formulas)
4. [Special Abilities with Exact Mechanics](#special-abilities-with-exact-mechanics)
5. [Magic Resistance System](#magic-resistance-system)
6. [Undead Turning (Dispell)](#undead-turning-dispell)
7. [Monster Class System](#monster-class-system)
8. [Encounter Mechanics](#encounter-mechanics)
9. [XP Calculation Formula](#xp-calculation-formula)
10. [Saving Throw System](#saving-throw-system)
11. [Implementation Notes](#implementation-notes)
12. [Known Bugs to Replicate](#known-bugs-to-replicate)

---

## Overview and Data Sources

The original Wizardry: Proving Grounds of the Mad Overlord (1981) contains exactly **101 monster entries** (IDs 0-100). All data in this reference derives from the reverse-engineered Pascal source code, which compiles to byte-identical executables matching the original Apple II game.

### Authoritative Sources

1. **Primary:** Thomas William Ewers' reverse-engineered Pascal source
   Location: `ftp://ftp.apple.asimov.net/pub/apple_II/images/games/rpg/wizardry/wizardry_I/`

2. **GitHub Mirrors:**
   - `snafaru/Wizardry.Code` - Bug-fixed v3.1 with 100+ fixes
   - `bassjack1/wizardry_tools` - Python extraction utilities

3. **Tools:** WizardryApp.jar by Denis Molony for data verification

---

## Complete Monster Bestiary

### Reading the Tables

| Column | Description |
|--------|-------------|
| ID | Internal monster index (0-100) |
| Name | Monster display name |
| Class | Monster category (affects Dispell, purpose weapons, friendliness) |
| AC | Armor Class (lower = harder to hit) |
| HP Dice | Hit point formula (dice count = monster level) |
| Group | Number of monsters per encounter group |
| Attacks | Damage dice per attack (multiple entries = multiple attacks) |
| XP | Experience points awarded (calculated from stats) |

### Level 1-2 Monsters (IDs 0-23)

| ID | Name | Class | AC | HP Dice | Group | Attacks | XP |
|----|------|-------|----|---------|----|---------|-----|
| 0 | Bubbly Slime | Animal | 12 | 1d3+1 | 2d2 | 1×1d1 | 55 |
| 1 | Orc | Fighter | 10 | 1d4 | 3d2 | 1×1d4 | 235 |
| 2 | Kobold | Fighter | 8 | 2d3+1 | 2d2+1 | 2×1d2+1 | 415 |
| 3 | Undead Kobold | Undead | 10 | 2d3+2 | 1d6+1 | 1×1d4+1 | 230 |
| 4 | Rogue | Thief | 10 | 2d5+1 | 1d4+1 | 1d4, 2d2+1 | 380 |
| 5 | Bushwacker | Fighter | 8 | 3d6+1 | 1d4+1 | 1d6+1, 2d4+1 | 620 |
| 6 | Highwayman | Fighter | 6 | 3d4+2 | 2d6 | 4×1d2+1 | 840 |
| 7 | Zombie | Undead | 4 | 1d10+1 | 1d6+1 | 1×1d6 | 520 |
| 8 | Creeping Crud | Animal | 6 | 3d4 | 1d6+1 | 1×1d3+1 | 550 |
| 9 | Gas Cloud | Enchanted | 10 | 2d4 | 2d4 | 1×1d4 | 350 |
| 10 | Lvl 1 Mage | Mage | 4 | 1d4+1 | 1d1 | 1×2d2 | 475 |
| 11 | Lvl 1 Priest | Priest | 5 | 1d8 | 1d4+1 | 1×1d8 | 515 |
| 12 | Creeping Coin? | Enchanted | 4 | 1d1 | 9d1 | 1×1d1 | 920 |
| 13 | Lvl 1 Ninja | Fighter | 5 | 2d4+2 | 2d4 | 3×1d4 | 600 |
| 14 | Vorpal Bunny | Animal | 6 | 3d6+2 | 2d3+2 | 1d6, 1d8 | 735 |
| 15 | Capybara | Animal | 8 | 4d4 | 2d4+1 | 1×1d10 | 520 |
| 16 | Giant Toad | Animal | 7 | 4d5 | 2d2+4 | 1d4, 1d6, 2d3+2 | 795 |
| 17 | Coyote | Animal | 8 | 4d6 | 4d2 | 1×4d4 | 780 |
| 18 | Lvl 3 Priest | Priest | 4 | 3d8+1 | 2d2+3 | 1×1d8+2 | 990 |
| 19 | Lvl 3 Samurai | Fighter | 5 | 3d6+4 | 4d2 | 1d4+1, 1d6+1, 1d4+1 | 795 |
| 20 | Lvl 3 Ninja | Fighter | 3 | 3d8 | 2d4+2 | 5×1d4 | 1360 |
| 21 | Were Bear | Animal | 6 | 5d8 | 2d3+2 | 1×3d6+1 | 1320 |
| 22 | Dragon Fly | Dragon | 4 | 2d8 | 1d3+1 | 1d4, 1d4, 1d6 | 1275 |
| 23 | Rotting Corpse | Undead | 6 | 2d8 | 1d5 | 1d3, 1d3, 1d6 | 680 |

### Level 3-5 Monsters (IDs 24-46)

| ID | Name | Class | AC | HP Dice | Group | Attacks | XP |
|----|------|-------|----|---------|----|---------|-----|
| 24 | Ogre | Fighter | 5 | 4d8+1 | 1d8 | 1×2d6 | 960 |
| 25 | Huge Spider | Insect | 6 | 2d8+2 | 1d8 | 1×1d6 | 600 |
| 26 | Wererat | Were | 6 | 3d8+1 | 1d4 | 1×1d8 | 755 |
| 27 | Boring Beetle | Insect | 3 | 5d8 | 1d8 | 1×5d4 | 1120 |
| 28 | Gas Dragon | Dragon | 3 | 5d8 | 1d4 | 1d4, 1d4, 3d6 | 2075 |
| 29 | Priestess | Priest | 4 | 3d8+1 | 1d6 | 1×1d6+2 | 870 |
| 30 | Swordsman | Fighter | 3 | 3d10 | 1d6 | 1×2d7 | 960 |
| **31** | **Huge Spider** | **Insect** | **6** | **2d8+2** | **1d8** | **1×1d6** | **600** |
| 32 | Attack Dog | Animal | 1 | 4d8 | 1d6 | 1×1d6 | 1120 |
| 33 | Gargoyle | Enchanted | 5 | 4d8+4 | 1d6 | 1d3, 1d3, 1d6, 1d4 | 2435 |
| 34 | Grave Mist | Undead | 4 | 4d8 | 1d6 | 1d4, 1d4, 1d8 | 1080 |
| 35 | Dragon Puppy | Dragon | 4 | 5d10 | 1d6 | 1×1d10 | 2280 |
| 36 | Werewolf | Were | 5 | 4d8+3 | 1d6 | 2×2d4 | 975 |
| 37 | Shade | Undead | 7 | 3d8+3 | 1d6 | 1×1d4+1 | 875 |
| 38 | Bishop | Priest | 4 | 4d8 | 1d6 | 1×1d10 | 1135 |
| 39 | Minor Daimyo | Fighter | 2 | 4d10 | 1d6 | 1×1d12 | 1200 |
| 40 | Lvl 5 Mage | Mage | 10 | 5d4 | 1d6 | 1×1d4 | 620 |
| 41 | Lvl 4 Thief | Thief | 10 | 4d8+3 | 1d6 | 1d6, 2d6 | 740 |
| 42 | Killer Wolf | Animal | 0 | 6d8 | 1d6 | 2×2d4 | 1460 |
| 43 | Spirit | Mythical | 2 | 7d3+2 | 1d6 | 1×1d4 | 1245 |
| 44 | Giant Spider | Insect | 4 | 4d8+4 | 1d6 | 1×2d4 | 960 |
| 45 | Weretiger | Were | 4 | 5d8 | 1d8 | 2d6, 2d6, 1d4 | 1405 |
| 46 | Medusalizard | Mythical | 6 | 5d8 | 1d6 | 1×1d3 | 1040 |

**Note on ID 31:** This is a duplicate "Huge Spider" entry with identical combat stats to ID 25, but with different partner (10% Shade vs 10% Boring Beetle) and reward tier (3/13 vs 2/12). This allows the same monster to appear at different dungeon depths with appropriate treasure scaling.

### Level 6-8 Monsters (IDs 47-69)

| ID | Name | Class | AC | HP Dice | Group | Attacks | XP |
|----|------|-------|----|---------|----|---------|-----|
| 47 | Lvl 5 Priest | Priest | 4 | 5d8 | 1d5 | 1×1d6+2 | 1220 |
| 48 | Lvl 6 Ninja | Fighter | 6 | 6d10 | 1d5 | 3×1d6 | 1520 |
| 49 | Lvl 7 Mage | Mage | 8 | 7d4 | 1d6 | 1×1d4 | 1000 |
| 50 | Master Thief | Thief | 4 | 4d6 | 1d6 | 1d6, 1d6, 2d6 | 960 |
| 51 | Major Daimyo | Fighter | 0 | 7d12 | 1d5 | 1d10, 1d4 | 2340 |
| 52 | High Priest | Priest | 3 | 8d8 | 1d6 | 1×1d8+2 | 2160 |
| 53 | Champ Samurai | Fighter | 2 | 10d10 | 1d6 | 1×1d12+2 | 2395 |
| 54 | Arch Mage | Mage | 9 | 8d4+2 | 1d6 | 1×1d4 | 790 |
| 55 | Master Thief | Thief | 3 | 6d6 | 1d6 | 1d8, 3d8 | 1140 |
| 56 | Gaze Hound | Animal | -1 | 4d8 | 1d5 | 1×1d2 | 1235 |
| 57 | Ogre Lord | Mage | 4 | 8d8 | 1d5 | 1×1d12 | 1790 |
| 58 | Troll | Fighter | 4 | 6d8+6 | 1d3 | 3×1d4+4 | 1720 |
| 59 | Lifestealer | Undead | 3 | 5d8+3 | 1d1 | 1×1d4 | 2240 |
| 60 | Nightstalker | Undead | 4 | 5d8+3 | 2d3 | 1×1d6 | 1475 |
| 61 | Wyvern | Animal | 3 | 7d8+7 | 1d6 | 2d8, 1d6 | 1540 |
| 62 | Lvl 8 Priest | Priest | 3 | 7d8 | 1d5 | 1×1d8 | 1720 |
| 63 | Lvl 10 Fighter | Fighter | 0 | 7d10 | 1d6 | 2×1d12 | 1900 |
| 64 | Lvl 7 Mage | Mage | 8 | 7d4 | 1d6 | 1×1d4 | 1240 |
| 65 | Lvl 7 Thief | Thief | 4 | 7d6 | 1d5 | 1d8, 3d8 | 1220 |
| 66 | Lvl 8 Ninja | Fighter | 4 | 8d4 | 1d3 | 2d6, 1d6 | 1020 |
| 67 | Earth Giant | Giant | 9 | 1d1+40 | 1d5 | 2×2d8 | 20435 |
| 68 | Lesser Demon | Demon | 4 | 10d8 | 1d1 | 2d6, 2d6, 1d3, 1d3, 1d4+4 | 5100 |
| 69 | Chimera | Animal | 2 | 9d6 | 1d4 | 1d3, 1d3, 1d4, 1d4, 2d4, 3d4 | 3515 |

### Level 9-10 and Boss Monsters (IDs 70-96)

| ID | Name | Class | AC | HP Dice | Group | Attacks | XP |
|----|------|-------|----|---------|----|---------|-----|
| 70 | Fire Giant | Giant | 3 | 11d8+4 | 1d4 | 1×5d6 | 2115 |
| 71 | Gorgon | Mythical | 2 | 8d8 | 1d1 | 1×2d6 | 2920 |
| 72 | Lvl 8 Bishop | Priest | 2 | 8d8 | 1d6 | 1×1d8+4 | 2060 |
| 73 | Lvl 8 Fighter | Fighter | -1 | 8d10 | 1d6 | 2×1d12+2 | 2140 |
| 74 | Lvl 10 Mage | Mage | 10 | 10d4 | 1d6 | 1×1d4 | 1400 |
| 75 | Thief | Thief | 4 | 9d6 | 1d5 | 1d8, 1d3, 3d8, 2d10 | 1640 |
| 76 | Master Ninja | Fighter | 3 | 10d4 | 1d5 | 3×1d10+3 | 1280 |
| 77 | Murphy's Ghost | Undead | -3 | 10d10+10 | 1d1 | 1×1d1+1 | 4450 |
| 78 | Will O' Wisp | Enchanted | -8 | 10d8 | 1d2 | 1×2d8 | 42840 |
| 79 | Bleeb | Animal | 0 | 10d8 | 1d8 | 2×1d8+1 | 3300 |
| 80 | Frost Giant | Giant | 6 | 1d8+50 | 1d4 | 1×3d10 | 40875 |
| 81 | Fire Dragon | Dragon | -1 | 12d8 | 1d4 | 1d4, 1d4, 4d4 | 5000 |
| 82 | High Priest | Priest | 2 | 11d8 | 1d1 | 2×1d8 | 3300 |
| 83 | High Wizard | Mage | 4 | 12d4 | 1d1 | 1×1d4 | 2395 |
| 84 | Master Thief | Thief | 2 | 12d6 | 1d1 | 1d8, 5d8 | 1935 |
| 85 | Hatamoto | Fighter | -1 | 12d4 | 1d1 | 3×3d8 | 1600 |
| 86 | Vampire | Undead | -1 | 11d8 | 1d4 | 2d8, 1d4, 1d4 | 3330 |
| 87 | Greater Demon | Demon | -3 | 11d8 | 1d6 | 2d12, 1d6, 1d4, 1d4, 1d4 | 44090 |
| 88 | Poison Giant | Giant | 3 | 1d1+80 | 1d4 | 1×4d10 | 40840 |
| 89 | Dragon Zombie | Undead | -2 | 12d8 | 1d4 | 1d8, 1d8, 3d12 | 5200 |
| 90 | Raver Lord | Animal | 10 | 15d10 | 1d1 | 2×3d12 | 4155 |
| 91 | The High Master | Fighter | -2 | 15d4 | 1d1 | 3d12, 3d12, 3d6 | 3000 |
| 92 | Flack | Animal | -3 | 15d12 | 1d1 | 1×4d8+3 | 9200 |
| 93 | Arch Mage | Mage | 0 | 20d4 | 1d1 | 1×1d4 | 3160 |
| 94 | Maelific | Undead | -5 | 25d4 | 1d1 | 1d4, 1d0+1 | 7460 |
| 95 | Vampire Lord | Undead | -5 | 20d8 | 1d1 | 1×1d4 | 7320 |
| 96 | W E R D N A | Mage | -7 | 10d10+20 | 1d1 | 2×8d5 | 15880 |

### Fixed Encounter Monsters (IDs 97-100)

These monsters appear only in the Monster Allocation Center on Level 4.

| ID | Name | Class | AC | HP Dice | Group | Attacks | XP | Notes |
|----|------|-------|----|---------|----|---------|-----|-------|
| 97 | High Ninja | Fighter | -1 | 12d4 | 1d1 | 3×3d8 | 1600 | Critical |
| 98 | High Priest | Priest | 2 | 8d8 | 2d1 | 1×1d8+4 | 2200 | Priest Lv5 |
| 99 | Lvl 7 Mage | Mage | 8 | 7d4 | 2d1 | 1×1d4 | 1000 | Mage Lv4, Sleep |
| 100 | Lvl 7 Fighter | Fighter | 0 | 7d10 | 2d1 | 2×1d12 | 1900 | Unique=1 |

**Note on ID 100:** Has the "Unique" property set to 1. When defeated, this value decrements to 0, after which this monster will never appear again (even in new games on the same disk). Most disk images have this already set to 0.

---

## Monster Special Abilities Reference Table

| ID | Name | Mage Lv | Priest Lv | Spell Resist | Elemental Resist | Abilities |
|----|------|---------|-----------|--------------|------------------|-----------|
| 0 | Bubbly Slime | 0 | 0 | 0% | Physical, Magic | Sleep |
| 1 | Orc | 0 | 0 | 0% | Fire | Sleep, Run |
| 2 | Kobold | 0 | 0 | 0% | Physical, Cold | Sleep, Run |
| 3 | Undead Kobold | 0 | 0 | 0% | Fire, Cold | — |
| 4 | Rogue | 0 | 0 | 0% | — | Sleep, Run |
| 5 | Bushwacker | 0 | 0 | 0% | — | Sleep, Run |
| 6 | Highwayman | 0 | 0 | 0% | — | Critical, Sleep, Run |
| 7 | Zombie | 0 | 0 | 0% | — | Paralyze |
| 8 | Creeping Crud | 0 | 0 | 0% | Cold, Magic | Poison |
| 9 | Gas Cloud | 2 | 0 | 0% | — | Paralyze, Run |
| 10 | Lvl 1 Mage | 1 | 0 | 0% | — | Sleep, Run |
| 11 | Lvl 1 Priest | 0 | 1 | 0% | — | Sleep, Run |
| 12 | Creeping Coin? | 0 | 0 | 0% | Fire, Cold, Poison, Drain, Stone | Call, Drain Breath |
| 13 | Lvl 1 Ninja | 0 | 0 | 0% | — | Critical, Sleep |
| 14 | Vorpal Bunny | 0 | 0 | 0% | Cold | Critical, Run |
| 15 | Capybara | 0 | 0 | 0% | — | Poison, Run |
| 16 | Giant Toad | 0 | 0 | 0% | Fire | Poison, Run |
| 17 | Coyote | 0 | 0 | 0% | Poison, Drain, Stone | Run |
| 18 | Lvl 3 Priest | 0 | 2 | 0% | — | Poison, Sleep, Run |
| 19 | Lvl 3 Samurai | 1 | 0 | 0% | — | Run |
| 20 | Lvl 3 Ninja | 0 | 0 | 0% | — | Poison, Critical |
| 21 | Were Bear | 0 | 0 | 0% | Cold, Poison | Poison, Paralyze, Run, Heal 1 |
| 22 | Dragon Fly | 0 | 0 | 20% | Fire | Sleep, Fire Breath |
| 23 | Rotting Corpse | 0 | 0 | 0% | — | Paralyze |
| 24 | Ogre | 0 | 0 | 0% | — | Sleep, Run |
| 25 | Huge Spider | 0 | 0 | 0% | — | Poison, Sleep |
| 26 | Wererat | 0 | 0 | 0% | Magic | Sleep |
| 27 | Boring Beetle | 0 | 0 | 0% | — | — |
| 28 | Gas Dragon | 1 | 0 | 0% | — | Poison Breath |
| 29 | Priestess | 0 | 2 | 0% | — | Sleep |
| 30 | Swordsman | 0 | 0 | 0% | — | Sleep |
| 31 | Huge Spider | 0 | 0 | 0% | — | Poison, Sleep |
| 32 | Attack Dog | 0 | 0 | 0% | — | Sleep, Run |
| 33 | Gargoyle | 0 | 0 | 50% | Magic | — |
| 34 | Grave Mist | 0 | 0 | 0% | — | Paralyze |
| 35 | Dragon Puppy | 0 | 0 | 0% | — | Cold Breath |
| 36 | Werewolf | 0 | 0 | 0% | Magic | — |
| 37 | Shade | 0 | 0 | 0% | Magic | Drain 1 |
| 38 | Bishop | 1 | 3 | 0% | — | Sleep |
| 39 | Minor Daimyo | 0 | 0 | 0% | — | Sleep, Call |
| 40 | Lvl 5 Mage | 3 | 0 | 0% | — | Sleep |
| 41 | Lvl 4 Thief | 0 | 0 | 0% | — | — |
| 42 | Killer Wolf | 0 | 0 | 0% | — | — |
| 43 | Spirit | 3 | 0 | 25% | Magic | Poison, Heal 1 |
| 44 | Giant Spider | 0 | 0 | 0% | — | Poison |
| 45 | Weretiger | 0 | 0 | 0% | Magic | Poison, Sleep, Heal 1 |
| 46 | Medusalizard | 0 | 0 | 0% | — | Stone |
| 47 | Lvl 5 Priest | 0 | 3 | 0% | — | — |
| 48 | Lvl 6 Ninja | 0 | 0 | 0% | — | Critical |
| 49 | Lvl 7 Mage | 4 | 0 | 0% | — | Sleep |
| 50 | Master Thief | 0 | 0 | 0% | — | Sleep, Run |
| 51 | Major Daimyo | 0 | 0 | 20% | — | Call |
| 52 | High Priest | 0 | 5 | 0% | — | — |
| 53 | Champ Samurai | 1 | 0 | 0% | — | — |
| 54 | Arch Mage | 2 | 0 | 0% | — | — |
| 55 | Master Thief | 0 | 0 | 0% | — | Run |
| 56 | Gaze Hound | 0 | 0 | 0% | Magic | Paralyze, Run |
| 57 | Ogre Lord | 3 | 0 | 0% | — | Heal 1 |
| 58 | Troll | 0 | 0 | 0% | — | Heal 3 |
| 59 | Lifestealer | 3 | 3 | 20% | Poison, Drain, Stone, Magic | Drain 2 |
| 60 | Nightstalker | 0 | 0 | 25% | Magic | Drain 1 |
| 61 | Wyvern | 0 | 0 | 0% | — | Poison |
| 62 | Lvl 8 Priest | 0 | 4 | 0% | — | — |
| 63 | Lvl 10 Fighter | 0 | 0 | 0% | — | — |
| 64 | Lvl 7 Mage | 5 | 0 | 0% | — | — |
| 65 | Lvl 7 Thief | 0 | 0 | 0% | — | Run |
| 66 | Lvl 8 Ninja | 0 | 0 | 0% | — | Critical |
| 67 | Earth Giant | 0 | 0 | 85% | Magic | — |
| 68 | Lesser Demon | 3 | 0 | 60% | — | Call |
| 69 | Chimera | 0 | 0 | 0% | Fire | Fire Breath |
| 70 | Fire Giant | 0 | 0 | 0% | Fire | — |
| 71 | Gorgon | 0 | 0 | 0% | — | Stone Breath |
| 72 | Lvl 8 Bishop | 3 | 4 | 0% | — | — |
| 73 | Lvl 8 Fighter | 0 | 0 | 0% | — | — |
| 74 | Lvl 10 Mage | 5 | 0 | 0% | — | — |
| 75 | Thief | 0 | 0 | 0% | — | Run |
| 76 | Master Ninja | 0 | 0 | 0% | — | Critical |
| 77 | Murphy's Ghost | 0 | 0 | 40% | Fire, Cold, Poison, Drain, Stone, Magic | Sleep, Heal 1 |
| 78 | Will O' Wisp | 0 | 0 | 95% | — | — |
| 79 | Bleeb | 0 | 0 | 0% | Physical, Fire, Cold, Poison, Drain, Stone, Magic | Run, Call |
| 80 | Frost Giant | 0 | 0 | 95% | Cold | — |
| 81 | Fire Dragon | 5 | 0 | 0% | — | Fire Breath |
| 82 | High Priest | 0 | 6 | 0% | — | — |
| 83 | High Wizard | 6 | 0 | 0% | Fire | Sleep |
| 84 | Master Thief | 0 | 0 | 0% | Poison | Run |
| 85 | Hatamoto | 0 | 0 | 0% | — | Critical |
| 86 | Vampire | 3 | 0 | 20% | Poison, Drain, Stone | Paralyze, Drain 2, Heal 1 |
| 87 | Greater Demon | 5 | 0 | 95% | — | Poison, Paralyze, Call, Heal 1 |
| 88 | Poison Giant | 0 | 0 | 95% | — | Poison Breath |
| 89 | Dragon Zombie | 5 | 0 | 25% | — | Drain Breath |
| 90 | Raver Lord | 5 | 4 | 0% | Fire | Heal 2 |
| 91 | The High Master | 0 | 0 | 0% | Fire, Cold, Poison, Drain, Stone, Magic | Critical |
| 92 | Flack | 0 | 0 | 0% | Physical, Fire, Cold, Poison, Drain, Stone, Magic | Cold Breath, Stone, Poison, Paralyze, Critical |
| 93 | Arch Mage | 6 | 0 | 0% | — | — |
| 94 | Maelific | 7 | 0 | 50% | — | Poison, Paralyze, Drain 3, Heal 3 |
| 95 | Vampire Lord | 6 | 0 | 0% | — | Paralyze, Drain 4, Heal 4 |
| 96 | W E R D N A | 7 | 7 | 70% | Fire, Cold, Poison | Stone, Poison, Paralyze, Critical, Drain 4, Heal 5 |
| 97 | High Ninja | 0 | 0 | 0% | — | Critical |
| 98 | High Priest | 0 | 5 | 0% | — | — |
| 99 | Lvl 7 Mage | 4 | 0 | 0% | — | Sleep |
| 100 | Lvl 7 Fighter | 0 | 0 | 0% | — | — |

---

## Monster Partner Chains

When a monster encounter is generated, there's a percentage chance the "partner" monster type will spawn in an additional group. This chains recursively.

| ID | Monster | Partner |
|----|---------|---------|
| 0 | Bubbly Slime | 10% Orc |
| 1 | Orc | 20% Kobold |
| 2 | Kobold | 15% Orc |
| 3 | Undead Kobold | 10% Kobold |
| 4 | Rogue | 20% Orc |
| 5 | Bushwacker | 20% Zombie |
| 6 | Highwayman | 20% Zombie |
| 7 | Zombie | 20% Creeping Crud |
| 8 | Creeping Crud | 24% Bubbly Slime |
| 9 | Gas Cloud | 15% Bubbly Slime |
| 10 | Lvl 1 Mage | 20% Highwayman |
| 11 | Lvl 1 Priest | 25% Rogue |
| 12 | Creeping Coin? | 100% Creeping Coin? |
| 13 | Lvl 1 Ninja | 20% Lvl 1 Ninja |
| 14 | Vorpal Bunny | 20% Capybara |
| 15 | Capybara | 20% Coyote |
| 16 | Giant Toad | 20% Coyote |
| 17 | Coyote | 25% Vorpal Bunny |
| 18 | Lvl 3 Priest | 30% Lvl 1 Priest |
| 19 | Lvl 3 Samurai | 20% Creeping Coin? |
| 20 | Lvl 3 Ninja | 20% Lvl 1 Ninja |
| 21 | Were Bear | 30% Vorpal Bunny |
| 22 | Dragon Fly | — |
| 23 | Rotting Corpse | 10% Grave Mist |
| 24 | Ogre | 20% Vorpal Bunny |
| 25 | Huge Spider | 10% Boring Beetle |
| 26 | Wererat | 50% Coyote |
| 27 | Boring Beetle | 20% Huge Spider |
| 28 | Gas Dragon | 40% Dragon Fly |
| 29 | Priestess | 60% Gas Dragon |
| 30 | Swordsman | 35% Attack Dog |
| 31 | Huge Spider | 10% Shade |
| 32 | Attack Dog | 20% Dragon Fly |
| 33 | Gargoyle | — |
| 34 | Grave Mist | 20% Shade |
| 35 | Dragon Puppy | 10% Wererat |
| 36 | Werewolf | 25% Wererat |
| 37 | Shade | 20% Rotting Corpse |
| 38 | Bishop | 10% Minor Daimyo |
| 39 | Minor Daimyo | 20% Bishop |
| 40 | Lvl 5 Mage | 20% Lvl 4 Thief |
| 41 | Lvl 4 Thief | 20% Bishop |
| 42 | Killer Wolf | 15% Dragon Puppy |
| 43 | Spirit | 20% Gargoyle |
| 44 | Giant Spider | 20% Huge Spider |
| 45 | Weretiger | 20% Werewolf |
| 46 | Medusalizard | 20% Spirit |
| 47 | Lvl 5 Priest | 20% Lvl 6 Ninja |
| 48 | Lvl 6 Ninja | 20% Master Thief |
| 49 | Lvl 7 Mage | 20% Lvl 6 Ninja |
| 50 | Master Thief | 10% Lvl 5 Priest |
| 51 | Major Daimyo | 50% Lvl 5 Priest |
| 52 | High Priest | 20% Champ Samurai |
| 53 | Champ Samurai | 25% High Priest |
| 54 | Arch Mage | 30% Champ Samurai |
| 55 | Master Thief | 25% Arch Mage |
| 56 | Gaze Hound | 20% Gaze Hound |
| 57 | Ogre Lord | 10% Troll |
| 58 | Troll | 5% Troll |
| 59 | Lifestealer | 50% Lifestealer |
| 60 | Nightstalker | 23% Ogre Lord |
| 61 | Wyvern | 20% Spirit |
| 62 | Lvl 8 Priest | 20% Wyvern |
| 63 | Lvl 10 Fighter | 10% Lvl 10 Fighter |
| 64 | Lvl 7 Mage | 30% Wyvern |
| 65 | Lvl 7 Thief | 20% Lvl 8 Priest |
| 66 | Lvl 8 Ninja | 20% Nightstalker |
| 67 | Earth Giant | — |
| 68 | Lesser Demon | 80% Lvl 8 Ninja |
| 69 | Chimera | 20% Arch Mage |
| 70 | Fire Giant | 10% Lesser Demon |
| 71 | Gorgon | 50% Chimera |
| 72 | Lvl 8 Bishop | 20% Gorgon |
| 73 | Lvl 8 Fighter | 20% Lvl 8 Fighter |
| 74 | Lvl 10 Mage | 30% Gorgon |
| 75 | Thief | 20% Gorgon |
| 76 | Master Ninja | 30% Lvl 7 Mage |
| 77 | Murphy's Ghost | 80% Murphy's Ghost |
| 78 | Will O' Wisp | — |
| 79 | Bleeb | 20% Master Ninja |
| 80 | Frost Giant | 30% Thief |
| 81 | Fire Dragon | — |
| 82 | High Priest | 100% Fire Giant |
| 83 | High Wizard | 100% Lvl 8 Bishop |
| 84 | Master Thief | 100% Lvl 8 Fighter |
| 85 | Hatamoto | 100% Lvl 10 Mage |
| 86 | Vampire | 15% Vampire |
| 87 | Greater Demon | 70% Lvl 8 Ninja |
| 88 | Poison Giant | 50% Will O' Wisp |
| 89 | Dragon Zombie | 10% Bleeb |
| 90 | Raver Lord | 100% High Priest |
| 91 | The High Master | 100% Hatamoto |
| 92 | Flack | 100% Murphy's Ghost |
| 93 | Arch Mage | 100% High Wizard |
| 94 | Maelific | 100% Poison Giant |
| 95 | Vampire Lord | 100% Vampire |
| 96 | W E R D N A | 100% Vampire Lord |
| 97 | High Ninja | — |
| 98 | High Priest | 100% High Ninja |
| 99 | Lvl 7 Mage | 100% High Priest |
| 100 | Lvl 7 Fighter | 100% Lvl 7 Mage |

---

## Combat Mechanics Formulas

### Player Hit Probability

```
HitChance = (HitCalcMod + MonsterAC + (3 × TargetPosition) - 1) × 5%
Result clamped to 5%-95% range (always 5% chance to miss, 5% to hit)
```

**HitCalcMod Base Values by Class:**

| Class | Formula |
|-------|---------|
| Fighter, Priest, Samurai, Lord, Ninja | (CharacterLevel ÷ 3) + 2 |
| Mage, Thief, Bishop | (CharacterLevel ÷ 5) |

**Strength Modifiers:**

| STR | Hit Modifier | Damage Modifier |
|-----|--------------|-----------------|
| 3 | -15% | -3 |
| 4 | -10% | -2 |
| 5 | -5% | -1 |
| 6-15 | 0 | 0 |
| 16 | +5% | +1 |
| 17 | +10% | +2 |
| 18 | +15% | +3 |

### Monster Hit Probability

```
HitChance = (MonsterLevel + PlayerAC) × 5%
Result clamped to 5%-95% range
```

Monster level equals the **hit dice count** (e.g., 3d8 HP = Level 3).

### Swings Per Round

| Class | Formula | Maximum |
|-------|---------|---------|
| Fighter, Samurai, Lord | (Level ÷ 5) + 1 | 10 |
| Ninja | (Level ÷ 5) + 2 | 10 |
| All others | 1 | 1 |

**Note:** Weapon swing bonuses do NOT stack with class bonuses. The higher value wins.

### Damage Calculations

- **Base unarmed damage:** 2d2 (overridden by equipped weapon)
- **Ninja unarmed:** 2d4
- **Strength modifier:** Applied per swing
- **Double damage:** vs. sleeping/held targets
- **Double damage:** From purpose weapons vs. matching monster class

### Initiative

**Character Initiative:**
```
Initiative = (1d10) + AgilityModifier
Result clamped to 1-10
```

| AGI | Modifier |
|-----|----------|
| 3 | +2 |
| 4-5 | +1 |
| 6-7 | 0 |
| 8-14 | -1 |
| 15 | -2 |
| 16 | -3 |
| 17 | -4 |
| 18 | -5 |

**Monster Initiative:** 1d8 + 1 (range 2-9)

Lower initiative acts first. On ties, characters act before monsters.

---

## Special Abilities with Exact Mechanics

### Breath Attacks

**Trigger:** 60% chance each round (instead of physical attack)

**Damage Formula:** `CurrentHP ÷ 2` (rounded down), dealt to ALL party members

**Damage Reduction:**
- Save vs. Breath: 50% damage (rounded up)
- Elemental protection item: 50% damage (rounded up)
- Both combined: 25% damage

| Monster | Breath Type | Typical Max Damage |
|---------|-------------|-------------------|
| Dragon Fly | Fire | ~8 |
| Gas Dragon | Poison | ~20 |
| Dragon Puppy | Cold | ~25 |
| Chimera | Fire | ~27 |
| Gorgon | Stone | ~32 |
| Fire Dragon | Fire | ~48 |
| Dragon Zombie | Drain | ~48 |
| Poison Giant | Poison | ~40 (fixed 81 HP) |
| Flack | Cold | ~90 |
| Creeping Coin? | Drain | 1 (1 HP only) |

**Critical:** Stone breath deals DAMAGE only—it does NOT petrify.

### Level Drain

**Mechanic:** Drains X levels per successful hit. **No saving throw.**

**HP Recalculation:**
```
NewMaxHP = OldMaxHP × (NewLevel ÷ MaxLev)
```
Where MaxLev = highest level ever achieved without being drained.

**Death Condition:** Character is permanently LOST if drained below level 1.

| Monster | Drain Amount |
|---------|-------------|
| Shade | 1 |
| Nightstalker | 1 |
| Lifestealer | 2 |
| Vampire | 2 |
| Maelific | 3 |
| Vampire Lord | 4 |
| W E R D N A | 4 |

### Poison

**Activation:** 25% chance per step AND per combat round

**Effect:** -1 HP per activation (or reduces healing by 1)

**Stacking:** Does NOT stack from combat. Value is always 1.
- **Exception:** Poison Needle trap CAN stack poison
- Getting poisoned again from combat resets to 1

**Save vs. Death Resistance:**
```
Base% + RaceBonus + (Level × 5% per 5 levels) + LuckBonus
Maximum: 95%
```

| Class | Base |
|-------|------|
| Fighter, Ninja | 15% |
| Samurai, Lord | 10% |

Human race adds 5%.

**Poisoning Monsters:** Creeping Crud, Capybara, Giant Toad, Lvl 3 Ninja, Lvl 3 Priest, Huge Spider, Were Bear, Spirit, Giant Spider, Weretiger, Wyvern, Greater Demon, Maelific, Flack, W E R D N A

### Paralysis

**Duration:** Permanent until cured (Dialko spell or Temple)

**Monster Recovery:** `(MonsterLevel × 7)%` per turn, maximum 50%

**Temple Cost:** 100 gold × Character Level

**Save:** vs. Death

**Paralyzing Monsters:** Gas Cloud, Zombie, Rotting Corpse, Grave Mist, Were Bear, Gaze Hound, Vampire, Vampire Lord, Greater Demon, Maelific, Flack, W E R D N A

### Petrification (Stone)

**Effect:** Character turned to stone, cannot act

**Save:** vs. Petrify

**Resistance Formula:**
```
Base% + RaceBonus + LevelBonus + LuckBonus
Maximum: 95%
```

| Class | Base |
|-------|------|
| Priest | 15% |
| Bishop, Lord, Ninja | 10% |

Gnome race adds 10%.

**Temple Cost:** 200 gold × Character Level

**Stoning Monsters:** Medusalizard, Flack, W E R D N A

### Critical Hits (Instant Death)

**Player Critical (Ninja or equipped with CritHit item):**
```
Probability = (CharacterLevel × 2)%
Maximum: 50%
```

- Requires dealing at least 1 damage
- Only ONE critical check per attack action (not per swing)

**Monster Critical:**
```
Probability = (MonsterLevel × 2)%
Maximum: 50%
```

**Player Resistance to Monster Criticals:**
1. First: Save vs. Death
2. If failed: `(CharacterLevel × 2)%` chance to survive anyway (max 50%)

**Monster Resistance to Player Criticals:**
```
Resistance = (MonsterLevel + 10) ÷ 35
Monsters level 24+ CANNOT be critically hit
```

| Monster | Level | Crit Chance |
|---------|-------|-------------|
| Lvl 1 Ninja | 2 | 4% |
| Highwayman | 3 | 6% |
| Vorpal Bunny | 3 | 6% |
| Lvl 3 Ninja | 3 | 6% |
| Lvl 6 Ninja | 6 | 12% |
| Lvl 8 Ninja | 8 | 16% |
| Master Ninja | 10 | 20% |
| W E R D N A | 10 | 20% |
| Hatamoto | 12 | 24% |
| High Master | 15 | 30% |
| Flack | 15 | 30% |

### Monster Spellcasting

**Casting Probability:** 75% chance to cast instead of physical attack

**Mage Spell Selection (Random Weighted Degradation):**

| Roll | Effect |
|------|--------|
| 71% | Stay at max level |
| 20.59% | Drop 1 level |
| 5.97% | Drop 2 levels |
| 1.73% | Drop 3 levels |
| ... | (Continues geometrically) |

Then: 66% Spell A, 34% Spell B at selected level.

**Monster Mage Spell Table:**

| Level | Spell A (66%) | Spell B (34%) |
|-------|---------------|---------------|
| 1 | Katino (sleep) | Halito (1d8 fire) |
| 2 | Dilto (darkness) | Halito |
| 3 | Molito (3d6 physical) | Mahalito (4d8 fire) |
| 4 | Dalto (6d6 cold) | Lahalito (6d8 fire) |
| 5 | Lahalito | Madalto (8d8 cold) |
| 6 | Madalto | Zilwan (undead only) |
| 7 | Tiltowait (10d15) | Tiltowait |

**Monster Priest Spell Table:**

| Level | Spell A (66%) | Spell B (34%) |
|-------|---------------|---------------|
| 1 | Badios (1d8) | Badios |
| 2 | Montino (silence) | Montino |
| 3 | Badios | Badial (2d8) |
| 4 | Badial | Badial |
| 5 | Badialma (3d8) | Badi (death) |
| 6 | Lorto (blades) | Mabadi (HP to 1-8) |
| 7 | Mabadi | Mabadi |

**Spell Depletion:**
```
Chance = 1 ÷ (GroupSize + 2)
```
If triggered, group's spell level decreases by 1 for all subsequent casts.

### Regeneration (Heal)

**Trigger:** 25% chance per step AND per combat round

**Amount:** Equal to monster's Heal value

| Monster | Regen Rate |
|---------|-----------|
| Were Bear, Spirit, Weretiger, Murphy's Ghost, Ogre Lord, Greater Demon, Vampire | 1 HP |
| Raver Lord | 2 HP |
| Troll, Maelific | 3 HP |
| Vampire Lord | 4 HP |
| W E R D N A | 5 HP |

### Call for Help

**Trigger:** If group has fewer than 5 monsters, each monster with "Call" ability has 75% chance to call instead of attacking.

**Success Rate:** `(MonsterLevel × 5)%`

If successful, adds monsters to the group.

---

## Magic Resistance System

### General Spell Resistance

Flat percentage chance to completely resist damage spells.

**Affected Spells:** Badios, Badial, Badialma, Litokan, Lorto, Malikto, Halito, Mahalito, Molito, Dalto, Lahalito, Madalto, Zilwan, Tiltowait

### Status Spell Resistance (Level-Based)

| Spell | Resistance Formula |
|-------|-------------------|
| Katino (sleep) | `MonsterLevel × 20%` |
| Manifo (hold) | `(MonsterLevel × 10%) + 50%` |
| Montino (silence) | `MonsterLevel × 10%` |
| Badi (death) | `MonsterLevel × 10%` |
| Lakanito (suffocate) | `MonsterLevel × 6%` |
| Makanito | **IMMUNE** if Level > 7; Undead **ALWAYS immune** |

### Elemental Resistance

Monsters with elemental resistance take **half damage** from matching spell elements:

| Element | Affected Spells |
|---------|-----------------|
| Fire | Litokan, Mahalito, Lahalito |
| Cold | Dalto, Madalto |
| Physical | Lorto, Malikto, Molito, Tiltowait |

**Note:** Poison, Drain, Stone, and Magic elemental resistances have NO effect on spells (no group-targeting spells use those elements).

### High Spell Resistance Monsters

| Monster | Spell Resist |
|---------|-------------|
| Will O' Wisp | 95% |
| Frost Giant | 95% |
| Greater Demon | 95% |
| Poison Giant | 95% |
| Earth Giant | 85% |
| W E R D N A | 70% |
| Lesser Demon | 60% |
| Maelific | 50% |
| Gargoyle | 50% |
| Murphy's Ghost | 40% |

---

## Undead Turning (Dispell)

### Base Formula

```
Success = 50% + (CharacterLevel × 5%) - (MonsterLevel × 10%)
```

### Class Availability and Penalties

| Class | Available | Penalty |
|-------|-----------|---------|
| Priest | Level 1+ | None |
| Bishop | Level 4+ | -20% |
| Lord | Level 9+ | -40% |

### Restrictions

- Only affects **Undead** class monsters
- Only affects monsters with **OK status** (not asleep/held)
- **No XP** awarded for dispelled monsters

### Undead Monsters

Undead Kobold, Zombie, Rotting Corpse, Grave Mist, Shade, Lifestealer, Nightstalker, Murphy's Ghost, Vampire, Dragon Zombie, Maelific, Vampire Lord

---

## Monster Class System

### 14 Monster Classes

| Class | Friendly % | Notable Properties |
|-------|-----------|-------------------|
| Fighter | 11% | Standard humanoids |
| Mage | 6% | Spellcasters |
| Priest | 16% | Healing/curse spells |
| Thief | 4% | — |
| Midget | 31% | UNUSED in Wizardry 1 |
| Giant | 1% | High HP fixed values |
| Mythical | 1% | Gorgon, Medusalizard |
| Dragon | 26% | Breath attacks |
| Animal | 1% | Various creatures |
| Were | 1% | Lycanthropes |
| Undead | 1% | Makanito immune, Zilwan/Dispell targets |
| Demon | 1% | High spell resist |
| Insect | 1% | Spiders, beetles |
| Enchanted | 1% | Magical creatures |

### Friendly Encounter Rules

- Only **Good-aligned parties** can encounter friendly monsters
- Neutral and Evil parties NEVER encounter friendly monsters
- If Good party fights friendly monsters: 1/2000 chance each Good member turns Evil

### Weapon Requirements

**Important:** Wizardry 1 does NOT implement silver/magic weapon requirements. All weapons damage all monsters equally.

### Attack Style (Cosmetic)

| Class | Style |
|-------|-------|
| Fighter, Mage, Priest, Thief, Midget, Giant, Undead, Demon | Arms (SWINGS, THRUSTS, STABS, SLASHES, CHOPS) |
| Mythical, Animal, Insect, Enchanted | Claws (TEARS, RIPS, GNAWS, BITES, CLAWS) |
| Dragon, Were | Both |

---

## Encounter Mechanics

### Random Encounter Rate

- **1% per step** in dungeon corridors
- **12.5%** when kicking doors into flagged rooms (without treasure chest)

### Surprise

```
19% chance party surprises monsters
If not surprised: 15.4% chance monsters surprise party
```

(Actual code uses `RANDOM MOD 100 > 80` = ~20% for each check)

Surprised entities cannot act in the first round.

### Monster Group Limits

```
Maximum groups = min(MazeLevel + 1, 4)
Maximum monsters per group = MazeLevel + 4
```

| Maze Level | Max Groups | Max per Group |
|------------|-----------|---------------|
| 1 | 2 | 5 |
| 2 | 3 | 6 |
| 3 | 4 | 7 |
| 4+ | 4 | Level + 4 |

### Running

```
BaseChance = 39% - (MazeLevel × 3%)

If PartyCount ≤ 3:
  Add: 20% - (PartyCount × 5%)

If monsters are demoralized:
  Add: 20%

RUNNING NEVER WORKS ON LEVEL 10
```

### Monster Morale

```
GroupMorale = MonsterLevel × NumberOfOKMonsters
TotalMonsterMorale = Sum of all group morales
```

When `TotalPartyLevel > TotalMonsterMorale`: monsters become **demoralized**

- Monsters with "Run" ability: 65% flee chance each turn when demoralized

---

## XP Calculation Formula

XP is **calculated from stats**, not stored. Exact formula from source code:

```
XP = [HitDice × Sides × 20 × (1 + HasBreath)]
   + 35 × 2^(MageLevel - 1)      [if MageLevel > 0]
   + 35 × 2^(PriestLevel - 1)    [if PriestLevel > 0]
   + 200 × 2^(DrainLevel - 1)    [if DrainLevel > 0]
   + 90 × 2^(HealLevel - 1)      [if HealLevel > 0]
   - 40 × (ArmorClass - 11)
   + 30 × 2^(AttackCount - 1)    [if AttackCount ≥ 2]
   + 40 × 2^(SpellResistance/10)
   + 10000 × 2^(SR/10 - 8)       [BUG: only if SR ≥ 80]
   + 35 × 2^(ElementalResists - 1)  [count EXCEPT physical]
   + 40 × 2^(Abilities - 1)      [count includes Sleep]
```

### Example Calculation: Greater Demon

```
Base HP:           11 × 8 × 20 × 1 = 1760
Mage Level 5:      35 × 2^4 = 560
Heal Level 1:      90 × 2^0 = 90
AC -3:             -40 × (-3 - 11) = +560
5 Attacks:         30 × 2^4 = 480
Spell Resist 95%:  40 × 2^9 = 20480
SR Bug (≥80):      10000 × 2^1 = 20000
3 Abilities:       40 × 2^2 = 160
-----------------------------------
TOTAL:             44090 XP
```

---

## Saving Throw System

### Five Saving Throw Types

1. **Death** — Resists poison, paralysis, critical hits (combat only)
2. **Petrify** — Resists stoning (combat only)
3. **Wand** — UNUSED (never referenced in code)
4. **Breath** — Resists breath attacks AND gas traps (success = half damage/negate)
5. **Spell** — Resists Montino, anti-priest/anti-mage traps

### Base Formula

```
SaveChance = (Level/5 + Luck/6 - ClassBonus - RaceBonus) × 5%
```

Note: Bonuses are negative numbers (subtracting a negative = adding).

### Race Bonuses

| Race | Bonus |
|------|-------|
| Human | -1 vs Death |
| Elf | -2 vs Wand (UNUSED) |
| Dwarf | -4 vs Breath |
| Gnome | -2 vs Petrify |
| Hobbit | -3 vs Spell |

### Class Bonuses

| Class | Death | Petrify | Wand | Breath | Spell |
|-------|-------|---------|------|--------|-------|
| Fighter | -3 | — | — | — | — |
| Mage | — | — | — | — | -3 |
| Priest | — | -3 | — | — | — |
| Thief | — | — | — | -3 | — |
| Bishop | — | -2 | -2 | — | -2 |
| Samurai | -2 | — | — | — | -2 |
| Lord | -2 | -2 | — | — | — |
| Ninja | -3 | -2 | -4 | -3 | -2 |

---

## Implementation Notes

### Data Storage

Monsters are stored in SCENARIO.DATA file using UCSD Pascal GETREC/PUTREC procedures. Each record contains all fields shown in the bestiary tables.

### Duplicate Monster Entries

Several monsters have multiple IDs with identical combat stats but different partner chains and reward tiers:

- **Huge Spider:** IDs 25, 31
- **Master Thief:** IDs 50, 55, 84
- **Arch Mage:** IDs 54, 93
- **High Priest:** IDs 52, 82, 98
- **Lvl 7 Mage:** IDs 49, 64, 99

This allows the same creature to appear at different dungeon depths with appropriate treasure scaling.

### "Sleep" Ability

The "Sleep" ability is the ONLY "bad" monster ability. Monsters WITH this ability are affected by Katino. Monsters WITHOUT it are immune to Katino.

---

## Known Bugs to Replicate

For accurate clone implementation, these bugs from the original should be preserved:

### 1. Wand Save (LUCKSKIL[2])
Implemented but never called. Elves get a bonus that does nothing.

### 2. Latumapic Bug
Should identify ALL monster groups but only identifies ONE random group.

### 3. MANIFO Bug
Claims to "hold" (paralyze) but actually inflicts ASLEEP status. Held monsters wake up using sleep recovery rates.

### 4. XP Overflow Bug
High spell resistance (≥80%) causes bonus XP via ADDLONGS overflow. Adds ~10,000+ XP to Greater Demon, Frost Giant, Will O' Wisp, and Poison Giant.

### 5. HAMAN/MAHAMAN Bug
Two effects ("SHIELDS PARTY" and "RESURRECTS AND HEALS PARTY") never appear due to programming error:
- Bug: `CASE RANDOM (MOD 3) * MAHAMFLG`
- Should be: `CASE RANDOM MOD (3 * MAHAMFLG)`

### 6. Unique Monster Counter
LVL 7 Fighters (ID 100) have Unique=1, but most disk images already have this set to 0, meaning they never appear.

### 7. Murphy's Ghost Infinite Loop
If Murphy's Ghost (ID 77) is made extinct via Unique counter, encountering them causes infinite loop since their partner is also Murphy's Ghost.

---

## Quick Reference Tables

### Monsters by Breath Attack

| Monster | ID | Breath Type | Max Damage |
|---------|----|-----------|----|
| Dragon Fly | 22 | Fire | ~8 |
| Gas Dragon | 28 | Poison | ~20 |
| Dragon Puppy | 35 | Cold | ~25 |
| Chimera | 69 | Fire | ~27 |
| Gorgon | 71 | Stone | ~32 |
| Fire Dragon | 81 | Fire | ~48 |
| Dragon Zombie | 89 | Drain | ~48 |
| Poison Giant | 88 | Poison | ~40 |
| Flack | 92 | Cold | ~90 |
| Creeping Coin? | 12 | Drain | 1 |

### Monsters by Level Drain

| Monster | ID | Drain | Spell Resist |
|---------|----|----|------|
| Shade | 37 | 1 | 0% |
| Nightstalker | 60 | 1 | 25% |
| Lifestealer | 59 | 2 | 20% |
| Vampire | 86 | 2 | 20% |
| Maelific | 94 | 3 | 50% |
| Vampire Lord | 95 | 4 | 0% |
| W E R D N A | 96 | 4 | 70% |

### Undead Monsters (Dispell/Zilwan Targets)

| Monster | ID | HP | Spell Resist |
|---------|----|----|--------------|
| Undead Kobold | 3 | 2d3+2 | 0% |
| Zombie | 7 | 1d10+1 | 0% |
| Rotting Corpse | 23 | 2d8 | 0% |
| Grave Mist | 34 | 4d8 | 0% |
| Shade | 37 | 3d8+3 | 0% |
| Lifestealer | 59 | 5d8+3 | 20% |
| Nightstalker | 60 | 5d8+3 | 25% |
| Murphy's Ghost | 77 | 10d10+10 | 40% |
| Vampire | 86 | 11d8 | 20% |
| Dragon Zombie | 89 | 12d8 | 25% |
| Maelific | 94 | 25d4 | 50% |
| Vampire Lord | 95 | 20d8 | 0% |

### High Spell Resistance Monsters (Magic-Resistant)

| Monster | ID | Spell Resist | Notes |
|---------|----|----|-------|
| Will O' Wisp | 78 | 95% | AC -8 |
| Frost Giant | 80 | 95% | 1d8+50 HP |
| Greater Demon | 87 | 95% | Mage Lv5 |
| Poison Giant | 88 | 95% | Poison Breath |
| Earth Giant | 67 | 85% | 1d1+40 HP |
| W E R D N A | 96 | 70% | Boss |
| Lesser Demon | 68 | 60% | Call, Mage Lv3 |
| Maelific | 94 | 50% | Drain 3 |
| Gargoyle | 33 | 50% | — |
| Murphy's Ghost | 77 | 40% | Fixed encounter |

---

## Document History

- **Version 1.0:** Initial research compilation
- **Version 2.0:** Corrected and verified against authoritative sources
  - Added missing Monster ID 31 (duplicate Huge Spider)
  - Corrected hit probability clamping (5%-95%)
  - Clarified Save vs. Wand as unused
  - Fixed surprise percentage calculations
  - Added poison stacking exception for Poison Needle trap
  - Verified all monster stats against source code
  - Added complete partner chain table
  - Expanded implementation notes and bug documentation

---

*This document is intended for game clone implementation purposes. All data derived from Thomas William Ewers' reverse-engineered Apple II Pascal source code (2012-2014).*

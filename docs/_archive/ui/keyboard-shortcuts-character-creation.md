# Character Creation Keyboard Shortcuts

This document describes the complete keyboard shortcut system for the Character Creation scene.

## Overview

The character creation flow uses a **priority-based keyboard handler** that processes keyboard input in a specific order to avoid conflicts and provide a smooth user experience. All shortcuts are **single-key** presses (no Ctrl/Alt/Cmd modifiers needed).

## Priority System

Keyboard events are processed in this order (highest to lowest priority):

1. **Modal Isolation** - When name modal is open, all shortcuts are blocked (modal captures input)
2. **ESC** - Reset form (works at any time)
3. **Q** - Quit to Training Grounds (works at any time)
4. **1-5** - Race selection (only before stats rolled/locked)
5. **G, N, E** - Alignment selection (only after race selected, before locked)
6. **R** - Roll/reroll stats (only after alignment selected)
7. **F, M, P, T, B, A, L, J** - Class selection (only after stats rolled)
8. **Enter** - Accept character (only after class selected, opens name modal)

## Complete Shortcut Reference

### Global Shortcuts (Always Available)

| Key | Action | Notes |
|-----|--------|-------|
| **ESC** | Reset Form | Immediately clears all selections and unlocks state. No confirmation dialog. |
| **Q** | Quit to Training Grounds | Exits character creation and returns to training grounds. |

### Race Selection (Step 1)

Available: **Before stats are rolled** (before state is locked)

| Key | Race | Base Stats | Best Classes |
|-----|------|------------|--------------|
| **1** | Human | STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9 | Any |
| **2** | Elf | STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6 | Mage, Priest |
| **3** | Dwarf | STR 10, INT 7, PIE 10, VIT 10, AGI 5, LUC 6 | Fighter, Priest |
| **4** | Gnome | STR 7, INT 7, PIE 10, VIT 8, AGI 10, LUC 7 | Thief, Mage |
| **5** | Hobbit | STR 5, INT 7, PIE 14, VIT 6, AGI 10, LUC 15 | Thief, Priest |

**State:** Once you roll stats (press **R**), race selection is **locked** and these keys are disabled until you press ESC to reset.

### Alignment Selection (Step 2)

Available: **After race selected, before stats rolled** (before state is locked)

| Key | Alignment | Class Restrictions |
|-----|-----------|-------------------|
| **G** | Good | Can be: Lord (Good only), Priest, Bishop, Samurai |
| **N** | Neutral | Can be: Thief, Samurai |
| **E** | Evil | Can be: Ninja (Evil only), Thief, Bishop |

**State:** Once you roll stats (press **R**), alignment selection is **locked** and these keys are disabled until you press ESC to reset.

### Stat Rolling (Step 3)

Available: **After alignment selected**

| Key | Action | Notes |
|-----|--------|-------|
| **R** | Roll Stats / Reroll | First press locks race & alignment. Can reroll multiple times while maintaining lock. |

**Formula:** `Final Stat = Race Base Stat + Rolled Value (3-18)`

Rolled values use 3d6 per stat, with bonus points calculated from total.

### Class Selection (Step 4)

Available: **After stats rolled** (when state is locked)

| Key | Class | Requirements | Alignment | Hit Dice |
|-----|-------|--------------|-----------|----------|
| **F** | Fighter | STR 11+ | Any | 1d10 |
| **M** | Mage | INT 11+ | Any | 1d4 |
| **P** | Priest | PIE 11+ | Any | 1d8 |
| **T** | Thief | AGI 11+ | Neutral/Evil | 1d6 |
| **B** | Bishop | INT 12+, PIE 12+ | Good/Evil | 1d6 |
| **A** | Samurai | STR 15+, INT 11+, PIE 10+, VIT 14+, AGI 10+ | Good/Neutral | 1d8 |
| **L** | Lord | STR 15+, INT 12+, PIE 12+, VIT 15+, AGI 14+, LUC 15+ | Good | 1d10 |
| **J** | Ninja | STR 17+, INT 17+, PIE 17+, VIT 17+, AGI 17+ | Evil | 1d6 |

**Note:** Only **eligible** classes respond to keyboard input. Ineligible classes (marked with ✗) ignore their shortcut keys.

**Shortcut Changes (v2.0):**
- Bishop: **I → B** (to avoid conflict with "Identify" command)
- Samurai: **S → A** (to avoid conflict with "Search" command)
- Ninja: **N → J** (to avoid conflict with "Neutral" alignment)

### Character Naming (Step 5)

Available: **After class selected**

| Key | Action | Notes |
|-----|--------|-------|
| **Enter** | Accept & Name Character | Opens name modal for character naming |

**In Name Modal:**
- Type character name (1-16 characters)
- **Enter** - Save character with entered name
- **ESC** - Cancel and return to character creation

## State Locking System

### What is Locked?

After you **roll stats for the first time** (press **R**), the following become locked:

- **Race selection** (keys 1-5 disabled)
- **Alignment selection** (keys G, N, E disabled)
- Race and alignment buttons show 🔒 lock icons
- Lock hint appears: "Press ESC to unlock and change race/alignment"

### What is NOT Locked?

While race and alignment are locked, you can still:

- **Reroll stats** (press **R** again)
- **Select different classes** (F, M, P, T, B, A, L, J based on new stats)
- **Reset everything** (press **ESC**)
- **Quit** (press **Q**)

### Why Locking?

State locking prevents accidental changes to race/alignment after you've rolled stats, since changing these would require recalculating all final stats. The lock keeps your character build consistent while allowing you to reroll for better stats or try different eligible classes.

### Unlocking

Press **ESC** at any time to immediately unlock and reset the entire form. No confirmation dialog is shown - reset is instant.

## Keyboard Shortcut Blocking

### When Name Modal is Open

**All character creation shortcuts are blocked** when the name modal is visible. This prevents accidental form changes while typing a character name.

Blocked shortcuts include: **1-5, G, N, E, R, F, M, P, T, B, A, L, J, Enter**

Still available: **ESC** (closes modal without saving)

### Context-Aware Shortcuts

Shortcuts are only active in specific contexts:

| Shortcut | Active When |
|----------|-------------|
| 1-5 (Race) | Race not selected yet OR not locked |
| G, N, E (Alignment) | Race selected AND not locked |
| R (Roll) | Alignment selected |
| F, M, P, T, B, A, L, J (Class) | Stats rolled AND class is eligible |
| Enter (Accept) | Class selected |

Pressing a shortcut outside its active context has **no effect** - there's no error or feedback, the key is simply ignored.

## Visual Feedback

### Selected Items
- Selected race/alignment/class buttons show **bright green background**
- Selected state persists until changed or reset

### Locked Items
- Locked buttons show **🔒 lock icon** next to the name
- Locked buttons have **reduced opacity** (0.7)
- Locked buttons are **disabled** (cursor: not-allowed)
- Lock hint appears below locked sections

### Ineligible Classes
- Ineligible class buttons show **✗ icon** in top-right corner
- Ineligible buttons are **dimmed** (gray text/border)
- Ineligible buttons are **disabled** (cannot be clicked or selected via keyboard)

### Button States
- **Hoverable** - Green background on hover (if not disabled)
- **Disabled** - Reduced opacity, cursor: not-allowed
- **Active** - Bright green background, bright text

## Complete Workflow Example

```
1. Press "1" → Select Human
2. Press "g" → Select Good alignment
3. Press "r" → Roll stats (race & alignment now LOCKED)
   [Stats appear: STR 15, INT 13, PIE 11, etc.]
   [Lock icons 🔒 appear on Human and Good]
4. Press "f" → Select Fighter (if eligible)
5. Press "Enter" → Name modal opens
6. Type "Conan" → Enter name
7. Press "Enter" → Character created!
   [Success message: "Conan created successfully!"]
   [Form auto-resets after 2 seconds]
```

## Tips

- **Reroll freely**: You can press **R** multiple times to reroll stats without unlocking race/alignment
- **ESC resets instantly**: No confirmation dialog - use carefully!
- **Check eligibility first**: Look for ✗ marks before trying to select a class
- **Advanced classes are hard**: Lord and Ninja require exceptional stats across all attributes
- **Name length**: Character names are limited to 16 characters

## Accessibility

- All shortcuts are **single-key** (no modifier combinations needed)
- Clear **visual feedback** for all state changes
- **High contrast** indicators (🔒 for locked, ✗ for ineligible)
- **Keyboard-only** workflow supported from start to finish
- **Screen reader friendly** (proper ARIA labels and semantic HTML)

## Related Documentation

- [Training Grounds Scene](./scenes/02-training-grounds.md) - Where characters are created
- [Character Service](../services/CharacterService.md) - Character creation logic
- [Class Eligibility](../game-design/classes.md) - Detailed class requirements
- [Race Statistics](../game-design/races.md) - Complete race stats and bonuses

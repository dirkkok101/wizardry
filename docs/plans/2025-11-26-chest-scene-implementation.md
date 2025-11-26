# Chest Scene Implementation Plan

**Date:** 2025-11-26
**Status:** Design Phase
**Author:** Claude (based on original Wizardry 1 research)

---

## Executive Summary

This document outlines the implementation of the Chest (Treasure Handling) scene, which appears after combat victories or when treasure is found during exploration. The chest scene is a high-risk, high-reward interaction requiring strategic decision-making around trap detection, disarming, and inventory management.

### Key Features
1. **Trap Detection** - Thief inspection (AGI-based) and CALFO spell (95% success)
2. **Trap Disarming** - Level-based formula with class bonus (+50 for Thief/Ninja)
3. **9 Trap Types** - Each with unique effects (damage, status, teleport, combat)
4. **Treasure Distribution** - Gold to party pool, items to opener's inventory
5. **Critical Inventory Warning** - Prevent silent item loss on full inventory

---

## 1. Research Findings (Original Wizardry 1)

### 1.1 Trap Inspection Formula
```typescript
// Inspect success chance by class
Thieves:  chance = AGI × 6%  (max 95%)
Ninjas:   chance = AGI × 4%  (max 95%)
Others:   chance = AGI × 1%  (max 95%)

// Optimal Thief AGI: 16+ (16 × 6 = 96% → capped at 95%)
// Ninja needs AGI 24 for 95% (unrealistic)
```

### 1.2 CALFO Spell
- **Spell Level:** Priest Level 2
- **Success Rate:** 95% (fixed)
- **Cost:** 1 spell point
- **Advantage:** No trigger risk, very reliable
- **Classes:** Priest, Bishop, Lord

### 1.3 Trap Disarming Formula
```typescript
// Disarm success chance
function calculateDisarmChance(characterLevel: number, mazeLevel: number, isThiefOrNinja: boolean): number {
  const levelBonus = isThiefOrNinja ? 50 : 0
  const effectiveLevel = characterLevel + levelBonus
  const chance = (effectiveLevel - mazeLevel) / 70
  return Math.max(0, Math.min(0.95, chance))  // Clamp 0% to 95%
}

// Examples (Maze Level 1):
// Level 1 Thief:   (1+50-1)/70 = 71%
// Level 10 Thief:  (10+50-1)/70 = 84%
// Level 1 Fighter: (1+0-1)/70 = 0%
// Level 51 Fighter: (51+0-1)/70 = 71% (same as Level 1 Thief!)
```

### 1.4 Failed Disarm - Trigger Avoidance
```typescript
// If disarm fails, AGI × 5% chance to NOT trigger trap
function avoidTriggerChance(agi: number): number {
  return agi * 0.05  // 18 AGI = 90% avoid chance
}
```

### 1.5 Wrong Trap Name Behavior
- **Easy levels (1-4):** Entering wrong trap name usually allows retry (~20% trigger)
- **Deep levels (5+):** Entering wrong trap name usually triggers trap (~80% trigger)

### 1.6 Trap Types (9 Total)
| Trap | Effect | Target |
|------|--------|--------|
| POISON NEEDLE | Poison status | Opener only |
| GAS BOMB | Poison status | Entire party |
| CROSSBOW BOLT | 50-100 damage | Opener only |
| EXPLODING BOX | Heavy damage | Entire party |
| STUNNER | Paralysis status | Opener only |
| TELEPORTER | Random dungeon teleport | Entire party |
| MAGE BLASTER | Damage/drain SP | All Mages, Bishops |
| PRIEST BLASTER | Damage/drain SP | All Priests, Bishops, Lords |
| ALARM | Triggers monster encounter | Combat starts |

---

## 2. Type Definitions

### 2.1 TrapType Enum
```typescript
// src/app/types/Trap.ts
export enum TrapType {
  POISON_NEEDLE = 'POISON NEEDLE',
  GAS_BOMB = 'GAS BOMB',
  CROSSBOW_BOLT = 'CROSSBOW BOLT',
  EXPLODING_BOX = 'EXPLODING BOX',
  STUNNER = 'STUNNER',
  TELEPORTER = 'TELEPORTER',
  MAGE_BLASTER = 'MAGE BLASTER',
  PRIEST_BLASTER = 'PRIEST BLASTER',
  ALARM = 'ALARM'
}

export interface TrapEffect {
  type: TrapType
  targetMode: 'opener' | 'party' | 'class_specific' | 'special'
  targetClasses?: CharacterClass[]  // For class-specific traps
  damageFormula?: string  // e.g., "2d6", "3d8"
  statusEffect?: StatusEffect
  specialEffect?: 'teleport' | 'combat'
}
```

### 2.2 Chest Interface
```typescript
// src/app/types/Chest.ts
export interface Chest {
  id: string
  trapped: boolean
  trapType: TrapType | null
  trapIdentified: boolean
  trapDisarmed: boolean
  rewardTier: 1 | 2 | 3 | 4 | 5
  contents: TreasureContents
  sourcePosition: Position  // Where in dungeon
  mazeLevel: number
}

export interface TreasureContents {
  gold: number
  items: Item[]  // 0-2 items typically
}

export type ChestSource = 'combat_victory' | 'exploration' | 'fixed_location' | 'boss'
```

### 2.3 Chest State for Scene
```typescript
// src/app/scenes/chest/chest-state.ts
export interface ChestSceneState {
  mode: 'CHARACTER_SELECT' | 'ACTION_SELECT' | 'TRAP_NAME_INPUT' | 'CASTER_SELECT'
  chest: Chest
  selectedOpener: Character | null
  selectedCaster: Character | null  // For CALFO
  inspectionResult: InspectionResult | null
  lastActionMessage: string
}

export interface InspectionResult {
  success: boolean
  trapIdentified: TrapType | null  // null if failed or no trap
  triggered: boolean  // 1-2% critical failure
}
```

---

## 3. Service Layer

### 3.1 TrapService (New)
```typescript
// src/app/services/TrapService.ts
export const TrapService = {
  /**
   * Calculate trap inspection success chance
   */
  calculateInspectChance(character: Character): number {
    const agi = character.agility
    const multiplier = character.class === 'THIEF' ? 6
                     : character.class === 'NINJA' ? 4
                     : 1
    return Math.min(agi * multiplier, 95)
  },

  /**
   * Attempt to inspect chest for traps
   * Returns identified trap type, or null if failed/no trap
   */
  attemptInspection(character: Character, chest: Chest): InspectionResult {
    // Use RandomService for deterministic testing
    const chance = this.calculateInspectChance(character)
    const roll = RandomService.random(1, 100)
    const success = roll <= chance

    // 1-2% critical failure triggers trap
    const criticalFailure = RandomService.random(1, 100) <= 2

    if (criticalFailure) {
      return { success: false, trapIdentified: null, triggered: true }
    }

    if (success && chest.trapped) {
      return { success: true, trapIdentified: chest.trapType, triggered: false }
    }

    return { success: false, trapIdentified: null, triggered: false }
  },

  /**
   * Calculate trap disarm success chance
   */
  calculateDisarmChance(character: Character, mazeLevel: number): number {
    const isThiefOrNinja = character.class === 'THIEF' || character.class === 'NINJA'
    const levelBonus = isThiefOrNinja ? 50 : 0
    const effectiveLevel = character.level + levelBonus
    const chance = (effectiveLevel - mazeLevel) / 70
    return Math.max(0, Math.min(chance, 0.95))
  },

  /**
   * Calculate chance to avoid triggering trap after failed disarm
   */
  calculateTriggerAvoidance(character: Character): number {
    return character.agility * 0.05
  },

  /**
   * Attempt to disarm a trap
   */
  attemptDisarm(character: Character, chest: Chest, enteredTrapName: string): DisarmResult {
    // Validate trap name matches
    const normalizedInput = enteredTrapName.trim().toUpperCase()
    const correctName = chest.trapType?.replace(/[\s\-]/g, '') || ''
    const normalizedCorrect = correctName.replace(/[\s\-]/g, '')
    const nameMatches = normalizedInput.replace(/[\s\-]/g, '') === normalizedCorrect

    if (!nameMatches) {
      // Wrong trap name - behavior depends on maze level
      const triggerChance = chest.mazeLevel <= 4 ? 0.2 : 0.8
      const triggered = RandomService.roll(triggerChance)
      return { success: false, triggered, wrongName: true }
    }

    // Attempt disarm
    const chance = this.calculateDisarmChance(character, chest.mazeLevel)
    const success = RandomService.roll(chance)

    if (success) {
      return { success: true, triggered: false, wrongName: false }
    }

    // Failed disarm - check AGI save
    const avoidChance = this.calculateTriggerAvoidance(character)
    const avoided = RandomService.roll(avoidChance)

    return { success: false, triggered: !avoided, wrongName: false }
  },

  /**
   * Apply trap effects when triggered
   */
  applyTrapEffects(trapType: TrapType, opener: Character, party: Party, gameState: GameState): TrapEffectResult {
    // Implementation varies by trap type
    // Returns damage dealt, status effects applied, special outcomes
  }
}
```

### 3.2 ChestService (New)
```typescript
// src/app/services/ChestService.ts
export const ChestService = {
  /**
   * Generate a chest after combat or exploration
   */
  generateChest(rewardTier: number, mazeLevel: number, source: ChestSource): Chest {
    // Trap probability increases with tier
    const trapChances = [0.5, 0.6, 0.7, 0.8, 0.9]  // By tier
    const trapped = RandomService.roll(trapChances[rewardTier - 1])

    return {
      id: generateId(),
      trapped,
      trapType: trapped ? this.selectTrapType(rewardTier, mazeLevel) : null,
      trapIdentified: false,
      trapDisarmed: false,
      rewardTier,
      contents: this.generateContents(rewardTier, mazeLevel),
      sourcePosition: getCurrentPosition(),
      mazeLevel
    }
  },

  /**
   * Distribute treasure to party
   */
  distributeTreasure(chest: Chest, opener: Character, party: Party): DistributionResult {
    const results: DistributionResult = {
      goldAdded: chest.contents.gold,
      itemsReceived: [],
      itemsLost: []
    }

    // Gold goes to party pool
    party.pooledGold += chest.contents.gold

    // Items go to opener
    for (const item of chest.contents.items) {
      if (opener.inventory.length < 8) {
        opener.inventory.push(item)
        results.itemsReceived.push(item)
      } else {
        // CRITICAL: Item lost forever
        results.itemsLost.push(item)
      }
    }

    return results
  },

  /**
   * Check if opener has inventory space
   */
  checkInventorySpace(opener: Character, chest: Chest): InventoryWarning | null {
    const itemCount = chest.contents.items.length
    const freeSlots = 8 - opener.inventory.length

    if (itemCount > freeSlots) {
      return {
        itemCount,
        freeSlots,
        itemsAtRisk: itemCount - freeSlots,
        warning: `WARNING: ${opener.name} has only ${freeSlots} free slots. ${itemCount - freeSlots} item(s) will be LOST!`
      }
    }

    return null
  }
}
```

---

## 4. Component Design

### 4.1 Scene Layout
```
┌─────────────────────────────────────┐
│  [SceneTitleComponent]              │
│  TREASURE CHEST                     │
├─────────────────────────────────────┤
│  [ChestDescriptionComponent]        │
│  A treasure chest lies before you.  │
│  Trap: POISON NEEDLE (identified)   │
│                                     │
├─────────────────────────────────────┤
│  [CharacterGridComponent]           │
│  Select who handles the chest:      │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │Fighter│ │ Thief │ │Priest │     │
│  │  L5   │ │  L3 ★ │ │  L4   │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  ★ = Recommended (highest inspect)  │
├─────────────────────────────────────┤
│  [LastActionMessage]                │
│  "Thief successfully disarmed the   │
│   POISON NEEDLE trap!"              │
├─────────────────────────────────────┤
│  [SceneFooterComponent]             │
│  (O)pen (I)nspect (C)alfo           │
│  (D)isarm (L)eave                   │
└─────────────────────────────────────┘
```

### 4.2 State Machine
```typescript
type ChestMode =
  | 'CHARACTER_SELECT'  // Initial: pick who handles chest
  | 'ACTION_SELECT'     // Main menu: O/I/C/D/L
  | 'CASTER_SELECT'     // Choosing CALFO caster
  | 'TRAP_NAME_INPUT'   // Entering trap name for disarm
  | 'INVENTORY_WARNING' // Confirmation when inventory full
  | 'RESULT_DISPLAY'    // Showing trap/treasure outcome
```

### 4.3 Menu Items (Footer)
```typescript
readonly footerMenuItems = computed((): MenuItem[] => {
  const chest = this.chest()
  const items: MenuItem[] = []

  // Open - always available
  items.push({ id: 'open', label: 'Open', shortcut: 'O', enabled: true })

  // Inspect - only if trap not yet identified
  if (!chest.trapIdentified) {
    items.push({ id: 'inspect', label: 'Inspect', shortcut: 'I', enabled: true })
  }

  // CALFO - only if available caster and trap not identified
  if (!chest.trapIdentified && this.hasCalfoCaster()) {
    items.push({ id: 'calfo', label: 'CALFO', shortcut: 'C', enabled: true })
  }

  // Disarm - only if trap identified and not yet disarmed
  if (chest.trapIdentified && chest.trapped && !chest.trapDisarmed) {
    items.push({ id: 'disarm', label: 'Disarm', shortcut: 'D', enabled: true })
  }

  // Leave - always available
  items.push({ id: 'leave', label: 'Leave', shortcut: 'L', enabled: true })

  return items
})
```

---

## 5. Implementation Steps

### Phase 1: Types and Service Layer
1. Create `src/app/types/Trap.ts` with TrapType enum and interfaces
2. Create `src/app/types/Chest.ts` with Chest interface
3. Create `src/app/services/TrapService.ts` with all trap mechanics
4. Create `src/app/services/ChestService.ts` with chest generation/distribution
5. Write unit tests for all service functions (TDD)

### Phase 2: Data Files
1. Create `data/traps/` directory with trap definitions
2. Define damage formulas, status effects, target modes
3. Create JSON schema for trap data validation

### Phase 3: Component Implementation
1. Create `src/app/scenes/chest/` directory structure
2. Implement `ChestComponent` with state machine
3. Create `ChestDescriptionComponent` for trap/status display
4. Integrate with `SceneFooterComponent` and `SceneTitleComponent`
5. Implement keyboard navigation (O/I/C/D/L)
6. Add trap name input dialog for disarm action

### Phase 4: Integration
1. Hook into `CombatService` for post-victory chest generation
2. Hook into `DungeonMovementService` for exploration chests
3. Update `SceneNavigationService` for Chest scene routing
4. Add transition from Combat → Chest → Maze

### Phase 5: Testing
1. Unit tests for TrapService (100% coverage)
2. Unit tests for ChestService (100% coverage)
3. Component tests for ChestComponent
4. Integration tests for full chest flow
5. Edge case tests (inventory full, teleporter, ALARM)

---

## 6. Test Scenarios

### 6.1 Trap Inspection Tests
```typescript
describe('TrapService.attemptInspection', () => {
  it('Thief AGI 16 should have 95% success', () => {
    const thief = createTestCharacter({ class: 'THIEF', agility: 16 })
    expect(TrapService.calculateInspectChance(thief)).toBe(95)
  })

  it('Ninja AGI 18 should have 72% success', () => {
    const ninja = createTestCharacter({ class: 'NINJA', agility: 18 })
    expect(TrapService.calculateInspectChance(ninja)).toBe(72)
  })

  it('Fighter AGI 12 should have 12% success', () => {
    const fighter = createTestCharacter({ class: 'FIGHTER', agility: 12 })
    expect(TrapService.calculateInspectChance(fighter)).toBe(12)
  })
})
```

### 6.2 Trap Disarm Tests
```typescript
describe('TrapService.attemptDisarm', () => {
  it('Level 1 Thief on Maze Level 1 should have 71% success', () => {
    const thief = createTestCharacter({ class: 'THIEF', level: 1 })
    const chance = TrapService.calculateDisarmChance(thief, 1)
    expect(chance).toBeCloseTo(0.71, 2)
  })

  it('Level 51 Fighter should equal Level 1 Thief', () => {
    const fighter = createTestCharacter({ class: 'FIGHTER', level: 51 })
    const thief = createTestCharacter({ class: 'THIEF', level: 1 })
    const fighterChance = TrapService.calculateDisarmChance(fighter, 1)
    const thiefChance = TrapService.calculateDisarmChance(thief, 1)
    expect(fighterChance).toBeCloseTo(thiefChance, 2)
  })

  it('wrong trap name on deep level should usually trigger', () => {
    RandomService.queueNextValues([0.9])  // > 0.8 = trigger
    const result = TrapService.attemptDisarm(thief, deepChest, 'WRONG NAME')
    expect(result.triggered).toBe(true)
  })
})
```

### 6.3 Inventory Full Edge Case
```typescript
describe('ChestService.distributeTreasure', () => {
  it('should lose items when inventory is full', () => {
    const opener = createTestCharacter({ inventory: new Array(8).fill(mockItem) })
    const chest = createTestChest({ contents: { gold: 100, items: [rareItem] } })

    const result = ChestService.distributeTreasure(chest, opener, party)

    expect(result.itemsLost).toContain(rareItem)
    expect(result.goldAdded).toBe(100)  // Gold still works
  })
})
```

---

## 7. UI/UX Enhancements

### 7.1 Inventory Warning
Before opening chest, warn if opener's inventory is nearly full:
```
┌─────────────────────────────────────┐
│  ⚠️ INVENTORY WARNING               │
│                                     │
│  Thief has 7/8 items.               │
│  Chest may contain 2 items.         │
│  1 item could be LOST FOREVER!      │
│                                     │
│  (Y) Open anyway  (N) Cancel        │
│  (D) Drop items first               │
└─────────────────────────────────────┘
```

### 7.2 Trap Identification Display
Show trap info clearly after inspection/CALFO:
```
┌─────────────────────────────────────┐
│  TRAP IDENTIFIED: POISON NEEDLE     │
│                                     │
│  Effect: Poisons opener             │
│  Risk: Low (curable)                │
│                                     │
│  Disarm Chance: 84% (Thief L10)     │
└─────────────────────────────────────┘
```

### 7.3 Character Recommendation
Highlight best character for trap handling:
```
Select handler:
1. Fighter L5  (12% inspect, 0% disarm)
2. Thief L3 ★  (95% inspect, 74% disarm) ← RECOMMENDED
3. Priest L4   (12% inspect, 0% disarm, has CALFO)
```

---

## 8. Dependencies

### Required Services
- `TrapService` (new)
- `ChestService` (new)
- `PartyService` (existing)
- `InventoryService` (existing)
- `SpellCastingService` (for CALFO)
- `RandomService` (for deterministic testing)

### Required Components
- `SceneTitleComponent` (existing)
- `SceneFooterComponent` (existing)
- `CharacterCardComponent` (existing)
- `ConfirmationDialogComponent` (existing)

### Data Files Needed
- `data/traps/*.json` (new)
- `data/spells/calfo.json` (exists)

---

## 9. Risk Mitigation

### 9.1 Silent Item Loss
**Risk:** Items silently lost when inventory full (original game behavior)
**Mitigation:** Add prominent warning before opening, allow dropping items

### 9.2 TELEPORTER Trap
**Risk:** Party teleported into wall = instant death
**Mitigation:** Implement safe teleport validation, or cap teleport to open spaces only

### 9.3 ALARM Trap Combat
**Risk:** ALARM triggers combat, but after combat should we return to chest?
**Decision:** Treasure is collected before combat starts (original behavior), so ALARM just adds a fight

---

## 10. Success Criteria

- [ ] All 9 trap types implemented with correct effects
- [ ] Inspection formula matches original (AGI × class multiplier)
- [ ] Disarm formula matches original ((Level+Bonus-MazeLevel)/70)
- [ ] Failed disarm AGI save working (AGI × 5%)
- [ ] CALFO spell integration (95% success)
- [ ] Inventory full warning prevents silent item loss
- [ ] Treasure distribution correct (gold to pool, items to opener)
- [ ] 100% test coverage on TrapService and ChestService
- [ ] Keyboard navigation working (O/I/C/D/L)
- [ ] Scene transitions correct (Combat → Chest → Maze)

---

## Sources

- [Wizardry Wiki - Traps](https://wizardry.fandom.com/wiki/Traps)
- [GOG Forums - What is the deal with thiefs](https://www.gog.com/forum/wizardry_series/what_is_the_deal_with_thiefs_in_wizardry_1)
- [Strategy Wiki - Walkthrough](https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Walkthrough)
- [GameFAQs - Understanding statistics](https://gamefaqs.gamespot.com/boards/563479-wizardry-proving-grounds-of-the-mad-overlord/78835549)
- [Data Driven Gamer - Treasury of Wizardry](https://datadrivengamer.blogspot.com/2019/08/the-treasury-of-wizardry.html)

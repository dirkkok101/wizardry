# Combat Groups Refactoring Plan

**Date**: 2025-11-24
**Status**: Planning
**Priority**: High

## Executive Summary

Refactor the combat system to properly implement Wizardry 1's monster group mechanics. Currently, encounters generate only a single group of monsters. The original game supported 1-4 groups per encounter, with group-based targeting for spells and abilities.

## Original Wizardry 1 Monster Group Mechanics

### Key Facts from Research

1. **Multiple Groups Per Encounter**: 1-4 groups based on dungeon level
   - Level 1: Max 2 groups
   - Level 2: Max 3 groups
   - Levels 3+: Max 4 groups

2. **Monsters Per Group**: Level-dependent
   - Level 1: Max 5 monsters/group
   - Level 2: Max 6 monsters/group
   - Level 3: Max 7 monsters/group
   - Level 4+: Max 8 monsters/group
   - Deeper: Max 9 monsters/group

3. **Group Numbering**: Groups labeled 1-4 (we use A, B, C, D)

4. **Targeting Mechanics**:
   - **Physical Attacks**: Target first monster in selected group
   - **Single-Target Spells**: Target one monster in selected group
   - **Group-Target Spells**: Affect all monsters in selected group
   - **All-Enemies Spells**: Affect all monsters across all groups

5. **Group Formation**: Each group has front/back positioning

6. **Mixed Composition**: Single group can contain multiple monster types

## Current Implementation Analysis

### What Exists ✓

- `MonsterGroup` interface with A/B/C/D IDs
- Formation tracking (front/back)
- `CombatState.monsterGroups` array
- DISPEL command with `groupId` logic
- Status effects tracking
- Comprehensive test suite

### What's Missing ✗

- Multi-group encounter generation (currently creates only 1 group)
- Group selection UI in combat scene
- Group ID tracking for spell targeting
- Group-aware spell effects
- Visual group separation in UI
- Tests for multi-group scenarios

### Current Code Locations

| Component | Path |
|-----------|------|
| Combat Types | `src/types/Combat.ts` |
| CombatService | `src/services/CombatService.ts` |
| Combat Component | `src/app/scenes/combat/combat.ts` |
| Combat Template | `src/app/scenes/combat/combat.html` |
| MonsterService | `src/services/MonsterService.ts` |
| EncounterService | `src/services/EncounterService.ts` |
| Encounter Data | `data/encounters/level-*-encounters.json` |

## Refactoring Plan

### Phase 1: Type System Updates

**File**: `src/types/Combat.ts`

1. Add `targetGroupId` to `CombatCommand` interface:
```typescript
export interface CombatCommand {
  id: string
  actor: Combatant
  type: CombatActionType
  initiative: number
  target?: Combatant | Combatant[]
  targetGroupId?: 'A' | 'B' | 'C' | 'D'  // NEW: For group-based targeting
  data?: any
}
```

2. Add encounter configuration constants:
```typescript
export const ENCOUNTER_CONFIG = {
  maxGroupsByLevel: {
    1: 2,
    2: 3,
    default: 4
  },
  maxMonstersPerGroupByLevel: {
    1: 5,
    2: 6,
    3: 7,
    4: 8,
    default: 9
  }
}
```

### Phase 2: Encounter Generation Service

**File**: `src/services/EncounterService.ts`

Create `generateEncounter()` method:

```typescript
export const EncounterService = {
  // ... existing methods ...

  /**
   * Generate a complete encounter with 1-4 monster groups
   * @param dungeonLevel - Current dungeon level (1-10)
   * @returns Array of MonsterGroups (1-4 groups)
   */
  generateEncounter(dungeonLevel: number): MonsterGroup[] {
    const maxGroups = this.getMaxGroupsForLevel(dungeonLevel)
    const numGroups = Math.floor(Math.random() * maxGroups) + 1

    const groups: MonsterGroup[] = []
    const groupIds: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

    for (let i = 0; i < numGroups; i++) {
      const monsterId = this.selectMonster(this.getEncounterTable(dungeonLevel))
      const monsters = MonsterService.generateMonsterGroup(monsterId, dungeonLevel)

      groups.push({
        id: groupIds[i],
        monsters: monsters,
        formation: this.determineFormation(monsters)
      })
    }

    return groups
  },

  getMaxGroupsForLevel(level: number): number {
    if (level === 1) return 2
    if (level === 2) return 3
    return 4
  },

  determineFormation(monsters: MonsterInstance[]): 'front' | 'back' {
    // TODO: Implement logic based on monster type
    // For now, random distribution
    return Math.random() < 0.5 ? 'front' : 'back'
  }
}
```

**Tests**: `src/services/__tests__/EncounterService.spec.ts`

Add tests for:
- Correct number of groups per level
- Group ID assignment (A, B, C, D)
- Monster count limits per level
- Formation assignment
- Mixed monster types across groups

### Phase 3: Update CombatService.initiateCombat()

**File**: `src/services/CombatService.ts` (lines 22-50)

Replace single-group creation with encounter generation:

```typescript
static initiateCombat(
  dungeonLevel: number,
  party: Party,
  canFlee: boolean = true
): CombatState {
  // Generate 1-4 monster groups based on dungeon level
  const monsterGroups = EncounterService.generateEncounter(dungeonLevel)

  return {
    monsterGroups,
    commandQueue: [],
    roundNumber: 1,
    combatLog: [],
    canFlee,
    statusEffects: {
      blinded: new Set(),
      silenced: new Set(),
      asleep: new Set(),
      paralyzed: new Set()
    },
    acModifiers: {
      parrying: new Set()
    },
    statusDurations: {
      asleep: new Map(),
      paralyzed: new Map()
    }
  }
}
```

**Breaking Change**: Signature changes from `(monsterId, party, canFlee)` to `(dungeonLevel, party, canFlee)`

**Migration**: Update all callsites to pass dungeon level instead of monster ID

### Phase 4: Combat UI Refactoring

**File**: `src/app/scenes/combat/combat.html`

Current structure (lines 14-35):
```html
<div class="monsters-panel">
  <h3>MONSTERS ({{ monsters().length }})</h3>
  @for (monster of monsters(); track monster.id) {
    <!-- Individual monster cards -->
  }
</div>
```

New structure with groups:
```html
<div class="monsters-panel">
  <h3>MONSTER GROUPS</h3>

  @for (group of monsterGroups(); track group.id) {
    <div class="monster-group" [attr.data-group]="group.id">
      <!-- Group Header -->
      <div class="group-header"
           [class.targetable]="isGroupTargetMode() && hasAliveMonsters(group)"
           [class.selected]="selectedGroupId() === group.id"
           (click)="selectGroup(group.id)">
        <span class="group-label">GROUP {{ group.id }}</span>
        <span class="group-formation">{{ group.formation | uppercase }} ROW</span>
        <span class="group-count">{{ getAliveCount(group) }}/{{ group.monsters.length }}</span>
      </div>

      <!-- Monster Cards in Group -->
      <div class="group-monsters">
        @for (monster of group.monsters; track monster.id) {
          <div class="monster-card"
               [class.dead]="monster.hp <= 0"
               [class.targetable]="isMonsterTargetMode() && monster.hp > 0"
               [class.selected]="selectedTarget()?.id === monster.id"
               (click)="selectMonster(monster)">
            <div class="monster-name">{{ monster.name }}</div>
            <div class="monster-hp">HP: {{ monster.hp }}/{{ monster.maxHp }}</div>
            <div class="monster-ac">AC: {{ monster.ac }}</div>
            @if (monster.status !== 'ALIVE') {
              <div class="monster-status">{{ monster.status }}</div>
            }
          </div>
        }
      </div>
    </div>
  }
</div>
```

**File**: `src/app/scenes/combat/combat.ts`

Add new computed signals and methods:

```typescript
export class CombatComponent {
  // ... existing code ...

  // NEW: Track selected group
  selectedGroupId = signal<'A' | 'B' | 'C' | 'D' | null>(null)

  // NEW: Determine targeting mode
  isGroupTargetMode = computed(() => {
    const action = this.selectedAction()
    if (!action) return false

    // Group targeting for:
    // - DISPEL command
    // - Group-target spells
    if (action === 'DISPEL') return true

    if (action === 'SPELL') {
      const spellId = this.selectedSpellId()
      if (!spellId) return false

      const spell = SpellCastingService.getSpell(spellId)
      return spell?.target === 'group'
    }

    return false
  })

  isMonsterTargetMode = computed(() => {
    const action = this.selectedAction()
    if (!action) return false

    // Single monster targeting for:
    // - FIGHT command
    // - Single-target spells
    if (action === 'FIGHT') return true

    if (action === 'SPELL') {
      const spellId = this.selectedSpellId()
      if (!spellId) return false

      const spell = SpellCastingService.getSpell(spellId)
      return spell?.target === 'single' || spell?.target === 'foe'
    }

    return false
  })

  selectGroup(groupId: 'A' | 'B' | 'C' | 'D') {
    if (!this.isGroupTargetMode()) return

    this.selectedGroupId.set(groupId)
    this.selectedTarget.set(null) // Clear individual target
  }

  selectMonster(monster: MonsterInstance) {
    if (!this.isMonsterTargetMode()) return
    if (monster.hp <= 0) return

    this.selectedTarget.set(monster)

    // Auto-set group ID for this monster
    const group = this.findGroupContainingMonster(monster.id)
    if (group) {
      this.selectedGroupId.set(group.id)
    }
  }

  findGroupContainingMonster(monsterId: string): MonsterGroup | undefined {
    const state = this.combatState()
    if (!state) return undefined

    return state.monsterGroups.find(group =>
      group.monsters.some(m => m.id === monsterId)
    )
  }

  hasAliveMonsters(group: MonsterGroup): boolean {
    return group.monsters.some(m => m.hp > 0)
  }

  getAliveCount(group: MonsterGroup): number {
    return group.monsters.filter(m => m.hp > 0).length
  }
}
```

### Phase 5: Update Combat Command Creation

**File**: `src/app/scenes/combat/combat.ts`

Update `confirmAction()` to include `targetGroupId`:

```typescript
confirmAction() {
  const char = this.selectedCharacter()
  const action = this.selectedAction()
  const target = this.selectedTarget()
  const groupId = this.selectedGroupId()

  if (!char || !action) return

  // Validation based on targeting mode
  if (this.isGroupTargetMode() && !groupId) {
    this.statusMessage.set('Please select a monster group to target')
    return
  }

  if (this.isMonsterTargetMode() && !target) {
    this.statusMessage.set('Please select a target monster')
    return
  }

  // Build command with targetGroupId
  const command: Partial<CombatCommand> = {
    actor: char,
    type: action,
    target,
    targetGroupId: groupId || undefined,
    data: this.buildCommandData()
  }

  // Store and continue
  this.selectedActions.set(char.id, command as CombatCommand)
  this.advanceToNextCharacter()
}
```

### Phase 6: Update Spell Execution Logic

**File**: `src/services/CombatService.ts`

Update spell execution to handle group targeting:

```typescript
private static executeSpellCommand(
  state: CombatState,
  command: CombatCommand,
  partyMembers: Character[]
): CombatState {
  const spell = SpellCastingService.getSpell(command.data.spellId)
  if (!spell) return state

  // Handle different target types
  if (spell.target === 'group' && command.targetGroupId) {
    // Apply to all monsters in group
    return this.applySpellToGroup(state, command, spell)
  } else if (spell.target === 'all_enemies') {
    // Apply to all monsters in all groups
    return this.applySpellToAllEnemies(state, command, spell)
  } else if (spell.target === 'single' || spell.target === 'foe') {
    // Apply to single target (existing logic)
    return this.applySpellToSingleTarget(state, command, spell)
  }

  return state
}

private static applySpellToGroup(
  state: CombatState,
  command: CombatCommand,
  spell: Spell
): CombatState {
  const groupId = command.targetGroupId!
  const group = state.monsterGroups.find(g => g.id === groupId)

  if (!group) return state

  let newState = state
  const targets = group.monsters.filter(m => m.hp > 0)

  for (const monster of targets) {
    newState = this.applySpellEffect(newState, spell, monster, command.actor)
  }

  newState.combatLog.push(
    `${command.actor.name} casts ${spell.name} on Group ${groupId}! ` +
    `${targets.length} monsters affected.`
  )

  return newState
}

private static applySpellToAllEnemies(
  state: CombatState,
  command: CombatCommand,
  spell: Spell
): CombatState {
  let newState = state
  let totalAffected = 0

  for (const group of state.monsterGroups) {
    const targets = group.monsters.filter(m => m.hp > 0)
    for (const monster of targets) {
      newState = this.applySpellEffect(newState, spell, monster, command.actor)
      totalAffected++
    }
  }

  newState.combatLog.push(
    `${command.actor.name} casts ${spell.name} on all enemies! ` +
    `${totalAffected} monsters affected.`
  )

  return newState
}
```

### Phase 7: Update DISPEL Command

**File**: `src/services/CombatService.ts` (lines 503-576)

Already has `groupId` logic - just needs validation:

```typescript
private static executeDispelCommand(
  state: CombatState,
  command: CombatCommand
): CombatState {
  const groupId = command.targetGroupId // Use new field instead of command.data.groupId

  if (!groupId) {
    return {
      ...state,
      combatLog: [
        ...state.combatLog,
        `${command.actor.name} attempts DISPEL but no group was targeted!`
      ]
    }
  }

  // ... rest of existing logic ...
}
```

### Phase 8: Styling Updates

**File**: `src/app/scenes/combat/combat.scss`

Add styles for grouped display:

```scss
.monsters-panel {
  .monster-group {
    margin-bottom: 1rem;
    border: 1px solid #666;
    border-radius: 4px;

    &[data-group="A"] { border-color: #ff6b6b; }
    &[data-group="B"] { border-color: #4ecdc4; }
    &[data-group="C"] { border-color: #ffe66d; }
    &[data-group="D"] { border-color: #a8e6cf; }
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    font-weight: bold;

    &.targetable {
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    &.selected {
      background: rgba(255, 255, 0, 0.3);
      border: 2px solid yellow;
    }
  }

  .group-label {
    color: #ffeb3b;
  }

  .group-formation {
    color: #999;
    font-size: 0.9rem;
  }

  .group-count {
    color: #4caf50;
  }

  .group-monsters {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .monster-card {
    // ... existing styles ...

    &.dead {
      opacity: 0.4;
      text-decoration: line-through;
    }

    &.selected {
      border: 2px solid yellow;
      background: rgba(255, 255, 0, 0.2);
    }
  }
}
```

### Phase 9: Testing Strategy

**File**: `src/services/__tests__/CombatService.multigroup.spec.ts` (NEW)

Create comprehensive tests for multi-group scenarios:

```typescript
describe('CombatService - Multi-Group Encounters', () => {
  describe('initiateCombat', () => {
    it('creates 1-2 groups for level 1', () => {
      const state = CombatService.initiateCombat(1, testParty, true)
      expect(state.monsterGroups.length).toBeGreaterThanOrEqual(1)
      expect(state.monsterGroups.length).toBeLessThanOrEqual(2)
    })

    it('creates 1-3 groups for level 2', () => {
      const state = CombatService.initiateCombat(2, testParty, true)
      expect(state.monsterGroups.length).toBeGreaterThanOrEqual(1)
      expect(state.monsterGroups.length).toBeLessThanOrEqual(3)
    })

    it('creates 1-4 groups for level 3+', () => {
      const state = CombatService.initiateCombat(5, testParty, true)
      expect(state.monsterGroups.length).toBeGreaterThanOrEqual(1)
      expect(state.monsterGroups.length).toBeLessThanOrEqual(4)
    })

    it('assigns unique group IDs (A, B, C, D)', () => {
      const state = CombatService.initiateCombat(5, testParty, true)
      const ids = state.monsterGroups.map(g => g.id)
      expect(new Set(ids).size).toBe(ids.length) // All unique
      expect(ids.every(id => ['A', 'B', 'C', 'D'].includes(id))).toBe(true)
    })
  })

  describe('Group-targeting spells', () => {
    it('applies BARIKO to all monsters in target group only', () => {
      const state = createMultiGroupCombat() // Helper: 3 groups
      const mage = testParty.members[0]

      const command: CombatCommand = {
        id: 'cmd1',
        actor: mage,
        type: 'SPELL',
        initiative: 10,
        targetGroupId: 'B',
        data: { spellId: 'bariko' }
      }

      const result = CombatService.executeCommand(state, command, new Set())

      // Group B monsters damaged
      const groupB = result.monsterGroups.find(g => g.id === 'B')!
      expect(groupB.monsters.every(m => m.hp < m.maxHp)).toBe(true)

      // Groups A and C unaffected
      const groupA = result.monsterGroups.find(g => g.id === 'A')!
      const groupC = result.monsterGroups.find(g => g.id === 'C')!
      expect(groupA.monsters.every(m => m.hp === m.maxHp)).toBe(true)
      expect(groupC.monsters.every(m => m.hp === m.maxHp)).toBe(true)
    })

    it('applies TILTOWAIT to all monsters in all groups', () => {
      const state = createMultiGroupCombat()
      const mage = testParty.members[0]

      const command: CombatCommand = {
        id: 'cmd1',
        actor: mage,
        type: 'SPELL',
        initiative: 10,
        data: { spellId: 'tiltowait' }
      }

      const result = CombatService.executeCommand(state, command, new Set())

      // All groups affected
      for (const group of result.monsterGroups) {
        expect(group.monsters.every(m => m.hp < m.maxHp)).toBe(true)
      }
    })
  })

  describe('DISPEL command', () => {
    it('destroys entire target group', () => {
      const state = createMultiGroupCombat()
      const priest = testParty.members[1]

      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 10,
        targetGroupId: 'A'
      }

      const result = CombatService.executeCommand(state, command, new Set())

      const groupA = result.monsterGroups.find(g => g.id === 'A')!
      expect(groupA.monsters.every(m => m.hp === 0)).toBe(true)
    })

    it('fails if no groupId provided', () => {
      const state = createMultiGroupCombat()
      const priest = testParty.members[1]

      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 10
        // Missing targetGroupId
      }

      const result = CombatService.executeCommand(state, command, new Set())
      expect(result.combatLog.some(log => log.includes('no group was targeted')))
        .toBe(true)
    })
  })

  describe('Physical attacks', () => {
    it('targets first alive monster in selected group', () => {
      // Test that FIGHT command respects group selection
      // and targets first monster in that group
    })
  })
})
```

**File**: `src/services/__tests__/EncounterService.spec.ts`

Add tests for encounter generation:

```typescript
describe('EncounterService', () => {
  describe('generateEncounter', () => {
    it('respects level-based group limits', () => {
      // Test max groups per level
    })

    it('respects monster count limits per level', () => {
      // Test max monsters per group
    })

    it('assigns formations to groups', () => {
      // Test front/back assignment
    })

    it('creates varied encounters', () => {
      // Run 100 times, ensure variety
    })
  })
})
```

### Phase 10: Documentation Updates

**File**: `docs/systems/combat-system.md`

Add section on monster groups:

```markdown
## Monster Groups

### Group Organization

Each combat encounter contains 1-4 monster groups, labeled A through D.

**Level-Based Limits**:
- Level 1: 1-2 groups max
- Level 2: 1-3 groups max
- Level 3+: 1-4 groups max

**Monsters Per Group**:
- Level 1: 1-5 monsters
- Level 2: 1-6 monsters
- Level 3: 1-7 monsters
- Level 4+: 1-8 monsters
- Deep levels: 1-9 monsters

### Group Formation

Each group has a formation position:
- **Front Row**: Takes melee hits first, can melee attack party
- **Back Row**: Protected from melee, can use ranged/spells

### Targeting Mechanics

**Physical Attacks (FIGHT)**:
1. Player selects target group
2. Attack hits first alive monster in that group
3. Damage concentrated on single monster

**Single-Target Spells**:
1. Player selects target group
2. Player selects specific monster in group
3. Spell affects only that monster

**Group-Target Spells** (e.g., BARIKO):
1. Player selects target group
2. Spell affects all alive monsters in that group
3. Each monster receives separate damage roll

**All-Enemies Spells** (e.g., TILTOWAIT):
1. No group selection needed
2. Spell affects all alive monsters in all groups
3. Each monster receives separate damage roll

**DISPEL Command**:
1. Player selects target group
2. All undead in that group destroyed instantly
3. Other groups unaffected

### UI Display

Monster groups shown with:
- **Group Label**: "GROUP A", "GROUP B", etc.
- **Formation Badge**: "FRONT ROW" or "BACK ROW"
- **Count Display**: "3/5" (alive/total)
- **Color Coding**: Each group has distinct border color
- **Collapsible Cards**: Individual monsters shown within group container

### Selection Modes

**Group Selection Mode** (for group spells, DISPEL):
- Entire group card is clickable
- Selected group highlighted in yellow
- Individual monsters not targetable

**Monster Selection Mode** (for attacks, single spells):
- Group headers not clickable
- Individual monster cards clickable
- Selected monster highlighted in yellow
- Group auto-selected based on monster
```

## Migration Checklist

- [ ] Update `Combat.ts` type definitions
- [ ] Implement `EncounterService.generateEncounter()`
- [ ] Write encounter generation tests (100% coverage)
- [ ] Update `CombatService.initiateCombat()` signature
- [ ] Update all `initiateCombat()` callsites
- [ ] Refactor combat UI template with groups
- [ ] Add group selection logic to combat component
- [ ] Update spell execution for group targeting
- [ ] Update DISPEL command to use `targetGroupId`
- [ ] Add multi-group combat tests
- [ ] Update combat scene styles
- [ ] Update combat system documentation
- [ ] Run full test suite (must pass 100%)
- [ ] Manual testing with 1, 2, 3, 4 group encounters
- [ ] Performance test (encounters must generate <10ms)

## Breaking Changes

### API Changes

**`CombatService.initiateCombat()`**:
```typescript
// OLD
initiateCombat(monsterId: string, party: Party, canFlee: boolean)

// NEW
initiateCombat(dungeonLevel: number, party: Party, canFlee: boolean)
```

**Migration**: Replace all calls with dungeon level:
```typescript
// OLD
const state = CombatService.initiateCombat('kobold', party, true)

// NEW
const state = CombatService.initiateCombat(1, party, true)
```

### Component API Changes

**Combat Component**:
- New required signal: `selectedGroupId`
- New methods: `selectGroup()`, `selectMonster()`, `findGroupContainingMonster()`
- Changed computed: `targetingPrompt()` now considers group vs monster mode

## Performance Requirements

- Encounter generation: <10ms for 4 groups
- UI render with 36 monsters (4 groups × 9): <100ms
- Group selection response: <16ms (1 frame)
- Full combat round with 4 groups: <500ms

## Testing Requirements

- Minimum 95% coverage for `EncounterService`
- Minimum 90% coverage for multi-group combat scenarios
- All existing tests must continue passing
- Performance tests must validate <10ms encounter generation

## Success Criteria

1. ✅ Encounters generate 1-4 groups based on level
2. ✅ Groups visually separated in UI with labels A-D
3. ✅ Group selection works for DISPEL and group spells
4. ✅ Monster selection works for FIGHT and single spells
5. ✅ All-enemies spells affect all groups
6. ✅ Formation badges displayed (Front/Back Row)
7. ✅ Test coverage ≥90% for new code
8. ✅ All existing tests pass
9. ✅ Performance targets met
10. ✅ Documentation updated

## Timeline

**Estimated Effort**: 8-12 hours

- Phase 1-2: Types & Encounter Generation (2h)
- Phase 3: Update initiateCombat (1h)
- Phase 4-5: UI Refactoring (3h)
- Phase 6-7: Spell & Command Updates (2h)
- Phase 8: Styling (1h)
- Phase 9: Testing (2h)
- Phase 10: Documentation (1h)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing combat tests | High | Update tests incrementally, run suite frequently |
| UI performance with 36 monsters | Medium | Use virtual scrolling if needed, performance testing |
| Encounter balance (too hard/easy) | Medium | Start conservative, tune based on playtesting |
| Complex targeting logic bugs | High | Comprehensive unit tests, integration tests |

## Open Questions

1. **Should we support friendly monster groups?** (original game had alignment)
   - Decision: Defer to later phase

2. **Should group formation affect attack targeting?** (e.g., can't melee back row)
   - Decision: Yes, implement in Phase 6

3. **Should we show monster pictures for each group?**
   - Decision: Show picture for dominant monster type in group

4. **How to handle mixed monster types in single group?**
   - Decision: Support in Phase 2, display all unique types

## References

- Original Research: See task output from claude-code-guide agent
- Current Combat Implementation: `src/services/CombatService.ts`
- Combat UI: `src/app/scenes/combat/`
- Wizardry 1 Mechanics: Multiple authoritative sources (see research output)

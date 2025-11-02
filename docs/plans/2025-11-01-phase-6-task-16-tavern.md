# Task 16: Tavern (Party Formation) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Gilgamesh's Tavern with full party formation features including alignment validation, character status checks, gold distribution, roster management, and character inspection navigation.

**Architecture:** Build on existing scaffolded Tavern component. Add PartyService integration for validation and formation management. Implement alignment conflict detection (Good vs Evil), character status filtering, and gold distribution logic. Use signal-based reactivity for real-time UI updates.

**Tech Stack:** Angular 19, TypeScript 5.5+, Jest, Signal-based state management, Standalone components

---

## Part 1: Alignment Validation Service

### Task 16.1: Write Alignment Validation Tests

**Files:**
- Test: `src/services/__tests__/PartyService.spec.ts` (modify existing)

**Step 1: Write failing tests for alignment validation**

Add the following tests to the existing PartyService test file:

```typescript
describe('PartyService', () => {
  describe('canAddCharacterToParty', () => {
    it('allows adding character to empty party', () => {
      const party = createEmptyParty()
      const character = createTestCharacter({ alignment: Alignment.GOOD })

      const result = PartyService.canAddCharacterToParty(party, character, allCharacters)

      expect(result.allowed).toBe(true)
    })

    it('prevents adding Evil character to party with Good members', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      const party = createPartyWithMembers([goodChar.id])
      const allCharacters = new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]])

      const result = PartyService.canAddCharacterToParty(party, evilChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Good and Evil cannot party together')
    })

    it('prevents adding Good character to party with Evil members', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      const party = createPartyWithMembers([evilChar.id])
      const allCharacters = new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]])

      const result = PartyService.canAddCharacterToParty(party, goodChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Good and Evil cannot party together')
    })

    it('allows adding Neutral character to party with Good members', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const neutralChar = createTestCharacter({
        id: 'neutral-1',
        alignment: Alignment.NEUTRAL
      })
      const party = createPartyWithMembers([goodChar.id])
      const allCharacters = new Map([[goodChar.id, goodChar], [neutralChar.id, neutralChar]])

      const result = PartyService.canAddCharacterToParty(party, neutralChar, allCharacters)

      expect(result.allowed).toBe(true)
    })

    it('allows adding Neutral character to party with Evil members', () => {
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      const neutralChar = createTestCharacter({
        id: 'neutral-1',
        alignment: Alignment.NEUTRAL
      })
      const party = createPartyWithMembers([evilChar.id])
      const allCharacters = new Map([[evilChar.id, evilChar], [neutralChar.id, neutralChar]])

      const result = PartyService.canAddCharacterToParty(party, neutralChar, allCharacters)

      expect(result.allowed).toBe(true)
    })

    it('prevents adding character when party is full (6 members)', () => {
      const characters = Array.from({ length: 6 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      )
      const newChar = createTestCharacter({ id: 'char-7', alignment: Alignment.NEUTRAL })
      const party = createPartyWithMembers(characters.map(c => c.id))
      const allCharacters = new Map([
        ...characters.map(c => [c.id, c] as const),
        [newChar.id, newChar]
      ])

      const result = PartyService.canAddCharacterToParty(party, newChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Party is full (maximum 6 members)')
    })

    it('prevents adding character with DEAD status', () => {
      const party = createEmptyParty()
      const deadChar = createTestCharacter({
        status: CharacterStatus.DEAD
      })
      const allCharacters = new Map([[deadChar.id, deadChar]])

      const result = PartyService.canAddCharacterToParty(party, deadChar, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not available')
    })

    it('prevents adding character already in party', () => {
      const character = createTestCharacter({ id: 'char-1' })
      const party = createPartyWithMembers([character.id])
      const allCharacters = new Map([[character.id, character]])

      const result = PartyService.canAddCharacterToParty(party, character, allCharacters)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Character already in party')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- PartyService`
Expected: 8 new test failures - "canAddCharacterToParty is not a function"

**Step 3: Implement canAddCharacterToParty method**

**Files:**
- Create: `src/services/PartyService.ts`

```typescript
import { Party } from '../types/Party'
import { Character } from '../types/Character'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'

interface ValidationResult {
  allowed: boolean
  reason?: string
}

const MAX_PARTY_SIZE = 6

export class PartyService {
  /**
   * Validate if character can be added to party
   * Checks: party size, alignment conflicts, character status, duplicates
   */
  static canAddCharacterToParty(
    party: Party,
    character: Character,
    allCharacters: Map<string, Character>
  ): ValidationResult {
    // Check if already in party
    if (party.members.includes(character.id)) {
      return { allowed: false, reason: 'Character already in party' }
    }

    // Check party size
    if (party.members.length >= MAX_PARTY_SIZE) {
      return { allowed: false, reason: `Party is full (maximum ${MAX_PARTY_SIZE} members)` }
    }

    // Check character status (only OK characters can join)
    if (character.status !== CharacterStatus.OK) {
      return { allowed: false, reason: `${character.name} is not available (status: ${character.status})` }
    }

    // Check alignment conflicts (Good vs Evil)
    const partyCharacters = party.members
      .map(id => allCharacters.get(id))
      .filter((c): c is Character => c !== undefined)

    const hasGood = partyCharacters.some(c => c.alignment === Alignment.GOOD)
    const hasEvil = partyCharacters.some(c => c.alignment === Alignment.EVIL)

    if (hasGood && character.alignment === Alignment.EVIL) {
      return { allowed: false, reason: 'Good and Evil cannot party together' }
    }

    if (hasEvil && character.alignment === Alignment.GOOD) {
      return { allowed: false, reason: 'Good and Evil cannot party together' }
    }

    return { allowed: true }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- PartyService`
Expected: All 8 new tests PASS

**Step 5: Commit alignment validation**

```bash
git add src/services/PartyService.ts src/services/__tests__/PartyService.spec.ts
git commit -m "feat(tavern): add alignment validation for party formation

- Implement PartyService.canAddCharacterToParty()
- Validate Good vs Evil alignment conflicts
- Check party size limit (6 members)
- Validate character status (OK only)
- Prevent duplicate characters
- 8 tests passing

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 2: Divvy Gold Service

### Task 16.2: Write Divvy Gold Tests

**Files:**
- Test: `src/services/__tests__/PartyService.spec.ts` (modify)

**Step 1: Write failing tests for divvy gold**

Add to PartyService tests:

```typescript
describe('divvyGold', () => {
  it('distributes gold equally among party members', () => {
    const char1 = createTestCharacter({ id: 'char-1', gold: 10 })
    const char2 = createTestCharacter({ id: 'char-2', gold: 20 })
    const char3 = createTestCharacter({ id: 'char-3', gold: 5 })
    const party = createPartyWithMembers([char1.id, char2.id, char3.id])
    party.gold = 99 // Party pool
    const roster = new Map([
      [char1.id, char1],
      [char2.id, char2],
      [char3.id, char3]
    ])

    const result = PartyService.divvyGold(party, roster)

    // 99 / 3 = 33 per member, 0 remainder
    expect(result.updatedRoster.get('char-1')!.gold).toBe(43) // 10 + 33
    expect(result.updatedRoster.get('char-2')!.gold).toBe(53) // 20 + 33
    expect(result.updatedRoster.get('char-3')!.gold).toBe(38) // 5 + 33
    expect(result.updatedParty.gold).toBe(0)
  })

  it('distributes remainder gold to first members', () => {
    const char1 = createTestCharacter({ id: 'char-1', gold: 0 })
    const char2 = createTestCharacter({ id: 'char-2', gold: 0 })
    const char3 = createTestCharacter({ id: 'char-3', gold: 0 })
    const party = createPartyWithMembers([char1.id, char2.id, char3.id])
    party.gold = 100 // Party pool
    const roster = new Map([
      [char1.id, char1],
      [char2.id, char2],
      [char3.id, char3]
    ])

    const result = PartyService.divvyGold(party, roster)

    // 100 / 3 = 33 per member, remainder 1 goes to first member
    expect(result.updatedRoster.get('char-1')!.gold).toBe(34) // 0 + 33 + 1 (remainder)
    expect(result.updatedRoster.get('char-2')!.gold).toBe(33) // 0 + 33
    expect(result.updatedRoster.get('char-3')!.gold).toBe(33) // 0 + 33
    expect(result.updatedParty.gold).toBe(0)
  })

  it('returns error when party has no members', () => {
    const party = createEmptyParty()
    party.gold = 100
    const roster = new Map()

    const result = PartyService.divvyGold(party, roster)

    expect(result.success).toBe(false)
    expect(result.error).toBe('No party members to distribute gold to')
  })

  it('returns error when party has no gold', () => {
    const char1 = createTestCharacter({ id: 'char-1' })
    const party = createPartyWithMembers([char1.id])
    party.gold = 0
    const roster = new Map([[char1.id, char1]])

    const result = PartyService.divvyGold(party, roster)

    expect(result.success).toBe(false)
    expect(result.error).toBe('No gold to distribute')
  })

  it('handles large remainder distribution (5 members, 14 gold)', () => {
    const characters = Array.from({ length: 5 }, (_, i) =>
      createTestCharacter({ id: `char-${i}`, gold: 0 })
    )
    const party = createPartyWithMembers(characters.map(c => c.id))
    party.gold = 14
    const roster = new Map(characters.map(c => [c.id, c]))

    const result = PartyService.divvyGold(party, roster)

    // 14 / 5 = 2 per member, remainder 4 goes to first 4 members
    expect(result.updatedRoster.get('char-0')!.gold).toBe(3) // 0 + 2 + 1
    expect(result.updatedRoster.get('char-1')!.gold).toBe(3) // 0 + 2 + 1
    expect(result.updatedRoster.get('char-2')!.gold).toBe(3) // 0 + 2 + 1
    expect(result.updatedRoster.get('char-3')!.gold).toBe(3) // 0 + 2 + 1
    expect(result.updatedRoster.get('char-4')!.gold).toBe(2) // 0 + 2
    expect(result.updatedParty.gold).toBe(0)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- PartyService`
Expected: 5 new test failures - "divvyGold is not defined"

**Step 3: Implement divvyGold method**

**Files:**
- Modify: `src/services/PartyService.ts`

Add to PartyService class:

```typescript
interface DivvyGoldResult {
  success: boolean
  error?: string
  updatedParty?: Party
  updatedRoster?: Map<string, Character>
}

/**
 * Distribute party's pooled gold equally among all members
 * Remainder distributed to first N members
 */
static divvyGold(
  party: Party,
  roster: Map<string, Character>
): DivvyGoldResult {
  // Validate party has members
  if (party.members.length === 0) {
    return { success: false, error: 'No party members to distribute gold to' }
  }

  // Validate party has gold
  if (!party.gold || party.gold === 0) {
    return { success: false, error: 'No gold to distribute' }
  }

  const totalGold = party.gold
  const partySize = party.members.length
  const sharePerMember = Math.floor(totalGold / partySize)
  const remainder = totalGold % partySize

  // Create new roster with updated gold
  const updatedRoster = new Map(roster)
  party.members.forEach((memberId, index) => {
    const character = updatedRoster.get(memberId)
    if (character) {
      const bonusGold = index < remainder ? 1 : 0
      updatedRoster.set(memberId, {
        ...character,
        gold: (character.gold || 0) + sharePerMember + bonusGold
      })
    }
  })

  // Create new party with zero gold
  const updatedParty: Party = {
    ...party,
    gold: 0
  }

  return {
    success: true,
    updatedParty,
    updatedRoster
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- PartyService`
Expected: All 5 new tests PASS (13 total PartyService tests)

**Step 5: Commit divvy gold service**

```bash
git add src/services/PartyService.ts src/services/__tests__/PartyService.spec.ts
git commit -m "feat(tavern): add gold distribution service

- Implement PartyService.divvyGold()
- Equal distribution with remainder to first members
- Validation for empty party and zero gold
- 5 tests passing (13 total)

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 3: Tavern Component - Add Character Flow

### Task 16.3: Write Add Character Component Tests

**Files:**
- Test: `src/app/tavern/tavern.component.spec.ts` (modify)

**Step 1: Write failing tests for add character**

Add to existing Tavern component tests:

```typescript
describe('handleAddCharacter', () => {
  it('adds character to empty party', () => {
    const character = createTestCharacter({
      id: 'char-1',
      alignment: Alignment.GOOD,
      status: CharacterStatus.OK
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]])
    }))

    component.handleAddCharacter(character.id)

    const party = gameStateService.party()
    expect(party.members).toContain(character.id)
    expect(party.members.length).toBe(1)
  })

  it('shows error when adding to full party', () => {
    const characters = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
    )
    const newChar = createTestCharacter({ id: 'char-7', alignment: Alignment.NEUTRAL })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([
        ...characters.map(c => [c.id, c] as const),
        [newChar.id, newChar]
      ]),
      party: {
        ...state.party,
        members: characters.map(c => c.id)
      }
    }))

    component.handleAddCharacter(newChar.id)

    expect(component.errorMessage()).toBe('Party is full (maximum 6 members)')
    const party = gameStateService.party()
    expect(party.members.length).toBe(6)
  })

  it('shows error when adding Evil character to Good party', () => {
    const goodChar = createTestCharacter({
      id: 'good-1',
      alignment: Alignment.GOOD
    })
    const evilChar = createTestCharacter({
      id: 'evil-1',
      alignment: Alignment.EVIL
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]]),
      party: {
        ...state.party,
        members: [goodChar.id]
      }
    }))

    component.handleAddCharacter(evilChar.id)

    expect(component.errorMessage()).toBe('Good and Evil cannot party together')
    const party = gameStateService.party()
    expect(party.members).not.toContain(evilChar.id)
  })

  it('shows error when adding DEAD character', () => {
    const deadChar = createTestCharacter({
      id: 'dead-1',
      status: CharacterStatus.DEAD
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[deadChar.id, deadChar]])
    }))

    component.handleAddCharacter(deadChar.id)

    expect(component.errorMessage()).toContain('not available')
    const party = gameStateService.party()
    expect(party.members).not.toContain(deadChar.id)
  })

  it('returns to main view after successful add', () => {
    const character = createTestCharacter({
      id: 'char-1',
      status: CharacterStatus.OK
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]])
    }))
    component.currentView.set('add')

    component.handleAddCharacter(character.id)

    expect(component.currentView()).toBe('main')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- tavern.component`
Expected: 5 test failures - assertions fail due to missing validation logic

**Step 3: Update handleAddCharacter with validation**

**Files:**
- Modify: `src/app/tavern/tavern.component.ts`

Update the handleAddCharacter method:

```typescript
handleAddCharacter(charId: string): void {
  const state = this.gameState.state()
  const party = this.currentParty()
  const character = state.roster.get(charId)

  if (!character) {
    this.errorMessage.set('Character not found')
    return
  }

  // Validate using PartyService
  const validation = PartyService.canAddCharacterToParty(party, character, state.roster)

  if (!validation.allowed) {
    this.errorMessage.set(validation.reason || 'Cannot add character')
    return
  }

  // Add character to party (immutable update)
  this.gameState.updateState(state => ({
    ...state,
    party: {
      ...state.party,
      members: [...state.party.members, charId]
    }
  }))

  this.currentView.set('main')
}
```

Add import at top of file:

```typescript
import { PartyService } from '../../services/PartyService'
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- tavern.component`
Expected: All 5 new tests PASS

**Step 5: Commit add character validation**

```bash
git add src/app/tavern/tavern.component.ts src/app/tavern/tavern.component.spec.ts
git commit -m "feat(tavern): add character validation in add flow

- Integrate PartyService.canAddCharacterToParty()
- Validate alignment conflicts, status, party size
- Show error messages for validation failures
- Return to main view after successful add
- 5 tests passing

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 4: Tavern Component - Divvy Gold Flow

### Task 16.4: Write Divvy Gold Component Tests

**Files:**
- Test: `src/app/tavern/tavern.component.spec.ts` (modify)

**Step 1: Write failing tests for divvy gold**

Add to Tavern component tests:

```typescript
describe('handleDivvyGold', () => {
  it('distributes gold equally to all party members', () => {
    const char1 = createTestCharacter({ id: 'char-1', gold: 10 })
    const char2 = createTestCharacter({ id: 'char-2', gold: 20 })
    const char3 = createTestCharacter({ id: 'char-3', gold: 5 })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([
        [char1.id, char1],
        [char2.id, char2],
        [char3.id, char3]
      ]),
      party: {
        ...state.party,
        members: [char1.id, char2.id, char3.id],
        gold: 99
      }
    }))

    component.handleDivvyGold()

    const updatedState = gameStateService.state()
    expect(updatedState.party.gold).toBe(0)
    expect(updatedState.roster.get('char-1')!.gold).toBe(43) // 10 + 33
    expect(updatedState.roster.get('char-2')!.gold).toBe(53) // 20 + 33
    expect(updatedState.roster.get('char-3')!.gold).toBe(38) // 5 + 33
  })

  it('shows success message after divvy', () => {
    const char1 = createTestCharacter({ id: 'char-1', gold: 0 })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[char1.id, char1]]),
      party: {
        ...state.party,
        members: [char1.id],
        gold: 50
      }
    }))

    component.handleDivvyGold()

    expect(component.successMessage()).toBe('Gold distributed: 50 gold per member')
    expect(component.errorMessage()).toBeNull()
  })

  it('shows error when party has no gold', () => {
    const char1 = createTestCharacter({ id: 'char-1' })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[char1.id, char1]]),
      party: {
        ...state.party,
        members: [char1.id],
        gold: 0
      }
    }))

    component.handleDivvyGold()

    expect(component.errorMessage()).toBe('No gold to distribute')
    expect(component.successMessage()).toBeNull()
  })

  it('shows error when party is empty', () => {
    gameStateService.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: [],
        gold: 100
      }
    }))

    component.handleDivvyGold()

    expect(component.errorMessage()).toBe('No party members to distribute gold to')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- tavern.component`
Expected: 4 test failures - "handleDivvyGold is not a function"

**Step 3: Implement handleDivvyGold method**

**Files:**
- Modify: `src/app/tavern/tavern.component.ts`

Add success message signal:

```typescript
readonly successMessage = signal<string | null>(null)
```

Add handleDivvyGold method:

```typescript
handleDivvyGold(): void {
  const state = this.gameState.state()
  const party = this.currentParty()

  // Clear previous messages
  this.errorMessage.set(null)
  this.successMessage.set(null)

  // Divvy gold using PartyService
  const result = PartyService.divvyGold(party, state.roster)

  if (!result.success) {
    this.errorMessage.set(result.error || 'Failed to distribute gold')
    return
  }

  // Update game state with new roster and party
  this.gameState.updateState(state => ({
    ...state,
    roster: result.updatedRoster!,
    party: result.updatedParty!
  }))

  // Calculate share per member for success message
  const sharePerMember = Math.floor(party.gold! / party.members.length)
  this.successMessage.set(`Gold distributed: ${sharePerMember} gold per member`)
}
```

Update menu items to include Divvy Gold:

```typescript
readonly menuItems: MenuItem[] = [
  {
    id: 'add-character',
    label: 'ADD TO PARTY',
    enabled: true,
    shortcut: 'A'
  },
  {
    id: 'remove-character',
    label: 'REMOVE FROM PARTY',
    enabled: true,
    shortcut: 'R'
  },
  {
    id: 'divvy-gold',
    label: 'DIVVY GOLD',
    enabled: true,
    shortcut: 'D'
  },
  {
    id: 'castle',
    label: 'RETURN TO CASTLE',
    enabled: true,
    shortcut: 'C'
  }
]
```

Update handleMenuSelect to handle divvy-gold:

```typescript
handleMenuSelect(itemId: string): void {
  this.errorMessage.set(null)
  this.successMessage.set(null)

  switch (itemId) {
    case 'add-character':
      this.currentView.set('add')
      break

    case 'remove-character':
      this.currentView.set('remove')
      break

    case 'divvy-gold':
      this.handleDivvyGold()
      break

    case 'castle':
      this.router.navigate(['/castle-menu'])
      break
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- tavern.component`
Expected: All 4 new tests PASS

**Step 5: Commit divvy gold feature**

```bash
git add src/app/tavern/tavern.component.ts src/app/tavern/tavern.component.spec.ts
git commit -m "feat(tavern): implement divvy gold functionality

- Add handleDivvyGold() method
- Integrate PartyService.divvyGold()
- Show success message with gold per member
- Show error for empty party or zero gold
- Add 'Divvy Gold' menu item
- 4 tests passing

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 5: Tavern Component - Character Inspection Navigation

### Task 16.5: Write Character Inspection Tests

**Files:**
- Test: `src/app/tavern/tavern.component.spec.ts` (modify)

**Step 1: Write failing tests for character inspection**

Add to Tavern component tests:

```typescript
describe('handleInspectCharacter', () => {
  it('navigates to character inspection for valid party member', () => {
    const character = createTestCharacter({ id: 'char-1' })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]]),
      party: {
        ...state.party,
        members: [character.id]
      }
    }))
    const navigateSpy = jest.spyOn(component['router'], 'navigate')

    component.handleInspectCharacter(character.id)

    expect(navigateSpy).toHaveBeenCalledWith(['/character-inspection'], {
      queryParams: { characterId: character.id, returnTo: 'tavern' }
    })
  })

  it('shows error when character not in party', () => {
    component.handleInspectCharacter('non-existent-id')

    expect(component.errorMessage()).toBe('Character not found in party')
    expect(component['router'].navigate).not.toHaveBeenCalled()
  })

  it('shows error when party is empty', () => {
    gameStateService.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: []
      }
    }))

    component.handleInspectCharacter('char-1')

    expect(component.errorMessage()).toBe('Character not found in party')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- tavern.component`
Expected: 3 test failures - "handleInspectCharacter is not a function"

**Step 3: Implement handleInspectCharacter method**

**Files:**
- Modify: `src/app/tavern/tavern.component.ts`

Add handleInspectCharacter method:

```typescript
handleInspectCharacter(charId: string): void {
  const party = this.currentParty()

  // Validate character is in party
  if (!party.members.includes(charId)) {
    this.errorMessage.set('Character not found in party')
    return
  }

  // Navigate to character inspection with return context
  this.router.navigate(['/character-inspection'], {
    queryParams: {
      characterId: charId,
      returnTo: 'tavern'
    }
  })
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- tavern.component`
Expected: All 3 new tests PASS

**Step 5: Commit character inspection navigation**

```bash
git add src/app/tavern/tavern.component.ts src/app/tavern/tavern.component.spec.ts
git commit -m "feat(tavern): add character inspection navigation

- Implement handleInspectCharacter()
- Navigate to /character-inspection with query params
- Pass returnTo context for proper back navigation
- Validate character is in party
- 3 tests passing

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 6: Tavern Component - HTML Template

### Task 16.6: Update Tavern Template

**Files:**
- Modify: `src/app/tavern/tavern.component.html`

**Step 1: Update template with all views**

Replace the entire template:

```html
<div class="tavern">
  <header>
    <h1>GILGAMESH'S TAVERN</h1>
    @if (currentParty().gold !== undefined) {
      <div class="party-gold">PARTY GOLD: {{ currentParty().gold }}</div>
    }
  </header>

  <main>
    @if (currentView() === 'main') {
      <!-- Main Menu View -->
      <div class="main-view">
        <!-- Party Roster -->
        <section class="party-roster">
          <h2>CURRENT PARTY ({{ partyCharacters().length }}/6)</h2>
          @if (partyCharacters().length === 0) {
            <p class="empty-message">No party members</p>
          } @else {
            <ul class="character-list">
              @for (character of partyCharacters(); track character.id; let i = $index) {
                <li class="character-item" (click)="handleInspectCharacter(character.id)">
                  <span class="position">{{ i + 1 }}.</span>
                  <span class="name">{{ character.name }}</span>
                  <span class="class">{{ character.class }}</span>
                  <span class="level">Lv {{ character.level }}</span>
                  <span class="status" [class.dead]="character.status !== 'OK'">
                    {{ character.status }}
                  </span>
                </li>
              }
            </ul>
          }
        </section>

        <!-- Available Characters -->
        <section class="available-characters">
          <h2>AVAILABLE CHARACTERS ({{ availableCharacters().length }})</h2>
          @if (availableCharacters().length === 0) {
            <p class="empty-message">No characters available</p>
          } @else {
            <ul class="character-list">
              @for (character of availableCharacters(); track character.id) {
                <li class="character-item">
                  <span class="name">{{ character.name }}</span>
                  <span class="class">{{ character.class }}</span>
                  <span class="level">Lv {{ character.level }}</span>
                  <span class="alignment">{{ character.alignment }}</span>
                  <span class="status" [class.dead]="character.status !== 'OK'">
                    {{ character.status }}
                  </span>
                </li>
              }
            </ul>
          }
        </section>

        <!-- Messages -->
        @if (errorMessage()) {
          <div class="error-message">{{ errorMessage() }}</div>
        }
        @if (successMessage()) {
          <div class="success-message">{{ successMessage() }}</div>
        }

        <!-- Menu -->
        <app-menu
          [items]="menuItems"
          (select)="handleMenuSelect($event)"
        />
      </div>
    }

    @if (currentView() === 'add') {
      <!-- Add Character View -->
      <div class="add-view">
        <h2>SELECT CHARACTER TO ADD</h2>
        @if (availableCharacters().length === 0) {
          <p class="empty-message">No characters available to add</p>
        } @else {
          <app-character-list
            [characters]="availableCharacters()"
            [selectable]="true"
            (select)="handleAddCharacter($event)"
          />
        }

        @if (errorMessage()) {
          <div class="error-message">{{ errorMessage() }}</div>
        }

        <button class="cancel-btn" (click)="cancelView()">
          CANCEL
        </button>
      </div>
    }

    @if (currentView() === 'remove') {
      <!-- Remove Character View -->
      <div class="remove-view">
        <h2>SELECT CHARACTER TO REMOVE</h2>
        @if (partyCharacters().length === 0) {
          <p class="empty-message">Party is empty</p>
        } @else {
          <app-character-list
            [characters]="partyCharacters()"
            [selectable]="true"
            (select)="handleRemoveCharacter($event)"
          />
        }

        <button class="cancel-btn" (click)="cancelView()">
          CANCEL
        </button>
      </div>
    }
  </main>
</div>
```

**Step 2: Test template rendering**

No new automated tests needed - visual verification during manual testing.

**Step 3: Commit template update**

```bash
git add src/app/tavern/tavern.component.html
git commit -m "feat(tavern): update template with party roster and views

- Show current party roster with inspect on click
- Show available characters list
- Add/remove character selection views
- Display party gold
- Show error and success messages
- Character list with class, level, status display

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 7: Tavern Component - SCSS Styling

### Task 16.7: Add Tavern Styles

**Files:**
- Modify: `src/app/tavern/tavern.component.scss`

**Step 1: Add comprehensive styles**

Replace the existing styles:

```scss
@use '../../styles/variables' as *;

.tavern {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0 0 $spacing-sm 0;
      text-align: center;
    }

    .party-gold {
      font-size: 14px;
      color: $color-amber;
      text-align: center;
      font-weight: bold;
    }
  }

  main {
    flex: 1;
  }
}

.main-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
  max-width: 800px;
  margin: 0 auto;
}

.party-roster,
.available-characters {
  h2 {
    font-size: 16px;
    color: $color-text-green;
    margin-bottom: $spacing-md;
    text-transform: uppercase;
  }
}

.character-list {
  list-style: none;
  padding: 0;
  margin: 0;

  .character-item {
    display: flex;
    gap: $spacing-md;
    padding: $spacing-sm;
    border: 1px solid $color-text-dim;
    margin-bottom: $spacing-xs;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: $color-text-green;
      background-color: rgba($color-text-green, 0.1);
    }

    .position {
      color: $color-text-dim;
      width: 20px;
    }

    .name {
      color: $color-text-bright;
      flex: 1;
      font-weight: bold;
    }

    .class,
    .level,
    .alignment {
      color: $color-text-dim;
      min-width: 80px;
    }

    .status {
      color: $color-text-green;
      min-width: 80px;

      &.dead {
        color: $color-red;
      }
    }
  }
}

.empty-message {
  color: $color-text-dim;
  font-style: italic;
  text-align: center;
  padding: $spacing-lg;
}

.error-message {
  color: $color-red;
  background-color: rgba($color-red, 0.1);
  border: 1px solid $color-red;
  padding: $spacing-sm $spacing-md;
  margin: $spacing-md 0;
  text-align: center;
}

.success-message {
  color: $color-text-green;
  background-color: rgba($color-text-green, 0.1);
  border: 1px solid $color-text-green;
  padding: $spacing-sm $spacing-md;
  margin: $spacing-md 0;
  text-align: center;
}

.add-view,
.remove-view {
  max-width: 600px;
  margin: 0 auto;

  h2 {
    font-size: 18px;
    color: $color-text-bright;
    margin-bottom: $spacing-lg;
    text-align: center;
  }

  .cancel-btn {
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-dim;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
    display: block;
    margin: $spacing-lg auto 0;

    &:hover {
      border-color: $color-text-green;
      color: $color-text-green;
    }
  }
}
```

**Step 2: Commit styles**

```bash
git add src/app/tavern/tavern.component.scss
git commit -m "style(tavern): add comprehensive tavern styles

- Party roster styling with hover effects
- Available characters list styling
- Error and success message displays
- Add/remove view layouts
- Responsive spacing and colors
- Character status color coding

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Part 8: Integration Tests

### Task 16.8: Write Tavern Integration Tests

**Files:**
- Create: `src/app/__tests__/integration/tavern.integration.spec.ts`

**Step 1: Write integration tests**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TavernComponent } from '../../tavern/tavern.component'
import { GameStateService } from '../../../services/GameStateService'
import { createTestCharacter } from '../../../test-helpers/test-factories'
import { Alignment } from '../../../types/Alignment'
import { CharacterStatus } from '../../../types/CharacterStatus'

describe('Tavern Integration Tests', () => {
  let component: TavernComponent
  let fixture: ComponentFixture<TavernComponent>
  let gameStateService: GameStateService
  let router: Router

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(TavernComponent)
    component = fixture.componentInstance
    gameStateService = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)
    fixture.detectChanges()
  })

  describe('Full Party Formation Flow', () => {
    it('forms a full party of 6 members', () => {
      // Create 6 characters with compatible alignments
      const characters = [
        createTestCharacter({ id: 'char-1', name: 'Fighter1', alignment: Alignment.GOOD }),
        createTestCharacter({ id: 'char-2', name: 'Mage1', alignment: Alignment.GOOD }),
        createTestCharacter({ id: 'char-3', name: 'Priest1', alignment: Alignment.NEUTRAL }),
        createTestCharacter({ id: 'char-4', name: 'Thief1', alignment: Alignment.NEUTRAL }),
        createTestCharacter({ id: 'char-5', name: 'Fighter2', alignment: Alignment.GOOD }),
        createTestCharacter({ id: 'char-6', name: 'Mage2', alignment: Alignment.NEUTRAL })
      ]

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c]))
      }))

      // Add all characters
      characters.forEach(char => {
        component.handleAddCharacter(char.id)
      })

      // Verify all added
      const party = gameStateService.party()
      expect(party.members.length).toBe(6)
      expect(component.errorMessage()).toBeNull()
    })

    it('prevents adding 7th character to full party', () => {
      // Setup full party
      const characters = Array.from({ length: 7 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      )
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: characters.slice(0, 6).map(c => c.id)
        }
      }))

      // Attempt to add 7th
      component.handleAddCharacter('char-6')

      expect(component.errorMessage()).toBe('Party is full (maximum 6 members)')
      expect(gameStateService.party().members.length).toBe(6)
    })
  })

  describe('Alignment Conflict Prevention', () => {
    it('prevents mixing Good and Evil alignments', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      })
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]])
      }))

      // Add Good character
      component.handleAddCharacter(goodChar.id)
      expect(gameStateService.party().members).toContain(goodChar.id)

      // Attempt to add Evil character
      component.handleAddCharacter(evilChar.id)
      expect(component.errorMessage()).toBe('Good and Evil cannot party together')
      expect(gameStateService.party().members).not.toContain(evilChar.id)
    })

    it('allows mixing Good and Neutral alignments', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      })
      const neutralChar = createTestCharacter({
        id: 'neutral-1',
        alignment: Alignment.NEUTRAL
      })
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[goodChar.id, goodChar], [neutralChar.id, neutralChar]])
      }))

      component.handleAddCharacter(goodChar.id)
      component.handleAddCharacter(neutralChar.id)

      const party = gameStateService.party()
      expect(party.members).toContain(goodChar.id)
      expect(party.members).toContain(neutralChar.id)
      expect(component.errorMessage()).toBeNull()
    })
  })

  describe('Gold Distribution Flow', () => {
    it('distributes gold equally with remainder', () => {
      const characters = [
        createTestCharacter({ id: 'char-1', gold: 10 }),
        createTestCharacter({ id: 'char-2', gold: 20 }),
        createTestCharacter({ id: 'char-3', gold: 5 })
      ]
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: characters.map(c => c.id),
          gold: 100
        }
      }))

      component.handleDivvyGold()

      const updatedState = gameStateService.state()
      expect(updatedState.party.gold).toBe(0)
      // 100 / 3 = 33 per member, remainder 1 to first
      expect(updatedState.roster.get('char-1')!.gold).toBe(44) // 10 + 33 + 1
      expect(updatedState.roster.get('char-2')!.gold).toBe(53) // 20 + 33
      expect(updatedState.roster.get('char-3')!.gold).toBe(38) // 5 + 33
      expect(component.successMessage()).toBe('Gold distributed: 33 gold per member')
    })
  })

  describe('Character Inspection Navigation', () => {
    it('navigates to character inspection with correct params', () => {
      const character = createTestCharacter({ id: 'char-1' })
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]]),
        party: {
          ...state.party,
          members: [character.id]
        }
      }))
      const navigateSpy = jest.spyOn(router, 'navigate')

      component.handleInspectCharacter(character.id)

      expect(navigateSpy).toHaveBeenCalledWith(['/character-inspection'], {
        queryParams: {
          characterId: character.id,
          returnTo: 'tavern'
        }
      })
    })
  })

  describe('Status Filtering', () => {
    it('only shows OK characters as available', () => {
      const okChar = createTestCharacter({
        id: 'ok-1',
        status: CharacterStatus.OK
      })
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      })
      const ashesChar = createTestCharacter({
        id: 'ashes-1',
        status: CharacterStatus.ASHES
      })
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [okChar.id, okChar],
          [deadChar.id, deadChar],
          [ashesChar.id, ashesChar]
        ])
      }))

      const available = component.availableCharacters()

      expect(available.length).toBe(1)
      expect(available[0].id).toBe(okChar.id)
    })

    it('prevents adding DEAD character', () => {
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      })
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[deadChar.id, deadChar]])
      }))

      component.handleAddCharacter(deadChar.id)

      expect(component.errorMessage()).toContain('not available')
      expect(gameStateService.party().members).not.toContain(deadChar.id)
    })
  })
})
```

**Step 2: Run integration tests**

Run: `npm test -- tavern.integration`
Expected: All 8 integration tests PASS

**Step 3: Commit integration tests**

```bash
git add src/app/__tests__/integration/tavern.integration.spec.ts
git commit -m "test(tavern): add comprehensive integration tests

- Full party formation flow (6 members)
- Alignment conflict prevention (Good vs Evil)
- Gold distribution with remainder
- Character inspection navigation
- Status filtering (DEAD characters excluded)
- 8 integration tests passing

Ref: docs/ui/scenes/03-gilgameshs-tavern.md"
```

---

## Summary

### Total Tests Added
- **PartyService**: 13 tests (8 alignment + 5 divvy gold)
- **TavernComponent**: 12 tests (5 add + 4 divvy + 3 inspect)
- **Integration**: 8 tests
- **Total**: ~33 new tests

### Files Created/Modified
- ✅ `src/services/PartyService.ts` (created)
- ✅ `src/services/__tests__/PartyService.spec.ts` (created)
- ✅ `src/app/tavern/tavern.component.ts` (modified)
- ✅ `src/app/tavern/tavern.component.spec.ts` (modified)
- ✅ `src/app/tavern/tavern.component.html` (modified)
- ✅ `src/app/tavern/tavern.component.scss` (modified)
- ✅ `src/app/__tests__/integration/tavern.integration.spec.ts` (created)

### Features Implemented
1. ✅ Alignment validation (Good vs Evil conflicts)
2. ✅ Party size limit (max 6 members)
3. ✅ Character status validation (OK only)
4. ✅ Gold distribution (equal shares with remainder)
5. ✅ Character inspection navigation
6. ✅ Add/remove character flows
7. ✅ Error and success messaging
8. ✅ Comprehensive integration tests

### Next Steps
Proceed to Task 17 (Inn) implementation.

import { RegenerationService } from '../RegenerationService'
import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'

// Helper to create test character
const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'test-char-1',
  name: 'Test Hero',
  race: 'HUMAN',
  class: 'FIGHTER',
  alignment: 'GOOD',
  strength: 15,
  intelligence: 10,
  piety: 10,
  vitality: 14,
  agility: 12,
  luck: 10,
  level: 5,
  experience: 1000,
  age: 20,
  hp: 30,
  maxHp: 50,
  ac: 5,
  status: 'OK',
  vim: { current: 100, max: 100 },
  knownSpells: [],
  inventory: [],
  gold: 100,
  createdAt: Date.now(),
  lastModified: Date.now(),
  ...overrides
})

// Helper to create test item with regeneration
const createRegenItem = (id: string, name: string, regen: number, overrides: Partial<Item> = {}): Item => ({
  id,
  name,
  type: ItemType.ACCESSORY,
  slot: ItemSlot.NONE,
  price: 1000,
  cursed: regen < 0,
  identified: true,
  equipped: true,
  special: { regeneration: regen },
  ...overrides
})

describe('RegenerationService', () => {
  describe('getRegenerationRate', () => {
    it('returns 0 for character with no regeneration items', () => {
      const character = createTestCharacter()
      expect(RegenerationService.getRegenerationRate(character)).toBe(0)
    })

    it('returns regeneration from equipped weapon', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({ equippedWeapon: ringOfHealing })

      expect(RegenerationService.getRegenerationRate(character)).toBe(1)
    })

    it('returns regeneration from equipped armor', () => {
      const lordsGarb = createRegenItem('lords_garb', 'Lords Garb', 1, {
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR
      })
      const character = createTestCharacter({ equippedArmor: lordsGarb })

      expect(RegenerationService.getRegenerationRate(character)).toBe(1)
    })

    it('uses MAX of multiple regen items (authentic Wizardry 1 - no stacking)', () => {
      // Per §3.9: Only the HIGHEST value takes effect (they do NOT stack)
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const werdnaAmulet = createRegenItem('werdna_amulet', "Werdna's Amulet", 5, {
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR
      })
      const character = createTestCharacter({
        equippedWeapon: ringOfHealing,
        equippedArmor: werdnaAmulet
      })

      // MAX(1, 5) = 5, not 1+5=6
      expect(RegenerationService.getRegenerationRate(character)).toBe(5)
    })

    it('negative regeneration never works (authentic Wizardry 1 bug)', () => {
      // Per §3.9 BUG: Deadly Ring's -3 never takes effect because MAX(0, -3) = 0
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({ equippedWeapon: deadlyRing })

      // Original bug: maxHeal starts at 0, MAX(0, -3) = 0
      expect(RegenerationService.getRegenerationRate(character)).toBe(0)
    })

    it('positive regeneration overrides negative (authentic Wizardry 1)', () => {
      // Per §3.9: MAX is used, so positive always wins
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR
      })
      const character = createTestCharacter({
        equippedWeapon: ringOfHealing,
        equippedArmor: deadlyRing
      })

      // Positive items present: use MAX of positives = 1
      // Negative is ignored when positive exists
      expect(RegenerationService.getRegenerationRate(character)).toBe(1)
    })

    it('includes equipped accessories from inventory', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1)
      ringOfHealing.equipped = true

      const character = createTestCharacter({
        inventory: [ringOfHealing]
      })

      expect(RegenerationService.getRegenerationRate(character)).toBe(1)
    })

    it('ignores unequipped items in inventory', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1)
      ringOfHealing.equipped = false

      const character = createTestCharacter({
        inventory: [ringOfHealing]
      })

      expect(RegenerationService.getRegenerationRate(character)).toBe(0)
    })
  })

  describe('applyRegeneration', () => {
    it('heals character with positive regeneration', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 30,
        maxHp: 50,
        equippedWeapon: ringOfHealing
      })

      const result = RegenerationService.applyRegeneration(character)

      expect(result.previousHp).toBe(30)
      expect(result.newHp).toBe(31)
      expect(result.totalRegeneration).toBe(1)
      expect(result.characterDied).toBe(false)
    })

    it('does not exceed max HP', () => {
      const werdnaAmulet = createRegenItem('werdna_amulet', "Werdna's Amulet", 5, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 48,
        maxHp: 50,
        equippedWeapon: werdnaAmulet
      })

      const result = RegenerationService.applyRegeneration(character)

      expect(result.newHp).toBe(50)
    })

    it('negative regeneration has no effect (authentic Wizardry 1 bug)', () => {
      // Per §3.9 BUG: Deadly Ring's -3 never works because MAX(0, -3) = 0
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 30,
        maxHp: 50,
        equippedWeapon: deadlyRing
      })

      const result = RegenerationService.applyRegeneration(character)

      // Negative regen doesn't work - HP unchanged
      expect(result.previousHp).toBe(30)
      expect(result.newHp).toBe(30)
      expect(result.totalRegeneration).toBe(0)
      expect(result.characterDied).toBe(false)
    })

    it('Deadly Ring cannot kill (authentic Wizardry 1 bug)', () => {
      // Per §3.9 BUG: Deadly Ring's negative regen never takes effect
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 2,
        maxHp: 50,
        equippedWeapon: deadlyRing
      })

      const result = RegenerationService.applyRegeneration(character)

      // Negative regen doesn't work - character survives
      expect(result.newHp).toBe(2)
      expect(result.characterDied).toBe(false)
    })

    it('returns no change when no regeneration', () => {
      const character = createTestCharacter({ hp: 30, maxHp: 50 })

      const result = RegenerationService.applyRegeneration(character)

      expect(result.previousHp).toBe(30)
      expect(result.newHp).toBe(30)
      expect(result.totalRegeneration).toBe(0)
    })

    it('tracks all regeneration sources even though only MAX is used', () => {
      // Sources are tracked for display purposes, but only MAX value is applied
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const lordsGarb = createRegenItem('lords_garb', 'Lords Garb', 1, {
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR
      })
      const character = createTestCharacter({
        equippedWeapon: ringOfHealing,
        equippedArmor: lordsGarb
      })

      const result = RegenerationService.applyRegeneration(character)

      // Sources tracked for display
      expect(result.regenSources).toHaveLength(2)
      expect(result.regenSources).toContainEqual({
        itemId: 'ring_healing',
        itemName: 'Ring of Healing',
        amount: 1
      })
      expect(result.regenSources).toContainEqual({
        itemId: 'lords_garb',
        itemName: 'Lords Garb',
        amount: 1
      })
      // But totalRegeneration is MAX, not SUM
      expect(result.totalRegeneration).toBe(1)
    })
  })

  describe('applyMultipleRegeneration', () => {
    it('applies multiple ticks of healing', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 30,
        maxHp: 50,
        equippedWeapon: ringOfHealing
      })

      const result = RegenerationService.applyMultipleRegeneration(character, 5)

      expect(result.hp).toBe(35)
    })

    it('stops at max HP', () => {
      const werdnaAmulet = createRegenItem('werdna_amulet', "Werdna's Amulet", 5, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 40,
        maxHp: 50,
        equippedWeapon: werdnaAmulet
      })

      const result = RegenerationService.applyMultipleRegeneration(character, 10)

      expect(result.hp).toBe(50)
    })

    it('negative regen items have no effect over multiple ticks (authentic bug)', () => {
      // Per §3.9 BUG: Deadly Ring's negative regen never works
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({
        hp: 5,
        maxHp: 50,
        equippedWeapon: deadlyRing
      })

      const result = RegenerationService.applyMultipleRegeneration(character, 10)

      // Negative regen doesn't work - HP unchanged
      expect(result.hp).toBe(5)
    })
  })

  describe('hasRegeneration', () => {
    it('returns true for character with positive regen', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({ equippedWeapon: ringOfHealing })

      expect(RegenerationService.hasRegeneration(character)).toBe(true)
    })

    it('returns false for character with only negative regen (authentic bug)', () => {
      // Per §3.9 BUG: Negative regen items return 0, so hasRegeneration is false
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({ equippedWeapon: deadlyRing })

      // getRegenerationRate returns 0 for negative-only items
      expect(RegenerationService.hasRegeneration(character)).toBe(false)
    })

    it('returns false for character with no regen items', () => {
      const character = createTestCharacter()
      expect(RegenerationService.hasRegeneration(character)).toBe(false)
    })
  })

  describe('hasNegativeRegeneration', () => {
    it('returns false for cursed items (authentic bug - negative regen is 0)', () => {
      // Per §3.9 BUG: Negative regen returns 0, so hasNegativeRegeneration is false
      const deadlyRing = createRegenItem('deadly_ring', 'Deadly Ring', -3, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({ equippedWeapon: deadlyRing })

      // getRegenerationRate returns 0 for negative items, so < 0 is false
      expect(RegenerationService.hasNegativeRegeneration(character)).toBe(false)
    })

    it('returns false for positive regen', () => {
      const ringOfHealing = createRegenItem('ring_healing', 'Ring of Healing', 1, {
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON
      })
      const character = createTestCharacter({ equippedWeapon: ringOfHealing })

      expect(RegenerationService.hasNegativeRegeneration(character)).toBe(false)
    })
  })

  describe('formatRegeneration', () => {
    it('formats positive regeneration', () => {
      expect(RegenerationService.formatRegeneration(1)).toBe('+1 HP/round')
      expect(RegenerationService.formatRegeneration(5)).toBe('+5 HP/round')
    })

    it('formats negative regeneration', () => {
      expect(RegenerationService.formatRegeneration(-3)).toBe('-3 HP/round (cursed!)')
    })

    it('formats zero regeneration', () => {
      expect(RegenerationService.formatRegeneration(0)).toBe('None')
    })
  })
})

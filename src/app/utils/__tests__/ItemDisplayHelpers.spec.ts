import {
  getItemDisplayName,
  getItemTypeDescription,
  getItemStatsDisplay,
  canUseItem,
  getSpecialAbilityDescription
} from '../ItemDisplayHelpers'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'

// Helper to create test item
const createTestItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'test-item',
  name: 'Long Sword +2',
  unidentifiedName: 'SWORD',
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 500,
  damage: 10,
  cursed: false,
  identified: true,
  equipped: false,
  ...overrides
})

describe('ItemDisplayHelpers', () => {
  describe('getItemDisplayName', () => {
    it('returns real name for identified items', () => {
      const item = createTestItem({ identified: true })
      expect(getItemDisplayName(item)).toBe('Long Sword +2')
    })

    it('returns unknownName for unidentified items', () => {
      const item = createTestItem({
        identified: false,
        unidentifiedName: 'SWORD'
      })
      expect(getItemDisplayName(item)).toBe('SWORD')
    })

    it('returns generic fallback when no unknownName', () => {
      const item = createTestItem({
        identified: false,
        unidentifiedName: undefined
      })
      expect(getItemDisplayName(item)).toBe('???Unknown Item???')
    })

    it('shows "ARMOR" for unidentified armor', () => {
      const item = createTestItem({
        name: 'Plate Mail +3',
        unidentifiedName: 'ARMOR',
        identified: false
      })
      expect(getItemDisplayName(item)).toBe('ARMOR')
    })

    it('shows "RING" for unidentified rings', () => {
      const item = createTestItem({
        name: 'Ring of Healing',
        unidentifiedName: 'RING',
        identified: false
      })
      expect(getItemDisplayName(item)).toBe('RING')
    })
  })

  describe('getItemTypeDescription', () => {
    it('shows type and Identified for known items', () => {
      const item = createTestItem({ type: ItemType.WEAPON, identified: true })
      expect(getItemTypeDescription(item)).toContain('Identified')
    })

    it('shows type and Unknown for unidentified items', () => {
      const item = createTestItem({ type: ItemType.ARMOR, identified: false })
      expect(getItemTypeDescription(item)).toContain('Unknown')
    })
  })

  describe('getItemStatsDisplay', () => {
    it('shows damage for weapons', () => {
      const item = createTestItem({ damage: 15, identified: true })
      expect(getItemStatsDisplay(item)).toContain('DMG: 15')
    })

    it('shows AC for armor', () => {
      const item = createTestItem({
        damage: undefined,
        defense: 5,
        identified: true
      })
      expect(getItemStatsDisplay(item)).toContain('AC: -5')
    })

    it('shows multiple attacks for weapons with swings', () => {
      const item = createTestItem({ swings: 3, identified: true })
      expect(getItemStatsDisplay(item)).toContain('3x attacks')
    })

    it('shows CURSED for cursed items', () => {
      const item = createTestItem({ cursed: true, identified: true })
      expect(getItemStatsDisplay(item)).toContain('CURSED')
    })

    it('returns (Unidentified) for unknown items', () => {
      const item = createTestItem({ identified: false })
      expect(getItemStatsDisplay(item)).toBe('(Unidentified)')
    })
  })

  describe('canUseItem', () => {
    it('returns true for identified items', () => {
      const item = createTestItem({ identified: true })
      expect(canUseItem(item)).toBe(true)
    })

    it('returns false for unidentified items', () => {
      const item = createTestItem({ identified: false })
      expect(canUseItem(item)).toBe(false)
    })
  })

  describe('getSpecialAbilityDescription', () => {
    it('returns null for unidentified items', () => {
      const item = createTestItem({
        identified: false,
        special: { invoke: 'cast_spell', spellId: 'halito' }
      })
      expect(getSpecialAbilityDescription(item)).toBeNull()
    })

    it('returns null for items without special', () => {
      const item = createTestItem({ special: null })
      expect(getSpecialAbilityDescription(item)).toBeNull()
    })

    it('describes spell casting', () => {
      const item = createTestItem({
        special: { invoke: 'cast_spell', spellId: 'mahalito' }
      })
      expect(getSpecialAbilityDescription(item)).toBe('Casts MAHALITO')
    })

    it('describes positive regeneration', () => {
      const item = createTestItem({
        special: { regeneration: 2 }
      })
      expect(getSpecialAbilityDescription(item)).toBe('Regenerates 2 HP/round')
    })

    it('describes negative regeneration (drain)', () => {
      const item = createTestItem({
        special: { regeneration: -3 }
      })
      expect(getSpecialAbilityDescription(item)).toBe('Drains 3 HP/round')
    })

    it('describes protections', () => {
      const item = createTestItem({
        special: { protections: ['fire', 'cold'] }
      })
      expect(getSpecialAbilityDescription(item)).toBe('Protection vs fire, cold')
    })
  })
})

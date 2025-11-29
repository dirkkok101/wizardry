/**
 * ChestService Tests
 *
 * Tests for chest generation, treasure distribution, and inventory management.
 */

import { ChestService } from '../ChestService'
import { RandomService } from '../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { TrapType } from '@models/Trap'
import { RewardTier, TRAP_PROBABILITY_BY_TIER, GOLD_RANGE_BY_TIER, MAX_INVENTORY_SIZE } from '@models/Chest'
import { Position } from '@models/Dungeon'
import { CharacterStatus } from '@models/CharacterStatus'

// Helper to create test position
function createTestPosition(): Position {
  return { x: 5, y: 5, facing: 'NORTH' }
}

describe('ChestService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('generateChest', () => {
    it('should generate a chest with correct properties', () => {
      RandomService.setSeed(12345)

      const chest = ChestService.generateChest(3, 5, createTestPosition(), 'combat_victory')

      expect(chest.id).toContain('chest_')
      expect(chest.rewardTier).toBe(3)
      expect(chest.mazeLevel).toBe(5)
      expect(chest.source).toBe('combat_victory')
      expect(chest.trapIdentified).toBe(false)
      expect(chest.trapDisarmed).toBe(false)
      expect(chest.contents.gold).toBeGreaterThan(0)
    })

    it('should respect trap probability by tier', () => {
      const position = createTestPosition()

      // Test tier 1 (50% trap chance)
      RandomService.queueNextValues([0.6])  // > 50% = no trap
      const tier1NoTrap = ChestService.generateChest(1, 1, position, 'combat_victory')
      expect(tier1NoTrap.trapped).toBe(false)

      RandomService.queueNextValues([0.4])  // < 50% = trapped
      const tier1Trapped = ChestService.generateChest(1, 1, position, 'combat_victory')
      expect(tier1Trapped.trapped).toBe(true)

      // Test tier 5 (90% trap chance)
      RandomService.queueNextValues([0.95])  // > 90% = no trap
      const tier5NoTrap = ChestService.generateChest(5, 10, position, 'combat_victory')
      expect(tier5NoTrap.trapped).toBe(false)

      RandomService.queueNextValues([0.85])  // < 90% = trapped
      const tier5Trapped = ChestService.generateChest(5, 10, position, 'combat_victory')
      expect(tier5Trapped.trapped).toBe(true)
    })

    it('should generate gold within tier range', () => {
      RandomService.setSeed(12345)
      const position = createTestPosition()

      const tier1Chest = ChestService.generateChest(1, 1, position, 'combat_victory')
      const tier1Range = GOLD_RANGE_BY_TIER[1]
      expect(tier1Chest.contents.gold).toBeGreaterThanOrEqual(tier1Range.min)
      expect(tier1Chest.contents.gold).toBeLessThanOrEqual(tier1Range.max)

      const tier5Chest = ChestService.generateChest(5, 10, position, 'boss')
      const tier5Range = GOLD_RANGE_BY_TIER[5]
      expect(tier5Chest.contents.gold).toBeGreaterThanOrEqual(tier5Range.min)
      expect(tier5Chest.contents.gold).toBeLessThanOrEqual(tier5Range.max)
    })
  })

  describe('generateCombatChest', () => {
    it('should map monster level to reward tier', () => {
      const position = createTestPosition()

      // Monster level 1-3 → tier 1
      RandomService.setSeed(100)
      const lowTier = ChestService.generateCombatChest(2, 1, position)
      expect(lowTier.rewardTier).toBe(1)

      // Monster level 10+ → tier 4-5
      RandomService.setSeed(100)
      const highTier = ChestService.generateCombatChest(12, 10, position)
      expect(highTier.rewardTier).toBeGreaterThanOrEqual(4)
    })

    it('should set source as combat_victory', () => {
      RandomService.setSeed(100)
      const chest = ChestService.generateCombatChest(5, 3, createTestPosition())
      expect(chest.source).toBe('combat_victory')
    })
  })

  describe('generateBossChest', () => {
    it('should always be trapped', () => {
      // Even if random would say no trap, boss chests force trapped
      RandomService.queueNextValues([0.99])  // Would normally be > 90% = no trap
      const chest = ChestService.generateBossChest(10, createTestPosition())
      expect(chest.trapped).toBe(true)
      expect(chest.trapType).not.toBeNull()
    })

    it('should set source as boss', () => {
      RandomService.setSeed(100)
      const chest = ChestService.generateBossChest(10, createTestPosition())
      expect(chest.source).toBe('boss')
    })

    it('should be tier 5', () => {
      RandomService.setSeed(100)
      const chest = ChestService.generateBossChest(10, createTestPosition())
      expect(chest.rewardTier).toBe(5)
    })
  })

  describe('checkInventorySpace', () => {
    it('should return null when opener has enough space', () => {
      const opener = createTestCharacter({ inventory: [] })
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'item1', name: 'Sword' } as any] },
        null,
        1,
        createTestPosition()
      )

      const warning = ChestService.checkInventorySpace(opener, chest)
      expect(warning).toBeNull()
    })

    it('should return warning when inventory is full', () => {
      const fullInventory = Array(8).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const opener = createTestCharacter({ inventory: fullInventory as any })
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'new1', name: 'New Item' } as any] },
        null,
        1,
        createTestPosition()
      )

      const warning = ChestService.checkInventorySpace(opener, chest)

      expect(warning).not.toBeNull()
      expect(warning!.freeSlots).toBe(0)
      expect(warning!.itemsAtRisk).toBe(1)
      expect(warning!.warning).toContain('LOST FOREVER')
    })

    it('should calculate partial risk correctly', () => {
      const inventory = Array(6).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const opener = createTestCharacter({ inventory: inventory as any })
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [{ id: 'new1', name: 'Item 1' }, { id: 'new2', name: 'Item 2' }, { id: 'new3', name: 'Item 3' }] as any },
        null,
        1,
        createTestPosition()
      )

      const warning = ChestService.checkInventorySpace(opener, chest)

      expect(warning).not.toBeNull()
      expect(warning!.freeSlots).toBe(2)
      expect(warning!.itemCount).toBe(3)
      expect(warning!.itemsAtRisk).toBe(1)  // 3 items - 2 slots = 1 at risk
    })
  })

  describe('distributeTreasure', () => {
    it('should add gold to result', () => {
      const member = createTestCharacter({ inventory: [] })
      const chest = ChestService.createChestWithContents(
        { gold: 500, items: [] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.goldAdded).toBe(500)
    })

    it('should select random living party member as recipient', () => {
      const member1 = createTestCharacter({ id: 'char1', name: 'Fighter', inventory: [] })
      const member2 = createTestCharacter({ id: 'char2', name: 'Thief', inventory: [] })
      const member3 = createTestCharacter({ id: 'char3', name: 'Mage', inventory: [] })
      const item = { id: 'sword', name: 'Sword +1' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      // Queue random to select member2 (index 1 out of 3)
      // pickRandom uses Math.floor(nextRandom() * length), so 0.5 * 3 = 1.5 → floor → 1
      RandomService.queueNextValues([0.5])

      const result = ChestService.distributeTreasure(chest, [member1, member2, member3])

      expect(result.recipientId).toBe('char2')
      expect(result.recipientName).toBe('Thief')
    })

    it('should skip dead members when selecting recipient', () => {
      const deadMember = createTestCharacter({
        id: 'dead1',
        name: 'DeadGuy',
        status: CharacterStatus.DEAD,
        inventory: []
      })
      const livingMember = createTestCharacter({
        id: 'alive1',
        name: 'AliveGuy',
        inventory: []
      })
      const item = { id: 'sword', name: 'Sword +1' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [deadMember, livingMember])

      // Only living member should receive items
      expect(result.recipientId).toBe('alive1')
      expect(result.recipientName).toBe('AliveGuy')
      expect(result.itemsReceived).toHaveLength(1)
    })

    it('should lose all items when all party members are dead', () => {
      const deadMember1 = createTestCharacter({
        id: 'dead1',
        status: CharacterStatus.DEAD,
        inventory: []
      })
      const deadMember2 = createTestCharacter({
        id: 'dead2',
        status: CharacterStatus.ASHES,
        inventory: []
      })
      const item = { id: 'rare', name: 'Rare Item' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [deadMember1, deadMember2])

      expect(result.recipientId).toBe('')
      expect(result.recipientName).toBe('No one')
      expect(result.itemsReceived).toHaveLength(0)
      expect(result.itemsLost).toHaveLength(1)
      expect(result.itemsLost).toContain(item)
      // Gold still goes to party pool even if all dead
      expect(result.goldAdded).toBe(100)
    })

    it('should add items to received list when space available', () => {
      const member = createTestCharacter({ inventory: [] })
      const item1 = { id: 'sword', name: 'Sword +1' } as any
      const item2 = { id: 'shield', name: 'Shield' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item1, item2] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.itemsReceived).toHaveLength(2)
      expect(result.itemsReceived).toContain(item1)
      expect(result.itemsReceived).toContain(item2)
      expect(result.itemsLost).toHaveLength(0)
    })

    it('should lose items when recipient inventory is full', () => {
      const fullInventory = Array(8).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const member = createTestCharacter({ inventory: fullInventory as any })
      const lostItem = { id: 'rare', name: 'Rare Sword +5' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [lostItem] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.itemsReceived).toHaveLength(0)
      expect(result.itemsLost).toHaveLength(1)
      expect(result.itemsLost).toContain(lostItem)
    })

    it('should partially fill inventory and lose overflow', () => {
      const inventory = Array(7).fill(null).map((_, i) => ({ id: `item${i}`, name: `Item ${i}` }))
      const member = createTestCharacter({ inventory: inventory as any })
      const item1 = { id: 'item7', name: 'Fits' } as any
      const item2 = { id: 'item8', name: 'Lost' } as any
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [item1, item2] },
        null,
        1,
        createTestPosition()
      )

      const result = ChestService.distributeTreasure(chest, [member])

      expect(result.itemsReceived).toHaveLength(1)
      expect(result.itemsReceived).toContain(item1)
      expect(result.itemsLost).toHaveLength(1)
      expect(result.itemsLost).toContain(item2)
    })
  })

  describe('getDistributionMessage', () => {
    it('should format gold message', () => {
      const result = {
        goldAdded: 500,
        itemsReceived: [],
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Fighter'
      }

      const message = ChestService.getDistributionMessage(result)
      expect(message).toContain('500 gold')
    })

    it('should format items received message', () => {
      const result = {
        goldAdded: 0,
        itemsReceived: [{ id: 'sword', name: 'Sword +1' }] as any,
        itemsLost: [],
        recipientId: 'char1',
        recipientName: 'Fighter'
      }

      const message = ChestService.getDistributionMessage(result)
      expect(message).toContain('Sword +1')
    })

    it('should format items lost message', () => {
      const result = {
        goldAdded: 0,
        itemsReceived: [],
        itemsLost: [{ id: 'rare', name: 'Rare Item' }] as any,
        recipientId: 'char1',
        recipientName: 'Fighter'
      }

      const message = ChestService.getDistributionMessage(result)
      expect(message).toContain('LOST')
      expect(message).toContain('Rare Item')
    })
  })

  describe('createEmptyChest', () => {
    it('should create untrapped chest with no contents', () => {
      const chest = ChestService.createEmptyChest(1, createTestPosition())

      expect(chest.trapped).toBe(false)
      expect(chest.trapType).toBeNull()
      expect(chest.trapIdentified).toBe(true)
      expect(chest.contents.gold).toBe(0)
      expect(chest.contents.items).toHaveLength(0)
    })
  })

  describe('createChestWithContents', () => {
    it('should create chest with specified contents and trap', () => {
      const contents = { gold: 1000, items: [{ id: 'item', name: 'Special' }] as any }
      const chest = ChestService.createChestWithContents(
        contents,
        TrapType.TELEPORTER,
        5,
        createTestPosition()
      )

      expect(chest.trapped).toBe(true)
      expect(chest.trapType).toBe(TrapType.TELEPORTER)
      expect(chest.contents.gold).toBe(1000)
      expect(chest.contents.items).toHaveLength(1)
      expect(chest.mazeLevel).toBe(5)
    })

    it('should create untrapped chest when trapType is null', () => {
      const chest = ChestService.createChestWithContents(
        { gold: 100, items: [] },
        null,
        1,
        createTestPosition()
      )

      expect(chest.trapped).toBe(false)
      expect(chest.trapType).toBeNull()
    })
  })

  describe('selectTrapType', () => {
    it('should select from tier-appropriate traps', () => {
      // Tier 1 traps: POISON_NEEDLE, GAS_BOMB, ALARM
      RandomService.setSeed(12345)
      const tier1Trap = ChestService.selectTrapType(1)
      expect([TrapType.POISON_NEEDLE, TrapType.GAS_BOMB, TrapType.ALARM]).toContain(tier1Trap)

      // Tier 5 traps: TELEPORTER, MAGE_BLASTER, PRIEST_BLASTER, ALARM
      RandomService.setSeed(12345)
      const tier5Trap = ChestService.selectTrapType(5)
      expect([TrapType.TELEPORTER, TrapType.MAGE_BLASTER, TrapType.PRIEST_BLASTER, TrapType.ALARM]).toContain(tier5Trap)
    })

    it('should include SPLINTERS and BLADES in tier 3 traps', () => {
      RandomService.setSeed(12345)
      const tier3Traps: TrapType[] = []

      // Generate 100 tier 3 traps to ensure we see the variety
      for (let i = 0; i < 100; i++) {
        tier3Traps.push(ChestService.selectTrapType(3))
      }

      // Both should appear at least once
      expect(tier3Traps).toContain(TrapType.SPLINTERS)
      expect(tier3Traps).toContain(TrapType.BLADES)
    })
  })

  describe('generateGold', () => {
    it('should generate gold within tier range', () => {
      RandomService.setSeed(12345)

      for (let tier = 1; tier <= 5; tier++) {
        const gold = ChestService.generateGold(tier as RewardTier)
        const range = GOLD_RANGE_BY_TIER[tier as RewardTier]
        expect(gold).toBeGreaterThanOrEqual(range.min)
        expect(gold).toBeLessThanOrEqual(range.max)
      }
    })
  })
})

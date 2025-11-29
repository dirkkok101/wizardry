import { GameState, PendingCombatRewards } from '../GameState'

describe('GameState', () => {
  describe('PendingCombatRewards', () => {
    it('should allow pendingCombatRewards to be defined', () => {
      const rewards: PendingCombatRewards = {
        totalXP: 100,
        xpPerCharacter: 50,
        livingCharacterCount: 2,
        monstersDefeated: 3
      }

      const state: Partial<GameState> = {
        pendingCombatRewards: rewards
      }

      expect(state.pendingCombatRewards?.totalXP).toBe(100)
      expect(state.pendingCombatRewards?.xpPerCharacter).toBe(50)
      expect(state.pendingCombatRewards?.livingCharacterCount).toBe(2)
      expect(state.pendingCombatRewards?.monstersDefeated).toBe(3)
    })

    it('should allow pendingCombatRewards to be undefined', () => {
      const state: Partial<GameState> = {
        pendingCombatRewards: undefined
      }

      expect(state.pendingCombatRewards).toBeUndefined()
    })
  })
})

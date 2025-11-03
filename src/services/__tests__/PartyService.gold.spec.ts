import { describe, it, expect } from '@jest/globals';
import * as PartyService from '../PartyService';
import { GameState } from '../../types/GameState';
import { createTestGameState } from '../../test-helpers/test-factories';

describe('PartyService - Gold Management', () => {
  describe('getPartyGold', () => {
    it('returns current party gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 500
        }
      };

      expect(PartyService.getPartyGold(state)).toBe(500);
    });
  });

  describe('addPartyGold', () => {
    it('adds gold to party immutably', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      const newState = PartyService.addPartyGold(state, 50);

      expect(newState.party.gold).toBe(150);
      expect(state.party.gold).toBe(100); // Original unchanged
    });
  });

  describe('removePartyGold', () => {
    it('removes gold from party immutably', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      const newState = PartyService.removePartyGold(state, 30);

      expect(newState.party.gold).toBe(70);
      expect(state.party.gold).toBe(100); // Original unchanged
    });

    it('never goes below zero', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 50
        }
      };

      const newState = PartyService.removePartyGold(state, 100);

      expect(newState.party.gold).toBe(0);
    });
  });

  describe('hasEnoughGold', () => {
    it('returns true when party has enough gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      expect(PartyService.hasEnoughGold(state, 50)).toBe(true);
      expect(PartyService.hasEnoughGold(state, 100)).toBe(true);
    });

    it('returns false when party does not have enough gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      };

      expect(PartyService.hasEnoughGold(state, 101)).toBe(false);
      expect(PartyService.hasEnoughGold(state, 200)).toBe(false);
    });
  });
});

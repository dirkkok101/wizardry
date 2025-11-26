import { describe, it, expect } from '@jest/globals';
import * as PartyService from '../PartyService';
import { GameState } from '@models/GameState';
import { createTestGameState, createTestCharacter } from '@testing/test-factories';

describe('PartyService - Formation Movement', () => {
  function createStateWithParty(memberIds: string[]): GameState {
    const state = createTestGameState();
    return {
      ...state,
      party: {
        ...state.party,
        members: [...memberIds],
        formation: {
          frontRow: memberIds.slice(0, 3),
          backRow: memberIds.slice(3, 6)
        }
      }
    };
  }

  describe('moveCharacterUp', () => {
    it('swaps character with previous position', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3', 'char4']);

      const newState = PartyService.moveCharacterUp(state, 'char2');

      expect(newState.party.members).toEqual(['char2', 'char1', 'char3', 'char4']);
      expect(newState.party.formation.frontRow).toEqual(['char2', 'char1', 'char3']);
      expect(newState.party.formation.backRow).toEqual(['char4']);
    });

    it('returns unchanged state if character is at position 0', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3']);

      const newState = PartyService.moveCharacterUp(state, 'char1');

      expect(newState).toEqual(state);
    });

    it('returns unchanged state if character not found', () => {
      const state = createStateWithParty(['char1', 'char2']);

      const newState = PartyService.moveCharacterUp(state, 'char99');

      expect(newState).toEqual(state);
    });
  });

  describe('moveCharacterDown', () => {
    it('swaps character with next position', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3', 'char4']);

      const newState = PartyService.moveCharacterDown(state, 'char2');

      expect(newState.party.members).toEqual(['char1', 'char3', 'char2', 'char4']);
      expect(newState.party.formation.frontRow).toEqual(['char1', 'char3', 'char2']);
      expect(newState.party.formation.backRow).toEqual(['char4']);
    });

    it('returns unchanged state if character is at last position', () => {
      const state = createStateWithParty(['char1', 'char2', 'char3']);

      const newState = PartyService.moveCharacterDown(state, 'char3');

      expect(newState).toEqual(state);
    });

    it('returns unchanged state if character not found', () => {
      const state = createStateWithParty(['char1', 'char2']);

      const newState = PartyService.moveCharacterDown(state, 'char99');

      expect(newState).toEqual(state);
    });
  });

  describe('formation split across front/back rows', () => {
    it('correctly splits 6 members (3 front, 3 back)', () => {
      const state = createStateWithParty(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

      expect(state.party.formation.frontRow).toEqual(['c1', 'c2', 'c3']);
      expect(state.party.formation.backRow).toEqual(['c4', 'c5', 'c6']);
    });

    it('correctly splits 4 members (3 front, 1 back)', () => {
      const state = createStateWithParty(['c1', 'c2', 'c3', 'c4']);

      expect(state.party.formation.frontRow).toEqual(['c1', 'c2', 'c3']);
      expect(state.party.formation.backRow).toEqual(['c4']);
    });

    it('correctly splits 2 members (2 front, 0 back)', () => {
      const state = createStateWithParty(['c1', 'c2']);

      expect(state.party.formation.frontRow).toEqual(['c1', 'c2']);
      expect(state.party.formation.backRow).toEqual([]);
    });
  });
});

import { PartyAbandonmentService } from '../PartyAbandonmentService';
import { createTestGameState, createTestCharacter, createPartyWithMembers } from '@testing/test-factories';
import { CharacterStatus } from '@models/CharacterStatus';
import { SceneType } from '@models/SceneType';

describe('PartyAbandonmentService', () => {
  describe('abandonParty', () => {
    it('marks all living party members as DEAD', () => {
      const char1 = createTestCharacter({ id: 'char1', status: CharacterStatus.OK, hp: 10 });
      const char2 = createTestCharacter({ id: 'char2', status: CharacterStatus.OK, hp: 15 });
      const roster = new Map([
        ['char1', char1],
        ['char2', char2]
      ]);
      const party = createPartyWithMembers(['char1', 'char2']);
      party.gold = 1000;

      const state = createTestGameState({
        roster,
        party,
        currentScene: SceneType.MAZE
      });

      const result = PartyAbandonmentService.abandonParty(state);

      // Both characters should be dead with 0 HP
      expect(result.roster.get('char1')?.status).toBe(CharacterStatus.DEAD);
      expect(result.roster.get('char1')?.hp).toBe(0);
      expect(result.roster.get('char2')?.status).toBe(CharacterStatus.DEAD);
      expect(result.roster.get('char2')?.hp).toBe(0);
    });

    it('creates bodies at current dungeon position for each party member', () => {
      const char1 = createTestCharacter({ id: 'char1', status: CharacterStatus.OK });
      const char2 = createTestCharacter({ id: 'char2', status: CharacterStatus.OK });
      const roster = new Map([
        ['char1', char1],
        ['char2', char2]
      ]);
      const party = createPartyWithMembers(['char1', 'char2']);
      party.gold = 0;

      const state = createTestGameState({
        roster,
        party,
        dungeon: {
          currentLevel: 3,
          position: { x: 10, y: 15, facing: 'SOUTH' },
          lightActive: false,
          lightRadius: 0,
          inDarknessZone: false,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          latumapicActive: false
        }
      });

      const result = PartyAbandonmentService.abandonParty(state);

      // Bodies should exist at dungeon position
      expect(result.bodies?.size).toBe(2);
      expect(result.bodies?.get('char1')).toEqual({
        characterId: 'char1',
        level: 3,
        x: 10,
        y: 15,
        gold: 0
      });
      expect(result.bodies?.get('char2')).toEqual({
        characterId: 'char2',
        level: 3,
        x: 10,
        y: 15,
        gold: 0
      });
    });

    it('splits party gold evenly among bodies', () => {
      const char1 = createTestCharacter({ id: 'char1', status: CharacterStatus.OK });
      const char2 = createTestCharacter({ id: 'char2', status: CharacterStatus.OK });
      const roster = new Map([
        ['char1', char1],
        ['char2', char2]
      ]);
      const party = createPartyWithMembers(['char1', 'char2']);
      party.gold = 1000;

      const state = createTestGameState({
        roster,
        party
      });

      const result = PartyAbandonmentService.abandonParty(state);

      // 1000 gold / 2 members = 500 each
      expect(result.bodies?.get('char1')?.gold).toBe(500);
      expect(result.bodies?.get('char2')?.gold).toBe(500);
      // Party gold should be 0
      expect(result.party.gold).toBe(0);
    });

    it('handles odd gold amounts by flooring the split', () => {
      const char1 = createTestCharacter({ id: 'char1', status: CharacterStatus.OK });
      const char2 = createTestCharacter({ id: 'char2', status: CharacterStatus.OK });
      const char3 = createTestCharacter({ id: 'char3', status: CharacterStatus.OK });
      const roster = new Map([
        ['char1', char1],
        ['char2', char2],
        ['char3', char3]
      ]);
      const party = createPartyWithMembers(['char1', 'char2', 'char3']);
      party.gold = 1000;

      const state = createTestGameState({
        roster,
        party
      });

      const result = PartyAbandonmentService.abandonParty(state);

      // 1000 / 3 = 333.33, floored to 333 each
      expect(result.bodies?.get('char1')?.gold).toBe(333);
      expect(result.bodies?.get('char2')?.gold).toBe(333);
      expect(result.bodies?.get('char3')?.gold).toBe(333);
    });

    it('clears party members and formation', () => {
      const char1 = createTestCharacter({ id: 'char1' });
      const roster = new Map([['char1', char1]]);
      const party = createPartyWithMembers(['char1']);

      const state = createTestGameState({
        roster,
        party
      });

      const result = PartyAbandonmentService.abandonParty(state);

      expect(result.party.members).toEqual([]);
      expect(result.party.formation.frontRow).toEqual([]);
      expect(result.party.formation.backRow).toEqual([]);
    });

    it('clears dungeon state', () => {
      const char1 = createTestCharacter({ id: 'char1' });
      const roster = new Map([['char1', char1]]);
      const party = createPartyWithMembers(['char1']);

      const state = createTestGameState({
        roster,
        party
      });

      const result = PartyAbandonmentService.abandonParty(state);

      expect(result.dungeon).toBeUndefined();
    });

    it('clears combat state', () => {
      const char1 = createTestCharacter({ id: 'char1' });
      const roster = new Map([['char1', char1]]);
      const party = createPartyWithMembers(['char1']);

      const state = createTestGameState({
        roster,
        party,
        combat: {
          monsterGroups: [],
          commandQueue: [],
          roundNumber: 1,
          combatLog: [],
          canFlee: true,
          dungeonLevel: 1,
          statusEffects: new Map(),
          acModifiers: new Map(),
          statusDurations: new Map()
        }
      });

      const result = PartyAbandonmentService.abandonParty(state);

      expect(result.combat).toBeUndefined();
    });

    it('sets currentScene to CASTLE_MENU', () => {
      const char1 = createTestCharacter({ id: 'char1' });
      const roster = new Map([['char1', char1]]);
      const party = createPartyWithMembers(['char1']);

      const state = createTestGameState({
        roster,
        party,
        currentScene: SceneType.MAZE
      });

      const result = PartyAbandonmentService.abandonParty(state);

      expect(result.currentScene).toBe(SceneType.CASTLE_MENU);
    });

    it('preserves already dead characters (does not create duplicate bodies)', () => {
      const char1 = createTestCharacter({ id: 'char1', status: CharacterStatus.OK });
      const char2 = createTestCharacter({ id: 'char2', status: CharacterStatus.DEAD, hp: 0 });
      const roster = new Map([
        ['char1', char1],
        ['char2', char2]
      ]);
      const party = createPartyWithMembers(['char1', 'char2']);
      party.gold = 100;

      const state = createTestGameState({
        roster,
        party
      });

      const result = PartyAbandonmentService.abandonParty(state);

      // Only char1 (living) gets a body, char2 was already dead
      expect(result.bodies?.size).toBe(1);
      expect(result.bodies?.has('char1')).toBe(true);
      expect(result.bodies?.has('char2')).toBe(false);
    });

    it('preserves existing bodies from previous deaths', () => {
      const char1 = createTestCharacter({ id: 'char1', status: CharacterStatus.OK });
      const roster = new Map([['char1', char1]]);
      const party = createPartyWithMembers(['char1']);
      party.gold = 0;

      const existingBodies = new Map([
        ['old-char', { characterId: 'old-char', level: 1, x: 5, y: 5 }]
      ]);

      const state = createTestGameState({
        roster,
        party,
        bodies: existingBodies
      });

      const result = PartyAbandonmentService.abandonParty(state);

      // Should have both the old body and the new one
      expect(result.bodies?.size).toBe(2);
      expect(result.bodies?.has('old-char')).toBe(true);
      expect(result.bodies?.has('char1')).toBe(true);
    });
  });
});

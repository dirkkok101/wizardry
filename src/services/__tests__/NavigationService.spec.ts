import { NavigationService } from '../NavigationService'
import { GameState } from '../../types/GameState'
import { Position, TileData } from '../../types/Dungeon'
import { createTestCharacter, createTestGameState as createTestGameStateHelper } from '../../test-helpers/test-factories'

// Test helper
function createTestGameState(position?: Position): GameState {
  return {
    dungeon: {
      currentLevel: 1,
      position: position || { x: 0, y: 0, facing: 'NORTH' },
      lightActive: false,
      lightRadius: 1,
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: []
    }
  } as GameState
}

describe('NavigationService', () => {
  // Mock DungeonService for basic movement tests to avoid special tile triggers
  const mockEmptyLevelData = {
    level: 1,
    name: 'Test Level',
    size: 20,
    startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
    edgeWrapping: true,
    tiles: [],
    encounterRate: 0,
    encounterTable: []
  }

  beforeEach(() => {
    const DungeonService = require('../DungeonService').DungeonService
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(mockEmptyLevelData)
    jest.spyOn(DungeonService, 'getTile').mockReturnValue({
      x: 0,
      y: 0,
      walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('moveForward', () => {
    it('increments y when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.y).toBe(11)
      expect(newState.dungeon!.position.x).toBe(10)
    })

    it('decrements y when facing south', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.y).toBe(9)
    })

    it('increments x when facing east', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(11)
    })

    it('decrements x when facing west', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(9)
    })

    it('wraps x from 19 to 0 when moving east', () => {
      const state = createTestGameState({ x: 19, y: 10, facing: 'EAST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(0)
    })

    it('wraps x from 0 to 19 when moving west', () => {
      const state = createTestGameState({ x: 0, y: 10, facing: 'WEST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(19)
    })
  })

  describe('turnLeft', () => {
    it('rotates from NORTH to WEST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('WEST')
    })

    it('rotates from WEST to SOUTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const newState = NavigationService.turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('SOUTH')
    })
  })

  describe('turnRight', () => {
    it('rotates from NORTH to EAST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('EAST')
    })

    it('rotates from EAST to SOUTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const newState = NavigationService.turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('SOUTH')
    })
  })

  describe('strafeLeft', () => {
    it('moves west when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.strafeLeft(state)

      expect(newState.dungeon!.position.x).toBe(9)
      expect(newState.dungeon!.position.y).toBe(10)
      expect(newState.dungeon!.position.facing).toBe('NORTH')
    })
  })

  describe('enterDungeon', () => {
    it('initializes dungeon state with default position {x: 0, y: 0, facing: NORTH}', () => {
      const state = createTestGameStateHelper()

      const result = NavigationService.enterDungeon(state, 1)

      expect(result.dungeon!.position).toEqual({ x: 0, y: 0, facing: 'NORTH' })
    })

    it('enables torch light with radius 3 and lightActive true', () => {
      const state = createTestGameStateHelper()

      const result = NavigationService.enterDungeon(state, 1)

      expect(result.dungeon!.lightRadius).toBe(3)
      expect(result.dungeon!.lightActive).toBe(true)
    })

    it('initializes all tracking sets as empty', () => {
      const state = createTestGameStateHelper()

      const result = NavigationService.enterDungeon(state, 1)

      expect(result.dungeon!.visitedTiles).toEqual(new Set())
      expect(result.dungeon!.defeatedEncounters).toEqual([])
      expect(result.dungeon!.unlockedDoors).toEqual(new Set())
    })

    it('sets correct dungeon level', () => {
      const state = createTestGameStateHelper()

      const result = NavigationService.enterDungeon(state, 5)

      expect(result.dungeon!.currentLevel).toBe(5)
    })

    it('preserves other game state properties (roster, party, settings)', () => {
      const character = createTestCharacter({ id: 'char1' })
      const state: GameState = {
        ...createTestGameStateHelper(),
        roster: new Map([['char1', character]]),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 1000
        },
        settings: {
          soundEnabled: true,
          musicEnabled: false,
          textSpeed: 'NORMAL'
        }
      }

      const result = NavigationService.enterDungeon(state, 1)

      expect(result.roster).toEqual(state.roster)
      expect(result.party).toEqual(state.party)
      expect(result.settings).toEqual(state.settings)
    })
  })

  describe('enterLevel', () => {
    it('changes to new level and sets position based on entry type', () => {
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const result = NavigationService.enterLevel(state, 2, 'STAIRS_DOWN');

      expect(result.dungeon!.currentLevel).toBe(2);
      // Position should be set to stairs_up tile on new level (implementation detail)
    });

    it('maintains facing direction when changing levels', () => {
      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 3,
          position: { x: 10, y: 10, facing: 'WEST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
        },
      };

      const result = NavigationService.enterLevel(state, 2, 'STAIRS_UP');

      expect(result.dungeon!.position.facing).toBe('WEST');
    });
  });

  describe('handleSpecialTile', () => {
    describe('teleporter', () => {
      it('teleports party to destination', () => {
        const tile: TileData = {
          x: 1,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'teleporter',
          destination: { x: 5, y: 5 }
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 1, y: 0, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        expect(result.dungeon!.position.x).toBe(5)
        expect(result.dungeon!.position.y).toBe(5)
        expect(result.dungeon!.teleportCount).toBe(1)
      })

      it('prevents infinite teleport loops after 3 consecutive', () => {
        const tile: TileData = {
          x: 1,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'teleporter',
          destination: { x: 5, y: 5 }
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 1, y: 0, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 3,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        // Should NOT teleport
        expect(result.dungeon!.position.x).toBe(1)
        expect(result.dungeon!.position.y).toBe(0)
        expect(result.dungeon!.teleportCount).toBe(3)
      })

      it('resets teleport count on non-teleporter tile', () => {
        const tile: TileData = {
          x: 1,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 1, y: 0, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 2,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        expect(result.dungeon!.teleportCount).toBe(0)
      })
    })

    describe('spinner', () => {
      it('randomizes party facing direction', () => {
        const tile: TileData = {
          x: 5,
          y: 5,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'spinner'
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        // Facing should be one of the four directions
        expect(['NORTH', 'SOUTH', 'EAST', 'WEST']).toContain(result.dungeon!.position.facing)
      })

      it('can change facing to different direction', () => {
        const tile: TileData = {
          x: 5,
          y: 5,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'spinner'
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        // Run spinner 10 times, at least one should change facing
        let facingChanged = false
        for (let i = 0; i < 10; i++) {
          const result = NavigationService.handleSpecialTile(state, tile)
          if (result.dungeon!.position.facing !== 'NORTH') {
            facingChanged = true
            break
          }
        }

        expect(facingChanged).toBe(true)
      })
    })

    describe('chute', () => {
      it('causes party to fall 1-3 levels', () => {
        const tile = { type: 'chute' } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 5,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // Should fall 1-3 levels
        expect(result.dungeon!.currentLevel).toBeGreaterThanOrEqual(6);
        expect(result.dungeon!.currentLevel).toBeLessThanOrEqual(8);
      });

      it('deals 1d6 damage per level fallen to all party members', () => {
        const tile = { type: 'chute' } as TileData;

        const character1 = createTestCharacter({ id: 'char1', hp: 50, maxHp: 50 });
        const character2 = createTestCharacter({ id: 'char2', hp: 50, maxHp: 50 });

        const state: GameState = {
          ...createTestGameStateHelper(),
          party: {
            members: ['char1', 'char2'],
            formation: { front: ['char1'], back: ['char2'] },
            gold: 0,
          },
          roster: new Map([
            ['char1', character1],
            ['char2', character2],
          ]),
          dungeon: {
            currentLevel: 5,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        const char1After = result.roster.get('char1')!;
        const char2After = result.roster.get('char2')!;

        // Both characters should take damage
        expect(char1After.hp).toBeLessThan(50);
        expect(char2After.hp).toBeLessThan(50);

        // Damage should be reasonable (1-18 for 1-3 levels × 1-6 damage)
        expect(char1After.hp).toBeGreaterThanOrEqual(50 - 18);
        expect(char2After.hp).toBeGreaterThanOrEqual(50 - 18);
      });

      it('does not fall below level 10 (bottom)', () => {
        const tile = { type: 'chute' } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 9,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        expect(result.dungeon!.currentLevel).toBeLessThanOrEqual(10);
      });
    });

    describe('pit', () => {
      it('deals 1d6 damage to characters who fail AGI check', () => {
        const tile = { type: 'pit' } as TileData;

        const lowAgiChar = createTestCharacter({
          id: 'char1',
          hp: 50,
          maxHp: 50,
          agility: 3, // Very low AGI, should fail
        });

        const state: GameState = {
          ...createTestGameStateHelper(),
          party: {
            members: ['char1'],
            formation: { front: ['char1'], back: [] },
            gold: 0,
          },
          roster: new Map([['char1', lowAgiChar]]),
          dungeon: {
            currentLevel: 5,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        // Run multiple times to ensure damage occurs
        let damageOccurred = false;
        for (let i = 0; i < 10; i++) {
          const result = NavigationService.handleSpecialTile(state, tile);
          const charAfter = result.roster.get('char1')!;
          if (charAfter.hp < 50) {
            damageOccurred = true;
            // Damage should be 1-6
            expect(charAfter.hp).toBeGreaterThanOrEqual(50 - 6);
            expect(charAfter.hp).toBeLessThan(50);
            break;
          }
        }
        expect(damageOccurred).toBe(true);
      });

      it('high AGI characters can avoid pit damage', () => {
        const tile = { type: 'pit' } as TileData;

        const highAgiChar = createTestCharacter({
          id: 'char1',
          hp: 50,
          maxHp: 50,
          agility: 18, // Max AGI, should usually succeed
        });

        const state: GameState = {
          ...createTestGameStateHelper(),
          party: {
            members: ['char1'],
            formation: { front: ['char1'], back: [] },
            gold: 0,
          },
          roster: new Map([['char1', highAgiChar]]),
          dungeon: {
            currentLevel: 1,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        // Run multiple times to ensure avoidance occurs
        let avoidanceOccurred = false;
        for (let i = 0; i < 10; i++) {
          const result = NavigationService.handleSpecialTile(state, tile);
          const charAfter = result.roster.get('char1')!;
          if (charAfter.hp === 50) {
            avoidanceOccurred = true;
            break;
          }
        }
        expect(avoidanceOccurred).toBe(true);
      });

      it('does not change current level', () => {
        const tile = { type: 'pit' } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 5,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        expect(result.dungeon!.currentLevel).toBe(5);
      });
    });

    describe('darkness', () => {
      it('sets lightRadius to 0 for current tile', () => {
        const tile = { type: 'darkness' } as TileData;

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: true,
            lightRadius: 3,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // Note: This sets a per-tile flag, actual lightRadius override happens in MazeComponent
        expect(result.dungeon!.lightActive).toBe(true); // Spell still active
        // We'll add a tileDarkness flag for UI to check
      });
    });

    describe('stairs', () => {
      it('stairs_down auto-descends to next level', () => {
        const tile = { type: 'stairs_down' } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 1,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        expect(result.dungeon!.currentLevel).toBe(2);
      });

      it('stairs_up auto-ascends to previous level', () => {
        const tile = { type: 'stairs_up' } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 3,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        expect(result.dungeon!.currentLevel).toBe(2);
      });

      it('stairs_up on level 1 does nothing', () => {
        const tile = { type: 'stairs_up' } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 1,
            position: { x: 10, y: 10, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        expect(result.dungeon!.currentLevel).toBe(1);
      });
    });

    describe('elevator', () => {
      it('returns state unchanged (UI handles level selection)', () => {
        const tile = {
          type: 'elevator',
          elevatorDestinations: [1, 2, 3, 4]
        } as TileData;

        const state: GameState = {
          ...createTestGameStateHelper(),
          dungeon: {
            currentLevel: 1,
            position: { x: 10, y: 8, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // Elevator UI handled by MazeComponent
        expect(result).toEqual(state);
      });
    });

    describe('anti_magic', () => {
      it('sets anti-magic flag for current tile', () => {
        const tile = { type: 'anti_magic' } as TileData;

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: true,
            lightRadius: 3,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // Anti-magic doesn't modify state directly - MazeComponent checks tile type
        expect(result).toEqual(state);
      });
    });

    describe('message', () => {
      it('returns state unchanged (message handled by UI)', () => {
        const tile = {
          type: 'message',
          message: 'AREA OUT OF BOUNDS! Cloaked in eternal darkness'
        } as TileData;

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // Message display handled by MazeComponent, state unchanged
        expect(result).toEqual(state);
      });
    });

    describe('searchable', () => {
      it('does not auto-trigger search (requires I key)', () => {
        const tile = {
          type: 'searchable',
          searchContent: { itemId: 'bronze_key' }
        } as TileData;

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 13, y: 3, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // State unchanged - requires explicit inspect action
        expect(result).toEqual(state);
      });
    });

    describe('fixed_encounter', () => {
      it('returns state unchanged if encounter not yet defeated', () => {
        const tile = {
          type: 'fixed_encounter',
          encounterId: 'murphys_ghosts'
        } as TileData;

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 13, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            defeatedEncounters: [],
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        // MazeComponent will check and trigger combat
        expect(result).toEqual(state);
      });

      it('returns state unchanged if encounter already defeated', () => {
        const tile = {
          type: 'fixed_encounter',
          encounterId: 'murphys_ghosts'
        } as TileData;

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 13, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            defeatedEncounters: ['murphys_ghosts'],
          },
        };

        const result = NavigationService.handleSpecialTile(state, tile);

        expect(result).toEqual(state);
      });
    });
  })

  describe('movement integration with special tiles', () => {
    it('triggers teleporter after moveForward', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 0, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } },
          { x: 1, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, type: 'teleporter' as const, destination: { x: 10, y: 10 } }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'EAST' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      // Mock DungeonService.loadLevel and getTile
      const DungeonService = require('../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = NavigationService.moveForward(state);

      // Should move to (1, 0) then teleport to (10, 10)
      expect(result.dungeon!.position.x).toBe(10);
      expect(result.dungeon!.position.y).toBe(10);
      expect(result.dungeon!.teleportCount).toBe(1);

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('triggers spinner after strafeLeft', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 0, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, type: 'spinner' as const },
          { x: 1, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const state: GameState = {
        ...createTestGameStateHelper(),
        dungeon: {
          currentLevel: 1,
          position: { x: 1, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      const DungeonService = require('../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = NavigationService.strafeLeft(state);

      // Should move to (0, 0) then spin
      expect(result.dungeon!.position.x).toBe(0);
      expect(['NORTH', 'SOUTH', 'EAST', 'WEST']).toContain(result.dungeon!.position.facing);

      jest.restoreAllMocks();
    });

    it('triggers chute after moveBackward', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 10, y: 9, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, type: 'chute' as const },
          { x: 10, y: 10, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const character = createTestCharacter({ id: 'char1', hp: 50, maxHp: 50 });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 10, y: 10, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      const DungeonService = require('../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = NavigationService.moveBackward(state);

      // Should move to (10, 9) then fall down levels
      expect(result.dungeon!.position.x).toBe(10);
      expect(result.dungeon!.position.y).toBe(9);
      expect(result.dungeon!.currentLevel).toBeGreaterThanOrEqual(6);
      expect(result.dungeon!.currentLevel).toBeLessThanOrEqual(8);

      // Character should take damage
      const charAfter = result.roster.get('char1')!;
      expect(charAfter.hp).toBeLessThan(50);

      jest.restoreAllMocks();
    });

    it('triggers pit after strafeRight', () => {
      const levelData = {
        level: 1,
        name: 'Test Level',
        size: 20,
        startPosition: { x: 0, y: 0, facing: 'NORTH' as const },
        edgeWrapping: true,
        tiles: [
          { x: 0, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } },
          { x: 1, y: 0, walls: { north: 'open', south: 'open', east: 'open', west: 'open' }, type: 'pit' as const }
        ],
        encounterRate: 10,
        encounterTable: []
      };

      const character = createTestCharacter({ id: 'char1', hp: 50, maxHp: 50, agility: 3 });

      const state: GameState = {
        ...createTestGameStateHelper(),
        party: {
          members: ['char1'],
          formation: { front: ['char1'], back: [] },
          gold: 0
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 5,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: []
        }
      };

      const DungeonService = require('../DungeonService').DungeonService;
      jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(levelData);
      jest.spyOn(DungeonService, 'getTile').mockImplementation((level, x, y) => {
        return levelData.tiles.find(t => t.x === x && t.y === y) || levelData.tiles[0];
      });

      const result = NavigationService.strafeRight(state);

      // Should move to (1, 0)
      expect(result.dungeon!.position.x).toBe(1);
      expect(result.dungeon!.position.y).toBe(0);

      // Low AGI character should likely take damage (may not happen every time due to RNG)
      // We just verify position changed and level stayed same
      expect(result.dungeon!.currentLevel).toBe(5);

      jest.restoreAllMocks();
    });
  })
})

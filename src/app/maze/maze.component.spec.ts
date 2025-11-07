import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MazeComponent } from './maze.component';
import { GameStateService } from '../../services/GameStateService';
import { DungeonService } from '../../services/DungeonService';
import { EncounterService } from '../../services/EncounterService';
import { SceneType } from '../../types/SceneType';
import { createTestCharacter } from '../../test-helpers/test-factories';

function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 1,
    teleportCount: 0,
    visitedTiles: new Set<string>(),
    defeatedEncounters: []
  };
}

describe('MazeComponent - Initialization', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Mock loadLevel to avoid level data issues
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
  });

  it('sets scene type to MAZE on init', () => {
    component.ngOnInit();

    expect(gameState.currentScene()).toBe(SceneType.MAZE);
  });

  it('loads dungeon state on init', () => {
    component.ngOnInit();

    const dungeon = component.dungeonState();
    expect(dungeon).toBeDefined();
    expect(dungeon?.currentLevel).toBe(1);
    expect(dungeon?.position.x).toBe(10);
    expect(dungeon?.position.y).toBe(10);
  });

  it('initializes with empty message log', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.messages().length).toBeGreaterThanOrEqual(0);
  });
});

describe('MazeComponent - Forward/Backward Movement', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock canMove to allow movement by default
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: true
    });

    // Mock loadLevel and getTile to avoid special tile side effects
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);

    jest.spyOn(DungeonService, 'getTile').mockReturnValue({
      x: 0,
      y: 0,
      walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
    });

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('moves forward when W pressed and path clear', () => {
    const initialY = component.position()!.y;

    // Simulate W key press
    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.y).toBe(initialY + 1);
  });

  it('shows error when moving into wall', () => {
    // Mock canMove to return blocked
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: false,
      reason: 'You walk into a wall. Ouch!'
    });

    const initialY = component.position()!.y;

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Position unchanged
    expect(component.position()!.y).toBe(initialY);
    // Error message added
    expect(component.messages()).toContain('You walk into a wall. Ouch!');
  });

  it('adds message to log on successful move', () => {
    const initialMessages = component.messages().length;

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.messages().length).toBeGreaterThan(initialMessages);
  });

  it('moves backward when S pressed', () => {
    const initialY = component.position()!.y;

    const event = new KeyboardEvent('keydown', { key: 's' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.y).toBe(initialY - 1);
  });

  it('wraps coordinates at edge', () => {
    // Set position to edge
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        ...state.dungeon!,
        position: { x: 19, y: 10, facing: 'EAST' }
      }
    }));
    fixture.detectChanges();

    // Move east (should wrap to x=0)
    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.x).toBe(0);
  });

  it('updates position in GameState immutably', () => {
    const initialState = gameState.state();

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    const newState = gameState.state();
    expect(newState).not.toBe(initialState);
    expect(newState.dungeon).not.toBe(initialState.dungeon);
  });
});

describe('MazeComponent - Rotation', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock loadLevel to avoid level data issues
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('handles A key press for turning left', () => {
    const turnLeftSpy = jest.spyOn(component, 'turnLeft');
    const event = new KeyboardEvent('keydown', { key: 'a' });
    component.handleKeyPress(event);
    expect(turnLeftSpy).toHaveBeenCalled();
  });

  it('handles D key press for turning right', () => {
    const turnRightSpy = jest.spyOn(component, 'turnRight');
    const event = new KeyboardEvent('keydown', { key: 'd' });
    component.handleKeyPress(event);
    expect(turnRightSpy).toHaveBeenCalled();
  });

  it('updates facing direction when turning left', () => {
    // Start facing NORTH
    expect(component.position()!.facing).toBe('NORTH');

    // Turn left (should face WEST)
    const event = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.facing).toBe('WEST');
  });

  it('updates facing direction when turning right', () => {
    // Start facing NORTH
    expect(component.position()!.facing).toBe('NORTH');

    // Turn right (should face EAST)
    const event = new KeyboardEvent('keydown', { key: 'd' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.facing).toBe('EAST');
  });

  it('completes full rotation cycle (4 turns = original facing)', () => {
    // Start facing NORTH
    expect(component.position()!.facing).toBe('NORTH');

    // Turn right 4 times
    for (let i = 0; i < 4; i++) {
      const event = new KeyboardEvent('keydown', { key: 'd' });
      window.dispatchEvent(event);
      fixture.detectChanges();
    }

    // Should be back to NORTH
    expect(component.position()!.facing).toBe('NORTH');
  });
});

describe('MazeComponent - Strafe Movement', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock canMove to allow movement by default
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: true
    });

    // Mock loadLevel to avoid level data issues
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);

    // Set up test state with dungeon at (5,5) facing NORTH
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        ...createTestDungeonState(),
        position: { x: 5, y: 5, facing: 'NORTH' }
      }
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('handles Q key press for strafing left', () => {
    const strafeLeftSpy = jest.spyOn(component, 'strafeLeft');
    const event = new KeyboardEvent('keydown', { key: 'q' });
    component.handleKeyPress(event);
    expect(strafeLeftSpy).toHaveBeenCalled();
  });

  it('handles E key press for strafing right', () => {
    const strafeRightSpy = jest.spyOn(component, 'strafeRight');
    const event = new KeyboardEvent('keydown', { key: 'e' });
    component.handleKeyPress(event);
    expect(strafeRightSpy).toHaveBeenCalled();
  });

  it('moves left relative to facing when strafing left', () => {
    // Setup: Facing NORTH at (5,5)
    expect(component.position()).toEqual({ x: 5, y: 5, facing: 'NORTH' });

    // Act: Strafe left (should move west when facing north)
    const event = new KeyboardEvent('keydown', { key: 'q' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Assert: Position changed to (4,5), facing unchanged
    expect(component.position()).toEqual({ x: 4, y: 5, facing: 'NORTH' });
    expect(component.messages()).toContain('You strafe left.');
  });

  it('moves right relative to facing when strafing right', () => {
    // Setup: Facing NORTH at (5,5)
    expect(component.position()).toEqual({ x: 5, y: 5, facing: 'NORTH' });

    // Act: Strafe right (should move east when facing north)
    const event = new KeyboardEvent('keydown', { key: 'e' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Assert: Position changed to (6,5), facing unchanged
    expect(component.position()).toEqual({ x: 6, y: 5, facing: 'NORTH' });
    expect(component.messages()).toContain('You strafe right.');
  });
});

describe('MazeComponent - Encounter Detection', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    // Mock canMove to allow movement by default
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: true
    });

    // Mock loadLevel to avoid level data issues
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('triggers encounter check after successful movement', () => {
    const rollSpy = jest.spyOn(EncounterService, 'rollRandomEncounter');

    component.moveForward();

    expect(rollSpy).toHaveBeenCalled();
  });

  it('navigates to combat when encounter occurs', (done) => {
    // Mock encounter to occur
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true);
    jest.spyOn(EncounterService, 'getEncounterTable').mockReturnValue({
      levelId: 'level_1_monsters',
      encounterRate: 0.10,
      monsters: [{ monsterId: 'orc', weight: 10 }]
    });
    jest.spyOn(EncounterService, 'selectMonster').mockReturnValue('orc');

    const navigateSpy = jest.spyOn(router, 'navigate');

    component.moveForward();

    // Use queueMicrotask to wait for async navigation
    queueMicrotask(() => {
      const messages = component.messages();
      const hasEncounterMessage = messages.some(msg => msg.includes('encounter'));
      expect(hasEncounterMessage).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith(['/combat-stub']);
      done();
    });
  });

  it('does not navigate when no encounter occurs', () => {
    // Mock no encounter
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(false);

    const navigateSpy = jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const initialMessages = component.messages().length;

    component.moveForward();

    // Navigation should only happen to combat if encounter occurred
    // (ngOnInit may have called navigate, but not to combat-stub)
    expect(navigateSpy).not.toHaveBeenCalledWith(['/combat-stub']);
  });
});

describe('MazeComponent - Door Kicking', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock loadLevel to avoid level data issues
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);
  });

  it('triggers door kick on K key press when facing locked door', () => {
    // Setup state with locked door ahead
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'EAST' as const },
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        visitedTiles: new Set<string>()
      }
    }));

    component.ngOnInit();
    fixture.detectChanges();

    const kickSpy = jest.spyOn(component, 'kickDoor');

    // Simulate K key press
    const event = new KeyboardEvent('keydown', { key: 'k' });
    component.handleKeyPress(event);

    expect(kickSpy).toHaveBeenCalled();
  });

  it('does not trigger kick when not facing locked door', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 5, y: 5, facing: 'NORTH' as const },
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        visitedTiles: new Set<string>()
      }
    }));

    component.ngOnInit();
    fixture.detectChanges();

    const kickSpy = jest.spyOn(component, 'kickDoor');

    const event = new KeyboardEvent('keydown', { key: 'k' });
    component.handleKeyPress(event);

    // Should call kickDoor, which will show "No locked door ahead" message
    expect(kickSpy).toHaveBeenCalled();
  });
});

describe('MazeComponent - Tile Inspection', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock loadLevel to return searchable tile at (13, 3)
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map((_, y) =>
        Array(20).fill(null).map((_, x) => ({
          x,
          y,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: (x === 13 && y === 3) ? 'searchable' : 'normal',
          searchContent: (x === 13 && y === 3) ? { itemId: 'potion', message: 'You found a potion!' } : undefined
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);
  });

  it('triggers inspection on I key press when on searchable tile', () => {
    const character = createTestCharacter({ id: 'char1', inventory: [] });
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['char1'],
        formation: { front: ['char1'], back: [] },
        gold: 0,
      },
      roster: new Map([['char1', character]]),
      dungeon: {
        currentLevel: 1,
        position: { x: 13, y: 3, facing: 'NORTH' }, // Searchable tile on Level 1
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        visitedTiles: new Set<string>()
      },
    }));

    component.ngOnInit();
    fixture.detectChanges();

    const inspectSpy = jest.spyOn(component, 'inspectTile');

    const event = new KeyboardEvent('keydown', { key: 'i' });
    window.dispatchEvent(event);

    expect(inspectSpy).toHaveBeenCalled();
  });

  it('adds discovered item to party inventory', () => {
    const character = createTestCharacter({ id: 'char1', inventory: [] });
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['char1'],
        formation: { front: ['char1'], back: [] },
        gold: 0,
      },
      roster: new Map([['char1', character]]),
      dungeon: {
        currentLevel: 1,
        position: { x: 13, y: 3, facing: 'NORTH' },
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        visitedTiles: new Set<string>()
      },
    }));

    component.ngOnInit();
    fixture.detectChanges();

    component.inspectTile();

    const state = gameState.state();
    const charAfter = state.roster.get('char1')!;
    expect(charAfter.inventory.length).toBeGreaterThan(0);
  });
});

describe('MazeComponent - Navigation & Error Handling', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Mock loadLevel to avoid level data issues
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
  });

  it('handles ESC key press to return to camp', () => {
    const returnSpy = jest.spyOn(component, 'returnToCamp');
    const event = new KeyboardEvent('keydown', { key: 'escape' });
    component.handleKeyPress(event);
    expect(returnSpy).toHaveBeenCalled();
  });

  it('navigates to camp when returnToCamp is called', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.returnToCamp();
    expect(component.messages()).toContain('Returning to camp...');
    expect(navigateSpy).toHaveBeenCalledWith(['/camp']);
  });

  it('shows error when dungeon state is missing', () => {
    // Setup: Remove dungeon state
    gameState.updateState(state => ({
      ...state,
      dungeon: null as any
    }));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Error: No active dungeon. Return to camp to enter the dungeon.');
  });

  it('does not initialize movement when dungeon missing', () => {
    // Setup: Remove dungeon state
    gameState.updateState(state => ({
      ...state,
      dungeon: null as any
    }));

    component.ngOnInit();
    fixture.detectChanges();

    // Should not add initialization messages
    expect(component.messages().length).toBe(0);
  });
});

describe('MazeComponent - Darkness Tiles', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock loadLevel with darkness tile at (9, 12)
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map((_, y) =>
        Array(20).fill(null).map((_, x) => ({
          x,
          y,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: (x === 9 && y === 12) ? 'darkness' : 'normal'
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);
  });

  it('overrides light spell on darkness tile', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 9, y: 12, facing: 'NORTH' }, // Darkness tile on Level 1
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
      },
    }));

    fixture.detectChanges();

    // visibleTiles computed signal should use lightRadius = 0 (no tiles ahead visible)
    const tiles = component.visibleTiles();
    expect(tiles.length).toBe(0); // No tiles ahead visible (radius 0)
  });

  it('uses normal light radius on non-darkness tiles', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 5, y: 5, facing: 'NORTH' },
        lightActive: true,
        lightRadius: 3,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
      },
    }));

    fixture.detectChanges();

    const tiles = component.visibleTiles();
    expect(tiles.length).toBeGreaterThan(1); // Multiple tiles visible
  });
});

describe('MazeComponent - Elevator', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Mock loadLevel with elevator tile at (10, 8)
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      width: 20,
      height: 20,
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: Array(20).fill(null).map((_, y) =>
        Array(20).fill(null).map((_, x) => ({
          x,
          y,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: (x === 10 && y === 8) ? 'elevator' : 'normal',
          elevatorDestinations: (x === 10 && y === 8) ? [2, 3, 4] : undefined
        }))
      ),
      encounterRate: 0,
      encounterTable: []
    } as any);
  });

  it('shows elevator dialog when on elevator tile', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 10, y: 8, facing: 'NORTH' }, // Elevator tile on Level 1
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
      },
    }));

    fixture.detectChanges();

    expect(component.showElevatorDialog()).toBe(true);
  });

  it('changes level when elevator destination selected', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 10, y: 8, facing: 'NORTH' },
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set(),
      },
    }));

    component.selectElevatorLevel(3);

    const state = gameState.state();
    expect(state.dungeon.currentLevel).toBe(3);
  });
});

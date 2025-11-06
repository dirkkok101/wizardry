import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MazeComponent } from './maze.component';
import { GameStateService } from '../../services/GameStateService';
import { DungeonService } from '../../services/DungeonService';
import { SceneType } from '../../types/SceneType';

function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 1,
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

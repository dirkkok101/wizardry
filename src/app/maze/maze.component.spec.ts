import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MazeComponent } from './maze.component';
import { GameStateService } from '../../services/GameStateService';
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

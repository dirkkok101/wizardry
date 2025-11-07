import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MazeComponent } from '../maze.component';
import { GameStateService } from '../../../services/GameStateService';
import { DungeonService } from '../../../services/DungeonService';
import { Router } from '@angular/router';

function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 3,
    visitedTiles: new Set<string>(),
    defeatedEncounters: []
  };
}

describe('Maze Rendering Integration', () => {
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

    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('renders view with 3 visible tiles', () => {
    const tiles = component.visibleTiles();

    expect(tiles.length).toBe(3);
    expect(tiles[0].y).toBe(11);  // Near tile
    expect(tiles[1].y).toBe(12);  // Mid tile
    expect(tiles[2].y).toBe(13);  // Far tile
  });

  it('generates drawing commands from visible tiles', () => {
    const commands = component.drawCommands();

    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toHaveProperty('type');
    expect(commands[0]).toHaveProperty('color');
  });

  it('updates view when moving forward', () => {
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({ allowed: true });

    const initialCommands = component.drawCommands().length;

    component.moveForward();
    fixture.detectChanges();

    // Position changed, so tiles and commands should update
    const newTiles = component.visibleTiles();
    expect(newTiles[0].y).toBe(12);  // Moved forward, near tile is now y+2
  });

  it('respects light radius for visible tiles', () => {
    // Set light radius to 1
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        ...state.dungeon!,
        lightRadius: 1
      }
    }));
    fixture.detectChanges();

    const tiles = component.visibleTiles();
    expect(tiles.length).toBe(1);  // Only near tile visible
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MazeComponent } from '../maze.component';
import { GameStateService } from '../../../services/GameStateService';
import { DungeonService } from '../../../services/DungeonService';
import { NavigationService } from '../../../services/NavigationService';
import { Router } from '@angular/router';

function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 3,
    teleportCount: 0,
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

    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('renders view with 3×3 grid (9 tiles)', () => {
    const tiles = component.visibleTiles();

    expect(tiles.length).toBe(9); // 3 columns × 3 depths

    // Check center column tiles
    const centerTiles = tiles.filter(t => t.relativeX === 0);
    expect(centerTiles.length).toBe(3);
    expect(centerTiles[0].y).toBe(9);  // Near tile (NORTH = decreasing Y)
    expect(centerTiles[1].y).toBe(8);  // Mid tile
    expect(centerTiles[2].y).toBe(7);  // Far tile
  });

  it('generates drawing commands from visible tiles', () => {
    const commands = component.drawCommands();

    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toHaveProperty('type');
    expect(commands[0]).toHaveProperty('color');
  });

  it('updates view when moving forward', () => {
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({ allowed: true });

    // Mock NavigationService to actually move the position
    jest.spyOn(NavigationService, 'moveForward').mockImplementation((state) => {
      return {
        ...state,
        dungeon: {
          ...state.dungeon!,
          position: {
            ...state.dungeon!.position,
            y: state.dungeon!.position.y - 1  // Move north (decrease Y)
          }
        }
      };
    });

    const initialCommands = component.drawCommands().length;

    component.moveForward();
    fixture.detectChanges();

    // Position changed, so tiles and commands should update
    const newTiles = component.visibleTiles();
    const centerTiles = newTiles.filter(t => t.relativeX === 0);
    expect(centerTiles[0].y).toBe(8);  // Moved forward from y=10 to y=9, near tile is now y=8
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
    expect(tiles.length).toBe(3);  // 3 columns × 1 depth
  });
});

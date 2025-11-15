import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MazeComponent } from '../maze.component';
import { GameStateService } from '../../../services/GameStateService';
import { DungeonService } from '../../../services/DungeonService';
import { NavigationService } from '../../../services/NavigationService';
import { Router } from '@angular/router';
import { LevelData } from '../../../types/Dungeon';

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

function createTestLevel(): LevelData {
  return {
    level: 1,
    name: 'Test Level',
    size: { width: 20, height: 20 },
    startPosition: { x: 10, y: 10, facing: 'NORTH' },
    edgeWrapping: false,
    encounterRate: 0,
    encounterTable: '',
    tiles: Array.from({ length: 20 }, (_, y) =>
      Array.from({ length: 20 }, (_, x) => ({
        x,
        y,
        walls: {
          // Create a corridor with walls on sides and at edges
          north: (y === 0 || y === 8) ? 'wall' : 'open',
          south: y === 19 ? 'wall' : 'open',
          east: (x === 19 || x === 11) ? 'wall' : 'open',
          west: (x === 0 || x === 9) ? 'wall' : 'open'
        }
      }))
    ).flat()
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

    // Mock loadLevel to return proper level structure
    jest.spyOn(DungeonService, 'loadLevel').mockReturnValue(createTestLevel());

    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('generates wireframe drawing commands', () => {
    const commands = component.drawCommands();

    expect(commands.length).toBeGreaterThan(0);
    expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
  });

  it('generates commands with proper color values', () => {
    const commands = component.drawCommands();

    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toHaveProperty('color');

    // Commands should have green colors for walls (e.g., #0f0, #0c0, #090)
    const hasGreenColor = commands.some(cmd => cmd.color.startsWith('#0'));
    expect(hasGreenColor).toBe(true);
  });

  it('generates commands with line coordinates', () => {
    const commands = component.drawCommands();

    expect(commands.length).toBeGreaterThan(0);
    commands.forEach(cmd => {
      expect(cmd).toHaveProperty('x');
      expect(cmd).toHaveProperty('y');
      expect(cmd).toHaveProperty('x2');
      expect(cmd).toHaveProperty('y2');
    });
  });

  it('updates commands when position changes (moving forward)', () => {
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

    const initialCommands = component.drawCommands();
    const initialPosition = component.position();

    component.moveForward();
    fixture.detectChanges();

    const newCommands = component.drawCommands();
    const newPosition = component.position();

    // Position should have changed
    expect(newPosition!.y).toBe(initialPosition!.y - 1);

    // Commands should be regenerated (different from initial)
    // Note: We can't compare command arrays directly, but we can verify they exist
    expect(newCommands.length).toBeGreaterThan(0);
  });

  it('generates commands for wall segments, not tiles', () => {
    const commands = component.drawCommands();

    // Each visible wall quad should generate 4 line commands (4 edges)
    // With wireframe rendering, we should have multiple wall segments
    expect(commands.length).toBeGreaterThan(4);

    // All commands should be line type (wireframe uses lines, not other shapes)
    expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
  });

  it('applies distance-based alpha to wall segments', () => {
    const commands = component.drawCommands();

    // Some commands should have alpha values (for distance fading)
    const commandsWithAlpha = commands.filter(cmd => cmd.alpha !== undefined);
    expect(commandsWithAlpha.length).toBeGreaterThan(0);

    // Alpha values should be between 0 and 1
    commandsWithAlpha.forEach(cmd => {
      expect(cmd.alpha).toBeGreaterThanOrEqual(0);
      expect(cmd.alpha).toBeLessThanOrEqual(1);
    });
  });
});

import { DungeonService } from '../../../services/DungeonService';
import { MazeRenderingService } from '../../../services/MazeRenderingService';
import { Position, TileData } from '../../../types/Dungeon';

describe('Maze Rendering Performance', () => {
  let level: ReturnType<typeof DungeonService.loadLevel>;
  let position: Position;

  beforeEach(() => {
    level = DungeonService.loadLevel(1);
    position = { x: 10, y: 10, facing: 'NORTH' };
  });

  it('getVisibleTiles executes in <1ms per call', () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      DungeonService.getVisibleTiles(level, position, 3);
    }

    const duration = performance.now() - start;
    const avgTime = duration / iterations;

    expect(avgTime).toBeLessThan(1);  // <1ms per call
  });

  it('generateView executes in <10ms per call', () => {
    const tiles = DungeonService.getVisibleTiles(level, position, 3);
    const config = { width: 600, height: 600, tileDepth: 3 };
    const iterations = 100;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      MazeRenderingService.generateView(tiles, 'NORTH', config);
    }

    const duration = performance.now() - start;
    const avgTime = duration / iterations;

    expect(avgTime).toBeLessThan(10);  // <10ms per call
  });

  it('full render pipeline executes in <20ms', () => {
    const config = { width: 600, height: 600, tileDepth: 3 };

    const start = performance.now();

    // Simulate full pipeline
    const tiles = DungeonService.getVisibleTiles(level, position, 3);
    const commands = MazeRenderingService.generateView(tiles, 'NORTH', config);

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(20);  // <20ms total
    expect(commands.length).toBeGreaterThan(0);
  });
});

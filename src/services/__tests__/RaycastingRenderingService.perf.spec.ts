import { RaycastingRenderingService } from '../RaycastingRenderingService';
import { DungeonService } from '../DungeonService';

describe('RaycastingRenderingService - Performance', () => {
  let service: RaycastingRenderingService;

  beforeEach(() => {
    service = new RaycastingRenderingService();
  });

  it('should render full screen in <15ms', () => {
    const level = DungeonService.loadLevel(1);
    const position = { x: 10, y: 10, facing: 'NORTH' as const };
    const config = {
      width: 600,
      height: 600,
      tileDepth: 10,
      peripheralColumns: 5
    };

    // Warm up (first run may include JIT compilation)
    service.generateRaycastCommands(level, position, config);

    // Measure performance
    const start = performance.now();
    const commands = service.generateRaycastCommands(level, position, config);
    const end = performance.now();

    const renderTime = end - start;

    console.log(`Raycasting render time: ${renderTime.toFixed(2)}ms`);
    console.log(`Commands generated: ${commands.length}`);

    expect(renderTime).toBeLessThan(15);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should maintain performance over multiple frames', () => {
    const level = DungeonService.loadLevel(1);
    const config = {
      width: 600,
      height: 600,
      tileDepth: 10,
      peripheralColumns: 5
    };

    const frameTimes: number[] = [];

    // Simulate 60 frames (1 second at 60 FPS)
    for (let i = 0; i < 60; i++) {
      const position = {
        x: 10 + Math.floor(i / 20),
        y: 10,
        facing: (['NORTH', 'EAST', 'SOUTH', 'WEST'] as const)[i % 4]
      };

      const start = performance.now();
      service.generateRaycastCommands(level, position, config);
      const end = performance.now();

      frameTimes.push(end - start);
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    const maxFrameTime = Math.max(...frameTimes);

    console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
    console.log(`Max frame time: ${maxFrameTime.toFixed(2)}ms`);

    expect(avgFrameTime).toBeLessThan(15);
    expect(maxFrameTime).toBeLessThan(20);
  });
});

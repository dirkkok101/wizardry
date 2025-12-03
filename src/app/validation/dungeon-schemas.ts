import { z } from 'zod';

/**
 * Zod schemas for validating dungeon level JSON data
 * These ensure map files have the correct structure before loading
 */

// Basic enums
export const DirectionSchema = z.enum(['north', 'south', 'east', 'west'])
  .transform((val) => val.toUpperCase() as 'NORTH' | 'SOUTH' | 'EAST' | 'WEST');

export const WallTypeSchema = z.enum([
  'open',
  'wall',
  'door',
  'secret',
  'locked_door',
  'illusion',
  'stairs_up',
  'stairs_down',
]);

export const TileTypeSchema = z.enum([
  'stairs_up',
  'stairs_down',
  'teleporter',
  'spinner',
  'chute',
  'pit',
  'darkness_zone_start',
  'darkness_zone_end',
  'darkness',
  'anti_magic',
  'searchable',
  'fixed_encounter',
  'message',
  'elevator',
  'door',
  'locked_tile',
  'sliding_wall',
  'chest',
  'room',  // Room tiles for encounter mechanics (12.5% door-kick encounters)
]);

// Complex structures
export const TileWallsSchema = z.object({
  north: WallTypeSchema,
  east: WallTypeSchema,
  south: WallTypeSchema,
  west: WallTypeSchema,
});

export const DestinationSchema = z.object({
  type: z.enum(['castle', 'level']).optional(),
  level: z.number().int().min(1).max(10).optional(),
  x: z.number().int().min(0).max(19).optional(),
  y: z.number().int().min(0).max(19).optional(),
});

export const TileDataSchema = z.object({
  x: z.number().int().min(0).max(19),
  y: z.number().int().min(0).max(19),
  walls: TileWallsSchema,
  types: z.array(TileTypeSchema).optional(),
  destination: DestinationSchema.optional(),
  message: z.string().optional(),
  item: z.string().optional(),
  promptSearch: z.boolean().optional(),
  encounterId: z.string().optional(),
  repeatable: z.boolean().optional(),
  cannotFlee: z.boolean().optional(),
  isOneWay: z.boolean().optional(),
  destinations: z.array(DestinationSchema).optional(),
  locked: z.boolean().optional(),
});

export const StartPositionSchema = z.object({
  x: z.number().int().min(0).max(19),
  y: z.number().int().min(0).max(19),
  facing: DirectionSchema,
});

export const SizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const LevelDataSchema = z.object({
  level: z.number().int().min(1).max(10),
  name: z.string().min(1),
  size: SizeSchema,
  startPosition: StartPositionSchema,
  edgeWrapping: z.boolean(),
  tiles: z.array(TileDataSchema),
  encounterRate: z.number().min(0).max(1),
  encounterTable: z.string().min(1),
});

// Root schema for the JSON file format
export const LevelFileSchema = z.object({
  levels: z.array(LevelDataSchema).min(1),
});

/**
 * Custom refinements for business logic validation
 */
export const ValidatedLevelDataSchema = LevelDataSchema.refine(
  (data) => {
    // Ensure stairs walls have destination data
    for (const tile of data.tiles) {
      const hasStairsWall = Object.values(tile.walls).some(
        (wallType) => wallType === 'stairs_up' || wallType === 'stairs_down'
      );

      if (hasStairsWall && !tile.destination) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Tiles with stairs walls must have destination data',
  }
).refine(
  (data) => {
    // Ensure no duplicate tile coordinates
    const seen = new Set<string>();
    for (const tile of data.tiles) {
      const key = `${tile.x},${tile.y}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
    }
    return true;
  },
  {
    message: 'Duplicate tile coordinates found',
  }
).refine(
  (data) => {
    // Ensure size matches expected Wizardry dimensions
    return data.size.width === 20 && data.size.height === 20;
  },
  {
    message: 'Level size must be 20x20',
  }
);

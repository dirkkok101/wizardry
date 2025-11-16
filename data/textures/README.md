# Texture Atlas System

This directory contains texture atlases for the dungeon raycasting renderer.

## File Structure

- `*.json` - Texture atlas metadata files
- `*.png` - Sprite sheet images referenced by the metadata

## Texture Atlas Format

Each JSON file defines a texture atlas with the following structure:

```json
{
  "id": "unique_atlas_id",
  "description": "Human-readable description",
  "imagePath": "/assets/textures/sprite-sheet.png",
  "width": 512,
  "height": 512,
  "textures": [
    {
      "id": "texture_id",
      "x": 0,
      "y": 0,
      "width": 64,
      "height": 64,
      "tags": ["wall", "ns", "stone"]
    }
  ]
}
```

### Required Fields

- **id**: Unique identifier for this atlas
- **imagePath**: Path to the sprite sheet PNG file
- **width**: Total width of sprite sheet in pixels
- **height**: Total height of sprite sheet in pixels
- **textures**: Array of texture definitions

### Texture Definition

Each texture in the `textures` array has:

- **id**: Unique identifier for this texture
- **x**: X coordinate in sprite sheet (pixels)
- **y**: Y coordinate in sprite sheet (pixels)
- **width**: Texture width (pixels, typically 64)
- **height**: Texture height (pixels, typically 64)
- **tags**: Array of classification tags

### Tags System

Tags are used to organize textures into functional groups:

**Wall Orientation**:
- `ns` - North-south walls (vertical in 2D map)
- `ew` - East-west walls (horizontal in 2D map)

**Wall Types**:
- `wall` - Standard walls
- `door` - Regular doors
- `locked` - Locked doors (requires `door` tag)
- `secret` - Secret doors

**Floor/Ceiling**:
- `floor` - Floor textures (for future floor casting)
- `ceiling` - Ceiling textures (for future ceiling casting)

**Material**:
- `stone`, `brick`, `wood`, `metal`, `dirt`, etc.

## Getting Textures

### Option 1: Download from Spriters Resource

1. Visit [The Spriters Resource - Eye of the Beholder](https://www.spriters-resource.com/ms_dos/eyeofthebeholder/)
2. Download wall texture sheets (e.g., "Level 01-03", "Level 04-06")
3. Save PNG files to this directory
4. Create or update JSON metadata files to match sprite sheet layout

### Option 2: Create Your Own

1. Create a 512x512 (or larger) PNG sprite sheet
2. Arrange 64x64 texture tiles in a grid
3. Create a JSON metadata file defining each texture's position
4. Use descriptive IDs and tags for organization

### Option 3: Procedural Generation

Use the texture generation utilities (future feature) to create dungeon-style textures programmatically.

## Using Texture Atlases

### Loading in Code

```typescript
import { AssetLoadingService } from './services/AssetLoadingService';

const assetLoader = new AssetLoadingService();

// Load texture atlases
const textureSets = await assetLoader.loadTextureAtlases([
  '/assets/textures/eob-dungeon-level-01.json',
  '/assets/textures/eob-dungeon-level-02.json'
]);

// Get specific texture set
const dungeonTextures = textureSets.get('eob_dungeon_level_01');
```

### Rendering with Textures

```typescript
import { RaycastingRenderingService } from './services/RaycastingRenderingService';

const renderer = new RaycastingRenderingService();

// Generate textured raycast commands
const commands = renderer.generateRaycastCommands(
  level,
  playerPosition,
  viewportConfig,
  dungeonTextures  // Pass texture set here
);
```

## Performance Considerations

- **Texture Size**: 64x64 is optimal for retro dungeon crawlers
- **Atlas Size**: Keep sprite sheets under 2048x2048 for browser compatibility
- **Caching**: The texture system automatically caches slices (max 1000 slices ≈ 4MB)
- **Memory**: Each texture set loads ~2-8MB depending on atlas size

## Example Atlas Layouts

### Simple Layout (8x8 grid)
```
64x64 textures in 512x512 sprite sheet:
- Row 0: NS walls (0-7)
- Row 1: EW walls (0-7)
- Row 2: Doors (0-7)
- Row 3: Floors (0-7)
- Row 4: Ceilings (0-7)
- Rows 5-7: Reserved
```

### EoB-Style Layout
```
Matches original Eye of the Beholder sprite sheets:
- Walls organized by theme/level
- Variations for distance (near/mid/far)
- Special tiles (alcoves, decorations)
```

## Troubleshooting

**Textures not loading?**
- Check `imagePath` matches actual file location
- Verify PNG file exists and is readable
- Check browser console for errors

**Wrong textures displaying?**
- Verify tags match expected values ('ns', 'ew', 'door', etc.)
- Check texture coordinates (x, y, width, height)
- Ensure texture IDs are unique

**Performance issues?**
- Reduce texture atlas size
- Lower cache size in `TextureRenderConfig`
- Use fewer texture variations per level

## See Also

- `docs/services/TextureAtlasService.md` - Service documentation
- `docs/services/AssetLoadingService.md` - Asset loading documentation
- `src/types/texture.types.ts` - TypeScript type definitions

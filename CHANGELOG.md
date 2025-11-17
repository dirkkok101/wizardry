# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Stairs Wall Texture System** - Stairs can now be represented as wall types (stairs_up, stairs_down) instead of only tile types
  - New wall types: `stairs_up` and `stairs_down` in WallType enum
  - Wall-based stairs trigger immediately when walking into the wall (before position update)
  - Stairs textures render on specific walls based on wall type property
  - Map validation ensures all stairs walls have destination data
  - 18 comprehensive integration tests covering end-to-end stairs functionality
  - Documentation: Complete system docs for dungeon navigation and stairs mechanics

### Changed
- **DungeonService.canMove()** - Now detects stairs walls and returns `triggersSpecialAction: 'stairs'` with destination data
- **NavigationService.moveForward()** - Checks for stairs special action before updating position
- **WebGLRenderingService.selectWallTexture()** - Selects stairs textures based on wall type (wall direction) instead of tile type
- **GameState.dungeon** - Made optional to properly represent castle transitions (dungeon becomes undefined)

### Technical Details
- Extended MovementValidation interface with `triggersSpecialAction` and `destination` fields
- Added DungeonService.validateStairsWalls() for map validation
- Added NavigationService.handleStairsTransition() for both castle and level-to-level transitions
- Texture atlas supports stairs_up (384,0) and stairs_down (320,0) textures
- Maintains backward compatibility with tile-based stairs for existing maps

## [Previous Releases]

### Phase 6 - Town Service Completion & Castle Integration
- Complete implementation of all town services (Tavern, Inn, Temple, Shop, Training Grounds, Utilities)
- 501 total tests passing, 89.07% code coverage
- Performance optimized: test suite runs in <8 seconds

### Phase 5 - Town Service Business Logic
- Temple, Shop, and Training Grounds services implemented
- Character creation wizard with 7-step flow
- 336 total tests passing in <4 seconds

### Phases 1-4 - Core Architecture & Angular Migration
- Angular project structure with Angular CLI
- Migration from Vite to Angular build system
- Migration from Vitest to Jest testing framework
- Service layer migration (13+ core services)
- Game data files and documentation preserved

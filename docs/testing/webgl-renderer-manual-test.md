# WebGL Renderer - Manual Testing Checklist

## Pre-Test Setup

- [ ] Build application: `npm run build`
- [ ] Start dev server: `npm start`
- [ ] Open browser to `http://localhost:4200`
- [ ] Open browser DevTools console

## Test 1: WebGL Initialization

**Steps**:
1. Start new game or load existing save
2. Navigate to dungeon entrance
3. Enter dungeon

**Expected Results**:
- [ ] Console shows: "[MazeComponent] WebGL renderer initialized successfully"
- [ ] Console shows: "[MazeComponent] Texture uploaded to GPU"
- [ ] No WebGL errors in console
- [ ] Canvas element visible

## Test 2: Texture Rendering

**Steps**:
1. Observe the initial dungeon view

**Expected Results**:
- [ ] Walls render with stone textures (not solid colors)
- [ ] Floor renders with floor texture
- [ ] Ceiling renders with ceiling texture
- [ ] Textures are pixel-perfect (not blurry)
- [ ] No black triangles or artifacts

## Test 3: Movement and Camera Updates

**Steps**:
1. Press W to move forward
2. Press S to move backward
3. Press A to turn left
4. Press D to turn right
5. Press Q to strafe left
6. Press E to strafe right

**Expected Results**:
- [ ] View updates immediately with each movement
- [ ] New walls appear as you move forward
- [ ] Walls disappear as you move backward
- [ ] Turning rotates the view smoothly
- [ ] Strafing maintains facing direction

## Test 4: Special Tile Types

**Steps**:
1. Navigate to a tile with stairs
2. Observe stairs rendering
3. Navigate to a tile with a door
4. Observe door rendering

**Expected Results**:
- [ ] Stairs render with stairs texture (not regular wall)
- [ ] Doors render with door texture (not regular wall)
- [ ] Special tiles are clearly distinguishable

## Test 5: Wall Variations

**Steps**:
1. Move down a long corridor
2. Observe the wall textures on left and right

**Expected Results**:
- [ ] Walls alternate between stone_wall_01 and stone_wall_02
- [ ] Checkerboard pattern visible (not all same texture)
- [ ] Variation adds visual interest

## Test 6: Depth and Fog

**Steps**:
1. Look down a long corridor
2. Observe distant walls

**Expected Results**:
- [ ] Distant walls are darker (fog effect)
- [ ] Fog increases with distance
- [ ] Far walls fade to black
- [ ] Fog adds depth perception

## Test 7: Performance

**Steps**:
1. Open DevTools Performance tab
2. Start recording
3. Move through dungeon for 10 seconds
4. Stop recording
5. Analyze frame timeline

**Expected Results**:
- [ ] Consistent frame rate (60 FPS target)
- [ ] No significant frame drops
- [ ] GPU draw calls: 1-2 per frame (not 50-100)
- [ ] Smooth rendering performance

## Test 8: Error Handling

**Steps**:
1. Test in browser without WebGL support (if possible)

**Expected Results**:
- [ ] Error message displayed (not blank screen)
- [ ] Console shows initialization failure
- [ ] Application doesn't crash

## Test Results

**Date**: _____________
**Tester**: _____________
**Browser**: _____________
**OS**: _____________

**Overall Status**: ☐ PASS  ☐ FAIL  ☐ PARTIAL

**Notes**:

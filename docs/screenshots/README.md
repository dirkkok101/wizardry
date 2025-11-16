# Screenshots Directory

This directory stores visual documentation for the Wizardry remake project.

## Enhanced Texture Rendering Screenshots

For manual testing of the enhanced raycasting texture rendering (Task 8), please save screenshots with the following naming convention:

### Required Screenshots

1. **enhanced-texture-rendering-overview.png**
   - General view showing wall textures, stairs, and doors
   - Recommended: Mid-distance view with multiple features visible

2. **wall-variation-checkerboard.png**
   - Close-up showing wall texture variation pattern
   - Should clearly show stone_wall_01 and stone_wall_02 alternating

3. **stairs-texture-rendering.png**
   - View of stairs tile with stairs_down texture visible
   - Recommended: 1-2 tiles away, centered in view

4. **door-closed-texture.png**
   - View of closed door showing door_closed texture
   - Recommended: Facing door directly, 1-2 tiles away

5. **door-open-texture.png** (if door interaction implemented)
   - View of open door showing door_open texture
   - Same position as door-closed-texture.png for comparison

6. **texture-quality-distance.png**
   - Long corridor or hallway showing textures at various distances
   - Should demonstrate distance fog/brightness

### Optional Screenshots

- **console-no-errors.png** - Browser DevTools showing no errors
- **performance-60fps.png** - Browser performance tab showing 60 FPS
- **any-issues-found.png** - Document any visual bugs or problems

## Screenshot Guidelines

### How to Capture

**Chrome/Edge:**
1. Open DevTools (F12)
2. Click Device Toolbar icon (Ctrl+Shift+M)
3. Click "Capture screenshot" icon
4. Save to this directory

**Firefox:**
1. Open DevTools (F12)
2. Click "..." menu → "Take a screenshot"
3. Choose "Save full page" or "Save visible"
4. Save to this directory

**Safari:**
1. Enable Developer menu (Preferences → Advanced)
2. Develop → Show Web Inspector
3. Use macOS screenshot tool (Cmd+Shift+4)
4. Save to this directory

### Best Practices

- Use descriptive filenames (lowercase, hyphens, .png extension)
- Capture at actual browser resolution (don't resize window unnecessarily)
- Ensure maze view is in focus (not obscured by menus)
- Include relevant UI elements (party status, message log, etc.)
- Avoid capturing with browser chrome (omit URL bar, bookmarks, etc.)
- Save as PNG format for best quality

## File Organization

Screenshots should be organized by feature or date:

```
docs/screenshots/
├── README.md (this file)
├── enhanced-texture-rendering-overview.png
├── wall-variation-checkerboard.png
├── stairs-texture-rendering.png
├── door-closed-texture.png
├── door-open-texture.png
└── texture-quality-distance.png
```

## Reference

For complete testing procedures, see:
- `/docs/plans/2025-11-16-enhanced-textures-manual-testing.md`
- `/docs/plans/2025-11-16-task-8-status-report.md`

---

**Note:** This directory is tracked by git. Commit screenshots after completing manual testing.

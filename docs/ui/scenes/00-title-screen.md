# Title Screen

## Overview

**Description:** Application startup screen and entry point to the game. First screen displayed when launching Wizardry. Features iconic Apple II bitmap graphic with single-action interface.

**Scene Type:** System Screen (no save state)

**Location in Game Flow:** Application entry point - one-way transition to Castle Menu or Camp

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Application launch → Title Screen
- Edge of Town → (L)eave Game → Exit application → Title Screen (on next launch)

**On First Launch:**
- New installation starts here
- No save data exists

### Requirements

**State Requirements:**
- [ ] Application initialized
- [ ] No previous scene (entry point)

**Note:** This is the only scene with no parent in active session. Once you start the game, you cannot return to Title Screen without exiting.

### State Prerequisites

```typescript
interface TitleScreenEntryState {
  appInitialized: boolean  // Must be true
  saveDataExists: boolean  // Optional, for load detection
}
```

---

## UI Layout

### Screen Regions

- **Header:** Iconic Apple II bitmap graphic (Wizardry logo + dragon/Werdna art)
- **Subtitle:** "Proving Grounds of the Mad Overlord"
- **Main:** Single interactive button (Start)
- **Footer:** Copyright/version information

### ASCII Mockup

```
┌─────────────────────────────────────┐
│                                     │
│    [WIZARDRY BITMAP GRAPHIC]        │
│    (Apple II title + dragon art)    │
│                                     │
│   Proving Grounds of the Mad        │
│          Overlord                   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │         (S)TART               │  │  ← Interactive when ready
│  └───────────────────────────────┘  │
│                                     │
│  Copyright 1981 Sir-Tech Software   │
│  Version 1.0                        │
│                                     │
└─────────────────────────────────────┘
```

**Loading State:**
```
  ┌───────────────────────────────┐
  │       Loading...              │  ← Disabled, no hover effect
  └───────────────────────────────┘
```

**Ready State:**
```
  ┌───────────────────────────────┐
  │         (S)TART               │  ← Glowing/pulsing, clickable
  └───────────────────────────────┘
```

**Visual Notes:**
- Bitmap graphic: Iconic Apple II Wizardry title screen (Werdna/dragon artwork)
- Image scaling: Use `image-rendering: pixelated` for crisp pixel art
- Display at 2x or 3x scale for modern screens
- Minimal interface: Single action button (no menu complexity)
- Button states: Clear visual distinction between loading and ready
- Atmospheric effects: Subtle animations (torch flicker, mist, optional CRT scanlines)
- (S) keyboard shortcut shown inline within button label
- Large clickable target area (good for touch/mobile web)

---

## Boot Sequence & Loading Flow

**Application Launch:**

When the web app loads:
1. **Initial render** - Show Title Screen immediately with "Loading..." button (disabled)
2. **Parallel asset loading** - Background: Load bitmap graphic, sprites, sounds, fonts, data files (items, spells, races, classes)
3. **Save detection** - Check localStorage for `wizardry_save` key
4. **Save validation** - If exists: deserialize and validate structure; if corrupt: flag for new game init
5. **Asset completion** - When all assets loaded: animate button from "Loading..." to "(S)TART" with subtle pulse/glow effect
6. **Ready state** - Button now interactive (both S key and click enabled)

**Atmospheric Loading:**
- Title bitmap fades in or appears with subtle effect
- Subtle dungeon ambient animation (torch flicker, mist, optional CRT scanlines)
- Makes 1-3 second load feel intentional, not technical
- No explicit progress bar - the atmosphere IS the progress indicator

**On Start:**
- Determine target scene: `party.inMaze ? Camp : CastleMenu`
- Transition with fade effect
- If new game: Initialize empty roster, 0 gold, starting game state
- If continuing: Restore full state from save

---

## Available Actions

### (S) Start the Game

**Description:** Begin playing or load existing save - the only action available from Title Screen

**Key Binding:** S (case-insensitive) OR Click/Tap button

**Requirements:**
- Assets fully loaded (button enabled)

**Flow:**
1. User presses 'S' or clicks button
2. Determine destination based on save state
3. Transition to Castle Menu or Camp

**Validation:**

```typescript
function canStartGame(state: TitleScreenState): { allowed: boolean; reason?: string } {
  if (!state.assetsLoaded) {
    return { allowed: false, reason: "Assets still loading" }
  }
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.CASTLE_MENU` (or CAMP)
- Load save data if exists
- Initialize new game if no save

**UI Feedback:**
- Button transition from "Loading..." to "(S)TART"
- Pulse/glow effect when ready
- Fade transition to next scene

**Transitions:**
- → Castle Menu (if not IN_MAZE or no save)
- → Camp (if party was IN_MAZE)

---

### Invalid Key or Click

**Description:** User presses any key other than 'S', or clicks while button is disabled (loading state)

**Behavior:**
- Beep sound (optional)
- No error message (silent rejection)
- Remain on Title Screen
- If button still loading: No response to click/tap

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Start Game | (S) or Click | Castle Menu or Camp | Assets loaded |

**Note:** This is a one-way screen. Once you (S)tart, you cannot return to Title Screen without exiting the application.

### Parent Scene

- None (application entry point)

### Child Scenes

- Title Screen → (S) → Castle Menu (new game or party not IN_MAZE)
- Title Screen → (S) → Camp (if party was IN_MAZE)

---

## State Management

### Scene State

```typescript
interface TitleScreenState {
  mode: 'LOADING' | 'READY' | 'TRANSITIONING'
  assetsLoaded: boolean
  saveDataDetected: boolean
  saveDataValid: boolean
  lastInput: string | null
}
```

**State Transitions:**
1. **LOADING** - Initial state, assets loading, button disabled
2. **READY** - Assets loaded, button enabled and interactive
3. **TRANSITIONING** - User activated start, fading to next scene

**Notes:**
- Button state driven by `assetsLoaded` flag
- Save detection happens during loading
- Invalid save data triggers new game initialization

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.TITLE_SCREEN`
- No game data loaded yet
- Application initialized

**On Exit (Start Game):**
- Load save data if exists
- Initialize new game if no save
- Transition to Castle Menu or Camp

### Persistence

- **Auto-save:** No (nothing to save)
- **Manual save:** No (not available from Title Screen)
- **Safe zone:** Yes (no game state active)

---

## Implementation Notes

### Services Used

- `SceneNavigationService.transitionTo(SceneType.TITLE_SCREEN)`
- `AssetLoadingService.loadTitleAssets()` - Bitmap, fonts, initial data
- `AssetLoadingService.loadGameAssets()` - Sprites, sounds, items, spells, etc.
- `SaveService.checkForSaveData()`
- `SaveService.validateSaveData()`
- `SaveService.loadGame()`
- `InputService.waitForSingleKeystroke()`
- `InputService.onButtonClick()`

### Commands

- `StartGameCommand` - Load or initialize game and transition to Castle Menu/Camp

### Asset Loading Strategy

**Critical Path (for initial render):**
- Title screen bitmap (small, < 10KB PNG)
- UI fonts
- Basic UI sounds (optional beep)

**Parallel Loading (during "Loading..." state):**
- All sprite sheets (characters, monsters, items)
- Sound effects and music
- Data files (items.json, spells.json, races.json, classes.json)
- Map data

**Bitmap Handling:**
- Format: PNG (preserve pixel art quality)
- Scaling: CSS `image-rendering: pixelated` or `crisp-edges`
- Display: 2x or 3x scale for modern displays
- Animation: Fade in on load or appear with subtle effect
- Optional: Color cycling effect on dragon (classic Apple II)

### Edge Cases

1. **Asset loading failure:**
   - Show error message: "Failed to load game assets. Please refresh."
   - Keep button in disabled state
   - Provide retry mechanism or refresh prompt
   - Log specific asset failures for debugging

2. **Asset loading timeout:**
   - If loading takes > 10 seconds, show warning
   - Provide "Continue anyway" option for slow connections
   - Consider partial loading fallback

3. **No save data exists:**
   - Initialize new game
   - Create empty character roster
   - Set starting gold to 0
   - Transition to Castle Menu

4. **Corrupted save data:**
   - Detect during validation phase
   - Set `saveDataValid = false`
   - Auto-initialize new game (no prompt needed)
   - Optionally log corruption details

5. **Party was IN_MAZE:**
   - Load to Camp scene instead of Castle Menu
   - Preserve dungeon state (position, facing, level)
   - Allow player to continue or (C)astle to return to town

6. **Multiple save slots (modern enhancement):**
   - Could show save slot selection before Castle Menu
   - Allow player to choose which save to load
   - Display save slot info (date, party level, location)

### Technical Considerations

- **Bitmap rendering:** Use CSS `image-rendering: pixelated` for crisp pixel art scaling
- **Responsive design:** Bitmap should scale proportionally on different screen sizes (mobile, tablet, desktop)
- **Accessibility:**
  - Button must have proper ARIA states (`aria-busy="true"` during loading, `aria-disabled="false"` when ready)
  - Screen reader announcement when button transitions to ready state
  - Keyboard navigation fully supported (S key)
  - Sufficient color contrast for subtitle text
- **Audio:** Optional title music or ambient sound effects (dungeon atmosphere)
- **Load time:** Progressive asset loading ensures 1-3 second experience feels intentional
- **Error handling:**
  - Robust save data validation required
  - Asset loading failure recovery
  - Network timeout handling
- **Performance:** Bitmap file should be optimized (< 10KB PNG), preloaded or inlined in critical path
- **Touch/mobile:** Large button target area (minimum 44×44 CSS pixels)
- **Animation performance:** Use CSS transforms for fade/pulse effects (GPU-accelerated)

---

## Testing Scenarios

### Test 1: Fresh Install with Loading Flow

```
1. Launch application for first time
2. Verify Title Screen appears immediately with bitmap graphic
3. Verify button shows "Loading..." and is disabled
4. Verify no save data detected
5. Wait for assets to load (should be 1-3 seconds)
6. Verify button transitions to "(S)TART" with pulse/glow effect
7. Press (S) to start
8. Verify new game initialized
9. Verify Castle Menu loads with empty character roster
```

### Test 2: Load Existing Save

```
1. Launch application with existing save
2. Verify Title Screen appears with loading state
3. Verify save data detected during loading
4. Wait for button to become ready
5. Press (S) or click button to start
6. Verify save data loads
7. Verify Castle Menu loads with characters
8. Verify game state restored correctly
```

### Test 3: Load Save with Party IN_MAZE

```
1. Launch application with save where party is IN_MAZE
2. Wait for loading to complete
3. Press (S) to start
4. Verify Camp scene loads instead of Castle Menu
5. Verify dungeon position/facing preserved
6. Verify (C)astle option available to return to town
```

### Test 4: Corrupted Save Handling

```
1. Launch application with corrupted save data
2. Verify loading completes normally
3. Press (S) to start
4. Verify new game auto-initializes (no error prompt)
5. Verify Castle Menu loads with empty roster
6. (Optional) Verify corruption logged for debugging
```

### Test 5: Asset Loading Failure

```
1. Simulate network failure during asset loading
2. Verify button remains in "Loading..." state
3. Verify error message displays
4. Verify button stays disabled
5. Test retry mechanism if provided
```

### Test 6: Button States and Interaction

```
1. Launch application
2. Verify button disabled during loading (no click response)
3. Try pressing 'S' while loading - should not respond
4. Wait for loading complete
5. Verify button becomes clickable
6. Test both (S) key and mouse click
7. Verify both trigger same transition
```

### Test 7: Keyboard vs Mouse Input

```
1. Load Title Screen
2. Wait for ready state
3. Test 'S' key (case-insensitive)
4. Reload and test 's' key (lowercase)
5. Reload and test mouse click on button
6. Reload and test touch/tap on mobile
7. Verify all methods work identically
```

### Test 8: Invalid Input Handling

```
1. Load Title Screen to ready state
2. Press random keys (A, M, Enter, Space, etc.)
3. Verify no response (silent rejection)
4. Optional: verify beep sound
5. Verify Title Screen remains active
6. Verify (S) still works after invalid input
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Primary destination
- [Camp](./09-camp.md) - Destination if party was IN_MAZE
- [Edge of Town](./07-edge-of-town.md) - Contains (L)eave Game option
- [Save System](../../systems/save-system.md) - Save data handling
- [Navigation Map](../navigation-map.md) - Complete navigation flow

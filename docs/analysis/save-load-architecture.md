# Save/Load Architecture Analysis

**Comprehensive analysis of save game data requirements and recommendations.**

## Question

What should we save and load in a save game file? Should it include:
1. All events needed to get to the current state?
2. State of characters?
3. Explored state of maps?

## Current Documentation Summary

### What We Currently Save (docs/data-format/save-format.md)

Our current design uses a **hybrid event sourcing + snapshot approach** with the following IndexedDB stores:

#### 1. gameState Store
Complete game state snapshot including:

**Game Mode & Position**
- Current mode (town, navigation, combat, etc.)
- Current dungeon level
- Party position and facing direction

**Party State**
- Active party members (up to 6)
- Formation (front/back rows)
- Party gold pool
- Shared party inventory

**Character Roster**
- All created characters (max 20)
- Full character state for each:
  - Basic info (name, race, class, alignment, level, XP, age)
  - Stats (STR, INT, PIE, VIT, AGI, LUC)
  - HP (current and max)
  - Status (ok, dead, ashes, lost)
  - Active status effects (poison, paralyzed, etc.)
  - Spell points (current and max, per spell level 1-7)
  - Learned spells (spellbook)
  - Equipment (weapon, armor, shield, helmet, gauntlets, 2 accessories)
  - Personal inventory
  - Party membership flags

**Explored Maps**
- Per-level explored tile data
- Automap information

**Quest Progress**
- Quest flags (Werdna defeated, amulet retrieved, etc.)
- Keys found (bronze, silver, gold, blue ribbon)
- Encountered monsters (for identification)
- Defeated bosses

#### 2. eventLog Store
Complete event history for replay:
- Event ID (auto-incrementing)
- Save ID (links to save file)
- Timestamp
- Event type (move, attack, cast spell, level up, etc.)
- Event-specific data

#### 3. characterBodies Store
Dead character bodies in dungeon:
- Body ID
- Character ID and name
- Death location (level, x, y)
- Death timestamp
- Character snapshot (equipment, inventory)
- Status (body or ashes)
- Retrieved flag

#### 4. settings Store
User preferences:
- Graphics settings
- Audio settings
- Gameplay settings (autosave, permadeath, etc.)

### Total Data Saved

**All three items you mentioned ARE included:**
1. ✅ **Events** - Complete event log stored separately
2. ✅ **Character state** - Full character roster with all details
3. ✅ **Explored maps** - Per-level explored tile data

## Architecture Deep Dive

### Hybrid Approach: Event Sourcing + Snapshots

Our design implements **both** event sourcing and state snapshots:

```
Save File
├── Game State Snapshot (20-30KB)
│   ├── Instant loading
│   ├── Human-readable
│   └── Easy to debug
│
└── Event Log (100-200KB for 1000 events)
    ├── Deterministic replay
    ├── Verification
    └── Time-travel debugging
```

### Why This Is Optimal

#### Benefits of Hybrid Approach

**Fast Loading (from snapshot)**
- Load state directly from snapshot
- No need to replay thousands of events
- Instant resume gameplay
- Better user experience

**Deterministic Replay (from event log)**
- Can reconstruct exact game state from events
- Verify snapshot integrity
- Debug issues by replaying to specific event
- Support undo/redo functionality

**Flexibility**
- Normal load: Use snapshot (fast)
- Verification load: Replay events (accurate)
- Debug load: Replay to specific event (diagnostic)
- Recovery: If snapshot corrupted, replay events

**Development Benefits**
- Test by replaying specific event sequences
- Reproduce bugs deterministically
- Implement replay/highlight system
- Support time-travel debugging

## Alternative Approaches Comparison

### 1. Snapshot-Only (What Most Games Do)

**Saves:**
- Current game state only
- No event history

**Pros:**
- Simple to implement
- Small save files (20-30KB)
- Fast to save and load
- Less storage space

**Cons:**
- Can't verify save integrity
- Can't debug by replay
- Can't implement undo/redo
- No time-travel debugging
- Save corruption = lost game
- Difficult to detect cheating/manipulation

**Verdict:** ❌ Too risky for a roguelike with permadeath

### 2. Event Sourcing Only (Pure Event Sourcing)

**Saves:**
- Event log only
- No state snapshots

**Pros:**
- Single source of truth
- Always deterministic
- Perfect audit trail
- Can replay to any point
- Prevents save scumming (if desired)

**Cons:**
- Slow to load (must replay all events)
- Large save files for long games
- Complex to implement correctly
- Difficult to modify old saves
- Every bug must be replayed
- Can't "fix" corrupted history

**Verdict:** ❌ Too slow for 1000+ event replays on every load

### 3. Hybrid (Our Current Design)

**Saves:**
- Game state snapshot
- Complete event log
- Both stored together

**Pros:**
- Fast loading (use snapshot)
- Verifiable (replay events)
- Debuggable (replay to any event)
- Recoverable (if snapshot corrupt, use events)
- Best of both worlds

**Cons:**
- Larger save files (~200-300KB)
- More complex implementation
- Must keep snapshot and events in sync

**Verdict:** ✅ Optimal for our use case

## Recommendations

### 1. Keep Current Hybrid Approach ✅

**Rationale:**
- Perfect balance of speed and reliability
- Storage size is negligible (300KB per save, ~3MB for 10 saves)
- Modern browsers can handle this easily
- Development benefits are substantial

### 2. Implement Snapshot Verification

Add verification on load:

```typescript
async function loadGameWithVerification(slotName: string): Promise<LoadResult> {
  const saveData = await loadFromIndexedDB(slotName);

  // Load snapshot (fast)
  const snapshotState = deserializeState(saveData.state);

  // Verify by replaying events (background)
  const verifiedState = await verifyInBackground(
    saveData.eventLog,
    snapshotState
  );

  // Use snapshot for gameplay, but warn if mismatch
  if (!statesMatch(snapshotState, verifiedState)) {
    console.warn('Save snapshot mismatch - using verified state');
    return verifiedState;
  }

  return snapshotState;
}
```

**Benefits:**
- Detect corrupted saves
- Ensure snapshot/event consistency
- Automatic recovery from snapshot corruption
- Peace of mind for players

### 3. Add Periodic Snapshots in Event Log

Create snapshots every N events for faster partial replay:

```typescript
{
  eventLog: [
    { id: 1, type: "MOVE", ... },
    { id: 2, type: "ATTACK", ... },
    ...
    { id: 100, type: "SNAPSHOT", state: {...} },  // Snapshot at event 100
    { id: 101, type: "MOVE", ... },
    ...
    { id: 200, type: "SNAPSHOT", state: {...} },  // Snapshot at event 200
  ]
}
```

**Benefits:**
- Replay to event 450: Start from snapshot 400, replay 50 events
- Much faster than replaying from beginning
- Still maintains event sourcing benefits

**Implementation:**
- Create snapshot every 100 events
- Store in eventLog as special event type
- ReplayService uses nearest snapshot as starting point

### 4. Enhance Explored Maps Data

Current design stores explored tiles, but consider storing more:

```typescript
exploredMaps: {
  "1": {
    tiles: [
      {
        x: 0,
        y: 0,
        explored: true,
        lastVisited: 1635724800000,  // NEW: Timestamp
        notes: "Stairs to level 2"    // NEW: Player notes
      }
    ],
    annotations: [  // NEW: Player-added annotations
      { x: 5, y: 10, icon: "danger", text: "Murphy's Ghost" },
      { x: 10, y: 8, icon: "elevator", text: "Elevator 1" }
    ]
  }
}
```

**Benefits:**
- Players can annotate maps
- Track when areas were last visited
- Enhanced automap features
- Better navigation

### 5. Add Replay Metadata

Enhance event log with gameplay metadata:

```typescript
{
  eventId: 12345,
  timestamp: 1698765432000,
  eventType: "ATTACK",
  data: { ... },

  // NEW: Gameplay context
  context: {
    sessionId: "session-abc-123",        // Gaming session
    playTime: 7200000,                   // Total playtime
    turnNumber: 450,                     // Turn count
    combatRound: 3,                      // Combat round (if in combat)
    significance: "boss_kill"            // Highlight-worthy events
  }
}
```

**Benefits:**
- Better replay highlights (show only boss kills)
- Session analytics
- Combat turn tracking
- Highlight reel generation

### 6. Implement Differential Saves (Optional)

For autosaves, save only delta since last save:

```typescript
{
  saveId: "autosave",
  baseSave: "save1",  // Reference to full save
  delta: {
    // Only changed fields
    party: { position: { x: 11, y: 15 } },
    characters: {
      "char-1": { hp: 15 }  // Only HP changed
    }
  },
  events: [ /* Only new events since base save */ ]
}
```

**Benefits:**
- Tiny autosave files (5-10KB vs 300KB)
- Faster autosave writes
- Less IndexedDB churn
- Can reconstruct full state from base + delta

**Trade-offs:**
- More complex to implement
- Must track dependencies
- Corruption affects multiple saves
- May not be worth the complexity

**Recommendation:** Only if save performance becomes an issue

## What NOT to Save

### Static Game Data
Don't save data that's in data files:
- ❌ Class definitions (load from data/classes/)
- ❌ Race definitions (load from data/races/)
- ❌ Spell definitions (load from data/spells/)
- ❌ Item definitions (load from data/items/)
- ❌ Monster definitions (load from data/monsters/)
- ❌ Map layouts (load from data/maps/)

**Rationale:**
- Data files are the source of truth
- Saves should only store instance data
- Prevents version conflicts
- Smaller save files

### Derived State
Don't save data that can be calculated:
- ❌ Current AC (calculate from equipment + stats)
- ❌ Total damage (calculate from weapon + STR)
- ❌ Spell points max (calculate from level + stats)
- ❌ Visibility range (calculate from light + effects)
- ❌ Encounter rate (calculate from level + flags)

**Rationale:**
- Reduces save file size
- Prevents inconsistencies
- Easier to balance (update formulas, recalculate on load)
- Single source of truth

### Temporary UI State
Don't save UI-only state:
- ❌ Menu selection
- ❌ Scroll position
- ❌ Animation state
- ❌ Sound playing

**Rationale:**
- Not part of game state
- Resets on load anyway
- Saves are for game progress, not UI

## Save Format Evolution

### Version Migration Strategy

Plan for future changes:

**Version 1 (Current)**
```json
{
  "version": 1,
  "saveId": "save_1",
  "state": {...},
  "eventLog": [...]
}
```

**Version 2 (Hypothetical)**
```json
{
  "version": 2,
  "saveId": "save_1",
  "state": {...},
  "eventLog": [...],
  "newField": {...}  // New in v2
}
```

**Migration Function**
```typescript
function migrateSave(save: SaveData): SaveData {
  if (save.version === 1) {
    // Migrate v1 → v2
    return {
      ...save,
      version: 2,
      newField: defaultValue
    };
  }
  return save;
}
```

### Backward Compatibility Rules

1. **Always support previous version**
   - Current version should load saves from previous version
   - Automatically migrate on load
   - Warn user if migration occurs

2. **Never break forward compatibility silently**
   - If save is from newer version, reject with clear error
   - Prompt user to update game

3. **Store version in multiple places**
   - Save format version (data structure)
   - Game version (which release created save)
   - Helps debug compatibility issues

## Performance Considerations

### Save File Size Estimates

**Per Save:**
- Game state snapshot: 20-30KB
- Event log (1000 events): 100-200KB
- Character bodies: 5-10KB
- Total: ~200-300KB

**10 Save Slots:**
- 10 manual saves: 2-3MB
- 1 autosave: 200-300KB
- 1 quicksave: 200-300KB
- Total: ~3MB

**Conclusion:** Negligible storage size for modern browsers

### IndexedDB Performance

**Write Performance:**
- Save game: ~10-50ms
- Autosave: ~10-50ms
- Event append: ~1-5ms

**Read Performance:**
- Load save: ~20-100ms
- Query metadata: ~5-10ms
- List saves: ~10-20ms

**Conclusion:** Fast enough for seamless gameplay

### Replay Performance

**Replay 1000 Events:**
- From beginning: ~1-3 seconds
- From snapshot (100 events): ~100-300ms

**Recommendation:** Use snapshot strategy for >100 events

## Security & Anti-Cheat

### Client-Side Storage Considerations

**Reality:**
- All data stored in browser (IndexedDB)
- Players can edit saves with browser dev tools
- No server-side verification possible
- Single-player game = cheating is player's choice

**Recommendations:**
1. ✅ Don't implement anti-cheat
2. ✅ Focus on gameplay integrity
3. ✅ Use checksums to detect accidental corruption (not cheating)
4. ✅ Provide "Ironman" mode (can't reload saves)
5. ✅ Consider achievement verification via event log

**Optional: Achievement Verification**
```typescript
function verifyAchievement(achievement: string, eventLog: GameEvent[]): boolean {
  // Example: "Beat Werdna without deaths"
  if (achievement === "werdna_no_deaths") {
    const werdnaKilled = eventLog.some(e =>
      e.type === "BOSS_DEFEATED" && e.data.bossId === "werdna"
    );
    const noDeaths = !eventLog.some(e => e.type === "CHARACTER_DEATH");
    return werdnaKilled && noDeaths;
  }
  return false;
}
```

## Testing Strategy

### Save/Load Tests

**Critical Test Cases:**

1. **Round-trip test**
   ```typescript
   test('save and load preserves game state', () => {
     const originalState = createGameState();
     const saveData = saveGame(originalState, eventLog);
     const loadedState = loadGame(saveData);
     expect(loadedState).toEqual(originalState);
   });
   ```

2. **Event replay test**
   ```typescript
   test('event replay produces same state as snapshot', () => {
     const snapshotState = loadSnapshot(save);
     const replayedState = replayEvents(save.eventLog, initialState);
     expect(replayedState).toEqual(snapshotState);
   });
   ```

3. **Corruption detection test**
   ```typescript
   test('detects corrupted save data', () => {
     const save = createSave();
     save.checksum = 'invalid';
     expect(() => loadGame(save)).toThrow(CorruptedSaveError);
   });
   ```

4. **Migration test**
   ```typescript
   test('migrates v1 save to v2', () => {
     const v1Save = createV1Save();
     const v2Save = migrateSave(v1Save);
     expect(v2Save.version).toBe(2);
     expect(loadGame(v2Save)).toBeDefined();
   });
   ```

### Performance Tests

1. **Save speed test**: Ensure save completes in <100ms
2. **Load speed test**: Ensure load completes in <100ms
3. **Replay speed test**: Ensure 1000 events replay in <3s
4. **Storage test**: Verify 10 saves use <5MB

## Summary & Final Recommendations

### Current Design Assessment: ✅ Excellent

**The hybrid event sourcing + snapshot approach is optimal because:**

1. **Fast Loading** - Snapshots provide instant resume
2. **Reliable** - Event log enables verification and recovery
3. **Debuggable** - Can replay to any point in game history
4. **Recoverable** - Multiple sources of truth prevent data loss
5. **Flexible** - Supports undo/redo, replay, highlights
6. **Negligible Storage** - 3MB total is trivial for modern browsers

### Recommended Enhancements

**Priority 1: Core Reliability**
1. ✅ Implement snapshot verification on load
2. ✅ Add checksum validation
3. ✅ Create comprehensive save/load tests

**Priority 2: Performance**
1. ✅ Add periodic snapshots in event log (every 100 events)
2. ✅ Implement fast-forward replay from nearest snapshot
3. ✅ Optimize IndexedDB queries with proper indices

**Priority 3: Quality of Life**
1. ✅ Add player map annotations
2. ✅ Implement replay metadata for highlights
3. ✅ Support export/import for backup

**Priority 4: Advanced Features (Optional)**
1. ⚠️ Differential saves for autosaves (if performance needed)
2. ⚠️ Cloud sync (future enhancement)
3. ⚠️ Achievement verification via event log

### What You Asked For

**"All events needed to get to current state"** ✅
- Event log stores complete event history
- Can reconstruct state from events
- Used for verification and debugging

**"State of characters"** ✅
- Full character roster saved
- Complete character state (HP, XP, equipment, spells, etc.)
- Both in-party and roster characters

**"Explored state of maps"** ✅
- Per-level explored tile data
- Automap information
- Quest flags and progress

### Bottom Line

**Your current design already includes all three items you mentioned, and uses an optimal hybrid approach. I recommend keeping this design and focusing on implementation quality rather than architectural changes.**

**Storage Size:** ~300KB per save × 10 slots = 3MB total (negligible)

**Load Time:** <100ms (excellent user experience)

**Reliability:** Dual sources of truth (snapshot + events) = maximum reliability

**This is a production-ready architecture.** Focus on implementation, not redesign.

---

**Last Updated:** 2025-10-26

**Next Steps:**
1. Implement data loading services (in progress)
2. Implement SaveService as documented
3. Implement LoadService as documented
4. Implement ReplayService as documented
5. Write comprehensive tests
6. Implement IndexedDB schema

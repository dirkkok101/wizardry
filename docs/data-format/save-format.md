# Save Format (IndexedDB)

**Save game data format specification.**

## Storage Location

**Technology**: IndexedDB (browser-based persistent storage)

**Database Name**: `wizardry_save_data`

**Version**: 1

## Object Stores

### 1. gameState

Stores complete game state snapshots.

**Key Path**: `saveId`

**Format**:
```json
{
  "saveId": "save_1",
  "timestamp": 1698765432000,
  "saveName": "My Party - Level 5",
  "playTime": 3600000,
  "gameState": {
    "mode": "navigation",
    "currentLevel": 5,
    "position": { "x": 10, "y": 15, "facing": "north" },
    "activeParty": {
      "members": ["char_1", "char_2", "char_3", "char_4", "char_5", "char_6"],
      "formation": {
        "frontRow": ["char_1", "char_2", "char_3"],
        "backRow": ["char_4", "char_5", "char_6"]
      },
      "gold": 50000,
      "inventory": ["bronze_key", "silver_key", "blue_ribbon"]
    },
    "characterRoster": [
      {
        "id": "char_1",
        "name": "Gandalf",
        "race": "human",
        "class": "mage",
        "alignment": "good",
        "level": 5,
        "xp": 12000,
        "age": 18,
        "stats": {
          "str": 10,
          "int": 18,
          "pie": 12,
          "vit": 11,
          "agi": 14,
          "luc": 13
        },
        "hp": 25,
        "maxHP": 30,
        "status": "ok",
        "statusEffects": [],
        "mageSpellPoints": {
          "1": 3,
          "2": 2,
          "3": 1
        },
        "maxMageSpellPoints": {
          "1": 3,
          "2": 2,
          "3": 1
        },
        "priestSpellPoints": {},
        "maxPriestSpellPoints": {},
        "spellBook": {
          "mage": ["dumapic", "halito", "katino", "mogref", "dilto", "melito", "sopic", "mahalito"],
          "priest": []
        },
        "equipment": {
          "weapon": "staff_2",
          "armor": "robes",
          "shield": null,
          "helmet": null,
          "gauntlets": null,
          "accessory1": "ring_healing",
          "accessory2": null
        },
        "inventory": ["potion_dios", "scroll_katino"],
        "isInParty": true,
        "isDead": false,
        "isAshes": false,
        "isLost": false
      }
    ],
    "exploredMaps": {
      "1": {
        "tiles": [
          { "x": 0, "y": 0, "explored": true },
          { "x": 1, "y": 0, "explored": true }
        ]
      }
    },
    "questFlags": {
      "werdna_defeated": false,
      "amulet_retrieved": false,
      "bronze_key_found": true,
      "silver_key_found": true,
      "blue_ribbon_found": true
    },
    "encounteredMonsters": ["bubbly_slime", "orc", "kobold", "lvl_1_mage"],
    "defeatedBosses": ["murphy_ghost"],
    "eventLog": []
  }
}
```

### 2. eventLog

Stores event history for replay system.

**Key Path**: `eventId`

**Auto-Increment**: Yes

**Format**:
```json
{
  "eventId": 12345,
  "saveId": "save_1",
  "timestamp": 1698765432000,
  "eventType": "move",
  "data": {
    "from": { "x": 10, "y": 14, "facing": "north" },
    "to": { "x": 10, "y": 15, "facing": "north" }
  }
}
```

### 3. characterBodies

Stores dead character bodies in dungeon (for body recovery).

**Key Path**: `bodyId`

**Format**:
```json
{
  "bodyId": "body_char_1_001",
  "characterId": "char_1",
  "characterName": "Gandalf",
  "deathLocation": {
    "level": 5,
    "x": 10,
    "y": 15
  },
  "deathTimestamp": 1698765432000,
  "characterSnapshot": {
    "name": "Gandalf",
    "race": "human",
    "class": "mage",
    "level": 5,
    "equipment": {
      "weapon": "staff_2",
      "armor": "robes"
    },
    "inventory": ["potion_dios"]
  },
  "isAshes": false,
  "isRetrieved": false
}
```

### 4. settings

Stores user settings and preferences.

**Key Path**: `settingKey`

**Format**:
```json
{
  "settingKey": "graphics",
  "value": {
    "resolution": "1920x1080",
    "fullscreen": false,
    "lightingEffects": true,
    "wireframeMode": false
  }
}
```

```json
{
  "settingKey": "audio",
  "value": {
    "musicVolume": 0.7,
    "sfxVolume": 0.8,
    "muteAll": false
  }
}
```

```json
{
  "settingKey": "gameplay",
  "value": {
    "combatSpeed": "normal",
    "autoSave": true,
    "autoSaveInterval": 300000,
    "permadeath": true
  }
}
```

## Data Structures

### GameState Object

**mode**: `string` - Current game mode
- `"town"` - In castle/town
- `"navigation"` - Exploring dungeon
- `"combat"` - In battle
- `"character_creation"` - Creating character
- `"camp"` - Party camp menu

**currentLevel**: `number` - Current dungeon level (0 = town, 1-10 = dungeon)

**position**: `object` - Party position
- `x`: X coordinate
- `y`: Y coordinate
- `facing`: Direction ("north", "south", "east", "west")

**activeParty**: `object` - Current party composition
- `members`: Array of character IDs
- `formation`: Front/back row assignments
- `gold`: Party gold pool
- `inventory`: Shared party inventory items

**characterRoster**: `array` - All created characters (max 20)

**exploredMaps**: `object` - Automap data per level
- Key: Level number
- Value: Explored tile data

**questFlags**: `object` - Boolean flags for quest progress

**encounteredMonsters**: `array` - Monster IDs encountered (for identification)

**defeatedBosses**: `array` - Boss IDs defeated

**eventLog**: `array` - Recent events (stored separately in eventLog store for full history)

### Character Object

**id**: `string` - Unique character identifier

**name**: `string` - Character name

**race**: `string` - Race ("human", "elf", "dwarf", "gnome", "hobbit")

**class**: `string` - Class ("fighter", "mage", "priest", "thief", "bishop", "samurai", "lord", "ninja")

**alignment**: `string` - Alignment ("good", "neutral", "evil")

**level**: `number` - Character level

**xp**: `number` - Experience points

**age**: `number` - Age in years (affects stat gains)

**stats**: `object` - Base stats
- `str`, `int`, `pie`, `vit`, `agi`, `luc`: Stat values

**hp**: `number` - Current hit points

**maxHP**: `number` - Maximum hit points

**status**: `string` - Status condition
- `"ok"` - Normal
- `"dead"` - Dead (can resurrect)
- `"ashes"` - Turned to ashes (harder to resurrect)
- `"lost"` - Permanently lost

**statusEffects**: `array` - Active status effects
- `"poison"`, `"paralyzed"`, `"petrified"`, `"asleep"`, `"silent"`, `"blind"`

**mageSpellPoints**: `object` - Current mage spell points per level (1-7)

**maxMageSpellPoints**: `object` - Maximum mage spell points per level

**priestSpellPoints**: `object` - Current priest spell points per level (1-7)

**maxPriestSpellPoints**: `object` - Maximum priest spell points per level

**spellBook**: `object` - Learned spells
- `mage`: Array of mage spell IDs
- `priest`: Array of priest spell IDs

**equipment**: `object` - Equipped items
- `weapon`, `armor`, `shield`, `helmet`, `gauntlets`, `accessory1`, `accessory2`
- Values are item IDs or `null`

**inventory**: `array` - Personal inventory items (IDs)

**isInParty**: `boolean` - Is character in active party?

**isDead**: `boolean` - Is character dead?

**isAshes**: `boolean` - Is character ashes?

**isLost**: `boolean` - Is character permanently lost?

### Event Object

**eventId**: `number` - Unique event identifier (auto-increment)

**saveId**: `string` - Associated save file

**timestamp**: `number` - Unix timestamp (milliseconds)

**eventType**: `string` - Type of event
- `"move"`, `"turn"`, `"combat_start"`, `"combat_end"`, `"attack"`, `"cast_spell"`
- `"level_up"`, `"item_pickup"`, `"item_use"`, `"door_open"`, `"teleport"`
- `"character_death"`, `"character_resurrect"`, `"save_game"`, `"load_game"`

**data**: `object` - Event-specific data (varies by eventType)

## Save/Load Operations

### Create New Save

1. Generate unique `saveId`
2. Capture complete `gameState`
3. Store in `gameState` object store
4. Update `lastSaveId` in settings

### Load Save

1. Read `gameState` by `saveId`
2. Restore game state from snapshot
3. Load associated event log (optional for replay)

### Auto-Save

1. Every N minutes (configurable)
2. Store to special `autosave` saveId
3. Overwrite previous autosave

### Quick Save

1. F5 hotkey (or equivalent)
2. Store to special `quicksave` saveId
3. Overwrite previous quicksave

## Event Replay System

**Purpose**: Reproduce exact game state from event sequence

**Storage**: Events stored in `eventLog` object store

**Replay**:
1. Start from initial state
2. Apply events sequentially
3. Recreate exact game progression

**Use Cases**:
- Debug/testing
- Highlight reels
- Save state verification

## Data Size Estimates

**Single Character**: ~2KB JSON
**Party (6 characters)**: ~12KB
**Complete Game State**: ~20-30KB
**Event Log (1000 events)**: ~100-200KB
**Full Save (state + events)**: ~200-300KB

**Total Storage** (10 save slots): ~2-3MB

## IndexedDB Schema

```javascript
// Database initialization
const request = indexedDB.open('wizardry_save_data', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;

  // Game state store
  const gameStateStore = db.createObjectStore('gameState', { keyPath: 'saveId' });
  gameStateStore.createIndex('timestamp', 'timestamp', { unique: false });

  // Event log store
  const eventLogStore = db.createObjectStore('eventLog', {
    keyPath: 'eventId',
    autoIncrement: true
  });
  eventLogStore.createIndex('saveId', 'saveId', { unique: false });
  eventLogStore.createIndex('timestamp', 'timestamp', { unique: false });

  // Character bodies store
  const bodiesStore = db.createObjectStore('characterBodies', { keyPath: 'bodyId' });
  bodiesStore.createIndex('characterId', 'characterId', { unique: false });
  bodiesStore.createIndex('level', 'deathLocation.level', { unique: false });

  // Settings store
  const settingsStore = db.createObjectStore('settings', { keyPath: 'settingKey' });
};
```

## Save Slot Management

**Slot Limit**: 10 manual saves + 1 autosave + 1 quicksave = 12 total

**Save Metadata**:
- Save name
- Save timestamp
- Party level range
- Current dungeon level
- Play time

**UI Display**:
```
Save 1: "My Party - Level 5" | 2025-10-26 14:30 | 1h 30m
Save 2: "Boss Rush" | 2025-10-25 18:15 | 3h 45m
Autosave: "Level 7 - Auto" | 2025-10-26 15:00 | 2h 10m
```

## Data Validation

**On Save**:
- Validate game state structure
- Check required fields present
- Verify character roster integrity
- Ensure no duplicate character IDs

**On Load**:
- Verify save format version
- Check data integrity
- Migrate old save formats if needed
- Validate character data

## Migration Strategy

**Version 1 → Version 2**:
```javascript
function migrateSaveData(oldData) {
  const newData = { ...oldData };
  newData.version = 2;
  // Add new fields, migrate old fields
  return newData;
}
```

## Backup and Export

**Export Save**:
- Serialize game state to JSON
- Offer file download
- User can backup to local file system

**Import Save**:
- Upload JSON file
- Validate structure
- Import to IndexedDB

**Cloud Sync** (Future):
- Sync saves to cloud storage
- Cross-device play
- Save conflict resolution

## Performance Considerations

**Lazy Loading**: Load character details on-demand

**Chunked Events**: Don't load entire event log at once

**Indexed Queries**: Use IndexedDB indices for fast lookups

**Compression** (Future): Compress save data for storage efficiency

## Security Considerations

**Client-Side Only**: All data stored locally in browser

**No Server**: No network transmission of save data

**User Control**: User can delete saves via browser tools

**Cheating**: Single-player game, cheating allowed (no anti-cheat)

## Notes

- IndexedDB is persistent across browser sessions
- Data survives browser restart
- Clearing browser data will delete saves (warn user)
- Different browsers = different saves (not synced by default)
- Original Wizardry used floppy disk saves (we're much more robust)
- Event sourcing enables deterministic replay
- Save any time in town or dungeon (not during combat actions)

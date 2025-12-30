# State Management Specification

**Complete application state structure, persistence rules, and state transition logic for Wizardry 1.**

---

## Overview

Wizardry 1's state management is built around a single, immutable GameState object that represents the entire application state at any point in time. State transitions are validated, persistent saves occur only at safe points, and state invariants are enforced throughout the application lifecycle.

**Core Principles:**
- **Single source of truth:** GameState contains all application state
- **Immutability:** State changes produce new state objects
- **Validation:** All transitions validated before execution
- **Safe persistence:** Auto-save only in safe zones
- **Recovery:** Graceful handling of corrupted or invalid states

---

## A. Application State Structure

### Complete GameState Interface

```typescript
interface GameState {
  // Meta
  version: string                    // Save format version
  createdAt: Date                    // Save file creation time
  lastSaved: Date                    // Last save timestamp

  // Current Session
  currentScene: SceneType            // Active scene
  previousScene: SceneType | null    // For back navigation
  sceneState: SceneState             // Scene-specific state

  // Characters
  characters: Character[]            // All created characters (roster)
  maxCharacters: number              // Default: 20

  // Party
  party: Party                       // Current adventuring party

  // Dungeon
  dungeon: DungeonState              // Maze position and progress

  // Game Flags
  flags: GameFlags                   // Story/progression flags

  // UI State
  ui: UIState                        // UI preferences and settings
}
```

### SceneType Enumeration

```typescript
enum SceneType {
  TITLE_SCREEN = 'TITLE_SCREEN',
  CASTLE_MENU = 'CASTLE_MENU',
  TRAINING_GROUNDS = 'TRAINING_GROUNDS',
  TAVERN = 'TAVERN',
  SHOP = 'SHOP',
  TEMPLE = 'TEMPLE',
  INN = 'INN',
  EDGE_OF_TOWN = 'EDGE_OF_TOWN',
  UTILITIES = 'UTILITIES',
  CAMP = 'CAMP',
  MAZE = 'MAZE',
  COMBAT = 'COMBAT',
  CHEST = 'CHEST',
  CHARACTER_INSPECTION = 'CHARACTER_INSPECTION'
}
```

### Scene-Specific State Interfaces

```typescript
type SceneState =
  | TitleScreenState
  | CastleMenuState
  | TrainingGroundsState
  | TavernState
  | ShopState
  | TempleState
  | InnState
  | EdgeOfTownState
  | UtilitiesState
  | CampState
  | MazeState
  | CombatState
  | ChestState
  | CharacterInspectionState

// Individual scene states
interface TitleScreenState {
  mode: 'MAIN_MENU'
}

interface CastleMenuState {
  mode: 'MAIN_MENU'
  lastInput: string | null
  errorMessage: string | null
}

interface TrainingGroundsState {
  mode: 'MAIN_MENU' | 'CREATING' | 'EDITING' | 'DELETING'
  selectedCharacter: string | null  // Character ID
  creationStep: CharacterCreationStep | null
}

interface TavernState {
  mode: 'MAIN_MENU' | 'ADDING' | 'REMOVING' | 'INSPECTING'
  selectedCharacter: string | null
  lastInput: string | null
  errorMessage: string | null
}

interface ShopState {
  mode: 'MAIN_MENU' | 'BUYING' | 'SELLING' | 'IDENTIFYING'
  selectedCharacter: string | null
  selectedItem: string | null
  currentPage: number
}

interface TempleState {
  mode: 'MAIN_MENU' | 'HEALING' | 'RESURRECTING' | 'CURING'
  selectedCharacter: string | null
  selectedService: TempleService | null
}

interface InnState {
  mode: 'MAIN_MENU' | 'RESTING' | 'LEVELING_UP'
  selectedCharacter: string | null
  stableParty: boolean  // If party being kept overnight
}

interface EdgeOfTownState {
  mode: 'MAIN_MENU' | 'CONFIRMING_EXIT'
  lastInput: string | null
  errorMessage: string | null
}

interface UtilitiesState {
  mode: 'MAIN_MENU' | 'RENAMING' | 'RESTARTING'
  operation: UtilityOperation | null
}

interface CampState {
  mode: 'MAIN_MENU' | 'INSPECTING' | 'REORDERING' | 'EQUIPPING' | 'CONFIRMING_QUIT'
  selectedCharacter: string | null
  equipmentIndex: number
  lastInput: string | null
  errorMessage: string | null
}

interface MazeState {
  mode: 'EXPLORING' | 'INSPECTING' | 'IN_ENCOUNTER'
  position: Position
  facing: Direction
  currentLevel: number
  lightRadius: number
  encounterSteps: number
  messageLog: string[]
}

interface CombatState {
  mode: 'SELECTING_ACTIONS' | 'RESOLVING' | 'ENEMY_TURN' | 'VICTORY' | 'DEFEAT'
  round: number
  initiative: InitiativeOrder[]
  pendingActions: CombatAction[]
  currentCharacterIndex: number
  enemyGroups: EnemyGroup[]
  messageLog: CombatMessage[]
  canFlee: boolean
  surpriseRound: 'PARTY' | 'ENEMY' | 'NONE'
}

interface ChestState {
  mode: 'INSPECTING' | 'OPENING' | 'DISARMING' | 'LOOTING'
  chest: Chest
  selectedCharacter: string | null
  trapState: TrapState
  lootItems: Item[]
}

interface CharacterInspectionState {
  mode: 'VIEWING' | 'READING_SPELLS' | 'CASTING' | 'USING_ITEM' | 'TRADING' | 'EQUIPPING'
  characterId: string
  inspectionContext: 'TAVERN' | 'CAMP' | 'TEMPLE' | 'INN'
  selectedSpell: string | null
  selectedItem: string | null
  tradeTarget: string | null
}
```

### Character State

```typescript
interface Character {
  // Identity
  id: string                         // Unique identifier
  name: string                       // Character name

  // Core Attributes
  race: Race                         // HUMAN, ELF, DWARF, GNOME, HOBBIT
  class: CharacterClass              // FIGHTER, MAGE, PRIEST, THIEF, BISHOP, SAMURAI, LORD, NINJA
  alignment: Alignment               // GOOD, NEUTRAL, EVIL

  // Stats
  strength: number                   // 3-18 (warriors can roll 18/xx)
  intelligence: number               // 3-18
  piety: number                      // 3-18
  vitality: number                   // 3-18
  agility: number                    // 3-18
  luck: number                       // 3-18

  // Level and Experience
  level: number                      // 1-13
  experience: number                 // Current XP
  experienceToNext: number           // XP needed for next level

  // Health
  currentHP: number                  // Current hit points
  maxHP: number                      // Maximum hit points
  hpPerLevel: number[]               // HP gained each level

  // Magic
  mageSpellPoints: number[]          // Spell points per level (1-7)
  priestSpellPoints: number[]        // Spell points per level (1-7)
  knownMageSpells: string[][]        // Spells known per level
  knownPriestSpells: string[][]      // Spells known per level

  // Combat Stats
  armorClass: number                 // Lower is better (can be negative)
  toHit: number                      // Base to-hit bonus
  damage: string                     // Damage dice (e.g., "1d8+2")
  numberOfAttacks: number            // Attacks per round

  // Status
  status: CharacterStatus            // OK, WOUNDED, DEAD, ASHES, LOST, OUT, IN_PARTY, IN_MAZE
  afflictions: Affliction[]          // POISONED, PARALYZED, ASLEEP, AFRAID, SILENCED

  // Inventory
  inventory: Item[]                  // All items (max 8)
  equipped: EquippedItems            // Currently equipped items
  gold: number                       // Personal gold

  // Position
  partyPosition: number | null       // 1-6 if in party, null otherwise

  // Metadata
  createdAt: Date                    // Character creation time
  totalBattles: number               // Stat tracking
  totalKills: number                 // Stat tracking
  timesKilled: number                // Death count
  awardValue: number                 // Value if resurrecting
}
```

### Party State

```typescript
interface Party {
  // Members
  members: Character[]               // 0-6 characters

  // Status
  inMaze: boolean                    // Party currently in dungeon
  status: PartyStatus                // OK, WOUNDED, IN_DANGER, OUT

  // Resources
  pooledGold: number                 // Shared party gold

  // Dungeon Status
  currentDungeonLevel: number        // 1-10 if in maze, 0 otherwise
  dungeonPosition: Position | null   // Current maze position
  dungeonFacing: Direction | null    // N, S, E, W

  // Formation
  frontRow: string[]                 // Character IDs in positions 1-3
  backRow: string[]                  // Character IDs in positions 4-6

  // Metadata
  battlesWon: number                 // Party statistics
  treasuresFound: number             // Party statistics
  deepestLevel: number               // Deepest maze level reached
}
```

### Dungeon State

```typescript
interface DungeonState {
  // Current Position
  level: number                      // 1-10
  position: Position                 // {x, y}
  facing: Direction                  // 'N', 'S', 'E', 'W'

  // Exploration State
  visitedTiles: Set<string>          // "level:x:y" keys
  mappedTiles: Map<string, TileData> // Discovered tile data

  // Encounters
  defeatedEncounters: Set<string>    // "level:x:y" for fixed encounters
  encounterStepCounter: number       // Steps since last random encounter

  // Special States
  lightRadius: number                // 1 default, increased by MILWA/LOMILWA
  inAntiMagicZone: boolean           // Spells disabled
  inDarkZone: boolean                // Light disabled

  // Floor State
  openedDoors: Set<string>           // "level:x:y:direction" keys
  triggeredTraps: Set<string>        // "level:x:y" for triggered traps

  // Elevator/Stair State
  lastStairLevel: number | null      // Last used stair (for teleport return)
}
```

### Combat Sub-State

```typescript
interface CombatAction {
  characterId: string
  type: CombatActionType             // ATTACK, CAST_SPELL, PARRY, USE_ITEM, RUN, DISPEL
  targetGroup: number | null         // 1-4 enemy groups
  spell: string | null               // Spell name if casting
  item: string | null                // Item ID if using
}

interface EnemyGroup {
  id: string                         // Unique group identifier
  enemies: Enemy[]                   // Enemies in this group
  groupNumber: number                // 1-4 display number
  formation: 'FRONT' | 'BACK'        // Enemy formation
  status: 'FIGHTING' | 'FLEEING' | 'FRIENDLY'
}

interface Enemy {
  id: string
  name: string
  level: number
  currentHP: number
  maxHP: number
  armorClass: number
  status: EnemyStatus                // FIGHTING, ASLEEP, PARALYZED, DEAD
  specialAbilities: string[]         // BREATH_WEAPON, LEVEL_DRAIN, POISON, etc.
}

interface InitiativeOrder {
  actorId: string                    // Character or Enemy ID
  actorType: 'CHARACTER' | 'ENEMY'
  initiative: number                 // Rolled initiative value
  hasActed: boolean                  // This round
}
```

### Game Flags

```typescript
interface GameFlags {
  // Story Progress
  hasDefeatedWerdna: boolean         // Final boss defeated
  hasObtainedAmulet: boolean         // Amulet of Werdna obtained

  // Special Events
  hasMetTrebeius: boolean            // Met friendly NPC on level 4
  hasUsedElevator: boolean           // Used special elevator

  // Dungeon Discoveries
  foundMurphysGhosts: boolean        // Easter egg encounter
  foundSecretTrainingHall: boolean   // Hidden area

  // Meta Flags
  tutorialShown: boolean             // First-time tutorial
  difficultyLevel: DifficultyLevel   // EASY, NORMAL, HARD (optional)
}
```

### UI State

```typescript
interface UIState {
  // Display Preferences
  graphicsMode: GraphicsMode         // WIREFRAME, TEXTURED, TEXT_ONLY
  soundEnabled: boolean              // Sound effects
  musicEnabled: boolean              // Background music

  // Accessibility
  fontSize: FontSize                 // SMALL, MEDIUM, LARGE
  highContrast: boolean              // High contrast mode
  screenReaderEnabled: boolean       // Screen reader support

  // Gameplay
  animationSpeed: number             // 0-100 (0 = instant, 100 = slow)
  messageDelay: number               // Message display time (ms)

  // Map
  showAutomap: boolean               // Auto-map enabled (optional feature)
}
```

---

## B. Scene Transitions

### Transition Validation Rules

All scene transitions must pass validation before execution. Validation prevents impossible states and ensures data integrity.

```typescript
interface TransitionValidator {
  canTransitionTo(
    from: SceneType,
    to: SceneType,
    state: GameState
  ): TransitionResult
}

interface TransitionResult {
  allowed: boolean
  reason?: string
  warning?: string
  autoSaveBefore: boolean            // Should auto-save before transition
}
```

### Validation Rules by Destination

**Castle Menu:**
```typescript
function canEnterCastleMenu(state: GameState): TransitionResult {
  if (state.party.inMaze) {
    return {
      allowed: false,
      reason: "Party is in the maze. Must exit via LOKTOFEIT spell or death.",
      autoSaveBefore: false
    }
  }

  return { allowed: true, autoSaveBefore: true }
}
```

**Town Services (Tavern, Temple, Shop, Inn):**
```typescript
function canEnterTownService(state: GameState): TransitionResult {
  if (state.party.inMaze) {
    return {
      allowed: false,
      reason: "Cannot access town services while party is in maze.",
      autoSaveBefore: false
    }
  }

  return { allowed: true, autoSaveBefore: true }
}
```

**Dungeon Entry (Edge of Town → Camp):**
```typescript
function canEnterDungeon(state: GameState): TransitionResult {
  if (state.party.members.length === 0) {
    return {
      allowed: false,
      reason: "You need a party to enter the maze. Visit the Tavern.",
      autoSaveBefore: false
    }
  }

  const hasDeadMembers = state.party.members.some(
    c => c.status === CharacterStatus.DEAD ||
         c.status === CharacterStatus.ASHES ||
         c.status === CharacterStatus.LOST
  )

  if (hasDeadMembers) {
    return {
      allowed: false,
      reason: "Some party members are dead. Visit the Temple.",
      autoSaveBefore: false
    }
  }

  return {
    allowed: true,
    warning: "Last save point before entering dungeon.",
    autoSaveBefore: true  // Critical: save before entering danger zone
  }
}
```

**Maze Entry (Camp → Maze):**
```typescript
function canEnterMaze(state: GameState): TransitionResult {
  if (state.party.members.length === 0) {
    return {
      allowed: false,
      reason: "Party is empty.",
      autoSaveBefore: false
    }
  }

  const hasDeadMembers = state.party.members.some(
    c => c.status === CharacterStatus.DEAD ||
         c.status === CharacterStatus.ASHES
  )

  if (hasDeadMembers) {
    return {
      allowed: false,
      reason: "Cannot explore with dead party members.",
      autoSaveBefore: false
    }
  }

  return {
    allowed: true,
    autoSaveBefore: false  // No auto-save in dungeon zone
  }
}
```

**Leave Game (Edge of Town → Exit):**
```typescript
function canLeaveGame(state: GameState): TransitionResult {
  if (state.party.inMaze) {
    return {
      allowed: false,
      reason: "Cannot save while party is in maze. Use (Q)uit in Camp to mark party OUT.",
      autoSaveBefore: false
    }
  }

  return {
    allowed: true,
    warning: "Game will be saved before exiting.",
    autoSaveBefore: true  // Manual save before exit
  }
}
```

### State Cleanup on Exit

When exiting a scene, cleanup ensures no stale state persists.

```typescript
function cleanupSceneState(scene: SceneType, state: GameState): GameState {
  switch (scene) {
    case SceneType.COMBAT:
      // Clear combat state
      return {
        ...state,
        sceneState: null,
        // Preserve: character HP changes, XP gains, item drops
      }

    case SceneType.CHEST:
      // Clear chest state
      return {
        ...state,
        sceneState: null,
        // Preserve: looted items, triggered traps
      }

    case SceneType.CHARACTER_INSPECTION:
      // Clear inspection state
      return {
        ...state,
        sceneState: null,
        // Preserve: equipment changes, dropped items, spell points
      }

    case SceneType.TRAINING_GROUNDS:
      // Clear creation state
      return {
        ...state,
        sceneState: null,
        // Preserve: newly created character
      }

    default:
      return state
  }
}
```

### State Initialization on Entry

When entering a scene, initialize scene-specific state.

```typescript
function initializeSceneState(
  scene: SceneType,
  previousState: GameState
): SceneState {
  switch (scene) {
    case SceneType.CASTLE_MENU:
      return {
        mode: 'MAIN_MENU',
        lastInput: null,
        errorMessage: null
      }

    case SceneType.CAMP:
      return {
        mode: 'MAIN_MENU',
        selectedCharacter: null,
        equipmentIndex: 0,
        lastInput: null,
        errorMessage: null
      }

    case SceneType.MAZE:
      // Initialize or restore dungeon position
      const position = previousState.party.dungeonPosition || {
        level: 1,
        x: 0,
        y: 0
      }
      const facing = previousState.party.dungeonFacing || 'N'

      return {
        mode: 'EXPLORING',
        position,
        facing,
        currentLevel: position.level,
        lightRadius: 1,  // Default without MILWA
        encounterSteps: 0,
        messageLog: []
      }

    case SceneType.COMBAT:
      // Combat state initialized by encounter trigger
      return initializeCombatState(previousState)

    default:
      return { mode: 'MAIN_MENU' }
  }
}
```

### Transition Flow Examples

**Example 1: Castle Menu → Tavern → Castle Menu**
```
1. User at Castle Menu presses (G)
2. Validate transition: canEnterTavern(state) → allowed: true, autoSaveBefore: true
3. Auto-save current state
4. Cleanup Castle Menu state
5. Initialize Tavern state
6. Set currentScene = TAVERN
7. Render Tavern scene

... user forms party ...

8. User presses (L)eave
9. Validate transition: canLeaveTavern(state) → allowed: true, autoSaveBefore: true
10. Auto-save current state (with party changes)
11. Cleanup Tavern state
12. Initialize Castle Menu state
13. Set currentScene = CASTLE_MENU
14. Render Castle Menu scene
```

**Example 2: Edge of Town → Camp → Maze**
```
1. User at Edge of Town presses (M)aze
2. Validate transition: canEnterDungeon(state) → allowed: true, autoSaveBefore: true
3. **CRITICAL AUTO-SAVE** (last save before dungeon)
4. Set party.inMaze = true
5. Cleanup Edge of Town state
6. Initialize Camp state
7. Set currentScene = CAMP
8. Render Camp scene

... user prepares party ...

9. User presses (L)eave Camp
10. Validate transition: canEnterMaze(state) → allowed: true, autoSaveBefore: false
11. **NO AUTO-SAVE** (dungeon zone)
12. Initialize dungeon position if new entry
13. Cleanup Camp state
14. Initialize Maze state
15. Set currentScene = MAZE
16. Render Maze scene
```

**Example 3: Combat Victory → Chest → Maze**
```
1. Combat ends in victory with treasure
2. Validate transition: canOpenChest(state) → allowed: true, autoSaveBefore: false
3. Generate chest loot
4. Cleanup Combat state (preserve XP/gold gains)
5. Initialize Chest state
6. Set currentScene = CHEST
7. Render Chest scene

... user loots chest ...

8. User finishes looting
9. Validate transition: canReturnToMaze(state) → allowed: true, autoSaveBefore: false
10. Cleanup Chest state (preserve looted items)
11. Initialize Maze state (restore position)
12. Set currentScene = MAZE
13. Render Maze scene
```

---

## C. Persistence Strategy

### Auto-Save Points (Safe Zone Scenes)

Auto-save triggers when entering these scenes:

```typescript
const AUTO_SAVE_SCENES: Set<SceneType> = new Set([
  SceneType.CASTLE_MENU,
  SceneType.TAVERN,
  SceneType.TEMPLE,
  SceneType.SHOP,
  SceneType.INN,
  SceneType.EDGE_OF_TOWN,
  SceneType.TRAINING_GROUNDS,
  SceneType.UTILITIES
])

function shouldAutoSave(to: SceneType): boolean {
  return AUTO_SAVE_SCENES.has(to)
}
```

**Critical Auto-Save Point:**
- **Edge of Town → Camp:** Last save before entering dungeon
- This is the ONLY auto-save that occurs when entering a dungeon zone
- Ensures player can recover to this point if party wipes

### Manual Save (Edge of Town → Leave Game)

```typescript
async function saveAndExit(state: GameState): Promise<void> {
  // Validate party not in maze
  if (state.party.inMaze) {
    throw new Error("Cannot save while party is in maze")
  }

  // Confirm with user
  const confirmed = await confirmDialog({
    title: "SAVE AND QUIT",
    message: "Save game and exit?",
    confirmKey: 'Y',
    cancelKey: 'N'
  })

  if (!confirmed) {
    return  // User cancelled
  }

  // Save game state
  await saveGameState(state)

  // Show confirmation
  showMessage("Game saved. Goodbye!")

  // Exit application
  exitApplication()
}
```

### Emergency Save (Camp → Quit)

**Special Case:** Only save during dungeon run, but marks party OUT.

```typescript
async function quitAndMarkOUT(state: GameState): Promise<GameState> {
  // Confirm with user
  const confirmed = await confirmDialog({
    title: "QUIT AND MARK OUT",
    message: "Quit and mark party OUT?",
    warning: "Party will be stranded in dungeon. Use Utilities to restart.",
    confirmKey: 'Y',
    cancelKey: 'N'
  })

  if (!confirmed) {
    return state  // User cancelled
  }

  // Mark party and all members OUT
  const updatedParty = {
    ...state.party,
    status: PartyStatus.OUT
  }

  const updatedCharacters = state.characters.map(c => {
    if (state.party.members.includes(c)) {
      return { ...c, status: CharacterStatus.OUT }
    }
    return c
  })

  // Save current dungeon position (for recovery)
  const dungeonSnapshot = {
    level: state.dungeon.level,
    position: state.dungeon.position,
    facing: state.dungeon.facing
  }

  const newState = {
    ...state,
    party: {
      ...updatedParty,
      dungeonPosition: dungeonSnapshot.position,
      dungeonFacing: dungeonSnapshot.facing,
      currentDungeonLevel: dungeonSnapshot.level
    },
    characters: updatedCharacters,
    currentScene: SceneType.EDGE_OF_TOWN
  }

  // **SAVE GAME STATE** (only save during dungeon run)
  await saveGameState(newState)

  showMessage("Party marked OUT. Use Utilities → Restart to recover.")

  return newState
}
```

### Save File Format

```typescript
interface SaveFile {
  // Metadata
  version: string                    // Save format version (e.g., "1.0.0")
  saveDate: Date                     // When save was created
  saveName: string                   // User-provided name (optional)

  // Game State
  gameState: GameState               // Complete game state

  // Checksum
  checksum: string                   // SHA-256 hash for validation
}

function serializeSaveFile(state: GameState): string {
  const saveFile: SaveFile = {
    version: SAVE_FORMAT_VERSION,
    saveDate: new Date(),
    saveName: generateSaveName(state),
    gameState: state,
    checksum: ''  // Calculated after serialization
  }

  // Serialize to JSON
  const json = JSON.stringify(saveFile, null, 2)

  // Calculate checksum
  saveFile.checksum = calculateChecksum(json)

  // Re-serialize with checksum
  return JSON.stringify(saveFile, null, 2)
}

function deserializeSaveFile(json: string): SaveFile {
  const saveFile = JSON.parse(json) as SaveFile

  // Validate checksum
  const expectedChecksum = saveFile.checksum
  saveFile.checksum = ''  // Clear for recalculation
  const actualChecksum = calculateChecksum(JSON.stringify(saveFile, null, 2))

  if (expectedChecksum !== actualChecksum) {
    throw new Error("Save file corrupted (checksum mismatch)")
  }

  return saveFile
}
```

### Load Game Flow

```typescript
async function loadGame(saveFilePath: string): Promise<GameState> {
  // 1. Read save file
  const json = await readFile(saveFilePath)

  // 2. Deserialize and validate
  const saveFile = deserializeSaveFile(json)

  // 3. Validate save format version
  if (!isCompatibleVersion(saveFile.version)) {
    throw new Error(`Incompatible save version: ${saveFile.version}`)
  }

  // 4. Validate state integrity
  const validation = validateGameState(saveFile.gameState)
  if (!validation.valid) {
    throw new Error(`Invalid save file: ${validation.errors.join(', ')}`)
  }

  // 5. Migrate if necessary
  const migratedState = migrateSaveFile(saveFile.gameState, saveFile.version)

  // 6. Determine starting scene
  const startScene = determineStartScene(migratedState)

  // 7. Initialize scene state
  const initializedState = {
    ...migratedState,
    currentScene: startScene,
    sceneState: initializeSceneState(startScene, migratedState)
  }

  return initializedState
}

function determineStartScene(state: GameState): SceneType {
  // If party in maze, start at Camp (not Maze - too dangerous)
  if (state.party.inMaze) {
    return SceneType.CAMP
  }

  // If party OUT, start at Castle Menu (safe recovery point)
  if (state.party.status === PartyStatus.OUT) {
    return SceneType.CASTLE_MENU
  }

  // Otherwise, start at saved scene (or Castle Menu if invalid)
  const savedScene = state.currentScene
  if (isSafeZoneScene(savedScene)) {
    return savedScene
  }

  // Default to Castle Menu
  return SceneType.CASTLE_MENU
}
```

---

## D. State Validation

### Invariants That Must Always Be True

```typescript
interface StateValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function validateGameState(state: GameState): StateValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Characters
  if (state.characters.length > state.maxCharacters) {
    errors.push(`Too many characters: ${state.characters.length} > ${state.maxCharacters}`)
  }

  for (const character of state.characters) {
    const charValidation = validateCharacter(character)
    errors.push(...charValidation.errors)
    warnings.push(...charValidation.warnings)
  }

  // 2. Party
  if (state.party.members.length > 6) {
    errors.push(`Party too large: ${state.party.members.length} > 6`)
  }

  // All party members must exist in character roster
  for (const member of state.party.members) {
    if (!state.characters.find(c => c.id === member.id)) {
      errors.push(`Party member ${member.name} not found in roster`)
    }
  }

  // If party in maze, must have valid dungeon position
  if (state.party.inMaze) {
    if (!state.party.dungeonPosition) {
      errors.push("Party marked IN_MAZE but has no dungeon position")
    }
    if (state.party.currentDungeonLevel < 1 || state.party.currentDungeonLevel > 10) {
      errors.push(`Invalid dungeon level: ${state.party.currentDungeonLevel}`)
    }
  }

  // 3. Alignment compatibility
  const hasGood = state.party.members.some(c => c.alignment === Alignment.GOOD)
  const hasEvil = state.party.members.some(c => c.alignment === Alignment.EVIL)
  if (hasGood && hasEvil) {
    errors.push("Party has both Good and Evil members (incompatible)")
  }

  // 4. Current scene must be valid
  if (!Object.values(SceneType).includes(state.currentScene)) {
    errors.push(`Invalid current scene: ${state.currentScene}`)
  }

  // 5. If in dungeon scene, party must be marked IN_MAZE
  const dungeonScenes = [SceneType.CAMP, SceneType.MAZE, SceneType.COMBAT, SceneType.CHEST]
  if (dungeonScenes.includes(state.currentScene) && !state.party.inMaze) {
    warnings.push("In dungeon scene but party not marked IN_MAZE")
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

function validateCharacter(character: Character): StateValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Stats in valid range
  const stats = [
    character.strength,
    character.intelligence,
    character.piety,
    character.vitality,
    character.agility,
    character.luck
  ]

  for (const stat of stats) {
    if (stat < 3 || stat > 18) {
      errors.push(`${character.name} has invalid stat: ${stat}`)
    }
  }

  // 2. Level in valid range
  if (character.level < 1 || character.level > 13) {
    errors.push(`${character.name} has invalid level: ${character.level}`)
  }

  // 3. HP in valid range
  if (character.currentHP < 0) {
    errors.push(`${character.name} has negative HP: ${character.currentHP}`)
  }
  if (character.currentHP > character.maxHP) {
    warnings.push(`${character.name} has HP > max: ${character.currentHP} > ${character.maxHP}`)
  }

  // 4. Inventory size
  if (character.inventory.length > 8) {
    errors.push(`${character.name} has too many items: ${character.inventory.length} > 8`)
  }

  // 5. Class-specific validations
  if (character.class === CharacterClass.MAGE || character.class === CharacterClass.BISHOP) {
    if (character.intelligence < 11) {
      warnings.push(`${character.name} is ${character.class} with low INT: ${character.intelligence}`)
    }
  }

  if (character.class === CharacterClass.PRIEST || character.class === CharacterClass.BISHOP) {
    if (character.piety < 11) {
      warnings.push(`${character.name} is ${character.class} with low PIE: ${character.piety}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
```

### Validation on Load

```typescript
async function loadAndValidateGame(saveFilePath: string): Promise<GameState> {
  // Load save file
  const state = await loadGame(saveFilePath)

  // Validate state
  const validation = validateGameState(state)

  if (!validation.valid) {
    // Critical errors - cannot load
    throw new Error(`Cannot load save file:\n${validation.errors.join('\n')}`)
  }

  if (validation.warnings.length > 0) {
    // Non-critical warnings - log and continue
    console.warn("Save file has warnings:")
    validation.warnings.forEach(w => console.warn(`  - ${w}`))

    // Optionally show to user
    showWarningDialog({
      title: "Save File Warnings",
      message: "The save file has some issues:\n" + validation.warnings.join('\n'),
      note: "The game will attempt to continue, but some data may be incorrect."
    })
  }

  return state
}
```

### State Repair Strategies

```typescript
function repairGameState(state: GameState): GameState {
  let repairedState = { ...state }

  // 1. Remove invalid party members
  repairedState.party.members = repairedState.party.members.filter(member =>
    repairedState.characters.find(c => c.id === member.id)
  )

  // 2. Clamp HP to valid ranges
  repairedState.characters = repairedState.characters.map(c => ({
    ...c,
    currentHP: Math.max(0, Math.min(c.currentHP, c.maxHP))
  }))

  // 3. Fix alignment conflicts
  const hasGood = repairedState.party.members.some(c => c.alignment === Alignment.GOOD)
  const hasEvil = repairedState.party.members.some(c => c.alignment === Alignment.EVIL)
  if (hasGood && hasEvil) {
    // Remove evil members (keep good)
    repairedState.party.members = repairedState.party.members.filter(
      c => c.alignment !== Alignment.EVIL
    )
  }

  // 4. Fix party size
  if (repairedState.party.members.length > 6) {
    repairedState.party.members = repairedState.party.members.slice(0, 6)
  }

  // 5. Fix invalid scene
  if (!Object.values(SceneType).includes(repairedState.currentScene)) {
    repairedState.currentScene = SceneType.CASTLE_MENU
  }

  // 6. Fix dungeon state mismatch
  const dungeonScenes = [SceneType.CAMP, SceneType.MAZE, SceneType.COMBAT, SceneType.CHEST]
  if (dungeonScenes.includes(repairedState.currentScene) && !repairedState.party.inMaze) {
    repairedState.party.inMaze = true
  }

  if (!dungeonScenes.includes(repairedState.currentScene) && repairedState.party.inMaze) {
    repairedState.party.inMaze = false
  }

  return repairedState
}
```

---

## E. Auto-Save Logic

### When Auto-Save Triggers

```typescript
async function transitionToScene(
  from: SceneType,
  to: SceneType,
  state: GameState
): Promise<GameState> {
  // 1. Validate transition
  const validation = validator.canTransitionTo(from, to, state)
  if (!validation.allowed) {
    throw new Error(`Cannot transition to ${to}: ${validation.reason}`)
  }

  // 2. Auto-save if required
  if (validation.autoSaveBefore) {
    await autoSave(state)
  }

  // 3. Cleanup old scene state
  const cleanedState = cleanupSceneState(from, state)

  // 4. Initialize new scene state
  const newSceneState = initializeSceneState(to, cleanedState)

  // 5. Update current scene
  const newState = {
    ...cleanedState,
    currentScene: to,
    previousScene: from,
    sceneState: newSceneState
  }

  return newState
}

async function autoSave(state: GameState): Promise<void> {
  try {
    // Update last saved timestamp
    const stateToSave = {
      ...state,
      lastSaved: new Date()
    }

    // Serialize and save
    const saveData = serializeSaveFile(stateToSave)
    await writeFile(AUTO_SAVE_PATH, saveData)

    // Show subtle feedback (optional)
    showNotification("Auto-saved", { duration: 1000, style: 'subtle' })
  } catch (error) {
    // Auto-save failure should not crash the game
    console.error("Auto-save failed:", error)
    showWarning("Auto-save failed. Please manually save soon.")
  }
}
```

### What Gets Saved

**Everything in GameState:**
- All characters (roster)
- Current party composition
- Party status (in maze, dungeon position)
- Dungeon exploration state
- Game flags and story progress
- UI preferences

**NOT Saved (Transient State):**
- Current scene state (re-initialized on load)
- Combat state (combat resets on load)
- Chest state (chests re-roll on load)
- Animation state
- Sound/music playback state

### Safe Zone vs Dungeon Zone Rules

**Safe Zones (Auto-Save Enabled):**
- Castle Menu
- All town services (Tavern, Temple, Shop, Inn)
- Training Grounds
- Edge of Town
- Utilities Menu

**Dungeon Zones (No Auto-Save):**
- Camp (safe from encounters, but no auto-save)
- Maze (active exploration)
- Combat (battles)
- Chest (treasure)

**Critical Rule:**
- **Last safe save:** Edge of Town → Camp transition
- This save occurs BEFORE entering Camp (still in safe zone)
- Ensures party can recover to this point if wiped

```typescript
function isSafeZone(scene: SceneType): boolean {
  const safeZones = [
    SceneType.TITLE_SCREEN,
    SceneType.CASTLE_MENU,
    SceneType.TRAINING_GROUNDS,
    SceneType.TAVERN,
    SceneType.SHOP,
    SceneType.TEMPLE,
    SceneType.INN,
    SceneType.EDGE_OF_TOWN,
    SceneType.UTILITIES
  ]
  return safeZones.includes(scene)
}

function isDungeonZone(scene: SceneType): boolean {
  const dungeonZones = [
    SceneType.CAMP,
    SceneType.MAZE,
    SceneType.COMBAT,
    SceneType.CHEST
  ]
  return dungeonZones.includes(scene)
}
```

---

## F. State Recovery

### Handling Corrupted Saves

```typescript
async function loadGameWithRecovery(saveFilePath: string): Promise<GameState> {
  try {
    // Attempt normal load
    return await loadAndValidateGame(saveFilePath)
  } catch (error) {
    console.error("Save file corrupted:", error)

    // Attempt repair
    try {
      const rawState = await forceLoadSaveFile(saveFilePath)
      const repairedState = repairGameState(rawState)

      // Re-validate
      const validation = validateGameState(repairedState)
      if (validation.valid) {
        showWarningDialog({
          title: "Save File Repaired",
          message: "The save file was corrupted but has been repaired.\nSome data may have been lost.",
          note: "Please save immediately to create a new clean save."
        })
        return repairedState
      }
    } catch (repairError) {
      console.error("Repair failed:", repairError)
    }

    // Repair failed - offer backup load
    const backupPath = await findBackupSave(saveFilePath)
    if (backupPath) {
      const useBackup = await confirmDialog({
        title: "Load Backup Save?",
        message: "Primary save is corrupted. Load backup save?",
        warning: "Backup save may be older.",
        confirmKey: 'Y',
        cancelKey: 'N'
      })

      if (useBackup) {
        return await loadAndValidateGame(backupPath)
      }
    }

    // All recovery failed - start new game
    throw new Error("Cannot recover save file. Please start a new game.")
  }
}
```

### Party Wipe Scenarios

**Scenario 1: All Party Members Dead in Combat**

```typescript
function handlePartyWipe(state: GameState): GameState {
  // 1. Return party to town
  const recoveredState = {
    ...state,
    currentScene: SceneType.TEMPLE,
    party: {
      ...state.party,
      inMaze: false,
      status: PartyStatus.WOUNDED,
      dungeonPosition: null,
      dungeonFacing: null,
      currentDungeonLevel: 0
    }
  }

  // 2. Mark all members DEAD (not ASHES yet)
  recoveredState.characters = recoveredState.characters.map(c => {
    if (recoveredState.party.members.some(m => m.id === c.id)) {
      return { ...c, status: CharacterStatus.DEAD }
    }
    return c
  })

  // 3. Show message
  showMessage(
    "YOUR PARTY HAS BEEN DEFEATED!\n\n" +
    "Your bodies have been recovered and returned to the Temple.\n" +
    "Seek resurrection to continue your adventure."
  )

  // 4. Auto-save (party returned to safe zone)
  autoSave(recoveredState)

  return recoveredState
}
```

**Scenario 2: Total Party Kill (All Members → ASHES)**

```typescript
function handleTotalPartyKill(state: GameState): GameState {
  // 1. Mark all party members as ASHES
  const updatedCharacters = state.characters.map(c => {
    if (state.party.members.some(m => m.id === c.id)) {
      return { ...c, status: CharacterStatus.ASHES, currentHP: 0 }
    }
    return c
  })

  // 2. Clear party
  const clearedParty = {
    ...state.party,
    members: [],
    inMaze: false,
    status: PartyStatus.OK,
    dungeonPosition: null,
    dungeonFacing: null,
    currentDungeonLevel: 0
  }

  // 3. Return to Temple
  const recoveredState = {
    ...state,
    currentScene: SceneType.TEMPLE,
    characters: updatedCharacters,
    party: clearedParty
  }

  // 4. Show game over message
  showMessage(
    "YOUR PARTY HAS BEEN COMPLETELY DESTROYED!\n\n" +
    "All members have been reduced to ashes.\n" +
    "Your bodies have been recovered at the Temple.\n\n" +
    "Resurrection may still be possible... for a price."
  )

  // 5. Auto-save (returned to safe zone)
  autoSave(recoveredState)

  return recoveredState
}
```

### In-Maze Status Recovery

**Using LOKTOFEIT Spell (Recall to Castle):**

```typescript
function castLOKTOFEIT(state: GameState): GameState {
  if (!state.party.inMaze) {
    throw new Error("LOKTOFEIT can only be cast in the maze")
  }

  // 1. Save current dungeon position
  const dungeonSnapshot = {
    position: state.dungeon.position,
    facing: state.dungeon.facing,
    level: state.dungeon.level
  }

  // 2. Return party to Castle Menu
  const recoveredState = {
    ...state,
    currentScene: SceneType.CASTLE_MENU,
    party: {
      ...state.party,
      inMaze: false,  // Party successfully exited maze
      dungeonPosition: null,  // Clear saved position
      dungeonFacing: null,
      currentDungeonLevel: 0
    }
  }

  // 3. Show message
  showMessage("LOKTOFEIT!\n\nThe party is teleported back to the Castle.")

  // 4. Auto-save (party returned to safe zone)
  autoSave(recoveredState)

  return recoveredState
}
```

**Using Quit (Mark OUT):**

```typescript
// See Section C: Emergency Save (Camp → Quit)
// This marks party OUT and requires Utilities → Restart to recover
```

**Utilities → Restart OUT Party:**

```typescript
function restartOUTParty(state: GameState): GameState {
  if (state.party.status !== PartyStatus.OUT) {
    throw new Error("Party is not marked OUT")
  }

  // 1. Clear OUT status for all members
  const recoveredCharacters = state.characters.map(c => {
    if (c.status === CharacterStatus.OUT) {
      return { ...c, status: CharacterStatus.OK }
    }
    return c
  })

  // 2. Clear party IN_MAZE status
  const recoveredParty = {
    ...state.party,
    status: PartyStatus.OK,
    inMaze: false,
    dungeonPosition: null,  // LOSE dungeon progress
    dungeonFacing: null,
    currentDungeonLevel: 0
  }

  // 3. Return to Castle Menu
  const recoveredState = {
    ...state,
    currentScene: SceneType.CASTLE_MENU,
    characters: recoveredCharacters,
    party: recoveredParty
  }

  // 4. Show message
  showMessage(
    "OUT PARTY RESTARTED\n\n" +
    "Your party has been recovered and returned to the Castle.\n" +
    "Dungeon progress has been lost."
  )

  // 5. Auto-save
  autoSave(recoveredState)

  return recoveredState
}
```

---

## G. Implementation Notes

### StateService Interface

```typescript
interface StateService {
  // State Access
  getCurrentState(): GameState
  getCharacter(id: string): Character | null
  getParty(): Party

  // State Mutations
  updateCharacter(id: string, updates: Partial<Character>): GameState
  updateParty(updates: Partial<Party>): GameState
  updateDungeon(updates: Partial<DungeonState>): GameState

  // Scene Management
  transitionToScene(to: SceneType): Promise<GameState>
  getCurrentScene(): SceneType

  // Persistence
  autoSave(): Promise<void>
  manualSave(name?: string): Promise<void>
  loadGame(saveFilePath: string): Promise<GameState>

  // Validation
  validateState(): StateValidation
  repairState(): GameState
}
```

### Commands That Modify State

All state mutations go through commands for undo/redo support and audit trail.

```typescript
interface Command {
  execute(state: GameState): GameState
  undo(state: GameState): GameState
  description: string
}

// Example: Add Character to Party Command
class AddCharacterToPartyCommand implements Command {
  constructor(private characterId: string) {}

  execute(state: GameState): GameState {
    const character = state.characters.find(c => c.id === this.characterId)
    if (!character) {
      throw new Error(`Character ${this.characterId} not found`)
    }

    // Validate
    const validation = validateAddCharacter(state.party, character)
    if (!validation.allowed) {
      throw new Error(validation.reason)
    }

    // Add to party
    return {
      ...state,
      party: {
        ...state.party,
        members: [...state.party.members, character]
      },
      characters: state.characters.map(c =>
        c.id === this.characterId
          ? { ...c, status: CharacterStatus.IN_PARTY }
          : c
      )
    }
  }

  undo(state: GameState): GameState {
    return {
      ...state,
      party: {
        ...state.party,
        members: state.party.members.filter(m => m.id !== this.characterId)
      },
      characters: state.characters.map(c =>
        c.id === this.characterId
          ? { ...c, status: CharacterStatus.OK }
          : c
      )
    }
  }

  get description(): string {
    return `Add character ${this.characterId} to party`
  }
}
```

### Event Sourcing Considerations

For advanced implementations, consider event sourcing:

```typescript
interface GameEvent {
  type: string
  timestamp: Date
  data: any
}

// Instead of saving complete state, save event stream
const events: GameEvent[] = [
  { type: 'CHARACTER_CREATED', timestamp: new Date(), data: { id: 'c1', name: 'Gandalf' } },
  { type: 'CHARACTER_ADDED_TO_PARTY', timestamp: new Date(), data: { characterId: 'c1' } },
  { type: 'PARTY_ENTERED_MAZE', timestamp: new Date(), data: { level: 1 } },
  // ... etc
]

// Rebuild state from events
function replayEvents(events: GameEvent[]): GameState {
  let state = createInitialState()

  for (const event of events) {
    state = applyEvent(state, event)
  }

  return state
}

// Benefits:
// - Complete audit trail
// - Time-travel debugging
// - Smaller save files (delta-based)
// - Easy rollback to any point

// Trade-offs:
// - More complex implementation
// - Slower load times (must replay all events)
// - Event versioning challenges
```

---

## Related Documentation

- [UI Patterns](./ui-patterns.md) - Reusable interface patterns
- [Navigation Map](./navigation-map.md) - Scene transition flows
- [Individual Scenes](./scenes/) - Scene-specific state details
- [Character System](../systems/character-system.md) - Character state details
- [Party System](../systems/party-system.md) - Party formation rules
- [Dungeon System](../systems/dungeon-system.md) - Maze exploration state
- [Combat System](../systems/combat-system.md) - Combat state mechanics

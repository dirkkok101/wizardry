# Party Structure Diagram

**Visual representation of party and character relationships.**

## Description

The party is the core game entity. Characters belong to the roster, with 1-6 active in the party at any time.

## Diagram

```mermaid
classDiagram
    GameState --> CharacterRoster
    GameState --> Party
    Party --> Character : has 1-6
    CharacterRoster --> Character : has 0-20
    Party --> Formation
    Formation --> FrontRow : 0-3 characters
    Formation --> BackRow : 0-3 characters
    Character --> Class
    Character --> Race
    Character --> Equipment
    Character --> SpellBook
    Character --> StatusEffects

    class GameState {
        +mode: GameMode
        +characterRoster: Map~string, Character~
        +activeParty: Party
        +currentLevel: number
        +position: Position
        +eventLog: Event[]
    }

    class CharacterRoster {
        +characters: Map~string, Character~
        +addCharacter(char)
        +removeCharacter(id)
        +getCharacter(id)
    }

    class Party {
        +members: Character[]
        +formation: Formation
        +position: Position
        +facing: Direction
        +gold: number
        +addMember(char)
        +removeMember(id)
    }

    class Formation {
        +frontRow: Character[]
        +backRow: Character[]
        +getRow(char): Row
        +moveToFront(char)
        +moveToBack(char)
    }

    class Character {
        +id: string
        +name: string
        +race: Race
        +class: Class
        +stats: Stats
        +hp: number
        +spellPoints: Map~number, number~
        +equipment: Equipment
        +status: StatusEffect[]
    }
```

## Key Relationships

**GameState → CharacterRoster**: All created characters (1:N)
**GameState → Party**: Current active party (1:1)
**Party → Character**: 1-6 active characters
**Party → Formation**: Front row (3 max) + Back row (3 max)

## Formation Rules

**Front Row**:
- Max 3 characters
- Takes melee hits
- Can attack in melee

**Back Row**:
- Max 3 characters
- Protected from melee
- Cannot melee attack (can use ranged/magic)

**Movement**:
- Characters can move front ↔ back
- Formation changes during camp (not combat)

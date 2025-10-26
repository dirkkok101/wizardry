# User Interface Documentation

**Complete UI flow documentation for Wizardry 1.**

## Overview

This documentation covers all 14 user interface scenes, navigation flows, UI patterns, and state management.

**Status:** 🚧 In Progress

## Contents

- [Scenes](./scenes/) - Individual scene documentation
- [Navigation Map](./navigation-map.md) - Complete navigation flow diagram
- [UI Patterns](./ui-patterns.md) - Reusable UI conventions
- [State Management](./state-management.md) - Application state specification
- [Input Reference](./input-reference.md) - Keyboard shortcuts and input handling

## Scene List

### Safe Zone Scenes
- [Title Screen](./scenes/00-title-screen.md)
- [Castle Menu](./scenes/01-castle-menu.md) (Central Hub)
- [Training Grounds](./scenes/02-training-grounds.md)
- [Gilgamesh's Tavern](./scenes/03-gilgameshs-tavern.md)
- [Boltac's Trading Post](./scenes/04-boltacs-trading-post.md)
- [Temple of Cant](./scenes/05-temple-of-cant.md)
- [Adventurer's Inn](./scenes/06-adventurers-inn.md)
- [Edge of Town](./scenes/07-edge-of-town.md)
- [Utilities Menu](./scenes/08-utilities-menu.md)

### Dungeon Zone Scenes
- [Camp](./scenes/09-camp.md)
- [Maze](./scenes/10-maze.md)
- [Combat](./scenes/11-combat.md)
- [Chest](./scenes/12-chest.md)

### Multi-Context Scenes
- [Character Inspection](./scenes/13-character-inspection.md)

## Quick Navigation

**Starting the Game:**
Title Screen → Castle Menu

**Character Creation:**
Castle Menu → Edge of Town → Training Grounds

**Party Formation:**
Castle Menu → Gilgamesh's Tavern

**Entering Dungeon:**
Castle Menu → Edge of Town → Camp → Maze

## Architecture

- **Hub-and-Spoke Model:** Castle Menu is central hub
- **Single-Keystroke Interface:** First letter navigation (no Enter needed)
- **Context-Sensitive:** Some screens adapt based on location
- **State-Based Navigation:** Transitions validated by game state

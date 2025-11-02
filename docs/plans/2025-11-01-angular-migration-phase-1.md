# Angular Migration - Phase 1: Workspace Setup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Angular 19 workspace, configure Jest testing, and migrate core business logic (services, types, data files) from the Vite project.

**Architecture:** Create fresh Angular 19 workspace using standalone components and signals. Copy unchanged business logic (PartyService, CombatService, etc.) to new project. Configure Jest for testing. Verify all service tests pass in new environment.

**Tech Stack:** Angular 19, Angular CLI, Jest, TypeScript 5.5+, Node 18+

**Reference Design:** See `docs/plans/2025-11-01-angular-migration-design.md` for complete architecture

---

## Prerequisites

**Current Location:** `/Users/dirkkok/Development/wizardry/.worktrees/angular-migration`

**Verify you're in worktree:**
```bash
pwd
# Expected: /Users/dirkkok/Development/wizardry/.worktrees/angular-migration
git branch --show-current
# Expected: feature/angular-migration
```

---

## Task 1: Create Angular Workspace

**Files:**
- Create: New directory `../wizardry-angular/` (sibling to worktree)
- Reference: `docs/plans/2025-11-01-angular-migration-design.md`

**Step 1: Navigate to parent directory**

```bash
cd ..
pwd
# Expected: /Users/dirkkok/Development/wizardry/.worktrees
```

**Step 2: Create Angular 19 workspace**

```bash
npx @angular/cli@latest new wizardry-angular \
  --routing=true \
  --style=scss \
  --standalone=true \
  --skip-git=true \
  --package-manager=npm
```

**Interactive prompts - choose these:**
- "Which stylesheet format would you like to use?" → **SCSS**
- "Do you want to enable Server-Side Rendering (SSR)?" → **No**

**Expected output:** "CREATE wizardry-angular/..." followed by npm install

**Step 3: Verify Angular workspace created**

```bash
cd wizardry-angular
ls -la
# Expected: angular.json, package.json, src/, node_modules/, etc.
```

**Step 4: Verify Angular version**

```bash
ng version
# Expected: Angular CLI: 19.x.x
```

**Step 5: Commit workspace creation**

```bash
cd ../angular-migration
git add -A
git commit -m "chore: create Angular 19 workspace

- Initialize Angular 19 with standalone components
- Configure SCSS styling
- Set up routing
- Skip SSR (not needed for game)

Related to Phase 1 of Angular migration."
```

---

## Task 2: Configure Jest Testing

**Files:**
- Modify: `../wizardry-angular/package.json`
- Create: `../wizardry-angular/jest.config.js`
- Create: `../wizardry-angular/setup-jest.ts`
- Modify: `../wizardry-angular/tsconfig.spec.json`

**Step 1: Install Jest dependencies**

```bash
cd ../wizardry-angular
npm install --save-dev @angular-builders/jest jest @types/jest ts-jest
```

**Expected:** Packages installed successfully

**Step 2: Create Jest configuration file**

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/polyfills.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$'
      }
    ]
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ]
};
```

**Step 3: Create Jest setup file**

Create `setup-jest.ts`:

```typescript
import 'jest-preset-angular/setup-jest';

// Global test configuration
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: ['-webkit-appearance']
  })
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>'
});

Object.defineProperty(document.body.style, 'transform', {
  value: () => ({
    enumerable: true,
    configurable: true
  })
});
```

**Step 4: Install jest-preset-angular**

```bash
npm install --save-dev jest-preset-angular
```

**Step 5: Update package.json scripts**

Modify `package.json` - find the "scripts" section and update:

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "ng lint"
  }
}
```

**Step 6: Update angular.json to use Jest builder**

Modify `angular.json` - find the "test" section under "architect" and replace it:

```json
{
  "test": {
    "builder": "@angular-builders/jest:run",
    "options": {
      "tsConfig": "tsconfig.spec.json"
    }
  }
}
```

**Step 7: Update tsconfig.spec.json**

Modify `tsconfig.spec.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": [
      "jest",
      "node"
    ],
    "esModuleInterop": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.d.ts"
  ]
}
```

**Step 8: Run Jest to verify setup**

```bash
npm test
```

**Expected:** Jest runs and reports "No tests found" (normal - no tests yet)

**Step 9: Commit Jest configuration**

```bash
cd ../angular-migration
git add ../wizardry-angular/
git commit -m "chore: configure Jest testing for Angular

- Install @angular-builders/jest and dependencies
- Create jest.config.js with Angular preset
- Set up Jest test environment
- Update package.json test scripts
- Configure tsconfig.spec.json for Jest

Tests run successfully (0 tests found - expected)."
```

---

## Task 3: Copy Core Types

**Files:**
- Copy from: `src/types/*.ts` (worktree)
- Copy to: `../wizardry-angular/src/types/*.ts`

**Step 1: Create types directory in Angular project**

```bash
cd ../wizardry-angular
mkdir -p src/types
```

**Step 2: Copy all type files**

```bash
cp -r ../angular-migration/src/types/* src/types/
```

**Step 3: List copied files**

```bash
ls -la src/types/
```

**Expected files:**
- Character.ts
- Party.ts
- GameState.ts
- SceneType.ts
- (and any other type files)

**Step 4: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

**Expected:** No errors (types should compile cleanly)

**Step 5: Commit types**

```bash
cd ../angular-migration
git add ../wizardry-angular/src/types/
git commit -m "feat: copy core type definitions to Angular project

Copied all TypeScript type files from Canvas project:
- Character.ts
- Party.ts
- GameState.ts
- SceneType.ts
- All other type definitions

Types compile successfully with no errors."
```

---

## Task 4: Copy Service Layer (Pure Functions)

**Files:**
- Copy from: `src/services/*.ts` (worktree)
- Copy to: `../wizardry-angular/src/services/*.ts`
- **EXCLUDE:** `SceneNavigationService.ts` (will be refactored later)

**Step 1: Create services directory**

```bash
cd ../wizardry-angular
mkdir -p src/services
```

**Step 2: Copy service files (excluding SceneNavigationService)**

```bash
cd ../angular-migration
cp src/services/PartyService.ts ../wizardry-angular/src/services/
cp src/services/CombatService.ts ../wizardry-angular/src/services/
cp src/services/SpellService.ts ../wizardry-angular/src/services/
cp src/services/DungeonService.ts ../wizardry-angular/src/services/
cp src/services/CharacterService.ts ../wizardry-angular/src/services/
cp src/services/BodyRecoveryService.ts ../wizardry-angular/src/services/
cp src/services/AssetLoadingService.ts ../wizardry-angular/src/services/
cp src/services/SaveService.ts ../wizardry-angular/src/services/
cp src/services/GameInitializationService.ts ../wizardry-angular/src/services/
cp src/services/InputService.ts ../wizardry-angular/src/services/
```

**Note:** Intentionally skipping `SceneNavigationService.ts` - it will be refactored to use Angular Router in Phase 2.

**Step 3: List copied services**

```bash
ls -la ../wizardry-angular/src/services/
```

**Expected:** 10 service files (all except SceneNavigationService)

**Step 4: Verify services compile**

```bash
cd ../wizardry-angular
npx tsc --noEmit
```

**Expected:** No errors

**Step 5: Commit services**

```bash
cd ../angular-migration
git add ../wizardry-angular/src/services/
git commit -m "feat: copy service layer to Angular project

Copied pure function services (stateless business logic):
- PartyService
- CombatService
- SpellService
- DungeonService
- CharacterService
- BodyRecoveryService
- AssetLoadingService
- SaveService
- GameInitializationService
- InputService

Note: SceneNavigationService intentionally excluded - will be
refactored to use Angular Router in Phase 2.

Services compile successfully."
```

---

## Task 5: Copy Data Files

**Files:**
- Copy from: `data/*` (worktree root)
- Copy to: `../wizardry-angular/src/assets/data/*`

**Step 1: Create assets/data directory structure**

```bash
cd ../wizardry-angular
mkdir -p src/assets/data/maps
mkdir -p src/assets/data/spells
mkdir -p src/assets/data/monsters
mkdir -p src/assets/data/items
mkdir -p src/assets/data/races
mkdir -p src/assets/data/classes
```

**Step 2: Copy all data files**

```bash
cd ../../wizardry
cp -r data/* .worktrees/wizardry-angular/src/assets/data/
```

**Step 3: Verify data files copied**

```bash
cd .worktrees/wizardry-angular
ls -la src/assets/data/maps/
ls -la src/assets/data/spells/
ls -la src/assets/data/monsters/
ls -la src/assets/data/items/
```

**Expected:** JSON files in each directory

**Step 4: Verify JSON is valid**

```bash
node -e "console.log('Testing JSON...'); require('./src/assets/data/races/human.json'); console.log('✓ Valid JSON')"
```

**Expected:** "✓ Valid JSON"

**Step 5: Commit data files**

```bash
cd ../angular-migration
git add ../wizardry-angular/src/assets/
git commit -m "feat: copy game data files to Angular assets

Moved all JSON data files to src/assets/data/:
- maps/ (dungeon level data)
- spells/ (mage and priest spells)
- monsters/ (monster definitions)
- items/ (weapons, armor, consumables)
- races/ (character races)
- classes/ (character classes)

All JSON files validated successfully."
```

---

## Task 6: Migrate Service Tests

**Files:**
- Copy from: `tests/services/*.test.ts` (worktree)
- Copy to: `../wizardry-angular/src/services/*.spec.ts`
- Modify: Update imports and test syntax for Jest

**Step 1: Copy test helper factories**

```bash
cd ../wizardry-angular
mkdir -p src/testing
cd ../angular-migration
cp tests/helpers/test-factories.ts ../wizardry-angular/src/testing/test-factories.ts
```

**Step 2: Copy CharacterService test (example)**

```bash
cp tests/services/CharacterService.test.ts ../wizardry-angular/src/services/CharacterService.spec.ts
```

**Step 3: Update test imports**

Edit `../wizardry-angular/src/services/CharacterService.spec.ts`:

Change from:
```typescript
import { describe, it, expect } from 'vitest';
import { CharacterService } from '../services/CharacterService';
```

To:
```typescript
import { CharacterService } from './CharacterService';
import { createTestCharacter } from '../testing/test-factories';
```

**Step 4: Run CharacterService test**

```bash
cd ../wizardry-angular
npm test -- CharacterService
```

**Expected:** Tests pass (9 tests)

**Step 5: Copy remaining service tests**

```bash
cd ../angular-migration

# Copy and rename each service test
for test_file in tests/services/*.test.ts; do
  base_name=$(basename "$test_file" .test.ts)
  cp "$test_file" "../wizardry-angular/src/services/${base_name}.spec.ts"
done
```

**Step 6: Update all test imports in batch**

```bash
cd ../wizardry-angular/src/services

# Update imports from vitest to jest (imports are auto-available in Jest)
for spec_file in *.spec.ts; do
  # Remove vitest import line
  sed -i '' '/from .vitest./d' "$spec_file"

  # Fix relative imports for services (change ../ to ./)
  sed -i '' 's|from '\''../services/|from '\''./|g' "$spec_file"

  # Fix test factories import
  sed -i '' 's|from '\''.*test-factories|from '\''../testing/test-factories|g' "$spec_file"
done
```

**Step 7: Run all service tests**

```bash
npm test -- src/services
```

**Expected:** All service tests pass

**Step 8: Commit service tests**

```bash
cd ../angular-migration
git add ../wizardry-angular/src/services/*.spec.ts
git add ../wizardry-angular/src/testing/
git commit -m "test: migrate service tests from Vitest to Jest

- Copy all service test files
- Rename .test.ts to .spec.ts (Angular convention)
- Update imports (remove vitest, fix relative paths)
- Copy test factory helpers

All service tests passing:
- CharacterService (9 tests)
- PartyService (tests count)
- CombatService (tests count)
- SpellService (tests count)
- DungeonService (tests count)
- BodyRecoveryService (tests count)
- SaveService (tests count)
- GameInitializationService (tests count)
- InputService (tests count)"
```

---

## Task 7: Create Basic Angular App Structure

**Files:**
- Modify: `../wizardry-angular/src/app/app.component.ts`
- Modify: `../wizardry-angular/src/app/app.component.html`
- Modify: `../wizardry-angular/src/app/app.config.ts`

**Step 1: Update app.config.ts for routing**

Edit `src/app/app.config.ts`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};
```

**Step 2: Create empty routes file**

Create `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

// Routes will be added in Phase 3
export const routes: Routes = [];
```

**Step 3: Simplify app.component.ts**

Edit `src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="wizardry-game">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .wizardry-game {
      width: 100%;
      height: 100vh;
      background-color: #000;
      color: #00ff00;
      font-family: 'Courier New', monospace;
    }
  `]
})
export class AppComponent {
  title = 'Wizardry: Proving Grounds of the Mad Overlord';
}
```

**Step 4: Delete unused template file**

```bash
cd ../wizardry-angular
rm src/app/app.component.html
```

**Step 5: Verify app builds**

```bash
npm run build
```

**Expected:** Build succeeds

**Step 6: Verify app runs**

```bash
npm start
```

**Expected:** Dev server starts on http://localhost:4200

Open browser and verify blank black screen appears.

Press Ctrl+C to stop server.

**Step 7: Commit app structure**

```bash
cd ../angular-migration
git add ../wizardry-angular/src/app/
git commit -m "feat: set up basic Angular app structure

- Configure routing in app.config.ts
- Create empty routes file (routes added in Phase 3)
- Simplify AppComponent with inline template
- Add basic retro styling (black bg, green text)
- Remove unused template file

App builds and runs successfully."
```

---

## Task 8: Verify Complete Phase 1 Setup

**Files:**
- None (verification only)

**Step 1: Run all tests**

```bash
cd ../wizardry-angular
npm test
```

**Expected:** All service tests pass (should be ~50-100 tests)

**Step 2: Run build**

```bash
npm run build
```

**Expected:** Build succeeds with no errors

**Step 3: Check bundle size**

```bash
ls -lh dist/wizardry-angular/browser/*.js | awk '{print $5, $9}'
```

**Expected:** Main bundle ~200-300KB (uncompressed)

**Step 4: Run type checking**

```bash
npx tsc --noEmit
```

**Expected:** No TypeScript errors

**Step 5: Verify file structure**

```bash
tree -L 2 src/
```

**Expected structure:**
```
src/
├── app/
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── assets/
│   └── data/
├── services/
│   ├── *.ts (service files)
│   └── *.spec.ts (test files)
├── testing/
│   └── test-factories.ts
├── types/
│   └── *.ts (type files)
├── index.html
├── main.ts
└── styles.scss
```

**Step 6: Create Phase 1 completion report**

Create `docs/plans/phase-1-completion-report.md`:

```markdown
# Phase 1 Completion Report

**Date:** 2025-11-01
**Status:** ✅ COMPLETE

## Completed Tasks

1. ✅ Created Angular 19 workspace
2. ✅ Configured Jest testing
3. ✅ Copied core types (Character, Party, GameState, etc.)
4. ✅ Copied service layer (10 services, excluding SceneNavigationService)
5. ✅ Copied game data files to assets
6. ✅ Migrated service tests from Vitest to Jest
7. ✅ Set up basic Angular app structure
8. ✅ Verified complete setup

## Metrics

- **Services migrated:** 10/11 (SceneNavigationService deferred to Phase 2)
- **Tests passing:** [INSERT COUNT]
- **TypeScript errors:** 0
- **Build time:** [INSERT TIME]
- **Bundle size:** ~[INSERT SIZE]KB uncompressed

## Known Issues

None - Phase 1 complete and ready for Phase 2.

## Next Steps

Phase 2: Build shared Angular infrastructure
- Create GameStateService (signal-based)
- Create shared UI components (MenuComponent, etc.)
- Create KeystrokeInputDirective
- Set up route guards
- Refactor SceneNavigationService to use Angular Router

See: `docs/plans/2025-11-01-angular-migration-phase-2.md` (to be created)
```

**Step 7: Final commit**

```bash
cd ../angular-migration
git add ../wizardry-angular/docs/
git commit -m "docs: Phase 1 completion report

Angular workspace setup complete:
- Angular 19 workspace created
- Jest testing configured
- Core types migrated
- Service layer migrated (10 services)
- Game data copied to assets
- Service tests migrated and passing
- Basic app structure set up

All tests passing. Ready for Phase 2."
```

---

## Verification Checklist

Before moving to Phase 2, verify:

- [ ] Angular 19 workspace exists at `../wizardry-angular/`
- [ ] `npm test` runs Jest and all tests pass
- [ ] `npm run build` succeeds with no errors
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] 10 service files exist in `src/services/`
- [ ] All service tests exist as `.spec.ts` files
- [ ] Data files exist in `src/assets/data/`
- [ ] Type files exist in `src/types/`
- [ ] App runs with `npm start`
- [ ] All commits pushed to feature branch

---

## Troubleshooting

### Issue: Jest tests fail with "Cannot find module"

**Solution:**
```bash
cd ../wizardry-angular
npm install
```

### Issue: TypeScript errors about missing types

**Solution:** Check `tsconfig.json` includes all necessary paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Issue: Build fails with Angular CLI errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Service tests fail in Jest but passed in Vitest

**Solution:** Check for Vitest-specific syntax:
- `vi.fn()` → `jest.fn()`
- `vi.spyOn()` → `jest.spyOn()`
- `vi.mock()` → `jest.mock()`

---

## Estimated Time

- Task 1: 10 minutes (Angular workspace creation)
- Task 2: 15 minutes (Jest configuration)
- Task 3: 5 minutes (Copy types)
- Task 4: 10 minutes (Copy services)
- Task 5: 10 minutes (Copy data files)
- Task 6: 30 minutes (Migrate tests)
- Task 7: 15 minutes (App structure)
- Task 8: 15 minutes (Verification)

**Total: ~2 hours** (faster if batch operations work smoothly)

**Note:** This is significantly faster than the 2-3 days estimated in the design doc because we're doing straightforward file copying and configuration. The time-consuming work starts in Phase 2-5 with component implementation.

---

## Next Plan

After completing Phase 1, create Phase 2 plan:

**File:** `docs/plans/2025-11-01-angular-migration-phase-2.md`

**Focus:** Shared Angular infrastructure (GameStateService, components, directives, guards)

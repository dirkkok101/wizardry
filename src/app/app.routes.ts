import { Routes } from '@angular/router';
import { TitleScreenComponent } from '@scenes/title-screen/title-screen.component';
import { CastleMenuComponent } from '@scenes/castle-menu/castle-menu.component';
import { TavernComponent } from '@scenes/tavern/tavern.component';
import { InnComponent } from '@scenes/inn/inn.component';
import { TempleComponent } from '@scenes/temple/temple.component';
import { ShopComponent } from '@scenes/shop/shop.component';
import { TrainingGroundsComponent } from '@scenes/training-grounds/training-grounds.component';
import { CharacterCreationComponent } from '@scenes/character-creation/character-creation.component';
import { CharacterInspectionComponent } from '@scenes/character-inspection/character-inspection.component';
import { SpellCastingComponent } from '@scenes/spell-casting/spell-casting.component';
import { CampComponent } from '@scenes/camp/camp.component';
import { SystemComponent } from '@scenes/system/system.component';
import { gameLoadedGuard } from '@core/guards/game-loaded.guard';
import { partyExistsGuard } from '@core/guards/party-exists.guard';
import { partyNotInMazeGuard } from '@core/guards/party-not-in-maze.guard';
import { partyInMazeGuard } from '@core/guards/party-in-maze.guard';

// Maze layout and child routes
import { MazeLayoutComponent } from '@scenes/maze-layout/maze-layout.component';
import { MazeExplorationComponent } from '@scenes/maze-exploration/maze-exploration.component';
import { CombatPlanningComponent } from '@scenes/combat-planning/combat-planning.component';
import { CombatPlaybackComponent } from '@scenes/combat-playback/combat-playback.component';
import { CombatVictoryComponent } from '@scenes/combat-victory/combat-victory.component';
import { CombatDefeatComponent } from '@scenes/combat-defeat/combat-defeat.component';
import { MazeChestComponent } from '@scenes/maze-chest/maze-chest.component';
import { ChestPlaybackComponent } from '@scenes/chest-playback/chest-playback.component';
import { ChestRewardsComponent } from '@scenes/chest-rewards/chest-rewards.component';
import {
  inCombatGuard,
  notInCombatGuard,
  hasChestGuard,
  noChestGuard
} from '@core/guards/combat.guards';

export const routes: Routes = [
  {
    path: '',
    component: TitleScreenComponent
  },
  // Town zone routes - require NOT in maze (prevents URL exploits)
  {
    path: 'castle-menu',
    component: CastleMenuComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'tavern',
    component: TavernComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'inn',
    component: InnComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'temple',
    component: TempleComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'shop',
    component: ShopComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'training-grounds',
    component: TrainingGroundsComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'character-creation',
    component: CharacterCreationComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  {
    path: 'system',
    component: SystemComponent,
    canActivate: [gameLoadedGuard, partyNotInMazeGuard]
  },
  // Flexible routes - accessible from both town and maze
  // Support returnTo query parameter for proper back-navigation
  {
    path: 'character-inspection',
    component: CharacterInspectionComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'spell-casting',
    component: SpellCastingComponent,
    canActivate: [gameLoadedGuard]
  },
  // Dungeon zone routes - child routes render as overlays over persistent WebGL canvas
  {
    path: 'maze',
    component: MazeLayoutComponent,
    canActivate: [gameLoadedGuard, partyExistsGuard, partyInMazeGuard],
    children: [
      // Default route: exploration (requires NOT in combat and NO pending chest)
      {
        path: '',
        component: MazeExplorationComponent,
        canActivate: [notInCombatGuard, noChestGuard]
      },
      // Combat flow routes
      {
        path: 'combat/planning',
        component: CombatPlanningComponent,
        canActivate: [inCombatGuard]
      },
      {
        path: 'combat/playback',
        component: CombatPlaybackComponent,
        canActivate: [inCombatGuard]
      },
      {
        path: 'combat/victory',
        component: CombatVictoryComponent,
        canActivate: [inCombatGuard]
      },
      {
        path: 'combat/defeat',
        component: CombatDefeatComponent,
        canActivate: [inCombatGuard]
      },
      // Chest flow routes
      {
        path: 'chest',
        component: MazeChestComponent,
        canActivate: [hasChestGuard]
      },
      {
        path: 'chest/playback',
        component: ChestPlaybackComponent,
        canActivate: [hasChestGuard]
      },
      {
        path: 'chest/rewards',
        component: ChestRewardsComponent,
        canActivate: [hasChestGuard]
      }
    ]
  },
  {
    path: 'camp',
    component: CampComponent,
    canActivate: [gameLoadedGuard, partyExistsGuard, partyInMazeGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

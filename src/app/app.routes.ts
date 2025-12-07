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
import { MazeComponent } from '@scenes/maze/maze.component';
import { CombatComponent } from '@scenes/combat-scene/combat';
import { ChestComponent } from '@scenes/chest/chest.component';
import { VictoryComponent } from '@scenes/victory/victory.component';
import { gameLoadedGuard } from '@core/guards/game-loaded.guard';
import { partyExistsGuard } from '@core/guards/party-exists.guard';
import { partyNotInMazeGuard } from '@core/guards/party-not-in-maze.guard';
import { partyInMazeGuard } from '@core/guards/party-in-maze.guard';

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
  // Dungeon zone routes - require party exists AND proper maze entry
  {
    path: 'maze',
    component: MazeComponent,
    canActivate: [gameLoadedGuard, partyExistsGuard, partyInMazeGuard]
  },
  {
    path: 'combat',
    component: CombatComponent,
    canActivate: [gameLoadedGuard, partyExistsGuard, partyInMazeGuard]
  },
  {
    path: 'chest',
    component: ChestComponent,
    canActivate: [gameLoadedGuard, partyExistsGuard, partyInMazeGuard]
  },
  {
    path: 'victory',
    component: VictoryComponent,
    canActivate: [gameLoadedGuard, partyExistsGuard, partyInMazeGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

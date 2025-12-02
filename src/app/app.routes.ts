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

export const routes: Routes = [
  {
    path: '',
    component: TitleScreenComponent
  },
  {
    path: 'castle-menu',
    component: CastleMenuComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'tavern',
    component: TavernComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'inn',
    component: InnComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'temple',
    component: TempleComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'shop',
    component: ShopComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'training-grounds',
    component: TrainingGroundsComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'character-creation',
    component: CharacterCreationComponent,
    canActivate: [gameLoadedGuard]
  },
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
  {
    path: 'maze',
    component: MazeComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'combat',
    component: CombatComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'chest',
    component: ChestComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: 'victory',
    component: VictoryComponent,
    canActivate: [gameLoadedGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

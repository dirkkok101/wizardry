import { Routes } from '@angular/router';
import { TitleScreenComponent } from './title-screen/title-screen.component';
import { CastleMenuComponent } from './castle-menu/castle-menu.component';
import { TavernComponent } from './tavern/tavern.component';
import { InnComponent } from './inn/inn.component';
import { TempleComponent } from './temple/temple.component';
import { ShopComponent } from './shop/shop.component';
import { TrainingGroundsComponent } from './training-grounds/training-grounds.component';
import { CharacterCreationComponent } from './character-creation/character-creation.component';
import { CharacterInspectionComponent } from './character-inspection/character-inspection.component';
import { SpellCastingComponent } from './spell-casting/spell-casting.component';
import { MazeComponent } from './maze/maze.component';
import { CampComponent } from './camp/camp.component';
import { CombatComponent } from './scenes/combat/combat';

export const routes: Routes = [
  {
    path: '',
    component: TitleScreenComponent
  },
  {
    path: 'castle-menu',
    component: CastleMenuComponent
  },
  {
    path: 'tavern',
    component: TavernComponent
  },
  {
    path: 'inn',
    component: InnComponent
  },
  {
    path: 'temple',
    component: TempleComponent
  },
  {
    path: 'shop',
    component: ShopComponent
  },
  {
    path: 'training-grounds',
    component: TrainingGroundsComponent
  },
  {
    path: 'character-creation',
    component: CharacterCreationComponent
  },
  {
    path: 'character-inspection',
    component: CharacterInspectionComponent
  },
  {
    path: 'spell-casting',
    component: SpellCastingComponent
  },
  {
    path: 'maze',
    component: MazeComponent
  },
  {
    path: 'camp',
    component: CampComponent
  },
  {
    path: 'combat',
    component: CombatComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];

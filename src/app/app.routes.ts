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
    path: 'combat',
    component: CombatComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];

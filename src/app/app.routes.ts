import { Routes } from '@angular/router';
import { TitleScreenComponent } from './title-screen/title-screen.component';
import { CastleMenuComponent } from './castle-menu/castle-menu.component';
import { EdgeOfTownComponent } from './edge-of-town/edge-of-town.component';
import { TavernComponent } from './tavern/tavern.component';
import { InnComponent } from './inn/inn.component';

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
    path: 'edge-of-town',
    component: EdgeOfTownComponent
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
    path: '**',
    redirectTo: ''
  }
];

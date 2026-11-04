import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'popup',
    loadComponent: () => import('./popup/popup').then((m) => m.Popup),
  },
  {
    path: 'options',
    loadComponent: () => import('./options/options').then((m) => m.Options),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'popup',
  },
];

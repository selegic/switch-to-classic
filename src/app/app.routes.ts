import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'popup',
    loadComponent: () => import('./popup/popup').then((m) => m.Popup),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'popup',
  },
];

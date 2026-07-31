import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Wedding Platform',
    loadComponent: () =>
      import('./features/public-site/public-home').then((component) => component.PublicHome),
  },
  {
    path: 'rsvp',
    title: 'RSVP | Wedding Platform',
    loadComponent: () =>
      import('./features/rsvp/rsvp-home').then((component) => component.RsvpHome),
  },
  {
    path: 'admin',
    title: 'Administração | Wedding Platform',
    loadComponent: () =>
      import('./features/admin/admin-home').then((component) => component.AdminHome),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

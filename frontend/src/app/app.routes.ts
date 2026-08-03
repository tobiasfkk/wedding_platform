import { Routes } from '@angular/router';

import { adminGuard } from './core/auth/admin.guard';

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
    path: 'admin/login',
    title: 'Login administrativo | Wedding Platform',
    loadComponent: () =>
      import('./features/admin/admin-login').then((component) => component.AdminLogin),
  },
  {
    path: 'admin/invitations',
    title: 'Convites | Wedding Platform',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/invitation-management').then(
        (component) => component.InvitationManagement,
      ),
  },
  {
    path: 'admin/guests',
    title: 'Convidados | Wedding Platform',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/guest-management').then((component) => component.GuestManagement),
  },
  {
    path: 'admin',
    title: 'Administração | Wedding Platform',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-home').then((component) => component.AdminHome),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

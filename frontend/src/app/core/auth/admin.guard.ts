import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadSession().pipe(
    map((session) =>
      session.authenticated
        ? true
        : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } }),
    ),
    catchError(() =>
      of(router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } })),
    ),
  );
};

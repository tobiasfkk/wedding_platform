import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { CsrfTokenStore } from './csrf-token.store';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const apiSecurityInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }

  const csrfToken = inject(CsrfTokenStore).get();
  const headers =
    csrfToken && !SAFE_METHODS.has(request.method)
      ? request.headers.set('X-XSRF-TOKEN', csrfToken)
      : request.headers;

  return next(request.clone({ headers, withCredentials: true }));
};

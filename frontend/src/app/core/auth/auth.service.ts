import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, of, switchMap, tap } from 'rxjs';

import { CsrfTokenStore } from './csrf-token.store';

export interface AuthSession {
  authenticated: boolean;
  email: string | null;
  csrfToken: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrfTokens = inject(CsrfTokenStore);
  private readonly currentSession = signal<AuthSession | null>(null);

  readonly session = this.currentSession.asReadonly();
  readonly authenticated = computed(() => this.currentSession()?.authenticated === true);

  loadSession(): Observable<AuthSession> {
    return this.http
      .get<AuthSession>('/api/auth/session')
      .pipe(tap((session) => this.remember(session)));
  }

  login(email: string, password: string): Observable<AuthSession> {
    const prepare = this.csrfTokens.get() ? of(this.currentSession()) : this.loadSession();
    return prepare.pipe(
      switchMap(() => this.http.post<AuthSession>('/api/auth/login', { email, password })),
      tap((session) => this.remember(session)),
    );
  }

  logout(): Observable<void> {
    const prepare = this.csrfTokens.get() ? of(this.currentSession()) : this.loadSession();
    return prepare.pipe(
      switchMap(() => this.http.post<void>('/api/auth/logout', {})),
      tap(() => {
        this.currentSession.set(null);
        this.csrfTokens.clear();
      }),
    );
  }

  private remember(session: AuthSession): void {
    this.currentSession.set(session);
    this.csrfTokens.set(session.csrfToken);
  }
}

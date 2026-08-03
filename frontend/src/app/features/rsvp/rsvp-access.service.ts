import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CsrfTokenStore } from '../../core/auth/csrf-token.store';

export interface RsvpInvitation {
  groupName: string;
  companionLimit: number;
  participants: string[];
}

export interface RsvpSession {
  identified: boolean;
  invitation: RsvpInvitation | null;
  csrfToken: string;
}

@Injectable({ providedIn: 'root' })
export class RsvpAccessService {
  private readonly http = inject(HttpClient);
  private readonly csrfTokens = inject(CsrfTokenStore);

  session(): Observable<RsvpSession> {
    return this.http
      .get<RsvpSession>('/api/rsvp/session')
      .pipe(tap((session) => this.csrfTokens.set(session.csrfToken)));
  }

  access(code: string): Observable<RsvpInvitation> {
    return this.http.post<RsvpInvitation>('/api/rsvp/access', { code });
  }
}

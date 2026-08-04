import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CsrfTokenStore } from '../../core/auth/csrf-token.store';

export type RsvpStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface RsvpParticipant {
  id: string;
  name: string;
  status: RsvpStatus;
}

export interface RsvpCompanion {
  id: string;
  name: string;
}

export interface RsvpInvitation {
  groupName: string;
  companionLimit: number;
  editable: boolean;
  participants: RsvpParticipant[];
  companions: RsvpCompanion[];
}

export interface RsvpSession {
  identified: boolean;
  invitation: RsvpInvitation | null;
  csrfToken: string;
}

export interface RsvpSubmissionResponse {
  savedAt: string;
  replayed: boolean;
  invitation: RsvpInvitation;
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

  respond(
    operationId: string,
    participants: Pick<RsvpParticipant, 'id' | 'status'>[],
    companions: RsvpCompanion[],
  ): Observable<RsvpSubmissionResponse> {
    return this.http.post<RsvpSubmissionResponse>('/api/rsvp/responses', {
      operationId,
      participants: participants.map((participant) => ({
        participantId: participant.id,
        status: participant.status,
      })),
      companions,
    });
  }
}

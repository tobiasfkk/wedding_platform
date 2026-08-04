import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { RsvpCompanion, RsvpInvitation, RsvpParticipant } from '../rsvp/rsvp-access.service';

export interface AdminRsvpResponse {
  hasExistingResponse: boolean;
  invitation: RsvpInvitation;
}

@Injectable({ providedIn: 'root' })
export class AdminRsvpService {
  private readonly http = inject(HttpClient);

  find(invitationId: string): Observable<AdminRsvpResponse> {
    return this.http.get<AdminRsvpResponse>(`/api/admin/invitations/${invitationId}/rsvp`);
  }

  save(
    invitationId: string,
    operationId: string,
    replaceExisting: boolean,
    participants: Pick<RsvpParticipant, 'id' | 'status'>[],
    companions: RsvpCompanion[],
  ): Observable<AdminRsvpResponse> {
    return this.http.put<AdminRsvpResponse>(`/api/admin/invitations/${invitationId}/rsvp`, {
      operationId,
      replaceExisting,
      participants: participants.map((participant) => ({
        participantId: participant.id,
        status: participant.status,
      })),
      companions,
    });
  }
}

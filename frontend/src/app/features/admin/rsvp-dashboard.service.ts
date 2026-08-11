import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { RsvpCompanion, RsvpStatus } from '../rsvp/rsvp-access.service';

export interface RsvpDashboardParticipant {
  id: string;
  name: string;
  status: RsvpStatus;
}

export interface RsvpDashboardInvitation {
  invitationId: string;
  groupName: string;
  confirmed: number;
  declined: number;
  pending: number;
  updatedAt: string | null;
  participants: RsvpDashboardParticipant[];
  companions: RsvpCompanion[];
}

export interface RsvpDashboardResponse {
  totals: { confirmed: number; declined: number; pending: number };
  items: RsvpDashboardInvitation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RsvpDeadline {
  configured: boolean;
  deadlineDate: string | null;
  deadlineTime: string | null;
  timeZone: string;
}

export interface RsvpDeadlineUpdate {
  deadlineDate: string;
  deadlineTime: string;
  timeZone: string;
}

@Injectable({ providedIn: 'root' })
export class RsvpDashboardService {
  private readonly http = inject(HttpClient);

  find(
    query: string,
    status: RsvpStatus | 'ALL',
    page: number,
    size = 20,
  ): Observable<RsvpDashboardResponse> {
    const params = new HttpParams()
      .set('query', query.trim())
      .set('status', status)
      .set('page', page)
      .set('size', size);
    return this.http.get<RsvpDashboardResponse>('/api/admin/rsvp/dashboard', { params });
  }

  loadDeadline(): Observable<RsvpDeadline> {
    return this.http.get<RsvpDeadline>('/api/admin/rsvp/deadline');
  }

  saveDeadline(deadline: RsvpDeadlineUpdate): Observable<RsvpDeadline> {
    return this.http.put<RsvpDeadline>('/api/admin/rsvp/deadline', deadline);
  }
}

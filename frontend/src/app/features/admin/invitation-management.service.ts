import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface InvitationGuest {
  id: string;
  name: string;
  active: boolean;
}

export interface Invitation {
  id: string;
  name: string;
  companionLimit: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  guests: InvitationGuest[];
  version: number;
}

export interface InvitationPage {
  items: Invitation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface InvitationUpdate {
  name: string;
  companionLimit: number;
  guestIds: string[];
}

export interface EligibleGuest {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationManagementService {
  private readonly http = inject(HttpClient);

  findAll(query: string, status: string, page: number, size = 20): Observable<InvitationPage> {
    const params = new HttpParams()
      .set('query', query)
      .set('status', status)
      .set('page', page)
      .set('size', size);
    return this.http.get<InvitationPage>('/api/admin/invitations', { params });
  }

  findEligibleGuests(query: string, invitationId: string | null): Observable<EligibleGuest[]> {
    let params = new HttpParams().set('query', query);
    if (invitationId) {
      params = params.set('invitationId', invitationId);
    }
    return this.http.get<EligibleGuest[]>('/api/admin/invitations/eligible-guests', { params });
  }

  create(invitation: InvitationUpdate): Observable<Invitation> {
    return this.http.post<Invitation>('/api/admin/invitations', invitation);
  }

  update(id: string, invitation: InvitationUpdate): Observable<Invitation> {
    return this.http.put<Invitation>(`/api/admin/invitations/${id}`, invitation);
  }
}

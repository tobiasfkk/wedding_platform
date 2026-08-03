import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Guest {
  id: string;
  name: string;
  contact: string | null;
  active: boolean;
  version: number;
}

export interface GuestPage {
  items: Guest[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GuestUpdate {
  name: string;
  contact: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class GuestManagementService {
  private readonly http = inject(HttpClient);

  findAll(query: string, status: string, page: number, size = 20): Observable<GuestPage> {
    const params = new HttpParams()
      .set('query', query)
      .set('status', status)
      .set('page', page)
      .set('size', size);
    return this.http.get<GuestPage>('/api/admin/guests', { params });
  }

  create(guest: GuestUpdate): Observable<Guest> {
    return this.http.post<Guest>('/api/admin/guests', guest);
  }

  update(id: string, guest: GuestUpdate): Observable<Guest> {
    return this.http.put<Guest>(`/api/admin/guests/${id}`, guest);
  }

  changeStatus(id: string, active: boolean): Observable<Guest> {
    return this.http.patch<Guest>(`/api/admin/guests/${id}/status`, { active });
  }
}

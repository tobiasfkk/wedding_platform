import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface WeddingSettings {
  configured: boolean;
  displayName: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string;
  rsvpDeadlineDate: string | null;
  rsvpDeadlineTime: string | null;
  timeZone: string;
  version: number;
}

export interface WeddingSettingsUpdate {
  displayName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  rsvpDeadlineDate: string;
  rsvpDeadlineTime: string;
  timeZone: string;
}

@Injectable({ providedIn: 'root' })
export class WeddingSettingsService {
  private readonly http = inject(HttpClient);

  load(): Observable<WeddingSettings> {
    return this.http.get<WeddingSettings>('/api/admin/wedding');
  }

  save(settings: WeddingSettingsUpdate): Observable<WeddingSettings> {
    return this.http.put<WeddingSettings>('/api/admin/wedding', settings);
  }
}

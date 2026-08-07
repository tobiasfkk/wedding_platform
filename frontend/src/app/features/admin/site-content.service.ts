import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { WeddingSiteContentDto } from '../public-site/public-site.service';

export interface WeddingSiteAdminState {
  draft: WeddingSiteContentDto;
  draftVersion: number;
  published: boolean;
  publishedVersion: number | null;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}

export interface SiteMediaUpload {
  id: string;
  url: string;
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

@Injectable({ providedIn: 'root' })
export class SiteContentService {
  private readonly http = inject(HttpClient);

  load(): Observable<WeddingSiteAdminState> {
    return this.http.get<WeddingSiteAdminState>('/api/admin/site');
  }

  saveDraft(version: number, content: WeddingSiteContentDto): Observable<WeddingSiteAdminState> {
    return this.http.put<WeddingSiteAdminState>('/api/admin/site/draft', { version, content });
  }

  publish(): Observable<WeddingSiteAdminState> {
    return this.http.put<WeddingSiteAdminState>('/api/admin/site/publication', {});
  }

  unpublish(): Observable<WeddingSiteAdminState> {
    return this.http.delete<WeddingSiteAdminState>('/api/admin/site/publication');
  }

  upload(file: File): Observable<SiteMediaUpload> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<SiteMediaUpload>('/api/admin/site/media', body);
  }
}

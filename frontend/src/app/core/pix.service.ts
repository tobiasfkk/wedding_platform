import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import QRCode from 'qrcode';
import { Observable } from 'rxjs';

export interface PixConfiguration {
  configured: boolean;
  key: string | null;
  payload: string | null;
  recipientName: string | null;
}

export interface PixConfigurationUpdate {
  key: string;
  payload: string;
  recipientName: string;
}

@Injectable({ providedIn: 'root' })
export class PixService {
  private readonly http = inject(HttpClient);

  findPublic(): Observable<PixConfiguration> {
    return this.http.get<PixConfiguration>('/api/public/pix');
  }

  findAdmin(): Observable<PixConfiguration> {
    return this.http.get<PixConfiguration>('/api/admin/pix');
  }

  save(configuration: PixConfigurationUpdate): Observable<PixConfiguration> {
    return this.http.put<PixConfiguration>('/api/admin/pix', configuration);
  }

  async qrCode(payload: string): Promise<string> {
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 440,
      color: { dark: '#26382dff', light: '#ffffffff' },
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

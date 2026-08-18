import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PixService } from './pix.service';

describe('PixService', () => {
  let service: PixService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PixService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the public configuration and generates a local SVG QR code', async () => {
    service.findPublic().subscribe();
    http.expectOne('/api/public/pix').flush({
      configured: true,
      key: 'pix@example.com',
      payload: '000201br.gov.bcb.pix6304ABCD',
      recipientName: 'Maria e Tobias',
    });

    const result = await service.qrCode('000201br.gov.bcb.pix6304ABCD');
    expect(result).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(result)).toContain('<svg');
  });
});

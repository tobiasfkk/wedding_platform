import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { WeddingSettingsService, WeddingSettingsUpdate } from './wedding-settings.service';

describe('WeddingSettingsService', () => {
  let service: WeddingSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WeddingSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the current wedding configuration', () => {
    service.load().subscribe((settings) => expect(settings.displayName).toBe('Ana e Bruno'));
    const request = http.expectOne('/api/admin/wedding');
    expect(request.request.method).toBe('GET');
    request.flush({ displayName: 'Ana e Bruno' });
  });

  it('updates the wedding configuration', () => {
    const settings: WeddingSettingsUpdate = {
      displayName: 'Ana e Bruno',
      eventDate: '2027-05-08',
      eventTime: '16:00',
      location: 'Espaço Jardim',
      rsvpDeadlineDate: '2027-04-08',
      rsvpDeadlineTime: '23:59',
      timeZone: 'America/Sao_Paulo',
    };
    service.save(settings).subscribe();
    const request = http.expectOne('/api/admin/wedding');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(settings);
    request.flush({ ...settings, configured: true, version: 0 });
  });
});

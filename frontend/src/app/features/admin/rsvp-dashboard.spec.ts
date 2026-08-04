import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RsvpDashboard } from './rsvp-dashboard';

describe('RsvpDashboard', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RsvpDashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows totals and requests the selected filters', () => {
    const fixture = TestBed.createComponent(RsvpDashboard);
    fixture.detectChanges();
    http
      .expectOne(
        (request) =>
          request.url === '/api/admin/rsvp/dashboard' &&
          request.params.get('status') === 'ALL' &&
          request.params.get('page') === '0',
      )
      .flush({
        totals: { confirmed: 2, declined: 1, pending: 1 },
        items: [
          {
            invitationId: 'invitation-1',
            groupName: 'Família Exemplo',
            confirmed: 2,
            declined: 1,
            pending: 0,
            updatedAt: '2026-08-04T12:00:00Z',
            participants: [
              { id: 'guest-1', name: 'Ana', status: 'CONFIRMED' },
              { id: 'guest-2', name: 'Bruno', status: 'DECLINED' },
            ],
            companions: [{ id: 'companion-1', name: 'Carla' }],
          },
        ],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 2,
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Família Exemplo');
    expect(fixture.nativeElement.textContent).toContain('Carla');

    fixture.componentInstance.filters.setValue({ query: 'ana', status: 'CONFIRMED' });
    fixture.componentInstance.search();
    const filtered = http.expectOne(
      '/api/admin/rsvp/dashboard?query=ana&status=CONFIRMED&page=0&size=20',
    );
    expect(filtered.request.method).toBe('GET');
    filtered.flush({
      totals: { confirmed: 2, declined: 1, pending: 1 },
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
  });
});

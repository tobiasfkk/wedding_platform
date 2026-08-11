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
    http.expectOne('/api/admin/rsvp/deadline').flush({
      configured: true,
      deadlineDate: '2027-04-08',
      deadlineTime: '23:59:00',
      timeZone: 'America/Sao_Paulo',
    });
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

  it('configures the public RSVP deadline from the dashboard', () => {
    const fixture = TestBed.createComponent(RsvpDashboard);
    fixture.detectChanges();
    http.expectOne('/api/admin/rsvp/dashboard?query=&status=ALL&page=0&size=20').flush({
      totals: { confirmed: 0, declined: 0, pending: 0 },
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    http.expectOne('/api/admin/rsvp/deadline').flush({
      configured: false,
      deadlineDate: null,
      deadlineTime: null,
      timeZone: 'America/Sao_Paulo',
    });
    fixture.detectChanges();

    fixture.componentInstance.deadlineForm.setValue({
      deadlineDate: '2027-04-08',
      deadlineTime: '23:59',
    });
    fixture.componentInstance.saveDeadline();

    const save = http.expectOne('/api/admin/rsvp/deadline');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({
      deadlineDate: '2027-04-08',
      deadlineTime: '23:59',
      timeZone: 'America/Sao_Paulo',
    });
    save.flush({
      configured: true,
      deadlineDate: '2027-04-08',
      deadlineTime: '23:59:00',
      timeZone: 'America/Sao_Paulo',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Prazo atualizado com sucesso');
  });
});

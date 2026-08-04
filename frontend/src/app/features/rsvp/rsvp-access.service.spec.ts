import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CsrfTokenStore } from '../../core/auth/csrf-token.store';
import { RsvpAccessService } from './rsvp-access.service';

describe('RsvpAccessService', () => {
  let service: RsvpAccessService;
  let http: HttpTestingController;
  let csrfTokens: CsrfTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RsvpAccessService);
    http = TestBed.inject(HttpTestingController);
    csrfTokens = TestBed.inject(CsrfTokenStore);
  });

  afterEach(() => http.verify());

  it('loads the public session and stores its CSRF token', () => {
    service.session().subscribe();
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });

    expect(csrfTokens.get()).toBe('rsvp-csrf');
  });

  it('exchanges the invitation code in the request body', () => {
    service.access('secret-code').subscribe();
    const request = http.expectOne('/api/rsvp/access');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'secret-code' });
    request.flush({
      groupName: 'Família',
      companionLimit: 1,
      editable: true,
      participants: [{ id: 'guest-1', name: 'Ana', status: 'PENDING' }],
      companions: [],
    });
  });

  it('submits every participant with a stable operation identifier', () => {
    service
      .respond(
        'operation-1',
        [
          { id: 'guest-1', status: 'CONFIRMED' },
          { id: 'guest-2', status: 'DECLINED' },
        ],
        [{ id: 'companion-1', name: 'Carla' }],
      )
      .subscribe();
    const request = http.expectOne('/api/rsvp/responses');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      operationId: 'operation-1',
      participants: [
        { participantId: 'guest-1', status: 'CONFIRMED' },
        { participantId: 'guest-2', status: 'DECLINED' },
      ],
      companions: [{ id: 'companion-1', name: 'Carla' }],
    });
    request.flush({
      savedAt: '2027-01-01T00:00:00Z',
      replayed: false,
      invitation: {
        groupName: 'Família',
        companionLimit: 0,
        editable: true,
        participants: [],
        companions: [],
      },
    });
  });
});

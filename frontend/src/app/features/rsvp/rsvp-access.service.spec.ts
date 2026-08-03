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
    request.flush({ groupName: 'Família', companionLimit: 1, participants: ['Ana'] });
  });
});

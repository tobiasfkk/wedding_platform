import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { apiSecurityInterceptor } from '../../core/auth/api-security.interceptor';
import { RsvpHome } from './rsvp-home';

describe('RsvpHome', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RsvpHome],
      providers: [
        provideHttpClient(withInterceptors([apiSecurityInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    window.history.replaceState(null, '', '/');
  });

  it('removes the code from the URL and displays only its invitation on a mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    window.history.replaceState(null, '', '/rsvp#code=valid-secret-code');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();

    expect(window.location.hash).toBe('');
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    const access = http.expectOne('/api/rsvp/access');
    expect(access.request.body).toEqual({ code: 'valid-secret-code' });
    expect(access.request.headers.get('X-XSRF-TOKEN')).toBe('rsvp-csrf');
    access.flush({
      groupName: 'Família Exemplo',
      companionLimit: 2,
      participants: ['Ana Exemplo', 'Bruno Exemplo'],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Família Exemplo');
    expect(fixture.nativeElement.textContent).toContain('Ana Exemplo');
    expect(fixture.nativeElement.textContent).not.toContain('Outro grupo');
    expect(fixture.nativeElement.querySelector('.rsvp-card')).not.toBeNull();
  });

  it('uses the same safe error state when the exchange is rejected', () => {
    window.history.replaceState(null, '', '/rsvp#code=invalid-code');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    http
      .expectOne('/api/rsvp/access')
      .flush({ code: 'RSVP_ACCESS_INVALID' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Acesso indisponível');
    expect(fixture.nativeElement.textContent).not.toContain('invalid-code');
  });
});

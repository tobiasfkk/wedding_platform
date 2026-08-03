import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiSecurityInterceptor } from './api-security.interceptor';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiSecurityInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a CSRF token and sends it when logging in', () => {
    auth.login('admin@example.com', 'password').subscribe();

    const sessionRequest = http.expectOne('/api/auth/session');
    expect(sessionRequest.request.withCredentials).toBe(true);
    sessionRequest.flush({ authenticated: false, email: null, csrfToken: 'csrf-token' });

    const loginRequest = http.expectOne('/api/auth/login');
    expect(loginRequest.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(loginRequest.request.withCredentials).toBe(true);
    loginRequest.flush({ authenticated: true, email: 'admin@example.com', csrfToken: null });

    expect(auth.authenticated()).toBe(true);
    expect(auth.session()?.email).toBe('admin@example.com');
  });

  it('clears the local session after a successful logout', () => {
    auth.loadSession().subscribe();
    http.expectOne('/api/auth/session').flush({
      authenticated: true,
      email: 'admin@example.com',
      csrfToken: 'csrf-token',
    });

    auth.logout().subscribe();
    const logoutRequest = http.expectOne('/api/auth/logout');
    expect(logoutRequest.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    logoutRequest.flush(null);

    expect(auth.authenticated()).toBe(false);
    expect(auth.session()).toBeNull();
  });
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { apiSecurityInterceptor } from './core/auth/api-security.interceptor';
import { routes } from './app.routes';

describe('Application routes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiSecurityInterceptor])),
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    ['/', 'Frontend operacional'],
    ['/rsvp', 'Área de RSVP'],
    ['/admin/login', 'Acessar administração'],
  ])('loads %s', async (url, expectedHeading) => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(url);

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(expectedHeading);
  });

  it('redirects an unauthenticated visitor to the administrative login', async () => {
    const harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin');
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne('/api/auth/session').flush({
      authenticated: false,
      email: null,
      csrfToken: 'csrf-token',
    });
    await navigation;

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Acessar administração',
    );
  });

  it('loads the protected administrative route for an authenticated administrator', async () => {
    const harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin');
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne('/api/auth/session').flush({
      authenticated: true,
      email: 'admin@example.com',
      csrfToken: 'csrf-token',
    });
    await navigation;

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Administração');
  });
});

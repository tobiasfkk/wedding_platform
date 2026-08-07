import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { apiSecurityInterceptor } from './core/auth/api-security.interceptor';
import { routes } from './app.routes';

const publishedSite = {
  content: {
    hero: {
      eyebrow: 'Celebração',
      title: 'Um dia para guardar na memória.',
      introduction: 'Vamos celebrar juntos.',
      dateLabel: '8 de maio de 2027',
    },
    story: {
      eyebrow: 'Nossa história',
      title: 'Do encontro ao sim',
      paragraphs: ['Nossa história.'],
      imageId: null,
      imageAlt: null,
      imageWidth: null,
      imageHeight: null,
    },
    schedule: [],
    notices: ['Chegue com antecedência.'],
    rsvp: { eyebrow: 'RSVP', title: 'Confirme', description: 'Use seu convite.' },
    sectionOrder: ['STORY', 'SCHEDULE', 'NOTICES', 'RSVP'],
  },
  version: 1,
  publishedAt: '2027-01-01T12:00:00Z',
};

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

  it('loads the published home', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    http.expectOne('/api/public/site').flush(publishedSite);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Um dia para guardar na memória.',
    );
  });

  it('loads the administrative login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Acessar administração',
    );
  });

  it('loads the public RSVP access route', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/rsvp');
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Acesso indisponível',
    );
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
    http.expectOne('/api/admin/wedding').flush({
      configured: false,
      displayName: '',
      eventDate: null,
      eventTime: null,
      location: '',
      rsvpDeadlineDate: null,
      rsvpDeadlineTime: null,
      timeZone: 'America/Sao_Paulo',
      version: 0,
    });

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Administração');
  });
});

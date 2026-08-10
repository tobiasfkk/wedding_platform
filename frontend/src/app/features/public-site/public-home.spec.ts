import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PublicHome } from './public-home';
import { PUBLIC_WEDDING_CONTENT } from './public-site-content';
import { PublicSiteService } from './public-site.service';

describe('PublicHome', () => {
  const service = { loadPublished: vi.fn(() => of(PUBLIC_WEDDING_CONTENT)) };

  beforeEach(async () => {
    service.loadPublished.mockReturnValue(of(PUBLIC_WEDDING_CONTENT));
    await TestBed.configureTestingModule({
      imports: [PublicHome],
      providers: [provideRouter([]), { provide: PublicSiteService, useValue: service }],
    }).compileComponents();
  });

  it('keeps unpublished content unavailable to visitors', () => {
    service.loadPublished.mockReturnValue(throwError(() => ({ status: 404 })));
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('ainda está sendo preparado');
  });

  it('renders the complete public wedding narrative', () => {
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Um dia para guardar na memória');
    expect(element.querySelectorAll('.moment-card')).toHaveLength(2);
    expect(element.querySelectorAll('.notes li')).toHaveLength(3);
    const mapLink = element.querySelector<HTMLAnchorElement>('.map-link');
    expect(mapLink?.target).toBe('_blank');
    expect(mapLink?.rel).toContain('noopener');
  });

  it('shows a shared address only once while retaining both moments', () => {
    const sharedMoment = {
      ...PUBLIC_WEDDING_CONTENT.schedule[0]!,
      mapUrl: 'https://maps.app.goo.gl/example',
    };
    service.loadPublished.mockReturnValue(
      of({
        ...PUBLIC_WEDDING_CONTENT,
        locationMode: 'SHARED',
        schedule: [
          sharedMoment,
          {
            ...PUBLIC_WEDDING_CONTENT.schedule[1]!,
            venue: sharedMoment.venue,
            address: sharedMoment.address,
            mapUrl: sharedMoment.mapUrl,
          },
        ],
      }),
    );
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.moment-card')).toHaveLength(2);
    expect(element.querySelectorAll('.shared-location-card')).toHaveLength(1);
    expect(element.querySelectorAll('.shared-location-card .map-link')).toHaveLength(1);
    expect(element.querySelectorAll('.moment-card .map-link')).toHaveLength(0);
  });

  it('keeps the RSVP action available throughout the experience', () => {
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a[href="/rsvp"]'),
    );

    expect(links).toHaveLength(2);
    expect(links.every((link) => link.textContent?.trim())).toBe(true);
  });

  it('uses an explicit accessible placeholder until a real image is published', () => {
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();

    const placeholder = (fixture.nativeElement as HTMLElement).querySelector('.photo-placeholder');

    expect(placeholder?.getAttribute('role')).toBe('img');
    expect(placeholder?.getAttribute('aria-label')).toContain('foto do casal');
  });
});

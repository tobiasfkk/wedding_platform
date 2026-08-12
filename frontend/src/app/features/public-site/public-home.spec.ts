import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PublicHome } from './public-home';

describe('PublicHome', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHome],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    fixture.detectChanges();
    return fixture;
  }

  it('renders the mobile-first wedding narrative without a public navigation header', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Maria Eduarda');
    expect(element.querySelector('h1')?.textContent).toContain('Tobias');
    expect(element.querySelector('blockquote')?.textContent).toContain('a mão do Senhor fez isto');
    expect(element.querySelector('.hero .button')).toBeNull();
    expect(element.querySelectorAll('.ceremony')).toHaveLength(1);
    expect(element.querySelector('.scroll-cue')?.classList.contains('motion-reveal')).toBe(false);
  });

  it('assigns staggered, accessible motion to individual narrative elements', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const animatedElements = element.querySelectorAll('.motion-reveal');

    expect(animatedElements.length).toBeGreaterThan(20);
    expect(element.querySelectorAll('[data-reveal="line"]')).toHaveLength(2);
    expect(element.querySelectorAll('[data-reveal="clip"]')).toHaveLength(7);
    expect(
      Array.from(animatedElements).every((item) => item.classList.contains('is-visible')),
    ).toBe(true);
  });

  it('offers a horizontal in-page gallery that reveals additional memories', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const rail = element.querySelector('.photo-rail');

    expect(rail?.getAttribute('tabindex')).toBe('0');
    expect(rail?.getAttribute('aria-label')).toContain('Deslize horizontalmente');
    expect(element.querySelector('.gallery-cue')).toBeNull();
    expect(element.textContent).not.toContain(
      'Deslize para o lado e percorra alguns capítulos da nossa história.',
    );
    expect(element.querySelectorAll('.photo-card')).toHaveLength(7);
    expect(element.querySelectorAll('.photo-card__visual > figcaption')).toHaveLength(7);
    expect(element.querySelectorAll('.photo-card.is-caption-active')).toHaveLength(1);
    expect(element.querySelector('.photo-card.is-caption-active')).toBe(
      element.querySelector('.photo-card'),
    );
    expect(element.querySelectorAll('.photo-card img[loading="lazy"]')).toHaveLength(7);
    expect(element.querySelector('.photo-card img')?.getAttribute('alt')).toContain(
      'Tobias e Maria Eduarda',
    );
  });

  it('shows the ceremony date, venue, address and map provided by the couple', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const ceremony = element.querySelector('.ceremony');
    const map = ceremony?.querySelector<HTMLAnchorElement>('.map-link');

    expect(ceremony?.textContent).toContain('24 de abril de 2026, às 16h');
    expect(ceremony?.textContent).toContain('Sweet Home Farm');
    expect(ceremony?.textContent).toContain('R. Francisco Bueno Franco, 814');
    expect(map?.href).toBe('https://maps.app.goo.gl/2wyfdkJZ5CcvLFsA7');
    expect(ceremony?.querySelectorAll('.ceremony__details span')).toHaveLength(0);
  });

  it('keeps RSVP in the same page and explains how to use an individual invitation', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-rsvp-home')).toBeTruthy();
    expect(element.textContent).toContain('Abra o link individual que recebeu');
    expect(element.querySelector('a[href="/rsvp"]')).toBeNull();
  });
});

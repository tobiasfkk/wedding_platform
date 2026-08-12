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
  });

  it('assigns staggered, accessible motion to individual narrative elements', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const animatedElements = element.querySelectorAll('.motion-reveal');

    expect(animatedElements.length).toBeGreaterThan(20);
    expect(element.querySelectorAll('[data-reveal="line"]')).toHaveLength(3);
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
    expect(element.querySelectorAll('.photo-card')).toHaveLength(7);
    expect(element.querySelectorAll('.photo-card img[loading="lazy"]')).toHaveLength(7);
    expect(element.querySelector('.photo-card img')?.getAttribute('alt')).toContain(
      'Tobias e Maria Eduarda',
    );
  });

  it('keeps RSVP in the same page and explains how to use an individual invitation', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-rsvp-home')).toBeTruthy();
    expect(element.textContent).toContain('Abra o link individual que recebeu');
    expect(element.querySelector('a[href="/rsvp"]')).toBeNull();
  });
});

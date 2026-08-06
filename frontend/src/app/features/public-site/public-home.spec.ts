import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PublicHome } from './public-home';

describe('PublicHome', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHome],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the complete public wedding narrative', () => {
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Um dia para guardar na memória');
    expect(element.querySelectorAll('.moment-card')).toHaveLength(2);
    expect(element.querySelectorAll('.notes li')).toHaveLength(3);
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

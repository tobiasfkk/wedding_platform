import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PublicHome } from './public-home';
import { PixConfiguration } from '../../core/pix.service';

describe('PublicHome', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHome],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function render(
    pix: PixConfiguration = {
      configured: false,
      key: null,
      payload: null,
      recipientName: null,
    },
  ) {
    const fixture = TestBed.createComponent(PublicHome);
    fixture.detectChanges();
    http.expectOne('/api/public/pix').flush(pix);
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
    expect(element.querySelectorAll('[data-reveal="line"]')).toHaveLength(1);
    expect(element.querySelectorAll('[data-reveal="clip"]')).toHaveLength(0);
    expect(element.querySelectorAll('.photo-card.motion-reveal')).toHaveLength(0);
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
    expect(element.querySelectorAll('.photo-card.is-active')).toHaveLength(1);
    expect(
      element.querySelectorAll('.photo-card img[loading="eager"][decoding="sync"]'),
    ).toHaveLength(7);
    expect(element.querySelectorAll('.gallery-dot')).toHaveLength(7);
    expect(element.querySelectorAll('.gallery-dot[aria-current="true"]')).toHaveLength(1);
    expect(element.querySelector('.gallery-playback')).toBeNull();
    expect(element.querySelector('.photo-card img')?.getAttribute('alt')).toContain(
      'Tobias e Maria Eduarda',
    );
  });

  it('shows the ceremony date, venue, address and map provided by the couple', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const ceremony = element.querySelector('.ceremony');
    const map = element.querySelector<HTMLAnchorElement>('.ceremony .map-link');

    expect(ceremony?.textContent).toContain('24-04-2027 | 16h');
    expect(ceremony?.textContent).toContain('Sweet Home Farm');
    expect(ceremony?.textContent).toContain('Rua Francisco Bueno Franco, 814');
    expect(map?.href).toBe('https://maps.app.goo.gl/2wyfdkJZ5CcvLFsA7');
    expect(map?.classList.contains('motion-reveal')).toBe(false);
    expect(ceremony?.querySelectorAll('.countdown__item')).toHaveLength(4);
  });

  it('counts down to the ceremony every second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-04-23T14:57:57-03:00'));
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const values = () =>
      Array.from(element.querySelectorAll<HTMLElement>('.countdown__item strong')).map((item) =>
        item.textContent?.trim(),
      );

    expect(values()).toEqual(['1', '1', '2', '3']);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(values()).toEqual(['1', '1', '2', '2']);
    expect(element.querySelector('[role="timer"]')?.getAttribute('aria-label')).toBe(
      'Faltam 1 dia, 1 hora, 2 minutos e 2 segundos para a cerimônia.',
    );
  });

  it('keeps RSVP in the same page and explains how to use an individual invitation', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-rsvp-home')).toBeTruthy();
    expect(element.textContent).not.toContain('Confirme sua presença.');
    expect(element.textContent).not.toContain('Será uma alegria ter você conosco');
    expect(element.textContent).toContain('Abra o link individual que recebeu');
    expect(element.querySelector('a[href="/rsvp"]')).toBeNull();
    expect(element.querySelector('#presentes')).toBeTruthy();
    expect(element.querySelector('.ceremony .map-link')).toBeTruthy();
    expect(element.querySelector('.final-location')).toBeNull();
    expect(element.querySelector('.wedding-footer')?.textContent).toContain(
      'Desenvolvido por Tobias Kiefer',
    );
    expect(element.querySelector('.wedding-footer .motion-reveal')).toBeNull();
  });

  it('shows the configured Pix and generates its QR code locally', async () => {
    const fixture = render({
      configured: true,
      key: 'pix@example.com',
      payload: '000201br.gov.bcb.pix6304ABCD',
      recipientName: 'Maria e Tobias',
    });
    const element = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('.pix-qr img')?.getAttribute('src')).toMatch(
        /^data:image\/svg\+xml/,
      );
    });

    expect(element.querySelector('.pix-key')?.textContent).toContain('pix@example.com');
    expect(element.querySelector('.pix-copy')?.textContent).toContain('Copiar código Pix');
    expect(element.querySelector('.pix-recipient')?.textContent).toContain('Maria e Tobias');
  });

  it('copies the Pix code through the local HTTP fallback when Clipboard API is unavailable', async () => {
    const execCommand = vi.fn(() => true);
    const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    const fixture = render({
      configured: true,
      key: 'pix@example.com',
      payload: '000201br.gov.bcb.pix6304ABCD',
      recipientName: 'Maria e Tobias',
    });

    await fixture.componentInstance.copyPixCode();
    fixture.detectChanges();

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(fixture.componentInstance.pixCopyState()).toBe('copied');
    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull();

    if (execCommandDescriptor) {
      Object.defineProperty(document, 'execCommand', execCommandDescriptor);
    } else {
      Reflect.deleteProperty(document, 'execCommand');
    }
    if (clipboardDescriptor) {
      Object.defineProperty(window.navigator, 'clipboard', clipboardDescriptor);
    } else {
      Reflect.deleteProperty(window.navigator, 'clipboard');
    }
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('creates the application shell', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('keeps the public experience free from header navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('footer')).toBeNull();
  });

  it('preserves navigation inside the administrative area', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.showAdministrativeChrome.set(true);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((link) =>
      (link as HTMLElement).textContent?.trim(),
    );

    expect(links).toEqual(['Convidados', 'Convites', 'Respostas', 'Pix']);
  });
});

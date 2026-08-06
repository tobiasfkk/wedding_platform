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

  it('renders navigation for each functional area', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((link) =>
      (link as HTMLElement).textContent?.trim(),
    );

    expect(links).toEqual(['Início', 'Confirmar presença', 'Área dos noivos']);
  });
});

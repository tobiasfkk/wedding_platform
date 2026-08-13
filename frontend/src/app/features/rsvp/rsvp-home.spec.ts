import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { apiSecurityInterceptor } from '../../core/auth/api-security.interceptor';
import { RsvpInvitation } from './rsvp-access.service';
import { RsvpHome } from './rsvp-home';

describe('RsvpHome', () => {
  let http: HttpTestingController;

  const invitation: RsvpInvitation = {
    groupName: 'Família Exemplo',
    companionLimit: 2,
    editable: true,
    rsvpDeadline: '2027-04-09T02:59:00Z',
    participants: [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Ana Exemplo', status: 'PENDING' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Bruno Exemplo', status: 'DECLINED' },
    ],
    companions: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RsvpHome],
      providers: [
        provideHttpClient(withInterceptors([apiSecurityInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    window.history.replaceState(null, '', '/');
  });

  it('removes the code and offers touch-friendly responses on a mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    window.history.replaceState(null, '', '/rsvp#code=valid-secret-code');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();

    expect(window.location.hash).toBe('');
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    const access = http.expectOne('/api/rsvp/access');
    expect(access.request.body).toEqual({ code: 'valid-secret-code' });
    expect(access.request.headers.get('X-XSRF-TOKEN')).toBe('rsvp-csrf');
    access.flush(invitation);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Família Exemplo');
    expect(fixture.nativeElement.textContent).toContain('Ana Exemplo');
    const content = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(content).toContain(
      'Este convite é individual, favor confirmar a presença do grupo até dia 08/04.',
    );
    expect(content).not.toContain('Convite para');
    expect(content).not.toContain('Este convite é único');
    expect(fixture.nativeElement.textContent).not.toContain('Outro grupo');
    expect(fixture.nativeElement.querySelectorAll('.participant-card').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('2 vagas disponíveis');
  });

  it('retries a failed save with the same idempotency identifier and confirms success', () => {
    window.history.replaceState(null, '', '/rsvp');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: true,
      invitation,
      csrfToken: 'rsvp-csrf',
    });
    fixture.detectChanges();

    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    buttons.find((button) => button.textContent?.trim() === 'Sim')?.click();
    fixture.detectChanges();
    buttons.find((button) => button.textContent?.includes('Confirmar e continuar'))?.click();

    const firstSave = http.expectOne('/api/rsvp/responses');
    const operationId = firstSave.request.body.operationId;
    expect(firstSave.request.headers.get('X-XSRF-TOKEN')).toBe('rsvp-csrf');
    expect(firstSave.request.body.participants).toEqual([
      { participantId: invitation.participants[0].id, status: 'CONFIRMED' },
      { participantId: invitation.participants[1].id, status: 'DECLINED' },
    ]);
    expect(firstSave.request.body.companions).toEqual([]);
    firstSave.flush({}, { status: 500, statusText: 'Server error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma resposta foi alterada');

    const saveButton = fixture.nativeElement.querySelector(
      '.save-button',
    ) as HTMLButtonElement | null;
    saveButton?.click();
    const retry = http.expectOne('/api/rsvp/responses');
    expect(retry.request.body.operationId).toBe(operationId);
    retry.flush({
      savedAt: '2027-01-01T00:00:00Z',
      replayed: false,
      invitation: {
        ...invitation,
        participants: [
          { ...invitation.participants[0], status: 'CONFIRMED' },
          invitation.participants[1],
        ],
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tudo certo');
    expect(fixture.nativeElement.textContent).not.toContain('Vamos aos presentes');
  });

  it('adds, edits and submits companions without exceeding the invitation limit', () => {
    window.history.replaceState(null, '', '/rsvp');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: true,
      invitation,
      csrfToken: 'rsvp-csrf',
    });
    fixture.detectChanges();

    const addButton = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Adicionar'));
    addButton?.click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.companion-card input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(
      (fixture.nativeElement.querySelector('.save-button') as HTMLButtonElement).disabled,
    ).toBe(true);

    input.value = 'Carla Exemplo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.save-button') as HTMLButtonElement).click();
    const save = http.expectOne('/api/rsvp/responses');
    const companionId = save.request.body.companions[0].id;
    expect(companionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(save.request.body.companions).toEqual([{ id: companionId, name: 'Carla Exemplo' }]);
    save.flush({
      savedAt: '2027-01-01T00:00:00Z',
      replayed: false,
      invitation: {
        ...invitation,
        companions: [{ id: companionId, name: 'Carla Exemplo' }],
      },
    });
  });

  it('shows the latest response as read-only after the RSVP deadline', () => {
    window.history.replaceState(null, '', '/rsvp');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: true,
      invitation: { ...invitation, editable: false },
      csrfToken: 'rsvp-csrf',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('O prazo de confirmação foi encerrado');
    expect(fixture.nativeElement.textContent).toContain('Prazo encerrado');
    expect(
      (fixture.nativeElement.querySelector('.save-button') as HTMLButtonElement).disabled,
    ).toBe(true);
    const responseButtons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.response-options button'),
    );
    expect(responseButtons.every((button) => button.disabled)).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('.add-companion') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('uses the same safe error state when the exchange is rejected', () => {
    window.history.replaceState(null, '', '/rsvp#code=invalid-code');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    http
      .expectOne('/api/rsvp/access')
      .flush({ code: 'RSVP_ACCESS_INVALID' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Acesso indisponível');
    expect(fixture.nativeElement.textContent).not.toContain('invalid-code');
  });

  it('shows a neutral invitation note when the embedded home has no individual access', () => {
    window.history.replaceState(null, '', '/');
    const fixture = TestBed.createComponent(RsvpHome);
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    http.expectOne('/api/rsvp/session').flush({
      identified: false,
      invitation: null,
      csrfToken: 'rsvp-csrf',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Seu convite');
    expect(fixture.nativeElement.textContent).toContain('Abra o link individual');
    expect(fixture.nativeElement.querySelector('a[mat-stroked-button]')).toBeNull();
  });
});

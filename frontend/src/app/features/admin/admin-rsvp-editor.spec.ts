import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AdminRsvpEditor } from './admin-rsvp-editor';

describe('AdminRsvpEditor', () => {
  let http: HttpTestingController;

  const response = {
    hasExistingResponse: true,
    invitation: {
      groupName: 'Família Exemplo',
      companionLimit: 1,
      editable: true,
      participants: [
        { id: 'guest-1', name: 'Ana', status: 'CONFIRMED' as const },
        { id: 'guest-2', name: 'Bruno', status: 'DECLINED' as const },
      ],
      companions: [],
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminRsvpEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'invitation-1' }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
  });

  it('confirms and saves an administrative correction', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(AdminRsvpEditor);
    fixture.detectChanges();
    http.expectOne('/api/admin/invitations/invitation-1/rsvp').flush(response);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Resposta existente');
    const firstSelect = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    firstSelect.value = 'DECLINED';
    firstSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const saveButton = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Salvar resposta'));
    saveButton?.click();

    const save = http.expectOne('/api/admin/invitations/invitation-1/rsvp');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.replaceExisting).toBe(true);
    expect(save.request.body.participants[0]).toEqual({
      participantId: 'guest-1',
      status: 'DECLINED',
    });
    save.flush({
      ...response,
      invitation: {
        ...response.invitation,
        participants: [
          { ...response.invitation.participants[0], status: 'DECLINED' },
          response.invitation.participants[1],
        ],
      },
    });
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('registrada no histórico');
  });
});

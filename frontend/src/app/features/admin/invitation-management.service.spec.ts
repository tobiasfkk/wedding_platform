import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { InvitationManagementService } from './invitation-management.service';

describe('InvitationManagementService', () => {
  let service: InvitationManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InvitationManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists invitations with filters and pagination', () => {
    service.findAll('família', 'DRAFT', 1).subscribe();
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/admin/invitations' && candidate.params.get('query') === 'família',
    );
    expect(request.request.params.get('status')).toBe('DRAFT');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('creates an invitation and searches eligible guests', () => {
    service.findEligibleGuests('ana', null).subscribe();
    const eligible = http.expectOne(
      (candidate) => candidate.url === '/api/admin/invitations/eligible-guests',
    );
    expect(eligible.request.params.get('query')).toBe('ana');
    eligible.flush([{ id: 'guest-id', name: 'Ana' }]);

    const payload = { name: 'Família', companionLimit: 1, guestIds: ['guest-id'] };
    service.create(payload).subscribe();
    const create = http.expectOne('/api/admin/invitations');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ id: 'invitation-id', ...payload, status: 'DRAFT', guests: [], version: 0 });
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GuestManagementService } from './guest-management.service';

describe('GuestManagementService', () => {
  let service: GuestManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GuestManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches guests using pagination and filters', () => {
    service.findAll('ana', 'ACTIVE', 1).subscribe();
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/admin/guests' && candidate.params.get('query') === 'ana',
    );
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({ items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('creates and changes the status of a guest', () => {
    service.create({ name: 'Ana', contact: '', active: true }).subscribe();
    const create = http.expectOne('/api/admin/guests');
    expect(create.request.method).toBe('POST');
    create.flush({ id: 'guest-id', name: 'Ana', contact: null, active: true, version: 0 });

    service.changeStatus('guest-id', false).subscribe();
    const status = http.expectOne('/api/admin/guests/guest-id/status');
    expect(status.request.method).toBe('PATCH');
    expect(status.request.body).toEqual({ active: false });
    status.flush({ id: 'guest-id', name: 'Ana', contact: null, active: false, version: 1 });
  });
});

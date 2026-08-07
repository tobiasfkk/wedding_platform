import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SITE_CONTENT_DTO } from '../public-site/public-site.testing';
import { SiteContentService, WeddingSiteAdminState } from './site-content.service';

const adminState: WeddingSiteAdminState = {
  draft: SITE_CONTENT_DTO,
  draftVersion: 2,
  published: true,
  publishedVersion: 1,
  publishedAt: '2027-01-01T12:00:00Z',
  hasUnpublishedChanges: true,
};

describe('SiteContentService', () => {
  let service: SiteContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SiteContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and saves the versioned draft', () => {
    service.load().subscribe((state) => expect(state.draftVersion).toBe(2));
    http.expectOne('/api/admin/site').flush(adminState);

    service.saveDraft(2, SITE_CONTENT_DTO).subscribe();
    const save = http.expectOne('/api/admin/site/draft');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ version: 2, content: SITE_CONTENT_DTO });
    save.flush({ ...adminState, draftVersion: 3 });
  });

  it('publishes and unpublishes explicitly', () => {
    service.publish().subscribe();
    const publish = http.expectOne('/api/admin/site/publication');
    expect(publish.request.method).toBe('PUT');
    publish.flush({ ...adminState, hasUnpublishedChanges: false });

    service.unpublish().subscribe();
    const request = http.expectOne('/api/admin/site/publication');
    expect(request.request.method).toBe('DELETE');
    request.flush({ ...adminState, published: false });
  });

  it('uploads media as multipart data', () => {
    const file = new File(['image'], 'casal.png', { type: 'image/png' });
    service.upload(file).subscribe();

    const request = http.expectOne('/api/admin/site/media');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('file')).toBe(file);
    request.flush({});
  });
});

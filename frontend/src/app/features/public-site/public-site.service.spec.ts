import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PublicSiteService } from './public-site.service';
import { SITE_CONTENT_DTO } from './public-site.testing';

describe('PublicSiteService', () => {
  let service: PublicSiteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicSiteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads only the published representation and maps its media URL', () => {
    service.loadPublished().subscribe((content) => {
      expect(content.hero.title).toBe('Ana e Bruno');
      expect(content.story.image?.src).toBe('/api/public/site/media/photo-1');
    });

    const request = http.expectOne('/api/public/site');
    expect(request.request.method).toBe('GET');
    request.flush({ content: SITE_CONTENT_DTO, version: 3, publishedAt: '2027-01-01T12:00:00Z' });
  });
});

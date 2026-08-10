import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PublicSiteService, toPublicWeddingContent } from './public-site.service';
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
      expect(content.photos[0]?.srcSet).toContain('photo-1?width=480 480w');
      expect(content.locationMode).toBe('SEPARATE');
      expect(content.schedule[0]?.mapUrl).toContain('google.com/maps');
    });

    const request = http.expectOne('/api/public/site');
    expect(request.request.method).toBe('GET');
    request.flush({ content: SITE_CONTENT_DTO, version: 3, publishedAt: '2027-01-01T12:00:00Z' });
  });

  it('keeps old content visible and filters moments explicitly hidden by new drafts', () => {
    const legacy = {
      ...SITE_CONTENT_DTO,
      locationMode: undefined,
      schedule: SITE_CONTENT_DTO.schedule.map((moment, index) => ({
        ...moment,
        visible: index === 0 ? undefined : false,
        mapUrl: undefined,
      })),
    };

    const content = toPublicWeddingContent(legacy);

    expect(content.locationMode).toBe('SEPARATE');
    expect(content.schedule).toHaveLength(1);
    expect(content.schedule[0]?.mapUrl).toBeNull();
  });
});

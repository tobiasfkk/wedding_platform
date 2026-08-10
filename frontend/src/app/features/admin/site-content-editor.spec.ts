import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { SITE_CONTENT_DTO } from '../public-site/public-site.testing';
import { SiteContentEditor } from './site-content-editor';
import { SiteContentService, WeddingSiteAdminState } from './site-content.service';

const state: WeddingSiteAdminState = {
  draft: SITE_CONTENT_DTO,
  draftVersion: 2,
  published: true,
  publishedVersion: 1,
  publishedAt: '2027-01-01T12:00:00Z',
  hasUnpublishedChanges: true,
};

describe('SiteContentEditor', () => {
  const service = {
    load: vi.fn(() => of(state)),
    saveDraft: vi.fn(() => of({ ...state, draftVersion: 3 })),
    publish: vi.fn(() => of({ ...state, publishedVersion: 2, hasUnpublishedChanges: false })),
    unpublish: vi.fn(() => of({ ...state, published: false, publishedAt: null })),
    upload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [SiteContentEditor],
      providers: [provideRouter([]), { provide: SiteContentService, useValue: service }],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('recovers and saves an editable draft without publishing it', () => {
    const fixture = TestBed.createComponent(SiteContentEditor);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.form.controls.heroTitle.value).toBe('Ana e Bruno');
    component.form.controls.heroTitle.setValue('Ana e Bruno — nosso casamento');
    component.save();

    expect(service.saveDraft).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        hero: expect.objectContaining({ title: 'Ana e Bruno — nosso casamento' }),
      }),
    );
    expect(service.publish).not.toHaveBeenCalled();
    expect(component.form.pristine).toBe(true);
  });

  it('reorders sections and previews through the public renderer', () => {
    const fixture = TestBed.createComponent(SiteContentEditor);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.moveSection(0, 1);
    component.showPreview();
    fixture.detectChanges();

    expect(component.sectionOrder()).toEqual(['SCHEDULE', 'STORY', 'NOTICES', 'RSVP']);
    expect(component.preview()?.photos[0]?.src).toBe('/api/admin/site/media/photo-1');
    expect(fixture.nativeElement.querySelector('.preview')).not.toBeNull();
  });

  it('requires confirmation for publication and unpublication', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(SiteContentEditor);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.publish();
    component.unpublish();

    expect(window.confirm).toHaveBeenCalledTimes(2);
    expect(service.publish).toHaveBeenCalled();
    expect(service.unpublish).toHaveBeenCalled();
  });

  it('keeps a single cover photo and persists its order and focal point', () => {
    const fixture = TestBed.createComponent(SiteContentEditor);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.photos.update((photos) => [
      ...photos,
      {
        id: 'photo-2',
        url: '/api/admin/site/media/photo-2',
        contentType: 'image/jpeg',
        width: 1600,
        height: 1200,
        sizeBytes: 1000,
        placement: 'STORY',
        alt: 'O casal durante a cerimônia.',
        focalX: 50,
        focalY: 50,
      },
    ]);

    component.updatePhoto('photo-1', 'placement', 'HERO');
    component.updatePhoto('photo-2', 'placement', 'HERO');
    component.updatePhoto('photo-2', 'focalX', 68);
    component.movePhoto(1, -1);
    component.save();

    expect(component.photos().map((photo) => photo.placement)).toEqual(['HERO', 'STORY']);
    expect(service.saveDraft).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        photos: [
          expect.objectContaining({ id: 'photo-2', placement: 'HERO', focalX: 68 }),
          expect.objectContaining({ id: 'photo-1', placement: 'STORY' }),
        ],
      }),
    );
  });

  it('rejects a photo without an accessible description', () => {
    const fixture = TestBed.createComponent(SiteContentEditor);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.updatePhoto('photo-1', 'alt', '   ');
    component.save();

    expect(service.saveDraft).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Descreva todas as fotos');
  });
});

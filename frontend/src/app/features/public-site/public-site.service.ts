import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  PublicSiteSection,
  PublicPhotoPlacement,
  PublicWeddingContent,
  PublicWeddingMoment,
} from './public-site-content';

export type SiteMomentType = 'CEREMONY' | 'RECEPTION';

export interface WeddingSiteContentDto {
  hero: PublicWeddingContent['hero'];
  story: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    imageId: string | null;
    imageAlt: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
  };
  schedule: Array<PublicWeddingMoment & { type: SiteMomentType }>;
  notices: string[];
  rsvp: PublicWeddingContent['rsvp'];
  sectionOrder: PublicSiteSection[];
  photos?: Array<{
    id: string;
    placement: PublicPhotoPlacement;
    alt: string;
    width: number;
    height: number;
    focalX: number;
    focalY: number;
  }>;
}

interface WeddingSitePublicResponse {
  content: WeddingSiteContentDto;
  version: number;
  publishedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PublicSiteService {
  private readonly http = inject(HttpClient);

  loadPublished(): Observable<PublicWeddingContent> {
    return this.http
      .get<WeddingSitePublicResponse>('/api/public/site')
      .pipe(map((response) => toPublicWeddingContent(response.content)));
  }
}

export function toPublicWeddingContent(
  content: WeddingSiteContentDto,
  mediaBasePath = '/api/public/site/media',
): PublicWeddingContent {
  const story = content.story;
  const mediaUrl = (id: string) => `${mediaBasePath}/${id}`;
  const photos = (content.photos ?? []).map((photo) => {
    const src = mediaUrl(photo.id);
    return {
      ...photo,
      src,
      srcSet: [480, 768, 1280, 1920].map((width) => `${src}?width=${width} ${width}w`).join(', '),
    };
  });
  return {
    hero: content.hero,
    story: {
      eyebrow: story.eyebrow,
      title: story.title,
      paragraphs: story.paragraphs,
      image:
        story.imageId && story.imageAlt && story.imageWidth && story.imageHeight
          ? {
              src: mediaUrl(story.imageId),
              alt: story.imageAlt,
              width: story.imageWidth,
              height: story.imageHeight,
            }
          : null,
    },
    schedule: content.schedule,
    notices: content.notices,
    rsvp: content.rsvp,
    sectionOrder: content.sectionOrder,
    photos,
  };
}

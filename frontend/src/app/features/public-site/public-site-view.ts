import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  PublicPhotoPlacement,
  PublicWeddingContent,
  PublicWeddingPhoto,
} from './public-site-content';

@Component({
  selector: 'app-public-site-view',
  imports: [RouterLink],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  host: { '[class.is-preview]': 'previewMode()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicSiteView {
  readonly siteContent = input.required<PublicWeddingContent>();
  readonly previewMode = input(false);

  coverPhoto(): PublicWeddingPhoto | null {
    return this.siteContent().photos.find((photo) => photo.placement === 'HERO') ?? null;
  }

  photosFor(placement: Exclude<PublicPhotoPlacement, 'HERO'>): readonly PublicWeddingPhoto[] {
    return this.siteContent().photos.filter((photo) => photo.placement === placement);
  }

  objectPosition(photo: PublicWeddingPhoto): string {
    return `${photo.focalX}% ${photo.focalY}%`;
  }
}

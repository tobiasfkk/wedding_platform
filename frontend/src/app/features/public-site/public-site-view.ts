import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicWeddingContent } from './public-site-content';

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
}

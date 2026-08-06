import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PUBLIC_WEDDING_CONTENT } from './public-site-content';

@Component({
  selector: 'app-public-home',
  imports: [RouterLink],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {
  protected readonly content = PUBLIC_WEDDING_CONTENT;
}

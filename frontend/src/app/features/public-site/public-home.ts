import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RsvpHome } from '../rsvp/rsvp-home';

@Component({
  selector: 'app-public-home',
  imports: [RsvpHome],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {}

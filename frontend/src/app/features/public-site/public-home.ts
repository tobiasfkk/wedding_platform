import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RsvpHome } from '../rsvp/rsvp-home';
import { ScrollRevealDirective } from './scroll-reveal.directive';

@Component({
  selector: 'app-public-home',
  imports: [RsvpHome, ScrollRevealDirective],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {}

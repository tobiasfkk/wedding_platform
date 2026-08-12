import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';

import { RsvpHome } from '../rsvp/rsvp-home';
import { ScrollRevealDirective } from './scroll-reveal.directive';

@Component({
  selector: 'app-public-home',
  imports: [RsvpHome, ScrollRevealDirective],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {
  private readonly destroyRef = inject(DestroyRef);
  private scrollSettleTimer?: ReturnType<typeof setTimeout>;
  private lastScrollLeft = 0;

  readonly activePhotoIndex = signal(0);
  readonly captionDirection = signal<'backward' | 'forward'>('forward');

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.scrollSettleTimer));
  }

  onPhotoRailScroll(event: Event): void {
    const rail = event.currentTarget as HTMLElement;
    const movement = rail.scrollLeft - this.lastScrollLeft;

    if (Math.abs(movement) > 0.5) {
      this.captionDirection.set(movement > 0 ? 'forward' : 'backward');
    }

    this.lastScrollLeft = rail.scrollLeft;
    this.activePhotoIndex.set(-1);
    clearTimeout(this.scrollSettleTimer);
    this.scrollSettleTimer = setTimeout(() => this.activateCenteredPhoto(rail), 140);
  }

  private activateCenteredPhoto(rail: HTMLElement): void {
    const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    const photos = Array.from(rail.querySelectorAll<HTMLElement>('.photo-card'));
    const closestPhoto = photos.reduce(
      (closest, photo, index) => {
        const bounds = photo.getBoundingClientRect();
        const distance = Math.abs(bounds.left + bounds.width / 2 - railCenter);
        return distance < closest.distance ? { distance, index } : closest;
      },
      { distance: Number.POSITIVE_INFINITY, index: 0 },
    );

    this.activePhotoIndex.set(closestPhoto.index);
  }
}

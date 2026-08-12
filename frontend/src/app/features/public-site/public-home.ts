import { DOCUMENT } from '@angular/common';
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
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private scrollSettleTimer?: ReturnType<typeof setTimeout>;
  private storyScrollFrame?: number;
  private previousScrollBehavior?: string;
  private lastScrollLeft = 0;

  readonly activePhotoIndex = signal(0);
  readonly captionDirection = signal<'backward' | 'forward'>('forward');

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.scrollSettleTimer);
      this.stopStoryScroll();
    });
  }

  onContinueStory(event: MouseEvent): void {
    event.preventDefault();
    const link = event.currentTarget as HTMLAnchorElement;
    const target = this.document.querySelector<HTMLElement>(link.hash);
    const view = this.document.defaultView;

    if (!target || !view) return;
    if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.scrollIntoView();
      return;
    }

    this.stopStoryScroll();
    const root = this.document.documentElement;
    const startPosition = view.scrollY;
    const targetPosition = target.getBoundingClientRect().top + startPosition;
    const distance = targetPosition - startPosition;
    const startedAt = view.performance.now();
    this.previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    view.history.pushState(null, '', link.hash);

    const animate = (timestamp: number): void => {
      const progress = Math.min((timestamp - startedAt) / 1300, 1);
      const easedProgress =
        progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      view.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        this.storyScrollFrame = view.requestAnimationFrame(animate);
        return;
      }

      this.storyScrollFrame = undefined;
      this.restoreScrollBehavior();
    };

    this.storyScrollFrame = view.requestAnimationFrame(animate);
  }

  onPhotoRailScroll(event: Event): void {
    const rail = event.currentTarget as HTMLElement;
    const movement = rail.scrollLeft - this.lastScrollLeft;

    if (Math.abs(movement) > 0.5) {
      this.captionDirection.set(movement > 0 ? 'forward' : 'backward');
    }

    this.lastScrollLeft = rail.scrollLeft;
    clearTimeout(this.scrollSettleTimer);

    if (this.captionDirection() === 'backward') {
      this.activateCenteredPhoto(rail);
      return;
    }

    this.activePhotoIndex.set(-1);
    this.scrollSettleTimer = setTimeout(() => this.activateCenteredPhoto(rail), 60);
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

  private stopStoryScroll(): void {
    const view = this.document.defaultView;
    if (view && this.storyScrollFrame !== undefined) {
      view.cancelAnimationFrame(this.storyScrollFrame);
      this.storyScrollFrame = undefined;
    }
    this.restoreScrollBehavior();
  }

  private restoreScrollBehavior(): void {
    if (this.previousScrollBehavior === undefined) return;
    this.document.documentElement.style.scrollBehavior = this.previousScrollBehavior;
    this.previousScrollBehavior = undefined;
  }
}

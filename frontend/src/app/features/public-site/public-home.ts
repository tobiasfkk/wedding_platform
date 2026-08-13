import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';

import { RsvpHome } from '../rsvp/rsvp-home';
import { ScrollRevealDirective } from './scroll-reveal.directive';
import { TouchPhotoRailDirective } from './touch-photo-rail.directive';

@Component({
  selector: 'app-public-home',
  imports: [RsvpHome, ScrollRevealDirective, TouchPhotoRailDirective],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private pageScrollFrame?: number;
  private previousScrollBehavior?: string;
  readonly pixKey: string | null = null;
  readonly pixCopyState = signal<'idle' | 'copied' | 'error'>('idle');

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPageScroll());
  }

  onContinueStory(event: MouseEvent): void {
    event.preventDefault();
    const link = event.currentTarget as HTMLAnchorElement;
    const target = this.document.querySelector<HTMLElement>(link.hash);
    if (target) this.scrollTo(target, link.hash);
  }

  onResponsesSaved(): void {
    const target = this.document.getElementById('presentes');
    if (target) this.scrollTo(target);
  }

  async copyPixKey(): Promise<void> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!this.pixKey || !clipboard) {
      this.pixCopyState.set('error');
      return;
    }
    try {
      await clipboard.writeText(this.pixKey);
      this.pixCopyState.set('copied');
    } catch {
      this.pixCopyState.set('error');
    }
  }

  private scrollTo(target: HTMLElement, hash?: string): void {
    const view = this.document.defaultView;
    if (!view) return;
    if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.scrollIntoView();
      return;
    }

    this.stopPageScroll();
    const root = this.document.documentElement;
    const startPosition = view.scrollY;
    const targetPosition = target.getBoundingClientRect().top + startPosition;
    const distance = targetPosition - startPosition;
    const startedAt = view.performance.now();
    this.previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    if (hash) view.history.pushState(null, '', hash);

    const animate = (timestamp: number): void => {
      const progress = Math.min((timestamp - startedAt) / 1300, 1);
      const easedProgress =
        progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      view.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        this.pageScrollFrame = view.requestAnimationFrame(animate);
        return;
      }

      this.pageScrollFrame = undefined;
      this.restoreScrollBehavior();
    };

    this.pageScrollFrame = view.requestAnimationFrame(animate);
  }

  private stopPageScroll(): void {
    const view = this.document.defaultView;
    if (view && this.pageScrollFrame !== undefined) {
      view.cancelAnimationFrame(this.pageScrollFrame);
      this.pageScrollFrame = undefined;
    }
    this.restoreScrollBehavior();
  }

  private restoreScrollBehavior(): void {
    if (this.previousScrollBehavior === undefined) return;
    this.document.documentElement.style.scrollBehavior = this.previousScrollBehavior;
    this.previousScrollBehavior = undefined;
  }
}

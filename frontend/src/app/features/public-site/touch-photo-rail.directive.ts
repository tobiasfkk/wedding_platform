import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appTouchPhotoRail]',
  host: {
    class: 'touch-photo-rail',
  },
})
export class TouchPhotoRailDirective implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cleanups: Array<() => void> = [];
  private animationFrame?: number;
  private reducedMotion = false;

  ngAfterViewInit(): void {
    const view = this.document.defaultView;
    const rail = this.element.nativeElement;

    if (!view) return;

    this.reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.listen(rail, 'scroll', this.scheduleUpdate, { passive: true });
    this.listen(view, 'resize', this.scheduleUpdate, { passive: true });
    this.listen(rail, 'pointerdown', this.startDragging, { passive: true });
    this.listen(view, 'pointerup', this.stopDragging, { passive: true });
    this.listen(view, 'pointercancel', this.stopDragging, { passive: true });

    this.updateCards();
  }

  ngOnDestroy(): void {
    const view = this.document.defaultView;
    if (view && this.animationFrame !== undefined) {
      view.cancelAnimationFrame(this.animationFrame);
    }
    this.cleanups.forEach((cleanup) => cleanup());
  }

  private readonly scheduleUpdate = (): void => {
    const view = this.document.defaultView;
    if (!view || this.animationFrame !== undefined) return;

    this.animationFrame = view.requestAnimationFrame(() => {
      this.animationFrame = undefined;
      this.updateCards();
    });
  };

  private readonly startDragging = (): void => {
    this.element.nativeElement.classList.add('is-dragging');
  };

  private readonly stopDragging = (): void => {
    this.element.nativeElement.classList.remove('is-dragging');
  };

  private updateCards(): void {
    const rail = this.element.nativeElement;
    const cards = Array.from(rail.querySelectorAll<HTMLElement>('.photo-card'));
    if (cards.length === 0) return;

    const railBounds = rail.getBoundingClientRect();
    const railCenter = railBounds.left + rail.clientWidth / 2;
    let activeCard = cards[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      const bounds = card.getBoundingClientRect();
      const distanceInPixels = bounds.left + bounds.width / 2 - railCenter;
      const progress = this.reducedMotion
        ? 0
        : Math.max(-1.25, Math.min(1.25, distanceInPixels / Math.max(bounds.width, 1)));
      const distance = this.reducedMotion ? 0 : Math.min(1, Math.abs(progress));

      card.style.setProperty('--card-progress', progress.toFixed(4));
      card.style.setProperty('--card-distance', distance.toFixed(4));

      if (Math.abs(distanceInPixels) < closestDistance) {
        closestDistance = Math.abs(distanceInPixels);
        activeCard = card;
      }
    });

    cards.forEach((card) => card.classList.toggle('is-active', card === activeCard));
  }

  private listen(
    target: EventTarget,
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(eventName, listener, options);
    this.cleanups.push(() => target.removeEventListener(eventName, listener, options));
  }
}

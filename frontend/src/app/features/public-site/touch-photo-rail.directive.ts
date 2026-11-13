import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';

/** Quantidade máxima de pontos de navegação exibidos ao mesmo tempo. */
const VISIBLE_DOTS = 7;

@Directive({
  selector: '[appTouchPhotoRail]',
  exportAs: 'touchPhotoRail',
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
  private pointerStartX?: number;
  private pointerMoved = false;
  private ignoreNextClick = false;
  readonly activeIndex = signal(0);
  readonly indexes = signal<number[]>([]);
  /**
   * Janela de pontos centrada na foto ativa: com muitas fotos, todos os pontos não caberiam numa
   * tela de celular. A janela desliza junto com a galeria e nunca passa das pontas.
   */
  readonly visibleIndexes = computed(() => {
    const indexes = this.indexes();
    if (indexes.length <= VISIBLE_DOTS) return indexes;
    const start = Math.min(
      Math.max(this.activeIndex() - Math.floor(VISIBLE_DOTS / 2), 0),
      indexes.length - VISIBLE_DOTS,
    );
    return indexes.slice(start, start + VISIBLE_DOTS);
  });

  ngAfterViewInit(): void {
    const view = this.document.defaultView;
    const rail = this.element.nativeElement;

    if (!view) return;

    this.reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.indexes.set(Array.from(rail.querySelectorAll('.photo-card'), (_, index) => index));
    this.listen(rail, 'scroll', this.scheduleUpdate, { passive: true });
    this.listen(view, 'resize', this.scheduleUpdate, { passive: true });
    this.listen(rail, 'pointerdown', this.startDragging, { passive: true });
    this.listen(rail, 'pointermove', this.trackDragging, { passive: true });
    this.listen(view, 'pointerup', this.stopDragging, { passive: true });
    this.listen(view, 'pointercancel', this.stopDragging, { passive: true });
    this.listen(rail, 'click', this.advanceFromClick);
    this.listen(rail, 'keydown', this.navigateWithKeyboard);

    this.updateCards();
  }

  ngOnDestroy(): void {
    const view = this.document.defaultView;
    if (view && this.animationFrame !== undefined) {
      view.cancelAnimationFrame(this.animationFrame);
    }
    this.cleanups.forEach((cleanup) => cleanup());
  }

  goTo(index: number, smooth = true): void {
    const cards = this.cards();
    const card = cards[index];
    if (!card) return;
    card.scrollIntoView({
      behavior: smooth && !this.reducedMotion ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    });
    this.activeIndex.set(index);
  }

  private readonly scheduleUpdate = (): void => {
    const view = this.document.defaultView;
    if (!view || this.animationFrame !== undefined) return;

    this.animationFrame = view.requestAnimationFrame(() => {
      this.animationFrame = undefined;
      this.updateCards();
    });
  };

  private readonly startDragging = (event: Event): void => {
    this.pointerStartX = (event as PointerEvent).clientX;
    this.pointerMoved = false;
    this.element.nativeElement.classList.add('is-dragging');
  };

  private readonly trackDragging = (event: Event): void => {
    if (this.pointerStartX === undefined) return;
    if (Math.abs((event as PointerEvent).clientX - this.pointerStartX) > 8) {
      this.pointerMoved = true;
    }
  };

  private readonly stopDragging = (): void => {
    this.element.nativeElement.classList.remove('is-dragging');
    this.pointerStartX = undefined;
    this.ignoreNextClick = this.pointerMoved;
    this.document.defaultView?.setTimeout(() => (this.ignoreNextClick = false));
  };

  private readonly advanceFromClick = (event: Event): void => {
    const selectedCard = (event.target as Element).closest<HTMLElement>('.photo-card');
    if (!selectedCard) return;
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      return;
    }
    const selectedIndex = this.cards().indexOf(selectedCard);
    if (selectedIndex === this.activeIndex()) this.advance();
    else this.goTo(selectedIndex);
  };

  private readonly navigateWithKeyboard = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'ArrowLeft' && keyboardEvent.key !== 'ArrowRight') return;
    keyboardEvent.preventDefault();
    const direction = keyboardEvent.key === 'ArrowRight' ? 1 : -1;
    const count = this.indexes().length;
    this.goTo((this.activeIndex() + direction + count) % count);
  };

  private updateCards(): void {
    const rail = this.element.nativeElement;
    const cards = this.cards();
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

    const nextIndex = cards.indexOf(activeCard);
    cards.forEach((card) => card.classList.toggle('is-active', card === activeCard));
    if (nextIndex !== this.activeIndex()) {
      this.activeIndex.set(nextIndex);
    }
  }

  private advance(): void {
    const count = this.indexes().length;
    if (count > 0) this.goTo((this.activeIndex() + 1) % count);
  }

  private cards(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('.photo-card'));
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

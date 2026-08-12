import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostBinding,
  OnDestroy,
  Renderer2,
  inject,
  input,
} from '@angular/core';

type RevealVariant = 'clip' | 'line' | 'scale' | 'up';

@Directive({
  selector: '[appScrollReveal]',
  host: {
    class: 'motion-reveal',
    '[attr.data-reveal]': 'variant()',
  },
})
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private observer?: IntersectionObserver;

  readonly variant = input<RevealVariant>('up', { alias: 'appScrollReveal' });
  readonly revealDelay = input(0);

  @HostBinding('style.--reveal-delay')
  get delay(): string {
    return `${Math.max(0, this.revealDelay())}ms`;
  }

  ngAfterViewInit(): void {
    const view = this.document.defaultView;
    const reduceMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (!view || reduceMotion || !('IntersectionObserver' in view)) {
      this.reveal();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.reveal();
        this.observer?.disconnect();
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.08,
      },
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private reveal(): void {
    this.renderer.addClass(this.element.nativeElement, 'is-visible');
  }
}

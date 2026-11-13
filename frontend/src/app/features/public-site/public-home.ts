import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PixConfiguration, PixService } from '../../core/pix.service';
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
  private static readonly CEREMONY_TIME = new Date('2027-04-24T16:00:00-03:00').getTime();
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pixService = inject(PixService);
  private pageScrollFrame?: number;
  private countdownTimer?: number;
  private previousScrollBehavior?: string;
  readonly invitationGroupName = signal<string | null>(null);
  readonly pix = signal<PixConfiguration | null>(null);
  readonly pixQrCode = signal<string | null>(null);
  readonly pixQrError = signal(false);
  readonly pixCopyState = signal<'idle' | 'copied' | 'error'>('idle');
  readonly countdown = signal(this.calculateCountdown(Date.now()));
  readonly countdownLabel = computed(() => {
    const countdown = this.countdown();
    if (countdown.complete) return 'Hoje é o nosso grande dia.';
    const days = this.quantityLabel(countdown.days, 'dia', 'dias');
    const hours = this.quantityLabel(countdown.hours, 'hora', 'horas');
    const minutes = this.quantityLabel(countdown.minutes, 'minuto', 'minutos');
    const seconds = this.quantityLabel(countdown.seconds, 'segundo', 'segundos');
    return `Faltam ${days}, ${hours}, ${minutes} e ${seconds} para a cerimônia.`;
  });

  constructor() {
    const view = this.document.defaultView;
    if (view) {
      this.countdownTimer = view.setInterval(
        () => this.countdown.set(this.calculateCountdown(Date.now())),
        1000,
      );
    }
    this.loadPix();
    this.destroyRef.onDestroy(() => {
      this.stopPageScroll();
      if (view && this.countdownTimer !== undefined) view.clearInterval(this.countdownTimer);
    });
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

  async copyPixCode(): Promise<void> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    const payload = this.pix()?.payload;
    if (!payload) {
      this.pixCopyState.set('error');
      return;
    }

    if (clipboard) {
      try {
        await clipboard.writeText(payload);
        this.pixCopyState.set('copied');
        return;
      } catch {
        // Browsers can expose the Clipboard API but reject it outside a secure context.
      }
    }

    this.pixCopyState.set(this.copyWithSelection(payload) ? 'copied' : 'error');
  }

  private copyWithSelection(payload: string): boolean {
    const field = this.document.createElement('textarea');
    field.value = payload;
    field.readOnly = true;
    field.setAttribute('aria-hidden', 'true');
    field.style.position = 'fixed';
    field.style.inset = '0 auto auto -9999px';
    field.style.opacity = '0';
    this.document.body.append(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, payload.length);
    try {
      return this.document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }

  private loadPix(): void {
    this.pixService
      .findPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuration) => {
          this.pix.set(configuration);
          if (configuration.configured && configuration.payload) {
            void this.generatePixQrCode(configuration.payload);
          }
        },
        error: () =>
          this.pix.set({ configured: false, key: null, payload: null, recipientName: null }),
      });
  }

  private async generatePixQrCode(payload: string): Promise<void> {
    try {
      this.pixQrCode.set(await this.pixService.qrCode(payload));
    } catch {
      this.pixQrError.set(true);
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

  private calculateCountdown(now: number): CeremonyCountdown {
    const remainingSeconds = Math.max(0, Math.floor((PublicHome.CEREMONY_TIME - now) / 1000));
    return {
      days: Math.floor(remainingSeconds / 86_400),
      hours: Math.floor((remainingSeconds % 86_400) / 3_600),
      minutes: Math.floor((remainingSeconds % 3_600) / 60),
      seconds: remainingSeconds % 60,
      complete: remainingSeconds === 0,
    };
  }

  private quantityLabel(value: number, singular: string, plural: string): string {
    return `${value} ${value === 1 ? singular : plural}`;
  }
}

interface CeremonyCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  complete: boolean;
}

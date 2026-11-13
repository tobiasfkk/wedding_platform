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

export interface GalleryPhoto {
  readonly src: string;
  readonly alt: string;
}

// WebP 960x1200 (recorte 4:5 exibido pela galeria). Originais em frontend/.photo-originals (fora do git).
const GALLERY_PHOTOS: readonly GalleryPhoto[] = [
  'Tobias e Maria Eduarda sorrindo com um buquê de flores ao ar livre',
  'Maria Eduarda e Tobias abraçados e sorrindo em um jardim',
  'Maria Eduarda e Tobias olhando um para o outro em um jardim',
  'Maria Eduarda olhando com carinho para Tobias durante uma celebração',
  'Maria Eduarda e Tobias sorrindo juntos em uma celebração ao ar livre',
  'Maria Eduarda e Tobias diante das montanhas ao pôr do sol',
  'Maria Eduarda e Tobias abraçados durante uma caminhada em um dia de neblina',
  'Tobias inclinando Maria Eduarda para um beijo em um gramado diante das árvores',
  'Maria Eduarda e Tobias sorrindo um para o outro em um campo, com a mão dele no rosto dela',
  'Tobias beijando a testa de Maria Eduarda em um campo',
  'Maria Eduarda e Tobias de mãos dadas no meio de um campo aberto',
  'Maria Eduarda e Tobias de mãos dadas, sorrindo um para o outro em um campo',
  'Maria Eduarda e Tobias deitados na grama, olhando um para o outro',
  'Mãos do casal se tocando, com o anel de noivado em destaque',
  'Detalhe das mãos dadas do casal em meio a flores do campo',
  'Maria Eduarda abraçando Tobias e sorrindo em um campo florido',
  'Maria Eduarda e Tobias abraçados, de costas, olhando a paisagem do campo',
  'Foto em preto e branco de Maria Eduarda e Tobias tomando café juntos em uma cozinha',
  'Maria Eduarda e Tobias brindando com xícaras de café em uma cozinha de madeira',
  'Foto em preto e branco do casal sorrindo e tomando café à mesa',
  'Maria Eduarda e Tobias tomando café à mesa do café da manhã',
  'Foto em preto e branco de Tobias beijando Maria Eduarda enquanto seguram xícaras de café',
  'Maria Eduarda e Tobias sob uma grande árvore no campo',
  'Tobias carregando Maria Eduarda nas costas em um campo florido',
  'Maria Eduarda e Tobias de mãos dadas caminhando por uma colina com neblina',
  'Foto em preto e branco de Tobias erguendo Maria Eduarda em um abraço no campo',
  'Maria Eduarda abraçando Tobias, os dois sorrindo para a câmera',
].map((alt, index) => ({
  src: `/images/couple/maria-tobias-${String(index + 1).padStart(2, '0')}.webp`,
  alt,
}));

/** Fotos baixadas ao abrir a página; as demais só quando a galeria se aproxima delas. */
export const EAGER_GALLERY_PHOTOS = 3;

@Component({
  selector: 'app-public-home',
  imports: [RsvpHome, ScrollRevealDirective, TouchPhotoRailDirective],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {
  private static readonly CEREMONY_TIME = new Date('2027-04-24T15:30:00-03:00').getTime();
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pixService = inject(PixService);
  private pageScrollFrame?: number;
  private countdownTimer?: number;
  private previousScrollBehavior?: string;
  readonly photos = GALLERY_PHOTOS;
  readonly eagerPhotos = EAGER_GALLERY_PHOTOS;
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

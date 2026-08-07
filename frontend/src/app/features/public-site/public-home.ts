import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { PublicWeddingContent } from './public-site-content';
import { PublicSiteService } from './public-site.service';
import { PublicSiteView } from './public-site-view';

type PublicSiteState = 'loading' | 'success' | 'unavailable' | 'error';

@Component({
  selector: 'app-public-home',
  imports: [PublicSiteView],
  template: `
    @if (state() === 'loading') {
      <section class="public-state" aria-labelledby="public-state-title" aria-busy="true">
        <p class="eyebrow">Nosso casamento</p>
        <h1 id="public-state-title">Preparando nossa história…</h1>
        <p class="lead" role="status">Carregando as informações publicadas.</p>
      </section>
    } @else if (state() === 'success' && content(); as publishedContent) {
      <app-public-site-view [siteContent]="publishedContent" />
    } @else if (state() === 'unavailable') {
      <section class="public-state" aria-labelledby="public-state-title">
        <p class="eyebrow">Voltamos em breve</p>
        <h1 id="public-state-title">Este espaço ainda está sendo preparado.</h1>
        <p class="lead">Os noivos publicarão aqui todos os detalhes da celebração.</p>
      </section>
    } @else {
      <section class="public-state" aria-labelledby="public-state-title">
        <p class="eyebrow">Não foi possível carregar</p>
        <h1 id="public-state-title">Nossa história continua, mesmo quando a conexão falha.</h1>
        <p class="lead">Tente novamente em alguns instantes.</p>
        <button class="primary-action" type="button" (click)="load()">Tentar novamente</button>
      </section>
    }
  `,
  styles: `
    .public-state {
      display: grid;
      min-height: min(42rem, calc(100svh - 8rem));
      align-content: center;
      justify-items: start;
      max-width: 48rem;
      margin-inline: auto;
    }
    button {
      border: 0;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {
  private readonly service = inject(PublicSiteService);

  readonly state = signal<PublicSiteState>('loading');
  readonly content = signal<PublicWeddingContent | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.service.loadPublished().subscribe({
      next: (content) => {
        this.content.set(content);
        this.state.set('success');
      },
      error: (error: HttpErrorResponse) => {
        this.content.set(null);
        this.state.set(error.status === 404 ? 'unavailable' : 'error');
      },
    });
  }
}

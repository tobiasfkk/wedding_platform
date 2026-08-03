import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { RsvpAccessService, RsvpInvitation } from './rsvp-access.service';

type AccessState = 'loading' | 'success' | 'error' | 'rate-limited';

@Component({
  selector: 'app-rsvp-home',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="rsvp-shell" aria-live="polite">
      @if (state() === 'loading') {
        <div class="rsvp-card rsvp-card--centered" role="status">
          <p class="eyebrow">Confirmação de presença</p>
          <h1 id="rsvp-state-title" tabindex="-1">Abrindo seu convite</h1>
          <p class="lead">Estamos validando o acesso com segurança…</p>
          <span class="loading-indicator" aria-hidden="true"></span>
        </div>
      } @else if (state() === 'success' && invitation(); as currentInvitation) {
        <div class="rsvp-card">
          <p class="eyebrow">Seu convite</p>
          <h1 id="rsvp-state-title" tabindex="-1">{{ currentInvitation.groupName }}</h1>
          <p class="lead">Encontramos o convite do seu grupo.</p>

          <section class="invitation-summary" aria-labelledby="participants-title">
            <h2 id="participants-title">Participantes</h2>
            <ul>
              @for (participant of currentInvitation.participants; track participant) {
                <li>{{ participant }}</li>
              }
            </ul>
            <p class="companion-rule">{{ companionRule(currentInvitation.companionLimit) }}</p>
          </section>

          <button mat-flat-button type="button" disabled>Responder convite</button>
          <p class="next-step">A confirmação de presença será habilitada na próxima etapa.</p>
        </div>
      } @else {
        <div class="rsvp-card rsvp-card--centered">
          <p class="eyebrow">Confirmação de presença</p>
          <h1 id="rsvp-state-title" tabindex="-1">Acesso indisponível</h1>
          <p class="lead">
            Não foi possível abrir este convite. Confira o link recebido ou fale com os responsáveis
            pelo evento.
          </p>
          @if (state() === 'rate-limited') {
            <p class="supporting-message">Aguarde alguns minutos antes de tentar novamente.</p>
          }
          <a mat-stroked-button routerLink="/">Voltar ao site</a>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .rsvp-shell {
      display: grid;
      min-height: min(42rem, calc(100dvh - 4rem));
      place-items: center;
    }
    .rsvp-card {
      width: min(100%, 36rem);
      padding: clamp(1.25rem, 6vw, 2.5rem);
      overflow-wrap: anywhere;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: color-mix(in srgb, var(--color-surface) 94%, transparent);
      box-shadow: 0 1rem 3rem rgb(75 48 38 / 8%);
    }
    .rsvp-card--centered {
      text-align: center;
    }
    h1 {
      font-size: clamp(2.25rem, 12vw, 4.5rem);
    }
    .lead {
      margin-block-end: 1.5rem;
    }
    .rsvp-card--centered .lead {
      margin-inline: auto;
    }
    .invitation-summary {
      margin-block: 1.5rem;
      padding: 1rem;
      border-radius: 0.75rem;
      background: var(--color-surface-subtle);
    }
    .invitation-summary h2 {
      margin-block-start: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 500;
    }
    .invitation-summary ul {
      display: grid;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .invitation-summary li {
      padding-block-end: 0.6rem;
      border-block-end: 1px solid var(--color-border);
    }
    .companion-rule,
    .next-step,
    .supporting-message {
      color: var(--color-muted);
    }
    .companion-rule {
      margin-block-end: 0;
      font-weight: 700;
    }
    .next-step {
      margin-block-end: 0;
      font-size: 0.9rem;
    }
    .loading-indicator {
      display: inline-block;
      width: 2rem;
      aspect-ratio: 1;
      border: 0.2rem solid var(--color-accent-soft);
      border-top-color: var(--color-accent-strong);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(1turn);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-indicator {
        animation: none;
      }
    }
    @media (max-width: 30rem) {
      .rsvp-shell {
        min-height: calc(100dvh - 2rem);
        place-items: start center;
      }
      .rsvp-card {
        padding: 1.25rem;
      }
      .rsvp-card button,
      .rsvp-card a {
        width: 100%;
        min-height: 3rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsvpHome {
  private readonly service = inject(RsvpAccessService);
  private readonly document = inject(DOCUMENT);
  readonly state = signal<AccessState>('loading');
  readonly invitation = signal<RsvpInvitation | null>(null);

  constructor() {
    const code = this.readAndRemoveCode();
    this.service
      .session()
      .pipe(
        switchMap((session) => {
          if (code) return this.service.access(code);
          if (session.identified && session.invitation) return [session.invitation];
          throw new Error('Invitation code unavailable');
        }),
      )
      .subscribe({
        next: (invitation) => {
          this.invitation.set(invitation);
          this.state.set('success');
          this.focusState();
        },
        error: (error) => {
          this.state.set(error.status === 429 ? 'rate-limited' : 'error');
          this.focusState();
        },
      });
  }

  companionRule(limit: number): string {
    if (limit === 0) return 'Este convite é nominal e não inclui acompanhantes.';
    if (limit === 1) return 'Este convite permite adicionar até 1 acompanhante.';
    return `Este convite permite adicionar até ${limit} acompanhantes.`;
  }

  private readAndRemoveCode(): string | null {
    const fragment = this.document.defaultView?.location.hash ?? '';
    const parameters = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment);
    const code = parameters.get('code');
    if (fragment) {
      this.document.defaultView?.history.replaceState(
        null,
        '',
        `${this.document.defaultView.location.pathname}${this.document.defaultView.location.search}`,
      );
    }
    return code;
  }

  private focusState(): void {
    queueMicrotask(() => this.document.getElementById('rsvp-state-title')?.focus());
  }
}

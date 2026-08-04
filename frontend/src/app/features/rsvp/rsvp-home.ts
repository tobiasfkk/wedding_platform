import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import {
  RsvpAccessService,
  RsvpCompanion,
  RsvpInvitation,
  RsvpStatus,
} from './rsvp-access.service';

type AccessState = 'loading' | 'success' | 'error' | 'rate-limited';
type SubmissionState = 'idle' | 'saving' | 'saved' | 'error';

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
          <p class="lead">Informe a presença de cada pessoa do grupo.</p>

          <section class="invitation-summary" aria-labelledby="participants-title">
            <h2 id="participants-title">Quem vai participar?</h2>
            <p class="response-guidance">Escolha uma resposta para cada pessoa do convite.</p>
            <div class="participant-list">
              @for (participant of currentInvitation.participants; track participant.id) {
                <fieldset class="participant-card">
                  <legend>{{ participant.name }}</legend>
                  <div
                    class="response-options"
                    [attr.aria-label]="'Resposta de ' + participant.name"
                  >
                    <button
                      mat-stroked-button
                      type="button"
                      [class.is-selected]="statusOf(participant.id) === 'CONFIRMED'"
                      [attr.aria-pressed]="statusOf(participant.id) === 'CONFIRMED'"
                      [disabled]="submissionState() === 'saving'"
                      (click)="setStatus(participant.id, 'CONFIRMED')"
                    >
                      Vou participar
                    </button>
                    <button
                      mat-stroked-button
                      type="button"
                      [class.is-selected]="statusOf(participant.id) === 'DECLINED'"
                      [attr.aria-pressed]="statusOf(participant.id) === 'DECLINED'"
                      [disabled]="submissionState() === 'saving'"
                      (click)="setStatus(participant.id, 'DECLINED')"
                    >
                      Não vou participar
                    </button>
                    <button
                      mat-button
                      type="button"
                      [class.is-selected]="statusOf(participant.id) === 'PENDING'"
                      [attr.aria-pressed]="statusOf(participant.id) === 'PENDING'"
                      [disabled]="submissionState() === 'saving'"
                      (click)="setStatus(participant.id, 'PENDING')"
                    >
                      Decidir depois
                    </button>
                  </div>
                  <p class="current-response">{{ statusLabel(statusOf(participant.id)) }}</p>
                </fieldset>
              }
            </div>
            <p class="companion-rule">{{ companionRule(currentInvitation.companionLimit) }}</p>
          </section>

          @if (currentInvitation.companionLimit > 0) {
            <section class="companion-section" aria-labelledby="companions-title">
              <div class="companion-heading">
                <div>
                  <h2 id="companions-title">Acompanhantes</h2>
                  <p>{{ companionAvailability(currentInvitation.companionLimit) }}</p>
                </div>
                <button
                  mat-stroked-button
                  type="button"
                  class="add-companion"
                  [disabled]="
                    companions().length >= currentInvitation.companionLimit ||
                    submissionState() === 'saving'
                  "
                  (click)="addCompanion()"
                >
                  Adicionar
                </button>
              </div>
              @if (companions().length === 0) {
                <p class="empty-companions">Nenhum acompanhante adicionado.</p>
              } @else {
                <div class="companion-list">
                  @for (companion of companions(); track companion.id; let index = $index) {
                    <div class="companion-card">
                      <label [for]="'companion-' + companion.id">
                        Nome do acompanhante {{ index + 1 }}
                      </label>
                      <div class="companion-controls">
                        <input
                          [id]="'companion-' + companion.id"
                          type="text"
                          maxlength="160"
                          autocomplete="name"
                          [value]="companion.name"
                          [disabled]="submissionState() === 'saving'"
                          [attr.aria-invalid]="!companion.name.trim()"
                          (input)="updateCompanion(companion.id, $any($event.target).value)"
                        />
                        <button
                          mat-button
                          type="button"
                          [disabled]="submissionState() === 'saving'"
                          [attr.aria-label]="'Remover acompanhante ' + (index + 1)"
                          (click)="removeCompanion(companion.id)"
                        >
                          Remover
                        </button>
                      </div>
                      @if (!companion.name.trim()) {
                        <p class="field-error">Informe o nome do acompanhante.</p>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          }

          <button
            class="save-button"
            mat-flat-button
            type="button"
            [disabled]="submissionState() === 'saving' || hasInvalidCompanion()"
            (click)="saveResponses()"
          >
            {{ submissionState() === 'saving' ? 'Salvando…' : 'Salvar respostas' }}
          </button>
          @if (submissionState() === 'saved') {
            <div
              id="rsvp-save-result"
              class="save-result save-result--success"
              role="status"
              tabindex="-1"
            >
              <strong>Respostas salvas.</strong>
              <span>Você pode revisá-las nesta tela.</span>
            </div>
          } @else if (submissionState() === 'error') {
            <div
              id="rsvp-save-result"
              class="save-result save-result--error"
              role="alert"
              tabindex="-1"
            >
              <strong>Não foi possível salvar.</strong>
              <span>Nenhuma resposta foi alterada. Tente novamente.</span>
            </div>
          }
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
    .response-guidance {
      margin-block: 0 1rem;
      color: var(--color-muted);
    }
    .participant-list {
      display: grid;
      gap: 1rem;
    }
    .participant-card {
      min-width: 0;
      margin: 0;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      background: var(--color-surface);
    }
    .participant-card legend {
      padding-inline: 0.25rem;
      font-weight: 800;
    }
    .response-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .response-options button:last-child {
      grid-column: 1 / -1;
    }
    .response-options .is-selected {
      border-color: var(--color-accent-strong);
      background: var(--color-accent-soft);
      color: var(--color-text);
    }
    .current-response {
      margin: 0.75rem 0 0;
      color: var(--color-muted);
      font-size: 0.9rem;
      font-weight: 700;
    }
    .companion-rule,
    .supporting-message {
      color: var(--color-muted);
    }
    .companion-rule {
      margin-block-end: 0;
      font-weight: 700;
    }
    .companion-section {
      margin-block: 1.5rem;
    }
    .companion-section h2,
    .companion-section p {
      margin-block: 0;
    }
    .companion-section h2 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 500;
    }
    .companion-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .companion-heading p,
    .empty-companions {
      color: var(--color-muted);
    }
    .empty-companions {
      margin-block-start: 1rem !important;
    }
    .companion-list {
      display: grid;
      gap: 0.75rem;
      margin-block-start: 1rem;
    }
    .companion-card {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      background: var(--color-surface-subtle);
    }
    .companion-card label {
      display: block;
      margin-block-end: 0.4rem;
      font-weight: 800;
    }
    .companion-controls {
      display: flex;
      align-items: stretch;
      gap: 0.5rem;
    }
    .companion-controls input {
      min-width: 0;
      min-height: 3rem;
      flex: 1;
      padding-inline: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
    }
    .companion-controls input:focus-visible {
      outline: 0.2rem solid var(--color-accent-soft);
      border-color: var(--color-accent-strong);
    }
    .companion-controls input[aria-invalid='true'] {
      border-color: #b3261e;
    }
    .field-error {
      margin-block-start: 0.35rem !important;
      color: #8c1d18;
      font-size: 0.875rem;
      font-weight: 700;
    }
    .save-button {
      width: 100%;
      min-height: 3rem;
    }
    .save-result {
      display: grid;
      gap: 0.25rem;
      margin-block-start: 1rem;
      padding: 1rem;
      border-radius: 0.75rem;
    }
    .save-result--success {
      background: color-mix(in srgb, #2e7d32 12%, var(--color-surface));
      color: #1b5e20;
    }
    .save-result--error {
      background: color-mix(in srgb, #b3261e 10%, var(--color-surface));
      color: #8c1d18;
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
      .response-options {
        grid-template-columns: 1fr;
      }
      .response-options button:last-child {
        grid-column: auto;
      }
      .companion-heading,
      .companion-controls {
        align-items: stretch;
        flex-direction: column;
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
  readonly submissionState = signal<SubmissionState>('idle');
  readonly draft = signal<Record<string, RsvpStatus>>({});
  readonly companions = signal<RsvpCompanion[]>([]);
  private pendingOperationId: string | null = null;

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
          this.applyInvitation(invitation);
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

  companionAvailability(limit: number): string {
    const available = Math.max(0, limit - this.companions().length);
    return available === 1 ? '1 vaga disponível.' : `${available} vagas disponíveis.`;
  }

  hasInvalidCompanion(): boolean {
    return this.companions().some((companion) => !companion.name.trim());
  }

  addCompanion(): void {
    const invitation = this.invitation();
    if (!invitation || this.companions().length >= invitation.companionLimit) return;
    const companion = { id: globalThis.crypto.randomUUID(), name: '' };
    this.companions.update((current) => [...current, companion]);
    this.markDraftChanged();
    queueMicrotask(() => this.document.getElementById(`companion-${companion.id}`)?.focus());
  }

  updateCompanion(id: string, name: string): void {
    this.companions.update((current) =>
      current.map((companion) => (companion.id === id ? { ...companion, name } : companion)),
    );
    this.markDraftChanged();
  }

  removeCompanion(id: string): void {
    this.companions.update((current) => current.filter((companion) => companion.id !== id));
    this.markDraftChanged();
  }

  statusOf(participantId: string): RsvpStatus {
    return this.draft()[participantId] ?? 'PENDING';
  }

  statusLabel(status: RsvpStatus): string {
    if (status === 'CONFIRMED') return 'Resposta atual: vai participar';
    if (status === 'DECLINED') return 'Resposta atual: não vai participar';
    return 'Resposta atual: pendente';
  }

  setStatus(participantId: string, status: RsvpStatus): void {
    this.draft.update((current) => ({ ...current, [participantId]: status }));
    this.markDraftChanged();
  }

  saveResponses(): void {
    const invitation = this.invitation();
    if (!invitation || this.submissionState() === 'saving') return;
    this.pendingOperationId ??= globalThis.crypto.randomUUID();
    const operationId = this.pendingOperationId;
    const participants = invitation.participants.map((participant) => ({
      id: participant.id,
      status: this.statusOf(participant.id),
    }));
    this.submissionState.set('saving');
    this.service.respond(operationId, participants, this.companions()).subscribe({
      next: (response) => {
        this.applyInvitation(response.invitation);
        this.pendingOperationId = null;
        this.submissionState.set('saved');
        this.focusSaveResult();
      },
      error: () => {
        this.submissionState.set('error');
        this.focusSaveResult();
      },
    });
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

  private applyInvitation(invitation: RsvpInvitation): void {
    this.invitation.set(invitation);
    this.draft.set(
      Object.fromEntries(
        invitation.participants.map((participant) => [participant.id, participant.status]),
      ),
    );
    this.companions.set(invitation.companions);
  }

  private markDraftChanged(): void {
    this.pendingOperationId = null;
    this.submissionState.set('idle');
  }

  private focusState(): void {
    queueMicrotask(() => this.document.getElementById('rsvp-state-title')?.focus());
  }

  private focusSaveResult(): void {
    queueMicrotask(() => this.document.getElementById('rsvp-save-result')?.focus());
  }
}

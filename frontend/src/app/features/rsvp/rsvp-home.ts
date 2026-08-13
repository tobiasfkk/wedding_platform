import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import {
  RsvpAccessService,
  RsvpCompanion,
  RsvpInvitation,
  RsvpStatus,
} from './rsvp-access.service';

type AccessState = 'loading' | 'idle' | 'success' | 'error' | 'rate-limited';
type SubmissionState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-rsvp-home',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section
      class="rsvp-shell"
      [class.rsvp-shell--embedded]="embedded()"
      [attr.aria-busy]="state() === 'loading' || submissionState() === 'saving'"
    >
      @if (state() === 'loading') {
        <div class="rsvp-card rsvp-card--centered" role="status">
          @if (embedded()) {
            <h2 id="rsvp-state-title" tabindex="-1">Abrindo seu convite</h2>
          } @else {
            <h1 id="rsvp-state-title" tabindex="-1">Abrindo seu convite</h1>
          }
          <span class="loading-indicator" aria-hidden="true"></span>
        </div>
      } @else if (state() === 'success' && invitation(); as currentInvitation) {
        <div class="rsvp-card rsvp-card--invitation">
          @if (embedded()) {
            <h2 id="rsvp-state-title" tabindex="-1">{{ currentInvitation.groupName }}</h2>
          } @else {
            <h1 id="rsvp-state-title" tabindex="-1">{{ currentInvitation.groupName }}</h1>
          }
          @if (deadlineLabel(currentInvitation.rsvpDeadline); as deadline) {
            <p class="invitation-deadline">
              Este convite é individual, favor confirmar a presença do grupo até dia
              <strong>{{ deadline }}</strong
              >.
            </p>
          }
          <form (submit)="submitFromForm($event)">
            @if (!currentInvitation.editable) {
              <div class="deadline-notice" role="status">
                <strong>O prazo de confirmação foi encerrado.</strong>
              </div>
            }

            <section class="invitation-summary" aria-label="Pessoas deste convite">
              <div class="participant-list">
                @for (participant of currentInvitation.participants; track participant.id) {
                  <fieldset class="participant-card">
                    <legend class="visually-hidden">{{ participant.name }}</legend>
                    <div class="participant-content">
                      <p class="participant-name" aria-hidden="true">{{ participant.name }}</p>
                      <div
                        class="response-options"
                        [attr.aria-label]="'Resposta de ' + participant.name"
                      >
                        <button
                          class="response-option response-option--yes"
                          type="button"
                          [class.is-selected]="statusOf(participant.id) === 'CONFIRMED'"
                          [attr.aria-pressed]="statusOf(participant.id) === 'CONFIRMED'"
                          [disabled]="!currentInvitation.editable || submissionState() === 'saving'"
                          (click)="setStatus(participant.id, 'CONFIRMED')"
                        >
                          Sim
                        </button>
                        <button
                          class="response-option response-option--no"
                          type="button"
                          [class.is-selected]="statusOf(participant.id) === 'DECLINED'"
                          [attr.aria-pressed]="statusOf(participant.id) === 'DECLINED'"
                          [disabled]="!currentInvitation.editable || submissionState() === 'saving'"
                          (click)="setStatus(participant.id, 'DECLINED')"
                        >
                          Não
                        </button>
                        <button
                          class="response-option response-option--later"
                          type="button"
                          [class.is-selected]="statusOf(participant.id) === 'PENDING'"
                          [attr.aria-pressed]="statusOf(participant.id) === 'PENDING'"
                          [disabled]="!currentInvitation.editable || submissionState() === 'saving'"
                          (click)="setStatus(participant.id, 'PENDING')"
                        >
                          Depois
                        </button>
                      </div>
                    </div>
                  </fieldset>
                }
              </div>
            </section>

            @if (currentInvitation.companionLimit > 0) {
              <section class="companion-section" aria-labelledby="companions-title">
                <div class="companion-heading">
                  <div>
                    <h2 id="companions-title">Acompanhantes</h2>
                    <p>{{ companionAvailability(currentInvitation.companionLimit) }}</p>
                  </div>
                  <button
                    id="rsvp-add-companion"
                    mat-stroked-button
                    type="button"
                    class="add-companion"
                    [disabled]="
                      companions().length >= currentInvitation.companionLimit ||
                      !currentInvitation.editable ||
                      submissionState() === 'saving'
                    "
                    (click)="addCompanion()"
                  >
                    Adicionar
                  </button>
                </div>
                @if (companions().length > 0) {
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
                            enterkeyhint="done"
                            [value]="companion.name"
                            [disabled]="
                              !currentInvitation.editable || submissionState() === 'saving'
                            "
                            [attr.aria-invalid]="!companion.name.trim()"
                            [attr.aria-describedby]="
                              !companion.name.trim() ? 'companion-error-' + companion.id : null
                            "
                            (input)="updateCompanion(companion.id, $any($event.target).value)"
                          />
                          <button
                            mat-button
                            type="button"
                            [disabled]="
                              !currentInvitation.editable || submissionState() === 'saving'
                            "
                            [attr.aria-label]="'Remover acompanhante ' + (index + 1)"
                            (click)="removeCompanion(companion.id, index)"
                          >
                            Remover
                          </button>
                        </div>
                        @if (!companion.name.trim()) {
                          <p [id]="'companion-error-' + companion.id" class="field-error">
                            Informe o nome do acompanhante.
                          </p>
                        }
                      </div>
                    }
                  </div>
                }
              </section>
            }

            <button
              id="rsvp-save-button"
              class="save-button"
              type="submit"
              [disabled]="
                !currentInvitation.editable ||
                submissionState() === 'saving' ||
                hasInvalidCompanion()
              "
              [attr.aria-disabled]="submissionState() === 'saved' ? true : null"
              [class.is-saved]="submissionState() === 'saved'"
            >
              @if (!currentInvitation.editable) {
                Prazo encerrado
              } @else if (submissionState() === 'saved') {
                Tudo certo <span aria-hidden="true">✓</span>
              } @else {
                {{ submissionState() === 'saving' ? 'Confirmando…' : 'Confirmar e continuar' }}
              }
            </button>
            @if (submissionState() === 'saved') {
              <span class="visually-hidden" role="status">Confirmação salva com sucesso.</span>
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
          </form>
        </div>
      } @else if (state() === 'idle') {
        <div class="rsvp-card rsvp-card--centered rsvp-card--invitation-note">
          @if (embedded()) {
            <h2 id="rsvp-state-title" tabindex="-1">Seu convite</h2>
          } @else {
            <h1 id="rsvp-state-title" tabindex="-1">Seu convite</h1>
          }
          <p class="lead">Abra o link individual que recebeu para confirmar a presença.</p>
        </div>
      } @else {
        <div class="rsvp-card rsvp-card--centered">
          @if (embedded()) {
            <h2 id="rsvp-state-title" tabindex="-1">Acesso indisponível</h2>
          } @else {
            <h1 id="rsvp-state-title" tabindex="-1">Acesso indisponível</h1>
          }
          <p class="lead">
            Não foi possível abrir este convite. Confira o link recebido ou fale com os responsáveis
            pelo evento.
          </p>
          @if (state() === 'rate-limited') {
            <p class="supporting-message">Aguarde alguns minutos antes de tentar novamente.</p>
          }
          @if (!embedded()) {
            <a mat-stroked-button routerLink="/">Voltar ao site</a>
          }
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
    .rsvp-shell--embedded {
      min-height: 0;
      place-items: start stretch;
    }
    .rsvp-card {
      width: min(100%, 36rem);
      padding: clamp(1.25rem, 6vw, 2.5rem);
      overflow-wrap: anywhere;
    }
    .rsvp-shell--embedded .rsvp-card {
      width: 100%;
      max-width: 42rem;
      margin-inline: 0;
      padding: 0;
    }
    .rsvp-card--centered {
      text-align: center;
    }
    .rsvp-card button {
      min-height: 2.75rem;
    }
    h1,
    h2 {
      margin: 0;
      color: var(--color-accent-strong);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(2.35rem, 10vw, 4.8rem);
      font-weight: 400;
      line-height: 1;
      letter-spacing: -0.045em;
      text-wrap: balance;
    }
    .rsvp-card--invitation form {
      margin-block-start: 2rem;
    }
    .invitation-deadline {
      max-width: 36rem;
      margin-block: 1rem 0;
      color: var(--color-muted);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1rem;
      line-height: 1.55;
    }
    .invitation-deadline strong {
      color: var(--color-ink);
      font-weight: 600;
    }
    .rsvp-card--invitation-note {
      padding-block: clamp(2rem, 8vw, 4rem);
    }
    .lead {
      margin-block-end: 1.5rem;
    }
    .deadline-notice {
      margin-block-end: 1.75rem;
      color: var(--color-muted);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.05rem;
      font-weight: 400;
    }
    .rsvp-card--centered .lead {
      margin-inline: auto;
    }
    .participant-list {
      display: grid;
      gap: 0.85rem;
    }
    .participant-card {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .participant-content {
      position: relative;
      padding: 0rem 0 0rem 0.8rem;
    }
    .participant-content::before {
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      width: 1px;
      background: color-mix(in srgb, var(--color-accent-strong) 32%, var(--color-border));
      content: '';
    }
    .participant-name {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.2rem;
      font-weight: 400;
      line-height: 1.2;
    }
    .response-options {
      display: grid;
      grid-template-columns: repeat(3, minmax(4.5rem, max-content));
      justify-content: start;
      gap: 0.35rem;
      margin-block-start: 0.45rem;
    }
    .rsvp-card .response-option {
      min-width: 0;
      min-height: 1.5rem;
      padding: 0.2rem 0.7rem;
      border: 1px solid transparent;
      border-radius: 999px;
      appearance: none;
      background-color: transparent;
      color: var(--color-muted);
      font: inherit;
      font-size: 0.63rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1.1;
      text-transform: uppercase;
      cursor: pointer;
      transition:
        border-color 180ms ease,
        background-color 180ms ease,
        color 180ms ease;
    }
    .rsvp-card .response-option.response-option--yes {
      background-color: #e5ebe2;
      color: #435747;
    }
    .rsvp-card .response-option.response-option--no {
      background-color: #f2e5e1;
      color: #825b54;
    }
    .rsvp-card .response-option.response-option--later {
      background-color: #f3ecd9;
      color: #78663f;
    }
    .response-option:hover:not([disabled]):not(.is-selected) {
      filter: brightness(0.98) saturate(1.08);
    }
    .rsvp-card .response-option.response-option--yes.is-selected {
      border-color: #8a9b87;
    }
    .rsvp-card .response-option.response-option--no.is-selected {
      border-color: #ba8f86;
    }
    .rsvp-card .response-option.response-option--later.is-selected {
      border-color: #c4ad78;
    }
    .response-option:focus-visible {
      outline: 0.18rem solid color-mix(in srgb, var(--color-accent-strong) 35%, transparent);
      outline-offset: 0.15rem;
    }
    .response-option:disabled {
      cursor: default;
      opacity: 0.6;
    }
    .companion-section {
      margin-block-start: 2.5rem;
      padding-block-start: 1rem;
    }
    .companion-section h2,
    .companion-section p {
      margin-block: 0;
    }
    .companion-section h2 {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.6rem;
      font-weight: 400;
      letter-spacing: -0.03em;
    }
    .companion-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .companion-heading p {
      color: var(--color-muted);
    }
    .companion-list {
      display: grid;
      gap: 0.75rem;
      margin-block-start: 1rem;
    }
    .companion-card {
      padding-block: 1rem;
    }
    .companion-card label {
      display: block;
      margin-block-end: 0.4rem;
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
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
      padding-inline: 0;
      border: 0;
      border-block-end: 1px solid var(--color-border);
      border-radius: 0;
      background: transparent;
      color: var(--color-ink);
      font: inherit;
      scroll-margin-block: 25vh;
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
      min-height: 0;
      margin-block-start: 2.5rem;
      padding: 0.9rem 1.15rem;
      border: 1px solid var(--color-accent-strong);
      border-radius: 999px;
      appearance: none;
      background: var(--color-accent-strong);
      box-shadow: 0 0.6rem 1.5rem rgb(38 56 45 / 16%);
      color: var(--color-surface);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      cursor: pointer;
      transition:
        background-color 220ms ease,
        box-shadow 220ms ease,
        transform 220ms ease;
    }
    .save-button:hover:not([disabled]) {
      background: color-mix(in srgb, var(--color-accent-strong) 86%, white);
      box-shadow: 0 0.8rem 1.8rem rgb(38 56 45 / 22%);
      transform: translateY(-2px);
    }
    .save-button:active:not([disabled]) {
      box-shadow: none;
      transform: translateY(0);
    }
    .save-button:disabled {
      cursor: default;
      opacity: 0.52;
    }
    .save-button.is-saved {
      border-color: color-mix(in srgb, var(--color-accent-strong) 68%, var(--color-border));
      background: color-mix(in srgb, var(--color-accent-strong) 88%, white);
      box-shadow: none;
      cursor: default;
      opacity: 1;
    }
    .visually-hidden {
      position: absolute;
      inset: 0 auto auto 0;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0 0 0 0);
      border: 0;
      white-space: nowrap;
    }
    .save-result {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-block-start: 1rem;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .save-result:focus-visible {
      outline-offset: -0.25rem;
    }
    .save-result--error {
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
        place-items: start center;
      }
      .rsvp-card {
        padding-inline: 0;
      }
      .rsvp-card a {
        width: 100%;
        min-height: 3rem;
      }
      .add-companion,
      .companion-controls button {
        width: auto;
      }
      .companion-heading,
      .companion-controls {
        align-items: stretch;
        flex-direction: column;
      }
      .response-options {
        gap: 0.35rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsvpHome {
  private readonly service = inject(RsvpAccessService);
  private readonly document = inject(DOCUMENT);
  readonly embedded = input(false);
  readonly responsesSaved = output<void>();
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
          if (session.identified && session.invitation) return of(session.invitation);
          return of(null);
        }),
      )
      .subscribe({
        next: (invitation) => {
          if (!invitation) {
            this.state.set('idle');
            return;
          }
          this.applyInvitation(invitation);
          this.state.set('success');
          if (!this.embedded()) this.focusState();
        },
        error: (error) => {
          this.state.set(error.status === 429 ? 'rate-limited' : 'error');
          if (!this.embedded()) this.focusState();
        },
      });
  }

  companionAvailability(limit: number): string {
    const available = Math.max(0, limit - this.companions().length);
    return available === 1 ? '1 vaga disponível.' : `${available} vagas disponíveis.`;
  }

  deadlineLabel(deadline: string | null | undefined): string | null {
    if (!deadline) return null;
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  }

  hasInvalidCompanion(): boolean {
    return this.companions().some((companion) => !companion.name.trim());
  }

  addCompanion(): void {
    const invitation = this.invitation();
    if (!invitation?.editable || this.companions().length >= invitation.companionLimit) return;
    const companion = { id: globalThis.crypto.randomUUID(), name: '' };
    this.companions.update((current) => [...current, companion]);
    this.markDraftChanged();
    this.focusAfterRender(`companion-${companion.id}`);
  }

  updateCompanion(id: string, name: string): void {
    this.companions.update((current) =>
      current.map((companion) => (companion.id === id ? { ...companion, name } : companion)),
    );
    this.markDraftChanged();
  }

  removeCompanion(id: string, index: number): void {
    this.companions.update((current) => current.filter((companion) => companion.id !== id));
    this.markDraftChanged();
    queueMicrotask(() => {
      const remaining = this.companions();
      const next = remaining[Math.min(index, remaining.length - 1)];
      const targetId = next ? `companion-${next.id}` : 'rsvp-add-companion';
      this.document.getElementById(targetId)?.focus();
    });
  }

  statusOf(participantId: string): RsvpStatus {
    return this.draft()[participantId] ?? 'PENDING';
  }

  setStatus(participantId: string, status: RsvpStatus): void {
    this.draft.update((current) => ({ ...current, [participantId]: status }));
    this.markDraftChanged();
  }

  saveResponses(): void {
    const invitation = this.invitation();
    if (
      !invitation?.editable ||
      this.submissionState() === 'saving' ||
      this.submissionState() === 'saved' ||
      this.hasInvalidCompanion()
    )
      return;
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
        this.focusAfterRender('rsvp-save-button');
        this.document.defaultView?.setTimeout(() => this.responsesSaved.emit(), 700);
      },
      error: () => {
        this.submissionState.set('error');
        this.focusSaveResult();
      },
    });
  }

  submitFromForm(event: SubmitEvent): void {
    event.preventDefault();
    this.saveResponses();
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
    this.focusAfterRender('rsvp-state-title');
  }

  private focusSaveResult(): void {
    this.focusAfterRender('rsvp-save-result');
  }

  private focusAfterRender(id: string): void {
    this.document.defaultView?.setTimeout(() => this.document.getElementById(id)?.focus());
  }
}

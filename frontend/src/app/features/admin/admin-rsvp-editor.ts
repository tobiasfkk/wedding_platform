import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { RsvpCompanion, RsvpInvitation, RsvpStatus } from '../rsvp/rsvp-access.service';
import { AdminRsvpResponse, AdminRsvpService } from './admin-rsvp.service';

@Component({
  selector: 'app-admin-rsvp-editor',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section aria-labelledby="admin-rsvp-title">
      <a class="back-link" routerLink="/admin/invitations">← Voltar para convites</a>
      <p class="eyebrow">Administração</p>
      <h1 id="admin-rsvp-title">Resposta de RSVP</h1>

      @if (loading()) {
        <p role="status">Carregando resposta…</p>
      } @else if (loadError()) {
        <div class="message message--error" role="alert">
          <p>{{ loadError() }}</p>
          <button mat-stroked-button type="button" (click)="load()">Tentar novamente</button>
        </div>
      } @else if (invitation(); as currentInvitation) {
        <div class="editor">
          <header>
            <div>
              <h2>{{ currentInvitation.groupName }}</h2>
              <p>
                Registre respostas recebidas por outro canal. A correção administrativa funciona
                mesmo após a data-limite pública.
              </p>
            </div>
            @if (hasExistingResponse()) {
              <span class="status">Resposta existente</span>
            }
          </header>

          <section aria-labelledby="admin-participants-title">
            <h3 id="admin-participants-title">Participantes</h3>
            <div class="participant-list">
              @for (participant of currentInvitation.participants; track participant.id) {
                <label class="participant-row">
                  <span>{{ participant.name }}</span>
                  <select
                    [value]="statusOf(participant.id)"
                    [disabled]="saving()"
                    (change)="setStatus(participant.id, $any($event.target).value)"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="CONFIRMED">Confirmado</option>
                    <option value="DECLINED">Não participará</option>
                  </select>
                </label>
              }
            </div>
          </section>

          <section aria-labelledby="admin-companions-title">
            <div class="section-heading">
              <div>
                <h3 id="admin-companions-title">Acompanhantes</h3>
                <p>{{ companions().length }} de {{ currentInvitation.companionLimit }}</p>
              </div>
              <button
                mat-stroked-button
                type="button"
                [disabled]="companions().length >= currentInvitation.companionLimit || saving()"
                (click)="addCompanion()"
              >
                Adicionar
              </button>
            </div>
            @for (companion of companions(); track companion.id; let index = $index) {
              <div class="companion-row">
                <label [for]="'admin-companion-' + companion.id">
                  Nome do acompanhante {{ index + 1 }}
                </label>
                <div>
                  <input
                    [id]="'admin-companion-' + companion.id"
                    maxlength="160"
                    [value]="companion.name"
                    [disabled]="saving()"
                    [attr.aria-invalid]="!companion.name.trim()"
                    (input)="setCompanionName(companion.id, $any($event.target).value)"
                  />
                  <button
                    mat-button
                    type="button"
                    [disabled]="saving()"
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
          </section>

          @if (message()) {
            <p
              class="message"
              [class.message--success]="saved()"
              [class.message--error]="!saved()"
              [attr.role]="saved() ? 'status' : 'alert'"
            >
              {{ message() }}
            </p>
          }
          <div class="actions">
            <a mat-stroked-button routerLink="/admin/invitations">Cancelar</a>
            <button
              mat-flat-button
              type="button"
              [disabled]="saving() || hasInvalidCompanion()"
              (click)="save()"
            >
              {{ saving() ? 'Salvando…' : 'Salvar resposta' }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .back-link {
      display: inline-block;
      margin-block-end: 1.5rem;
      color: var(--color-accent-strong);
    }
    h1 {
      font-size: clamp(2.6rem, 7vw, 4.75rem);
    }
    .editor {
      display: grid;
      gap: 1.5rem;
      padding: clamp(1.25rem, 4vw, 2rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }
    .editor header,
    .section-heading,
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    h2,
    h3,
    p {
      margin-block: 0;
    }
    h2,
    h3 {
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 500;
    }
    .status {
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: var(--color-accent-soft);
      color: var(--color-accent-strong);
      font-weight: 700;
      white-space: nowrap;
    }
    .participant-list {
      display: grid;
      gap: 0.75rem;
      margin-block-start: 0.75rem;
    }
    .participant-row,
    .companion-row {
      padding: 1rem;
      border-radius: 0.75rem;
      background: var(--color-surface-subtle);
    }
    .participant-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      font-weight: 700;
    }
    select,
    input {
      min-height: 3rem;
      padding-inline: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
    }
    .companion-row {
      margin-block-start: 0.75rem;
    }
    .companion-row > label {
      display: block;
      margin-block-end: 0.4rem;
      font-weight: 700;
    }
    .companion-row > div {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
    }
    .field-error {
      margin-block-start: 0.35rem;
      color: #8b2032;
      font-weight: 700;
    }
    .message {
      padding: 0.8rem 1rem;
      border-radius: 0.65rem;
    }
    .message--error {
      background: #fff0f1;
      color: #8b2032;
    }
    .message--success {
      background: #e8f5ec;
      color: #286540;
    }
    @media (max-width: 36rem) {
      .editor header,
      .section-heading,
      .participant-row,
      .actions {
        align-items: stretch;
        flex-direction: column;
      }
      .companion-row > div {
        grid-template-columns: 1fr;
      }
      .editor button,
      .editor a,
      select {
        width: 100%;
        min-height: 3rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRsvpEditor {
  private readonly service = inject(AdminRsvpService);
  private readonly invitationId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly invitation = signal<RsvpInvitation | null>(null);
  readonly hasExistingResponse = signal(false);
  readonly statuses = signal<Record<string, RsvpStatus>>({});
  readonly companions = signal<RsvpCompanion[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly saved = signal(false);
  private pendingOperationId: string | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .find(this.invitationId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.apply(response),
        error: () => this.loadError.set('Não foi possível carregar a resposta deste convite.'),
      });
  }

  statusOf(id: string): RsvpStatus {
    return this.statuses()[id] ?? 'PENDING';
  }
  setStatus(id: string, status: RsvpStatus): void {
    this.statuses.update((current) => ({ ...current, [id]: status }));
    this.changed();
  }
  addCompanion(): void {
    const invitation = this.invitation();
    if (!invitation || this.companions().length >= invitation.companionLimit) return;
    this.companions.update((current) => [...current, { id: crypto.randomUUID(), name: '' }]);
    this.changed();
  }
  setCompanionName(id: string, name: string): void {
    this.companions.update((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
    this.changed();
  }
  removeCompanion(id: string): void {
    this.companions.update((current) => current.filter((item) => item.id !== id));
    this.changed();
  }
  hasInvalidCompanion(): boolean {
    return this.companions().some((item) => !item.name.trim());
  }

  save(): void {
    const invitation = this.invitation();
    if (!invitation || this.saving() || this.hasInvalidCompanion()) return;
    const replace = this.hasExistingResponse();
    if (
      replace &&
      !window.confirm('Substituir a resposta atual? A alteração ficará registrada no histórico.')
    )
      return;
    this.pendingOperationId ??= crypto.randomUUID();
    this.saving.set(true);
    this.message.set(null);
    this.service
      .save(
        this.invitationId,
        this.pendingOperationId,
        replace,
        invitation.participants.map((participant) => ({
          id: participant.id,
          status: this.statusOf(participant.id),
        })),
        this.companions(),
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.apply(response);
          this.pendingOperationId = null;
          this.saved.set(true);
          this.message.set('Resposta administrativa salva e registrada no histórico.');
        },
        error: () => {
          this.saved.set(false);
          this.message.set(
            'Não foi possível salvar. Nenhuma alteração foi aplicada; tente novamente.',
          );
        },
      });
  }

  private apply(response: AdminRsvpResponse): void {
    this.invitation.set(response.invitation);
    this.hasExistingResponse.set(response.hasExistingResponse);
    this.statuses.set(
      Object.fromEntries(response.invitation.participants.map((item) => [item.id, item.status])),
    );
    this.companions.set(response.invitation.companions);
  }
  private changed(): void {
    this.pendingOperationId = null;
    this.message.set(null);
  }
}

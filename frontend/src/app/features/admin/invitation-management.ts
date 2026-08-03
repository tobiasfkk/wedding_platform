import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  EligibleGuest,
  Invitation,
  InvitationGuest,
  InvitationManagementService,
} from './invitation-management.service';

@Component({
  selector: 'app-invitation-management',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section aria-labelledby="invitations-title">
      <a class="back-link" routerLink="/admin">← Voltar para administração</a>
      <header class="page-heading">
        <div>
          <p class="eyebrow">Administração</p>
          <h1 id="invitations-title">Convites</h1>
          <p class="lead">Organize pessoas em grupos e defina o limite de acompanhantes.</p>
        </div>
        <button mat-flat-button type="button" (click)="startCreate()">Criar convite</button>
      </header>

      @if (formVisible()) {
        <section class="editor" aria-labelledby="invitation-editor-title">
          <h2 id="invitation-editor-title">
            {{ editingId() ? 'Editar convite' : 'Criar convite' }}
          </h2>
          <form [formGroup]="invitationForm" (ngSubmit)="save()" novalidate>
            <mat-form-field appearance="outline">
              <mat-label>Nome do grupo ou responsável</mat-label>
              <input matInput formControlName="name" maxlength="160" />
              @if (invitationForm.controls.name.touched && invitationForm.controls.name.invalid) {
                <mat-error>Informe o nome do grupo ou responsável.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Limite de acompanhantes</mat-label>
              <input
                matInput
                type="number"
                min="0"
                max="100"
                step="1"
                formControlName="companionLimit"
              />
              @if (
                invitationForm.controls.companionLimit.touched &&
                invitationForm.controls.companionLimit.invalid
              ) {
                <mat-error>Informe um número inteiro entre 0 e 100.</mat-error>
              }
            </mat-form-field>

            <fieldset>
              <legend>Convidados vinculados</legend>
              @if (selectedGuests().length === 0) {
                <p class="muted">Selecione ao menos um convidado.</p>
              } @else {
                <ul class="selected-list">
                  @for (guest of selectedGuests(); track guest.id) {
                    <li>
                      <span>{{ guest.name }}</span>
                      <button mat-button type="button" (click)="removeGuest(guest.id)">
                        Remover
                      </button>
                    </li>
                  }
                </ul>
              }

              <div class="guest-search">
                <mat-form-field appearance="outline">
                  <mat-label>Buscar convidado ativo</mat-label>
                  <input matInput [formControl]="guestSearch" />
                </mat-form-field>
                <button
                  mat-stroked-button
                  type="button"
                  (click)="searchGuests()"
                  [disabled]="searchingGuests()"
                >
                  Buscar
                </button>
              </div>

              @if (searchingGuests()) {
                <p role="status">Buscando convidados…</p>
              } @else if (eligibleGuests().length > 0) {
                <ul class="eligible-list">
                  @for (guest of eligibleGuests(); track guest.id) {
                    <li>
                      <span>{{ guest.name }}</span>
                      <button
                        mat-stroked-button
                        type="button"
                        (click)="addGuest(guest)"
                        [disabled]="isSelected(guest.id)"
                      >
                        {{ isSelected(guest.id) ? 'Adicionado' : 'Adicionar' }}
                      </button>
                    </li>
                  }
                </ul>
              } @else if (guestSearchPerformed()) {
                <p class="muted">Nenhum convidado ativo e disponível encontrado.</p>
              }
            </fieldset>

            @if (formError()) {
              <p class="message message--error" role="alert">{{ formError() }}</p>
            }
            <div class="actions">
              <button mat-stroked-button type="button" (click)="closeForm()">Cancelar</button>
              <button mat-flat-button type="submit" [disabled]="saving()">
                {{ saving() ? 'Salvando…' : 'Salvar convite' }}
              </button>
            </div>
          </form>
        </section>
      }

      @if (generatedLink()) {
        <section class="link-panel" aria-labelledby="generated-link-title">
          <div>
            <p class="eyebrow">Link individual</p>
            <h2 id="generated-link-title">Link de {{ generatedInvitationName() }}</h2>
            <p>
              Copie este link agora. Por segurança, ele não poderá ser consultado novamente; se for
              perdido, será necessário regenerá-lo.
            </p>
          </div>
          <div class="link-copy">
            <input aria-label="Link individual do convite" readonly [value]="generatedLink()" />
            <button mat-flat-button type="button" (click)="copyGeneratedLink()">Copiar link</button>
          </div>
          <button mat-button type="button" (click)="dismissGeneratedLink()">Fechar</button>
        </section>
      }

      <form class="filters" [formGroup]="filterForm" (ngSubmit)="search()">
        <mat-form-field appearance="outline">
          <mat-label>Buscar convite</mat-label>
          <input matInput formControlName="query" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <select matNativeControl formControlName="status">
            <option value="ALL">Todos</option>
            <option value="DRAFT">Rascunhos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </mat-form-field>
        <button mat-stroked-button type="submit" [disabled]="loading()">Buscar</button>
      </form>

      @if (successMessage()) {
        <p class="message message--success" role="status">{{ successMessage() }}</p>
      }
      @if (listError()) {
        <div class="message message--error" role="alert">
          <p>{{ listError() }}</p>
          <button mat-stroked-button type="button" (click)="load()">Tentar novamente</button>
        </div>
      } @else if (loading()) {
        <p role="status">Carregando convites…</p>
      } @else if (invitations().length === 0) {
        <div class="empty-state">
          <h2>Nenhum convite encontrado</h2>
          <p>
            {{
              hasFilters()
                ? 'Revise os filtros da busca.'
                : 'Crie o primeiro grupo para organizar os convidados.'
            }}
          </p>
          @if (!hasFilters()) {
            <button mat-flat-button type="button" (click)="startCreate()">Criar convite</button>
          }
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Pessoas</th>
                <th scope="col">Acompanhantes</th>
                <th scope="col">Estado</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (invitation of invitations(); track invitation.id) {
                <tr>
                  <td>
                    <strong>{{ invitation.name }}</strong
                    ><span class="guest-names">{{ guestNames(invitation) }}</span>
                  </td>
                  <td>{{ invitation.guests.length }}</td>
                  <td>{{ invitation.companionLimit }}</td>
                  <td>
                    <span class="status">{{ statusLabel(invitation.status) }}</span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button mat-button type="button" (click)="startEdit(invitation)">
                        Editar
                      </button>
                      @if (invitation.status === 'ACTIVE') {
                        <button
                          mat-button
                          type="button"
                          (click)="regenerateLink(invitation)"
                          [disabled]="actingOnId() === invitation.id"
                        >
                          Regenerar link
                        </button>
                        <button
                          mat-button
                          type="button"
                          (click)="inactivate(invitation)"
                          [disabled]="actingOnId() === invitation.id"
                        >
                          Inativar
                        </button>
                      } @else {
                        <button
                          mat-flat-button
                          type="button"
                          (click)="activate(invitation)"
                          [disabled]="actingOnId() === invitation.id"
                        >
                          Ativar e gerar link
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nav class="pagination" aria-label="Paginação dos convites">
          <span>{{ rangeLabel() }}</span>
          <div>
            <button
              mat-stroked-button
              type="button"
              (click)="goToPage(page() - 1)"
              [disabled]="page() === 0 || loading()"
            >
              Anterior</button
            ><button
              mat-stroked-button
              type="button"
              (click)="goToPage(page() + 1)"
              [disabled]="page() + 1 >= totalPages() || loading()"
            >
              Próxima
            </button>
          </div>
        </nav>
      }
    </section>
  `,
  styles: `
    .back-link {
      display: inline-block;
      margin-block-end: 1.5rem;
      color: var(--color-accent-strong);
    }
    .page-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2rem;
    }
    .page-heading h1 {
      font-size: clamp(2.6rem, 7vw, 4.75rem);
    }
    .editor,
    .link-panel,
    .filters,
    .empty-state,
    .table-scroll {
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }
    .editor {
      margin-block: 2rem;
      padding: clamp(1.25rem, 4vw, 2rem);
    }
    .link-panel {
      display: grid;
      gap: 1rem;
      margin-block: 2rem;
      padding: clamp(1.25rem, 4vw, 2rem);
    }
    .link-panel h2 {
      margin-block: 0.25rem;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 500;
    }
    .link-copy {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
    }
    .link-copy input {
      min-width: 0;
      padding: 0.85rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface-subtle);
    }
    .editor h2,
    .empty-state h2 {
      margin-block-start: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 500;
    }
    .editor form {
      display: grid;
      gap: 0.75rem;
    }
    fieldset {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
    }
    legend {
      padding-inline: 0.4rem;
      font-weight: 700;
    }
    .guest-search {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      align-items: start;
      margin-block-start: 1rem;
    }
    .guest-search button {
      min-height: 3.5rem;
    }
    .selected-list,
    .eligible-list {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .selected-list li,
    .eligible-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.55rem 0.75rem;
      border-radius: 0.55rem;
      background: var(--color-surface-subtle);
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(14rem, 1fr) minmax(10rem, 0.35fr) auto;
      gap: 1rem;
      align-items: start;
      margin-block: 2rem 1rem;
      padding: 1rem;
    }
    .filters button {
      min-height: 3.5rem;
    }
    .actions,
    .pagination,
    .pagination div {
      display: flex;
      gap: 0.75rem;
    }
    .actions {
      justify-content: flex-end;
    }
    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      min-width: 15rem;
    }
    .muted,
    .guest-names {
      color: var(--color-muted);
    }
    .guest-names {
      display: block;
      margin-block-start: 0.25rem;
      font-size: 0.86rem;
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
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .table-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 1rem;
      border-block-end: 1px solid var(--color-border);
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--color-muted);
      font-size: 0.85rem;
    }
    tbody tr:last-child td {
      border-block-end: 0;
    }
    .status {
      display: inline-block;
      padding: 0.3rem 0.55rem;
      border-radius: 999px;
      background: var(--color-accent-soft);
      color: var(--color-accent-strong);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .pagination {
      align-items: center;
      justify-content: space-between;
      margin-block-start: 1rem;
      color: var(--color-muted);
    }
    @media (max-width: 48rem) {
      .page-heading {
        flex-direction: column;
      }
      .filters,
      .guest-search,
      .link-copy {
        grid-template-columns: 1fr;
      }
      .pagination {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationManagement {
  private readonly service = inject(InvitationManagementService);
  readonly invitations = signal<Invitation[]>([]);
  readonly selectedGuests = signal<InvitationGuest[]>([]);
  readonly eligibleGuests = signal<EligibleGuest[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly searchingGuests = signal(false);
  readonly guestSearchPerformed = signal(false);
  readonly formVisible = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly generatedLink = signal<string | null>(null);
  readonly generatedInvitationName = signal('');
  readonly actingOnId = signal<string | null>(null);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = 20;
  readonly guestSearch = new FormControl('', { nonNullable: true });
  readonly filterForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    status: new FormControl('ALL', { nonNullable: true }),
  });
  readonly invitationForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    companionLimit: new FormControl(0, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
        Validators.pattern(/^\d+$/),
      ],
    }),
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.listError.set(null);
    const filters = this.filterForm.getRawValue();
    this.service
      .findAll(filters.query, filters.status, this.page(), this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.invitations.set(result.items);
          this.page.set(result.page);
          this.totalPages.set(result.totalPages);
          this.totalElements.set(result.totalElements);
        },
        error: () => this.listError.set('Não foi possível carregar os convites.'),
      });
  }

  search(): void {
    this.page.set(0);
    this.load();
  }
  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }
  startCreate(): void {
    this.editingId.set(null);
    this.invitationForm.reset({ name: '', companionLimit: 0 });
    this.selectedGuests.set([]);
    this.prepareForm();
  }
  startEdit(invitation: Invitation): void {
    this.editingId.set(invitation.id);
    this.invitationForm.reset({ name: invitation.name, companionLimit: invitation.companionLimit });
    this.selectedGuests.set([...invitation.guests]);
    this.prepareForm();
  }
  closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }
  prepareForm(): void {
    this.formError.set(null);
    this.guestSearch.reset('');
    this.eligibleGuests.set([]);
    this.guestSearchPerformed.set(false);
    this.formVisible.set(true);
    this.searchGuests();
  }

  searchGuests(): void {
    this.searchingGuests.set(true);
    this.guestSearchPerformed.set(true);
    this.service
      .findEligibleGuests(this.guestSearch.value, this.editingId())
      .pipe(finalize(() => this.searchingGuests.set(false)))
      .subscribe({
        next: (guests) => this.eligibleGuests.set(guests),
        error: () => this.formError.set('Não foi possível buscar convidados disponíveis.'),
      });
  }
  addGuest(guest: EligibleGuest): void {
    if (!this.isSelected(guest.id))
      this.selectedGuests.update((current) => [...current, { ...guest, active: true }]);
  }
  removeGuest(id: string): void {
    this.selectedGuests.update((current) => current.filter((guest) => guest.id !== id));
  }
  isSelected(id: string): boolean {
    return this.selectedGuests().some((guest) => guest.id === id);
  }

  save(): void {
    this.formError.set(null);
    if (this.invitationForm.invalid || this.selectedGuests().length === 0 || this.saving()) {
      this.invitationForm.markAllAsTouched();
      this.formError.set('Informe os dados e selecione ao menos um convidado.');
      return;
    }
    const id = this.editingId();
    const value = this.invitationForm.getRawValue();
    const request = { ...value, guestIds: this.selectedGuests().map((guest) => guest.id) };
    this.saving.set(true);
    (id ? this.service.update(id, request) : this.service.create(request))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            id ? 'Convite atualizado com sucesso.' : 'Convite criado como rascunho.',
          );
          this.closeForm();
          this.load();
        },
        error: (error) =>
          this.formError.set(
            error.status === 409
              ? 'Um dos convidados já pertence a outro convite. Atualize a busca e tente novamente.'
              : 'Não foi possível salvar o convite. Revise os dados e tente novamente.',
          ),
      });
  }

  activate(invitation: Invitation): void {
    if (
      !window.confirm(
        `Ativar o convite de ${invitation.name} e gerar um link individual? O link será exibido somente uma vez.`,
      )
    ) {
      return;
    }
    this.runLinkAction(invitation, false);
  }

  regenerateLink(invitation: Invitation): void {
    if (
      !window.confirm(
        `Regenerar o link de ${invitation.name}? O link anterior deixará de funcionar imediatamente.`,
      )
    ) {
      return;
    }
    this.runLinkAction(invitation, true);
  }

  inactivate(invitation: Invitation): void {
    if (
      !window.confirm(
        `Inativar o convite de ${invitation.name}? O link atual deixará de funcionar imediatamente.`,
      )
    ) {
      return;
    }
    this.actingOnId.set(invitation.id);
    this.service
      .inactivate(invitation.id)
      .pipe(finalize(() => this.actingOnId.set(null)))
      .subscribe({
        next: () => {
          this.dismissGeneratedLink();
          this.successMessage.set('Convite inativado e link revogado com sucesso.');
          this.load();
        },
        error: () => this.listError.set('Não foi possível inativar o convite.'),
      });
  }

  async copyGeneratedLink(): Promise<void> {
    const link = this.generatedLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.successMessage.set('Link copiado.');
    } catch {
      this.listError.set('Não foi possível copiar automaticamente. Selecione e copie o link.');
    }
  }

  dismissGeneratedLink(): void {
    this.generatedLink.set(null);
    this.generatedInvitationName.set('');
  }

  private runLinkAction(invitation: Invitation, regenerate: boolean): void {
    this.actingOnId.set(invitation.id);
    const action = regenerate
      ? this.service.regenerateLink(invitation.id)
      : this.service.activate(invitation.id);
    action.pipe(finalize(() => this.actingOnId.set(null))).subscribe({
      next: (result) => {
        this.generatedLink.set(result.link);
        this.generatedInvitationName.set(result.invitation.name);
        this.successMessage.set(
          regenerate
            ? 'Novo link gerado; o anterior foi invalidado.'
            : 'Convite ativado e link gerado.',
        );
        this.load();
      },
      error: () => this.listError.set('Não foi possível atualizar o link do convite.'),
    });
  }

  hasFilters(): boolean {
    const filters = this.filterForm.getRawValue();
    return filters.query.trim().length > 0 || filters.status !== 'ALL';
  }
  guestNames(invitation: Invitation): string {
    return invitation.guests.map((guest) => guest.name).join(', ');
  }
  statusLabel(status: Invitation['status']): string {
    return { DRAFT: 'Rascunho', ACTIVE: 'Ativo', INACTIVE: 'Inativo' }[status];
  }
  rangeLabel(): string {
    const start = this.page() * this.pageSize + 1;
    const end = Math.min(start + this.invitations().length - 1, this.totalElements());
    return `Exibindo ${start}–${end} de ${this.totalElements()}`;
  }
}

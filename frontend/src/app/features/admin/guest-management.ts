import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Guest, GuestManagementService } from './guest-management.service';

@Component({
  selector: 'app-guest-management',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <section aria-labelledby="guests-title">
      <a class="back-link" routerLink="/admin">← Voltar para administração</a>

      <header class="page-heading">
        <div>
          <p class="eyebrow">Administração</p>
          <h1 id="guests-title">Convidados</h1>
          <p class="lead">Cadastre as pessoas que poderão fazer parte dos convites.</p>
        </div>
        <button mat-flat-button type="button" (click)="startCreate()">Cadastrar convidado</button>
      </header>

      @if (formVisible()) {
        <section class="editor" aria-labelledby="editor-title">
          <h2 id="editor-title">{{ editingId() ? 'Editar convidado' : 'Cadastrar convidado' }}</h2>
          <form [formGroup]="guestForm" (ngSubmit)="save()" novalidate>
            <mat-form-field appearance="outline">
              <mat-label>Nome completo</mat-label>
              <input matInput formControlName="name" maxlength="160" />
              @if (guestForm.controls.name.touched && guestForm.controls.name.invalid) {
                <mat-error>Informe o nome completo.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Contato (opcional)</mat-label>
              <input matInput formControlName="contact" maxlength="254" />
              <mat-hint>E-mail, telefone ou outra referência útil para o convite.</mat-hint>
            </mat-form-field>
            <mat-checkbox formControlName="active">Convidado ativo</mat-checkbox>

            @if (formError()) {
              <p class="message message--error" role="alert">{{ formError() }}</p>
            }
            <div class="actions">
              <button mat-stroked-button type="button" (click)="closeForm()">Cancelar</button>
              <button mat-flat-button type="submit" [disabled]="saving()">
                {{ saving() ? 'Salvando…' : 'Salvar' }}
              </button>
            </div>
          </form>
        </section>
      }

      <form class="filters" [formGroup]="filterForm" (ngSubmit)="search()">
        <mat-form-field appearance="outline">
          <mat-label>Buscar por nome</mat-label>
          <input matInput formControlName="query" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <select matNativeControl formControlName="status">
            <option value="ALL">Todos</option>
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
        <p class="loading" role="status">Carregando convidados…</p>
      } @else if (guests().length === 0) {
        <div class="empty-state">
          <h2>Nenhum convidado encontrado</h2>
          <p>
            {{
              hasFilters()
                ? 'Revise os filtros da busca.'
                : 'Cadastre a primeira pessoa para começar.'
            }}
          </p>
          @if (!hasFilters()) {
            <button mat-flat-button type="button" (click)="startCreate()">
              Cadastrar convidado
            </button>
          }
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Contato</th>
                <th scope="col">Estado</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (guest of guests(); track guest.id) {
                <tr>
                  <td>{{ guest.name }}</td>
                  <td>{{ guest.contact || 'Não informado' }}</td>
                  <td>
                    <span class="status" [class.status--inactive]="!guest.active">{{
                      guest.active ? 'Ativo' : 'Inativo'
                    }}</span>
                  </td>
                  <td class="row-actions">
                    <button mat-button type="button" (click)="startEdit(guest)">Editar</button>
                    <button mat-button type="button" (click)="toggleStatus(guest)">
                      {{ guest.active ? 'Inativar' : 'Reativar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <nav class="pagination" aria-label="Paginação dos convidados">
          <span>{{ rangeLabel() }}</span>
          <div>
            <button
              mat-stroked-button
              type="button"
              (click)="goToPage(page() - 1)"
              [disabled]="page() === 0 || loading()"
            >
              Anterior
            </button>
            <button
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
    .row-actions,
    .pagination,
    .pagination div {
      display: flex;
      gap: 0.75rem;
    }
    .actions {
      justify-content: flex-end;
    }
    .message {
      padding: 0.8rem 1rem;
      border-radius: 0.65rem;
    }
    .message p {
      margin-block-start: 0;
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
      background: #e8f5ec;
      color: #286540;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .status--inactive {
      background: var(--color-surface-subtle);
      color: var(--color-muted);
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
      .filters {
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
export class GuestManagement {
  private readonly service = inject(GuestManagementService);

  readonly guests = signal<Guest[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formVisible = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = 20;

  readonly filterForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    status: new FormControl('ALL', { nonNullable: true }),
  });
  readonly guestForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    contact: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(254)] }),
    active: new FormControl(true, { nonNullable: true }),
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
          this.guests.set(result.items);
          this.page.set(result.page);
          this.totalPages.set(result.totalPages);
          this.totalElements.set(result.totalElements);
        },
        error: () => this.listError.set('Não foi possível carregar os convidados.'),
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
    this.guestForm.reset({ name: '', contact: '', active: true });
    this.formError.set(null);
    this.formVisible.set(true);
  }

  startEdit(guest: Guest): void {
    this.editingId.set(guest.id);
    this.guestForm.reset({ name: guest.name, contact: guest.contact ?? '', active: guest.active });
    this.formError.set(null);
    this.formVisible.set(true);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  save(): void {
    if (this.guestForm.invalid || this.saving()) {
      this.guestForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const id = this.editingId();
    const operation = id
      ? this.service.update(id, this.guestForm.getRawValue())
      : this.service.create(this.guestForm.getRawValue());
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.successMessage.set(
          id ? 'Convidado atualizado com sucesso.' : 'Convidado cadastrado com sucesso.',
        );
        this.closeForm();
        this.load();
      },
      error: () =>
        this.formError.set(
          'Não foi possível salvar o convidado. Revise os dados e tente novamente.',
        ),
    });
  }

  toggleStatus(guest: Guest): void {
    const action = guest.active ? 'inativar' : 'reativar';
    if (!window.confirm(`Deseja ${action} este convidado? O histórico será preservado.`)) {
      return;
    }
    this.service.changeStatus(guest.id, !guest.active).subscribe({
      next: () => {
        this.successMessage.set(guest.active ? 'Convidado inativado.' : 'Convidado reativado.');
        this.load();
      },
      error: () => this.listError.set(`Não foi possível ${action} o convidado.`),
    });
  }

  hasFilters(): boolean {
    const filters = this.filterForm.getRawValue();
    return filters.query.trim().length > 0 || filters.status !== 'ALL';
  }

  rangeLabel(): string {
    const start = this.page() * this.pageSize + 1;
    const end = Math.min(start + this.guests().length - 1, this.totalElements());
    return `Exibindo ${start}–${end} de ${this.totalElements()}`;
  }
}

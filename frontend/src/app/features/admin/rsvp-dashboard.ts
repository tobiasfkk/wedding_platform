import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { RsvpStatus } from '../rsvp/rsvp-access.service';
import { RsvpDashboardResponse, RsvpDashboardService } from './rsvp-dashboard.service';

type StatusFilter = RsvpStatus | 'ALL';

@Component({
  selector: 'app-rsvp-dashboard',
  imports: [DatePipe, MatButtonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section aria-labelledby="dashboard-title">
      <a class="back-link" routerLink="/admin">← Voltar para administração</a>
      <p class="eyebrow">Administração</p>
      <h1 id="dashboard-title">Respostas de RSVP</h1>
      <p class="lead">
        Acompanhe a situação atual dos convidados e faça correções quando necessário.
      </p>

      @if (result(); as dashboard) {
        <div class="totals" aria-label="Totais de RSVP">
          <article>
            <strong>{{ dashboard.totals.confirmed }}</strong
            ><span>Confirmados</span>
          </article>
          <article>
            <strong>{{ dashboard.totals.declined }}</strong
            ><span>Não participarão</span>
          </article>
          <article>
            <strong>{{ dashboard.totals.pending }}</strong
            ><span>Pendentes</span>
          </article>
        </div>
      }

      <form class="filters" [formGroup]="filters" (ngSubmit)="search()">
        <label>
          Buscar por nome ou grupo
          <input formControlName="query" type="search" placeholder="Ex.: Família Silva" />
        </label>
        <label>
          Situação
          <select formControlName="status">
            <option value="ALL">Todas</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="DECLINED">Não participarão</option>
            <option value="PENDING">Pendentes</option>
          </select>
        </label>
        <button mat-flat-button type="submit" [disabled]="loading()">Filtrar</button>
      </form>

      @if (loading()) {
        <p role="status">Carregando respostas…</p>
      } @else if (error()) {
        <div class="message message--error" role="alert">
          <p>{{ error() }}</p>
          <button mat-stroked-button type="button" (click)="load()">Tentar novamente</button>
        </div>
      } @else if (result(); as dashboard) {
        @if (dashboard.items.length === 0) {
          <p class="empty">Nenhum convite corresponde aos filtros informados.</p>
        } @else {
          <div class="invitation-list">
            @for (item of dashboard.items; track item.invitationId) {
              <article class="invitation">
                <header>
                  <div>
                    <h2>{{ item.groupName }}</h2>
                    <p class="summary">
                      {{ item.confirmed }} confirmados · {{ item.declined }} recusas ·
                      {{ item.pending }} pendentes
                    </p>
                  </div>
                  <a
                    mat-stroked-button
                    [routerLink]="['/admin/invitations', item.invitationId, 'rsvp']"
                  >
                    Corrigir resposta
                  </a>
                </header>

                <div class="people">
                  <div>
                    <h3>Participantes</h3>
                    <ul>
                      @for (participant of item.participants; track participant.id) {
                        <li>
                          <span>{{ participant.name }}</span>
                          <span class="status" [attr.data-status]="participant.status">
                            {{ statusLabel(participant.status) }}
                          </span>
                        </li>
                      }
                    </ul>
                  </div>
                  @if (item.companions.length > 0) {
                    <div>
                      <h3>Acompanhantes confirmados</h3>
                      <ul>
                        @for (companion of item.companions; track companion.id) {
                          <li>{{ companion.name }}</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
                @if (item.updatedAt) {
                  <p class="updated">Última resposta: {{ item.updatedAt | date: 'short' }}</p>
                }
              </article>
            }
          </div>

          <nav class="pagination" aria-label="Paginação das respostas">
            <button
              mat-stroked-button
              type="button"
              [disabled]="dashboard.page === 0"
              (click)="goTo(dashboard.page - 1)"
            >
              Anterior
            </button>
            <span>Página {{ dashboard.page + 1 }} de {{ dashboard.totalPages }}</span>
            <button
              mat-stroked-button
              type="button"
              [disabled]="dashboard.page + 1 >= dashboard.totalPages"
              (click)="goTo(dashboard.page + 1)"
            >
              Próxima
            </button>
          </nav>
        }
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
    .totals {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-block: 2rem;
    }
    .totals article {
      display: grid;
      gap: 0.2rem;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }
    .totals strong {
      font:
        500 clamp(2rem, 5vw, 3rem) Georgia,
        serif;
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(12rem, 1fr) minmax(10rem, 0.45fr) auto;
      align-items: end;
      gap: 1rem;
      margin-block-end: 1.5rem;
    }
    .filters label {
      display: grid;
      gap: 0.4rem;
      font-weight: 700;
    }
    input,
    select {
      width: 100%;
      min-height: 3rem;
      padding-inline: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
    }
    .invitation-list {
      display: grid;
      gap: 1rem;
    }
    .invitation {
      padding: clamp(1rem, 3vw, 1.5rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }
    .invitation header,
    .pagination {
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
    .summary,
    .updated {
      color: var(--color-text-muted);
    }
    .people {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;
      margin-block: 1.25rem;
    }
    ul {
      display: grid;
      gap: 0.5rem;
      margin: 0.75rem 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .status {
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: var(--color-surface-subtle);
      font-size: 0.85rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .status[data-status='CONFIRMED'] {
      background: #e8f5ec;
      color: #286540;
    }
    .status[data-status='DECLINED'] {
      background: #fff0f1;
      color: #8b2032;
    }
    .pagination {
      margin-block-start: 1.5rem;
    }
    .empty,
    .message {
      padding: 1rem;
      border-radius: 0.65rem;
      background: var(--color-surface-subtle);
    }
    .message--error {
      background: #fff0f1;
      color: #8b2032;
    }
    @media (max-width: 42rem) {
      .totals,
      .filters,
      .people {
        grid-template-columns: 1fr;
      }
      .invitation header,
      .pagination {
        align-items: stretch;
        flex-direction: column;
      }
      .invitation header a,
      .filters button,
      .pagination button {
        width: 100%;
        min-height: 3rem;
      }
      .pagination span {
        text-align: center;
      }
      li {
        align-items: flex-start;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsvpDashboard {
  private readonly service = inject(RsvpDashboardService);
  readonly filters = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    status: new FormControl<StatusFilter>('ALL', { nonNullable: true }),
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly result = signal<RsvpDashboardResponse | null>(null);

  constructor() {
    this.load();
  }

  search(): void {
    this.load(0);
  }

  goTo(page: number): void {
    this.load(page);
  }

  load(page = this.result()?.page ?? 0): void {
    this.loading.set(true);
    this.error.set(null);
    this.service
      .find(this.filters.controls.query.value, this.filters.controls.status.value, page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.result.set(response),
        error: () => this.error.set('Não foi possível carregar as respostas de RSVP.'),
      });
  }

  statusLabel(status: RsvpStatus): string {
    return { CONFIRMED: 'Confirmado', DECLINED: 'Não participará', PENDING: 'Pendente' }[status];
  }
}

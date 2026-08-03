import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';

import {
  WeddingSettings,
  WeddingSettingsService,
  WeddingSettingsUpdate,
} from './wedding-settings.service';

interface ApiProblem {
  errors?: { field: string; message: string }[];
}

export function deadlineNotAfterEvent(control: AbstractControl): ValidationErrors | null {
  const value = control.value as Partial<WeddingSettingsUpdate>;
  if (!value.eventDate || !value.eventTime || !value.rsvpDeadlineDate || !value.rsvpDeadlineTime) {
    return null;
  }
  return `${value.rsvpDeadlineDate}T${value.rsvpDeadlineTime}` >
    `${value.eventDate}T${value.eventTime}`
    ? { deadlineAfterEvent: true }
    : null;
}

@Component({
  selector: 'app-wedding-settings',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="settings" aria-labelledby="settings-title">
      <div class="settings__heading">
        <div>
          <p class="eyebrow">Dados do evento</p>
          <h2 id="settings-title">Configuração do casamento</h2>
        </div>
        <span class="settings__status">{{
          configured() ? 'Configurado' : 'Rascunho inicial'
        }}</span>
      </div>

      @if (loading()) {
        <p role="status">Carregando configurações…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (errorMessage()) {
            <p class="message message--error" role="alert">{{ errorMessage() }}</p>
          }
          @if (successMessage()) {
            <p class="message message--success" role="status">{{ successMessage() }}</p>
          }

          <mat-form-field appearance="outline">
            <mat-label>Nome de exibição</mat-label>
            <input matInput formControlName="displayName" maxlength="160" />
            @if (showError('displayName')) {
              <mat-error>{{ fieldError('displayName', 'Informe o nome de exibição.') }}</mat-error>
            }
          </mat-form-field>

          <div class="settings__row">
            <mat-form-field appearance="outline">
              <mat-label>Data do casamento</mat-label>
              <input matInput type="date" formControlName="eventDate" />
              @if (showError('eventDate')) {
                <mat-error>{{ fieldError('eventDate', 'Informe a data do casamento.') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Horário</mat-label>
              <input matInput type="time" formControlName="eventTime" />
              @if (showError('eventTime')) {
                <mat-error>{{
                  fieldError('eventTime', 'Informe o horário do casamento.')
                }}</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Local</mat-label>
            <input matInput formControlName="location" maxlength="300" />
            @if (showError('location')) {
              <mat-error>{{ fieldError('location', 'Informe o local do casamento.') }}</mat-error>
            }
          </mat-form-field>

          <div class="settings__row">
            <mat-form-field appearance="outline">
              <mat-label>Data-limite do RSVP</mat-label>
              <input matInput type="date" formControlName="rsvpDeadlineDate" />
              @if (showError('rsvpDeadlineDate')) {
                <mat-error>{{
                  fieldError('rsvpDeadlineDate', 'Informe a data-limite.')
                }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Horário-limite</mat-label>
              <input matInput type="time" formControlName="rsvpDeadlineTime" />
              @if (showError('rsvpDeadlineTime')) {
                <mat-error>{{
                  fieldError('rsvpDeadlineTime', 'Informe o horário-limite.')
                }}</mat-error>
              }
            </mat-form-field>
          </div>

          @if (form.hasError('deadlineAfterEvent')) {
            <p class="message message--error" role="alert">
              A data-limite do RSVP não pode ser posterior ao casamento.
            </p>
          }
          <p class="settings__timezone">Horários em {{ timeZone() }}</p>

          <div class="settings__actions">
            <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving()">
              Cancelar
            </button>
            <button mat-flat-button type="submit" [disabled]="saving()">
              {{ saving() ? 'Salvando…' : 'Salvar alterações' }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .settings {
      margin-block-start: 2.5rem;
      padding: clamp(1.25rem, 4vw, 2rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: color-mix(in srgb, var(--color-surface) 96%, white);
      box-shadow: 0 1.25rem 3rem rgb(63 39 43 / 7%);
    }
    .settings__heading,
    .settings__actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    h2 {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(1.8rem, 4vw, 2.65rem);
      font-weight: 500;
    }
    .settings__status {
      padding: 0.45rem 0.75rem;
      border-radius: 999px;
      background: var(--color-accent-soft);
      color: var(--color-accent-strong);
      font-size: 0.85rem;
      font-weight: 700;
    }
    form {
      display: grid;
      gap: 0.5rem;
      margin-block-start: 2rem;
    }
    .settings__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .settings__timezone {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.9rem;
    }
    .settings__actions {
      justify-content: flex-end;
      margin-block-start: 1rem;
    }
    .message {
      margin: 0 0 0.75rem;
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
    @media (max-width: 42rem) {
      .settings__heading {
        align-items: flex-start;
        flex-direction: column;
      }
      .settings__row {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeddingSettingsComponent {
  private readonly settings = inject(WeddingSettingsService);
  private lastSaved: WeddingSettings | null = null;
  private readonly serverErrors = new Map<string, string>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly configured = signal(false);
  readonly timeZone = signal('America/Sao_Paulo');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly form = new FormGroup(
    {
      displayName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(160)],
      }),
      eventDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      eventTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      location: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(300)],
      }),
      rsvpDeadlineDate: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      rsvpDeadlineTime: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [deadlineNotAfterEvent] },
  );

  constructor() {
    this.settings
      .load()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (settings) => this.apply(settings),
        error: () => this.errorMessage.set('Não foi possível carregar as configurações.'),
      });
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmDiscard(event: BeforeUnloadEvent): void {
    if (this.form.dirty) {
      event.preventDefault();
    }
  }

  submit(): void {
    this.clearMessages();
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revise os campos indicados antes de salvar.');
      return;
    }
    this.saving.set(true);
    this.settings
      .save({ ...this.form.getRawValue(), timeZone: this.timeZone() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (settings) => {
          this.apply(settings);
          this.successMessage.set('Configurações salvas com sucesso.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  cancel(): void {
    if (this.lastSaved) {
      this.apply(this.lastSaved);
    } else {
      this.form.reset();
      this.form.markAsPristine();
    }
    this.clearMessages();
  }

  showError(field: Exclude<keyof WeddingSettingsUpdate, 'timeZone'>): boolean {
    const control = this.form.get(field);
    return this.serverErrors.has(field) || Boolean(control?.touched && control.invalid);
  }

  fieldError(field: string, fallback: string): string {
    return this.serverErrors.get(field) ?? fallback;
  }

  private apply(settings: WeddingSettings): void {
    this.lastSaved = settings;
    this.configured.set(settings.configured);
    this.timeZone.set(settings.timeZone);
    this.form.reset({
      displayName: settings.displayName,
      eventDate: settings.eventDate ?? '',
      eventTime: settings.eventTime?.slice(0, 5) ?? '',
      location: settings.location,
      rsvpDeadlineDate: settings.rsvpDeadlineDate ?? '',
      rsvpDeadlineTime: settings.rsvpDeadlineTime?.slice(0, 5) ?? '',
    });
    this.form.markAsPristine();
  }

  private handleError(error: HttpErrorResponse): void {
    const problem = error.error as ApiProblem | null;
    for (const item of problem?.errors ?? []) {
      this.serverErrors.set(item.field, item.message);
      this.form.get(item.field)?.markAsTouched();
    }
    this.errorMessage.set(
      problem?.errors?.length
        ? 'Revise os campos indicados antes de salvar.'
        : 'Não foi possível salvar as configurações. Tente novamente.',
    );
  }

  private clearMessages(): void {
    this.serverErrors.clear();
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}

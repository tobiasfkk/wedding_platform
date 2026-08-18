import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PixService } from '../../core/pix.service';

@Component({
  selector: 'app-pix-settings',
  imports: [MatButtonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="pix-settings" aria-labelledby="pix-settings-title">
      <a class="back-link" routerLink="/admin">← Voltar para administração</a>
      <p class="eyebrow">Presentes</p>
      <h1 id="pix-settings-title">Configuração do Pix</h1>
      <p class="lead">
        Cole o código Pix Copia e Cola fornecido pelo seu banco. O QR Code será gerado
        automaticamente no site dos convidados.
      </p>

      @if (loading()) {
        <p role="status">Carregando configuração…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>
            Nome do recebedor
            <input formControlName="recipientName" maxlength="160" autocomplete="name" />
          </label>
          <label>
            Chave Pix <span>(opcional)</span>
            <input formControlName="key" maxlength="140" autocomplete="off" />
          </label>
          <label>
            Pix Copia e Cola
            <textarea formControlName="payload" maxlength="2048" rows="7"></textarea>
          </label>
          <p class="hint">
            Não informe senha, token bancário ou dados de acesso. Use apenas o código de cobrança
            disponibilizado pelo banco.
          </p>
          <button mat-flat-button type="submit" [disabled]="saving() || form.invalid">
            {{ saving() ? 'Salvando…' : 'Salvar Pix' }}
          </button>
        </form>
        @if (error()) {
          <p class="message message--error" role="alert">{{ error() }}</p>
        } @else if (saved()) {
          <p class="message message--success" role="status">Pix atualizado e disponível no site.</p>
        }
      }
    </section>
  `,
  styles: `
    .pix-settings {
      max-width: 46rem;
    }
    .back-link {
      display: inline-block;
      margin-block-end: 2rem;
    }
    form {
      display: grid;
      gap: 1.25rem;
      margin-block-start: 2rem;
    }
    label {
      display: grid;
      gap: 0.45rem;
      font-weight: 700;
    }
    label span,
    .hint {
      color: var(--color-muted);
      font-size: 0.85rem;
      font-weight: 400;
    }
    input,
    textarea {
      width: 100%;
      padding: 0.8rem;
      border: 1px solid var(--color-border);
      border-radius: 0.65rem;
      background: var(--color-surface);
      color: var(--color-ink);
      font: inherit;
    }
    textarea {
      min-height: 10rem;
      resize: vertical;
      overflow-wrap: anywhere;
    }
    input:focus-visible,
    textarea:focus-visible {
      outline: 0.2rem solid var(--color-accent-soft);
      border-color: var(--color-accent-strong);
    }
    button {
      justify-self: start;
      min-height: 2.75rem;
    }
    .message {
      margin-block-start: 1rem;
    }
    .message--error {
      color: #8c1d18;
    }
    .message--success {
      color: #1b5e20;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixSettings {
  private readonly service = inject(PixService);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = new FormGroup({
    recipientName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    key: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(140)] }),
    payload: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2048)],
    }),
  });

  constructor() {
    this.service
      .findAdmin()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (configuration) =>
          this.form.setValue({
            recipientName: configuration.recipientName ?? '',
            key: configuration.key ?? '',
            payload: configuration.payload ?? '',
          }),
        error: () => this.error.set('Não foi possível carregar a configuração do Pix.'),
      });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.service
      .save(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (configuration) => {
          this.form.setValue({
            recipientName: configuration.recipientName ?? '',
            key: configuration.key ?? '',
            payload: configuration.payload ?? '',
          });
          this.saved.set(true);
        },
        error: (response: { error?: { detail?: string } }) =>
          this.error.set(response.error?.detail ?? 'Não foi possível salvar o Pix informado.'),
      });
  }
}

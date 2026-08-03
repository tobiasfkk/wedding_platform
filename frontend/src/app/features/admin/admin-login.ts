import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="login" aria-labelledby="login-title">
      <div>
        <p class="eyebrow">Área restrita</p>
        <h1 id="login-title">Acessar administração</h1>
        <p class="lead">Entre com a conta responsável pela organização do casamento.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" autocomplete="username" formControlName="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <mat-error>Informe um e-mail válido.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Senha</mat-label>
          <input
            matInput
            type="password"
            autocomplete="current-password"
            formControlName="password"
          />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <mat-error>Informe sua senha.</mat-error>
          }
        </mat-form-field>

        @if (errorMessage()) {
          <p class="login__error" role="alert">{{ errorMessage() }}</p>
        }

        <button mat-flat-button type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .login {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
      gap: clamp(2rem, 8vw, 7rem);
      align-items: start;
    }

    h1 {
      font-size: clamp(2.5rem, 7vw, 4.75rem);
    }

    form {
      display: grid;
      gap: 0.75rem;
      padding: clamp(1.25rem, 4vw, 2rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: color-mix(in srgb, var(--color-surface) 94%, white);
      box-shadow: 0 1.25rem 3rem rgb(63 39 43 / 8%);
    }

    .login__error {
      margin: 0 0 0.5rem;
      color: #9b2335;
      line-height: 1.5;
    }

    button {
      min-height: 3rem;
    }

    @media (max-width: 48rem) {
      .login {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.auth
      .login(this.form.controls.email.value, this.form.controls.password.value)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const destination = requestedUrl?.startsWith('/admin') ? requestedUrl : '/admin';
          void this.router.navigateByUrl(destination);
        },
        error: () => {
          this.form.controls.password.reset();
          this.errorMessage.set(
            'Não foi possível entrar. Verifique as credenciais e tente novamente.',
          );
        },
      });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-home',
  imports: [MatButtonModule],
  template: `
    <section class="page-intro" aria-labelledby="admin-title">
      <p class="eyebrow">Área restrita</p>
      <h1 id="admin-title">Administração</h1>
      <p class="lead">
        Sessão ativa para <strong>{{ auth.session()?.email }}</strong
        >. A gestão do casamento será construída nas próximas entregas.
      </p>
      <button mat-stroked-button type="button" (click)="logout()" [disabled]="loggingOut()">
        {{ loggingOut() ? 'Saindo…' : 'Encerrar sessão' }}
      </button>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHome {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loggingOut = signal(false);

  logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.auth
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/admin/login'),
        error: () => void this.router.navigateByUrl('/admin/login'),
      });
  }
}

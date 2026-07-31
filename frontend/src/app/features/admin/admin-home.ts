import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-home',
  template: `
    <section class="page-intro" aria-labelledby="admin-title">
      <p class="eyebrow">Área restrita</p>
      <h1 id="admin-title">Administração</h1>
      <p class="lead">
        Esta rota receberá autenticação, gestão de convidados e convites e o dashboard do evento.
      </p>
      <p class="placeholder-note">Funcionalidade iniciada pela Issue #11.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHome {}

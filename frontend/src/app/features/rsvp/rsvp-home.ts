import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-rsvp-home',
  template: `
    <section class="page-intro" aria-labelledby="rsvp-title">
      <p class="eyebrow">Confirmação de presença</p>
      <h1 id="rsvp-title">Área de RSVP</h1>
      <p class="lead">
        Esta rota receberá a identificação do convite e o fluxo móvel de confirmação de presença.
      </p>
      <p class="placeholder-note">Funcionalidade planejada para as Issues #16 a #20.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsvpHome {}

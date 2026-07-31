import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-home',
  imports: [RouterLink],
  template: `
    <section class="page-intro" aria-labelledby="public-title">
      <p class="eyebrow">Site público</p>
      <h1 id="public-title">Frontend operacional</h1>
      <p class="lead">
        A fundação Angular está pronta para receber as informações do casamento e os próximos fluxos
        do produto.
      </p>

      <div class="status-card" role="status">
        <span class="status-dot" aria-hidden="true"></span>
        Aplicação iniciada com sucesso
      </div>

      <a class="primary-action" routerLink="/rsvp">Acessar área de RSVP</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {}

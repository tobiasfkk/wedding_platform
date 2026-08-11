import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-home',
  imports: [RouterLink],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHome {}

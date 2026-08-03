import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CsrfTokenStore {
  private token: string | null = null;

  get(): string | null {
    return this.token;
  }

  set(token: string | null): void {
    if (token) {
      this.token = token;
    }
  }

  clear(): void {
    this.token = null;
  }
}

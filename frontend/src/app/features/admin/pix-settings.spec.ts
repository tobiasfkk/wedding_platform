import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { apiSecurityInterceptor } from '../../core/auth/api-security.interceptor';
import { PixSettings } from './pix-settings';

describe('PixSettings', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PixSettings],
      providers: [
        provideHttpClient(withInterceptors([apiSecurityInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and saves the Pix configuration', () => {
    const fixture = TestBed.createComponent(PixSettings);
    fixture.detectChanges();
    http.expectOne('/api/admin/pix').flush({
      configured: false,
      key: null,
      payload: null,
      recipientName: null,
    });
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      recipientName: 'Maria e Tobias',
      key: 'pix@example.com',
      payload: '000201br.gov.bcb.pix6304ABCD',
    });
    fixture.componentInstance.save();
    const save = http.expectOne('/api/admin/pix');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.recipientName).toBe('Maria e Tobias');
    save.flush({
      configured: true,
      key: 'pix@example.com',
      payload: '000201br.gov.bcb.pix6304ABCD',
      recipientName: 'Maria e Tobias',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pix atualizado');
  });
});

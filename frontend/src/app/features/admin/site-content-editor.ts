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
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  PublicPhotoPlacement,
  PublicLocationMode,
  PublicSiteSection,
  PublicWeddingContent,
} from '../public-site/public-site-content';
import {
  SiteMomentType,
  toPublicWeddingContent,
  WeddingSiteContentDto,
} from '../public-site/public-site.service';
import { PublicSiteView } from '../public-site/public-site-view';
import { SiteContentService, SiteMediaUpload, WeddingSiteAdminState } from './site-content.service';

interface ApiProblem {
  detail?: string;
  errors?: Array<{ field: string; message: string }>;
}

interface SitePhotoEditor extends SiteMediaUpload {
  placement: PublicPhotoPlacement;
  alt: string;
  focalX: number;
  focalY: number;
}

type EditorFormValue = ReturnType<SiteContentEditor['form']['getRawValue']>;

const requiredText = (maximum: number) => [Validators.required, Validators.maxLength(maximum)];
const googleMapsHosts = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.com.br',
  'www.google.com.br',
  'maps.google.com.br',
  'maps.app.goo.gl',
  'goo.gl',
]);

export function googleMapsUrlValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && googleMapsHosts.has(url.hostname.toLowerCase())
      ? null
      : { googleMapsUrl: true };
  } catch {
    return { googleMapsUrl: true };
  }
}

@Component({
  selector: 'app-site-content-editor',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    PublicSiteView,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './site-content-editor.html',
  styleUrl: './site-content-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteContentEditor {
  private readonly service = inject(SiteContentService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly publishing = signal(false);
  readonly uploading = signal(false);
  readonly published = signal(false);
  readonly publishedAt = signal<string | null>(null);
  readonly hasUnpublishedChanges = signal(true);
  readonly draftVersion = signal(0);
  readonly sectionOrder = signal<PublicSiteSection[]>([]);
  readonly photos = signal<SitePhotoEditor[]>([]);
  readonly preview = signal<PublicWeddingContent | null>(null);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly photoPlacements: readonly PublicPhotoPlacement[] = [
    'HERO',
    'STORY',
    'SCHEDULE',
    'NOTICES',
    'RSVP',
  ];

  readonly form = new FormGroup({
    heroEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    heroTitle: new FormControl('', { nonNullable: true, validators: requiredText(120) }),
    heroIntroduction: new FormControl('', { nonNullable: true, validators: requiredText(400) }),
    heroDateLabel: new FormControl('', { nonNullable: true, validators: requiredText(120) }),
    storyEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    storyTitle: new FormControl('', { nonNullable: true, validators: requiredText(120) }),
    storyParagraphs: new FormControl('', { nonNullable: true, validators: requiredText(3000) }),
    locationMode: new FormControl<PublicLocationMode>('SHARED', { nonNullable: true }),
    ceremonyVisible: new FormControl(true, { nonNullable: true }),
    ceremonyEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    ceremonyTitle: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    ceremonyTime: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    ceremonyVenue: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(160)],
    }),
    ceremonyAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    ceremonyMapUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2048), googleMapsUrlValidator],
    }),
    receptionVisible: new FormControl(true, { nonNullable: true }),
    receptionEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    receptionTitle: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    receptionTime: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    receptionVenue: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(160)],
    }),
    receptionAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    receptionMapUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2048), googleMapsUrlValidator],
    }),
    notices: new FormControl('', { nonNullable: true, validators: requiredText(2400) }),
    rsvpEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    rsvpTitle: new FormControl('', { nonNullable: true, validators: requiredText(140) }),
    rsvpDescription: new FormControl('', { nonNullable: true, validators: requiredText(400) }),
  });

  constructor() {
    this.load();
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmDiscard(event: BeforeUnloadEvent): void {
    if (this.form.dirty) {
      event.preventDefault();
    }
  }

  load(): void {
    this.clearMessages();
    this.loading.set(true);
    this.service
      .load()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (state) => this.apply(state),
        error: () =>
          this.errorMessage.set(
            'Não foi possível carregar o conteúdo. Configure primeiro os dados do casamento.',
          ),
      });
  }

  save(): void {
    this.clearMessages();
    const content = this.buildContent();
    if (!content || this.saving()) return;
    this.saving.set(true);
    this.service
      .saveDraft(this.draftVersion(), content)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (state) => {
          this.applyState(state);
          this.form.markAsPristine();
          this.message.set('Rascunho salvo. A versão pública não foi alterada.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  showPreview(): void {
    this.clearMessages();
    const content = this.buildContent();
    if (content) {
      this.preview.set(toPublicWeddingContent(content, '/api/admin/site/media'));
    }
  }

  closePreview(): void {
    this.preview.set(null);
  }

  publish(): void {
    this.clearMessages();
    if (this.form.dirty || this.draftVersion() === 0) {
      this.errorMessage.set('Salve o rascunho antes de publicar.');
      return;
    }
    if (!window.confirm('Publicar este rascunho para todos os visitantes?')) return;
    this.publishing.set(true);
    this.service
      .publish()
      .pipe(finalize(() => this.publishing.set(false)))
      .subscribe({
        next: (state) => {
          this.applyState(state);
          this.message.set('Site publicado com sucesso.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  unpublish(): void {
    this.clearMessages();
    if (!window.confirm('Despublicar o site? Os convidados deixarão de visualizar o conteúdo.')) {
      return;
    }
    this.publishing.set(true);
    this.service
      .unpublish()
      .pipe(finalize(() => this.publishing.set(false)))
      .subscribe({
        next: (state) => {
          this.applyState(state);
          this.message.set('Site despublicado. O rascunho foi preservado.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploading()) return;
    if (this.photos().length >= 10) {
      this.errorMessage.set('A narrativa pode ter no máximo 10 fotos.');
      input.value = '';
      return;
    }
    this.clearMessages();
    this.uploading.set(true);
    this.service
      .upload(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (image) => {
          this.photos.update((photos) => [
            ...photos,
            { ...image, placement: 'STORY', alt: '', focalX: 50, focalY: 50 },
          ]);
          this.form.markAsDirty();
          this.message.set('Foto enviada. Escolha onde ela aparece, descreva e salve o rascunho.');
          input.value = '';
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
          input.value = '';
        },
      });
  }

  removePhoto(id: string): void {
    this.photos.update((photos) => photos.filter((photo) => photo.id !== id));
    this.form.markAsDirty();
  }

  updatePhoto(
    id: string,
    field: 'placement' | 'alt' | 'focalX' | 'focalY',
    value: string | number,
  ): void {
    this.photos.update((photos) =>
      photos.map((photo) => {
        if (
          field === 'placement' &&
          value === 'HERO' &&
          photo.id !== id &&
          photo.placement === 'HERO'
        ) {
          return { ...photo, placement: 'STORY' };
        }
        return photo.id === id ? { ...photo, [field]: value } : photo;
      }),
    );
    this.form.markAsDirty();
  }

  movePhoto(index: number, direction: -1 | 1): void {
    const target = index + direction;
    const photos = [...this.photos()];
    if (target < 0 || target >= photos.length) return;
    [photos[index], photos[target]] = [photos[target], photos[index]];
    this.photos.set(photos);
    this.form.markAsDirty();
  }

  photoPlacementLabel(placement: PublicPhotoPlacement): string {
    return {
      HERO: 'Fundo da abertura',
      STORY: 'Após nossa história',
      SCHEDULE: 'Após cerimônia e recepção',
      NOTICES: 'Após informações importantes',
      RSVP: 'Após confirmação de presença',
    }[placement];
  }

  setLocationMode(mode: PublicLocationMode): void {
    const controls = this.form.controls;
    if (controls.locationMode.value === mode) return;
    if (
      mode === 'SHARED' &&
      this.locationsDiffer() &&
      !window.confirm(
        'Usar um local único substituirá os dados diferentes de cerimônia e recepção ao salvar. Continuar?',
      )
    ) {
      return;
    }
    if (mode === 'SHARED') {
      const source = controls.ceremonyVisible.value ? 'ceremony' : 'reception';
      const venue = controls[`${source}Venue`].value;
      const address = controls[`${source}Address`].value;
      const mapUrl = controls[`${source}MapUrl`].value;
      controls.ceremonyVenue.setValue(venue);
      controls.ceremonyAddress.setValue(address);
      controls.ceremonyMapUrl.setValue(mapUrl);
      controls.receptionVenue.setValue(venue);
      controls.receptionAddress.setValue(address);
      controls.receptionMapUrl.setValue(mapUrl);
    }
    controls.locationMode.setValue(mode);
    this.form.markAsDirty();
  }

  moveSection(index: number, direction: -1 | 1): void {
    const target = index + direction;
    const order = [...this.sectionOrder()];
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this.sectionOrder.set(order);
    this.form.markAsDirty();
  }

  sectionLabel(section: PublicSiteSection): string {
    return {
      STORY: 'Nossa história',
      SCHEDULE: 'Cerimônia e recepção',
      NOTICES: 'Informações importantes',
      RSVP: 'Confirmação de presença',
    }[section];
  }

  private buildContent(): WeddingSiteContentDto | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revise os campos obrigatórios antes de continuar.');
      return null;
    }
    const value = this.form.getRawValue();
    const paragraphs = this.lines(value.storyParagraphs, 5);
    const notices = this.lines(value.notices, 8);
    if (!paragraphs.length || !notices.length) {
      this.errorMessage.set('Informe ao menos um parágrafo da história e um aviso.');
      return null;
    }
    if (!value.ceremonyVisible && !value.receptionVisible) {
      this.errorMessage.set('Mantenha a cerimônia ou a recepção visível.');
      return null;
    }
    if (!this.hasRequiredLocations(value)) {
      this.errorMessage.set('Informe o local e o endereço de cada momento visível.');
      return null;
    }
    const photos = this.photos();
    if (photos.some((photo) => !photo.alt.trim())) {
      this.errorMessage.set('Descreva todas as fotos para pessoas que não podem vê-las.');
      return null;
    }
    return {
      hero: {
        eyebrow: value.heroEyebrow.trim(),
        title: value.heroTitle.trim(),
        introduction: value.heroIntroduction.trim(),
        dateLabel: value.heroDateLabel.trim(),
      },
      story: {
        eyebrow: value.storyEyebrow.trim(),
        title: value.storyTitle.trim(),
        paragraphs,
        imageId: null,
        imageAlt: null,
        imageWidth: null,
        imageHeight: null,
      },
      schedule: [
        this.moment('CEREMONY', value, 'ceremony'),
        this.moment('RECEPTION', value, 'reception'),
      ],
      locationMode: value.locationMode,
      notices,
      rsvp: {
        eyebrow: value.rsvpEyebrow.trim(),
        title: value.rsvpTitle.trim(),
        description: value.rsvpDescription.trim(),
      },
      sectionOrder: [...this.sectionOrder()],
      photos: photos.map((photo) => ({
        id: photo.id,
        placement: photo.placement,
        alt: photo.alt.trim(),
        width: photo.width,
        height: photo.height,
        focalX: photo.focalX,
        focalY: photo.focalY,
      })),
    };
  }

  private moment(
    type: SiteMomentType,
    value: EditorFormValue,
    prefix: 'ceremony' | 'reception',
  ): WeddingSiteContentDto['schedule'][number] {
    const field = (suffix: 'Eyebrow' | 'Title' | 'Time' | 'Venue' | 'Address' | 'MapUrl') =>
      value[`${prefix}${suffix}`].trim();
    const shared = value.locationMode === 'SHARED';
    return {
      type,
      eyebrow: field('Eyebrow'),
      title: field('Title'),
      time: field('Time'),
      venue: shared ? value.ceremonyVenue.trim() : field('Venue'),
      address: shared ? value.ceremonyAddress.trim() : field('Address'),
      visible: value[`${prefix}Visible`],
      mapUrl: (shared ? value.ceremonyMapUrl.trim() : field('MapUrl')) || null,
    };
  }

  private hasRequiredLocations(value: EditorFormValue): boolean {
    if (value.locationMode === 'SHARED') {
      return Boolean(value.ceremonyVenue.trim() && value.ceremonyAddress.trim());
    }
    return (['ceremony', 'reception'] as const).every(
      (prefix) =>
        !value[`${prefix}Visible`] ||
        Boolean(value[`${prefix}Venue`].trim() && value[`${prefix}Address`].trim()),
    );
  }

  private locationsDiffer(): boolean {
    const value = this.form.getRawValue();
    return (
      value.ceremonyVenue.trim() !== value.receptionVenue.trim() ||
      value.ceremonyAddress.trim() !== value.receptionAddress.trim() ||
      value.ceremonyMapUrl.trim() !== value.receptionMapUrl.trim()
    );
  }

  private lines(value: string, maximum: number): string[] {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, maximum);
  }

  private apply(state: WeddingSiteAdminState): void {
    const draft = state.draft;
    const ceremony = draft.schedule.find((moment) => moment.type === 'CEREMONY')!;
    const reception = draft.schedule.find((moment) => moment.type === 'RECEPTION')!;
    this.form.reset({
      heroEyebrow: draft.hero.eyebrow,
      heroTitle: draft.hero.title,
      heroIntroduction: draft.hero.introduction,
      heroDateLabel: draft.hero.dateLabel,
      storyEyebrow: draft.story.eyebrow,
      storyTitle: draft.story.title,
      storyParagraphs: draft.story.paragraphs.join('\n'),
      locationMode: draft.locationMode ?? 'SEPARATE',
      ceremonyVisible: ceremony.visible ?? true,
      ceremonyEyebrow: ceremony.eyebrow,
      ceremonyTitle: ceremony.title,
      ceremonyTime: ceremony.time,
      ceremonyVenue: ceremony.venue,
      ceremonyAddress: ceremony.address,
      ceremonyMapUrl: ceremony.mapUrl ?? '',
      receptionVisible: reception.visible ?? true,
      receptionEyebrow: reception.eyebrow,
      receptionTitle: reception.title,
      receptionTime: reception.time,
      receptionVenue: reception.venue,
      receptionAddress: reception.address,
      receptionMapUrl: reception.mapUrl ?? '',
      notices: draft.notices.join('\n'),
      rsvpEyebrow: draft.rsvp.eyebrow,
      rsvpTitle: draft.rsvp.title,
      rsvpDescription: draft.rsvp.description,
    });
    const photos = draft.photos ?? [];
    this.photos.set(
      photos.map((photo) => ({
        ...photo,
        url: `/api/admin/site/media/${photo.id}`,
        contentType: '',
        sizeBytes: 0,
      })),
    );
    this.sectionOrder.set([...draft.sectionOrder]);
    this.form.markAsPristine();
    this.applyState(state);
  }

  private applyState(state: WeddingSiteAdminState): void {
    this.draftVersion.set(state.draftVersion);
    this.published.set(state.published);
    this.publishedAt.set(state.publishedAt);
    this.hasUnpublishedChanges.set(state.hasUnpublishedChanges);
  }

  private handleError(error: HttpErrorResponse): void {
    const problem = error.error as ApiProblem | null;
    this.errorMessage.set(
      problem?.errors?.[0]?.message ?? problem?.detail ?? 'A operação não pôde ser concluída.',
    );
  }

  private clearMessages(): void {
    this.message.set(null);
    this.errorMessage.set(null);
  }
}

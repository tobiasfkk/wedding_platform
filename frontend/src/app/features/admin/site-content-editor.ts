import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PublicSiteSection, PublicWeddingContent } from '../public-site/public-site-content';
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

type EditorFormValue = ReturnType<SiteContentEditor['form']['getRawValue']>;

const requiredText = (maximum: number) => [Validators.required, Validators.maxLength(maximum)];

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
  readonly image = signal<SiteMediaUpload | null>(null);
  readonly preview = signal<PublicWeddingContent | null>(null);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    heroEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    heroTitle: new FormControl('', { nonNullable: true, validators: requiredText(120) }),
    heroIntroduction: new FormControl('', { nonNullable: true, validators: requiredText(400) }),
    heroDateLabel: new FormControl('', { nonNullable: true, validators: requiredText(120) }),
    storyEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    storyTitle: new FormControl('', { nonNullable: true, validators: requiredText(120) }),
    storyParagraphs: new FormControl('', { nonNullable: true, validators: requiredText(3000) }),
    storyImageAlt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    ceremonyEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    ceremonyTitle: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    ceremonyTime: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    ceremonyVenue: new FormControl('', { nonNullable: true, validators: requiredText(160) }),
    ceremonyAddress: new FormControl('', { nonNullable: true, validators: requiredText(300) }),
    receptionEyebrow: new FormControl('', { nonNullable: true, validators: requiredText(60) }),
    receptionTitle: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    receptionTime: new FormControl('', { nonNullable: true, validators: requiredText(100) }),
    receptionVenue: new FormControl('', { nonNullable: true, validators: requiredText(160) }),
    receptionAddress: new FormControl('', { nonNullable: true, validators: requiredText(300) }),
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
    this.clearMessages();
    this.uploading.set(true);
    this.service
      .upload(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (image) => {
          this.image.set(image);
          this.form.controls.storyImageAlt.setValue('');
          this.form.markAsDirty();
          this.message.set('Foto enviada. Informe a descrição e salve o rascunho.');
          input.value = '';
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
          input.value = '';
        },
      });
  }

  removeImage(): void {
    this.image.set(null);
    this.form.controls.storyImageAlt.setValue('');
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
    const image = this.image();
    if (image && !value.storyImageAlt.trim()) {
      this.form.controls.storyImageAlt.setErrors({ required: true });
      this.form.controls.storyImageAlt.markAsTouched();
      this.errorMessage.set('Descreva a foto para pessoas que não podem vê-la.');
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
        imageId: image?.id ?? null,
        imageAlt: image ? value.storyImageAlt.trim() : null,
        imageWidth: image?.width ?? null,
        imageHeight: image?.height ?? null,
      },
      schedule: [
        this.moment('CEREMONY', value, 'ceremony'),
        this.moment('RECEPTION', value, 'reception'),
      ],
      notices,
      rsvp: {
        eyebrow: value.rsvpEyebrow.trim(),
        title: value.rsvpTitle.trim(),
        description: value.rsvpDescription.trim(),
      },
      sectionOrder: [...this.sectionOrder()],
    };
  }

  private moment(
    type: SiteMomentType,
    value: EditorFormValue,
    prefix: 'ceremony' | 'reception',
  ): WeddingSiteContentDto['schedule'][number] {
    const field = (suffix: 'Eyebrow' | 'Title' | 'Time' | 'Venue' | 'Address') =>
      value[`${prefix}${suffix}`].trim();
    return {
      type,
      eyebrow: field('Eyebrow'),
      title: field('Title'),
      time: field('Time'),
      venue: field('Venue'),
      address: field('Address'),
    };
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
      storyImageAlt: draft.story.imageAlt ?? '',
      ceremonyEyebrow: ceremony.eyebrow,
      ceremonyTitle: ceremony.title,
      ceremonyTime: ceremony.time,
      ceremonyVenue: ceremony.venue,
      ceremonyAddress: ceremony.address,
      receptionEyebrow: reception.eyebrow,
      receptionTitle: reception.title,
      receptionTime: reception.time,
      receptionVenue: reception.venue,
      receptionAddress: reception.address,
      notices: draft.notices.join('\n'),
      rsvpEyebrow: draft.rsvp.eyebrow,
      rsvpTitle: draft.rsvp.title,
      rsvpDescription: draft.rsvp.description,
    });
    this.image.set(
      draft.story.imageId && draft.story.imageWidth && draft.story.imageHeight
        ? {
            id: draft.story.imageId,
            url: `/api/admin/site/media/${draft.story.imageId}`,
            contentType: '',
            width: draft.story.imageWidth,
            height: draft.story.imageHeight,
            sizeBytes: 0,
          }
        : null,
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

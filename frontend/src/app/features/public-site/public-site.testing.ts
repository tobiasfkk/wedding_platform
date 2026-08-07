import { WeddingSiteContentDto } from './public-site.service';

export const SITE_CONTENT_DTO: WeddingSiteContentDto = {
  hero: {
    eyebrow: 'Celebração',
    title: 'Ana e Bruno',
    introduction: 'Vamos celebrar juntos.',
    dateLabel: '8 de maio de 2027',
  },
  story: {
    eyebrow: 'Nossa história',
    title: 'Do encontro ao sim',
    paragraphs: ['Nosso primeiro capítulo.'],
    imageId: 'photo-1',
    imageAlt: 'O casal no jardim.',
    imageWidth: 1200,
    imageHeight: 800,
  },
  schedule: [
    {
      type: 'CEREMONY',
      eyebrow: 'Cerimônia',
      title: 'O nosso sim',
      time: '16h',
      venue: 'Espaço Jardim',
      address: 'Rua das Flores, 100',
    },
    {
      type: 'RECEPTION',
      eyebrow: 'Recepção',
      title: 'Vamos celebrar',
      time: 'Após a cerimônia',
      venue: 'Salão Jardim',
      address: 'No mesmo local',
    },
  ],
  notices: ['Chegue com antecedência.'],
  rsvp: { eyebrow: 'RSVP', title: 'Confirme sua presença', description: 'Use seu convite.' },
  sectionOrder: ['STORY', 'SCHEDULE', 'NOTICES', 'RSVP'],
};

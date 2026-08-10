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
  locationMode: 'SEPARATE',
  schedule: [
    {
      type: 'CEREMONY',
      eyebrow: 'Cerimônia',
      title: 'O nosso sim',
      time: '16h',
      venue: 'Espaço Jardim',
      address: 'Rua das Flores, 100',
      visible: true,
      mapUrl: 'https://www.google.com/maps/place/Espaco+Jardim',
    },
    {
      type: 'RECEPTION',
      eyebrow: 'Recepção',
      title: 'Vamos celebrar',
      time: 'Após a cerimônia',
      venue: 'Salão Jardim',
      address: 'No mesmo local',
      visible: true,
      mapUrl: null,
    },
  ],
  notices: ['Chegue com antecedência.'],
  rsvp: { eyebrow: 'RSVP', title: 'Confirme sua presença', description: 'Use seu convite.' },
  sectionOrder: ['STORY', 'SCHEDULE', 'NOTICES', 'RSVP'],
  photos: [
    {
      id: 'photo-1',
      placement: 'STORY',
      alt: 'O casal no jardim.',
      width: 1200,
      height: 800,
      focalX: 45,
      focalY: 35,
    },
  ],
};

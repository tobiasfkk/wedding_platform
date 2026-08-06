export interface PublicWeddingContent {
  hero: {
    eyebrow: string;
    title: string;
    introduction: string;
    dateLabel: string;
  };
  story: {
    eyebrow: string;
    title: string;
    paragraphs: readonly string[];
    image: PublicWeddingImage | null;
  };
  schedule: readonly PublicWeddingMoment[];
  notices: readonly string[];
  rsvp: {
    eyebrow: string;
    title: string;
    description: string;
  };
}

export interface PublicWeddingImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface PublicWeddingMoment {
  eyebrow: string;
  title: string;
  time: string;
  venue: string;
  address: string;
}

/**
 * Conteúdo provisório usado pelo renderizador público.
 * A issue #48 substituirá esta origem local pelo conteúdo publicado pelo administrador.
 */
export const PUBLIC_WEDDING_CONTENT: PublicWeddingContent = {
  hero: {
    eyebrow: 'Celebração de casamento',
    title: 'Um dia para guardar na memória.',
    introduction:
      'Estamos preparando cada detalhe para celebrar o amor ao lado das pessoas que fazem parte da nossa história.',
    dateLabel: 'Data e nomes serão definidos pelos noivos',
  },
  story: {
    eyebrow: 'Nossa história',
    title: 'Do encontro ao nosso sim.',
    paragraphs: [
      'Entre conversas demoradas, novos caminhos e muitos planos compartilhados, descobrimos a alegria de construir a vida juntos.',
      'Agora queremos dividir o próximo capítulo com quem tornou essa caminhada ainda mais especial.',
    ],
    image: null,
  },
  schedule: [
    {
      eyebrow: '01 · Cerimônia',
      title: 'O nosso sim',
      time: 'Horário a confirmar',
      venue: 'Local da cerimônia',
      address: 'O endereço será publicado pelos noivos.',
    },
    {
      eyebrow: '02 · Recepção',
      title: 'Vamos celebrar',
      time: 'Após a cerimônia',
      venue: 'Local da recepção',
      address: 'Os detalhes serão publicados pelos noivos.',
    },
  ],
  notices: [
    'Chegue com antecedência para aproveitar cada momento com tranquilidade.',
    'Consulte seu convite individual para confirmar quem participará com você.',
    'Novas informações serão disponibilizadas nesta página conforme a data se aproxima.',
  ],
  rsvp: {
    eyebrow: 'Confirmação de presença',
    title: 'Sua presença faz parte desta história.',
    description:
      'Use o link individual recebido com o convite para informar quem poderá celebrar conosco.',
  },
};

package com.tobias.wedding.site;

import java.util.List;

final class DefaultWeddingSiteContent {

    private DefaultWeddingSiteContent() {}

    static WeddingSiteContent create(String configuredLocation) {
        String sharedVenue = configuredLocation == null || configuredLocation.isBlank()
                ? "Local do casamento"
                : configuredLocation.strip();
        return new WeddingSiteContent(
                new WeddingSiteContent.Hero(
                        "Celebração de casamento",
                        "Um dia para guardar na memória.",
                        "Estamos preparando cada detalhe para celebrar o amor ao lado das pessoas que fazem parte da nossa história.",
                        "Data e nomes serão definidos pelos noivos"),
                new WeddingSiteContent.Story(
                        "Nossa história",
                        "Do encontro ao nosso sim.",
                        List.of(
                                "Entre conversas demoradas, novos caminhos e muitos planos compartilhados, descobrimos a alegria de construir a vida juntos.",
                                "Agora queremos dividir o próximo capítulo com quem tornou essa caminhada ainda mais especial."),
                        null,
                        null,
                        null,
                        null),
                List.of(
                        new WeddingSiteContent.Moment(
                                SiteMomentType.CEREMONY,
                                "01 · Cerimônia",
                                "O nosso sim",
                                "Horário a confirmar",
                                sharedVenue,
                                "O endereço será publicado pelos noivos.",
                                true,
                                null),
                        new WeddingSiteContent.Moment(
                                SiteMomentType.RECEPTION,
                                "02 · Recepção",
                                "Vamos celebrar",
                                "Após a cerimônia",
                                sharedVenue,
                                "O endereço será publicado pelos noivos.",
                                true,
                                null)),
                List.of(
                        "Chegue com antecedência para aproveitar cada momento com tranquilidade.",
                        "Consulte seu convite individual para confirmar quem participará com você.",
                        "Novas informações serão disponibilizadas nesta página conforme a data se aproxima."),
                new WeddingSiteContent.Rsvp(
                        "Confirmação de presença",
                        "Sua presença faz parte desta história.",
                        "Use o link individual recebido com o convite para informar quem poderá celebrar conosco."),
                List.of(
                        SiteSectionType.STORY,
                        SiteSectionType.SCHEDULE,
                        SiteSectionType.NOTICES,
                        SiteSectionType.RSVP),
                List.of(),
                SiteLocationMode.SHARED);
    }
}

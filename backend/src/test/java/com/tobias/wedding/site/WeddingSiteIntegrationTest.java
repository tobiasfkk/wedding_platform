package com.tobias.wedding.site;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(properties = "wedding.media.local-directory=target/test-media")
class WeddingSiteIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void configureWedding() {
        jdbcClient.sql("DELETE FROM wedding.site_media").update();
        jdbcClient.sql("DELETE FROM wedding.wedding_site").update();
        jdbcClient.sql("DELETE FROM wedding.wedding_event").update();
        jdbcClient.sql("""
                        INSERT INTO wedding.wedding_event (
                            id, display_name, starts_at, rsvp_deadline, time_zone, location,
                            version, created_at, updated_at
                        ) VALUES (
                            :id, 'Ana e Bruno', :startsAt, :deadline, 'America/Sao_Paulo',
                            'Espaço Jardim', 0, :now, :now
                        )
                        """)
                .param("id", UUID.randomUUID())
                .param("startsAt", Timestamp.from(Instant.parse("2027-05-08T19:00:00Z")))
                .param("deadline", Timestamp.from(Instant.parse("2027-04-08T02:59:00Z")))
                .param("now", Timestamp.from(Instant.now()))
                .update();
    }

    @Test
    void protectsDraftAndReturnsNotFoundWhileNothingIsPublished() throws Exception {
        mockMvc.perform(get("/api/admin/site")).andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/public/site"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SITE_NOT_PUBLISHED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void preservesPublishedVersionWhileTheDraftContinuesChanging() throws Exception {
        mockMvc.perform(get("/api/admin/site"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftVersion").value(0))
                .andExpect(jsonPath("$.published").value(false));

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(0, contentJson("Nossa celebração", null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftVersion").value(1))
                .andExpect(jsonPath("$.hasUnpublishedChanges").value(true));

        mockMvc.perform(get("/api/public/site")).andExpect(status().isNotFound());

        mockMvc.perform(put("/api/admin/site/publication").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishedVersion").value(1))
                .andExpect(jsonPath("$.hasUnpublishedChanges").value(false));

        mockMvc.perform(get("/api/public/site"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.hero.title").value("Nossa celebração"))
                .andExpect(jsonPath("$.version").value(1));

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(1, contentJson("Novo título ainda privado", null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftVersion").value(2))
                .andExpect(jsonPath("$.publishedVersion").value(1));

        mockMvc.perform(get("/api/public/site"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.hero.title").value("Nossa celebração"));

        mockMvc.perform(delete("/api/admin/site/publication").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));

        mockMvc.perform(get("/api/public/site")).andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsUnknownOrderingAndStaleDrafts() throws Exception {
        String invalidOrder = contentJson("Nossa celebração", null)
                .replace("[\"STORY\",\"SCHEDULE\",\"NOTICES\",\"RSVP\"]", "[\"STORY\",\"STORY\",\"NOTICES\",\"RSVP\"]");

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(0, invalidOrder)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("content.sectionOrder"));

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(0, contentJson("Nossa celebração", null))))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(0, contentJson("Versão atrasada", null))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SITE_DRAFT_VERSION_CONFLICT"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void persistsSharedLocationsAndValidatesVisibilityAndMapLinks() throws Exception {
        String sharedLocation = contentJson("Nossa celebração", null)
                .replace("\"locationMode\": \"SEPARATE\"", "\"locationMode\": \"SHARED\"")
                .replace("\"venue\": \"Salão Jardim\"", "\"venue\": \"Espaço Jardim\"")
                .replace("\"address\": \"No mesmo local\"", "\"address\": \"Rua das Flores, 100\"")
                .replace(
                        "\"mapUrl\": null",
                        "\"mapUrl\": \"https://www.google.com/maps/place/Espaco+Jardim\"");

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(0, sharedLocation)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.locationMode").value("SHARED"))
                .andExpect(jsonPath("$.draft.schedule[0].mapUrl")
                        .value("https://www.google.com/maps/place/Espaco+Jardim"));
        mockMvc.perform(put("/api/admin/site/publication").with(csrf())).andExpect(status().isOk());
        mockMvc.perform(get("/api/public/site"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.locationMode").value("SHARED"));

        String noVisibleMoment = contentJson("Sem local", null)
                .replace("\"visible\": true", "\"visible\": false");
        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(1, noVisibleMoment)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("content.schedule"));

        String unsafeMap = contentJson("Mapa inseguro", null)
                .replace("\"mapUrl\": null", "\"mapUrl\": \"javascript:alert(1)\"");
        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(1, unsafeMap)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("Informe um link HTTPS válido do Google Maps."));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void exposesUploadedMediaOnlyAfterItsContentIsPublished() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB), "png", bytes);
        MockMultipartFile file =
                new MockMultipartFile("file", "casal.png", "image/png", bytes.toByteArray());

        String response = mockMvc.perform(multipart("/api/admin/site/media").file(file).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.width").value(640))
                .andExpect(jsonPath("$.height").value(480))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String mediaId = objectMapper.readTree(response).get("id").asText();

        mockMvc.perform(get("/api/admin/site/media/{id}", mediaId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"));

        mockMvc.perform(get("/api/public/site/media/{id}", mediaId)).andExpect(status().isNotFound());

        mockMvc.perform(put("/api/admin/site/draft")
                        .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                        .content(draftRequest(0, contentJson("Nossa celebração", mediaId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.photos[0].placement").value("HERO"))
                .andExpect(jsonPath("$.draft.photos[0].focalX").value(62));
        mockMvc.perform(put("/api/admin/site/publication").with(csrf())).andExpect(status().isOk());

        mockMvc.perform(get("/api/public/site/media/{id}", mediaId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"));

        byte[] resized = mockMvc.perform(get("/api/public/site/media/{id}", mediaId).param("width", "320"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();
        assertEquals(320, ImageIO.read(new ByteArrayInputStream(resized)).getWidth());

        mockMvc.perform(get("/api/public/site/media/{id}", mediaId).param("width", "200"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SITE_MEDIA_INVALID"));
    }

    private String draftRequest(long version, String content) {
        return "{\"version\":" + version + ",\"content\":" + content + "}";
    }

    private String contentJson(String title, String mediaId) {
        String photos = mediaId == null
                ? "[]"
                : """
                  [{
                    "id": "%s",
                    "placement": "HERO",
                    "alt": "O casal sorrindo no jardim.",
                    "width": 640,
                    "height": 480,
                    "focalX": 62,
                    "focalY": 38
                  }]
                  """.formatted(mediaId);
        return """
                {
                  "hero": {
                    "eyebrow": "Celebração de casamento",
                    "title": "%s",
                    "introduction": "Uma história para celebrar com pessoas especiais.",
                    "dateLabel": "8 de maio de 2027"
                  },
                  "story": {
                    "eyebrow": "Nossa história",
                    "title": "Do encontro ao nosso sim.",
                    "paragraphs": ["O primeiro capítulo da nossa história."],
                    "imageId": null,
                    "imageAlt": null,
                    "imageWidth": null,
                    "imageHeight": null
                  },
                  "locationMode": "SEPARATE",
                  "schedule": [
                    {
                      "type": "CEREMONY",
                      "eyebrow": "01 · Cerimônia",
                      "title": "O nosso sim",
                      "time": "16h",
                      "venue": "Espaço Jardim",
                      "address": "Rua das Flores, 100",
                      "visible": true,
                      "mapUrl": null
                    },
                    {
                      "type": "RECEPTION",
                      "eyebrow": "02 · Recepção",
                      "title": "Vamos celebrar",
                      "time": "Após a cerimônia",
                      "venue": "Salão Jardim",
                      "address": "No mesmo local",
                      "visible": true,
                      "mapUrl": null
                    }
                  ],
                  "notices": ["Chegue com antecedência."],
                  "rsvp": {
                    "eyebrow": "Confirmação de presença",
                    "title": "Sua presença faz parte desta história.",
                    "description": "Use o seu convite individual para responder."
                  },
                  "sectionOrder": ["STORY","SCHEDULE","NOTICES","RSVP"],
                  "photos": %s
                }
                """.formatted(
                        title,
                        photos);
    }
}

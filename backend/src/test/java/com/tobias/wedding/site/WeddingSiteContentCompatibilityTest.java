package com.tobias.wedding.site;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class WeddingSiteContentCompatibilityTest {

    private final JsonMapper objectMapper = JsonMapper.builder().build();

    @Test
    void readsDraftsCreatedBeforePhotosAndLocationOptionsExisted() throws Exception {
        String currentJson = objectMapper.writeValueAsString(DefaultWeddingSiteContent.create("Espaço Jardim"));
        String legacyJson = currentJson
                .replace(",\"photos\":[]", "")
                .replace(",\"locationMode\":\"SHARED\"", "")
                .replace(",\"visible\":true", "")
                .replace(",\"mapUrl\":null", "");

        WeddingSiteContent content = objectMapper.readValue(legacyJson, WeddingSiteContent.class);

        assertThat(content.photos()).isEmpty();
        assertThat(content.locationMode()).isEqualTo(SiteLocationMode.SEPARATE);
        assertThat(content.schedule()).allSatisfy(moment -> {
            assertThat(moment.visible()).isTrue();
            assertThat(moment.mapUrl()).isNull();
        });
    }

    @Test
    void migratesTheLegacyStoryImageIntoTheNarrative() {
        WeddingSiteContent current = DefaultWeddingSiteContent.create("Espaço Jardim");
        UUID mediaId = UUID.randomUUID();
        WeddingSiteContent.Story legacyStory = new WeddingSiteContent.Story(
                current.story().eyebrow(),
                current.story().title(),
                current.story().paragraphs(),
                mediaId,
                "O casal no jardim.",
                1200,
                800);

        WeddingSiteContent migrated = new WeddingSiteContent(
                current.hero(),
                legacyStory,
                current.schedule(),
                current.notices(),
                current.rsvp(),
                current.sectionOrder(),
                null,
                current.locationMode());

        assertThat(migrated.photos())
                .singleElement()
                .satisfies(photo -> {
                    assertThat(photo.id()).isEqualTo(mediaId);
                    assertThat(photo.placement()).isEqualTo(SitePhotoPlacement.STORY);
                    assertThat(photo.focalX()).isEqualTo(50);
                    assertThat(photo.focalY()).isEqualTo(50);
                });
    }
}

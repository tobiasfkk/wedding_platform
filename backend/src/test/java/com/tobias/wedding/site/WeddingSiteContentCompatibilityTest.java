package com.tobias.wedding.site;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class WeddingSiteContentCompatibilityTest {

    private final JsonMapper objectMapper = JsonMapper.builder().build();

    @Test
    void readsDraftsCreatedBeforeThePhotoCollectionExisted() throws Exception {
        String currentJson = objectMapper.writeValueAsString(DefaultWeddingSiteContent.create());
        String legacyJson = currentJson.replace(",\"photos\":[]", "");

        WeddingSiteContent content = objectMapper.readValue(legacyJson, WeddingSiteContent.class);

        assertThat(content.photos()).isEmpty();
    }

    @Test
    void migratesTheLegacyStoryImageIntoTheNarrative() {
        WeddingSiteContent current = DefaultWeddingSiteContent.create();
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
                null);

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

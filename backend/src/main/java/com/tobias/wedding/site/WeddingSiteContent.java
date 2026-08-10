package com.tobias.wedding.site;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record WeddingSiteContent(
        @NotNull @Valid Hero hero,
        @NotNull @Valid Story story,
        @NotNull @Size(min = 2, max = 2, message = "Informe cerimônia e recepção.")
                List<@Valid Moment> schedule,
        @NotNull @NotEmpty @Size(max = 8, message = "Informe no máximo 8 avisos.")
                List<@NotBlank @Size(max = 300) String> notices,
        @NotNull @Valid Rsvp rsvp,
        @NotNull @Size(min = 4, max = 4, message = "A ordem deve conter todas as seções.")
                List<@NotNull SiteSectionType> sectionOrder,
        @NotNull @Size(max = 10, message = "Selecione no máximo 10 fotos.") List<@Valid Photo> photos) {

    public WeddingSiteContent {
        schedule = schedule == null ? null : List.copyOf(schedule);
        notices = notices == null ? null : List.copyOf(notices);
        sectionOrder = sectionOrder == null ? null : List.copyOf(sectionOrder);
        if (photos == null) {
            photos = story != null && story.imageId() != null
                    ? List.of(new Photo(
                            story.imageId(),
                            SitePhotoPlacement.STORY,
                            story.imageAlt(),
                            story.imageWidth(),
                            story.imageHeight(),
                            50,
                            50))
                    : List.of();
        } else {
            photos = List.copyOf(photos);
        }
    }

    public record Hero(
            @NotBlank @Size(max = 60) String eyebrow,
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 400) String introduction,
            @NotBlank @Size(max = 120) String dateLabel) {}

    public record Story(
            @NotBlank @Size(max = 60) String eyebrow,
            @NotBlank @Size(max = 120) String title,
            @NotNull @NotEmpty @Size(max = 5) List<@NotBlank @Size(max = 600) String> paragraphs,
            UUID imageId,
            @Size(max = 200) String imageAlt,
            Integer imageWidth,
            Integer imageHeight) {

        public Story {
            paragraphs = paragraphs == null ? null : List.copyOf(paragraphs);
        }
    }

    public record Moment(
            @NotNull SiteMomentType type,
            @NotBlank @Size(max = 60) String eyebrow,
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 100) String time,
            @NotBlank @Size(max = 160) String venue,
            @NotBlank @Size(max = 300) String address) {}

    public record Photo(
            @NotNull UUID id,
            @NotNull SitePhotoPlacement placement,
            @NotBlank @Size(max = 200) String alt,
            @NotNull @Min(1) @Max(6000) Integer width,
            @NotNull @Min(1) @Max(6000) Integer height,
            @NotNull @Min(0) @Max(100) Integer focalX,
            @NotNull @Min(0) @Max(100) Integer focalY) {}

    public record Rsvp(
            @NotBlank @Size(max = 60) String eyebrow,
            @NotBlank @Size(max = 140) String title,
            @NotBlank @Size(max = 400) String description) {}
}

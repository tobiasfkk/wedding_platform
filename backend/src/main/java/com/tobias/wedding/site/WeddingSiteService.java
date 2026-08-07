package com.tobias.wedding.site;

import com.tobias.wedding.wedding.CurrentWedding;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
class WeddingSiteService {

    private final ObjectProvider<WeddingSiteRepository> repositories;
    private final CurrentWedding currentWedding;
    private final ObjectProvider<SiteMediaRepository> mediaRepositories;
    private final SiteMediaService mediaService;
    private final ObjectMapper objectMapper;

    WeddingSiteService(
            ObjectProvider<WeddingSiteRepository> repositories,
            CurrentWedding currentWedding,
            ObjectProvider<SiteMediaRepository> mediaRepositories,
            SiteMediaService mediaService,
            ObjectMapper objectMapper) {
        this.repositories = repositories;
        this.currentWedding = currentWedding;
        this.mediaRepositories = mediaRepositories;
        this.mediaService = mediaService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    WeddingSiteAdminResponse findDraft() {
        UUID weddingId = currentWedding.requireId();
        return repository().findByWeddingEventId(weddingId)
                .map(this::adminResponse)
                .orElseGet(() -> new WeddingSiteAdminResponse(
                        DefaultWeddingSiteContent.create(), 0, false, null, null, true));
    }

    @Transactional
    WeddingSiteAdminResponse saveDraft(WeddingSiteDraftRequest request) {
        UUID weddingId = currentWedding.requireId();
        validateContent(weddingId, request.content());
        String json = serialize(request.content());
        WeddingSite site = repository().findByWeddingEventId(weddingId).orElse(null);

        if (site == null) {
            if (request.version() != 0) {
                throw new WeddingSiteVersionConflictException();
            }
            site = WeddingSite.create(weddingId, json);
        } else {
            if (request.version() != site.draftVersion()) {
                throw new WeddingSiteVersionConflictException();
            }
            site.updateDraft(json);
        }

        return adminResponse(repository().saveAndFlush(site));
    }

    @Transactional
    WeddingSiteAdminResponse publish() {
        UUID weddingId = currentWedding.requireId();
        WeddingSite site = repository().findByWeddingEventId(weddingId)
                .orElseThrow(() -> new WeddingSiteValidationException(
                        "content", "Salve o rascunho antes de publicar."));
        WeddingSiteContent content = deserialize(site.draftContent());
        validateContent(weddingId, content);
        site.publish();
        mediaService.updatePublishedReferences(weddingId, publishedMediaIds(content));
        return adminResponse(repository().saveAndFlush(site));
    }

    @Transactional
    WeddingSiteAdminResponse unpublish() {
        UUID weddingId = currentWedding.requireId();
        WeddingSite site = repository().findByWeddingEventId(weddingId)
                .orElseThrow(WeddingSiteNotPublishedException::new);
        if (!site.published()) {
            throw new WeddingSiteNotPublishedException();
        }
        site.unpublish();
        mediaService.updatePublishedReferences(weddingId, Set.of());
        return adminResponse(repository().saveAndFlush(site));
    }

    @Transactional(readOnly = true)
    WeddingSitePublicResponse findPublished() {
        UUID weddingId = currentWedding.requireId();
        WeddingSite site = repository().findByWeddingEventId(weddingId)
                .filter(WeddingSite::published)
                .orElseThrow(WeddingSiteNotPublishedException::new);
        return new WeddingSitePublicResponse(
                deserialize(site.publishedContent()), site.publishedVersion(), site.publishedAt());
    }

    private void validateContent(UUID weddingId, WeddingSiteContent content) {
        EnumSet<SiteMomentType> momentTypes = EnumSet.noneOf(SiteMomentType.class);
        content.schedule().forEach(moment -> momentTypes.add(moment.type()));
        if (!momentTypes.equals(EnumSet.allOf(SiteMomentType.class))) {
            throw new WeddingSiteValidationException(
                    "content.schedule", "Informe uma cerimônia e uma recepção, sem duplicações.");
        }

        if (new HashSet<>(content.sectionOrder()).size() != SiteSectionType.values().length
                || !EnumSet.copyOf(content.sectionOrder()).equals(EnumSet.allOf(SiteSectionType.class))) {
            throw new WeddingSiteValidationException(
                    "content.sectionOrder", "A ordem deve conter cada seção suportada uma única vez.");
        }

        WeddingSiteContent.Story story = content.story();
        if (story.imageId() != null) {
            if (story.imageAlt() == null || story.imageAlt().isBlank()) {
                throw new WeddingSiteValidationException(
                        "content.story.imageAlt", "Descreva a foto para pessoas que não podem vê-la.");
            }
            SiteMedia media = mediaRepository().findByIdAndWeddingEventId(story.imageId(), weddingId)
                    .orElseThrow(() -> new WeddingSiteValidationException(
                            "content.story.imageId", "A imagem selecionada não pertence a este casamento."));
            if (!Integer.valueOf(media.width()).equals(story.imageWidth())
                    || !Integer.valueOf(media.height()).equals(story.imageHeight())) {
                throw new WeddingSiteValidationException(
                        "content.story.imageId", "As dimensões informadas para a imagem são inválidas.");
            }
        } else if (story.imageAlt() != null || story.imageWidth() != null || story.imageHeight() != null) {
            throw new WeddingSiteValidationException(
                    "content.story.imageId", "Remova os metadados quando nenhuma imagem estiver selecionada.");
        }
    }

    private WeddingSiteRepository repository() {
        return repositories.getObject();
    }

    private SiteMediaRepository mediaRepository() {
        return mediaRepositories.getObject();
    }

    private WeddingSiteAdminResponse adminResponse(WeddingSite site) {
        return new WeddingSiteAdminResponse(
                deserialize(site.draftContent()),
                site.draftVersion(),
                site.published(),
                site.publishedVersion(),
                site.publishedAt(),
                site.hasUnpublishedChanges());
    }

    private Set<UUID> publishedMediaIds(WeddingSiteContent content) {
        UUID storyImageId = content.story().imageId();
        return storyImageId == null ? Set.of() : Set.of(storyImageId);
    }

    private String serialize(WeddingSiteContent content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Não foi possível serializar o conteúdo do site.", exception);
        }
    }

    private WeddingSiteContent deserialize(String json) {
        try {
            return objectMapper.readValue(json, WeddingSiteContent.class);
        } catch (JacksonException exception) {
            throw new IllegalStateException("O conteúdo persistido do site é inválido.", exception);
        }
    }
}

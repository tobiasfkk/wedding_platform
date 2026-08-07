package com.tobias.wedding.site;

import com.tobias.wedding.wedding.CurrentWedding;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
class SiteMediaService {

    private static final long MAXIMUM_SIZE = 5L * 1024 * 1024;
    private static final int MAXIMUM_DIMENSION = 6000;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png");

    private final ObjectProvider<SiteMediaRepository> repositories;
    private final SiteMediaStorage storage;
    private final CurrentWedding currentWedding;

    SiteMediaService(
            ObjectProvider<SiteMediaRepository> repositories,
            SiteMediaStorage storage,
            CurrentWedding currentWedding) {
        this.repositories = repositories;
        this.storage = storage;
        this.currentWedding = currentWedding;
    }

    @Transactional
    SiteMediaUploadResponse upload(MultipartFile file) {
        UUID weddingId = currentWedding.requireId();
        String contentType = file.getContentType();
        String extension = EXTENSIONS.get(contentType);
        if (file.isEmpty() || extension == null || file.getSize() > MAXIMUM_SIZE) {
            throw new SiteMediaValidationException(
                    "Envie uma imagem JPG ou PNG de até 5 MB.");
        }

        BufferedImage image;
        try (InputStream input = file.getInputStream()) {
            image = ImageIO.read(input);
        } catch (IOException exception) {
            throw new SiteMediaValidationException("Não foi possível ler a imagem enviada.");
        }
        if (image == null || image.getWidth() > MAXIMUM_DIMENSION || image.getHeight() > MAXIMUM_DIMENSION) {
            throw new SiteMediaValidationException(
                    "A imagem é inválida ou ultrapassa 6000 pixels de largura ou altura.");
        }

        UUID mediaId = UUID.randomUUID();
        String key = weddingId + "/" + mediaId + "." + extension;
        try (InputStream input = file.getInputStream()) {
            storage.store(key, input);
            SiteMedia media = SiteMedia.create(
                    mediaId,
                    weddingId,
                    key,
                    contentType,
                    image.getWidth(),
                    image.getHeight(),
                    file.getSize());
            repository().saveAndFlush(media);
            return response(media);
        } catch (IOException | RuntimeException exception) {
            storage.delete(key);
            if (exception instanceof SiteMediaValidationException validationException) {
                throw validationException;
            }
            throw new SiteMediaValidationException("Não foi possível armazenar a imagem enviada.");
        }
    }

    @Transactional(readOnly = true)
    SiteMediaDownload findPublished(UUID id) {
        SiteMedia media = repository().findByIdAndPublishedTrue(id).orElseThrow(SiteMediaNotFoundException::new);
        return new SiteMediaDownload(storage.load(media.storageKey()), media.contentType());
    }

    @Transactional(readOnly = true)
    SiteMediaDownload findForCurrentWedding(UUID id) {
        SiteMedia media = repository()
                .findByIdAndWeddingEventId(id, currentWedding.requireId())
                .orElseThrow(SiteMediaNotFoundException::new);
        return new SiteMediaDownload(storage.load(media.storageKey()), media.contentType());
    }

    @Transactional
    void updatePublishedReferences(UUID weddingId, Set<UUID> publishedIds) {
        for (SiteMedia media : repository().findAllByWeddingEventId(weddingId)) {
            media.setPublished(publishedIds.contains(media.id()));
        }
    }

    private SiteMediaRepository repository() {
        return repositories.getObject();
    }

    private SiteMediaUploadResponse response(SiteMedia media) {
        return new SiteMediaUploadResponse(
                media.id(),
                "/api/admin/site/media/" + media.id(),
                media.contentType(),
                media.width(),
                media.height(),
                media.sizeBytes());
    }

    record SiteMediaDownload(Resource resource, String contentType) {}
}

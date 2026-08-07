package com.tobias.wedding.site;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SiteMediaRepository extends JpaRepository<SiteMedia, UUID> {

    Optional<SiteMedia> findByIdAndWeddingEventId(UUID id, UUID weddingEventId);

    List<SiteMedia> findAllByWeddingEventId(UUID weddingEventId);

    Optional<SiteMedia> findByIdAndPublishedTrue(UUID id);
}

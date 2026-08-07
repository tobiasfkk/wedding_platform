package com.tobias.wedding.site;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface WeddingSiteRepository extends JpaRepository<WeddingSite, UUID> {

    Optional<WeddingSite> findByWeddingEventId(UUID weddingEventId);
}

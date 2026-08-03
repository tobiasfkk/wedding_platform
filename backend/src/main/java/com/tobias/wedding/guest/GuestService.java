package com.tobias.wedding.guest;

import com.tobias.wedding.wedding.CurrentWedding;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class GuestService {

    private final ObjectProvider<GuestRepository> repositories;
    private final CurrentWedding currentWedding;

    GuestService(ObjectProvider<GuestRepository> repositories, CurrentWedding currentWedding) {
        this.repositories = repositories;
        this.currentWedding = currentWedding;
    }

    @Transactional(readOnly = true)
    GuestPageResponse findAll(String query, String status, int page, int size) {
        UUID weddingId = currentWedding.requireId();
        String normalizedQuery = query == null ? "" : query.strip();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id")));
        Page<Guest> guests = switch (normalizeStatus(status)) {
            case "ALL" -> repository().findByWeddingEventIdAndNameContainingIgnoreCase(
                    weddingId, normalizedQuery, pageable);
            case "ACTIVE" -> repository().findByWeddingEventIdAndNameContainingIgnoreCaseAndActive(
                    weddingId, normalizedQuery, true, pageable);
            case "INACTIVE" -> repository().findByWeddingEventIdAndNameContainingIgnoreCaseAndActive(
                    weddingId, normalizedQuery, false, pageable);
            default -> throw new GuestFilterException();
        };
        return GuestPageResponse.from(guests);
    }

    @Transactional
    GuestResponse create(GuestRequest request) {
        Guest guest = Guest.create(
                currentWedding.requireId(), request.name(), request.contact(), request.active());
        return GuestResponse.from(repository().saveAndFlush(guest));
    }

    @Transactional
    GuestResponse update(UUID id, GuestRequest request) {
        Guest guest = findCurrentGuest(id);
        guest.update(request.name(), request.contact());
        guest.changeStatus(request.active());
        return GuestResponse.from(repository().saveAndFlush(guest));
    }

    @Transactional
    GuestResponse changeStatus(UUID id, boolean active) {
        Guest guest = findCurrentGuest(id);
        guest.changeStatus(active);
        return GuestResponse.from(repository().saveAndFlush(guest));
    }

    private Guest findCurrentGuest(UUID id) {
        UUID weddingId = currentWedding.requireId();
        if (!repository().existsByIdAndWeddingEventId(id, weddingId)) {
            throw new GuestNotFoundException();
        }
        return repository().findById(id).orElseThrow(GuestNotFoundException::new);
    }

    private String normalizeStatus(String status) {
        return status == null ? "ALL" : status.strip().toUpperCase(Locale.ROOT);
    }

    private GuestRepository repository() {
        return repositories.getObject();
    }
}

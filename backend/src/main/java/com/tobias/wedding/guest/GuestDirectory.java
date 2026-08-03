package com.tobias.wedding.guest;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class GuestDirectory {

    private final ObjectProvider<GuestRepository> repositories;

    GuestDirectory(ObjectProvider<GuestRepository> repositories) {
        this.repositories = repositories;
    }

    public List<GuestSummary> requireActive(UUID weddingId, Collection<UUID> ids) {
        List<Guest> guests = repository().findAllByIdInAndWeddingEventIdAndActiveTrue(ids, weddingId);
        if (guests.size() != ids.size()) {
            throw new GuestSelectionException();
        }
        return guests.stream().map(this::summary).toList();
    }

    public List<GuestSummary> find(UUID weddingId, Collection<UUID> ids) {
        return repository().findAllByIdInAndWeddingEventId(ids, weddingId).stream()
                .map(this::summary)
                .toList();
    }

    public List<GuestSummary> searchActive(UUID weddingId, String query, int limit) {
        PageRequest page = PageRequest.of(0, limit, Sort.by("name").ascending().and(Sort.by("id")));
        return repository()
                .findByWeddingEventIdAndNameContainingIgnoreCaseAndActive(
                        weddingId, query == null ? "" : query.strip(), true, page)
                .stream()
                .map(this::summary)
                .toList();
    }

    private GuestSummary summary(Guest guest) {
        return new GuestSummary(guest.id(), guest.name(), guest.active());
    }

    private GuestRepository repository() {
        return repositories.getObject();
    }
}

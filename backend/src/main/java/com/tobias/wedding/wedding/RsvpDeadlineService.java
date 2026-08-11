package com.tobias.wedding.wedding;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class RsvpDeadlineService {

    static final ZoneId DEFAULT_TIME_ZONE = ZoneId.of("America/Sao_Paulo");

    private final ObjectProvider<WeddingEventRepository> repositories;

    RsvpDeadlineService(ObjectProvider<WeddingEventRepository> repositories) {
        this.repositories = repositories;
    }

    @Transactional(readOnly = true)
    RsvpDeadlineResponse findCurrent() {
        return repository().findFirstByOrderByCreatedAtAsc()
                .map(this::response)
                .orElseGet(() -> RsvpDeadlineResponse.empty(DEFAULT_TIME_ZONE.getId()));
    }

    @Transactional
    RsvpDeadlineResponse save(RsvpDeadlineRequest request) {
        ZoneId zoneId = parseZoneId(request.timeZone());
        Instant deadline = LocalDateTime.of(request.deadlineDate(), request.deadlineTime())
                .atZone(zoneId)
                .toInstant();
        WeddingEvent event = repository().findFirstByOrderByCreatedAtAsc()
                .orElseGet(WeddingEvent::installationContext);
        event.updateRsvpDeadline(deadline, zoneId);
        return response(repository().saveAndFlush(event));
    }

    private ZoneId parseZoneId(String value) {
        try {
            return ZoneId.of(value);
        } catch (DateTimeException exception) {
            throw new RsvpDeadlineValidationException("timeZone", "Informe um fuso horário válido.");
        }
    }

    private WeddingEventRepository repository() {
        return repositories.getObject();
    }

    private RsvpDeadlineResponse response(WeddingEvent event) {
        if (event.rsvpDeadline() == null) {
            return RsvpDeadlineResponse.empty(event.timeZone().getId());
        }
        LocalDateTime deadline = LocalDateTime.ofInstant(event.rsvpDeadline(), event.timeZone());
        return new RsvpDeadlineResponse(
                true,
                deadline.toLocalDate(),
                deadline.toLocalTime(),
                event.timeZone().getId());
    }
}

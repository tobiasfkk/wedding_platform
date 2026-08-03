package com.tobias.wedding.wedding;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class WeddingSettingsService {

    static final ZoneId DEFAULT_TIME_ZONE = ZoneId.of("America/Sao_Paulo");

    private final ObjectProvider<WeddingEventRepository> repositories;

    WeddingSettingsService(ObjectProvider<WeddingEventRepository> repositories) {
        this.repositories = repositories;
    }

    @Transactional(readOnly = true)
    WeddingSettingsResponse findCurrent() {
        return repository().findFirstByOrderByCreatedAtAsc()
                .map(this::response)
                .orElseGet(() -> WeddingSettingsResponse.empty(DEFAULT_TIME_ZONE.getId()));
    }

    @Transactional
    WeddingSettingsResponse save(WeddingSettingsRequest request) {
        ZoneId zoneId = parseZoneId(request.timeZone());
        Instant startsAt = LocalDateTime.of(request.eventDate(), request.eventTime())
                .atZone(zoneId)
                .toInstant();
        Instant deadline = LocalDateTime.of(request.rsvpDeadlineDate(), request.rsvpDeadlineTime())
                .atZone(zoneId)
                .toInstant();

        if (deadline.isAfter(startsAt)) {
            throw new WeddingSettingsValidationException(
                    "rsvpDeadlineDate", "A data-limite do RSVP não pode ser posterior ao casamento.");
        }

        WeddingEvent event = repository().findFirstByOrderByCreatedAtAsc()
                .orElseGet(() -> WeddingEvent.create(
                        request.displayName(), startsAt, deadline, zoneId, request.location()));
        event.update(request.displayName(), startsAt, deadline, zoneId, request.location());
        return response(repository().saveAndFlush(event));
    }

    private ZoneId parseZoneId(String value) {
        try {
            return ZoneId.of(value);
        } catch (DateTimeException exception) {
            throw new WeddingSettingsValidationException("timeZone", "Informe um fuso horário válido.");
        }
    }

    private WeddingEventRepository repository() {
        return repositories.getObject();
    }

    private WeddingSettingsResponse response(WeddingEvent event) {
        ZoneId zoneId = event.timeZone();
        LocalDateTime start = LocalDateTime.ofInstant(event.startsAt(), zoneId);
        LocalDateTime deadline = LocalDateTime.ofInstant(event.rsvpDeadline(), zoneId);
        return new WeddingSettingsResponse(
                true,
                event.displayName(),
                start.toLocalDate(),
                start.toLocalTime(),
                event.location(),
                deadline.toLocalDate(),
                deadline.toLocalTime(),
                zoneId.getId(),
                event.version());
    }
}

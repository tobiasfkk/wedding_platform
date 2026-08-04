package com.tobias.wedding.rsvp;

import com.tobias.wedding.wedding.CurrentWedding;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class RsvpDashboardService {

    private static final String PARTICIPANT_STATUS = """
            WITH participant_status AS (
                SELECT i.id AS invitation_id, g.id AS guest_id, g.name,
                       COALESCE(r.status, 'PENDING') AS status, r.updated_at
                FROM wedding.invitation i
                JOIN wedding.invitation_guest ig
                  ON ig.invitation_id = i.id AND ig.unlinked_at IS NULL
                JOIN wedding.guest g ON g.id = ig.guest_id AND g.active
                LEFT JOIN wedding.rsvp_response r
                  ON r.invitation_id = i.id AND r.guest_id = g.id
                WHERE i.wedding_event_id = :weddingId
            )
            """;

    private final CurrentWedding currentWedding;
    private final ObjectProvider<JdbcClient> jdbcClients;

    RsvpDashboardService(CurrentWedding currentWedding, ObjectProvider<JdbcClient> jdbcClients) {
        this.currentWedding = currentWedding;
        this.jdbcClients = jdbcClients;
    }

    @Transactional(readOnly = true)
    RsvpDashboardResponse find(String query, String status, int page, int size) {
        UUID weddingId = currentWedding.requireId();
        String normalizedQuery = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        String normalizedStatus = normalizeStatus(status);
        RsvpDashboardTotals totals = totals(weddingId);
        long totalElements = count(weddingId, normalizedQuery, normalizedStatus);
        List<InvitationRow> rows = invitations(
                weddingId, normalizedQuery, normalizedStatus, size, (long) page * size);
        Map<UUID, List<RsvpDashboardParticipant>> participants = participants(rows);
        Map<UUID, List<RsvpCompanionResponse>> companions = companions(rows);
        List<RsvpDashboardInvitation> items = rows.stream()
                .map(row -> new RsvpDashboardInvitation(
                        row.id(),
                        row.name(),
                        row.confirmed(),
                        row.declined(),
                        row.pending(),
                        row.updatedAt(),
                        participants.getOrDefault(row.id(), List.of()),
                        companions.getOrDefault(row.id(), List.of())))
                .toList();
        int totalPages = totalElements == 0 ? 0 : (int) ((totalElements + size - 1) / size);
        return new RsvpDashboardResponse(totals, items, page, size, totalElements, totalPages);
    }

    private RsvpDashboardTotals totals(UUID weddingId) {
        return jdbc().sql(PARTICIPANT_STATUS + """
                        SELECT
                          COUNT(*) FILTER (WHERE status = 'CONFIRMED')
                            + (SELECT COUNT(*) FROM wedding.companion c
                               JOIN wedding.invitation i ON i.id = c.invitation_id
                               WHERE i.wedding_event_id = :weddingId AND c.removed_at IS NULL) AS confirmed,
                          COUNT(*) FILTER (WHERE status = 'DECLINED') AS declined,
                          COUNT(*) FILTER (WHERE status = 'PENDING') AS pending
                        FROM participant_status
                        """)
                .param("weddingId", weddingId)
                .query((result, row) -> new RsvpDashboardTotals(
                        result.getLong("confirmed"),
                        result.getLong("declined"),
                        result.getLong("pending")))
                .single();
    }

    private long count(UUID weddingId, String query, String status) {
        return jdbc().sql(PARTICIPANT_STATUS + """
                        SELECT COUNT(*)
                        FROM wedding.invitation i
                        WHERE i.wedding_event_id = :weddingId
                          AND (:query = '' OR lower(i.name) LIKE '%' || :query || '%'
                            OR EXISTS (SELECT 1 FROM participant_status p
                                       WHERE p.invitation_id = i.id AND lower(p.name) LIKE '%' || :query || '%')
                            OR EXISTS (SELECT 1 FROM wedding.companion c
                                       WHERE c.invitation_id = i.id AND c.removed_at IS NULL
                                         AND lower(c.name) LIKE '%' || :query || '%'))
                          AND (:status = 'ALL' OR EXISTS (SELECT 1 FROM participant_status p
                                                         WHERE p.invitation_id = i.id AND p.status = :status))
                        """)
                .param("weddingId", weddingId)
                .param("query", query)
                .param("status", status)
                .query(Long.class)
                .single();
    }

    private List<InvitationRow> invitations(
            UUID weddingId, String query, String status, int limit, long offset) {
        return jdbc().sql(PARTICIPANT_STATUS + """
                        SELECT i.id, i.name,
                          COUNT(p.guest_id) FILTER (WHERE p.status = 'CONFIRMED')
                            + (SELECT COUNT(*) FROM wedding.companion c
                               WHERE c.invitation_id = i.id AND c.removed_at IS NULL) AS confirmed,
                          COUNT(p.guest_id) FILTER (WHERE p.status = 'DECLINED') AS declined,
                          COUNT(p.guest_id) FILTER (WHERE p.status = 'PENDING') AS pending,
                          GREATEST(MAX(p.updated_at),
                            (SELECT MAX(c.updated_at) FROM wedding.companion c
                             WHERE c.invitation_id = i.id)) AS updated_at
                        FROM wedding.invitation i
                        LEFT JOIN participant_status p ON p.invitation_id = i.id
                        WHERE i.wedding_event_id = :weddingId
                          AND (:query = '' OR lower(i.name) LIKE '%' || :query || '%'
                            OR EXISTS (SELECT 1 FROM participant_status match_p
                                       WHERE match_p.invitation_id = i.id
                                         AND lower(match_p.name) LIKE '%' || :query || '%')
                            OR EXISTS (SELECT 1 FROM wedding.companion c
                                       WHERE c.invitation_id = i.id AND c.removed_at IS NULL
                                         AND lower(c.name) LIKE '%' || :query || '%'))
                          AND (:status = 'ALL' OR EXISTS (SELECT 1 FROM participant_status match_p
                                                         WHERE match_p.invitation_id = i.id
                                                           AND match_p.status = :status))
                        GROUP BY i.id, i.name
                        ORDER BY lower(i.name), i.id
                        LIMIT :limit OFFSET :offset
                        """)
                .param("weddingId", weddingId)
                .param("query", query)
                .param("status", status)
                .param("limit", limit)
                .param("offset", offset)
                .query((result, row) -> {
                    Timestamp updatedAt = result.getTimestamp("updated_at");
                    return new InvitationRow(
                            result.getObject("id", UUID.class),
                            result.getString("name"),
                            result.getLong("confirmed"),
                            result.getLong("declined"),
                            result.getLong("pending"),
                            updatedAt == null ? null : updatedAt.toInstant());
                })
                .list();
    }

    private Map<UUID, List<RsvpDashboardParticipant>> participants(List<InvitationRow> rows) {
        Map<UUID, List<RsvpDashboardParticipant>> result = initialize(rows);
        if (rows.isEmpty()) return result;
        jdbc().sql("""
                        SELECT i.id AS invitation_id, g.id, g.name, COALESCE(r.status, 'PENDING') AS status
                        FROM wedding.invitation i
                        JOIN wedding.invitation_guest ig
                          ON ig.invitation_id = i.id AND ig.unlinked_at IS NULL
                        JOIN wedding.guest g ON g.id = ig.guest_id AND g.active
                        LEFT JOIN wedding.rsvp_response r
                          ON r.invitation_id = i.id AND r.guest_id = g.id
                        WHERE i.id IN (:ids)
                        ORDER BY lower(g.name), g.id
                        """)
                .param("ids", rows.stream().map(InvitationRow::id).toList())
                .query(resultSet -> {
                    UUID invitationId = resultSet.getObject("invitation_id", UUID.class);
                    result.get(invitationId).add(new RsvpDashboardParticipant(
                            resultSet.getObject("id", UUID.class),
                            resultSet.getString("name"),
                            RsvpStatus.valueOf(resultSet.getString("status"))));
                });
        return immutable(result);
    }

    private Map<UUID, List<RsvpCompanionResponse>> companions(List<InvitationRow> rows) {
        Map<UUID, List<RsvpCompanionResponse>> result = initialize(rows);
        if (rows.isEmpty()) return result;
        jdbc().sql("""
                        SELECT invitation_id, id, name
                        FROM wedding.companion
                        WHERE invitation_id IN (:ids) AND removed_at IS NULL
                        ORDER BY created_at, id
                        """)
                .param("ids", rows.stream().map(InvitationRow::id).toList())
                .query(resultSet -> {
                    UUID invitationId = resultSet.getObject("invitation_id", UUID.class);
                    result.get(invitationId).add(new RsvpCompanionResponse(
                            resultSet.getObject("id", UUID.class), resultSet.getString("name")));
                });
        return immutable(result);
    }

    private <T> Map<UUID, List<T>> initialize(List<InvitationRow> rows) {
        Map<UUID, List<T>> result = new LinkedHashMap<>();
        rows.forEach(row -> result.put(row.id(), new ArrayList<>()));
        return result;
    }

    private <T> Map<UUID, List<T>> immutable(Map<UUID, List<T>> values) {
        values.replaceAll((id, items) -> List.copyOf(items));
        return Map.copyOf(values);
    }

    private String normalizeStatus(String status) {
        String normalized = status == null ? "ALL" : status.strip().toUpperCase(Locale.ROOT);
        if (!normalized.equals("ALL")) {
            try {
                RsvpStatus.valueOf(normalized);
            } catch (IllegalArgumentException exception) {
                throw new RsvpDashboardFilterException();
            }
        }
        return normalized;
    }

    private JdbcClient jdbc() {
        return jdbcClients.getObject();
    }

    private record InvitationRow(
            UUID id,
            String name,
            long confirmed,
            long declined,
            long pending,
            Instant updatedAt) {}
}

package com.tobias.wedding.wedding;

import java.time.LocalDate;
import java.time.LocalTime;

record WeddingSettingsResponse(
        boolean configured,
        String displayName,
        LocalDate eventDate,
        LocalTime eventTime,
        String location,
        LocalDate rsvpDeadlineDate,
        LocalTime rsvpDeadlineTime,
        String timeZone,
        long version) {

    static WeddingSettingsResponse empty(String timeZone) {
        return new WeddingSettingsResponse(false, "", null, null, "", null, null, timeZone, 0);
    }
}

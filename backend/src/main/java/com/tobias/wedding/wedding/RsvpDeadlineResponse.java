package com.tobias.wedding.wedding;

import java.time.LocalDate;
import java.time.LocalTime;

record RsvpDeadlineResponse(
        boolean configured,
        LocalDate deadlineDate,
        LocalTime deadlineTime,
        String timeZone) {

    static RsvpDeadlineResponse empty(String timeZone) {
        return new RsvpDeadlineResponse(false, null, null, timeZone);
    }
}

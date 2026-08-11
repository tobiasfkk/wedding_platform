package com.tobias.wedding.wedding;

public class RsvpDeadlineValidationException extends RuntimeException {

    private final String field;

    RsvpDeadlineValidationException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}

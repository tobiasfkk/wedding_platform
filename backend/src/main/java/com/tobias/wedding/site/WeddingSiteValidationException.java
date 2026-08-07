package com.tobias.wedding.site;

public class WeddingSiteValidationException extends RuntimeException {

    private final String field;

    WeddingSiteValidationException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}

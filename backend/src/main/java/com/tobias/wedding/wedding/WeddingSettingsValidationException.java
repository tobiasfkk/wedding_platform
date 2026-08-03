package com.tobias.wedding.wedding;

public class WeddingSettingsValidationException extends RuntimeException {

    private final String field;

    WeddingSettingsValidationException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}

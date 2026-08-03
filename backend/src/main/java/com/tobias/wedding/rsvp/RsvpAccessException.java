package com.tobias.wedding.rsvp;

public class RsvpAccessException extends RuntimeException {

    private final boolean rateLimited;

    RsvpAccessException(boolean rateLimited) {
        super("Invitation access rejected");
        this.rateLimited = rateLimited;
    }

    public boolean rateLimited() {
        return rateLimited;
    }
}

package com.tobias.wedding.auth;

public class AuthenticationRejectedException extends RuntimeException {

    private final boolean rateLimited;

    AuthenticationRejectedException(boolean rateLimited) {
        super("Authentication rejected");
        this.rateLimited = rateLimited;
    }

    public boolean rateLimited() {
        return rateLimited;
    }
}

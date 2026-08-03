package com.tobias.wedding.guest;

public class GuestFilterException extends RuntimeException {

    GuestFilterException() {
        super("O estado deve ser ALL, ACTIVE ou INACTIVE.");
    }
}

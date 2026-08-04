package com.tobias.wedding.rsvp;

public class RsvpDashboardFilterException extends RuntimeException {

    RsvpDashboardFilterException() {
        super("O estado informado para o dashboard é inválido.");
    }
}

package com.tobias.wedding.invitation;

public class InvitationNotFoundException extends RuntimeException {

    InvitationNotFoundException() {
        super("Convite não encontrado.");
    }
}

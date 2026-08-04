package com.tobias.wedding.invitation;

public class InvitationNotFoundException extends RuntimeException {

    public InvitationNotFoundException() {
        super("Convite não encontrado.");
    }
}

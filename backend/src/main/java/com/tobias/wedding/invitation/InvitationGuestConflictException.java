package com.tobias.wedding.invitation;

public class InvitationGuestConflictException extends RuntimeException {

    InvitationGuestConflictException() {
        super("Um ou mais convidados já pertencem a outro convite.");
    }
}

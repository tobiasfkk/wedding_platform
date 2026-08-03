package com.tobias.wedding.invitation;

public class InvitationFilterException extends RuntimeException {

    InvitationFilterException() {
        super("O estado deve ser ALL, DRAFT, ACTIVE ou INACTIVE.");
    }
}

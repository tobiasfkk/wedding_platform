package com.tobias.wedding.rsvp;

public class RsvpSubmissionException extends RuntimeException {

    public RsvpSubmissionException() {
        super("As respostas não correspondem aos participantes atuais deste convite.");
    }

    static RsvpSubmissionException reusedOperation() {
        return new RsvpSubmissionException("O identificador da operação já foi usado com outros dados.");
    }

    private RsvpSubmissionException(String message) {
        super(message);
    }
}

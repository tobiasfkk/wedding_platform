package com.tobias.wedding.rsvp;

public class RsvpSubmissionException extends RuntimeException {

    public RsvpSubmissionException() {
        super("As respostas não correspondem aos participantes atuais deste convite.");
    }

    static RsvpSubmissionException reusedOperation() {
        return new RsvpSubmissionException("O identificador da operação já foi usado com outros dados.");
    }

    static RsvpSubmissionException invalidCompanions() {
        return new RsvpSubmissionException("Os acompanhantes informados não são válidos para este convite.");
    }

    static RsvpSubmissionException companionLimitExceeded() {
        return new RsvpSubmissionException("O limite de acompanhantes deste convite foi excedido.");
    }

    static RsvpSubmissionException deadlinePassed() {
        return new RsvpSubmissionException(
                "O prazo para alterar a confirmação de presença já foi encerrado.");
    }

    static RsvpSubmissionException replacementConfirmationRequired() {
        return new RsvpSubmissionException(
                "Confirme a substituição da resposta atual antes de salvar a correção administrativa.");
    }

    private RsvpSubmissionException(String message) {
        super(message);
    }
}

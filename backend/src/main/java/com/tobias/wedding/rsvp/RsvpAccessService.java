package com.tobias.wedding.rsvp;

import com.tobias.wedding.invitation.InvitationAccessView;
import com.tobias.wedding.invitation.InvitationCodeVerifier;
import com.tobias.wedding.invitation.VerifiedInvitationAccess;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
class RsvpAccessService {

    static final String INVITATION_SESSION_ATTRIBUTE = "rsvpInvitationId";
    static final String ACCESS_CODE_SESSION_ATTRIBUTE = "rsvpAccessCodeId";

    private final InvitationCodeVerifier verifier;
    private final RsvpAccessAttemptService attempts;

    RsvpAccessService(InvitationCodeVerifier verifier, RsvpAccessAttemptService attempts) {
        this.verifier = verifier;
        this.attempts = attempts;
    }

    InvitationAccessView exchange(String code, HttpServletRequest request) {
        String origin = request.getRemoteAddr();
        if (attempts.isBlocked(origin)) {
            throw new RsvpAccessException(true);
        }
        Optional<VerifiedInvitationAccess> verified = verifier.verifyAccess(code);
        if (verified.isEmpty()) {
            attempts.recordFailure(origin);
            throw new RsvpAccessException(false);
        }
        VerifiedInvitationAccess access = verified.get();
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute(INVITATION_SESSION_ATTRIBUTE, access.invitationId().toString());
        session.setAttribute(ACCESS_CODE_SESSION_ATTRIBUTE, access.accessCodeId().toString());
        return access.invitation();
    }

    Optional<InvitationAccessView> current(HttpSession session) {
        Object invitationValue = session.getAttribute(INVITATION_SESSION_ATTRIBUTE);
        Object accessCodeValue = session.getAttribute(ACCESS_CODE_SESSION_ATTRIBUTE);
        if (!(invitationValue instanceof String invitationId)
                || !(accessCodeValue instanceof String accessCodeId)) {
            return Optional.empty();
        }
        try {
            Optional<InvitationAccessView> access = verifier.findActiveAccess(
                    UUID.fromString(invitationId), UUID.fromString(accessCodeId));
            if (access.isEmpty()) {
                clear(session);
            }
            return access;
        } catch (IllegalArgumentException exception) {
            clear(session);
            return Optional.empty();
        }
    }

    private void clear(HttpSession session) {
        session.removeAttribute(INVITATION_SESSION_ATTRIBUTE);
        session.removeAttribute(ACCESS_CODE_SESSION_ATTRIBUTE);
    }
}

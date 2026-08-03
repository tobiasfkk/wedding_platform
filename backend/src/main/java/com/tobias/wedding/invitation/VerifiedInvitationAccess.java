package com.tobias.wedding.invitation;

import java.util.UUID;

public record VerifiedInvitationAccess(
        UUID accessCodeId,
        UUID invitationId,
        InvitationAccessView invitation) {}

package com.tobias.wedding.rsvp;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RsvpSubmissionRepository extends JpaRepository<RsvpSubmission, UUID> {}

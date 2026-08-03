package com.tobias.wedding.auth;

import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
class AdminSessionController {

    @GetMapping("/me")
    AuthController.SessionResponse me(Principal principal) {
        return new AuthController.SessionResponse(true, principal.getName(), null);
    }
}

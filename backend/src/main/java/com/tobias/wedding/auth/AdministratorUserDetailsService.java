package com.tobias.wedding.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
class AdministratorUserDetailsService implements UserDetailsService {

    private final ObjectProvider<AdministratorRepository> administrators;

    AdministratorUserDetailsService(ObjectProvider<AdministratorRepository> administrators) {
        this.administrators = administrators;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        AdministratorRepository repository = administrators.getIfAvailable();
        if (repository == null) {
            throw new UsernameNotFoundException("Invalid credentials");
        }
        Administrator administrator = repository
                .findByEmail(Administrator.normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));

        return User.withUsername(administrator.email())
                .password(administrator.passwordHash())
                .roles("ADMIN")
                .disabled(!administrator.enabled())
                .build();
    }
}

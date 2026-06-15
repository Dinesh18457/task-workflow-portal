package com.taskflow.config;

import com.taskflow.entity.User;
import com.taskflow.model.Role;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUser("admin", "admin@taskflow.local", Role.ADMIN);
        seedUser("manager", "manager@taskflow.local", Role.MANAGER);
        seedUser("user1", "user1@taskflow.local", Role.USER);
    }

    private void seedUser(String username, String email, Role role) {
        userRepository.findByUsername(username).ifPresentOrElse(
                user -> {
                    if (!passwordEncoder.matches("password123", user.getPassword())) {
                        user.setPassword(passwordEncoder.encode("password123"));
                        userRepository.save(user);
                    }
                },
                () -> userRepository.save(User.builder()
                        .username(username)
                        .email(email)
                        .password(passwordEncoder.encode("password123"))
                        .role(role)
                        .active(true)
                        .build()));
    }
}

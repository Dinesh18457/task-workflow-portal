package com.taskflow.service;

import com.taskflow.dto.AuthRequest;
import com.taskflow.dto.AuthResponse;
import com.taskflow.dto.RegisterRequest;
import com.taskflow.entity.User;
import com.taskflow.model.Role;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.JwtService;
import com.taskflow.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse login(AuthRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        String token = jwtService.generateToken(principal);
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(principal.getId())
                .username(principal.getUsername())
                .role(principal.getRole())
                .build();
    }

    @Transactional
    public User registerPublic(RegisterRequest request) {
        return saveUser(request, Role.USER);
    }

    @Transactional
    public User registerByAdmin(RegisterRequest request) {
        Role role = request.getRole() != null ? request.getRole() : Role.USER;
        return saveUser(request, role);
    }

    private User saveUser(RegisterRequest request, Role role) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .active(true)
                .build();
        return userRepository.save(user);
    }
}

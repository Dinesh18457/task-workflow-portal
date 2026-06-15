package com.taskflow.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/workspace")
@RequiredArgsConstructor
public class WorkspaceController {

    @GetMapping("/files")
    public ResponseEntity<List<String>> listFiles() {
        try {
            java.nio.file.Path backendPath = java.nio.file.Paths.get("").toAbsolutePath();
            java.nio.file.Path projectRoot = backendPath.getParent() != null ? backendPath.getParent() : backendPath;
            
            List<String> files = new ArrayList<>();
            java.nio.file.Files.walk(projectRoot)
                .filter(java.nio.file.Files::isRegularFile)
                .forEach(path -> {
                    String relative = projectRoot.relativize(path).toString().replace('\\', '/');
                    // Filter out build/git/venv/IDE settings directories
                    if (!relative.startsWith(".git/") &&
                        !relative.contains("/node_modules/") &&
                        !relative.contains("/target/") &&
                        !relative.contains("/venv/") &&
                        !relative.contains("/.idea/") &&
                        !relative.contains("/.mvn/") &&
                        !relative.startsWith("node_modules/") &&
                        !relative.startsWith("target/") &&
                        !relative.startsWith("venv/") &&
                        !relative.startsWith(".idea/") &&
                        !relative.startsWith(".mvn/")) {
                        files.add(relative);
                    }
                });
            Collections.sort(files);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

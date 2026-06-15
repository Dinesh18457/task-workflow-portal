package com.taskflow.controller;

import com.taskflow.dto.StatusUpdateRequest;
import com.taskflow.dto.TaskRequest;
import com.taskflow.dto.TaskResponse;
import com.taskflow.entity.TaskStatusHistory;
import com.taskflow.model.TaskStatus;
import com.taskflow.security.UserPrincipal;
import com.taskflow.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) TaskStatus status) {
        return ResponseEntity.ok(taskService.listTasks(principal, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(taskService.getTask(id, principal));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(
            @Valid @RequestBody TaskRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(taskService.createTask(request, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(taskService.updateTask(id, request, principal));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(taskService.updateStatus(id, request, principal));
    }

    @PatchMapping("/{id}/file-path")
    public ResponseEntity<TaskResponse> updateFilePath(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String filePath = request.get("filePath");
        return ResponseEntity.ok(taskService.updateFilePath(id, filePath, principal));
    }

    @PostMapping("/{id}/open-file")
    public ResponseEntity<Void> openFile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        taskService.openTaskFile(id, principal);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<TaskResponse> review(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean approved = (Boolean) request.getOrDefault("approved", false);
        String comments = (String) request.get("comments");
        return ResponseEntity.ok(taskService.reviewTask(id, approved, comments, principal));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        taskService.deleteTask(id, principal);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<Map<String, Object>>> history(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<TaskStatusHistory> rows = taskService.getHistory(id, principal);
        List<Map<String, Object>> body = rows.stream()
                .map(h -> Map.<String, Object>of(
                        "id", h.getId(),
                        "oldStatus", h.getOldStatus() != null ? h.getOldStatus().name() : null,
                        "newStatus", h.getNewStatus().name(),
                        "changedBy", h.getChangedBy().getUsername(),
                        "changedAt", h.getChangedAt().toString(),
                        "note", h.getNote() != null ? h.getNote() : ""))
                .toList();
        return ResponseEntity.ok(body);
    }
}

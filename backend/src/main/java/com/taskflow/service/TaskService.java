package com.taskflow.service;

import com.taskflow.dto.StatusUpdateRequest;
import com.taskflow.dto.TaskRequest;
import com.taskflow.dto.TaskResponse;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskStatusHistory;
import com.taskflow.entity.User;
import com.taskflow.model.Role;
import com.taskflow.model.TaskPriority;
import com.taskflow.model.TaskStatus;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.TaskStatusHistoryRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskStatusHistoryRepository historyRepository;

    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(UserPrincipal principal, TaskStatus statusFilter) {
        List<Task> tasks = switch (principal.getRole()) {
            case ADMIN, MANAGER -> statusFilter != null
                    ? taskRepository.findByStatus(statusFilter)
                    : taskRepository.findAll();
            case USER -> {
                List<Task> mine = taskRepository.findByAssigneeIdOrCreatedById(principal.getId());
                yield statusFilter != null
                        ? mine.stream().filter(t -> t.getStatus() == statusFilter).toList()
                        : mine;
            }
        };
        return tasks.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(Long id, UserPrincipal principal) {
        Task task = taskRepository.findByIdWithUsers(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        assertCanView(task, principal);
        return toResponse(task);
    }

    @Transactional
    public TaskResponse createTask(TaskRequest request, UserPrincipal principal) {
        if (principal.getRole() == Role.USER) {
            throw new AccessDeniedException("Users cannot create tasks");
        }
        User creator = userRepository.findById(principal.getId()).orElseThrow();
        User assignee = resolveAssignee(request.getAssigneeId());

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO)
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
                .assignee(assignee)
                .createdBy(creator)
                .dueDate(request.getDueDate())
                .filePath(request.getFilePath())
                .managerFeedback(request.getManagerFeedback())
                .build();
        task = taskRepository.save(task);
        recordHistory(task, null, task.getStatus(), creator, "Task created");
        return toResponse(task);
    }

    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest request, UserPrincipal principal) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        assertCanModify(task, principal);

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getFilePath() != null) task.setFilePath(request.getFilePath());
        if (request.getManagerFeedback() != null) task.setManagerFeedback(request.getManagerFeedback());
        if (principal.getRole() != Role.USER) {
            task.setAssignee(
                    request.getAssigneeId() != null ? resolveAssignee(request.getAssigneeId()) : null);
        }
        if (request.getStatus() != null && principal.getRole() != Role.USER) {
            TaskStatus old = task.getStatus();
            task.setStatus(request.getStatus());
            recordHistory(task, old, request.getStatus(), getUser(principal.getId()),
                    "Status updated via task edit");
        }
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateStatus(Long id, StatusUpdateRequest request, UserPrincipal principal) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        assertCanUpdateStatus(task, principal);

        TaskStatus old = task.getStatus();
        task.setStatus(request.getStatus());
        taskRepository.save(task);
        recordHistory(task, old, request.getStatus(), getUser(principal.getId()), request.getNote());
        return toResponse(task);
    }

    @Transactional
    public void deleteTask(Long id, UserPrincipal principal) {
        if (principal.getRole() == Role.USER) {
            throw new AccessDeniedException("Users cannot delete tasks");
        }
        if (!taskRepository.existsById(id)) {
            throw new IllegalArgumentException("Task not found");
        }
        taskRepository.deleteById(id);
    }

    public List<TaskStatusHistory> getHistory(Long taskId, UserPrincipal principal) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        assertCanView(task, principal);
        return historyRepository.findByTaskIdOrderByChangedAtDesc(taskId);
    }

    @Transactional
    public TaskResponse updateFilePath(Long id, String filePath, UserPrincipal principal) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        
        if (principal.getRole() != Role.ADMIN && principal.getRole() != Role.MANAGER) {
            if (task.getAssignee() == null || !task.getAssignee().getId().equals(principal.getId())) {
                throw new AccessDeniedException("Only the assignee or managers can set the file path");
            }
        }
        
        task.setFilePath(filePath);
        taskRepository.save(task);
        recordHistory(task, task.getStatus(), task.getStatus(), getUser(principal.getId()), "File path updated to: " + filePath);
        return toResponse(task);
    }

    @Transactional(readOnly = true)
    public void openTaskFile(Long id, UserPrincipal principal) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        
        assertCanView(task, principal);
        
        String filePath = task.getFilePath();
        if (filePath == null || filePath.trim().isEmpty()) {
            throw new IllegalArgumentException("No file path associated with this task");
        }
        
        try {
            java.nio.file.Path backendPath = java.nio.file.Paths.get("").toAbsolutePath();
            java.nio.file.Path projectRoot = backendPath.getParent() != null ? backendPath.getParent() : backendPath;
            java.nio.file.Path resolvedPath = projectRoot.resolve(filePath).normalize().toAbsolutePath();
            
            if (!java.nio.file.Files.exists(resolvedPath)) {
                throw new IllegalArgumentException("File does not exist: " + filePath);
            }
            
            String os = System.getProperty("os.name").toLowerCase();
            ProcessBuilder pb;
            if (os.contains("win")) {
                pb = new ProcessBuilder("cmd.exe", "/c", "start", "", resolvedPath.toString());
            } else if (os.contains("mac")) {
                pb = new ProcessBuilder("open", resolvedPath.toString());
            } else {
                pb = new ProcessBuilder("xdg-open", resolvedPath.toString());
            }
            pb.start();
        } catch (Exception e) {
            throw new RuntimeException("Failed to open file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public TaskResponse reviewTask(Long id, boolean approved, String comments, UserPrincipal principal) {
        if (principal.getRole() != Role.MANAGER && principal.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only managers or admins can review tasks");
        }

        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (task.getStatus() != TaskStatus.IN_REVIEW) {
            throw new IllegalArgumentException("Task is not in review status");
        }

        User reviewer = getUser(principal.getId());
        TaskStatus oldStatus = task.getStatus();

        if (approved) {
            User adminUser = userRepository.findByUsername("admin")
                    .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
            
            task.setStatus(TaskStatus.DONE);
            task.setAssignee(adminUser);
            task.setManagerFeedback("Approved and sent to Admin.");
            recordHistory(task, oldStatus, TaskStatus.DONE, reviewer, "Approved and sent to Admin. " + (comments != null ? comments : ""));
        } else {
            task.setStatus(TaskStatus.IN_PROGRESS);
            task.setManagerFeedback(comments != null ? comments : "Manager requested changes.");
            recordHistory(task, oldStatus, TaskStatus.IN_PROGRESS, reviewer, "Rejected by Manager. Feedback: " + (comments != null ? comments : ""));
        }

        return toResponse(taskRepository.save(task));
    }

    private void assertCanView(Task task, UserPrincipal principal) {
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.MANAGER) return;
        boolean involved = task.getAssignee() != null && task.getAssignee().getId().equals(principal.getId())
                || task.getCreatedBy().getId().equals(principal.getId());
        if (!involved) throw new AccessDeniedException("Access denied");
    }

    private void assertCanModify(Task task, UserPrincipal principal) {
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.MANAGER) return;
        throw new AccessDeniedException("Users cannot modify task details");
    }

    private void assertCanUpdateStatus(Task task, UserPrincipal principal) {
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.MANAGER) return;
        if (task.getAssignee() != null && task.getAssignee().getId().equals(principal.getId())) return;
        throw new AccessDeniedException("Only assignee or managers can update status");
    }

    private User resolveAssignee(Long assigneeId) {
        if (assigneeId == null) return null;
        return userRepository.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    private void recordHistory(Task task, TaskStatus old, TaskStatus newStatus, User user, String note) {
        historyRepository.save(TaskStatusHistory.builder()
                .task(task)
                .oldStatus(old)
                .newStatus(newStatus)
                .changedBy(user)
                .note(note)
                .build());
    }

    private TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getUsername() : null)
                .createdById(task.getCreatedBy().getId())
                .createdByName(task.getCreatedBy().getUsername())
                .dueDate(task.getDueDate())
                .filePath(task.getFilePath())
                .managerFeedback(task.getManagerFeedback())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}

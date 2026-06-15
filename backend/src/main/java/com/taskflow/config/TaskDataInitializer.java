package com.taskflow.config;

import com.taskflow.entity.Task;
import com.taskflow.entity.TaskStatusHistory;
import com.taskflow.entity.User;
import com.taskflow.model.TaskPriority;
import com.taskflow.model.TaskStatus;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.TaskStatusHistoryRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

@Component
@Order(2)
@RequiredArgsConstructor
public class TaskDataInitializer implements CommandLineRunner {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskStatusHistoryRepository historyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Force reset the password to exactly match the username for existing records
        resetExistingUserPassword("admin", "admin");
        resetExistingUserPassword("manager", "manager");
        resetExistingUserPassword("user1", "user1");

        // Prevent task duplication check
        if (taskRepository.count() > 0) return;

        // Verify users exist before generating tasks
        if (!userRepository.findByUsername("admin").isPresent() ||
                !userRepository.findByUsername("manager").isPresent() ||
                !userRepository.findByUsername("user1").isPresent()) {
            return;
        }

        User admin = userRepository.findByUsername("admin").orElseThrow();
        User manager = userRepository.findByUsername("manager").orElseThrow();
        User user1 = userRepository.findByUsername("user1").orElseThrow();

        Task t1 = saveTask("Setup project repository", "Initialize monorepo and CI", TaskStatus.DONE,
                TaskPriority.HIGH, user1, admin, 7);
        Task t2 = saveTask("Design database schema", "PostgreSQL tables and indexes", TaskStatus.DONE,
                TaskPriority.HIGH, manager, admin, 5);
        Task t3 = saveTask("Implement JWT authentication", "Spring Security RBAC",
                TaskStatus.IN_PROGRESS, TaskPriority.URGENT, manager, admin, 10);
        Task t4 = saveTask("Build React dashboard", "Task UI, filters, and workflow", TaskStatus.TODO,
                TaskPriority.MEDIUM, user1, manager, 14);
        Task t5 = saveTask("Configure FastAPI gateway", "API proxy and CORS", TaskStatus.TODO,
                TaskPriority.MEDIUM, manager, admin, 12);
        saveTask("Write API integration tests", "Cover auth and task endpoints", TaskStatus.IN_REVIEW,
                TaskPriority.HIGH, user1, manager, 8);
        saveTask("Deploy staging environment", "Docker compose on staging VM", TaskStatus.BLOCKED,
                TaskPriority.URGENT, manager, admin, 3);
        saveTask("Onboard new team member", "Access, docs, and first task assignment", TaskStatus.TODO,
                TaskPriority.LOW, user1, manager, 21);

        history(t1, null, TaskStatus.TODO, admin, "Task created");
        history(t1, TaskStatus.TODO, TaskStatus.IN_PROGRESS, admin, "Work started");
        history(t1, TaskStatus.IN_PROGRESS, TaskStatus.DONE, admin, "Completed");
        history(t3, null, TaskStatus.TODO, admin, "Task created");
        history(t3, TaskStatus.TODO, TaskStatus.IN_PROGRESS, manager, "Assigned to manager");
        history(t4, null, TaskStatus.TODO, manager, "Demo task for dashboard");
        history(t5, null, TaskStatus.TODO, admin, "Demo task for gateway");
    }

    private void resetExistingUserPassword(String username, String rawPassword) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
    }

    private Task saveTask(String title, String desc, TaskStatus status, TaskPriority priority,
                          User assignee, User creator, int dueDays) {
        // Fallback build architecture block if Lombok builder faces compilation scope flags
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(desc);
        task.setStatus(status);
        task.setPriority(priority);
        task.setAssignee(assignee);
        task.setCreatedBy(creator);
        task.setDueDate(LocalDate.now().plusDays(dueDays));
        return taskRepository.save(task);
    }

    private void history(Task task, TaskStatus old, TaskStatus newStatus, User by, String note) {
        TaskStatusHistory history = new TaskStatusHistory();
        history.setTask(task);
        history.setOldStatus(old);
        history.setNewStatus(newStatus);
        history.setChangedBy(by);
        history.setNote(note);
        historyRepository.save(history);
    }
}
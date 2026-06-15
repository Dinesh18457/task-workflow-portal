package com.taskflow.repository;

import com.taskflow.entity.Task;
import com.taskflow.model.TaskStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @EntityGraph(attributePaths = {"assignee", "createdBy"})
    List<Task> findAll();

    @EntityGraph(attributePaths = {"assignee", "createdBy"})
    List<Task> findByStatus(TaskStatus status);

    @EntityGraph(attributePaths = {"assignee", "createdBy"})
    @Query("SELECT t FROM Task t WHERE t.assignee.id = :userId OR t.createdBy.id = :userId")
    List<Task> findByAssigneeIdOrCreatedById(@Param("userId") Long userId);

    @EntityGraph(attributePaths = {"assignee", "createdBy"})
    @Query("SELECT t FROM Task t WHERE t.id = :id")
    java.util.Optional<Task> findByIdWithUsers(@Param("id") Long id);
}

import { api } from '../api/client';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

function formatStatus(status) {
  return status ? status.replace(/_/g, ' ') : '—';
}

function formatDate(value) {
  if (!value) return '—';
  return value;
}

export default function TaskTable({ tasks, onEdit, onRefresh, canEdit, canDelete }) {
  async function handleStatusChange(task, newStatus) {
    if (newStatus === task.status) return;
    try {
      await api.updateStatus(task.id, newStatus, 'Status changed from table');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleOpenFile(task) {
    try {
      await api.openTaskFile(task.id);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="task-table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Coding File</th>
            <th>Created by</th>
            <th>Due date</th>
            <th>Updated</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{task.id}</td>
              <td>
                <strong>{task.title}</strong>
                {task.description && (
                  <span className="task-table-desc">{task.description}</span>
                )}
              </td>
              <td>
                {canEdit ? (
                  <select
                    className="table-select"
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{formatStatus(s)}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`badge badge-${task.status.toLowerCase()}`}>
                    {formatStatus(task.status)}
                  </span>
                )}
              </td>
              <td>
                <span className={`badge badge-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </td>
              <td>{task.assigneeName || 'Unassigned'}</td>
              <td>
                {task.filePath ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent)' }} title={task.filePath}>
                      {task.filePath.split('/').pop()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.75rem',
                        borderColor: 'rgba(34, 197, 94, 0.4)',
                        color: 'var(--success)',
                        background: 'transparent'
                      }}
                      onClick={() => handleOpenFile(task)}
                    >
                      Open ↗
                    </button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>
                )}
              </td>
              <td>{task.createdByName}</td>
              <td>{formatDate(task.dueDate)}</td>
              <td>{task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : '—'}</td>
              {canEdit && (
                <td className="task-table-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => onEdit(task)}>
                    Edit
                  </button>
                  {canDelete && (
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(task)}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api, getAuthUser } from '../api/client';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

export default function TaskCard({ task, canEdit, canDelete, onEdit, onRefresh }) {
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const user = getAuthUser();
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [newPath, setNewPath] = useState(task.filePath || '');
  const [files, setFiles] = useState([]);
  const [savingPath, setSavingPath] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);

  // Review states
  const [reviewComments, setReviewComments] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isAssignee = Number(task.assigneeId) === Number(user?.userId);
  const canModifyFile = isAssignee || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isReviewable = task.status === 'IN_REVIEW' && isManagerOrAdmin;

  useEffect(() => {
    if (canModifyFile) {
      api.getWorkspaceFiles()
        .then(setFiles)
        .catch((err) => console.error('Failed to load workspace files', err));
    }
  }, [canModifyFile]);

  useEffect(() => {
    setNewPath(task.filePath || '');
  }, [task.filePath]);

  async function handleStatusChange(newStatus) {
    if (newStatus === task.status) return;
    setUpdating(true);
    try {
      await api.updateStatus(task.id, newStatus, 'Status changed from dashboard');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function loadHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    try {
      const data = await api.getHistory(task.id);
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(task.id);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSavePath() {
    setSavingPath(true);
    try {
      await api.updateFilePath(task.id, newPath);
      setIsEditingPath(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPath(false);
    }
  }

  async function handleOpenFile() {
    setOpeningFile(true);
    try {
      await api.openTaskFile(task.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setOpeningFile(false);
    }
  }

  async function handleReviewSubmit(approved) {
    if (!approved && !reviewComments.trim()) {
      alert('Please provide comments/suggestions when requesting changes.');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.reviewTask(task.id, approved, reviewComments);
      setReviewComments('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <article className="task-card">
      <div className="task-card-header">
        <h3>{task.title}</h3>
        <span className={`badge badge-${task.status.toLowerCase()}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
      {task.description && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{task.description}</p>}
      <div className="task-meta">
        <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
        {task.assigneeName && <span>Assignee: {task.assigneeName}</span>}
        <span>By: {task.createdByName}</span>
        {task.dueDate && <span>Due: {task.dueDate}</span>}
      </div>

      {/* File Path Section */}
      <div className="task-file-section" style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--text)' }}>Coding File</strong>
          {canModifyFile && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => {
                setIsEditingPath(!isEditingPath);
                setNewPath(task.filePath || '');
              }}
            >
              {isEditingPath ? 'Cancel' : task.filePath ? 'Change' : 'Set File'}
            </button>
          )}
        </div>

        {isEditingPath ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              list={`workspace-files-${task.id}`}
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="Select file..."
              style={{
                flex: 1,
                padding: '0.35rem 0.6rem',
                fontSize: '0.8rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)'
              }}
            />
            <datalist id={`workspace-files-${task.id}`}>
              {files.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={handleSavePath}
              disabled={savingPath}
            >
              {savingPath ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{
              fontFamily: 'monospace',
              color: task.filePath ? 'var(--accent)' : 'var(--muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '70%'
            }} title={task.filePath || 'No file assigned'}>
              {task.filePath || 'No file assigned'}
            </span>
            {task.filePath && (
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)'
                }}
                onClick={handleOpenFile}
                disabled={openingFile}
              >
                {openingFile ? 'Opening...' : 'Open File ↗'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manager Feedback (if not in review status) */}
      {task.managerFeedback && task.status !== 'IN_REVIEW' && (
        <div className="manager-feedback-display" style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(59, 130, 246, 0.08)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: '4px',
          fontSize: '0.82rem'
        }}>
          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Manager Feedback
          </span>
          <p style={{ fontStyle: 'italic', color: 'var(--text)' }}>
            "{task.managerFeedback}"
          </p>
        </div>
      )}

      {/* Review Actions Panel */}
      {isReviewable && (
        <div className="manager-review-box" style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px dashed var(--warning)',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.5rem' }}>
            Review Pending
          </strong>
          <textarea
            value={reviewComments}
            onChange={(e) => setReviewComments(e.target.value)}
            placeholder="Suggest comments or feedback here..."
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              fontSize: '0.8rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              minHeight: '60px',
              marginBottom: '0.5rem',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '0.35rem',
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)'
              }}
              onClick={() => handleReviewSubmit(true)}
              disabled={submittingReview}
            >
              Approve (Send to Admin)
            </button>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                padding: '0.35rem',
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)'
              }}
              onClick={() => handleReviewSubmit(false)}
              disabled={submittingReview}
            >
              Suggest Comments
            </button>
          </div>
        </div>
      )}

      <div className="task-actions" style={{ marginTop: '0.75rem' }}>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updating}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost" onClick={loadHistory}>
          {showHistory ? 'Hide history' : 'History'}
        </button>
        {canEdit && onEdit && (
          <button type="button" className="btn btn-ghost" onClick={() => onEdit(task)}>
            Edit
          </button>
        )}
        {canDelete && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>
      {showHistory && history && (
        <ul className="history-list">
          {history.length === 0 ? (
            <li>No history</li>
          ) : (
            history.map((h) => (
              <li key={h.id}>
                {h.oldStatus || '—'} → {h.newStatus} by {h.changedBy} ({new Date(h.changedAt).toLocaleString()})
                {h.note ? ` — ${h.note}` : ''}
              </li>
            ))
          )}
        </ul>
      )}
    </article>
  );
}

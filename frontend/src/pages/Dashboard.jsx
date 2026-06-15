import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearAuth, getAuthUser } from '../api/client';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import TaskTable from '../components/TaskTable';
import UserFormModal from '../components/UserFormModal';
import UsersTable from '../components/UsersTable';

const FILTERS = [
  { label: 'All tasks', value: '' },
  { label: 'To do', value: 'TODO' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'In review', value: 'IN_REVIEW' },
  { label: 'Done', value: 'DONE' },
  { label: 'Blocked', value: 'BLOCKED' },
];

export default function Dashboard() {
  const user = getAuthUser();
  const navigate = useNavigate();
  const [section, setSection] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [modal, setModal] = useState(null);
  const [userModal, setUserModal] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isManagerView = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canCreate = isManagerView;
  const canDelete = canCreate;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTasks(filter || undefined);
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUserError('');
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setUserError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'tasks') loadTasks();
  }, [section, loadTasks]);

  useEffect(() => {
    if (isManagerView) {
      api.getUsers().then(setUsers).catch(() => {});
    }
  }, [isManagerView]);

  useEffect(() => {
    if (section === 'users' && isAdmin) loadUsers();
  }, [section, isAdmin, loadUsers]);

  useEffect(() => {
    setUserSuccess('');
    setUserError('');
  }, [section]);

  function logout() {
    clearAuth();
    navigate('/login');
  }

  async function handleSave(body) {
    if (modal?.task) {
      await api.updateTask(modal.task.id, body);
    } else {
      await api.createTask(body);
    }
    await loadTasks();
  }

  async function handleCreateUser(body) {
    await api.registerUser(body);
    setUserSuccess(`User "${body.username}" created successfully.`);
    await loadUsers();
    api.getUsers().then(setUsers).catch(() => {});
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">Task<span>Flow</span></div>
        <div className="user-badge">
          <strong>{user?.username}</strong>
          <span className={`role-pill role-pill-${user?.role?.toLowerCase()}`}>{user?.role}</span>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Workspace</span>
          <button
            type="button"
            className={`nav-item ${section === 'tasks' ? 'active' : ''}`}
            onClick={() => setSection('tasks')}
          >
            Tasks
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`nav-item ${section === 'users' ? 'active' : ''}`}
              onClick={() => setSection('users')}
            >
              Team members
            </button>
          )}
        </nav>

        {section === 'tasks' && (
          <nav className="nav-filters">
            <span className="nav-label">Filter</span>
            {FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                className={filter === f.value ? 'active' : ''}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </nav>
        )}

        <button type="button" className="btn btn-ghost btn-block sidebar-logout" onClick={logout}>
          Sign out
        </button>
      </aside>

      <main className="main">
        {section === 'tasks' ? (
          <>
            <header className="header">
              <div>
                <h1>Task dashboard</h1>
                <p className="header-sub">Track assignments, status, and deadlines</p>
              </div>
              {canCreate && (
                <button type="button" className="btn btn-primary" onClick={() => setModal({ task: null })}>
                  + New task
                </button>
              )}
            </header>

            {error && <p className="alert alert-error">{error}</p>}

            <div className="stats-row">
              <div className="stat-card">
                <div className="label">Total</div>
                <div className="value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="label">To do</div>
                <div className="value">{stats.todo}</div>
              </div>
              <div className="stat-card">
                <div className="label">In progress</div>
                <div className="value">{stats.inProgress}</div>
              </div>
              <div className="stat-card">
                <div className="label">Done</div>
                <div className="value">{stats.done}</div>
              </div>
            </div>

            {loading ? (
              <p className="empty-state">Loading tasks…</p>
            ) : tasks.length === 0 ? (
              <p className="empty-state">No tasks found for this filter.</p>
            ) : isManagerView ? (
              <TaskTable
                tasks={tasks}
                canEdit={canCreate}
                canDelete={canDelete}
                onEdit={(task) => setModal({ task })}
                onRefresh={loadTasks}
              />
            ) : (
              <div className="task-grid">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEdit={canCreate}
                    canDelete={canDelete}
                    onEdit={(task) => setModal({ task })}
                    onRefresh={loadTasks}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <header className="header">
              <div>
                <h1>Team members</h1>
                <p className="header-sub">Create managers, users, and other admins</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setUserSuccess('');
                  setUserModal(true);
                }}
              >
                + Add user
              </button>
            </header>

            {userSuccess && <p className="alert alert-success">{userSuccess}</p>}
            {userError && <p className="alert alert-error">{userError}</p>}

            {usersLoading ? (
              <p className="empty-state">Loading users…</p>
            ) : (
              <UsersTable users={users} />
            )}
          </>
        )}
      </main>

      {modal && (
        <TaskFormModal
          task={modal.task}
          users={users}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {userModal && (
        <UserFormModal
          onClose={() => setUserModal(false)}
          onSave={handleCreateUser}
        />
      )}
    </div>
  );
}

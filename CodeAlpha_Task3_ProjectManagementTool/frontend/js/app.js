/* ==========================================================================
   PULSEWORK - FRONTEND JAVASCRIPT APPLICATION
   Real-Time Collaborative Project Management Tool
   ========================================================================== */

const API_BASE = '/api';

// Global Application State
const state = {
  token: localStorage.getItem('pulse_token') || null,
  currentUser: null,
  projects: [],
  currentProject: null,
  allUsers: [],
  currentTaskDetail: null,
  currentView: 'dashboard', // 'dashboard', 'project', 'my-tasks'
  boardViewMode: 'kanban',  // 'kanban' or 'list'
  socket: null,
  draggedTaskId: null
};

// ==========================================================================
// 1. API HELPER & SOCKET INITIALIZATION
// ==========================================================================

async function apiCall(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const config = { method, headers };
  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    if (res.status === 401 || res.status === 403) {
      if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
        logout();
      }
    }
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Server request failed.');
    }
    return json;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}

function initSocket() {
  if (state.socket) return;

  // Initialize Socket.io connection
  state.socket = io(window.location.origin);

  state.socket.on('connect', () => {
    console.log('⚡ Connected to Socket.io real-time server.');
    const statusEl = document.getElementById('socket-status');
    if (statusEl) statusEl.classList.remove('hidden');

    if (state.currentUser) {
      state.socket.emit('user_login', state.currentUser.id);
    }
  });

  state.socket.on('user_notification', (data) => {
    if (data.userId === state.currentUser?.id) {
      showToast(data.title, data.message, 'fa-bell');
      fetchNotifications();
    }
  });

  // Project Level Real-time Events
  state.socket.on('task_moved', (data) => {
    if (state.currentProject && state.currentProject.id === data.task?.project_id) {
      console.log('Real-time task move received:', data);
      fetchProjectDetails(state.currentProject.id, false);
      showToast('Live Update', `${data.movedBy || 'A teammate'} moved task "${data.task.title}"`, 'fa-arrows-left-right');
    }
  });

  state.socket.on('task_created', (newTask) => {
    if (state.currentProject && state.currentProject.id === newTask.project_id) {
      fetchProjectDetails(state.currentProject.id, false);
      showToast('Live Update', `New task added: "${newTask.title}"`, 'fa-plus');
    }
  });

  state.socket.on('task_updated', (updatedTask) => {
    if (state.currentProject && state.currentProject.id === updatedTask.project_id) {
      fetchProjectDetails(state.currentProject.id, false);
    }
  });

  state.socket.on('task_deleted', (data) => {
    if (state.currentProject) {
      fetchProjectDetails(state.currentProject.id, false);
    }
  });

  state.socket.on('comment_added', (data) => {
    if (state.currentTaskDetail && state.currentTaskDetail.id === data.taskId) {
      loadTaskComments(data.taskId);
    }
    if (state.currentProject) {
      fetchProjectDetails(state.currentProject.id, false);
    }
  });

  state.socket.on('checklist_updated', (data) => {
    if (state.currentTaskDetail && state.currentTaskDetail.id === data.taskId) {
      loadTaskDetails(data.taskId);
    }
    if (state.currentProject) {
      fetchProjectDetails(state.currentProject.id, false);
    }
  });

  state.socket.on('column_created', () => {
    if (state.currentProject) fetchProjectDetails(state.currentProject.id, false);
  });
  state.socket.on('column_updated', () => {
    if (state.currentProject) fetchProjectDetails(state.currentProject.id, false);
  });
  state.socket.on('column_deleted', () => {
    if (state.currentProject) fetchProjectDetails(state.currentProject.id, false);
  });
}

// ==========================================================================
// 2. AUTHENTICATION & BOOTSTRAP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  bootstrapApp();
});

async function bootstrapApp() {
  if (!state.token) {
    showAuthScreen();
    return;
  }

  try {
    const user = await apiCall('/auth/me');
    state.currentUser = user;
    initSocket();
    showMainApp();
    await loadInitialData();
  } catch (err) {
    logout();
  }
}

function showAuthScreen() {
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
}

function showMainApp() {
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');

  // Set user profile details
  document.getElementById('user-display-name').textContent = state.currentUser.name;
  document.getElementById('user-display-email').textContent = state.currentUser.email;
  document.getElementById('user-avatar-img').src = state.currentUser.avatar;
  document.getElementById('welcome-heading').textContent = `Welcome back, ${state.currentUser.name.split(' ')[0]}!`;
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  const nameGroup = document.getElementById('name-group');
  const isRegistering = nameGroup.classList.contains('hidden');

  const titleEl = document.querySelector('.auth-brand p');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleMsg = document.getElementById('toggle-msg');
  const toggleLink = document.getElementById('toggle-auth-mode');

  if (isRegistering) {
    nameGroup.classList.remove('hidden');
    titleEl.textContent = 'Create your collaborative workspace account';
    submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Sign Up';
    toggleMsg.textContent = 'Already have an account?';
    toggleLink.textContent = 'Sign in';
  } else {
    nameGroup.classList.add('hidden');
    titleEl.textContent = 'Real-time Collaborative Workspace';
    submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    toggleMsg.textContent = "Don't have an account?";
    toggleLink.textContent = 'Create one now';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const nameGroup = document.getElementById('name-group');
  const isRegistering = !nameGroup.classList.contains('hidden');
  const errorEl = document.getElementById('auth-error');

  errorEl.classList.add('hidden');

  try {
    let res;
    if (isRegistering) {
      const name = document.getElementById('reg-name').value;
      res = await apiCall('/auth/register', 'POST', { name, email, password });
    } else {
      res = await apiCall('/auth/login', 'POST', { email, password });
    }

    state.token = res.token;
    state.currentUser = res.user;
    localStorage.setItem('pulse_token', res.token);

    initSocket();
    showMainApp();
    await loadInitialData();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

async function quickLogin(email, password) {
  document.getElementById('auth-email').value = email;
  document.getElementById('auth-password').value = password;
  const nameGroup = document.getElementById('name-group');
  if (!nameGroup.classList.contains('hidden')) {
    toggleAuthMode();
  }
  handleAuthSubmit(new Event('submit'));
}

function logout(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('pulse_token');
  state.token = null;
  state.currentUser = null;
  state.currentProject = null;
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  showAuthScreen();
}

// ==========================================================================
// 3. DATA LOADING & VIEW ROUTING
// ==========================================================================

async function loadInitialData() {
  await Promise.all([
    fetchProjects(),
    fetchAllUsers(),
    fetchNotifications()
  ]);
  renderDashboard();
}

async function fetchProjects() {
  state.projects = await apiCall('/projects');
  renderSidebarProjects();
}

async function fetchAllUsers() {
  state.allUsers = await apiCall('/auth/users');
}

async function fetchNotifications() {
  try {
    const res = await apiCall('/notifications');
    const badge = document.getElementById('notification-badge');
    if (res.unread_count > 0) {
      badge.textContent = res.unread_count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    const listEl = document.getElementById('notification-list');
    if (res.notifications.length === 0) {
      listEl.innerHTML = '<div class="empty-state-sm" style="padding:16px;text-align:center;color:var(--text-muted);">No notifications</div>';
      return;
    }

    listEl.innerHTML = res.notifications.map(n => `
      <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead(${n.id}, '${n.link || ''}')">
        <div class="notification-title">${escapeHTML(n.title)}</div>
        <div class="notification-desc">${escapeHTML(n.message)}</div>
        <div class="notification-time">${formatDate(n.created_at)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Notifications error:', err);
  }
}

function showView(viewName, projectId = null) {
  state.currentView = viewName;

  // Toggle active nav links
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.view-pane').forEach(el => el.classList.add('hidden'));

  const headerActions = document.getElementById('project-header-actions');
  const viewSwitcher = document.getElementById('board-view-switch');
  const addTaskBtn = document.getElementById('header-add-task-btn');

  if (viewName === 'dashboard') {
    document.getElementById('nav-dashboard').classList.add('active');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('view-title').textContent = 'Dashboard Overview';
    headerActions.classList.add('hidden');
    viewSwitcher.classList.add('hidden');
    addTaskBtn.classList.add('hidden');
    renderDashboard();
  } else if (viewName === 'my-tasks') {
    document.getElementById('nav-my-tasks').classList.add('active');
    document.getElementById('my-tasks-view').classList.remove('hidden');
    document.getElementById('view-title').textContent = 'My Assigned Tasks';
    headerActions.classList.add('hidden');
    viewSwitcher.classList.add('hidden');
    addTaskBtn.classList.add('hidden');
    renderMyTasks();
  } else if (viewName === 'project' && projectId) {
    document.getElementById(`nav-project-${projectId}`)?.classList.add('active');
    document.getElementById('project-view').classList.remove('hidden');
    headerActions.classList.remove('hidden');
    viewSwitcher.classList.remove('hidden');
    addTaskBtn.classList.remove('hidden');

    // Switch Socket room
    if (state.currentProject && state.socket) {
      state.socket.emit('leave_project', state.currentProject.id);
    }

    fetchProjectDetails(projectId, true);
  }
}

// ==========================================================================
// 4. DASHBOARD RENDERER
// ==========================================================================

function renderDashboard() {
  let totalTasks = 0;
  let completedTasks = 0;
  let assignedToMeCount = 0;

  state.projects.forEach(p => {
    totalTasks += p.task_count || 0;
  });

  document.getElementById('stat-total-projects').textContent = state.projects.length;
  document.getElementById('stat-total-tasks').textContent = totalTasks;

  const grid = document.getElementById('dashboard-projects-grid');
  if (state.projects.length === 0) {
    grid.innerHTML = `
      <div class="glass-panel" style="grid-column: 1/-1; padding: 40px; text-align: center;">
        <i class="fa-solid fa-folder-plus" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px;"></i>
        <h3>No Projects Yet</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">Create your first group project to start collaborating with team members.</p>
        <button class="btn btn-primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> Create Project</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.projects.map(p => `
    <div class="project-card" onclick="showView('project', ${p.id})">
      <div class="project-card-stripe" style="background: ${p.color}"></div>
      <div class="project-card-title">${escapeHTML(p.name)}</div>
      <div class="project-card-desc">${escapeHTML(p.description || 'No description provided.')}</div>
      <div class="project-card-footer">
        <span><i class="fa-solid fa-users"></i> ${p.member_count} Members</span>
        <span><i class="fa-solid fa-list-check"></i> ${p.task_count} Tasks</span>
      </div>
    </div>
  `).join('');
}

function renderSidebarProjects() {
  const container = document.getElementById('sidebar-projects-list');
  container.innerHTML = state.projects.map(p => `
    <a href="#" class="nav-item project-nav-item" id="nav-project-${p.id}" onclick="showView('project', ${p.id})">
      <span class="project-dot" style="background:${p.color}"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(p.name)}</span>
    </a>
  `).join('');
}

// ==========================================================================
// 5. PROJECT BOARD & KANBAN RENDERER
// ==========================================================================

async function fetchProjectDetails(projectId, firstLoad = false) {
  try {
    const project = await apiCall(`/projects/${projectId}`);
    state.currentProject = project;

    if (state.socket && firstLoad) {
      state.socket.emit('join_project', projectId);
    }

    document.getElementById('view-title').textContent = project.name;
    document.getElementById('project-color-badge').style.background = project.color;
    document.getElementById('project-member-count').textContent = project.members.length;

    renderBoardView();
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
    showView('dashboard');
  }
}

function switchBoardView(mode) {
  state.boardViewMode = mode;
  document.getElementById('btn-view-kanban').classList.toggle('active', mode === 'kanban');
  document.getElementById('btn-view-list').classList.toggle('active', mode === 'list');
  renderBoardView();
}

function renderBoardView() {
  if (!state.currentProject) return;

  const kanbanBoard = document.getElementById('kanban-board');
  const listBoard = document.getElementById('list-board');

  if (state.boardViewMode === 'kanban') {
    kanbanBoard.classList.remove('hidden');
    listBoard.classList.add('hidden');
    renderKanbanColumns();
  } else {
    kanbanBoard.classList.add('hidden');
    listBoard.classList.remove('hidden');
    renderListView();
  }
}

function renderKanbanColumns() {
  const container = document.getElementById('kanban-board');
  const columns = state.currentProject.columns || [];
  const tasks = state.currentProject.tasks || [];

  let html = columns.map(col => {
    const colTasks = tasks.filter(t => t.column_id === col.id);

    const cardsHtml = colTasks.map(task => renderTaskCardHTML(task)).join('');

    return `
      <div class="kanban-column" data-column-id="${col.id}">
        <div class="column-header">
          <div class="column-title-group">
            <span class="column-name">${escapeHTML(col.name)}</span>
            <span class="column-count">${colTasks.length}</span>
          </div>
          <button class="btn-icon btn-sm" onclick="openCreateTaskModal(${col.id})" title="Add card to column">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <div class="task-cards-list" 
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)" 
             ondrop="handleDrop(event, ${col.id})">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Add Column Button Card
  html += `
    <div style="min-width:260px;">
      <button class="btn btn-secondary btn-block" style="padding:16px; border-style:dashed;" onclick="openCreateColumnModal()">
        <i class="fa-solid fa-plus"></i> Add Another Column
      </button>
    </div>
  `;

  container.innerHTML = html;
}

function renderTaskCardHTML(task) {
  const assigneesHtml = (task.assignees || []).map(a => `
    <img src="${a.avatar}" title="${escapeHTML(a.name)}" class="avatar-stack">
  `).join('');

  return `
    <div class="task-card" draggable="true" 
         data-task-id="${task.id}"
         ondragstart="handleDragStart(event, ${task.id})" 
         ondragend="handleDragEnd(event)"
         onclick="openTaskDetailModal(${task.id})">
      <div class="task-card-header">
        <span class="priority-pill priority-${task.priority}">${task.priority}</span>
      </div>
      <div class="task-card-title">${escapeHTML(task.title)}</div>
      <div class="task-card-meta">
        <div class="meta-stats">
          ${task.checklist_total > 0 ? `
            <span class="meta-stat-item"><i class="fa-regular fa-square-check"></i> ${task.checklist_completed}/${task.checklist_total}</span>
          ` : ''}
          ${task.comment_count > 0 ? `
            <span class="meta-stat-item"><i class="fa-regular fa-comment"></i> ${task.comment_count}</span>
          ` : ''}
          ${task.due_date ? `
            <span class="meta-stat-item"><i class="fa-regular fa-calendar"></i> ${task.due_date}</span>
          ` : ''}
        </div>
        <div class="assignees-group">
          ${assigneesHtml}
        </div>
      </div>
    </div>
  `;
}

function renderListView() {
  const tbody = document.getElementById('list-board-body');
  const tasks = state.currentProject.tasks || [];
  const columns = state.currentProject.columns || [];

  if (tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">No tasks created in this project yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = tasks.map(t => {
    const col = columns.find(c => c.id === t.column_id);
    const assigneesStr = (t.assignees || []).map(a => a.name).join(', ') || 'Unassigned';

    return `
      <tr onclick="openTaskDetailModal(${t.id})" style="cursor:pointer;">
        <td><strong>${escapeHTML(t.title)}</strong></td>
        <td><span class="badge" style="background:rgba(255,255,255,0.08);color:var(--text-primary);">${escapeHTML(col ? col.name : 'Unknown')}</span></td>
        <td><span class="priority-pill priority-${t.priority}">${t.priority}</span></td>
        <td>${t.due_date || 'No due date'}</td>
        <td>${escapeHTML(assigneesStr)}</td>
        <td>${t.checklist_total > 0 ? `${t.checklist_completed}/${t.checklist_total}` : '-'}</td>
        <td>
          <button class="btn-icon btn-sm" onclick="event.stopPropagation(); openTaskDetailModal(${t.id})"><i class="fa-regular fa-eye"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// 6. DRAG & DROP HANDLERS FOR KANBAN
// ==========================================================================

function handleDragStart(e, taskId) {
  state.draggedTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', taskId);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.task-cards-list').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  const listEl = e.currentTarget;
  listEl.classList.add('drag-over');
}

function handleDragLeave(e) {
  const listEl = e.currentTarget;
  listEl.classList.remove('drag-over');
}

async function handleDrop(e, targetColumnId) {
  e.preventDefault();
  const listEl = e.currentTarget;
  listEl.classList.remove('drag-over');

  const taskId = state.draggedTaskId;
  if (!taskId) return;

  try {
    await apiCall(`/tasks/${taskId}/move`, 'PUT', { column_id: targetColumnId });
    // Local optimistic update
    fetchProjectDetails(state.currentProject.id, false);
  } catch (err) {
    showToast('Error', 'Failed to move task card.', 'fa-circle-exclamation');
  }
}

// ==========================================================================
// 7. TASK DETAILS & DISCUSSION MODAL
// ==========================================================================

async function openTaskDetailModal(taskId) {
  try {
    const task = await apiCall(`/tasks/${taskId}`);
    state.currentTaskDetail = task;

    document.getElementById('detail-task-title').textContent = task.title;
    document.getElementById('detail-task-desc').textContent = task.description || 'No description provided.';
    document.getElementById('detail-due-date-picker').value = task.due_date || '';
    document.getElementById('detail-created-at').textContent = formatDate(task.created_at);
    document.getElementById('detail-reporter').textContent = task.creator_name || 'System';

    // Priority tag
    const prioBadge = document.getElementById('detail-priority-badge');
    prioBadge.textContent = task.priority.toUpperCase();
    prioBadge.className = `badge priority-pill priority-${task.priority}`;

    // Column tag
    const col = state.currentProject?.columns.find(c => c.id === task.column_id);
    document.getElementById('detail-column-name').textContent = col ? col.name : 'Column';

    renderTaskChecklist(task.checklists || []);
    renderTaskAssignees(task.assignees || []);
    renderTaskComments(task.comments || []);

    // Populate Add Assignee Dropdown
    const select = document.getElementById('add-assignee-select');
    const existingUserIds = new Set((task.assignees || []).map(a => a.id));
    const availableUsers = (state.currentProject?.members || []).filter(m => !existingUserIds.has(m.id));

    select.innerHTML = '<option value="">+ Add Member...</option>' +
      availableUsers.map(u => `<option value="${u.id}">${escapeHTML(u.name)}</option>`).join('');

    openModal('task-detail-modal');
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function renderTaskChecklist(checklists) {
  const container = document.getElementById('checklist-items-container');
  const completed = checklists.filter(c => c.completed).length;
  const total = checklists.length;

  document.getElementById('checklist-progress-text').textContent = `${completed}/${total} Completed`;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  document.getElementById('checklist-progress-fill').style.width = `${pct}%`;

  if (total === 0) {
    container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);">No checklist items added yet.</div>';
    return;
  }

  container.innerHTML = checklists.map(item => `
    <div class="checklist-item ${item.completed ? 'done' : ''}">
      <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem(${item.id}, this.checked)">
      <span style="flex:1;">${escapeHTML(item.title)}</span>
      <button class="btn-icon btn-sm" onclick="deleteChecklistItem(${item.id})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

async function addChecklistItem() {
  const input = document.getElementById('new-checklist-input');
  const title = input.value.trim();
  if (!title || !state.currentTaskDetail) return;

  try {
    await apiCall(`/tasks/${state.currentTaskDetail.id}/checklists`, 'POST', { title });
    input.value = '';
    loadTaskDetails(state.currentTaskDetail.id);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function handleChecklistKeyPress(e) {
  if (e.key === 'Enter') addChecklistItem();
}

async function toggleChecklistItem(id, completed) {
  try {
    await apiCall(`/checklists/${id}`, 'PUT', { completed });
    loadTaskDetails(state.currentTaskDetail.id);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

async function deleteChecklistItem(id) {
  try {
    await apiCall(`/checklists/${id}`, 'DELETE');
    loadTaskDetails(state.currentTaskDetail.id);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function renderTaskAssignees(assignees) {
  const container = document.getElementById('detail-assignees-list');
  container.innerHTML = assignees.map(a => `
    <span class="badge" style="background:rgba(99, 102, 241, 0.15);color:var(--text-primary);display:inline-flex;align-items:center;gap:6px;padding:4px 8px;">
      <img src="${a.avatar}" style="width:18px;height:18px;border-radius:50%;">
      ${escapeHTML(a.name)}
      <i class="fa-solid fa-xmark" style="cursor:pointer;margin-left:4px;" onclick="removeAssigneeFromTask(${a.id})"></i>
    </span>
  `).join('');
}

async function addAssigneeToTask(userId) {
  if (!userId || !state.currentTaskDetail) return;
  try {
    await apiCall(`/tasks/${state.currentTaskDetail.id}/assignees`, 'POST', { userId: parseInt(userId) });
    loadTaskDetails(state.currentTaskDetail.id);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

async function removeAssigneeFromTask(userId) {
  if (!state.currentTaskDetail) return;
  try {
    await apiCall(`/tasks/${state.currentTaskDetail.id}/assignees/${userId}`, 'DELETE');
    loadTaskDetails(state.currentTaskDetail.id);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

async function updateTaskDueDate(dueDate) {
  if (!state.currentTaskDetail) return;
  try {
    await apiCall(`/tasks/${state.currentTaskDetail.id}`, 'PUT', { due_date: dueDate });
    fetchProjectDetails(state.currentProject.id, false);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function renderTaskComments(comments) {
  const container = document.getElementById('comments-thread');
  if (!comments || comments.length === 0) {
    container.innerHTML = '<div style="font-size:0.85rem;color:var(--text-muted);">No comments yet. Start the conversation!</div>';
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="comment-card">
      <img src="${c.user_avatar}" class="comment-avatar">
      <div class="comment-body">
        <div>
          <span class="comment-author">${escapeHTML(c.user_name)}</span>
          <span class="comment-time">${formatDate(c.created_at)}</span>
        </div>
        <div class="comment-text">${escapeHTML(c.content)}</div>
      </div>
    </div>
  `).join('');
}

async function submitTaskComment() {
  const input = document.getElementById('new-comment-input');
  const content = input.value.trim();
  if (!content || !state.currentTaskDetail) return;

  try {
    await apiCall(`/tasks/${state.currentTaskDetail.id}/comments`, 'POST', { content });
    input.value = '';
    loadTaskComments(state.currentTaskDetail.id);
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

async function loadTaskComments(taskId) {
  try {
    const comments = await apiCall(`/tasks/${taskId}/comments`);
    renderTaskComments(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
  }
}

async function loadTaskDetails(taskId) {
  try {
    const task = await apiCall(`/tasks/${taskId}`);
    state.currentTaskDetail = task;
    renderTaskChecklist(task.checklists || []);
    renderTaskAssignees(task.assignees || []);
  } catch (err) {
    console.error('Error reloading task details:', err);
  }
}

async function deleteCurrentTask() {
  if (!state.currentTaskDetail) return;
  if (!confirm('Are you sure you want to delete this task card?')) return;

  try {
    await apiCall(`/tasks/${state.currentTaskDetail.id}`, 'DELETE');
    closeModal('task-detail-modal');
    fetchProjectDetails(state.currentProject.id, false);
    showToast('Task Deleted', 'Task card removed.', 'fa-trash');
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

// ==========================================================================
// 8. PROJECT & COLUMN CREATION MODALS
// ==========================================================================

function openCreateProjectModal() {
  document.getElementById('project-modal-title').textContent = 'Create Group Project';
  document.getElementById('project-id-input').value = '';
  document.getElementById('project-name-input').value = '';
  document.getElementById('project-desc-input').value = '';
  openModal('project-modal');
}

async function handleSaveProject(e) {
  e.preventDefault();
  const name = document.getElementById('project-name-input').value;
  const description = document.getElementById('project-desc-input').value;
  const color = document.querySelector('input[name="project-color"]:checked')?.value || '#3b82f6';

  try {
    const project = await apiCall('/projects', 'POST', { name, description, color });
    closeModal('project-modal');
    await fetchProjects();
    showView('project', project.id);
    showToast('Project Created', `Project "${project.name}" is ready.`, 'fa-folder-plus');
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function openCreateTaskModal(columnId = null) {
  if (!state.currentProject) return;

  document.getElementById('task-id-input').value = '';
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-desc-input').value = '';
  document.getElementById('task-due-date-input').value = '';

  // Select Column
  const colSelect = document.getElementById('task-column-select');
  colSelect.innerHTML = (state.currentProject.columns || []).map(c => `
    <option value="${c.id}" ${c.id === columnId ? 'selected' : ''}>${escapeHTML(c.name)}</option>
  `).join('');

  // Select Assignees
  const assigneeSelect = document.getElementById('task-assignees-select');
  assigneeSelect.innerHTML = (state.currentProject.members || []).map(m => `
    <option value="${m.id}">${escapeHTML(m.name)} (${m.role})</option>
  `).join('');

  openModal('task-modal');
}

async function handleSaveTask(e) {
  e.preventDefault();
  if (!state.currentProject) return;

  const column_id = parseInt(document.getElementById('task-column-select').value);
  const title = document.getElementById('task-title-input').value;
  const priority = document.getElementById('task-priority-select').value;
  const due_date = document.getElementById('task-due-date-input').value || null;
  const description = document.getElementById('task-desc-input').value;

  const assigneeOptions = document.getElementById('task-assignees-select').selectedOptions;
  const assignees = Array.from(assigneeOptions).map(o => parseInt(o.value));

  try {
    await apiCall(`/projects/${state.currentProject.id}/tasks`, 'POST', {
      column_id,
      title,
      priority,
      due_date,
      description,
      assignees
    });

    closeModal('task-modal');
    fetchProjectDetails(state.currentProject.id, false);
    showToast('Task Created', `Task "${title}" created.`, 'fa-check');
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function openCreateColumnModal() {
  document.getElementById('column-name-input').value = '';
  openModal('column-modal');
}

async function handleCreateColumn(e) {
  e.preventDefault();
  if (!state.currentProject) return;
  const name = document.getElementById('column-name-input').value;

  try {
    await apiCall(`/projects/${state.currentProject.id}/columns`, 'POST', { name });
    closeModal('column-modal');
    fetchProjectDetails(state.currentProject.id, false);
    showToast('Column Added', `Column "${name}" created.`, 'fa-columns');
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

function openProjectMembersModal() {
  if (!state.currentProject) return;

  const listEl = document.getElementById('project-members-list');
  listEl.innerHTML = state.currentProject.members.map(m => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${m.avatar}" style="width:32px;height:32px;border-radius:50%;">
        <div>
          <div style="font-weight:700;font-size:0.875rem;">${escapeHTML(m.name)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHTML(m.email)}</div>
        </div>
      </div>
      <span class="badge">${m.role}</span>
    </div>
  `).join('');

  // Populate invite options
  const memberUserIds = new Set(state.currentProject.members.map(m => m.id));
  const availableToInvite = state.allUsers.filter(u => !memberUserIds.has(u.id));

  const select = document.getElementById('invite-user-select');
  select.innerHTML = '<option value="">Select registered user to add...</option>' +
    availableToInvite.map(u => `<option value="${u.id}">${escapeHTML(u.name)} (${escapeHTML(u.email)})</option>`).join('');

  openModal('project-members-modal');
}

async function addSelectedMemberToProject() {
  const select = document.getElementById('invite-user-select');
  const userId = select.value;
  if (!userId || !state.currentProject) return;

  try {
    await apiCall(`/projects/${state.currentProject.id}/members`, 'POST', { userId: parseInt(userId) });
    fetchProjectDetails(state.currentProject.id, false);
    openProjectMembersModal();
    showToast('Member Added', 'User added to project.', 'fa-user-plus');
  } catch (err) {
    showToast('Error', err.message, 'fa-circle-exclamation');
  }
}

// ==========================================================================
// 9. MY TASKS & GLOBAL SEARCH
// ==========================================================================

async function renderMyTasks() {
  const container = document.getElementById('my-tasks-list');
  let myTasks = [];

  state.projects.forEach(p => {
    // We can fetch project tasks
  });

  // Fetch full details of all projects to compile assigned tasks
  try {
    let allAssignedTasks = [];
    for (let p of state.projects) {
      const projDetail = await apiCall(`/projects/${p.id}`);
      const tasks = projDetail.tasks || [];
      const assigned = tasks.filter(t => (t.assignees || []).some(a => a.id === state.currentUser.id));
      assigned.forEach(t => { t.project_name = p.name; t.project_color = p.color; });
      allAssignedTasks = allAssignedTasks.concat(assigned);
    }

    document.getElementById('my-task-count').textContent = allAssignedTasks.length;
    document.getElementById('stat-assigned-to-me').textContent = allAssignedTasks.length;

    if (allAssignedTasks.length === 0) {
      container.innerHTML = `
        <div class="glass-panel" style="padding:40px;text-align:center;">
          <i class="fa-solid fa-clipboard-check" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:12px;"></i>
          <h3>No Tasks Assigned to You</h3>
          <p style="color:var(--text-secondary);">You have zero pending tasks assigned across your active projects.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allAssignedTasks.map(t => `
      <div class="task-card" onclick="showView('project', ${t.project_id}); setTimeout(() => openTaskDetailModal(${t.id}), 300);" style="margin-bottom:12px;">
        <div class="task-card-header">
          <span class="badge" style="background:${t.project_color}22;color:${t.project_color};">${escapeHTML(t.project_name)}</span>
          <span class="priority-pill priority-${t.priority}">${t.priority}</span>
        </div>
        <div class="task-card-title">${escapeHTML(t.title)}</div>
        <div class="task-card-meta">
          <span>Due: ${t.due_date || 'No deadline'}</span>
          <span><i class="fa-regular fa-square-check"></i> ${t.checklist_completed || 0}/${t.checklist_total || 0}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error compiling assigned tasks:', err);
  }
}

function handleGlobalSearch(query) {
  query = query.toLowerCase().trim();
  if (!query) {
    if (state.currentProject) renderBoardView();
    return;
  }

  if (state.currentView === 'project' && state.currentProject) {
    const filteredTasks = state.currentProject.tasks.filter(t =>
      t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query))
    );
    // Temporarily substitute tasks for rendering
    const tempProj = { ...state.currentProject, tasks: filteredTasks };
    renderFilteredKanban(tempProj);
  }
}

function renderFilteredKanban(proj) {
  const container = document.getElementById('kanban-board');
  const columns = proj.columns || [];
  const tasks = proj.tasks || [];

  container.innerHTML = columns.map(col => {
    const colTasks = tasks.filter(t => t.column_id === col.id);
    return `
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-name">${escapeHTML(col.name)}</span>
          <span class="column-count">${colTasks.length}</span>
        </div>
        <div class="task-cards-list">
          ${colTasks.map(t => renderTaskCardHTML(t)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 10. NOTIFICATION MENU & TOASTS
// ==========================================================================

function toggleNotificationsMenu() {
  const menu = document.getElementById('notification-menu');
  menu.classList.toggle('hidden');
}

async function markNotificationRead(id, link) {
  try {
    await apiCall(`/notifications/${id}/read`, 'PUT');
    fetchNotifications();
    document.getElementById('notification-menu').classList.add('hidden');

    if (link && link.startsWith('#task-')) {
      const taskId = link.replace('#task-', '');
      if (state.currentProject) {
        openTaskDetailModal(parseInt(taskId));
      }
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
}

async function markAllNotificationsRead() {
  try {
    await apiCall('/notifications/read-all', 'PUT');
    fetchNotifications();
  } catch (err) {
    console.error(err);
  }
}

function showToast(title, message, icon = 'fa-bell') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon"></i>
    <div class="toast-body">
      <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-msg">${escapeHTML(message)}</div>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// 11. UI MODAL HELPERS
// ==========================================================================

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

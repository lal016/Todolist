'use strict';

const STORAGE_KEY = 'taskflare.tasks.v1';
const VALID_CATEGORIES = ['Personal', 'Study', 'Work', 'Health', 'Other'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

const elements = {
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  categoryInput: document.getElementById('categoryInput'),
  priorityInput: document.getElementById('priorityInput'),
  dateInput: document.getElementById('dateInput'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptyCopy: document.getElementById('emptyCopy'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortInput: document.getElementById('sortInput'),
  clearCompleted: document.getElementById('clearCompleted'),
  totalCount: document.getElementById('totalCount'),
  completedCount: document.getElementById('completedCount'),
  pendingCount: document.getElementById('pendingCount'),
  allCount: document.getElementById('allCount'),
  activeCount: document.getElementById('activeCount'),
  completedSideCount: document.getElementById('completedSideCount'),
  progressPercentage: document.getElementById('progressPercentage'),
  progressFill: document.getElementById('progressFill'),
  progressTrack: document.getElementById('progressTrack'),
  progressCaption: document.getElementById('progressCaption'),
  todayDate: document.getElementById('todayDate'),
  navLinks: [...document.querySelectorAll('.nav-link')],
  editModal: document.getElementById('editModal'),
  editForm: document.getElementById('editForm'),
  editTitle: document.getElementById('editTitle'),
  editCategory: document.getElementById('editCategory'),
  editPriority: document.getElementById('editPriority'),
  editDueDate: document.getElementById('editDueDate'),
  closeModal: document.getElementById('closeModal'),
  cancelEdit: document.getElementById('cancelEdit'),
  toast: document.getElementById('toast')
};

let tasks = loadTasks();
let currentFilter = 'all';
let editingTaskId = null;
let toastTimeoutId;

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    return stored
      .filter(item => item && typeof item === 'object' && typeof item.title === 'string')
      .map(item => ({
        id: String(item.id || createId()),
        title: item.title.slice(0, 120),
        category: VALID_CATEGORIES.includes(item.category) ? item.category : 'Personal',
        priority: VALID_PRIORITIES.includes(item.priority) ? item.priority : 'Medium',
        dueDate: typeof item.dueDate === 'string' ? item.dueDate : '',
        completed: Boolean(item.completed),
        createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now()
      }));
  } catch (error) {
    console.warn('Saved tasks could not be loaded:', error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Tasks could not be saved:', error);
    showToast('Could not save tasks in this browser.');
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2600);
}

function showTodayDate() {
  elements.todayDate.textContent = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
}

function formatDate(dateString) {
  if (!dateString) return 'No due date';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(date);
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = task.dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function updateStatistics() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const remaining = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  elements.totalCount.textContent = total;
  elements.completedCount.textContent = completed;
  elements.pendingCount.textContent = remaining;
  elements.allCount.textContent = total;
  elements.activeCount.textContent = remaining;
  elements.completedSideCount.textContent = completed;
  elements.progressPercentage.textContent = `${percentage}%`;
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressTrack.setAttribute('aria-valuenow', String(percentage));
  elements.progressCaption.textContent = total === 0
    ? 'Add a task to get started.'
    : percentage === 100
      ? 'Everything is complete. Excellent work!'
      : `${completed} of ${total} tasks completed. Keep your momentum going.`;
  elements.clearCompleted.disabled = completed === 0;
}

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createTaskCard(task) {
  const card = createElement('article', `task-card${task.completed ? ' is-completed' : ''}`);
  card.dataset.id = task.id;

  const checkButton = createElement('button', `task-check${task.completed ? ' is-checked' : ''}`, task.completed ? '✓' : '');
  checkButton.type = 'button';
  checkButton.dataset.action = 'toggle';
  checkButton.setAttribute('aria-label', task.completed ? 'Mark as not completed' : 'Mark as completed');
  checkButton.setAttribute('aria-pressed', String(task.completed));

  const details = createElement('div', 'task-details');
  const title = createElement('p', 'task-title', task.title);
  const meta = createElement('div', 'task-meta');
  const category = createElement('span', 'category-chip', task.category);
  const due = createElement('span', `due-date${isOverdue(task) ? ' overdue' : ''}`,
    isOverdue(task) ? `Overdue · ${formatDate(task.dueDate)}` : `Due: ${formatDate(task.dueDate)}`);
  meta.append(category, due);
  details.append(title, meta);

  const priority = createElement('span', `priority-chip priority-${task.priority.toLowerCase()}`, task.priority);

  const actions = createElement('div', 'task-actions');
  const editButton = createElement('button', 'small-action', 'Edit');
  editButton.type = 'button';
  editButton.dataset.action = 'edit';
  const deleteButton = createElement('button', 'small-action delete', 'Delete');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  actions.append(editButton, deleteButton);

  card.append(checkButton, details, priority, actions);
  return card;
}

function getVisibleTasks() {
  let visible = [...tasks];
  if (currentFilter === 'active') visible = visible.filter(task => !task.completed);
  if (currentFilter === 'completed') visible = visible.filter(task => task.completed);

  const query = elements.searchInput.value.trim().toLocaleLowerCase();
  if (query) {
    visible = visible.filter(task =>
      task.title.toLocaleLowerCase().includes(query) ||
      task.category.toLocaleLowerCase().includes(query)
    );
  }

  const category = elements.categoryFilter.value;
  if (category !== 'all') visible = visible.filter(task => task.category === category);

  const priorityRank = { High: 3, Medium: 2, Low: 1 };
  switch (elements.sortInput.value) {
    case 'oldest':
      visible.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case 'dueDate':
      visible.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      break;
    case 'priority':
      visible.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.createdAt - a.createdAt);
      break;
    default:
      visible.sort((a, b) => b.createdAt - a.createdAt);
  }
  return visible;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  const fragment = document.createDocumentFragment();
  visibleTasks.forEach(task => fragment.append(createTaskCard(task)));
  elements.taskList.replaceChildren(fragment);
  elements.emptyState.hidden = visibleTasks.length > 0;

  if (visibleTasks.length === 0) {
    const hasTasks = tasks.length > 0;
    elements.emptyTitle.textContent = hasTasks ? 'No matching tasks.' : 'Nothing on your list yet.';
    elements.emptyCopy.textContent = hasTasks
      ? 'Try another search or change the filters.'
      : 'Add your first task above and build some momentum.';
  }

  updateStatistics();
}

function setFilter(filter) {
  currentFilter = filter;
  elements.navLinks.forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderTasks();
}

// Add task
 elements.taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = elements.taskInput.value.trim();
  if (!title) {
    showToast('Please enter a task name.');
    elements.taskInput.focus();
    return;
  }

  tasks.push({
    id: createId(),
    title,
    category: elements.categoryInput.value,
    priority: elements.priorityInput.value,
    dueDate: elements.dateInput.value,
    completed: false,
    createdAt: Date.now()
  });

  saveTasks();
  elements.taskForm.reset();
  elements.categoryInput.value = 'Personal';
  elements.priorityInput.value = 'Medium';
  setFilter('all');
  elements.taskInput.focus();
  showToast('Task added successfully.');
});

// Task actions: complete, edit, delete
 elements.taskList.addEventListener('click', event => {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;
  const card = actionButton.closest('.task-card');
  if (!card) return;
  const task = tasks.find(item => item.id === card.dataset.id);
  if (!task) return;

  switch (actionButton.dataset.action) {
    case 'toggle':
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
      showToast(task.completed ? 'Task completed. Great work!' : 'Task moved back to in progress.');
      break;
    case 'edit':
      openEditDialog(task);
      break;
    case 'delete':
      if (window.confirm(`Delete this task?\n\n${task.title}`)) {
        tasks = tasks.filter(item => item.id !== task.id);
        saveTasks();
        renderTasks();
        showToast('Task deleted.');
      }
      break;
  }
});

function openEditDialog(task) {
  editingTaskId = task.id;
  elements.editTitle.value = task.title;
  elements.editCategory.value = task.category;
  elements.editPriority.value = task.priority;
  elements.editDueDate.value = task.dueDate;
  elements.editModal.hidden = false;
  document.body.style.overflow = 'hidden';
  elements.editTitle.focus();
}

function closeEditDialog() {
  elements.editModal.hidden = true;
  document.body.style.overflow = '';
  editingTaskId = null;
}

elements.editForm.addEventListener('submit', event => {
  event.preventDefault();
  const task = tasks.find(item => item.id === editingTaskId);
  const title = elements.editTitle.value.trim();
  if (!task || !title) {
    showToast('Please enter a task name.');
    return;
  }

  task.title = title;
  task.category = elements.editCategory.value;
  task.priority = elements.editPriority.value;
  task.dueDate = elements.editDueDate.value;
  saveTasks();
  closeEditDialog();
  renderTasks();
  showToast('Task updated successfully.');
});

elements.closeModal.addEventListener('click', closeEditDialog);
elements.cancelEdit.addEventListener('click', closeEditDialog);
elements.editModal.addEventListener('click', event => {
  if (event.target === elements.editModal) closeEditDialog();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !elements.editModal.hidden) closeEditDialog();
});

// Sidebar and list controls
 elements.navLinks.forEach(button => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});
elements.searchInput.addEventListener('input', renderTasks);
elements.categoryFilter.addEventListener('change', renderTasks);
elements.sortInput.addEventListener('change', renderTasks);

// Remove all completed tasks
 elements.clearCompleted.addEventListener('click', () => {
  const completedCount = tasks.filter(task => task.completed).length;
  if (completedCount === 0) return;
  const confirmed = window.confirm(`Remove all ${completedCount} completed task(s)?`);
  if (!confirmed) return;
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
  showToast('Completed tasks cleared.');
});

showTodayDate();
renderTasks();

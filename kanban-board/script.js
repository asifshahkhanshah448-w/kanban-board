/**
 * ==========================================================================
 * KANBAN BOARD - SCRIPT.JS
 * Vanilla JavaScript application with Native HTML5 Drag and Drop API
 * and localStorage persistence.
 * ==========================================================================
 */

(function () {
  'use strict';

  // Storage Key
  const STORAGE_KEY = 'kanban_board_tasks_v1';

  // Valid Column Statuses
  const COLUMNS = ['todo', 'doing', 'done'];

  // Column Display Names
  const COLUMN_NAMES = {
    todo: 'To-Do',
    doing: 'Doing',
    done: 'Done'
  };

  // Default Sample Data (loaded only when no stored tasks exist)
  const INITIAL_SAMPLE_TASKS = [
    {
      id: 'task-demo-1',
      title: 'Learn JavaScript fundamentals',
      description: 'Review ES6+ features, closures, promises, and DOM manipulation APIs.',
      status: 'todo',
      createdAt: Date.now() - 3600000 * 24
    },
    {
      id: 'task-demo-2',
      title: 'Practice DOM manipulation techniques',
      description: 'Build small UI components using createElement, querySelector, and event delegation.',
      status: 'todo',
      createdAt: Date.now() - 3600000 * 18
    },
    {
      id: 'task-demo-3',
      title: 'Build interactive Kanban Board',
      description: 'Implement native HTML5 drag and drop, localStorage persistence, and responsive UI.',
      status: 'doing',
      createdAt: Date.now() - 3600000 * 10
    },
    {
      id: 'task-demo-4',
      title: 'Create semantic HTML5 structure',
      description: 'Structure header, main columns, task cards, and modal dialogs with accessibility attributes.',
      status: 'done',
      createdAt: Date.now() - 3600000 * 48
    }
  ];

  // In-Memory State
  let tasks = [];
  let draggedTaskId = null;
  let taskPendingDelete = null;

  // DOM Elements Cache
  const form = document.getElementById('task-form');
  const titleInput = document.getElementById('task-title-input');
  const descInput = document.getElementById('task-desc-input');
  const formFeedback = document.getElementById('form-feedback');
  const boardColumns = document.getElementById('kanban-board');
  const deleteModal = document.getElementById('delete-modal');
  const modalTaskName = document.getElementById('modal-task-name');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const btnResetDemo = document.getElementById('btn-reset-demo');
  const toastContainer = document.getElementById('toast-container');
  const statTotal = document.getElementById('stat-total');
  const statCompleted = document.getElementById('stat-completed');

  // Column Container Cache
  const columnContainers = {
    todo: document.getElementById('list-todo'),
    doing: document.getElementById('list-doing'),
    done: document.getElementById('list-done')
  };

  const countBadges = {
    todo: document.getElementById('count-todo'),
    doing: document.getElementById('count-doing'),
    done: document.getElementById('count-done')
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Escape special HTML characters to prevent XSS.
   */
  function escapeHtml(string) {
    if (!string) return '';
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }

  /**
   * Format timestamp into a human-readable string.
   */
  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Display non-intrusive toast notifications.
   */
  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }, 2800);
  }

  /**
   * Set form feedback message.
   */
  function setFormFeedback(message, type = 'error') {
    if (!formFeedback) return;
    if (!message) {
      formFeedback.textContent = '';
      formFeedback.className = 'form-feedback';
      return;
    }
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
  }

  // ==========================================================================
  // LocalStorage Operations
  // ==========================================================================

  /**
   * Load tasks from localStorage safely.
   */
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        // First visit: initialize with realistic sample tasks
        tasks = [...INITIAL_SAMPLE_TASKS];
        saveTasks();
        return;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Validate each task structure
        tasks = parsed.filter(t => t && typeof t.id === 'string' && COLUMNS.includes(t.status));
      } else {
        tasks = [];
      }
    } catch (err) {
      console.error('Failed to parse tasks from localStorage:', err);
      tasks = [];
    }
  }

  /**
   * Persist current tasks into localStorage.
   */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      updateGlobalStats();
    } catch (err) {
      console.error('Failed to save tasks to localStorage:', err);
      showToast('Could not save to storage.', 'danger');
    }
  }

  /**
   * Update top statistics (Total & Completed).
   */
  function updateGlobalStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;

    if (statTotal) statTotal.textContent = total;
    if (statCompleted) statCompleted.textContent = completed;
  }

  // ==========================================================================
  // Task Rendering & Board Construction
  // ==========================================================================

  /**
   * Render a single task card element.
   */
  function createTaskElement(task) {
    const article = document.createElement('article');
    article.className = 'task-card';
    article.id = task.id;
    article.dataset.id = task.id;
    article.setAttribute('draggable', 'true');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-label', `Task: ${task.title}. Status: ${COLUMN_NAMES[task.status]}`);

    // Determine target next/prev columns for quick-move accessibility buttons
    const nextCol = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : null;
    const prevCol = task.status === 'done' ? 'doing' : task.status === 'doing' ? 'todo' : null;

    let quickMoveHtml = '';
    if (prevCol) {
      quickMoveHtml += `
        <button
          type="button"
          class="btn-quick-move"
          data-action="move"
          data-target="${prevCol}"
          title="Move back to ${COLUMN_NAMES[prevCol]}"
          aria-label="Move task back to ${COLUMN_NAMES[prevCol]}"
        >
          ← ${COLUMN_NAMES[prevCol]}
        </button>
      `;
    }
    if (nextCol) {
      quickMoveHtml += `
        <button
          type="button"
          class="btn-quick-move"
          data-action="move"
          data-target="${nextCol}"
          title="Move to ${COLUMN_NAMES[nextCol]}"
          aria-label="Move task to ${COLUMN_NAMES[nextCol]}"
        >
          ${COLUMN_NAMES[nextCol]} →
        </button>
      `;
    }

    const descHtml = task.description
      ? `<p class="card-description">${escapeHtml(task.description)}</p>`
      : '';

    article.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(task.title)}</h3>
        <div class="card-top-actions">
          <span class="drag-handle" title="Drag to reorder or move column" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="5" r="1"></circle>
              <circle cx="9" cy="12" r="1"></circle>
              <circle cx="9" cy="19" r="1"></circle>
              <circle cx="15" cy="5" r="1"></circle>
              <circle cx="15" cy="12" r="1"></circle>
              <circle cx="15" cy="19" r="1"></circle>
            </svg>
          </span>
          <button
            type="button"
            class="btn-delete"
            data-action="delete"
            title="Delete task"
            aria-label="Delete task: ${escapeHtml(task.title)}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      ${descHtml}
      <div class="card-footer">
        <span class="card-timestamp">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${formatDate(task.createdAt)}
        </span>
        <div class="quick-move-controls">
          ${quickMoveHtml}
        </div>
      </div>
    `;

    // Attach card-level HTML5 Drag events
    setupCardDragEvents(article);

    return article;
  }

  /**
   * Render the entire board (all three columns).
   */
  function renderBoard() {
    COLUMNS.forEach(status => {
      const container = columnContainers[status];
      const badge = countBadges[status];
      if (!container) return;

      const columnTasks = tasks.filter(t => t.status === status);

      // Update count badge
      if (badge) {
        badge.textContent = columnTasks.length;
        badge.setAttribute('aria-label', `${columnTasks.length} tasks in ${COLUMN_NAMES[status]}`);
      }

      // Clear existing content
      container.innerHTML = '';

      if (columnTasks.length === 0) {
        // Show empty state
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="13" x2="13" y2="13"></line>
          </svg>
          <div class="empty-state-title">No tasks in ${COLUMN_NAMES[status]}</div>
          <p class="empty-state-text">Drag a task card here or create a new one above.</p>
        `;
        container.appendChild(emptyDiv);
      } else {
        // Append cards in sequential order
        columnTasks.forEach(task => {
          container.appendChild(createTaskElement(task));
        });
      }
    });

    updateGlobalStats();
  }

  // ==========================================================================
  // HTML5 Drag and Drop Handlers
  // ==========================================================================

  /**
   * Attach dragstart and dragend listeners to a task card.
   */
  function setupCardDragEvents(card) {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  }

  function handleDragStart(e) {
    const card = e.currentTarget;
    draggedTaskId = card.dataset.id;

    // Use native DataTransfer
    e.dataTransfer.setData('text/plain', draggedTaskId);
    e.dataTransfer.effectAllowed = 'move';

    // Apply visual feedback
    setTimeout(() => {
      card.classList.add('is-dragging');
    }, 0);
  }

  function handleDragEnd(e) {
    const card = e.currentTarget;
    card.classList.remove('is-dragging');
    draggedTaskId = null;

    // Clean up any remaining drop indicators
    COLUMNS.forEach(status => {
      const container = columnContainers[status];
      if (container) {
        container.classList.remove('drag-over');
      }
    });

    // Remove any placeholder elements
    document.querySelectorAll('.drop-placeholder').forEach(el => el.remove());
  }

  /**
   * Helper to determine insertion point between cards based on cursor Y coordinate.
   */
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.is-dragging)')];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  /**
   * Setup column drop zone events.
   */
  function setupColumnDropZones() {
    COLUMNS.forEach(status => {
      const container = columnContainers[status];
      if (!container) return;

      container.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        container.classList.add('drag-over');

        // Optional placeholder insertion preview
        const draggingCard = document.querySelector('.task-card.is-dragging');
        if (!draggingCard) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
          container.appendChild(draggingCard);
        } else {
          container.insertBefore(draggingCard, afterElement);
        }
      });

      container.addEventListener('dragenter', e => {
        e.preventDefault();
        container.classList.add('drag-over');
      });

      container.addEventListener('dragleave', e => {
        // Only remove if leaving the container boundaries
        if (!container.contains(e.relatedTarget)) {
          container.classList.remove('drag-over');
        }
      });

      container.addEventListener('drop', e => {
        e.preventDefault();
        container.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        if (!taskId) return;

        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const targetStatus = container.dataset.status;
        const task = tasks[taskIndex];
        const previousStatus = task.status;

        // Update task status
        task.status = targetStatus;

        // Determine new ordered position within tasks array based on DOM ordering
        const orderedCardIds = [...container.querySelectorAll('.task-card')].map(c => c.dataset.id);

        // Remove task from its current position in array
        tasks.splice(taskIndex, 1);

        // Re-insert task into target position
        const targetDomIndex = orderedCardIds.indexOf(taskId);
        if (targetDomIndex !== -1) {
          // Find the index in tasks where other tasks in this column are
          const columnTasks = tasks.filter(t => t.status === targetStatus);
          const siblingTask = columnTasks[targetDomIndex];

          if (siblingTask) {
            const insertIdx = tasks.indexOf(siblingTask);
            tasks.splice(insertIdx, 0, task);
          } else {
            tasks.push(task);
          }
        } else {
          tasks.push(task);
        }

        saveTasks();
        renderBoard();

        if (previousStatus !== targetStatus) {
          showToast(`Task moved to ${COLUMN_NAMES[targetStatus]}`, 'success');
        }
      });
    });
  }

  // ==========================================================================
  // Task Creation
  // ==========================================================================

  /**
   * Handle form submission for new task.
   */
  function handleAddTask(e) {
    e.preventDefault();

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    // Validation: Title cannot be empty
    if (!title) {
      setFormFeedback('Please enter a task title.', 'error');
      titleInput.focus();
      return;
    }

    if (title.length < 2) {
      setFormFeedback('Task title must be at least 2 characters.', 'error');
      titleInput.focus();
      return;
    }

    // Clear feedback
    setFormFeedback('', '');

    // Generate unique ID
    const newId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newTask = {
      id: newId,
      title: title,
      description: description,
      status: 'todo', // Added to To-Do column by default
      createdAt: Date.now()
    };

    // Prepend new task so it appears at top of To-Do column
    tasks.unshift(newTask);

    // Save and re-render
    saveTasks();
    renderBoard();

    // Reset input fields
    form.reset();
    titleInput.blur();

    showToast('New task added to To-Do!', 'success');
  }

  // ==========================================================================
  // Task Deletion & Modal Flow
  // ==========================================================================

  /**
   * Open delete confirmation dialog.
   */
  function promptDeleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    taskPendingDelete = task;
    if (modalTaskName) {
      modalTaskName.textContent = `"${task.title}"`;
    }
    if (deleteModal) {
      deleteModal.classList.add('active');
      btnConfirmDelete.focus();
    }
  }

  /**
   * Close delete modal.
   */
  function closeDeleteModal() {
    if (deleteModal) {
      deleteModal.classList.remove('active');
    }
    taskPendingDelete = null;
  }

  /**
   * Confirm and perform task deletion.
   */
  function confirmDeleteTask() {
    if (!taskPendingDelete) return;

    const taskTitle = taskPendingDelete.title;
    tasks = tasks.filter(t => t.id !== taskPendingDelete.id);

    saveTasks();
    renderBoard();
    closeDeleteModal();

    showToast(`Task "${taskTitle}" deleted.`, 'danger');
  }

  // ==========================================================================
  // Event Delegation for Board Actions
  // ==========================================================================

  /**
   * Handle clicks on delete buttons or quick-move buttons using event delegation.
   */
  function handleBoardClick(e) {
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      const card = deleteBtn.closest('.task-card');
      if (card && card.dataset.id) {
        promptDeleteTask(card.dataset.id);
      }
      return;
    }

    const moveBtn = e.target.closest('[data-action="move"]');
    if (moveBtn) {
      const card = moveBtn.closest('.task-card');
      const targetCol = moveBtn.dataset.target;
      if (card && card.dataset.id && COLUMNS.includes(targetCol)) {
        const task = tasks.find(t => t.id === card.dataset.id);
        if (task) {
          task.status = targetCol;
          saveTasks();
          renderBoard();
          showToast(`Task moved to ${COLUMN_NAMES[targetCol]}`, 'info');
        }
      }
    }
  }

  // ==========================================================================
  // Reset Demo Data
  // ==========================================================================

  function handleResetDemo() {
    tasks = JSON.parse(JSON.stringify(INITIAL_SAMPLE_TASKS));
    saveTasks();
    renderBoard();
    showToast('Board reset to sample tasks.', 'info');
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function init() {
    // 1. Load tasks from localStorage or sample defaults
    loadTasks();

    // 2. Render initial board
    renderBoard();

    // 3. Setup HTML5 Drag and Drop on columns
    setupColumnDropZones();

    // 4. Attach Form submission listener
    if (form) {
      form.addEventListener('submit', handleAddTask);
    }

    // Clear error message on input typing
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        if (formFeedback && formFeedback.textContent) {
          setFormFeedback('', '');
        }
      });
    }

    // 5. Board event delegation (delete buttons, move buttons)
    if (boardColumns) {
      boardColumns.addEventListener('click', handleBoardClick);
    }

    // 6. Delete modal listeners
    if (btnCancelDelete) {
      btnCancelDelete.addEventListener('click', closeDeleteModal);
    }
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', confirmDeleteTask);
    }
    if (deleteModal) {
      deleteModal.addEventListener('click', e => {
        if (e.target === deleteModal) {
          closeDeleteModal();
        }
      });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && deleteModal && deleteModal.classList.contains('active')) {
        closeDeleteModal();
      }
    });

    // 7. Reset sample demo button
    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', handleResetDemo);
    }
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

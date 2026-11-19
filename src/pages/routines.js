
import { renderBottomNav, attachBottomNavEvents } from '../components/navigation.js'
import { renderMenu, attachMenuEvents } from '../components/menu.js'

export function renderRoutines(
  data,
  onNavigate,
  onAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onProfile
) {
  const tasks = data.routines || []
  const completed = tasks.filter(task => task.completed).length
  const total = tasks.length
  const percentage = total ? Math.round((completed / total) * 100) : 0

  const taskCards = tasks.length
    ? tasks.map(task => `
        <article class="routine-card ${task.completed ? 'routine-completed' : ''}">
          <label class="routine-checkbox">
            <input
              type="checkbox"
              class="routine-toggle"
              data-id="${escapeHTML(task.id)}"
              ${task.completed ? 'checked' : ''}
            >
            <span class="custom-checkbox"></span>
            <span class="routine-task-name">${escapeHTML(task.name)}</span>
          </label>

          <div class="routine-actions">
            <button type="button" class="routine-edit" data-id="${escapeHTML(task.id)}">Edit</button>
            <button type="button" class="routine-delete" data-id="${escapeHTML(task.id)}">Delete</button>
          </div>
        </article>
      `).join('')
    : '<p class="empty-routines">No tasks yet. Add your first morning task.</p>'

  document.querySelector('#app').innerHTML = `
    <main class="main-page">
      <header class="page-header">
        <div>
          <h1>Routines</h1>
          <p>Make your mornings count, one task at a time.</p>
        </div>
        ${renderMenu()}
      </header>

      <section class="routine-progress-card">
        <div
          class="routine-progress-circle"
          style="--routine-progress: ${percentage}%"
          role="img"
          aria-label="${percentage}% of routine tasks completed"
        >
          <div class="routine-progress-inner">
            <strong>${percentage}%</strong>
            <span>Completed</span>
          </div>
        </div>

        <div class="routine-progress-text">
          <h2>Your morning progress</h2>
          <p><strong>${completed} of ${total}</strong> tasks completed</p>
        </div>
      </section>

      <section class="routine-list-section">
        <div class="section-heading">
          <h2>Morning Checklist</h2>
          <span>${total} ${total === 1 ? 'task' : 'tasks'}</span>
        </div>

        <div class="routine-list">
          ${taskCards}
        </div>

        <button type="button" class="primary-button add-routine-button" id="add-routine">
          + Add a Task
        </button>
      </section>

      ${renderBottomNav('routines')}
    </main>
  `

  attachBottomNavEvents(onNavigate)
  attachMenuEvents(onProfile)

  document.querySelector('#add-routine').addEventListener('click', onAddTask)

  document.querySelectorAll('.routine-toggle').forEach(input => {
    input.addEventListener('change', () => {
      onToggleTask(input.dataset.id, input.checked)
    })
  })

  document.querySelectorAll('.routine-edit').forEach(button => {
    button.addEventListener('click', () => onEditTask(button.dataset.id))
  })

  document.querySelectorAll('.routine-delete').forEach(button => {
    button.addEventListener('click', () => onDeleteTask(button.dataset.id))
  })
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}
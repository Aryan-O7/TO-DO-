// Elements
const tasksList = document.querySelector('#tasks-list')
const addTaskForm = document.querySelector('form#add-task')
const addTaskInput = document.querySelector('#add-task-input')
const clearAllTasksBtn = document.querySelector('button#clear-all-tasks')

// Total List Of Tasks
let list = JSON.parse(localStorage.getItem('tasks')) || []
// current filter: 'all' | 'active' | 'completed'
let currentFilter = 'all'

function saveList() {
  localStorage.setItem('tasks', JSON.stringify(list))
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Show All Tasks From Local Storage In Page
 */
function showTasksList() {
  tasksList.innerHTML = ''
  // always read latest list from storage to avoid out-of-sync issues
  list = JSON.parse(localStorage.getItem('tasks')) || []

  // compute filtered list
  const filtered = list.filter(t => {
    if (currentFilter === 'all') return true
    if (currentFilter === 'active') return !t.completed
    if (currentFilter === 'completed') return !!t.completed
    return true
  })

  if (list.length === 0) {
    clearAllTasksBtn.disabled = true
    const element = `
      <div class="ui icon warning message">
        <i class="inbox icon"></i>
        <div class="content">
          <div class="header">You have no tasks today!</div>
          <div>Enter your tasks above to get started.</div>
        </div>
      </div>`

    tasksList.style.border = 'none'
    tasksList.insertAdjacentHTML('beforeend', element)

    const countEl = document.querySelector('#task-count')
    if (countEl) countEl.textContent = '0 tasks'
    return
  }

  clearAllTasksBtn.disabled = false
  tasksList.style.border = '1px solid rgba(34,36,38,.15)'

  // show newest first without mutating original array
  ;[...filtered].reverse().forEach(task => {
    const element = `
      <li data-id="${task.id}">
        <div class="task-left">
          <div class="ui checkbox">
            <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
          </div>
          <div class="text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</div>
        </div>
        <div class="task-actions">
          <i data-id="${task.id}" title="Edit" class="edit outline icon"></i>
          <i data-id="${task.id}" title="Delete" class="trash alternate outline remove icon"></i>
        </div>
      </li>`

    tasksList.insertAdjacentHTML('beforeend', element)
  })

  // attach listeners
  document.querySelectorAll('#tasks-list input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = +e.target.dataset.id
      completeTask(id)
    })
  })

  document.querySelectorAll('li i.edit').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation()
      showEditModal(+e.target.dataset.id)
    })
  })

  document.querySelectorAll('li i.trash').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation()
      showRemoveModal(+e.target.dataset.id)
    })
  })

  // update task counter (show counts for filtered view)
  const total = filtered.length
  const countEl = document.querySelector('#task-count')
  if (countEl) countEl.textContent = `${total} task${total !== 1 ? 's' : ''}`

  // enable/disable clear-completed button depending on whether any completed tasks exist
  const clearCompletedBtn = document.querySelector('#clear-completed-btn')
  const hasCompleted = list.some(t => t.completed)
  if (clearCompletedBtn) clearCompletedBtn.disabled = !hasCompleted
}

/**
 * Add new task to local storage
 */
function addTask(event) {
  event.preventDefault()

  const taskText = addTaskInput.value
  if (taskText.trim().length === 0) {
    addTaskInput.value = ''
    return
  }

  // ensure latest list
  list = JSON.parse(localStorage.getItem('tasks')) || []

  // create a stable unique id
  const id = Date.now()
  list.push({ id, text: taskText, completed: false })
  saveList()
  addTaskInput.value = ''

  showNotification('success', 'Task was successfully added')
  showTasksList()
}

// Change Complete State
function completeTask(id) {
  // ensure we have latest list
  list = JSON.parse(localStorage.getItem('tasks')) || []
  const taskIndex = list.findIndex(t => t.id == id)
  if (taskIndex === -1) return

  list[taskIndex].completed = !list[taskIndex].completed
  saveList()
  showTasksList()
}

/**
 * Remove task
 */
function removeTask(id) {
  list = list.filter(t => t.id !== id)
  saveList()

  showNotification('error', 'Task was successfully deleted')
  showTasksList()
}

/**
 * Edit task
 */
function editTask(id) {
  const taskText = document.querySelector('#task-text').value

  if (taskText.trim().length === 0) return
  const taskIndex = list.findIndex(t => t.id == id)
  if (taskIndex === -1) return

  list[taskIndex].text = taskText
  saveList()

  showNotification('success', 'Task was successfully updated')
  showTasksList()
}

// Clear All Tasks
function clearAllTasks() {
  if (list.length > 0) {
    list = []
    saveList()
    return showTasksList()
  }

  new Noty({
    type: 'error',
    text: '<i class="close icon"></i> There is no task to remove.',
    layout: 'bottomRight',
    timeout: 2000,
    progressBar: true,
    closeWith: ['click'],
    theme: 'metroui',
  }).show()
}

// Clear Complete Tasks
function clearCompleteTasks() {
  if (list.length > 0) {
    if (confirm('Are you sure?')) {
      const filteredTasks = list.filter(t => t.completed !== true)
      list = filteredTasks
      saveList()
      return showTasksList()
    }
  }

  Toastify({
    text: 'There is no task to remove',
    duration: 3000,
    close: true,
    gravity: 'bottom',
    position: 'left',
    backgroundColor: 'linear-gradient(to right, #e45757, #d44747)',
    stopOnFocus: true,
  }).showToast()
}

// Show Edit Modal And Pass Data
function showEditModal(id) {
  const taskIndex = list.findIndex(t => t.id == id)
  if (taskIndex === -1) return
  const { text } = list[taskIndex]

  document.querySelector('#edit-modal .content #task-id').value = id
  document.querySelector('#edit-modal .content #task-text').value = text.trim()
  // remove previous click handlers to avoid duplicate calls
  const updateBtn = document.querySelector('#update-button')
  const newBtn = updateBtn.cloneNode(true)
  updateBtn.parentNode.replaceChild(newBtn, updateBtn)
  newBtn.addEventListener('click', () => editTask(+id))

  $('#edit-modal.modal').modal('show')
}

// Show Remove Modal
function showRemoveModal(id) {
  // remove previous handlers
  const removeBtn = document.querySelector('#remove-button')
  const newRemove = removeBtn.cloneNode(true)
  removeBtn.parentNode.replaceChild(newRemove, removeBtn)
  newRemove.addEventListener('click', () => removeTask(+id))

  $('#remove-modal.modal').modal('show')
}

// Show Clear All Tasks Modal
function showClearAllTasksModal() {
  if (list.length > 0) {
    return $('#clear-all-tasks-modal.modal').modal('show')
  }

  new Noty({
    type: 'error',
    text: '<i class="close icon"></i> There is no task to remove.',
    layout: 'bottomRight',
    timeout: 2000,
    progressBar: true,
    closeWith: ['click'],
    theme: 'metroui',
  }).show()
}

function showNotification(type, text) {
  new Noty({
    type,
    text: `<i class="check icon"></i> ${text}`,
    layout: 'bottomRight',
    timeout: 2000,
    progressBar: true,
    closeWith: ['click'],
    theme: 'metroui',
  }).show()
}

// Event Listeners
addTaskForm.addEventListener('submit', addTask)
window.addEventListener('load', () => addTaskInput.focus())

// Filter buttons wiring
document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.filter-buttons .button')
  filterButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      const f = e.target.dataset.filter
      if (!f) return
      currentFilter = f
      // toggle active class
      filterButtons.forEach(b => b.classList.remove('active'))
      e.target.classList.add('active')
      showTasksList()
    })
  })
})

showTasksList()

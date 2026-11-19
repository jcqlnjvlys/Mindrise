
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]))
}

export function showToast(message, type = 'success') {
  let toast = document.querySelector('#mindrise-toast')

  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'mindrise-toast'
    toast.className = 'mindrise-toast'
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')
    document.body.appendChild(toast)
  }

  toast.className = `mindrise-toast is-visible ${type === 'error' ? 'is-error' : ''}`
  toast.textContent = message

  clearTimeout(showToast.timer)

  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600)
}

function injectCompactDialogStyles() {
  if (document.querySelector('#mindrise-compact-dialog-styles')) return

  const style = document.createElement('style')
  style.id = 'mindrise-compact-dialog-styles'

  style.textContent = `
    /* Add breathing room between password labels and fields */
    .mindrise-generic-dialog label + .password-field {
      margin-top: 5px !important;
    }

    /* Compact Add Task dialog only */
    .mindrise-dialog-compact-task form {
      gap: 5px !important;
    }

    .mindrise-dialog-compact-task > p {
      margin-bottom: 10px !important;
    }

    .mindrise-dialog-compact-task input {
      margin: 0 !important;
    }

    .mindrise-dialog-compact-task .profile-dialog-message {
      min-height: 0 !important;
      margin: 2px 0 0 !important;
    }

    .mindrise-dialog-compact-task .profile-dialog-actions {
      margin-top: 7px !important;
    }

    /* Compact Logout and Delete Account dialogs only */
    .mindrise-dialog-compact-confirm form {
      gap: 4px !important;
    }

    .mindrise-dialog-compact-confirm > p {
      margin-bottom: 10px !important;
    }

    .mindrise-dialog-compact-confirm .profile-dialog-message {
      min-height: 0 !important;
      margin: 2px 0 0 !important;
    }

    .mindrise-dialog-compact-confirm .profile-dialog-actions {
      margin-top: 8px !important;
    }

    /* Keep confirmation buttons side-by-side on smaller screens */
    @media(max-width:480px) {
      .mindrise-dialog-compact-task .profile-dialog-actions,
      .mindrise-dialog-compact-confirm .profile-dialog-actions {
        flex-direction: row !important;
      }
    }
  `

  document.head.appendChild(style)
}

export function showDialog({
  title,
  description = '',
  content = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
  danger = false,
  hideCloseButton = false,
  onConfirm
}) {
  document.querySelector('#mindrise-dialog')?.remove()

  injectCompactDialogStyles()

  const backdrop = document.createElement('div')
  backdrop.id = 'mindrise-dialog'
  backdrop.className = 'profile-dialog-backdrop'

  const normalizedTitle = String(title ?? '').trim().toLowerCase()

  let compactClass = ''

  if (normalizedTitle === 'add routine task') {
    compactClass = 'mindrise-dialog-compact-task'
  } else if (
    normalizedTitle === 'log out?' ||
    normalizedTitle === 'delete mindrise account?'
  ) {
    compactClass = 'mindrise-dialog-compact-confirm'
  }

  backdrop.innerHTML = `
    <section class="profile-dialog mindrise-generic-dialog ${compactClass}" role="dialog" aria-modal="true" aria-labelledby="mindrise-dialog-title">
      ${hideCloseButton ? '' : '<button type="button" class="modal-close" data-dialog-close aria-label="Close">×</button>'}
      <h2 id="mindrise-dialog-title">${escapeHTML(title)}</h2>
      ${description ? `<p>${escapeHTML(description)}</p>` : ''}
      <form id="mindrise-dialog-form">${content}
        <p class="profile-dialog-message" id="mindrise-dialog-message" aria-live="polite"></p>
        <div class="profile-dialog-actions">
          <button type="button" class="secondary-button" data-dialog-close>${escapeHTML(cancelText)}</button>
          <button type="submit" class="${danger ? 'danger-button' : 'primary-button'}" id="mindrise-dialog-confirm">${escapeHTML(confirmText)}</button>
        </div>
      </form>
    </section>`

  document.body.appendChild(backdrop)

  const close = () => backdrop.remove()

  backdrop.querySelectorAll('[data-dialog-close]').forEach(button => {
    button.addEventListener('click', close)
  })

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })

  backdrop.querySelector('.mindrise-generic-dialog').addEventListener('click', event => {
    event.stopPropagation()
  })

  backdrop.querySelectorAll('[data-password-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = backdrop.querySelector(`#${toggle.dataset.passwordToggle}`)
      if (!input) return

      const visible = input.type === 'password'
      input.type = visible ? 'text' : 'password'
      toggle.textContent = visible ? 'Hide' : 'Show'
    })
  })

  const form = backdrop.querySelector('#mindrise-dialog-form')

  form.addEventListener('submit', async event => {
    event.preventDefault()

    const button = backdrop.querySelector('#mindrise-dialog-confirm')
    const message = backdrop.querySelector('#mindrise-dialog-message')

    button.disabled = true

    try {
      const result = await onConfirm?.(form, message)

      if (result !== false) close()
    } catch (error) {
      console.error(error)
      message.textContent = error?.message || 'Something went wrong. Please try again.'
    } finally {
      if (button.isConnected) button.disabled = false
    }
  })

  backdrop.querySelector('input,button[type="submit"]')?.focus()

  return { close, element: backdrop }
}

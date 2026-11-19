import { auth } from '../firebase.js'
import {
  applyAppearance,
  escapeHTML
} from '../utils/profile.js'
import { showToast } from '../utils/ui.js'

function getPreferenceKey() {
  return `mindrise-appearance-${auth.currentUser?.uid || 'guest'}`
}

function getAppearance() {
  return localStorage.getItem(getPreferenceKey()) || 'light'
}

function setAppearance(value) {
  localStorage.setItem(getPreferenceKey(), value)
  applyAppearance()
}

function renderSettingsHome(onBack, onSelectSetting) {
  const app = document.querySelector('#app')

  app.innerHTML = `
    <main class="settings-page page-shell">
      <header class="page-header settings-header">
        <button
          type="button"
          class="back-button"
          id="settings-back"
          aria-label="Go back"
        >
          &#8592;
        </button>

        <h1>Settings</h1>
      </header>

      <section class="settings-list">

        <button
          type="button"
          class="settings-item"
          data-setting="notifications"
        >
          <span class="settings-icon">&#128276;</span>

          <span class="settings-item-text">
            <strong>Notifications</strong>
            <small>Manage notification permissions</small>
          </span>

          <span class="settings-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="settings-item"
          data-setting="appearance"
        >
          <span class="settings-icon">&#9681;</span>

          <span class="settings-item-text">
            <strong>Appearance</strong>
            <small>Choose your app theme</small>
          </span>

          <span class="settings-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="settings-item"
          data-setting="privacy"
        >
          <span class="settings-icon">&#128274;</span>

          <span class="settings-item-text">
            <strong>Privacy</strong>
            <small>Review how Mindrise stores your information</small>
          </span>

          <span class="settings-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="settings-item"
          data-setting="about"
        >
          <span class="settings-icon">&#9432;</span>

          <span class="settings-item-text">
            <strong>About Mindrise</strong>
            <small>Learn more about the app</small>
          </span>

          <span class="settings-chevron">&#8250;</span>
        </button>

      </section>
    </main>
  `

  document.querySelector('#settings-back')
    ?.addEventListener('click', () => {
      onBack?.()
    })

  document.querySelectorAll('[data-setting]').forEach(button => {
    button.addEventListener('click', () => {
      const setting = button.dataset.setting

      if (setting === 'about') {
        onSelectSetting?.('about')
        return
      }

      renderSetting(setting, {
        onBack,
        onSelectSetting
      })
    })
  })
}

function renderSetting(setting, options = {}) {
  const {
    onBack,
    onSelectSetting,
    isNativeAndroid = false,
    onRequestNotifications
  } = options

  const app = document.querySelector('#app')

  if (!app) return

  let content = ''

  if (setting === 'appearance') {
    const appearance = getAppearance()

    content = `
      <h2>Appearance</h2>

      <p>
        Choose how Mindrise looks on this device.
      </p>

      <div
        class="appearance-options"
        role="radiogroup"
        aria-label="Choose appearance"
      >

        <label class="appearance-option ${
          appearance === 'light' ? 'selected' : ''
        }">
          <input
            type="radio"
            name="appearance"
            value="light"
            ${appearance === 'light' ? 'checked' : ''}
          >

          <span class="appearance-option-icon" aria-hidden="true">
            ☀
          </span>

          <span class="appearance-option-label">
            Light
          </span>
        </label>

        <label class="appearance-option ${
          appearance === 'dark' ? 'selected' : ''
        }">
          <input
            type="radio"
            name="appearance"
            value="dark"
            ${appearance === 'dark' ? 'checked' : ''}
          >

          <span class="appearance-option-icon" aria-hidden="true">
            ☾
          </span>

          <span class="appearance-option-label">
            Dark
          </span>
        </label>

      </div>

      <button
        type="button"
        class="primary-button"
        id="save-appearance"
      >
        Save Appearance
      </button>
    `

  } else if (setting === 'notifications') {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window

    const permission = supported
      ? Notification.permission
      : 'unsupported'

    if (isNativeAndroid) {
      content = `
        <h2>Notifications</h2>

        <p>
          Manage the Android permissions Mindrise needs to deliver alarms reliably.
        </p>

        <div class="settings-info">
          <strong>Platform</strong>
          <span>Android</span>
        </div>

        <div class="settings-info">
          <strong>Alarm notifications</strong>
          <span>Managed by Android permissions</span>
        </div>

        <p class="settings-note">
          Mindrise may need notification, exact alarm, and full-screen alarm permissions.
          These allow alarms to work more reliably when your phone is locked or the app is closed.
        </p>

        <button
          type="button"
          class="primary-button"
          id="configure-android-notifications"
        >
          Review Android Permissions
        </button>
      `

    } else {
      content = `
        <h2>Notifications</h2>

        <p>
          Manage whether your browser allows Mindrise to display notifications.
        </p>

        <div class="settings-info">
          <strong>Current permission</strong>
          <span>${escapeHTML(permission)}</span>
        </div>

        ${
          supported && permission === 'default'
            ? `
              <button
                type="button"
                class="primary-button"
                id="enable-notifications"
              >
                Allow Notifications
              </button>
            `
            : ''
        }

        ${
          permission === 'granted'
            ? `
              <p class="settings-note">
                Your browser currently allows Mindrise to display notifications.
              </p>
            `
            : ''
        }

        ${
          permission === 'denied'
            ? `
              <p class="settings-note">
                Notifications are blocked by your browser.
                You may need to change this permission in your browser settings.
              </p>
            `
            : ''
        }

        ${
          !supported
            ? `
              <p class="settings-note">
                Notifications are not supported in this browser or environment.
              </p>
            `
            : ''
        }

        <p class="settings-note">
          Allowing notifications does not automatically schedule alarms.
          Your alarm schedule is managed separately.
        </p>
      `
    }

  } else if (setting === 'privacy') {
    const signedIn = Boolean(auth.currentUser)

    content = `
      <h2>Privacy</h2>

      <p>
        Here is how Mindrise handles the information used by the app.
      </p>

      <div class="settings-info">
        <strong>App data</strong>
        <span>Stored on this device</span>
      </div>

      <div class="settings-info">
        <strong>Cloud synchronization</strong>
        <span>
          ${
            signedIn
              ? 'Available for your signed-in account'
              : 'Not signed in'
          }
        </span>
      </div>

      <div class="settings-info">
        <strong>Profile information</strong>
        <span>Associated with your account</span>
      </div>

      <div class="settings-info">
        <strong>Account passwords</strong>
        <span>Handled by Firebase Authentication</span>
      </div>

      <p class="settings-note">
        Mindrise stores app information such as alarms, routines, sleep records,
        and preferences locally. When you are signed in, supported app data may
        also synchronize through Firebase.
      </p>

      <p class="settings-note">
        Profile photos may use Firebase Storage when it is configured.
        Clearing app storage can remove locally stored information.
        Account and cloud-stored information may need to be managed separately.
      </p>
    `
  }

  app.innerHTML = `
    <main class="settings-page page-shell">

      <header class="page-header settings-header">
        <button
          type="button"
          class="back-button"
          id="setting-back"
          aria-label="Go back"
        >
          &#8592;
        </button>

        <h1>Settings</h1>
      </header>

      <section class="settings-detail">
        ${content}
      </section>

    </main>
  `

  document.querySelector('#setting-back')
    ?.addEventListener('click', () => {
      renderSettingsHome(onBack, onSelectSetting)
    })

  document.querySelectorAll('input[name="appearance"]')
    .forEach(input => {
      input.addEventListener('change', () => {
        document.querySelectorAll('.appearance-option')
          .forEach(option => {
            option.classList.toggle(
              'selected',
              Boolean(
                option.querySelector('input')?.checked
              )
            )
          })
      })
    })

  document.querySelector('#save-appearance')
    ?.addEventListener('click', () => {
      const selected = document.querySelector(
        'input[name="appearance"]:checked'
      )?.value

      if (!selected) return

      setAppearance(selected)

      renderSetting('appearance', options)

      showToast('Appearance saved.')
    })

  document.querySelector('#enable-notifications')
    ?.addEventListener('click', async () => {
      try {
        const permission = await Notification.requestPermission()

        showToast(
          permission === 'granted'
            ? 'Notifications are now allowed.'
            : 'Notification permission was not granted.',
          permission === 'granted' ? 'success' : 'error'
        )

        renderSetting('notifications', options)

      } catch (error) {
        console.error(
          'Could not request notification permission:',
          error
        )

        showToast(
          'Unable to request notification permission.',
          'error'
        )
      }
    })

  document.querySelector('#configure-android-notifications')
    ?.addEventListener('click', async () => {
      if (typeof onRequestNotifications !== 'function') {
        showToast(
          'Android permission settings are unavailable.',
          'error'
        )

        return
      }

      try {
        await onRequestNotifications()

      } catch (error) {
        console.error(
          'Could not configure Android notifications:',
          error
        )

        showToast(
          'Unable to open Android permission settings.',
          'error'
        )
      }
    })
}

export function renderSettings(onBack, onSelectSetting, options = {}) {
  const settingsOptions = {
    ...options,
    onBack,
    onSelectSetting
  }

  renderSettingsHome(onBack, setting => {
    if (setting === 'about') {
      onSelectSetting?.('about')
      return
    }

    renderSetting(setting, settingsOptions)
  })
}
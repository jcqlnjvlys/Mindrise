
import './style.css'
import { auth } from './firebase.js'
import { startCloudSync, queueCloudSave, stopCloudSync } from './utils/cloud-sync.js'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { App } from '@capacitor/app'
import {
  onAuthStateChanged,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from 'firebase/auth'
import { loadData, saveData, clearUserData } from './utils/storage.js'
import { applyAppearance } from './utils/profile.js'
import { showDialog, showToast } from './utils/ui.js'
import { calculateSleepDuration } from './utils/sleep-calculations.js'
import {
  getNextAlarmDate,
  formatTimeUntil,
  getAlarmOccurrenceKey
} from './utils/alarm-time.js'
import { renderLogin, renderSignup, renderPasswordReset } from './pages/auth.js'
import { renderAlarms } from './pages/alarms.js'
import { renderSetAlarm } from './pages/set-alarm.js'
import { renderRoutines } from './pages/routines.js'
import { renderTracker } from './pages/tracker.js'
import { renderSleep, stopSleepAudio } from './pages/sleep.js'
import { renderAbout } from './pages/about.js'
import { renderProfile } from './pages/profile.js'
import { renderSettings } from './pages/settings.js'
import { renderAlarmRinging, stopAlarmAudio } from './pages/alarm-ringing.js'
import { createChallengeSequence, renderChallenge } from './pages/challenges.js'
import { renderConfirmation } from './pages/confirmation.js'
import { renderYoureUp } from './pages/youre-up.js'

const MindriseAlarm = registerPlugin('MindriseAlarm')

let data = loadData()
let currentPage = 'alarms'
let editingAlarmId = null

const pageHistory = []

let activeAlarm = null
let alarmStage = null
let challengeSequence = []
let challengeIndex = 0
let confirmationDeadline = null
let confirmationCleanup = null

let nativeSchedulingEnabled = false
let nativePermissionChecked = false
let notificationPermissionPrompted = false
let exactAlarmPermissionPrompted = false
let fullScreenIntentPrompted = false
let checkingNativePending = false

let nativeSyncVersion = 0
let startupReady = false
let authInitializationVersion = 0

const firedOccurrences = new Set()

const isNativeAndroid = () => Capacitor.getPlatform() === 'android'

function renderSplash() {
  const app = document.querySelector('#app')

  app.innerHTML = `
    <main id="mindrise-splash" class="splash-screen">
      <img src="/mindrise-bird.png" alt="Mindrise bird"/>
      <h1>Mindrise</h1>
      <p>Your everyday companion for better mornings.</p>
    </main>
  `

  setTimeout(() => {
    const splash = document.querySelector('#mindrise-splash')

    if (splash) splash.classList.add('fade-out')

    setTimeout(initializeAuth, 450)
  }, 800)
}

/* Native alarm synchronization */

async function syncNativeAlarms({ askPermission = false } = {}) {
  if (!isNativeAndroid()) return

  const requestVersion = ++nativeSyncVersion

  const isLatestRequest = () => requestVersion === nativeSyncVersion

  try {
    const notificationPermission =
      await MindriseAlarm.checkNotificationPermission()

    if (!isLatestRequest()) return

    if (
      !notificationPermission?.granted &&
      askPermission &&
      !notificationPermissionPrompted
    ) {
      notificationPermissionPrompted = true

      showDialog({
        title: 'Allow Alarm Notifications',
        description: 'Allow Mindrise to send notifications so Android can display your alarm notification reliably when an alarm rings.',
        confirmText: 'Allow Notifications',
        onConfirm: async () => {
          await MindriseAlarm.requestNotificationPermission()
          return true
        }
      })
    }

    const permission = await MindriseAlarm.checkExactAlarmPermission()

    if (!isLatestRequest()) return

    nativeSchedulingEnabled = Boolean(permission?.granted)
    nativePermissionChecked = true

    if (!nativeSchedulingEnabled) {
      if (askPermission && !exactAlarmPermissionPrompted) {
        exactAlarmPermissionPrompted = true

        showDialog({
          title: 'Allow Reliable Alarms',
          description: 'For alarms to work while Mindrise is closed or your phone is locked, allow exact alarms in Android settings.',
          confirmText: 'Open Settings',
          onConfirm: async () => {
            await MindriseAlarm.requestExactAlarmPermission()
            return true
          }
        })
      }

      return
    }

    const fullScreenPermission =
      await MindriseAlarm.checkFullScreenIntentPermission()

    if (!isLatestRequest()) return

    if (
      !fullScreenPermission?.granted &&
      askPermission &&
      !fullScreenIntentPrompted
    ) {
      fullScreenIntentPrompted = true

      showDialog({
        title: 'Allow Full-Screen Alarms',
        description: 'Allow Mindrise to display its alarm screen over your lock screen when an alarm rings. You can change this permission in Android settings.',
        confirmText: 'Open Settings',
        onConfirm: async () => {
          await MindriseAlarm.requestFullScreenIntentPermission()
          return true
        }
      })
    }

    const alarmsToSync = (data.alarms || []).map(alarm => ({ ...alarm }))

    const result = await MindriseAlarm.syncAlarms({
      alarms: alarmsToSync
    })

    if (!isLatestRequest()) return

    nativeSchedulingEnabled = Boolean(result?.permissionGranted)

  } catch (error) {
    if (!isLatestRequest()) return

    nativeSchedulingEnabled = false
    nativePermissionChecked = true

    console.error('Could not sync native Mindrise alarms:', error)
  }
}

async function cancelNativeAlarms() {
  if (!isNativeAndroid()) return

  nativeSyncVersion++
  nativeSchedulingEnabled = false
  nativePermissionChecked = true

  try {
    await MindriseAlarm.cancelAllAlarms()
  } catch (error) {
    console.error(error)
  }
}

/* Native alarm session persistence */

function getAlarmSession() {
  if (!activeAlarm) return null

  return {
    alarm: activeAlarm,
    stage: alarmStage || 'ringing',
    challengeIndex,
    confirmationDeadline
  }
}

function saveAlarmSession() {
  if (!isNativeAndroid() || !activeAlarm) return

  const session = getAlarmSession()

  MindriseAlarm.saveAlarmSession({ session }).catch(error => {
    console.error('Could not save the active alarm session:', error)
  })
}

function clearAlarmSession() {
  if (!isNativeAndroid()) return

  MindriseAlarm.clearAlarmSession().catch(error => {
    console.error('Could not clear the active alarm session:', error)
  })
}

async function restoreNativeAlarmSession() {
  if (!isNativeAndroid()) return false

  try {
    const result = await MindriseAlarm.getAlarmSession()
    const session = result?.session

    if (!session?.alarm?.id) return false

    activeAlarm = session.alarm
    alarmStage = session.stage || 'ringing'

    challengeIndex = Math.max(
      0,
      Math.min(2, Number(session.challengeIndex) || 0)
    )

    const savedDeadline = session.confirmationDeadline

    confirmationDeadline =
      savedDeadline !== null &&
      savedDeadline !== undefined &&
      Number.isFinite(Number(savedDeadline))
        ? Number(savedDeadline)
        : null

    if (alarmStage === 'confirmation') {
      void MindriseAlarm.stopRinging()

      showWakeConfirmation(confirmationDeadline)

      return true
    }

    if (alarmStage === 'challenges') {
      challengeSequence = createChallengeSequence()

      if (challengeIndex >= 3) {
        challengeIndex = 2
      }

      void MindriseAlarm.startRinging({
        alarm: activeAlarm
      }).catch(error => {
        console.error('Could not resume native alarm playback:', error)
      })

      showCurrentChallenge()

      return true
    }

    alarmStage = 'ringing'
    challengeSequence = []
    challengeIndex = 0

    renderAlarmRinging(
      activeAlarm,
      startChallenges,
      true
    )

    void MindriseAlarm.startRinging({
      alarm: activeAlarm
    }).catch(error => {
      console.error('Could not resume native alarm playback:', error)
    })

    saveAlarmSession()

    return true

  } catch (error) {
    console.error('Could not restore the active alarm session:', error)
    return false
  }
}

async function checkPendingNativeAlarm() {
  if (
    !isNativeAndroid() ||
    !startupReady ||
    activeAlarm ||
    checkingNativePending
  ) {
    return
  }

  checkingNativePending = true

  try {
    const result = await MindriseAlarm.getPendingAlarm()

    if (result?.alarm?.id && !activeAlarm) {
      startRinging(result.alarm, true)
    }
  } catch (error) {
    console.error('Could not check pending alarm:', error)
  } finally {
    checkingNativePending = false
  }
}

/* Data persistence */

function persist() {
  saveData(data)
  queueCloudSave(data)

  if (isNativeAndroid()) {
    void syncNativeAlarms()
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/* Navigation */

function navigate(page, { replace = false } = {}) {
  stopSleepAudio()

  if (!replace && currentPage !== page) {
    pageHistory.push(currentPage)
  }

  currentPage = page
  renderPage()
}

function goBack() {
  stopSleepAudio()

  currentPage = pageHistory.pop() || 'alarms'
  renderPage()
}

function returnToAlarms() {
  stopSleepAudio()

  if (pageHistory[pageHistory.length - 1] === 'alarms') {
    pageHistory.pop()
  }

  editingAlarmId = null
  currentPage = 'alarms'
  renderPage()
}

function handleAndroidBackButton() {
  if (!isNativeAndroid()) return

  const dialog = document.querySelector('#mindrise-dialog')

  if (dialog) {
    dialog.remove()
    return
  }

  if (activeAlarm) {
    return
  }

  if (pageHistory.length > 0) {
    goBack()
    return
  }

  if (currentPage !== 'alarms') {
    stopSleepAudio()
    editingAlarmId = null
    currentPage = 'alarms'
    renderPage()
    return
  }

  void App.exitApp()
}

function openProfile() {
  navigate('profile')
}

function openAbout() {
  navigate('about')
}

function openSettings() {
  navigate('settings')
}

/* Account management */

async function deleteAccountWithPassword() {
  const user = auth.currentUser

  if (!user) return

  const providerId = user.providerData?.[0]?.providerId || 'password'

  const emailPassword = user.providerData?.some(
    provider => provider.providerId === 'password'
  )

  const eyeIcon = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `

  const eyeOffIcon = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18"/>
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a14.7 14.7 0 0 1-3.3 4.2"/>
      <path d="M6.2 6.2C3.6 8 2 12 2 12s3.6 7 10 7a10.6 10.6 0 0 0 4.2-.9"/>
    </svg>
  `

  const content = emailPassword
    ? `
      <label for="delete-account-password">Current password</label>
      <div class="password-field">
        <input
          id="delete-account-password"
          type="password"
          autocomplete="current-password"
          required
        >
        <button
          type="button"
          class="password-toggle"
          id="delete-account-password-toggle"
          aria-label="Show password"
          aria-pressed="false"
        >${eyeIcon}</button>
      </div>
    `
    : '<p class="settings-note">You will be asked to verify your identity with your sign-in provider before deletion.</p>'

  showDialog({
    title: 'Delete Mindrise Account?',
    description: 'This permanently deletes your Firebase account. This action cannot be undone.',
    content,
    confirmText: 'Delete Account',
    danger: true,
    hideCloseButton: true,
    onConfirm: async form => {
      try {
        if (emailPassword) {
          const password =
            form.querySelector('#delete-account-password')?.value || ''

          if (!password) {
            form.querySelector('#mindrise-dialog-message').textContent =
              'Enter your current password to continue.'

            return false
          }

          await reauthenticateWithCredential(
            user,
            EmailAuthProvider.credential(user.email, password)
          )

        } else if (providerId === 'google.com') {
          await reauthenticateWithPopup(user, new GoogleAuthProvider())

        } else if (providerId === 'facebook.com') {
          await reauthenticateWithPopup(user, new FacebookAuthProvider())

        } else {
          form.querySelector('#mindrise-dialog-message').textContent =
            'This sign-in method needs to be verified again before deletion.'

          return false
        }

        await deleteUser(user)
        clearUserData(user.uid)

        showToast('Your Mindrise account has been deleted.')

      } catch (error) {
        console.error(error)

        const message =
          error.code?.includes('wrong-password') ||
          error.code?.includes('credential')
            ? 'Your verification was incorrect. The account was not deleted.'
            : error.code === 'auth/requires-recent-login'
              ? 'Please sign in again, then retry account deletion.'
              : 'Unable to delete your account. Please try again.'

        form.querySelector('#mindrise-dialog-message').textContent = message

        return false
      }
    }
  })

  const passwordInput = document.querySelector('#delete-account-password')
  const passwordToggle = document.querySelector('#delete-account-password-toggle')

  if (passwordInput && passwordToggle) {
    passwordToggle.innerHTML = eyeIcon

    passwordToggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password'

      passwordInput.type = isPassword ? 'text' : 'password'
      passwordToggle.innerHTML = isPassword ? eyeOffIcon : eyeIcon
      passwordToggle.setAttribute(
        'aria-label',
        isPassword ? 'Hide password' : 'Show password'
      )
      passwordToggle.setAttribute(
        'aria-pressed',
        String(isPassword)
      )
    })
  }
}

/* Page rendering */

function renderPage() {
  if (currentPage === 'alarms') {
    renderAlarms(
      data,
      navigate,
      addAlarm,
      editAlarm,
      deleteAlarm,
      toggleAlarm,
      openProfile
    )

  } else if (currentPage === 'set-alarm') {
    const existingAlarm = editingAlarmId
      ? (data.alarms || []).find(alarm => alarm.id === editingAlarmId)
      : null

    if (editingAlarmId && !existingAlarm) {
      returnToAlarms()
      return
    }

    renderSetAlarm(
      existingAlarm,
      saveAlarm,
      returnToAlarms
    )

  } else if (currentPage === 'routines') {
    renderRoutines(
      data,
      navigate,
      addRoutine,
      toggleRoutine,
      editRoutine,
      deleteRoutine,
      openProfile
    )

  } else if (currentPage === 'tracker') {
    renderTracker(
      data,
      navigate,
      openProfile,
      saveSleepTime,
      changeSleepGoal,
      changeMood,
      deleteSleepRecord,
      clearSleepRecords
    )

  } else if (currentPage === 'sleep') {
    renderSleep(
      data,
      navigate,
      openProfile,
      changeSoundSettings,
      isNativeAndroid() ? MindriseAlarm : null
    )

  } else if (currentPage === 'profile') {
    renderProfile(auth.currentUser, {
      onBack: goBack,
      onDeleteAccount: deleteAccountWithPassword,
      onSettings: openSettings,
      onAbout: openAbout,
      onLogout: () => showDialog({
        title: 'Log Out?',
        description: 'Are you sure you want to log out of Mindrise?',
        confirmText: 'Log Out',
        hideCloseButton: true,
        onConfirm: async () => {
          try {
            await signOut(auth)
          } catch (error) {
            console.error(error)
            showToast('Unable to log out. Please try again.', 'error')
            return false
          }
        }
      })
    })

  } else if (currentPage === 'settings') {
    renderSettings(goBack, setting => {
      if (setting === 'about') navigate('about')
    })

  } else if (currentPage === 'about') {
    renderAbout(goBack)
  }
}

/* Alarms */

function addAlarm() {
  editingAlarmId = null
  navigate('set-alarm')
}

function editAlarm(id) {
  const alarm = (data.alarms || []).find(item => item.id === id)

  if (!alarm) return

  editingAlarmId = id
  navigate('set-alarm')
}

function saveAlarm(details) {
  const old = editingAlarmId
    ? data.alarms.find(a => a.id === editingAlarmId)
    : null

  const alarm = {
    ...details,
    id: editingAlarmId || makeId(),
    enabled: old ? old.enabled : true,
    repeat: details.repeat || []
  }

  data.alarms = editingAlarmId
    ? data.alarms.map(a => a.id === editingAlarmId ? alarm : a)
    : [...data.alarms, alarm]

  persist()

  const next = alarm.enabled ? getNextAlarmDate(alarm) : null

  returnToAlarms()

  if (next) {
    showToast(`Alarm set for ${formatTimeUntil(next)} from now.`)
  }
}

function deleteAlarm(id) {
  showDialog({
    title: 'Delete Alarm?',
    description: 'This alarm will be removed from your schedule.',
    confirmText: 'Delete Alarm',
    danger: true,
    onConfirm: () => {
      data.alarms = data.alarms.filter(a => a.id !== id)

      persist()
      renderPage()
    }
  })
}

function toggleAlarm(id, enabled) {
  data.alarms = data.alarms.map(a =>
    a.id === id ? { ...a, enabled } : a
  )

  persist()
  renderPage()
}

/* Routines */

function addRoutine() {
  showDialog({
    title: 'Add Routine Task',
    description: 'Add a task to your morning checklist.',
    content: `
      <label for="routine-task-name">Task name</label>
      <input
        id="routine-task-name"
        type="text"
        maxlength="60"
        placeholder="Enter a task"
        required
        autocomplete="off"
      >
    `,
    confirmText: 'Add Task',
    hideCloseButton: true,
    onConfirm: form => {
      const clean = form.querySelector('#routine-task-name')?.value.trim()

      if (!clean) {
        form.querySelector('#mindrise-dialog-message').textContent =
          'Please enter a task name.'

        return false
      }

      if (!Array.isArray(data.routines)) {
        data.routines = []
      }

      data.routines.push({
        id: makeId(),
        name: clean,
        completed: false
      })

      persist()
      renderPage()
    }
  })
}

function toggleRoutine(id, completed) {
  data.routines = (data.routines || []).map(task =>
    task.id === id ? { ...task, completed } : task
  )

  persist()
  renderPage()
}

function editRoutine(id) {
  const task = (data.routines || []).find(item => item.id === id)

  if (!task) return

  showDialog({
    title: 'Edit Routine Task',
    description: 'Update the name of this morning task.',
    content: `
      <label for="routine-task-name">Task name</label>
      <input
        id="routine-task-name"
        type="text"
        maxlength="60"
        value="${escapeHTML(task.name)}"
        required
        autocomplete="off"
      >
    `,
    confirmText: 'Save Changes',
    hideCloseButton: true,
    onConfirm: form => {
      const clean = form.querySelector('#routine-task-name')?.value.trim()

      if (!clean) {
        form.querySelector('#mindrise-dialog-message').textContent =
          'Please enter a task name.'

        return false
      }

      data.routines = (data.routines || []).map(item =>
        item.id === id ? { ...item, name: clean } : item
      )

      persist()
      renderPage()
    }
  })
}

function deleteRoutine(id) {
  showDialog({
    title: 'Delete Routine Task?',
    description: 'This task will be removed from your routine.',
    confirmText: 'Delete Task',
    danger: true,
    onConfirm: () => {
      data.routines = (data.routines || []).filter(
        task => task.id !== id
      )

      persist()
      renderPage()
    }
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

/* Sleep tracker */

function saveSleepTime(
  sleepTime,
  wakeTime,
  mood = '',
  sessionLabel = '',
  moodInsights = null
) {
  if (wakeTime) {
    const durationMinutes = calculateSleepDuration(
      sleepTime,
      wakeTime
    )

    if (durationMinutes === null || durationMinutes <= 0) return

    data.sleepRecords = [
      ...(data.sleepRecords || []),
      {
        id: makeId(),
        sleepTime,
        wakeTime,
        durationMinutes,
        mood: mood || data.pendingMood || '',
        moodInsights: moodInsights || data.pendingMoodInsights || null,
        sessionLabel: sessionLabel || 'Sleep session'
      }
    ]

    data.pendingWakeTime = null
    data.pendingSleepTime = null
    data.pendingMood = ''
    data.pendingMoodInsights = null

    persist()
    renderPage()

    return
  }

  data.pendingSleepTime = sleepTime

  persist()
  renderPage()

  showToast('Your sleep time has been saved.')
}

function changeSleepGoal(minutes) {
  data.sleepGoalMinutes = minutes

  persist()
  renderPage()
}

function changeMood(mood, moodInsights = null) {
  const today = new Date().toDateString()

  const latest = [...(data.sleepRecords || [])]
    .filter(record =>
      new Date(record.wakeTime).toDateString() === today
    )
    .sort((a, b) =>
      new Date(b.wakeTime) - new Date(a.wakeTime)
    )[0]

  if (!latest) {
    data.pendingMood = mood
    data.pendingMoodInsights = moodInsights

    persist()
    return
  }

  data.sleepRecords = data.sleepRecords.map(record =>
    record.id === latest.id
      ? {
          ...record,
          mood,
          ...(moodInsights ? { moodInsights } : {})
        }
      : record
  )

  data.pendingMood = ''
  data.pendingMoodInsights = null

  persist()
}

/* DELETE ONE SLEEP RECORD */

function deleteSleepRecord(record) {
  if (!record) return

  const sleepRecords = Array.isArray(data.sleepRecords)
    ? data.sleepRecords
    : []

  data.sleepRecords = sleepRecords.filter(item => {
    if (record.id && item.id) {
      return item.id !== record.id
    }

    return item.sleepTime !== record.sleepTime ||
      item.wakeTime !== record.wakeTime
  })

  persist()
  renderPage()
}

/* CLEAR ALL SAVED SLEEP RECORDS */

function clearSleepRecords() {
  data.sleepRecords = []

  persist()
  renderPage()
}

/* Sleep sounds */

function changeSoundSettings(soundId, loop) {
  data.selectedSound = soundId
  data.soundLoop = loop

  persist()
}

/* Alarm ringing and wake-up flow */

function startRinging(alarm, nativePlayback = false) {
  if (activeAlarm || !alarm?.id) return

  activeAlarm = alarm
  alarmStage = 'ringing'
  challengeSequence = []
  challengeIndex = 0
  confirmationDeadline = null

  saveAlarmSession()

  if (!alarm.repeat || alarm.repeat.length === 0) {
    data.alarms = (data.alarms || []).map(a =>
      a.id === alarm.id ? { ...a, enabled: false } : a
    )

    persist()
  }

  const useNativePlayback = isNativeAndroid()

  renderAlarmRinging(
    activeAlarm,
    startChallenges,
    useNativePlayback
  )

  if (useNativePlayback && !nativePlayback) {
    void MindriseAlarm.startRinging({
      alarm: activeAlarm
    }).catch(error => {
      console.error('Could not start native alarm playback:', error)
    })
  }
}

function startChallenges() {
  if (!activeAlarm || alarmStage === 'challenges') return

  alarmStage = 'challenges'
  challengeSequence = createChallengeSequence()
  challengeIndex = 0

  saveAlarmSession()
  showCurrentChallenge()
}

function showCurrentChallenge() {
  if (!activeAlarm || !challengeSequence[challengeIndex]) return

  renderChallenge(
    challengeSequence[challengeIndex],
    challengeIndex + 1,
    handleCorrectChallenge
  )
}

function handleCorrectChallenge() {
  if (alarmStage !== 'challenges') return

  if (challengeIndex >= 3) return

  challengeIndex++
  saveAlarmSession()

  if (challengeIndex < 3) {
    showCurrentChallenge()
    return
  }

  stopAlarmAudio()

  showWakeConfirmation()
}

function showWakeConfirmation(expiresAt = null) {
  if (confirmationCleanup) {
    confirmationCleanup()
    confirmationCleanup = null
  }

  alarmStage = 'confirmation'

  confirmationDeadline =
    expiresAt !== null &&
    expiresAt !== undefined &&
    Number.isFinite(Number(expiresAt))
      ? Number(expiresAt)
      : Date.now() + 100000

  saveAlarmSession()

  confirmationCleanup = renderConfirmation(
    confirmAwake,
    automaticallyRepeatAlarm,
    confirmationDeadline
  )
}

function getCurrentTimeString() {
  const d = new Date()

  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function automaticallyRepeatAlarm() {
  confirmationCleanup = null

  if (!activeAlarm) return

  alarmStage = 'ringing'
  confirmationDeadline = null
  challengeSequence = []
  challengeIndex = 0

  saveAlarmSession()

  const repeatedAlarm = {
    ...activeAlarm,
    time: getCurrentTimeString()
  }

  const useNativePlayback = isNativeAndroid()

  renderAlarmRinging(
    repeatedAlarm,
    startChallenges,
    useNativePlayback
  )

  if (useNativePlayback) {
    void MindriseAlarm.startRinging({
      alarm: activeAlarm
    }).catch(error => {
      console.error('Could not restart native alarm audio:', error)
    })
  }
}

function confirmAwake() {
  if (confirmationCleanup) {
    confirmationCleanup()
    confirmationCleanup = null
  }

  stopAlarmAudio()

  const wakeTime = new Date().toISOString()

  data.pendingWakeTime = wakeTime

  if (data.pendingSleepTime) {
    const durationMinutes = calculateSleepDuration(
      data.pendingSleepTime,
      wakeTime
    )

    if (durationMinutes !== null && durationMinutes > 0) {
      if (!Array.isArray(data.sleepRecords)) {
        data.sleepRecords = []
      }

      data.sleepRecords.push({
        id: makeId(),
        sleepTime: data.pendingSleepTime,
        wakeTime,
        durationMinutes,
        mood: data.pendingMood || '',
        moodInsights: data.pendingMoodInsights || null,
        sessionLabel: 'Sleep session'
      })

      data.pendingWakeTime = null
      data.pendingMood = ''
      data.pendingMoodInsights = null
    }

    data.pendingSleepTime = null
  }

  persist()

  activeAlarm = null
  alarmStage = null
  challengeSequence = []
  challengeIndex = 0
  confirmationDeadline = null

  clearAlarmSession()

  renderYoureUp(() => navigate('alarms'))
}

/* Alarm timing */

function getDueOccurrence(alarm, now) {
  if (!alarm?.time || !/^\d{2}:\d{2}$/.test(alarm.time)) {
    return null
  }

  const [h, m] = alarm.time.split(':').map(Number)

  if (h > 23 || m > 59) return null

  const occurrence = new Date(now)

  occurrence.setHours(h, m, 0, 0)

  const age = now.getTime() - occurrence.getTime()

  if (age < 0 || age >= 90000) return null

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const repeat = Array.isArray(alarm.repeat)
    ? alarm.repeat
    : []

  return !repeat.length ||
    repeat.includes(days[occurrence.getDay()])
      ? occurrence
      : null
}

function checkAlarms() {
  if (
    !startupReady ||
    activeAlarm ||
    (
      isNativeAndroid() &&
      (!nativePermissionChecked || nativeSchedulingEnabled)
    )
  ) {
    return
  }

  const now = new Date()

  for (const alarm of data.alarms || []) {
    if (!alarm.enabled) continue

    const occurrence = getDueOccurrence(alarm, now)

    if (!occurrence) continue

    const key = getAlarmOccurrenceKey(alarm, occurrence)

    if (!key || firedOccurrences.has(key)) continue

    firedOccurrences.add(key)

    startRinging(alarm, false)

    break
  }
}

/* Authentication and startup */

function startApp() {
  renderLogin({
    onLogin: () => {},
    onSignup: showSignup
  })
}

function showSignup() {
  renderSignup({
    onRegister: () => {},
    onLogin: startApp
  })
}

function initializeAuth() {
  const initializationVersion = ++authInitializationVersion

  const isLatestInitialization = () =>
    initializationVersion === authInitializationVersion

  const params = new URLSearchParams(window.location.search)

  const mode = params.get('mode')
  const oobCode = params.get('oobCode')

  if (mode === 'resetPassword' && oobCode) {
    startupReady = true

    renderPasswordReset(oobCode, () => {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      )

      startApp()
    })

    return
  }

  onAuthStateChanged(auth, async user => {
    if (!isLatestInitialization()) return

    startupReady = false

    if (user) {
      try {
        await user.reload()
      } catch (error) {
        console.warn(
          'Could not refresh the Mindrise profile:',
          error
        )
      }

      if (!isLatestInitialization()) return
    }

    applyAppearance()

    if (user) {
      stopCloudSync()

      data = loadData()

      currentPage = 'alarms'
      editingAlarmId = null
      pageHistory.length = 0

      let restoredSession = false

      if (isNativeAndroid()) {
        restoredSession = await restoreNativeAlarmSession()

        if (!isLatestInitialization()) return
      }

      if (!restoredSession && isNativeAndroid()) {
        await checkPendingNativeAlarm()

        if (!isLatestInitialization()) return
      }

      startupReady = true

      try {
        await startCloudSync(user.uid, {
          getLocalData: () => data,
          setLocalData: cloudData => {
            if (!isLatestInitialization()) return

            if (currentPage === 'set-alarm' && editingAlarmId) {
              const localEditingAlarm = (data.alarms || []).find(
                alarm => alarm.id === editingAlarmId
              )

              const remoteAlarms = Array.isArray(cloudData.alarms)
                ? cloudData.alarms
                : []

              data = {
                ...cloudData,
                alarms: localEditingAlarm
                  ? [
                      ...remoteAlarms.filter(
                        alarm => alarm.id !== editingAlarmId
                      ),
                      localEditingAlarm
                    ]
                  : remoteAlarms
              }
            } else {
              data = cloudData
            }

            saveData(data)

            if (!activeAlarm && currentPage !== 'set-alarm') {
              renderPage()
            }

            if (isNativeAndroid()) {
              void syncNativeAlarms()
            }
          }
        })
      } catch (error) {
        console.error(
          'Mindrise cloud sync could not start:',
          error
        )
      }

      if (!isLatestInitialization()) return

      await syncNativeAlarms({
        askPermission: true
      })

      if (!isLatestInitialization()) return

      if (!restoredSession && !activeAlarm) {
        renderPage()

        await checkPendingNativeAlarm()
      }

    } else {
      stopCloudSync()

      data = loadData()

      currentPage = 'alarms'
      editingAlarmId = null
      pageHistory.length = 0

      activeAlarm = null
      alarmStage = null
      challengeSequence = []
      challengeIndex = 0
      confirmationDeadline = null

      await cancelNativeAlarms()

      if (!isLatestInitialization()) return

      startupReady = true

      startApp()
    }
  })
}

/* Register Android's native system back-button listener */

if (isNativeAndroid()) {
  App.addListener('backButton', () => {
    handleAndroidBackButton()
  }).catch(error => {
    console.error('Could not register Android back-button handler:', error)
  })
}

setInterval(() => {
  void checkPendingNativeAlarm()
}, 1000)

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && startupReady) {
    void syncNativeAlarms({
      askPermission: true
    })

    void checkPendingNativeAlarm()
  }
})

window.addEventListener('focus', () => {
  if (!startupReady) return

  void syncNativeAlarms({
    askPermission: true
  })

  void checkPendingNativeAlarm()
})

renderSplash()

setInterval(checkAlarms, 1000)

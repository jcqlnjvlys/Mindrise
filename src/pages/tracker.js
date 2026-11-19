import { renderBottomNav, attachBottomNavEvents } from '../components/navigation.js'
import { renderMenu, attachMenuEvents } from '../components/menu.js'
import { formatDuration } from '../utils/sleep-calculations.js'

const moods = ['Tired', 'Groggy', 'Okay', 'Refreshed', 'Energized', 'Still sleepy']

const moodFeedback = {
  'Tired': {
    explanations: [
      'Feeling tired can sometimes be connected to how long you slept or how consistent your recent sleep schedule has been.',
      'Your morning may feel slower when your body has not had enough time to rest.',
      'A tiring morning can be a useful reminder to look at your recent bedtime and wake-up patterns.',
      'Your energy can be affected by changes in your sleep routine, even when those changes seem small.'
    ],
    suggestions: [
      'Try setting aside a little more time to wind down tonight.',
      'Keep your evening simple and give yourself enough time for sleep.',
      'Consider preparing for tomorrow earlier so your bedtime does not get pushed back.',
      'Look at your recent sleep records and see whether an earlier bedtime would fit your routine.'
    ]
  },
  'Groggy': {
    explanations: [
      'Grogginess can happen when you wake during a deeper stage of sleep or when your sleep schedule keeps changing.',
      'Your body may need a little time to adjust after waking.',
      'The timing of your wake-up can influence how alert you feel during the morning.',
      'Tracking your sleep duration and usual wake-up time can help you notice patterns.'
    ],
    suggestions: [
      'Try keeping your wake-up time consistent and give yourself a few quiet minutes to ease into the day.',
      'Open your curtains, get some natural light, and give yourself time to become fully alert.',
      'Start with a simple morning routine instead of rushing into several tasks.',
      'Compare your recent sleep sessions to see whether changes in timing might be affecting your mornings.'
    ]
  },
  'Okay': {
    explanations: [
      'An ordinary morning can still be useful information. Your sleep records can help you understand whether your routine is consistent.',
      'Your morning mood is one part of your sleep picture. Looking at it alongside your records can help you notice patterns.',
      'A steady morning can be a good opportunity to observe which parts of your sleep routine are working.',
      'Your sleep pattern is worth observing over time rather than judging from a single morning.'
    ],
    suggestions: [
      'Keep observing your sleep pattern and try to maintain a regular bedtime and wake-up time.',
      'Continue with the habits that make your evenings and mornings manageable.',
      'Keep recording your sleep sessions so you can compare your routine across different days.',
      'Take note of what you did before bedtime and whether it helped you settle into sleep.'
    ]
  },
  'Refreshed': {
    explanations: [
      'Feeling refreshed may suggest that your recent sleep routine is working well for you.',
      'A refreshed morning can be a positive sign, especially when your sleep duration is close to your chosen goal.',
      'Your recent bedtime, wake-up time, and overall sleep duration may be contributing to a comfortable morning.',
      'Feeling rested today gives you another useful point of comparison for future sleep records.'
    ],
    suggestions: [
      'Take note of the habits that helped you rest well and consider keeping them.',
      'Try maintaining a similar bedtime and wake-up time.',
      'Notice what made last night different and see whether those habits are realistic to repeat.',
      'Keep your routine steady without making unnecessary changes to what is already working.'
    ]
  },
  'Energized': {
    explanations: [
      'Feeling energized may reflect a satisfying night of rest and a morning routine that suits your needs.',
      'Your morning energy can be influenced by your recent sleep duration, sleep timing, and daily routine.',
      'An energized start is another useful point to compare with the sleep sessions you record.',
      'Your sleep records can help you see whether energized mornings tend to follow a particular sleep pattern.'
    ],
    suggestions: [
      'Take note of the routine you followed last night and consider keeping the habits that worked well.',
      'Continue giving yourself enough time for rest.',
      'Use your sleep log to compare this session with other mornings when you felt similarly energized.',
      'Record your next few sessions so you can see whether this pattern continues.'
    ]
  },
  'Still sleepy': {
    explanations: [
      'Feeling sleepy after waking can be associated with a shorter sleep duration or an irregular schedule.',
      'Your body may need more time to adjust after waking, particularly when your sleep timing changes.',
      'A sleepy morning can be a reason to review whether your current sleep goal matches your routine.',
      'Your recent sleep sessions may help explain whether you have been getting a consistent amount of rest.'
    ],
    suggestions: [
      'Try allowing enough time for sleep tonight and avoid sudden changes to your usual schedule.',
      'Give yourself a little more time to wake up and start with a calm morning routine.',
      'Consider whether your current sleep goal gives you enough time to rest.',
      'Take a look at your recent records and see whether your sleep sessions have been shorter than usual.'
    ]
  }
}

let currentView = 'week'

export function renderTracker(
  data,
  onNavigate,
  onProfile,
  onSaveSleep,
  onGoalChange,
  onMoodChange,
  onDeleteSleep = null,
  onClearSleepRecords = null
) {
  const records = [...(data.sleepRecords || [])]
    .filter(record =>
      record.sleepTime &&
      record.wakeTime &&
      !Number.isNaN(new Date(record.sleepTime).getTime()) &&
      !Number.isNaN(new Date(record.wakeTime).getTime())
    )
    .sort((a, b) => new Date(b.wakeTime) - new Date(a.wakeTime))

  const now = new Date()
  const todayKey = now.toDateString()

  const todayRecords = records.filter(record =>
    new Date(record.wakeTime).toDateString() === todayKey
  )

  const todayLatest = todayRecords[0] || null

  const pendingWakeDate = data.pendingWakeTime
    ? new Date(data.pendingWakeTime)
    : null

  const hasPendingWakeTime = Boolean(
    pendingWakeDate && !Number.isNaN(pendingWakeDate.getTime())
  )

  const displayedWakeTime = hasPendingWakeTime
    ? pendingWakeDate
    : todayLatest
      ? new Date(todayLatest.wakeTime)
      : null

  const goal = Number(data.sleepGoalMinutes) || 450
  const goalHours = Math.floor(goal / 60)
  const goalMinutes = goal % 60
  const todayTotal = totalDuration(todayRecords)

  let selectedMood = hasPendingWakeTime
    ? data.pendingMood || ''
    : todayLatest?.mood || ''

  let currentMoodInsights = selectedMood
    ? (
        hasPendingWakeTime
          ? data.pendingMoodInsights || null
          : todayLatest?.moodInsights || null
      ) || createMoodInsights(selectedMood)
    : null

  const displayedInsights = currentMoodInsights
  const canChooseMood = hasPendingWakeTime || Boolean(todayLatest)
  const goalPercentage = goal > 0 ? Math.round((todayTotal / goal) * 100) : 0
  const remaining = Math.max(0, goal - todayTotal)
  const goalReached = todayTotal >= goal

  const dailyTotals = getDailyTotals(records)
  const mainSessions = getMainSessions(records)

  const typicalSleep = getTypicalSleep(dailyTotals)

  const bestSleep = dailyTotals.length
    ? Math.max(...dailyTotals.map(day => day.total))
    : 0

  document.querySelector('#app').innerHTML = `
    ${renderTrackerStyles()}

    <main class="main-page tracker-page">
      <header class="page-header tracker-page-header">
        <div class="tracker-page-heading">
          <p class="tracker-eyebrow">REST, REFLECT, REPEAT</p>
          <h1>Sleep Tracker</h1>
          <p class="tracker-subtitle">A clearer picture of your rest starts here.</p>
        </div>
        <div class="tracker-menu-wrap">${renderMenu()}</div>
      </header>

      <section class="tracker-card tracker-mood-card">
        <p class="tracker-eyebrow">FIRST THINGS FIRST</p>
        <h2>How did you wake up?</h2>
        <p class="tracker-description">Choose your mood to get a little insight into your sleep.</p>

        <div class="tracker-mood-options">
          ${moods.map(item => `
            <button type="button"
              class="tracker-mood-option ${selectedMood === item ? 'selected' : ''}"
              data-mood="${escapeHTML(item)}"
              aria-pressed="${selectedMood === item}"
              ${canChooseMood ? '' : 'disabled'}>
              ${escapeHTML(item)}
            </button>
          `).join('')}
        </div>

        <p class="tracker-mood-status" aria-live="polite">
          ${hasPendingWakeTime
            ? selectedMood
              ? 'Your mood will be saved with this sleep session.'
              : 'Choose your mood to receive a little insight into your morning.'
            : todayLatest
              ? 'Your mood is saved with today’s latest sleep session.'
              : 'Your morning mood check-in will be available when a wake-up time is recorded.'}
        </p>
      </section>

      <section class="tracker-card tracker-note-card">
        <p class="tracker-eyebrow">A NOTE ABOUT YOUR MORNING</p>
        <h2>What this might mean</h2>
        <p class="tracker-description tracker-explanation" aria-live="polite">
          ${displayedInsights
            ? escapeHTML(displayedInsights.explanation)
            : 'Your morning reflection will appear here after you choose a wake-up mood.'}
        </p>
        <div class="tracker-suggestion">
          <strong>A small thing to try</strong>
          <p class="tracker-suggestion-text" aria-live="polite">
            ${displayedInsights
              ? escapeHTML(displayedInsights.suggestion)
              : 'Choose a mood to receive a small suggestion for your morning.'}
          </p>
        </div>
      </section>

      <section class="tracker-card tracker-daily-card">
        <p class="tracker-eyebrow">TODAY</p>
        <h2>Daily sleep record</h2>
        <p class="tracker-description">Record more than one session, including naps.</p>

        <form id="tracker-sleep-form" class="tracker-sleep-form">
          <div class="tracker-field">
            <span class="tracker-field-heading"><strong>Wake-up time</strong></span>
            <div class="tracker-recorded-time">
              <strong>
                ${displayedWakeTime
                  ? escapeHTML(formatDateTime(displayedWakeTime))
                  : 'No wake-up time recorded yet.'}
              </strong>
              <small>
                ${hasPendingWakeTime
                  ? 'Recorded automatically'
                  : todayLatest
                    ? 'Latest recorded wake-up'
                    : 'Wake-up time is recorded automatically by your alarm.'}
              </small>
            </div>
          </div>

          <div class="tracker-field">
            <span class="tracker-field-heading"><strong>When did this sleep session begin?</strong></span>
            <button type="button" id="tracker-open-time-modal"
              class="tracker-time-picker-trigger" ${hasPendingWakeTime ? '' : 'disabled'}>
              <span id="tracker-sleep-time-display">Choose date and time</span>
              <span class="tracker-picker-icon">▦</span>
            </button>
            <input type="hidden" id="tracker-sleep-time" value="">
          </div>

          <label class="tracker-field">
            <span class="tracker-field-heading"><strong>Session label</strong><small>Optional</small></span>
            <input type="text" id="tracker-session-label" maxlength="50"
              placeholder="Night sleep, afternoon nap..." ${hasPendingWakeTime ? '' : 'disabled'}>
          </label>

          <button type="submit" class="tracker-save-session" ${hasPendingWakeTime ? '' : 'disabled'}>
            Save sleep session
          </button>
          <p id="tracker-sleep-message" class="tracker-form-message" aria-live="polite"></p>
        </form>

        <div class="tracker-today-sessions">
          ${todayRecords.length
            ? todayRecords.map(record => `
                <div class="tracker-session-row">
                  <div class="tracker-session-main">
                    <strong>${escapeHTML(record.sessionLabel || 'Sleep session')}</strong>
                    <span>${formatClock(record.sleepTime)} – ${formatClock(record.wakeTime)}</span>
                  </div>
                  <div class="tracker-row-actions">
                    <strong class="tracker-session-duration">${formatDuration(getDuration(record))}</strong>
                    <button type="button" class="tracker-delete-button"
                      data-delete-record="${escapeHTML(record.sleepTime)}"
                      aria-label="Delete sleep session" title="Delete sleep session">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v7m4-7v7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              `).join('')
            : `<p class="tracker-empty">No sleep sessions recorded for today yet.</p>`}
        </div>

        <div class="tracker-today-total">
          <span>Today's total sleep</span>
          <strong>${formatDuration(todayTotal)}</strong>
        </div>
      </section>

      <div class="tracker-modal-backdrop" id="tracker-time-modal" aria-hidden="true">
        <div class="tracker-time-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-modal-title">
          <div class="tracker-modal-heading">
            <div>
              <p class="tracker-eyebrow">SLEEP SESSION</p>
              <h2 id="tracker-modal-title">When did you fall asleep?</h2>
            </div>
            <button type="button" class="tracker-modal-close" id="tracker-close-time-modal" aria-label="Close">×</button>
          </div>
          <p class="tracker-modal-description">Select the date and approximate time your sleep session began.</p>
          <label class="tracker-modal-field">
            <span>Date</span><input type="date" id="tracker-modal-date">
          </label>
          <label class="tracker-modal-field">
            <span>Time</span><input type="time" id="tracker-modal-time">
          </label>
          <p class="tracker-modal-error" id="tracker-modal-error"></p>
          <div class="tracker-modal-actions">
            <button type="button" id="tracker-cancel-time" class="tracker-modal-cancel">Cancel</button>
            <button type="button" id="tracker-confirm-time" class="tracker-modal-confirm">Confirm</button>
          </div>
        </div>
      </div>

      <section class="tracker-card tracker-goal-card">
        <p class="tracker-eyebrow">YOUR TARGET</p>
        <h2>Sleep goal</h2>
        <p class="tracker-description">Choose a daily sleep target that makes sense for your routine.</p>

        <div class="tracker-goal-editor">
          <label><span>Hours</span><input type="number" id="tracker-goal-hours" min="0" max="23" value="${goalHours}"></label>
          <label><span>Minutes</span><input type="number" id="tracker-goal-minutes" min="0" max="59" value="${goalMinutes}"></label>
        </div>

        <button type="button" id="tracker-save-goal" class="tracker-save-goal">Save goal</button>
        <p id="tracker-goal-message" class="tracker-form-message" aria-live="polite"></p>
        <p class="tracker-current-goal">Current goal: <strong>${formatDuration(goal)}</strong></p>

        <div class="tracker-goal-progress">
          <div class="tracker-progress-heading">
            <span>Today's sleep goal progress</span><strong>${Math.min(goalPercentage, 100)}%</strong>
          </div>
          <div class="tracker-progress-track">
            <div class="tracker-progress-fill" style="width:${Math.min(goalPercentage, 100)}%"></div>
          </div>
          <p>
            ${goalReached
              ? 'You reached your daily sleep goal!'
              : todayTotal > 0
                ? `${formatDuration(remaining)} more to reach your goal.`
                : 'Progress will appear after you save a sleep session.'}
          </p>
        </div>
      </section>

      <section class="tracker-card tracker-history-card">
        <p class="tracker-eyebrow">YOUR PATTERNS</p>
        <h2>Sleep history</h2>
        <p class="tracker-description">Review your recent sleep duration.</p>

        <div class="tracker-period-tabs" role="group" aria-label="Sleep history period">
          <button type="button" class="tracker-period-tab ${currentView === 'week' ? 'active' : ''}" data-view="week">Week</button>
          <button type="button" class="tracker-period-tab ${currentView === 'month' ? 'active' : ''}" data-view="month">Month</button>
          <button type="button" class="tracker-period-tab ${currentView === 'year' ? 'active' : ''}" data-view="year">Year</button>
        </div>

        <div class="tracker-chart" id="tracker-chart">
          ${renderGraph(records, currentView)}
        </div>
      </section>

      <section class="tracker-card tracker-log-card">
        <div class="tracker-log-heading">
          <div>
            <p class="tracker-eyebrow">PAST SESSIONS</p>
            <h2>Sleep log</h2>
          </div>
          ${records.length
            ? `<button type="button" class="tracker-clear-all" id="tracker-clear-all">Clear All</button>`
            : ''}
        </div>

        <div class="tracker-log-list">
          ${records.length
            ? records.map(record => `
                <div class="tracker-log-row">
                  <div class="tracker-log-main">
                    <strong>${escapeHTML(record.sessionLabel || 'Sleep session')}</strong>
                    <span>${formatDate(record.wakeTime)}</span>
                    <span>${formatClock(record.sleepTime)} – ${formatClock(record.wakeTime)}</span>
                  </div>
                  <div class="tracker-row-actions">
                    <strong class="tracker-session-duration">${formatDuration(getDuration(record))}</strong>
                    <button type="button" class="tracker-delete-button"
                      data-delete-record="${escapeHTML(record.sleepTime)}"
                      aria-label="Delete sleep session" title="Delete sleep session">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v7m4-7v7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              `).join('')
            : `<p class="tracker-empty">Your completed sleep sessions will appear here.</p>`}
        </div>
      </section>

      <section class="tracker-card tracker-insights-card">
        <p class="tracker-eyebrow">AT A GLANCE</p>
        <h2>Your sleep insights</h2>
        ${dailyTotals.length
          ? `
            <div class="tracker-insight-grid">
              <div class="tracker-insight-item"><span>Typical Sleep</span><strong>${typicalSleep ? formatDuration(typicalSleep) : '—'}</strong></div>
              <div class="tracker-insight-item"><span>Best Sleep</span><strong>${bestSleep ? formatDuration(bestSleep) : '—'}</strong></div>
              <div class="tracker-insight-item"><span>Average Wake-up Time</span><strong>${mainSessions.length ? averageClock(mainSessions, 'wakeTime') : '—'}</strong></div>
              <div class="tracker-insight-item"><span>Average Bedtime</span><strong>${mainSessions.length ? averageClock(mainSessions, 'sleepTime') : '—'}</strong></div>
            </div>
          `
          : `<p class="tracker-empty">Insights will appear as you record more sleep sessions.</p>`}
      </section>

      ${renderBottomNav('tracker')}
    </main>
  `

  attachBottomNavEvents(onNavigate)
  attachMenuEvents(onProfile)

  // Mood check-in
  const moodButtons = document.querySelectorAll('.tracker-mood-option')
  const moodStatus = document.querySelector('.tracker-mood-status')
  const explanationElement = document.querySelector('.tracker-explanation')
  const suggestionElement = document.querySelector('.tracker-suggestion-text')

  moodButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!canChooseMood) return

      const mood = button.dataset.mood
      if (!moods.includes(mood)) return

      selectedMood = mood
      currentMoodInsights = createMoodInsights(mood, currentMoodInsights)

      moodButtons.forEach(moodButton => {
        const isSelected = moodButton.dataset.mood === mood
        moodButton.classList.toggle('selected', isSelected)
        moodButton.setAttribute('aria-pressed', String(isSelected))
      })

      if (moodStatus) {
        moodStatus.textContent = hasPendingWakeTime
          ? 'Your mood will be saved with this sleep session.'
          : 'Your mood is saved with today’s latest sleep session.'
      }

      if (explanationElement) {
        explanationElement.textContent = currentMoodInsights.explanation
      }

      if (suggestionElement) {
        suggestionElement.textContent = currentMoodInsights.suggestion
      }

      onMoodChange(selectedMood, currentMoodInsights)
    })
  })

  // Sleep time modal
  const modal = document.querySelector('#tracker-time-modal')
  const dateInput = document.querySelector('#tracker-modal-date')
  const timeInput = document.querySelector('#tracker-modal-time')
  const modalError = document.querySelector('#tracker-modal-error')
  const sleepTimeInput = document.querySelector('#tracker-sleep-time')
  const sleepTimeDisplay = document.querySelector('#tracker-sleep-time-display')

  function openTimeModal() {
    if (!hasPendingWakeTime) return

    const defaultDate = new Date(data.pendingWakeTime)
    defaultDate.setDate(defaultDate.getDate() - 1)

    dateInput.value = toDateInputValue(defaultDate)
    timeInput.value = '22:00'
    modalError.textContent = ''
    modal.classList.add('open')
    modal.setAttribute('aria-hidden', 'false')
  }

  function closeTimeModal() {
    modal.classList.remove('open')
    modal.setAttribute('aria-hidden', 'true')
  }

  document.querySelector('#tracker-open-time-modal')
    .addEventListener('click', openTimeModal)

  document.querySelector('#tracker-close-time-modal')
    .addEventListener('click', closeTimeModal)

  document.querySelector('#tracker-cancel-time')
    .addEventListener('click', closeTimeModal)

  modal.addEventListener('click', event => {
    if (event.target === modal) closeTimeModal()
  })

  document.querySelector('#tracker-confirm-time').addEventListener('click', () => {
    if (!dateInput.value || !timeInput.value) {
      modalError.textContent = 'Please choose both a date and a time.'
      return
    }

    const chosenDate = new Date(`${dateInput.value}T${timeInput.value}`)

    if (Number.isNaN(chosenDate.getTime())) {
      modalError.textContent = 'Please choose a valid date and time.'
      return
    }

    if (chosenDate > new Date()) {
      modalError.textContent = 'The sleep start time cannot be in the future.'
      return
    }

    if (chosenDate >= new Date(data.pendingWakeTime)) {
      modalError.textContent = 'The sleep session must begin before your wake-up time.'
      return
    }

    sleepTimeInput.value = chosenDate.toISOString()
    sleepTimeDisplay.textContent = formatDateTime(chosenDate)
    closeTimeModal()
  })

  // Save sleep session
  document.querySelector('#tracker-sleep-form').addEventListener('submit', event => {
    event.preventDefault()

    const message = document.querySelector('#tracker-sleep-message')
    const sleepValue = sleepTimeInput.value
    const sessionLabel = document.querySelector('#tracker-session-label').value.trim()

    if (!hasPendingWakeTime) {
      message.textContent = 'Your wake-up time has not been recorded yet.'
      return
    }

    if (!sleepValue) {
      message.textContent = 'Please choose when this sleep session began.'
      return
    }

    const wakeDate = new Date(data.pendingWakeTime)
    const sleepDate = new Date(sleepValue)

    if (
      Number.isNaN(wakeDate.getTime()) ||
      Number.isNaN(sleepDate.getTime()) ||
      sleepDate >= wakeDate ||
      sleepDate > new Date()
    ) {
      message.textContent = 'Please choose a valid sleep start time.'
      return
    }

    const durationMinutes = Math.floor(
      (wakeDate.getTime() - sleepDate.getTime()) / 60000
    )

    if (durationMinutes <= 0) {
      message.textContent = 'Please enter a valid sleep session.'
      return
    }

    onSaveSleep(
      sleepDate.toISOString(),
      data.pendingWakeTime,
      selectedMood || '',
      sessionLabel || 'Sleep session',
      currentMoodInsights || null
    )
  })

  // Save sleep goal
  document.querySelector('#tracker-save-goal').addEventListener('click', () => {
    const hours = Number(document.querySelector('#tracker-goal-hours').value)
    const minutes = Number(document.querySelector('#tracker-goal-minutes').value)
    const message = document.querySelector('#tracker-goal-message')

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      (hours === 0 && minutes === 0)
    ) {
      message.textContent = 'Please enter a valid sleep goal.'
      return
    }

    onGoalChange(hours * 60 + minutes)
  })

  // Custom in-app delete confirmation modals
  document.querySelectorAll('.tracker-delete-button').forEach(button => {
    button.addEventListener('click', () => {
      const sleepTime = button.dataset.deleteRecord
      const record = records.find(item => String(item.sleepTime) === sleepTime)

      if (!record) return

      showTrackerConfirmation({
        title: 'Delete sleep session?',
        description: 'This sleep session will be permanently removed from your sleep log.',
        confirmText: 'Delete Session',
        onConfirm: () => {
          if (typeof onDeleteSleep !== 'function') {
            return {
              success: false,
              message: 'Sleep-record deletion is not connected.'
            }
          }

          onDeleteSleep(record)
          return { success: true }
        }
      })
    })
  })

  // Custom in-app Clear All confirmation modal
  const clearAllButton = document.querySelector('#tracker-clear-all')

  if (clearAllButton) {
    clearAllButton.addEventListener('click', () => {
      showTrackerConfirmation({
        title: 'Clear all sleep records?',
        description: 'All saved sleep sessions will be permanently removed. This action cannot be undone.',
        confirmText: 'Clear All',
        danger: true,
        onConfirm: () => {
          if (typeof onClearSleepRecords !== 'function') {
            return {
              success: false,
              message: 'Clear All is not connected.'
            }
          }

          onClearSleepRecords()
          return { success: true }
        }
      })
    })
  }

  // Sleep history tabs
  document.querySelectorAll('.tracker-period-tab').forEach(button => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view

      document.querySelectorAll('.tracker-period-tab').forEach(tab => {
        tab.classList.toggle('active', tab === button)
      })

      document.querySelector('#tracker-chart').innerHTML =
        renderGraph(records, currentView)
    })
  })
}

function showTrackerConfirmation({
  title,
  description,
  confirmText,
  danger = false,
  onConfirm
}) {
  const existing = document.querySelector('#tracker-confirm-modal')
  if (existing) existing.remove()

  const backdrop = document.createElement('div')
  backdrop.id = 'tracker-confirm-modal'
  backdrop.className = 'tracker-confirm-backdrop'
  backdrop.innerHTML = `
    <div class="tracker-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="tracker-confirm-title">
      <div class="tracker-confirm-icon ${danger ? 'danger' : ''}">
        ${danger
          ? `<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6m4-6v6"/></svg>`
          : `<svg viewBox="0 0 24 24"><path d="M12 8v5m0 3h.01M10 3h4l8 17H2z"/></svg>`}
      </div>
      <h2 id="tracker-confirm-title">${escapeHTML(title)}</h2>
      <p class="tracker-confirm-description">${escapeHTML(description)}</p>
      <p class="tracker-confirm-error" aria-live="polite"></p>
      <div class="tracker-confirm-actions">
        <button type="button" class="tracker-confirm-cancel">Cancel</button>
        <button type="button" class="tracker-confirm-submit ${danger ? 'danger' : ''}">${escapeHTML(confirmText)}</button>
      </div>
    </div>
  `

  document.querySelector('#app').appendChild(backdrop)

  const cancelButton = backdrop.querySelector('.tracker-confirm-cancel')
  const submitButton = backdrop.querySelector('.tracker-confirm-submit')
  const errorElement = backdrop.querySelector('.tracker-confirm-error')

  const close = () => backdrop.remove()

  cancelButton.addEventListener('click', close)

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })

  const handleKeydown = event => {
    if (event.key === 'Escape' && backdrop.isConnected) {
      close()
      document.removeEventListener('keydown', handleKeydown)
    }
  }

  document.addEventListener('keydown', handleKeydown)

  submitButton.addEventListener('click', () => {
    submitButton.disabled = true
    cancelButton.disabled = true

    let result

    try {
      result = onConfirm()
    } catch (error) {
      console.error(error)
      result = {
        success: false,
        message: 'Something went wrong. Please try again.'
      }
    }

    if (result && result.success === false) {
      errorElement.textContent = result.message || 'Unable to complete this action.'
      submitButton.disabled = false
      cancelButton.disabled = false
      return
    }

    close()
    document.removeEventListener('keydown', handleKeydown)
  })
}

function createMoodInsights(mood, previousInsights = null) {
  const feedback = moodFeedback[mood]
  if (!feedback) return null

  return {
    explanation: pickDifferent(feedback.explanations, previousInsights?.explanation),
    suggestion: pickDifferent(feedback.suggestions, previousInsights?.suggestion)
  }
}

function pickDifferent(options, previous) {
  const alternatives = options.filter(option => option !== previous)
  const choices = alternatives.length ? alternatives : options
  return choices[Math.floor(Math.random() * choices.length)]
}

function getDuration(record) {
  if (Number.isFinite(record.durationMinutes)) {
    return Math.max(0, record.durationMinutes)
  }

  const difference =
    new Date(record.wakeTime).getTime() -
    new Date(record.sleepTime).getTime()

  return Math.max(0, Math.floor(difference / 60000))
}

function totalDuration(records) {
  return records.reduce((sum, record) => sum + getDuration(record), 0)
}

function getDailyTotals(records) {
  const grouped = new Map()

  records.forEach(record => {
    const date = new Date(record.wakeTime)
    const key = date.toDateString()

    if (!grouped.has(key)) {
      grouped.set(key, { key, date, total: 0, records: [] })
    }

    const day = grouped.get(key)
    day.total += getDuration(record)
    day.records.push(record)
  })

  return [...grouped.values()].sort((a, b) => a.date - b.date)
}

function getTypicalSleep(days) {
  if (!days.length) return 0

  const counts = new Map()

  days.forEach(day => {
    const rounded = Math.round(day.total / 30) * 30
    counts.set(rounded, (counts.get(rounded) || 0) + 1)
  })

  const highestCount = Math.max(...counts.values())

  const mostCommon = [...counts.entries()]
    .filter(([, count]) => count === highestCount)
    .sort((a, b) => b[0] - a[0])

  return mostCommon[0]?.[0] || 0
}

function getMainSessions(records) {
  const days = new Map()

  records.forEach(record => {
    const key = new Date(record.wakeTime).toDateString()

    if (!days.has(key)) days.set(key, [])
    days.get(key).push(record)
  })

  return [...days.values()].map(dayRecords => {
    const nonNaps = dayRecords.filter(record =>
      !String(record.sessionLabel || '').toLowerCase().includes('nap')
    )

    const candidates = nonNaps.length ? nonNaps : dayRecords

    return [...candidates].sort((a, b) => getDuration(b) - getDuration(a))[0]
  })
}

/* Graphs:
   Week and Month: 0–24 hours, ticks every 4 hours.
   Year: monthly cumulative totals, maximum scale of 744 hours (31 days).
*/

function renderGraph(records, view) {
  const now = new Date()
  const entries = []

  if (view === 'week') {
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - offset)

      entries.push({
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        sublabel: String(date.getDate()),
        date
      })
    }
  } else if (view === 'month') {
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day)

      entries.push({
        label: String(day),
        sublabel: date.toLocaleDateString('en', { weekday: 'short' }),
        date
      })
    }
  } else {
    for (let offset = 11; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)

      entries.push({
        label: date.toLocaleDateString('en', { month: 'short' }),
        date,
        month: true
      })
    }
  }

  const durations = entries.map(entry => {
    const matching = records.filter(record => {
      const wake = new Date(record.wakeTime)

      if (entry.month) {
        return (
          wake.getFullYear() === entry.date.getFullYear() &&
          wake.getMonth() === entry.date.getMonth()
        )
      }

      return wake.toDateString() === entry.date.toDateString()
    })

    return totalDuration(matching)
  })

  // Daily graphs: 24 hours (1440 minutes).
  // Year graph: 31 days x 24 hours (744 hours / 44640 minutes).
  const scaleMax = view === 'year'
    ? 31 * 24 * 60
    : 24 * 60

  const ticks = view === 'year'
    ? [744, 558, 372, 186, 0]
    : [24, 20, 16, 12, 8, 4, 0]

  const plotColumns = entries.map((entry, index) => {
    const duration = durations[index]
    const height = Math.min(100, (duration / scaleMax) * 100)

    const isToday = !entry.month &&
      entry.date.toDateString() === now.toDateString()

    return `
      <div class="tracker-chart-column ${isToday ? 'today' : ''}"
        title="${escapeHTML(entry.label)}: ${duration ? formatDuration(duration) : 'No record'}">

        <div class="tracker-chart-bar-track">
          <div class="tracker-chart-bar bar-${index % 7}"
            style="height:${height}%"></div>
        </div>

        <span class="tracker-chart-label">
          ${escapeHTML(entry.label)}
        </span>

        ${view === 'week'
          ? `<span class="tracker-chart-sublabel">${escapeHTML(entry.sublabel || '')}</span>`
          : ''}
      </div>
    `
  }).join('')

  const tickLabels = ticks.map(value => `
    <div class="tracker-y-tick">
      <span>${value}h</span>
    </div>
  `).join('')

  return `
    <div class="tracker-chart-layout ${view === 'month' ? 'tracker-chart-month' : ''} ${view === 'year' ? 'tracker-chart-year-layout' : ''}">

      <div class="tracker-y-axis" aria-label="Sleep hours scale">
        ${tickLabels}
      </div>

      <div class="tracker-chart-scroll">
        <div class="tracker-chart-plot">

          <div class="tracker-chart-columns
            ${view === 'week' ? 'tracker-week-columns' : ''}
            ${view === 'month' ? 'tracker-month-columns' : ''}
            ${view === 'year' ? 'tracker-year-columns' : ''}">

            ${plotColumns}

          </div>
        </div>
      </div>
    </div>
  `
}

function averageClock(records, field) {
  if (!records.length) return '—'

  const minutes = records.map(record => {
    const date = new Date(record[field])
    return date.getHours() * 60 + date.getMinutes()
  })

  const radians = minutes.map(value => (value / 1440) * Math.PI * 2)
  const sin = radians.reduce((sum, value) => sum + Math.sin(value), 0)
  const cos = radians.reduce((sum, value) => sum + Math.cos(value), 0)

  let angle = Math.atan2(sin, cos)
  if (angle < 0) angle += Math.PI * 2

  const averageMinutes =
    Math.round((angle / (Math.PI * 2)) * 1440) % 1440

  const date = new Date()
  date.setHours(
    Math.floor(averageMinutes / 60),
    averageMinutes % 60,
    0,
    0
  )

  return date.toLocaleTimeString('en', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatClock(value) {
  return new Date(value).toLocaleTimeString('en', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatDateTime(value) {
  return `${formatDate(value)} · ${formatClock(value)}`
}

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function renderTrackerStyles() {
  return `
    <style>
      .tracker-page {
        --tracker-navy:#173653;
        --tracker-blue:#438fc4;
        --tracker-muted:#82919e;
        --tracker-border:#dce7ef;
        box-sizing:border-box;
        width:min(100%,900px);
        max-width:900px;
        min-height:100vh;
        margin:0 auto;
        padding:34px 30px 118px;
        color:var(--tracker-navy);
        background:transparent;
        font-family:'DM Sans',sans-serif;
      }

      .tracker-page *, .tracker-page *::before, .tracker-page *::after {
        box-sizing:border-box;
      }

      .tracker-page .tracker-page-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:20px;
        margin:0 auto 26px;
        padding-top:0;
        max-width:100%;
      }

      .tracker-page-heading{min-width:0}

      .tracker-page .tracker-eyebrow {
        margin:0 0 10px;
        color:#5c91b5;
        font-size:10px;
        font-weight:800;
        letter-spacing:2px;
        line-height:1.4;
      }

      .tracker-page .tracker-page-header h1 {
        margin:0;
        color:#153653;
        font-family:'Manrope',sans-serif;
        font-size:30px;
        font-weight:800;
        letter-spacing:-1px;
        line-height:1.2;
      }

      .tracker-page .tracker-subtitle {
        margin:8px 0 0;
        color:#82919e;
        font-size:13px;
        line-height:1.55;
      }

      .tracker-page .tracker-menu-wrap{flex:0 0 auto}

      .tracker-page .tracker-card {
        width:100%;
        max-width:100%;
        margin:0 auto 18px;
        padding:22px;
        overflow:hidden;
        border:1px solid var(--tracker-border);
        border-radius:20px;
        background:rgba(255,255,255,.94);
        box-shadow:0 12px 35px rgba(42,91,126,.055);
      }

      .tracker-page .tracker-card h2 {
        margin:0;
        color:#193954;
        font-family:'Manrope',sans-serif;
        font-size:18px;
        font-weight:700;
        letter-spacing:-.3px;
        line-height:1.3;
      }

      .tracker-page .tracker-card .tracker-eyebrow{margin-bottom:10px}
      .tracker-page .tracker-description{margin:8px 0 0;color:#82919e;font-size:12px;line-height:1.6}

      .tracker-page .tracker-mood-options{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}

      .tracker-page .tracker-mood-option {
        min-height:0;
        padding:10px 14px;
        border:1px solid #dce7ef;
        border-radius:22px;
        background:#f1f7fd;
        color:#263f55;
        font:700 12px 'DM Sans',sans-serif;
        cursor:pointer;
        transition:.18s ease;
      }

      .tracker-page .tracker-mood-option:hover:not(:disabled){border-color:#8eb9d7;transform:translateY(-1px)}
      .tracker-page .tracker-mood-option.selected{border:1.5px solid #6da9d0;background:#e4f2fc;color:#214d70;box-shadow:0 4px 12px rgba(65,139,190,.1)}
      .tracker-page .tracker-mood-option:disabled{opacity:.65;cursor:not-allowed}
      .tracker-page .tracker-mood-status{margin:13px 0 0;color:#84929e;font-size:11px;line-height:1.6}
      .tracker-page .tracker-note-card{background:linear-gradient(135deg,#fff 0%,#f2f8fe 100%)}
      .tracker-page .tracker-explanation{margin-bottom:15px}

      .tracker-page .tracker-suggestion {
        margin-top:15px;
        padding:15px 16px;
        border-left:4px solid #4b98cc;
        border-radius:0 13px 13px 0;
        background:#edf6ff;
      }

      .tracker-page .tracker-suggestion strong{display:block;margin-bottom:7px;color:#244b6d;font-size:12px;font-weight:800}
      .tracker-page .tracker-suggestion p{margin:0;color:#82919e;font-size:12px;line-height:1.6}
      .tracker-page .tracker-sleep-form{display:grid;gap:11px;margin:16px 0}
      .tracker-page .tracker-field{display:grid;gap:8px;min-width:0}
      .tracker-page .tracker-field-heading{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px}
      .tracker-page .tracker-field-heading strong{color:#29445b;font-size:12px;font-weight:800}
      .tracker-page .tracker-field-heading small{color:#8997a3;font-size:10px}

      .tracker-page .tracker-recorded-time {
        display:grid;
        gap:5px;
        min-height:48px;
        padding:10px 14px;
        border:1px solid #dce7ef;
        border-radius:13px;
        background:#f1f7fd;
      }

      .tracker-page .tracker-recorded-time strong{color:#29445b;font-size:12px;font-weight:800}
      .tracker-page .tracker-recorded-time small{color:#82919e;font-size:10px}

      .tracker-page .tracker-field input,
      .tracker-page .tracker-goal-editor input,
      .tracker-page .tracker-time-picker-trigger {
        width:100%;
        min-width:0;
        min-height:48px;
        padding:12px 14px;
        border:1px solid #dce7ef;
        border-radius:13px;
        outline:none;
        background:#f8fbfe;
        color:#29445b;
        font:12px 'DM Sans',sans-serif;
      }

      .tracker-page .tracker-field input:focus,
      .tracker-page .tracker-goal-editor input:focus,
      .tracker-page .tracker-time-picker-trigger:focus {
        border-color:#75acd0;
        box-shadow:0 0 0 3px rgba(75,152,204,.12);
      }

      .tracker-page .tracker-time-picker-trigger {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        text-align:left;
        cursor:pointer;
      }

      .tracker-page .tracker-picker-icon{color:#438fc4;font-size:16px}
      .tracker-page .tracker-time-picker-trigger:disabled{opacity:.6;cursor:not-allowed}
      .tracker-page .tracker-field input[type="text"]{font-size:12px}
      .tracker-page .tracker-field input::placeholder{color:#89939c}
      .tracker-page .tracker-field input:disabled{opacity:.6;cursor:not-allowed}

      .tracker-page .tracker-save-session,
      .tracker-page .tracker-save-goal {
        width:100%;
        min-height:42px;
        border:1px solid transparent;
        border-radius:12px;
        color:#fff;
        font:800 12px 'DM Sans',sans-serif;
        cursor:pointer;
        transition:filter .18s ease,transform .18s ease;
      }

      .tracker-page .tracker-save-session {
        margin-top:4px;
        background:linear-gradient(110deg,#3989c3,#174775);
        box-shadow:0 12px 22px rgba(31,85,130,.15);
      }

      .tracker-page .tracker-save-goal {
        margin-top:10px;
        border-color:#d7e6f3;
        background:linear-gradient(110deg,#eef7ff,#dceeff);
        color:#214b70;
      }

      .tracker-page .tracker-save-session:hover:not(:disabled),
      .tracker-page .tracker-save-goal:hover{filter:brightness(1.03);transform:translateY(-1px)}

      .tracker-page .tracker-save-session:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
      .tracker-page .tracker-form-message{margin:0;color:#b34b4b;font-size:11px}
      .tracker-page .tracker-today-sessions{display:grid;gap:8px;margin-top:15px}

      .tracker-page .tracker-session-row,
      .tracker-page .tracker-log-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:13px 16px;
        border:1px solid #e4edf5;
        border-radius:12px;
        background:#f7faff;
      }

      .tracker-page .tracker-session-main,
      .tracker-page .tracker-log-main{display:grid;gap:4px;min-width:0}

      .tracker-page .tracker-session-main strong,
      .tracker-page .tracker-log-main strong{color:#29445b;font-size:12px}

      .tracker-page .tracker-session-main span,
      .tracker-page .tracker-log-main span{color:#8795a0;font-size:11px}

      .tracker-page .tracker-row-actions {
        display:flex;
        align-items:center;
        gap:12px;
        flex:0 0 auto;
      }

      .tracker-page .tracker-session-duration {
        flex:0 0 auto;
        color:#234d70;
        font-size:12px;
        white-space:nowrap;
      }

      /* Trash buttons: no button box, border, or outline. */

      .tracker-page .tracker-delete-button {
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 32px;
        width:32px;
        height:32px;
        margin:0;
        padding:6px;
        border:none;
        border-radius:0;
        outline:none;
        background:transparent;
        color:#438fc4;
        cursor:pointer;
        transition:.18s ease;
        box-shadow:none;
        appearance:none;
      }

      .tracker-page .tracker-delete-button:hover {
        background:transparent;
        border:none;
        color:#246c9e;
        box-shadow:none;
      }

      .tracker-page .tracker-delete-button:focus,
      .tracker-page .tracker-delete-button:focus-visible {
        outline:none;
        border:none;
        box-shadow:none;
      }

      .tracker-page .tracker-delete-button svg {
        width:18px;
        height:18px;
        fill:none;
        stroke:currentColor;
        stroke-width:1.7;
        stroke-linecap:round;
        stroke-linejoin:round;
      }

      .tracker-page .tracker-today-total {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-top:10px;
        padding:13px 15px;
        border-radius:13px;
        background:#eff6fd;
        color:#81919e;
        font-size:12px;
      }

      .tracker-page .tracker-today-total strong{color:#244d70;font-size:15px;font-weight:800}

      .tracker-page .tracker-empty {
        margin:0;
        padding:18px 14px;
        border:1px dashed #d7e4ed;
        border-radius:14px;
        background:#f7faff;
        color:#84929e;
        font-size:12px;
        line-height:1.6;
        text-align:center;
      }

      .tracker-page .tracker-goal-editor{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
      .tracker-page .tracker-goal-editor label{display:grid;gap:7px;color:#82919e;font-size:11px}
      .tracker-page .tracker-goal-editor input{min-height:48px}
      .tracker-page .tracker-save-goal{width:100%}
      .tracker-page .tracker-current-goal{margin:13px 0 0;color:#82919e;font-size:12px}
      .tracker-page .tracker-current-goal strong{color:#244d70}
      .tracker-page .tracker-goal-progress{margin-top:19px;color:#82919e;font-size:12px;line-height:1.6}
      .tracker-page .tracker-goal-progress p{margin:8px 0 0}
      .tracker-page .tracker-progress-heading{display:flex;justify-content:space-between;gap:12px;color:#6f8291;font-size:11px}
      .tracker-page .tracker-progress-heading strong{color:#244d70}
      .tracker-page .tracker-progress-track{height:8px;margin-top:9px;overflow:hidden;border-radius:999px;background:#e6eff8}
      .tracker-page .tracker-progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#58a1d0,#245c8c)}

      .tracker-page .tracker-period-tabs {
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:6px;
        margin:15px 0 20px;
        padding:4px;
        border-radius:11px;
        background:#eff6fd;
      }

      .tracker-page .tracker-period-tab {
        padding:9px;
        border:0;
        border-radius:8px;
        background:transparent;
        color:#84929e;
        font:600 12px 'DM Sans',sans-serif;
        cursor:pointer;
      }

      .tracker-page .tracker-period-tab.active {
        background:#fff;
        color:#244d70;
        box-shadow:0 3px 12px rgba(42,91,126,.08);
        font-weight:800;
      }

      /* Chart: daily 0–24h, yearly 0–744h, horizontal scrolling. */

      .tracker-page .tracker-chart{min-width:0;margin-top:15px}

      .tracker-page .tracker-chart-layout {
        display:flex;
        align-items:stretch;
        width:100%;
        min-width:0;
        height:250px;
        gap:9px;
      }

      .tracker-page .tracker-y-axis {
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        flex:0 0 38px;
        width:38px;
        height:215px;
        padding-bottom:0;
      }

      .tracker-page .tracker-y-tick {
        display:flex;
        align-items:center;
        justify-content:flex-end;
        min-height:0;
        color:#8195a7;
        font-size:10px;
        line-height:1;
      }

      .tracker-page .tracker-chart-scroll {
        flex:1;
        min-width:0;
        height:250px;
        overflow-x:auto;
        overflow-y:hidden;
        scrollbar-width:thin;
        scrollbar-color:#a8cce5 transparent;
      }

      .tracker-page .tracker-chart-plot {
        position:relative;
        height:215px;
        min-width:100%;
      }

      .tracker-page .tracker-chart-columns {
        display:grid;
        align-items:stretch;
        grid-template-columns:repeat(7,minmax(0,1fr));
        gap:8px;
        height:215px;
        min-width:0;
      }

      .tracker-page .tracker-week-columns{min-width:0}

      .tracker-page .tracker-month-columns {
        grid-template-columns:repeat(31,minmax(30px,1fr));
        gap:6px;
        width:max-content;
        min-width:100%;
      }

      .tracker-page .tracker-year-columns {
        grid-template-columns:repeat(12,minmax(0,1fr));
        gap:8px;
        min-width:0;
      }

      .tracker-page .tracker-chart-column {
        display:flex;
        flex-direction:column;
        align-items:center;
        min-width:0;
        height:215px;
        gap:7px;
      }

      .tracker-page .tracker-month-columns .tracker-chart-column {
        width:30px;
      }

      .tracker-page .tracker-chart-bar-track {
        display:flex;
        align-items:flex-end;
        flex:1;
        width:100%;
        min-width:0;
        height:190px;
        overflow:hidden;
        border-radius:9px 9px 3px 3px;
        background:#eaf3fb;
      }

      .tracker-page .tracker-chart-bar {
        width:100%;
        min-height:0;
        border-radius:9px 9px 3px 3px;
        transition:height .25s ease;
      }

      /* Same coordinated gradient palette for Week, Month, and Year. */

      .tracker-page .tracker-chart-bar.bar-0{background:linear-gradient(180deg,#67c8ff,#2987df)}
      .tracker-page .tracker-chart-bar.bar-1{background:linear-gradient(180deg,#7de1d4,#25a6a1)}
      .tracker-page .tracker-chart-bar.bar-2{background:linear-gradient(180deg,#9bbcff,#547fe4)}
      .tracker-page .tracker-chart-bar.bar-3{background:linear-gradient(180deg,#8cddff,#42a6d8)}
      .tracker-page .tracker-chart-bar.bar-4{background:linear-gradient(180deg,#a4b5ff,#6b71dc)}
      .tracker-page .tracker-chart-bar.bar-5{background:linear-gradient(180deg,#82d4f4,#3198c9)}
      .tracker-page .tracker-chart-bar.bar-6{background:linear-gradient(180deg,#7ac6ff,#4479d6)}

      .tracker-page .tracker-chart-column.today .tracker-chart-bar-track {
        outline:1px solid #80b9e5;
        outline-offset:1px;
      }

      .tracker-page .tracker-chart-label {
        flex:0 0 auto;
        color:#82919e;
        font-size:10px;
        text-align:center;
        white-space:nowrap;
        line-height:1;
      }

      .tracker-page .tracker-chart-sublabel {
        flex:0 0 auto;
        margin-top:-3px;
        color:#9aa9b5;
        font-size:9px;
        line-height:1;
      }

      .tracker-page .tracker-chart-month .tracker-chart-label {
        font-size:10px;
      }

      .tracker-page .tracker-chart-year-layout .tracker-chart-label {
        font-size:10px;
      }

      .tracker-page .tracker-log-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }

      /* Clear All: text only, no button box, border, or outline. */

      .tracker-page .tracker-clear-all {
        padding:6px 10px;
        margin:0;
        border:none;
        border-radius:0;
        outline:none;
        background:transparent;
        color:#438fc4;
        box-shadow:none;
        font:700 12px 'DM Sans',sans-serif;
        text-align:right;
        text-decoration:none;
        cursor:pointer;
        appearance:none;
        transition:.18s ease;
      }

      .tracker-page .tracker-clear-all:hover {
        background:transparent;
        border:none;
        outline:none;
        box-shadow:none;
        color:#246c9e;
      }

      .tracker-page .tracker-clear-all:focus,
      .tracker-page .tracker-clear-all:focus-visible {
        border:none;
        outline:none;
        box-shadow:none;
      }

      .tracker-page .tracker-log-list{display:grid;gap:8px;margin-top:15px}
      .tracker-page .tracker-insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:15px}

      .tracker-page .tracker-insight-item {
        display:grid;
        gap:8px;
        padding:16px;
        border:1px solid #e1ebf4;
        border-radius:14px;
        background:#f5f9fe;
      }

      .tracker-page .tracker-insight-item span{color:#82919e;font-size:11px}
      .tracker-page .tracker-insight-item strong{color:#244d70;font-size:18px}
      .tracker-page .tracker-insights-card>.tracker-empty{margin-top:15px}

      /* Time-entry modal */

      .tracker-page .tracker-modal-backdrop {
        position:fixed;
        z-index:9999;
        inset:0;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(16,38,58,.48);
        backdrop-filter:blur(5px);
      }

      .tracker-page .tracker-modal-backdrop.open{display:flex}

      .tracker-page .tracker-time-modal {
        width:100%;
        max-width:420px;
        padding:22px;
        border:1px solid #dce7ef;
        border-radius:20px;
        background:#fff;
        box-shadow:0 25px 70px rgba(15,43,67,.2);
      }

      .tracker-page .tracker-modal-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .tracker-page .tracker-modal-heading .tracker-eyebrow{margin-bottom:8px}
      .tracker-page .tracker-modal-heading h2{font-size:18px}

      .tracker-page .tracker-modal-close {
        width:32px;
        height:32px;
        border:0;
        border-radius:50%;
        background:#eff6fd;
        color:#315773;
        font-size:21px;
        cursor:pointer;
      }

      .tracker-page .tracker-modal-description{margin:12px 0 16px;color:#82919e;font-size:12px;line-height:1.6}
      .tracker-page .tracker-modal-field{display:grid;gap:7px;margin-top:12px;color:#29445b;font-size:12px;font-weight:700}

      .tracker-page .tracker-modal-field input {
        width:100%;
        min-height:48px;
        padding:12px 14px;
        border:1px solid #dce7ef;
        border-radius:13px;
        outline:none;
        background:#f1f7fd;
        color:#29445b;
        font:12px 'DM Sans',sans-serif;
      }

      .tracker-page .tracker-modal-field input:focus{border-color:#75acd0;box-shadow:0 0 0 3px rgba(75,152,204,.12)}
      .tracker-page .tracker-modal-error{min-height:15px;margin:9px 0 0;color:#b34b4b;font-size:11px}
      .tracker-page .tracker-modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}

      .tracker-page .tracker-modal-actions button {
        min-height:42px;
        border-radius:11px;
        font:700 12px 'DM Sans',sans-serif;
        cursor:pointer;
      }

      .tracker-page .tracker-modal-cancel{border:1px solid #dce7ef;background:#f1f7fd;color:#315773}
      .tracker-page .tracker-modal-confirm{border:0;background:linear-gradient(110deg,#3989c3,#174775);color:#fff}

      /* Custom confirmation dialogs */

      .tracker-confirm-backdrop {
        position:fixed;
        z-index:10050;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(13,32,49,.55);
        backdrop-filter:blur(6px);
      }

      .tracker-confirm-dialog {
        width:100%;
        max-width:390px;
        padding:26px 22px 22px;
        border:1px solid #dce8f2;
        border-radius:23px;
        background:#fff;
        color:#193954;
        text-align:center;
        box-shadow:0 24px 75px rgba(10,35,55,.25);
        animation:trackerModalIn .18s ease-out;
      }

      @keyframes trackerModalIn {
        from{opacity:0;transform:translateY(8px) scale(.98)}
        to{opacity:1;transform:translateY(0) scale(1)}
      }

      .tracker-confirm-icon {
        display:flex;
        align-items:center;
        justify-content:center;
        width:54px;
        height:54px;
        margin:0 auto 15px;
        border-radius:17px;
        background:#eaf5ff;
        color:#438fc4;
      }

      .tracker-confirm-icon.danger{background:#eaf5ff;color:#438fc4}

      .tracker-confirm-icon svg {
        width:25px;
        height:25px;
        fill:none;
        stroke:currentColor;
        stroke-width:1.8;
        stroke-linecap:round;
        stroke-linejoin:round;
      }

      .tracker-confirm-dialog h2 {
        margin:0;
        color:#193954;
        font-family:'Manrope',sans-serif;
        font-size:19px;
        font-weight:800;
      }

      .tracker-confirm-description {
        margin:10px 0 0;
        color:#82919e;
        font-size:12px;
        line-height:1.65;
      }

      .tracker-confirm-error {
        min-height:0;
        margin:8px 0 0;
        color:#b34b4b;
        font-size:11px;
      }

      .tracker-confirm-error:not(:empty){min-height:16px}

      .tracker-confirm-actions {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-top:20px;
      }

      .tracker-confirm-actions button {
        min-height:44px;
        padding:10px 12px;
        border-radius:12px;
        font:700 12px 'DM Sans',sans-serif;
        cursor:pointer;
        transition:.18s ease;
      }

      .tracker-confirm-cancel {
        border:1px solid #dce7ef;
        background:#f4f8fc;
        color:#45627b;
      }

      .tracker-confirm-cancel:hover{background:#eaf2f9}

      .tracker-confirm-submit {
        border:1px solid transparent;
        background:linear-gradient(110deg,#3989c3,#174775);
        color:#fff;
      }

      .tracker-confirm-submit.danger {
        background:linear-gradient(110deg,#3989c3,#174775);
      }

      .tracker-confirm-submit:hover:not(:disabled){filter:brightness(1.07)}
      .tracker-confirm-actions button:disabled{opacity:.55;cursor:not-allowed}

      /* Dark mode */

      :root[data-theme="dark"] .tracker-page{--tracker-navy:#e1edf8;--tracker-muted:#a8b9c9;--tracker-border:#29465e;color:#e1edf8}

      :root[data-theme="dark"] .tracker-page .tracker-card {
        border-color:#29465e;
        background:#1b354c;
      }

      :root[data-theme="dark"] .tracker-page .tracker-card h2,
      :root[data-theme="dark"] .tracker-page .tracker-page-header h1,
      :root[data-theme="dark"] .tracker-page .tracker-field-heading strong,
      :root[data-theme="dark"] .tracker-page .tracker-session-main strong,
      :root[data-theme="dark"] .tracker-page .tracker-log-main strong{color:#e1edf8}

      :root[data-theme="dark"] .tracker-page .tracker-description,
      :root[data-theme="dark"] .tracker-page .tracker-subtitle,
      :root[data-theme="dark"] .tracker-page .tracker-mood-status,
      :root[data-theme="dark"] .tracker-page .tracker-current-goal,
      :root[data-theme="dark"] .tracker-page .tracker-goal-progress,
      :root[data-theme="dark"] .tracker-page .tracker-chart-label,
      :root[data-theme="dark"] .tracker-page .tracker-chart-sublabel,
      :root[data-theme="dark"] .tracker-page .tracker-y-tick{color:#a8b9c9}

      :root[data-theme="dark"] .tracker-page .tracker-note-card,
      :root[data-theme="dark"] .tracker-page .tracker-suggestion,
      :root[data-theme="dark"] .tracker-page .tracker-today-total,
      :root[data-theme="dark"] .tracker-page .tracker-period-tabs,
      :root[data-theme="dark"] .tracker-page .tracker-session-row,
      :root[data-theme="dark"] .tracker-page .tracker-log-row,
      :root[data-theme="dark"] .tracker-page .tracker-insight-item,
      :root[data-theme="dark"] .tracker-page .tracker-empty{background:#203e57;border-color:#34536b}

      :root[data-theme="dark"] .tracker-page .tracker-mood-option,
      :root[data-theme="dark"] .tracker-page .tracker-field input,
      :root[data-theme="dark"] .tracker-page .tracker-goal-editor input,
      :root[data-theme="dark"] .tracker-page .tracker-time-picker-trigger,
      :root[data-theme="dark"] .tracker-page .tracker-recorded-time{border-color:#3b5b73;background:#19334a;color:#e1edf8}

      :root[data-theme="dark"] .tracker-page .tracker-recorded-time small{color:#a8b9c9}
      :root[data-theme="dark"] .tracker-page .tracker-mood-option.selected{border-color:#79b8df;background:#294e6b}

      :root[data-theme="dark"] .tracker-page .tracker-suggestion strong,
      :root[data-theme="dark"] .tracker-page .tracker-today-total strong,
      :root[data-theme="dark"] .tracker-page .tracker-current-goal strong,
      :root[data-theme="dark"] .tracker-page .tracker-progress-heading strong,
      :root[data-theme="dark"] .tracker-page .tracker-insight-item strong{color:#d8edff}

      :root[data-theme="dark"] .tracker-page .tracker-suggestion p,
      :root[data-theme="dark"] .tracker-page .tracker-session-main span,
      :root[data-theme="dark"] .tracker-page .tracker-log-main span,
      :root[data-theme="dark"] .tracker-page .tracker-today-total{color:#a8b9c9}

      :root[data-theme="dark"] .tracker-page .tracker-period-tab.active{background:#31536f;color:#e1edf8}

      :root[data-theme="dark"] .tracker-page .tracker-chart-bar-track{background:#29465e}

      :root[data-theme="dark"] .tracker-page .tracker-delete-button {
        border:none;
        outline:none;
        background:transparent;
        color:#79b8df;
        box-shadow:none;
      }

      :root[data-theme="dark"] .tracker-page .tracker-delete-button:hover,
      :root[data-theme="dark"] .tracker-page .tracker-delete-button:focus,
      :root[data-theme="dark"] .tracker-page .tracker-delete-button:focus-visible {
        border:none;
        outline:none;
        background:transparent;
        box-shadow:none;
      }

      :root[data-theme="dark"] .tracker-page .tracker-clear-all {
        border:none;
        outline:none;
        background:transparent;
        color:#79b8df;
        box-shadow:none;
      }

      :root[data-theme="dark"] .tracker-page .tracker-clear-all:hover,
      :root[data-theme="dark"] .tracker-page .tracker-clear-all:focus,
      :root[data-theme="dark"] .tracker-page .tracker-clear-all:focus-visible {
        border:none;
        outline:none;
        background:transparent;
        box-shadow:none;
      }

      :root[data-theme="dark"] .tracker-page .tracker-save-goal{border-color:#3c5d77;background:#294d69;color:#e1edf8}

      :root[data-theme="dark"] .tracker-page .tracker-time-modal{border-color:#34536b;background:#1b354c}

      :root[data-theme="dark"] .tracker-page .tracker-modal-heading h2,
      :root[data-theme="dark"] .tracker-page .tracker-modal-field{color:#e1edf8}

      :root[data-theme="dark"] .tracker-page .tracker-modal-field input,
      :root[data-theme="dark"] .tracker-page .tracker-modal-close{border-color:#3b5b73;background:#19334a;color:#e1edf8}

      :root[data-theme="dark"] .tracker-confirm-dialog{border-color:#34536b;background:#1b354c;color:#e1edf8}
      :root[data-theme="dark"] .tracker-confirm-dialog h2{color:#e1edf8}
      :root[data-theme="dark"] .tracker-confirm-description{color:#a8b9c9}
      :root[data-theme="dark"] .tracker-confirm-cancel{border-color:#3b5b73;background:#29465e;color:#e1edf8}
      :root[data-theme="dark"] .tracker-confirm-icon{background:#294d69;color:#79b8df}
      :root[data-theme="dark"] .tracker-confirm-icon.danger{background:#294d69;color:#79b8df}

      /* Responsive layout */

      @media(max-width:600px){
        .tracker-page{padding:25px 17px 112px}
        .tracker-page .tracker-page-header{margin-bottom:26px}
        .tracker-page .tracker-subtitle{font-size:13px}
        .tracker-page .tracker-card{margin-bottom:18px;padding:17px;border-radius:20px}
        .tracker-page .tracker-card h2{font-size:18px}
        .tracker-page .tracker-description{font-size:12px}
        .tracker-page .tracker-mood-options{gap:9px}
        .tracker-page .tracker-mood-option{padding:10px 14px;font-size:12px}
        .tracker-page .tracker-suggestion{padding:15px 16px}
        .tracker-page .tracker-goal-editor{gap:8px}
        .tracker-page .tracker-save-goal{width:100%}
        .tracker-page .tracker-insight-grid{gap:9px}
        .tracker-page .tracker-insight-item{padding:13px}
        .tracker-page .tracker-time-modal{padding:20px}
        .tracker-page .tracker-chart-columns{gap:4px}
        .tracker-page .tracker-month-columns{gap:5px}
        .tracker-page .tracker-year-columns{gap:3px}
        .tracker-page .tracker-chart-layout{height:250px}
        .tracker-page .tracker-chart-plot{height:215px}
        .tracker-page .tracker-chart-scroll{height:250px}
        .tracker-page .tracker-chart-column{height:215px}
        .tracker-page .tracker-session-row,
        .tracker-page .tracker-log-row{padding:12px 10px;gap:8px}
        .tracker-page .tracker-row-actions{gap:8px}
        .tracker-page .tracker-y-axis{flex-basis:38px;width:38px}
        .tracker-page .tracker-y-tick{font-size:9px}
      }

      @media(max-width:360px){
        .tracker-page{padding-right:13px;padding-left:13px}
        .tracker-page .tracker-card{padding:14px}
        .tracker-page .tracker-session-main strong,
        .tracker-page .tracker-log-main strong{font-size:11px}
        .tracker-page .tracker-year-columns{gap:2px}
        .tracker-page .tracker-chart-year-layout .tracker-chart-label{font-size:9px}
      }
    </style>
  `
}
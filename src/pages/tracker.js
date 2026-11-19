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
  onMoodChange
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

  const goalPercentage = goal > 0
    ? Math.round((todayTotal / goal) * 100)
    : 0

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
          <p class="tracker-subtitle">
            A clearer picture of your rest starts here.
          </p>
        </div>

        <div class="tracker-menu-wrap">
          ${renderMenu()}
        </div>
      </header>

      <!-- 1. Wake-up Mood -->
      <section class="tracker-card tracker-mood-card">
        <p class="tracker-eyebrow">FIRST THINGS FIRST</p>
        <h2>How did you wake up?</h2>
        <p class="tracker-description">
          Choose your mood to get a little insight into your sleep.
        </p>

        <div class="tracker-mood-options">
          ${moods.map(item => `
            <button
              type="button"
              class="tracker-mood-option ${selectedMood === item ? 'selected' : ''}"
              data-mood="${escapeHTML(item)}"
              aria-pressed="${selectedMood === item}"
              ${canChooseMood ? '' : 'disabled'}
            >
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

      <!-- 2. Morning Explanation and Suggestion -->
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

      <!-- 3. Daily Sleep Record -->
      <section class="tracker-card tracker-daily-card">
        <p class="tracker-eyebrow">TODAY</p>
        <h2>Daily sleep record</h2>
        <p class="tracker-description">
          Record more than one session, including naps.
        </p>

        <form id="tracker-sleep-form" class="tracker-sleep-form">
          <div class="tracker-field">
            <span class="tracker-field-heading">
              <strong>Wake-up time</strong>
            </span>

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
            <span class="tracker-field-heading">
              <strong>When did this sleep session begin?</strong>
            </span>

            <button
              type="button"
              id="tracker-open-time-modal"
              class="tracker-time-picker-trigger"
              ${hasPendingWakeTime ? '' : 'disabled'}
            >
              <span id="tracker-sleep-time-display">Choose date and time</span>
              <span class="tracker-picker-icon">▦</span>
            </button>

            <input type="hidden" id="tracker-sleep-time" value="">
          </div>

          <label class="tracker-field">
            <span class="tracker-field-heading">
              <strong>Session label</strong>
              <small>Optional</small>
            </span>

            <input
              type="text"
              id="tracker-session-label"
              maxlength="50"
              placeholder="Night sleep, afternoon nap..."
              ${hasPendingWakeTime ? '' : 'disabled'}
            >
          </label>

          <button
            type="submit"
            class="tracker-save-session"
            ${hasPendingWakeTime ? '' : 'disabled'}
          >
            Save sleep session
          </button>

          <p
            id="tracker-sleep-message"
            class="tracker-form-message"
            aria-live="polite"
          ></p>
        </form>

        <div class="tracker-today-sessions">
          ${todayRecords.length
            ? todayRecords.map(record => `
                <div class="tracker-session-row">
                  <div class="tracker-session-main">
                    <strong>${escapeHTML(record.sessionLabel || 'Sleep session')}</strong>
                    <span>
                      ${formatClock(record.sleepTime)} – ${formatClock(record.wakeTime)}
                    </span>
                  </div>

                  <strong class="tracker-session-duration">
                    ${formatDuration(getDuration(record))}
                  </strong>
                </div>
              `).join('')
            : `
              <p class="tracker-empty">
                No sleep sessions recorded for today yet.
              </p>
            `}
        </div>

        <div class="tracker-today-total">
          <span>Today's total sleep</span>
          <strong>${formatDuration(todayTotal)}</strong>
        </div>
      </section>

      <!-- In-app Sleep Time Modal -->
      <div
        class="tracker-modal-backdrop"
        id="tracker-time-modal"
        aria-hidden="true"
      >
        <div
          class="tracker-time-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tracker-modal-title"
        >
          <div class="tracker-modal-heading">
            <div>
              <p class="tracker-eyebrow">SLEEP SESSION</p>
              <h2 id="tracker-modal-title">When did you fall asleep?</h2>
            </div>

            <button
              type="button"
              class="tracker-modal-close"
              id="tracker-close-time-modal"
              aria-label="Close"
            >×</button>
          </div>

          <p class="tracker-modal-description">
            Select the date and approximate time your sleep session began.
          </p>

          <label class="tracker-modal-field">
            <span>Date</span>
            <input type="date" id="tracker-modal-date">
          </label>

          <label class="tracker-modal-field">
            <span>Time</span>
            <input type="time" id="tracker-modal-time">
          </label>

          <p class="tracker-modal-error" id="tracker-modal-error"></p>

          <div class="tracker-modal-actions">
            <button type="button" id="tracker-cancel-time" class="tracker-modal-cancel">
              Cancel
            </button>
            <button type="button" id="tracker-confirm-time" class="tracker-modal-confirm">
              Confirm
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Sleep Goal -->
      <section class="tracker-card tracker-goal-card">
        <p class="tracker-eyebrow">YOUR TARGET</p>
        <h2>Sleep goal</h2>
        <p class="tracker-description">
          Choose a daily sleep target that makes sense for your routine.
        </p>

        <div class="tracker-goal-editor">
          <label>
            <span>Hours</span>
            <input
              type="number"
              id="tracker-goal-hours"
              min="0"
              max="23"
              value="${goalHours}"
            >
          </label>

          <label>
            <span>Minutes</span>
            <input
              type="number"
              id="tracker-goal-minutes"
              min="0"
              max="59"
              value="${goalMinutes}"
            >
          </label>
        </div>

        <button type="button" id="tracker-save-goal" class="tracker-save-goal">
          Save goal
        </button>

        <p
          id="tracker-goal-message"
          class="tracker-form-message"
          aria-live="polite"
        ></p>

        <p class="tracker-current-goal">
          Current goal:
          <strong>${formatDuration(goal)}</strong>
        </p>

        <div class="tracker-goal-progress">
          <div class="tracker-progress-heading">
            <span>Today's sleep goal progress</span>
            <strong>${Math.min(goalPercentage, 100)}%</strong>
          </div>

          <div class="tracker-progress-track">
            <div
              class="tracker-progress-fill"
              style="width: ${Math.min(goalPercentage, 100)}%"
            ></div>
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

      <!-- 5. Sleep History -->
      <section class="tracker-card tracker-history-card">
        <p class="tracker-eyebrow">YOUR PATTERNS</p>
        <h2>Sleep history</h2>
        <p class="tracker-description">
          Review your recent sleep duration.
        </p>

        <div class="tracker-period-tabs" role="group" aria-label="Sleep history period">
          <button
            type="button"
            class="tracker-period-tab ${currentView === 'week' ? 'active' : ''}"
            data-view="week"
          >Week</button>

          <button
            type="button"
            class="tracker-period-tab ${currentView === 'month' ? 'active' : ''}"
            data-view="month"
          >Month</button>

          <button
            type="button"
            class="tracker-period-tab ${currentView === 'year' ? 'active' : ''}"
            data-view="year"
          >Year</button>
        </div>

        <div class="tracker-chart" id="tracker-chart">
          ${renderGraph(records, goal, currentView)}
        </div>

        <div class="tracker-chart-legend">
          <span><i class="tracker-legend-duration"></i> Sleep duration</span>
          <span><i class="tracker-legend-goal"></i> Sleep goal</span>
        </div>
      </section>

      <!-- 6. Sleep Log -->
      <section class="tracker-card tracker-log-card">
        <p class="tracker-eyebrow">PAST SESSIONS</p>
        <h2>Sleep log</h2>

        <div class="tracker-log-list">
          ${records.length
            ? records.map(record => `
                <div class="tracker-log-row">
                  <div>
                    <strong>${escapeHTML(record.sessionLabel || 'Sleep session')}</strong>
                    <span>${formatDate(record.wakeTime)}</span>
                    <span>
                      ${formatClock(record.sleepTime)} – ${formatClock(record.wakeTime)}
                    </span>
                  </div>

                  <strong>${formatDuration(getDuration(record))}</strong>
                </div>
              `).join('')
            : `
              <p class="tracker-empty">
                Your completed sleep sessions will appear here.
              </p>
            `}
        </div>
      </section>

      <!-- 7. Sleep Insights -->
      <section class="tracker-card tracker-insights-card">
        <p class="tracker-eyebrow">AT A GLANCE</p>
        <h2>Your sleep insights</h2>

        ${dailyTotals.length
          ? `
            <div class="tracker-insight-grid">
              <div class="tracker-insight-item">
                <span>Typical Sleep</span>
                <strong>${typicalSleep ? formatDuration(typicalSleep) : '—'}</strong>
              </div>

              <div class="tracker-insight-item">
                <span>Best Sleep</span>
                <strong>${bestSleep ? formatDuration(bestSleep) : '—'}</strong>
              </div>

              <div class="tracker-insight-item">
                <span>Average Wake-up Time</span>
                <strong>${mainSessions.length ? averageClock(mainSessions, 'wakeTime') : '—'}</strong>
              </div>

              <div class="tracker-insight-item">
                <span>Average Bedtime</span>
                <strong>${mainSessions.length ? averageClock(mainSessions, 'sleepTime') : '—'}</strong>
              </div>
            </div>
          `
          : `
            <p class="tracker-empty">
              Insights will appear as you record more sleep sessions.
            </p>
          `}
      </section>

      ${renderBottomNav('tracker')}
    </main>
  `

  attachBottomNavEvents(onNavigate)
  attachMenuEvents(onProfile)

  // Mood selection: update the existing UI without rebuilding the Tracker page.
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

      // Notify main.js after the local UI has updated.
      onMoodChange(selectedMood, currentMoodInsights)
    })
  })

  // In-app date and time modal
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

  document.querySelector('#tracker-confirm-time')
    .addEventListener('click', () => {
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
    const sessionLabel = document
      .querySelector('#tracker-session-label')
      .value
      .trim()

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

  // Sleep history tabs
  document.querySelectorAll('.tracker-period-tab').forEach(button => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view

      document.querySelectorAll('.tracker-period-tab').forEach(tab => {
        tab.classList.toggle('active', tab === button)
      })

      document.querySelector('#tracker-chart').innerHTML =
        renderGraph(records, goal, currentView)
    })
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

// Combine all sessions that share the same wake-up date.
function getDailyTotals(records) {
  const grouped = new Map()

  records.forEach(record => {
    const date = new Date(record.wakeTime)
    const key = date.toDateString()

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        date,
        total: 0,
        records: []
      })
    }

    const day = grouped.get(key)
    day.total += getDuration(record)
    day.records.push(record)
  })

  return [...grouped.values()].sort((a, b) => a.date - b.date)
}

// Typical Sleep: most common daily total, grouped into 30-minute ranges.
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

// Use the longest non-nap session from each day for bedtime/wake-up averages.
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

    return [...candidates].sort(
      (a, b) => getDuration(b) - getDuration(a)
    )[0]
  })
}

function renderGraph(records, goal, view) {
  const now = new Date()
  const entries = []

  if (view === 'week') {
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - offset)

      entries.push({
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        date
      })
    }
  } else if (view === 'month') {
    for (let offset = 29; offset >= 0; offset--) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - offset)

      entries.push({
        label: String(date.getDate()),
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
        return wake.getFullYear() === entry.date.getFullYear() &&
          wake.getMonth() === entry.date.getMonth()
      }

      return wake.toDateString() === entry.date.toDateString()
    })

    if (entry.month) {
      const daily = getDailyTotals(matching)
      return daily.length
        ? Math.round(totalDuration(matching) / daily.length)
        : 0
    }

    return totalDuration(matching)
  })

  const maxDuration = Math.max(goal, ...durations, 60)

  return `
    <div class="tracker-graph-bars ${view === 'month' ? 'tracker-graph-month' : ''}">
      ${entries.map((entry, index) => {
        const duration = durations[index]
        const height = Math.min(100, (duration / maxDuration) * 100)
        const goalHeight = Math.min(100, (goal / maxDuration) * 100)

        return `
          <div
            class="tracker-graph-column"
            title="${escapeHTML(entry.label)}: ${duration ? formatDuration(duration) : 'No record'}"
          >
            <div class="tracker-graph-bar-area">
              <div
                class="tracker-graph-goal-line"
                style="bottom: ${goalHeight}%"
              ></div>
              <div
                class="tracker-graph-bar"
                style="height: ${height}%"
              ></div>
            </div>
            <span class="tracker-graph-label">${escapeHTML(entry.label)}</span>
          </div>
        `
      }).join('')}
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

  const averageMinutes = Math.round((angle / (Math.PI * 2)) * 1440) % 1440
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
        --tracker-navy: #173653;
        --tracker-blue: #438fc4;
        --tracker-muted: #82919e;
        --tracker-border: #dce7ef;
        box-sizing: border-box;
        width: min(100%, 900px);
        max-width: 900px;
        min-height: 100vh;
        margin: 0 auto;
        padding: 34px 30px 118px;
        color: var(--tracker-navy);
        background: transparent;
        font-family: 'DM Sans', sans-serif;
      }

      .tracker-page *,
      .tracker-page *::before,
      .tracker-page *::after {
        box-sizing: border-box;
      }

      .tracker-page .tracker-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin: 0 auto 26px;
        padding-top: 0;
        max-width: 100%;
      }

      .tracker-page-heading { min-width: 0; }

      .tracker-page .tracker-eyebrow {
        margin: 0 0 10px;
        color: #5c91b5;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2px;
        line-height: 1.4;
      }

      .tracker-page .tracker-page-header h1 {
        margin: 0;
        color: #153653;
        font-family: 'Manrope', sans-serif;
        font-size: 30px;
        font-weight: 800;
        letter-spacing: -1px;
        line-height: 1.2;
      }

      .tracker-page .tracker-subtitle {
        margin: 8px 0 0;
        color: #82919e;
        font-size: 13px;
        line-height: 1.55;
      }

      .tracker-page .tracker-menu-wrap { flex: 0 0 auto; }

      .tracker-page .tracker-card {
        width: 100%;
        max-width: 100%;
        margin: 0 auto 18px;
        padding: 22px;
        overflow: hidden;
        border: 1px solid var(--tracker-border);
        border-radius: 20px;
        background: rgba(255,255,255,.94);
        box-shadow: 0 12px 35px rgba(42,91,126,.055);
      }

      .tracker-page .tracker-card h2 {
        margin: 0;
        color: #193954;
        font-family: 'Manrope', sans-serif;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -.3px;
        line-height: 1.3;
      }

      .tracker-page .tracker-card .tracker-eyebrow { margin-bottom: 10px; }

      .tracker-page .tracker-description {
        margin: 8px 0 0;
        color: #82919e;
        font-size: 12px;
        line-height: 1.6;
      }

      .tracker-page .tracker-mood-options {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 16px;
      }

      .tracker-page .tracker-mood-option {
        min-height: 0;
        padding: 10px 14px;
        border: 1px solid #dce7ef;
        border-radius: 22px;
        background: #f1f7fd;
        color: #263f55;
        font: 700 12px 'DM Sans', sans-serif;
        cursor: pointer;
        transition: .18s ease;
      }

      .tracker-page .tracker-mood-option:hover:not(:disabled) {
        border-color: #8eb9d7;
        transform: translateY(-1px);
      }

      .tracker-page .tracker-mood-option.selected {
        border: 1.5px solid #6da9d0;
        background: #e4f2fc;
        color: #214d70;
        box-shadow: 0 4px 12px rgba(65,139,190,.1);
      }

      .tracker-page .tracker-mood-option:disabled {
        opacity: .65;
        cursor: not-allowed;
      }

      .tracker-page .tracker-mood-status {
        margin: 13px 0 0;
        color: #84929e;
        font-size: 11px;
        line-height: 1.6;
      }

      .tracker-page .tracker-note-card {
        background: linear-gradient(135deg, #fff 0%, #f2f8fe 100%);
      }

      .tracker-page .tracker-explanation { margin-bottom: 15px; }

      .tracker-page .tracker-suggestion {
        margin-top: 15px;
        padding: 15px 16px;
        border-left: 4px solid #4b98cc;
        border-radius: 0 13px 13px 0;
        background: #edf6ff;
      }

      .tracker-page .tracker-suggestion strong {
        display: block;
        margin-bottom: 7px;
        color: #244b6d;
        font-size: 12px;
        font-weight: 800;
      }

      .tracker-page .tracker-suggestion p {
        margin: 0;
        color: #82919e;
        font-size: 12px;
        line-height: 1.6;
      }

      .tracker-page .tracker-sleep-form {
        display: grid;
        gap: 11px;
        margin: 16px 0;
      }

      .tracker-page .tracker-field {
        display: grid;
        gap: 8px;
        min-width: 0;
      }

      .tracker-page .tracker-field-heading {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 8px;
      }

      .tracker-page .tracker-field-heading strong {
        color: #29445b;
        font-size: 12px;
        font-weight: 800;
      }

      .tracker-page .tracker-field-heading small {
        color: #8997a3;
        font-size: 10px;
      }

      .tracker-page .tracker-recorded-time {
        display: grid;
        gap: 5px;
        min-height: 48px;
        padding: 10px 14px;
        border: 1px solid #dce7ef;
        border-radius: 13px;
        background: #f1f7fd;
      }

      .tracker-page .tracker-recorded-time strong {
        color: #29445b;
        font-size: 12px;
        font-weight: 800;
      }

      .tracker-page .tracker-recorded-time small {
        color: #82919e;
        font-size: 10px;
      }

      .tracker-page .tracker-field input,
      .tracker-page .tracker-goal-editor input,
      .tracker-page .tracker-time-picker-trigger {
        width: 100%;
        min-width: 0;
        min-height: 48px;
        padding: 12px 14px;
        border: 1px solid #dce7ef;
        border-radius: 13px;
        outline: none;
        background: #f8fbfe;
        color: #29445b;
        font: 12px 'DM Sans', sans-serif;
      }

      .tracker-page .tracker-field input:focus,
      .tracker-page .tracker-goal-editor input:focus,
      .tracker-page .tracker-time-picker-trigger:focus {
        border-color: #75acd0;
        box-shadow: 0 0 0 3px rgba(75,152,204,.12);
      }

      .tracker-page .tracker-time-picker-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        text-align: left;
        cursor: pointer;
      }

      .tracker-page .tracker-picker-icon {
        color: #438fc4;
        font-size: 16px;
      }

      .tracker-page .tracker-time-picker-trigger:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .tracker-page .tracker-field input[type="text"] { font-size: 12px; }

      .tracker-page .tracker-field input::placeholder { color: #89939c; }

      .tracker-page .tracker-field input:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .tracker-page .tracker-save-session,
      .tracker-page .tracker-save-goal {
        width: 100%;
        min-height: 42px;
        border: 1px solid transparent;
        border-radius: 12px;
        color: #fff;
        font: 800 12px 'DM Sans', sans-serif;
        cursor: pointer;
        transition: filter .18s ease, transform .18s ease;
      }

      .tracker-page .tracker-save-session {
        margin-top: 4px;
        background: linear-gradient(110deg, #3989c3, #174775);
        box-shadow: 0 12px 22px rgba(31,85,130,.15);
      }

      .tracker-page .tracker-save-goal {
        margin-top: 10px;
        border-color: #d7e6f3;
        background: linear-gradient(110deg, #eef7ff, #dceeff);
        color: #214b70;
      }

      .tracker-page .tracker-save-session:hover:not(:disabled),
      .tracker-page .tracker-save-goal:hover {
        filter: brightness(1.03);
        transform: translateY(-1px);
      }

      .tracker-page .tracker-save-session:disabled {
        opacity: .55;
        cursor: not-allowed;
        box-shadow: none;
      }

      .tracker-page .tracker-form-message {
        margin: 0;
        color: #b34b4b;
        font-size: 11px;
      }

      .tracker-page .tracker-today-sessions {
        display: grid;
        gap: 8px;
        margin-top: 15px;
      }

      /* FIX: Both Daily Sleep Record and Sleep Log rows now have horizontal inset. */
      .tracker-page .tracker-session-row,
      .tracker-page .tracker-log-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 13px 16px;
        border: 1px solid #e4edf5;
        border-radius: 12px;
        background: #f7faff;
      }

      .tracker-page .tracker-session-main,
      .tracker-page .tracker-log-row > div {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .tracker-page .tracker-session-main strong,
      .tracker-page .tracker-log-row strong {
        color: #29445b;
        font-size: 12px;
      }

      .tracker-page .tracker-session-main span,
      .tracker-page .tracker-log-row span {
        color: #8795a0;
        font-size: 11px;
      }

      .tracker-page .tracker-session-duration {
        flex: 0 0 auto;
        color: #234d70;
        font-size: 12px;
      }

      .tracker-page .tracker-today-total {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
        padding: 13px 15px;
        border-radius: 13px;
        background: #eff6fd;
        color: #81919e;
        font-size: 12px;
      }

      .tracker-page .tracker-today-total strong {
        color: #244d70;
        font-size: 15px;
        font-weight: 800;
      }

      .tracker-page .tracker-empty {
        margin: 0;
        padding: 18px 14px;
        border: 1px dashed #d7e4ed;
        border-radius: 14px;
        background: #f7faff;
        color: #84929e;
        font-size: 12px;
        line-height: 1.6;
        text-align: center;
      }

      .tracker-page .tracker-goal-editor {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
      }

      .tracker-page .tracker-goal-editor label {
        display: grid;
        gap: 7px;
        color: #82919e;
        font-size: 11px;
      }

      .tracker-page .tracker-goal-editor input { min-height: 48px; }

      .tracker-page .tracker-current-goal {
        margin: 13px 0 0;
        color: #82919e;
        font-size: 12px;
      }

      .tracker-page .tracker-current-goal strong { color: #244d70; }

      .tracker-page .tracker-goal-progress {
        margin-top: 19px;
        color: #82919e;
        font-size: 12px;
        line-height: 1.6;
      }

      .tracker-page .tracker-goal-progress p { margin: 8px 0 0; }

      .tracker-page .tracker-progress-heading {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: #6f8291;
        font-size: 11px;
      }

      .tracker-page .tracker-progress-heading strong { color: #244d70; }

      .tracker-page .tracker-progress-track {
        height: 8px;
        margin-top: 9px;
        overflow: hidden;
        border-radius: 999px;
        background: #e6eff8;
      }

      .tracker-page .tracker-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #58a1d0, #245c8c);
      }

      .tracker-page .tracker-period-tabs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin: 15px 0 20px;
        padding: 4px;
        border-radius: 11px;
        background: #eff6fd;
      }

      .tracker-page .tracker-period-tab {
        min-height: 0;
        padding: 9px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #84929e;
        font: 600 12px 'DM Sans', sans-serif;
        cursor: pointer;
      }

      .tracker-page .tracker-period-tab.active {
        background: #fff;
        color: #244d70;
        box-shadow: 0 3px 12px rgba(42,91,126,.08);
        font-weight: 800;
      }

      .tracker-page .tracker-chart {
        min-width: 0;
        margin-top: 15px;
      }

      .tracker-page .tracker-graph-bars {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        align-items: end;
        gap: 9px;
        height: 180px;
      }

      .tracker-page .tracker-graph-bars.tracker-graph-month {
        grid-template-columns: repeat(10, minmax(0, 1fr));
        gap: 2px;
      }

      .tracker-page .tracker-graph-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 0;
        gap: 7px;
      }

      .tracker-page .tracker-graph-bar-area {
        position: relative;
        display: flex;
        align-items: flex-end;
        width: 100%;
        height: 150px;
        overflow: hidden;
        border-radius: 7px 7px 2px 2px;
        background: #eff6fd;
      }

      .tracker-page .tracker-graph-bar {
        position: relative;
        z-index: 1;
        width: 100%;
        border-radius: 7px 7px 2px 2px;
        background: linear-gradient(180deg, #69add8, #3989c3);
      }

      .tracker-page .tracker-graph-goal-line {
        position: absolute;
        z-index: 2;
        right: 0;
        left: 0;
        border-top: 2px dashed #234d70;
        pointer-events: none;
      }

      .tracker-page .tracker-graph-label {
        color: #82919e;
        font-size: 10px;
        text-align: center;
      }

      .tracker-page .tracker-graph-month .tracker-graph-bar-area { height: 150px; }
      .tracker-page .tracker-graph-month .tracker-graph-label { font-size: 7px; }

      .tracker-page .tracker-chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        margin-top: 16px;
        color: #82919e;
        font-size: 11px;
      }

      .tracker-page .tracker-chart-legend span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }

      .tracker-page .tracker-chart-legend i {
        display: inline-block;
        width: 11px;
        height: 11px;
        border-radius: 4px;
      }

      .tracker-page .tracker-legend-duration { background: #438fc4; }

      .tracker-page .tracker-legend-goal {
        border: 2px dashed #234d70;
        background: transparent;
      }

      .tracker-page .tracker-log-list {
        display: grid;
        gap: 8px;
        margin-top: 15px;
      }

      .tracker-page .tracker-insight-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
        margin-top: 15px;
      }

      .tracker-page .tracker-insight-item {
        display: grid;
        gap: 8px;
        padding: 16px;
        border: 1px solid #e1ebf4;
        border-radius: 14px;
        background: #f5f9fe;
      }

      .tracker-page .tracker-insight-item span {
        color: #82919e;
        font-size: 11px;
      }

      .tracker-page .tracker-insight-item strong {
        color: #244d70;
        font-size: 18px;
      }

      .tracker-page .tracker-insights-card > .tracker-empty { margin-top: 15px; }

      /* In-app time picker modal */
      .tracker-page .tracker-modal-backdrop {
        position: fixed;
        z-index: 9999;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(16,38,58,.48);
        backdrop-filter: blur(5px);
      }

      .tracker-page .tracker-modal-backdrop.open { display: flex; }

      .tracker-page .tracker-time-modal {
        width: 100%;
        max-width: 420px;
        padding: 22px;
        border: 1px solid #dce7ef;
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 25px 70px rgba(15,43,67,.2);
      }

      .tracker-page .tracker-modal-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .tracker-page .tracker-modal-heading .tracker-eyebrow {
        margin-bottom: 8px;
      }

      .tracker-page .tracker-modal-heading h2 {
        font-size: 18px;
      }

      .tracker-page .tracker-modal-close {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: #eff6fd;
        color: #315773;
        font-size: 21px;
        cursor: pointer;
      }

      .tracker-page .tracker-modal-description {
        margin: 12px 0 16px;
        color: #82919e;
        font-size: 12px;
        line-height: 1.6;
      }

      .tracker-page .tracker-modal-field {
        display: grid;
        gap: 7px;
        margin-top: 12px;
        color: #29445b;
        font-size: 12px;
        font-weight: 700;
      }

      .tracker-page .tracker-modal-field input {
        width: 100%;
        min-height: 48px;
        padding: 12px 14px;
        border: 1px solid #dce7ef;
        border-radius: 13px;
        outline: none;
        background: #f1f7fd;
        color: #29445b;
        font: 12px 'DM Sans', sans-serif;
      }

      .tracker-page .tracker-modal-field input:focus {
        border-color: #75acd0;
        box-shadow: 0 0 0 3px rgba(75,152,204,.12);
      }

      .tracker-page .tracker-modal-error {
        min-height: 15px;
        margin: 9px 0 0;
        color: #b34b4b;
        font-size: 11px;
      }

      .tracker-page .tracker-modal-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
        margin-top: 12px;
      }

      .tracker-page .tracker-modal-actions button {
        min-height: 42px;
        border-radius: 11px;
        font: 700 12px 'DM Sans', sans-serif;
        cursor: pointer;
      }

      .tracker-page .tracker-modal-cancel {
        border: 1px solid #dce7ef;
        background: #f1f7fd;
        color: #315773;
      }

      .tracker-page .tracker-modal-confirm {
        border: 0;
        background: linear-gradient(110deg, #3989c3, #174775);
        color: #fff;
      }

      /* Dark mode */
      :root[data-theme="dark"] .tracker-page {
        --tracker-navy: #e1edf8;
        --tracker-muted: #a8b9c9;
        --tracker-border: #29465e;
        background: transparent;
        color: #e1edf8;
      }

      :root[data-theme="dark"] .tracker-page .tracker-card {
        border-color: #29465e;
        background: #1b354c;
      }

      :root[data-theme="dark"] .tracker-page .tracker-card h2,
      :root[data-theme="dark"] .tracker-page .tracker-page-header h1,
      :root[data-theme="dark"] .tracker-page .tracker-field-heading strong,
      :root[data-theme="dark"] .tracker-page .tracker-session-main strong,
      :root[data-theme="dark"] .tracker-page .tracker-log-row strong {
        color: #e1edf8;
      }

      :root[data-theme="dark"] .tracker-page .tracker-description,
      :root[data-theme="dark"] .tracker-page .tracker-subtitle,
      :root[data-theme="dark"] .tracker-page .tracker-mood-status,
      :root[data-theme="dark"] .tracker-page .tracker-current-goal,
      :root[data-theme="dark"] .tracker-page .tracker-goal-progress,
      :root[data-theme="dark"] .tracker-page .tracker-graph-label {
        color: #a8b9c9;
      }

      :root[data-theme="dark"] .tracker-page .tracker-note-card,
      :root[data-theme="dark"] .tracker-page .tracker-suggestion,
      :root[data-theme="dark"] .tracker-page .tracker-today-total,
      :root[data-theme="dark"] .tracker-page .tracker-period-tabs,
      :root[data-theme="dark"] .tracker-page .tracker-session-row,
      :root[data-theme="dark"] .tracker-page .tracker-log-row,
      :root[data-theme="dark"] .tracker-page .tracker-insight-item,
      :root[data-theme="dark"] .tracker-page .tracker-empty {
        background: #203e57;
        border-color: #34536b;
      }

      :root[data-theme="dark"] .tracker-page .tracker-mood-option,
      :root[data-theme="dark"] .tracker-page .tracker-field input,
      :root[data-theme="dark"] .tracker-page .tracker-goal-editor input,
      :root[data-theme="dark"] .tracker-page .tracker-time-picker-trigger,
      :root[data-theme="dark"] .tracker-page .tracker-recorded-time {
        border-color: #3b5b73;
        background: #19334a;
        color: #e1edf8;
      }

      :root[data-theme="dark"] .tracker-page .tracker-recorded-time small {
        color: #a8b9c9;
      }

      :root[data-theme="dark"] .tracker-page .tracker-mood-option.selected {
        border-color: #79b8df;
        background: #294e6b;
      }

      :root[data-theme="dark"] .tracker-page .tracker-suggestion strong,
      :root[data-theme="dark"] .tracker-page .tracker-today-total strong,
      :root[data-theme="dark"] .tracker-page .tracker-current-goal strong,
      :root[data-theme="dark"] .tracker-page .tracker-progress-heading strong,
      :root[data-theme="dark"] .tracker-page .tracker-insight-item strong {
        color: #d8edff;
      }

      :root[data-theme="dark"] .tracker-page .tracker-suggestion p,
      :root[data-theme="dark"] .tracker-page .tracker-session-main span,
      :root[data-theme="dark"] .tracker-page .tracker-log-row span,
      :root[data-theme="dark"] .tracker-page .tracker-today-total,
      :root[data-theme="dark"] .tracker-page .tracker-chart-legend {
        color: #a8b9c9;
      }

      :root[data-theme="dark"] .tracker-page .tracker-period-tab.active {
        background: #31536f;
        color: #e1edf8;
      }

      :root[data-theme="dark"] .tracker-page .tracker-graph-bar-area {
        background: #29465e;
      }

      :root[data-theme="dark"] .tracker-page .tracker-graph-goal-line {
        border-color: #c4d9eb;
      }

      :root[data-theme="dark"] .tracker-page .tracker-save-goal {
        border-color: #3c5d77;
        background: #294d69;
        color: #e1edf8;
      }

      :root[data-theme="dark"] .tracker-page .tracker-time-modal {
        border-color: #34536b;
        background: #1b354c;
      }

      :root[data-theme="dark"] .tracker-page .tracker-modal-heading h2,
      :root[data-theme="dark"] .tracker-page .tracker-modal-field {
        color: #e1edf8;
      }

      :root[data-theme="dark"] .tracker-page .tracker-modal-field input,
      :root[data-theme="dark"] .tracker-page .tracker-modal-close {
        border-color: #3b5b73;
        background: #19334a;
        color: #e1edf8;
      }

      @media (max-width: 600px) {
        .tracker-page { padding: 25px 17px 112px; }

        .tracker-page .tracker-page-header { margin-bottom: 26px; }

        .tracker-page .tracker-subtitle { font-size: 13px; }

        .tracker-page .tracker-card {
          margin-bottom: 18px;
          padding: 17px;
          border-radius: 20px;
        }

        .tracker-page .tracker-card h2 { font-size: 18px; }

        .tracker-page .tracker-description { font-size: 12px; }

        .tracker-page .tracker-mood-options { gap: 9px; }

        .tracker-page .tracker-mood-option {
          min-height: 0;
          padding: 10px 14px;
          font-size: 12px;
        }

        .tracker-page .tracker-suggestion { padding: 15px 16px; }

        .tracker-page .tracker-graph-bar-area { height: 150px; }

        .tracker-page .tracker-graph-bars { gap: 4px; }

        .tracker-page .tracker-graph-bars.tracker-graph-month { gap: 1px; }

        .tracker-page .tracker-goal-editor { gap: 8px; }

        .tracker-page .tracker-save-goal { width: 100%; }

        .tracker-page .tracker-insight-grid { gap: 9px; }

        .tracker-page .tracker-insight-item { padding: 13px; }

        .tracker-page .tracker-time-modal { padding: 20px; }
      }

      @media (max-width: 360px) {
        .tracker-page {
          padding-right: 13px;
          padding-left: 13px;
        }

        .tracker-page .tracker-card { padding: 14px; }

        .tracker-page .tracker-session-row,
        .tracker-page .tracker-log-row { gap: 8px; }

        .tracker-page .tracker-session-main strong,
        .tracker-page .tracker-log-row strong { font-size: 11px; }
      }
    </style>
  `
}
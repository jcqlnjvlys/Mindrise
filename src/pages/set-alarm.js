
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const sounds = [
  { file: 'alarm-synth-verb-hit.wav', name: 'Synth Alarm' },
  { file: 'atari-alarm-climber.wav', name: 'Atari Climber' },
  { file: 'broken-cord-alarm.wav', name: 'Broken Cord Alarm' },
  { file: 'burglar_alarm.wav', name: 'Burglar Alarm' },
  { file: 'Car_Alarm_Big.wav', name: 'Car Alarm - Loud' },
  { file: 'Car_Alarm_Chirp.wav', name: 'Car Alarm - Chirp' },
  { file: 'Car_Alarm_Oscillating.wav', name: 'Car Alarm - Oscillating' },
  { file: 'Car_Alarm_Small.wav', name: 'Car Alarm - Short' },
  { file: 'cheesy-siren-blast.wav', name: 'Siren Blast' },
  { file: 'crackle-alarm.wav', name: 'Crackle Alarm' },
  { file: 'ding_dong.wav', name: 'Ding Dong' },
  { file: 'lofi-communications.wav', name: 'Lo-fi Communications' },
  { file: 'mechanical-air-raid-alarm.wav', name: 'Mechanical Air Raid' },
  { file: 'nice-long-air-raid-siren.wav', name: 'Long Air Raid Siren' },
  { file: 'nice-round-siren.wav', name: 'Round Siren' },
  { file: 'oscillating-flyby.wav', name: 'Oscillating Flyby' },
  { file: 'phasing-police-siren.wav', name: 'Phasing Police Siren' },
  { file: 'police_siren.wav', name: 'Police Siren' },
  { file: 'pumpy_pulse.wav', name: 'Pumpy Pulse' },
  { file: 'rave-alarm.wav', name: 'Rave Alarm' },
  { file: 'ringmod-alarm-fadein.wav', name: 'Ringing Fade In' },
  { file: 'sickly-analog-warning-siren.wav', name: 'Analog Warning Siren' },
  { file: 'space-hospital-alarm.wav', name: 'Space Hospital Alarm' },
  { file: 'squeaky-clown-horn.wav', name: 'Clown Horn' },
  { file: 'star-trek-bridge.wav', name: 'Bridge Alert' },
  { file: 'submarine-alarm.wav', name: 'Submarine Alarm' },
  { file: 'two_tone_siren.wav', name: 'Two-Tone Siren' },
  { file: 'verby-climbing-buzz-alert.wav', name: 'Climbing Buzz Alert' },
  { file: 'vidgame-gliss-down.wav', name: 'Video Game Gliss' },
  { file: 'wobbly-pulse-upndown.wav', name: 'Wobbly Pulse' }
]

/* =========================================================
   SET ALARM VIEWPORT FIX
   ========================================================= */

function installAlarmLayoutFix() {
  const id = 'mindrise-set-alarm-viewport-fix'

  document.getElementById(id)?.remove()

  const style = document.createElement('style')
  style.id = id

  style.textContent = `
    html, body {
      max-width: 100%;
      overflow-x: clip !important;
    }

    #app {
      max-width: 100%;
      overflow-x: clip !important;
    }

    .set-alarm-page {
      width: 100% !important;
      max-width: 650px !important;
      box-sizing: border-box !important;
      margin-left: auto !important;
      margin-right: auto !important;
      overflow-x: clip !important;
    }

    .set-alarm-page *,
    .alarm-time-backdrop *,
    .alarm-sound-backdrop * {
      box-sizing: border-box;
    }

    .alarm-time-backdrop,
    .alarm-sound-backdrop {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      min-height: 0 !important;
      margin: 0 !important;
      transform: none !important;
      overflow-x: clip !important;
      overflow-y: auto !important;
      display: grid !important;
      place-items: center !important;
      padding: max(12px, env(safe-area-inset-top))
        12px
        max(12px, env(safe-area-inset-bottom)) !important;
      box-sizing: border-box !important;
      overscroll-behavior: contain !important;
    }

    .alarm-time-dialog {
      position: relative !important;
      width: min(100%, 440px) !important;
      min-width: 0 !important;
      max-width: 440px !important;
      max-height: calc(100dvh - 24px) !important;
      height: auto !important;
      margin: auto !important;
      overflow: visible !important;
      flex: none !important;
      transform: none !important;
    }

    .alarm-sound-dialog {
      position: relative !important;
      width: min(100%, 520px) !important;
      min-width: 0 !important;
      max-width: 520px !important;
      height: min(760px, calc(100dvh - 24px)) !important;
      max-height: calc(100dvh - 24px) !important;
      margin: auto !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      flex: none !important;
      transform: none !important;
    }

    .alarm-sound-list {
      min-height: 0 !important;
      flex: 1 1 auto !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
    }

    .alarm-picker-menu {
      position: fixed !important;
      z-index: 9999 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
    }

    @media (max-width: 600px) {
      .alarm-time-dialog {
        width: 100% !important;
        max-width: 440px !important;
      }

      .alarm-sound-dialog {
        width: 100% !important;
        max-width: 520px !important;
      }
    }
  `

  document.head.appendChild(style)
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderSetAlarm(existingAlarm, onSave, onCancel) {
  installAlarmLayoutFix()

  const alarm = existingAlarm || {
    time: '07:00',
    repeat: [],
    name: '',
    sound: sounds[0].file
  }

  let selectedTime24 = alarm.time

  let selectedSound = sounds.some(sound => sound.file === alarm.sound)
    ? alarm.sound
    : sounds[0].file

  let previewAudio = null
  let previewingSound = null

  function getSoundName(filename) {
    return sounds.find(sound => sound.file === filename)?.name || 'Alarm Sound'
  }

  function stopPreview() {
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.currentTime = 0
      previewAudio = null
    }

    previewingSound = null

    document.querySelectorAll('[data-preview-sound]').forEach(button => {
      button.textContent = 'Preview'
      button.classList.remove('is-playing')
    })
  }

  async function previewSound(filename) {
    if (previewingSound === filename && previewAudio) {
      stopPreview()
      return
    }

    stopPreview()

    const audio = new Audio(
      `/alarm-sounds/${encodeURIComponent(filename)}`
    )

    previewAudio = audio
    previewingSound = filename
    audio.loop = true

    document.querySelectorAll('[data-preview-sound]').forEach(button => {
      if (button.dataset.previewSound === filename) {
        button.textContent = 'Stop'
        button.classList.add('is-playing')
      }
    })

    audio.addEventListener('error', () => {
      if (previewAudio !== audio) return
      stopPreview()
      console.error(`Could not load alarm sound: ${filename}`)
    })

    try {
      await audio.play()
    } catch (error) {
      if (previewAudio !== audio) return
      stopPreview()
      console.error('Alarm sound preview failed:', error)
    }
  }

  document.querySelector('#app').innerHTML = `
    <main class="form-page set-alarm-page">
      <header class="form-header">
        <button type="button" class="back-button" id="back-button">←</button>
        <h1>${existingAlarm ? 'Edit Alarm' : 'Set Alarm'}</h1>
      </header>

      <form id="alarm-form">
        <section class="form-section">
          <h2>Choose Time</h2>

          <button
            type="button"
            class="alarm-time-display"
            id="open-time-picker"
            aria-haspopup="dialog"
          >
            <span class="alarm-time-display-label">Alarm time</span>
            <strong id="selected-alarm-time">${formatDisplayTime(alarm.time)}</strong>
            <span class="alarm-time-edit">Change time</span>
          </button>
        </section>

        <section class="form-section">
          <h2>Repeat Days</h2>

          <div class="repeat-days">
            ${days.map(day => `
              <label class="day-option">
                <input
                  type="checkbox"
                  name="repeat"
                  value="${day}"
                  ${alarm.repeat.includes(day) ? 'checked' : ''}
                >
                <span>${day}</span>
              </label>
            `).join('')}
          </div>
        </section>

        <section class="form-section">
          <h2>Alarm Name <span>(Optional)</span></h2>

          <input
            type="text"
            id="alarm-name"
            maxlength="40"
            placeholder="Give your alarm a name"
            value="${escapeHTML(alarm.name || '')}"
          >
        </section>

        <section class="form-section">
          <h2>Choose Alarm Sound</h2>

          <div class="alarm-sound-preview">
            <span class="alarm-sound-picker-label">Selected alarm sound</span>

            <button
              type="button"
              class="alarm-sound-selected"
              id="open-sound-picker"
              aria-haspopup="dialog"
            >
              <span class="alarm-sound-selected-icon" aria-hidden="true">♫</span>
              <span class="alarm-sound-selected-name" id="selected-sound-name">
                ${escapeHTML(getSoundName(selectedSound))}
              </span>
              <span class="alarm-sound-selected-arrow" aria-hidden="true">⌄</span>
            </button>
          </div>
        </section>

        <p id="alarm-error" class="form-error" aria-live="polite"></p>

        <button type="submit" class="primary-button save-alarm-button">
          Save Alarm
        </button>
      </form>
    </main>
  `

  /* =========================================================
     PAGE SCROLL LOCK
     ========================================================= */

  function lockPageScroll() {
    const body = document.body
    const html = document.documentElement

    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverflow = html.style.overflow

    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'

    return () => {
      body.style.overflow = previousBodyOverflow
      html.style.overflow = previousHtmlOverflow
    }
  }

  /* =========================================================
     BACKDROP CONFIGURATION
     ========================================================= */

  function configureBackdrop(backdrop, zIndex) {
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100dvh',
      boxSizing: 'border-box',
      display: 'grid',
      placeItems: 'center',
      overflowX: 'clip',
      overflowY: 'auto',
      padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
      zIndex: String(zIndex),
      overscrollBehavior: 'contain',
      margin: '0',
      transform: 'none'
    })
  }

  /* =========================================================
     TIME PICKER
     ========================================================= */

  function openTimePicker() {
    const [currentHour, currentMinute] = selectedTime24.split(':').map(Number)

    const pickerValues = {
      hour: String(currentHour % 12 || 12).padStart(2, '0'),
      minute: String(currentMinute).padStart(2, '0'),
      period: currentHour >= 12 ? 'PM' : 'AM'
    }

    const backdrop = document.createElement('div')
    backdrop.className = 'profile-dialog-backdrop alarm-time-backdrop'

    function createOptions(type, values) {
      return values.map(value => `
        <button
          type="button"
          class="alarm-picker-option ${pickerValues[type] === value ? 'is-selected' : ''}"
          data-picker-option="${type}"
          data-picker-value="${value}"
          aria-selected="${pickerValues[type] === value}"
        >
          ${value}
        </button>
      `).join('')
    }

    function createField(type, label, values) {
      return `
        <div class="alarm-time-picker-field" data-picker-field="${type}">
          <label>${label}</label>

          <button
            type="button"
            class="alarm-picker-trigger"
            data-picker-trigger="${type}"
            aria-expanded="false"
          >
            <span data-picker-display="${type}">${pickerValues[type]}</span>
            <span class="alarm-picker-arrow" aria-hidden="true">⌄</span>
          </button>

          <div class="alarm-picker-menu" hidden>
            ${createOptions(type, values)}
          </div>
        </div>
      `
    }

    const hours = Array.from(
      { length: 12 },
      (_, i) => String(i + 1).padStart(2, '0')
    )

    const minutes = Array.from(
      { length: 60 },
      (_, i) => String(i).padStart(2, '0')
    )

    backdrop.innerHTML = `
      <section
        class="profile-dialog alarm-time-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-time-title"
      >
        <button
          type="button"
          class="modal-close"
          data-time-close
          aria-label="Close"
        >×</button>

        <span class="page-eyebrow">ALARM SCHEDULE</span>
        <h2 id="alarm-time-title">Choose alarm time</h2>
        <p>Set the time your alarm should ring.</p>

        <div class="alarm-time-columns">
          ${createField('hour', 'Hour', hours)}
          <span class="alarm-time-colon">:</span>
          ${createField('minute', 'Minute', minutes)}
          ${createField('period', 'Period', ['AM', 'PM'])}
        </div>

        <div class="profile-dialog-actions">
          <button type="button" class="secondary-button" data-time-close>
            Cancel
          </button>

          <button type="button" class="primary-button" id="save-picked-time">
            Set Time
          </button>
        </div>
      </section>
    `

    configureBackdrop(backdrop, 220)
    document.body.appendChild(backdrop)

    const dialog = backdrop.querySelector('.alarm-time-dialog')

    Object.assign(dialog.style, {
      position: 'relative',
      width: 'min(100%, 440px)',
      maxWidth: '440px',
      minWidth: '0',
      boxSizing: 'border-box',
      maxHeight: 'calc(100dvh - 24px)',
      overflow: 'visible',
      flex: 'none',
      margin: 'auto',
      transform: 'none'
    })

    const restoreScroll = lockPageScroll()

    function closeMenus() {
      backdrop.querySelectorAll('.alarm-time-picker-field').forEach(field => {
        field.classList.remove('is-open')

        const menu = field.querySelector('.alarm-picker-menu')
        const trigger = field.querySelector('.alarm-picker-trigger')

        menu.hidden = true
        menu.style.position = ''
        menu.style.left = ''
        menu.style.top = ''
        menu.style.width = ''
        menu.style.maxHeight = ''

        trigger.setAttribute('aria-expanded', 'false')
      })
    }

    function positionMenu(field) {
      const trigger = field.querySelector('.alarm-picker-trigger')
      const menu = field.querySelector('.alarm-picker-menu')
      const rect = trigger.getBoundingClientRect()

      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight

      const viewportWidth = window.visualViewport
        ? window.visualViewport.width
        : window.innerWidth

      const viewportOffsetTop = window.visualViewport
        ? window.visualViewport.offsetTop
        : 0

      const edgePadding = 12
      const gap = 6

      const spaceBelow = viewportHeight - (rect.bottom - viewportOffsetTop) - edgePadding - gap
      const spaceAbove = rect.top - viewportOffsetTop - edgePadding - gap

      const openAbove = spaceBelow < 150 && spaceAbove > spaceBelow
      const availableSpace = openAbove ? spaceAbove : spaceBelow

      const menuHeight = Math.max(100, Math.min(240, availableSpace))

      const menuWidth = Math.min(
        rect.width,
        viewportWidth - edgePadding * 2
      )

      const left = Math.max(
        edgePadding,
        Math.min(rect.left, viewportWidth - menuWidth - edgePadding)
      )

      const top = openAbove
        ? Math.max(edgePadding + viewportOffsetTop, rect.top - menuHeight - gap)
        : Math.min(
            rect.bottom + gap,
            viewportHeight + viewportOffsetTop - edgePadding - menuHeight
          )

      Object.assign(menu.style, {
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${menuWidth}px`,
        maxWidth: `${viewportWidth - edgePadding * 2}px`,
        maxHeight: `${Math.max(100, Math.min(menuHeight, viewportHeight - edgePadding * 2))}px`,
        boxSizing: 'border-box',
        overflowY: 'auto',
        zIndex: '9999'
      })
    }

    function repositionOpenMenu() {
      const openField = backdrop.querySelector(
        '.alarm-time-picker-field.is-open'
      )

      if (openField) positionMenu(openField)
    }

    const close = () => {
      closeMenus()
      backdrop.remove()
      restoreScroll()

      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', repositionOpenMenu)
      window.removeEventListener('scroll', repositionOpenMenu, true)

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', repositionOpenMenu)
        window.visualViewport.removeEventListener('scroll', repositionOpenMenu)
      }
    }

    const handleEscape = event => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', repositionOpenMenu)
    window.addEventListener('scroll', repositionOpenMenu, true)

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', repositionOpenMenu)
      window.visualViewport.addEventListener('scroll', repositionOpenMenu)
    }

    backdrop.querySelectorAll('[data-time-close]').forEach(button => {
      button.addEventListener('click', close)
    })

    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) close()
    })

    dialog.addEventListener('click', event => {
      event.stopPropagation()

      const trigger = event.target.closest('[data-picker-trigger]')

      if (trigger) {
        const field = trigger.closest('.alarm-time-picker-field')
        const menu = field.querySelector('.alarm-picker-menu')
        const wasOpen = !menu.hidden

        closeMenus()

        if (!wasOpen) {
          menu.hidden = false
          field.classList.add('is-open')
          trigger.setAttribute('aria-expanded', 'true')

          positionMenu(field)

          const selectedOption = menu.querySelector('.is-selected')

          if (selectedOption) {
            requestAnimationFrame(() => {
              selectedOption.scrollIntoView({
                block: 'nearest',
                behavior: 'instant'
              })
            })
          }
        }

        return
      }

      const option = event.target.closest('[data-picker-option]')

      if (option) {
        const type = option.dataset.pickerOption
        const value = option.dataset.pickerValue
        const field = option.closest('.alarm-time-picker-field')

        pickerValues[type] = value

        field.querySelector(`[data-picker-display="${type}"]`).textContent = value

        field.querySelectorAll('.alarm-picker-option').forEach(button => {
          const selected = button.dataset.pickerValue === value
          button.classList.toggle('is-selected', selected)
          button.setAttribute('aria-selected', String(selected))
        })

        closeMenus()
        return
      }

      if (!event.target.closest('.alarm-time-picker-field')) {
        closeMenus()
      }
    })

    dialog.querySelector('#save-picked-time').addEventListener('click', () => {
      const hour = Number(pickerValues.hour)
      const minute = pickerValues.minute
      const pm = pickerValues.period === 'PM'

      const hour24 = pm ? (hour % 12) + 12 : hour % 12

      selectedTime24 = `${String(hour24).padStart(2, '0')}:${minute}`

      document.querySelector('#selected-alarm-time').textContent =
        formatDisplayTime(selectedTime24)

      close()
    })
  }

  /* =========================================================
     SOUND PICKER
     ========================================================= */

  function openSoundPicker() {
    const backdrop = document.createElement('div')
    backdrop.className = 'alarm-sound-backdrop'

    backdrop.innerHTML = `
      <section
        class="alarm-sound-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-sound-title"
      >
        <header class="alarm-sound-dialog-header">
          <div>
            <span class="page-eyebrow">PERSONALIZE YOUR ALARM</span>
            <h2 id="alarm-sound-title">Choose alarm sound</h2>
            <p>Find a sound you want to wake up to.</p>
          </div>

          <button
            type="button"
            class="modal-close"
            data-sound-close
            aria-label="Close"
          >×</button>
        </header>

        <div class="alarm-sound-list" role="list">
          ${sounds.map((sound, index) => `
            <div class="alarm-sound-option ${selectedSound === sound.file ? 'is-selected' : ''}" role="listitem">
              <button
                type="button"
                class="alarm-sound-option-select"
                data-select-sound="${escapeHTML(sound.file)}"
                aria-pressed="${selectedSound === sound.file}"
              >
                <span class="alarm-sound-option-number">
                  ${String(index + 1).padStart(2, '0')}
                </span>

                <span class="alarm-sound-option-name">
                  ${escapeHTML(sound.name)}
                </span>

                <span class="alarm-sound-option-check" aria-hidden="true">
                  ${selectedSound === sound.file ? '✓' : ''}
                </span>
              </button>

              <button
                type="button"
                class="alarm-sound-option-preview"
                data-preview-sound="${escapeHTML(sound.file)}"
                aria-label="Preview ${escapeHTML(sound.name)}"
              >
                Preview
              </button>
            </div>
          `).join('')}
        </div>

        <footer class="alarm-sound-dialog-footer">
          <span>${sounds.length} sounds available</span>
          <button type="button" class="primary-button" data-sound-close>
            Done
          </button>
        </footer>
      </section>
    `

    configureBackdrop(backdrop, 120)
    document.body.appendChild(backdrop)

    const dialog = backdrop.querySelector('.alarm-sound-dialog')

    Object.assign(dialog.style, {
      position: 'relative',
      width: 'min(100%, 520px)',
      maxWidth: '520px',
      minWidth: '0',
      height: 'min(760px, calc(100dvh - 24px))',
      maxHeight: 'calc(100dvh - 24px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flex: 'none',
      margin: 'auto',
      transform: 'none'
    })

    const list = dialog.querySelector('.alarm-sound-list')

    Object.assign(list.style, {
      minHeight: '0',
      flex: '1 1 auto',
      overflowY: 'auto',
      overflowX: 'hidden',
      overscrollBehavior: 'contain'
    })

    const restoreScroll = lockPageScroll()

    const close = () => {
      stopPreview()
      backdrop.remove()
      restoreScroll()
      document.removeEventListener('keydown', handleEscape)
    }

    const handleEscape = event => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('keydown', handleEscape)

    backdrop.querySelectorAll('[data-sound-close]').forEach(button => {
      button.addEventListener('click', close)
    })

    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) close()
    })

    dialog.addEventListener('click', event => {
      event.stopPropagation()
    })

    backdrop.querySelectorAll('[data-select-sound]').forEach(button => {
      button.addEventListener('click', () => {
        selectedSound = button.dataset.selectSound

        document.querySelector('#selected-sound-name').textContent =
          getSoundName(selectedSound)

        close()
      })
    })

    backdrop.querySelectorAll('[data-preview-sound]').forEach(button => {
      button.addEventListener('click', () => {
        previewSound(button.dataset.previewSound)
      })
    })
  }

  /* =========================================================
     EVENT LISTENERS
     ========================================================= */

  document.querySelector('#open-time-picker').addEventListener('click', openTimePicker)
  document.querySelector('#open-sound-picker').addEventListener('click', openSoundPicker)

  document.querySelector('#back-button').addEventListener('click', () => {
    stopPreview()
    onCancel()
  })

  document.querySelector('#alarm-form').addEventListener('submit', event => {
    event.preventDefault()

    stopPreview()

    const time = selectedTime24

    const repeat = Array.from(
      document.querySelectorAll('input[name="repeat"]:checked')
    ).map(input => input.value)

    const name = document.querySelector('#alarm-name').value.trim()
    const sound = selectedSound

    onSave({
      ...alarm,
      time,
      repeat,
      name,
      sound
    })
  })
}

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function formatDisplayTime(value) {
  const [h, m] = value.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'

  return `${String(h % 12 || 12).padStart(2, '0')}:${m} ${period}`
}
